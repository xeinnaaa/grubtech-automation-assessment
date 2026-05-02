const CONFIG = {
  VALID_AGGREGATORS: ['Talabat', 'Mrsool', 'Keeta', 'Ninja', 'Noon'],
  HIGH_PRIORITY_COUNTRIES: ['KSA', 'UAE'],
  STANDARD_COUNTRIES: ['Qatar', 'Kuwait', 'Bahrain'],
  ENTERPRISE_BRANCH_THRESHOLD: 10
};

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle('Restaurant Activation Request');
}

function handleSubmission(payload) {
  try {
    const cleaned = validateAndNormalize(payload);

    writeToAggregatorSheet(cleaned);
    sendSlackNotifications(cleaned);

    return {
      success: true,
      message: 'Submission processed successfully.'
    };
  } catch (error) {
    logError(payload, error);

    return {
      success: false,
      message: error.message
    };
  }
}

function validateAndNormalize(payload) {
  const requiredFields = [
    'restaurantName',
    'contactEmail',
    'contactPhone',
    'country',
    'aggregator',
    'numberOfBranches'
  ];

  requiredFields.forEach(function(field) {
    if (!payload[field] && payload[field] !== 0) {
      throw new Error('Missing required field: ' + field);
    }
  });

  const branches = Number(payload.numberOfBranches);

  if (Number.isNaN(branches) || branches < 1) {
    throw new Error('Number of branches must be a positive number.');
  }

  if (!CONFIG.VALID_AGGREGATORS.includes(payload.aggregator)) {
    throw new Error('Invalid aggregator: ' + payload.aggregator);
  }

  const validCountries = CONFIG.HIGH_PRIORITY_COUNTRIES.concat(CONFIG.STANDARD_COUNTRIES);

  if (!validCountries.includes(payload.country)) {
    throw new Error('Invalid country: ' + payload.country);
  }

  return {
    timestamp: new Date(),
    restaurantName: String(payload.restaurantName).trim(),
    contactEmail: String(payload.contactEmail).trim(),
    contactPhone: String(payload.contactPhone).trim(),
    country: String(payload.country).trim(),
    aggregator: String(payload.aggregator).trim(),
    numberOfBranches: branches
  };
}

function writeToAggregatorSheet(data) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(data.aggregator);

  if (!sheet) {
    throw new Error('Sheet tab not found for aggregator: ' + data.aggregator);
  }

  sheet.appendRow([
    data.timestamp,
    data.restaurantName,
    data.contactEmail,
    data.contactPhone,
    data.country,
    data.aggregator,
    data.numberOfBranches
  ]);
}

function sendSlackNotifications(data) {
  const scriptProperties = PropertiesService.getScriptProperties();

  const highPriorityWebhook = scriptProperties.getProperty('HIGH_PRIORITY_WEBHOOK_URL');
  const standardWebhook = scriptProperties.getProperty('STANDARD_WEBHOOK_URL');

  const isHighPriority = CONFIG.HIGH_PRIORITY_COUNTRIES.includes(data.country);
  const isEnterprise = data.numberOfBranches >= CONFIG.ENTERPRISE_BRANCH_THRESHOLD;

  const mainWebhook = isHighPriority ? highPriorityWebhook : standardWebhook;

  if (!mainWebhook) {
    throw new Error('Slack webhook URL is missing from Script Properties.');
  }

  const priorityLabel = isHighPriority ? 'HIGH PRIORITY' : 'STANDARD';

  const mainMessage = {
    text:
      ':new: *New Restaurant Activation Request*\n' +
      '*Priority:* ' + priorityLabel + '\n' +
      '*Restaurant:* ' + data.restaurantName + '\n' +
      '*Email:* ' + data.contactEmail + '\n' +
      '*Phone:* ' + data.contactPhone + '\n' +
      '*Country:* ' + data.country + '\n' +
      '*Aggregator:* ' + data.aggregator + '\n' +
      '*Branches:* ' + data.numberOfBranches
  };

  postToSlack(mainWebhook, mainMessage);

  if (isEnterprise) {
    const enterpriseMessage = {
      text:
        ':rotating_light: *Enterprise Lead Alert*\n' +
        '*Restaurant:* ' + data.restaurantName + '\n' +
        '*Branches:* ' + data.numberOfBranches + '\n' +
        '*Country:* ' + data.country + '\n' +
        '*Aggregator:* ' + data.aggregator
    };

    postToSlack(mainWebhook, enterpriseMessage);
  }
}

function postToSlack(webhookUrl, payload) {
  const response = UrlFetchApp.fetch(webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const statusCode = response.getResponseCode();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error('Slack notification failed with status ' + statusCode);
  }
}

function logError(payload, error) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Errors') || spreadsheet.insertSheet('Errors');

  sheet.appendRow([
    new Date(),
    JSON.stringify(payload),
    error.message,
    error.stack || ''
  ]);
}
