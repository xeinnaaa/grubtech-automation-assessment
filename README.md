# Restaurant Activation Automation

This project captures restaurant onboarding requests and routes them through HubSpot, Google Sheets, and Slack.

## Flow

1. User submits the Apps Script web form.
2. The form submits the data to the HubSpot Forms API.
3. The same payload is sent to Google Apps Script.
4. Apps Script writes the row to the correct Google Sheets tab based on aggregator.
5. Apps Script sends a Slack notification:
   - KSA / UAE → high-priority channel
   - Qatar / Kuwait / Bahrain → standard channel
   - 10+ branches → extra enterprise lead alert

## Tools Used

- HubSpot Forms API
- Google Apps Script
- Google Sheets
- Slack Incoming Webhooks

## Notes

Slack webhook URLs are stored in Apps Script Properties and are not hardcoded in the source code.
I created the requested HubSpot form and used the HubSpot Forms API for submission. Since the free HubSpot form share link records submissions in HubSpot but does not provide a direct free webhook to trigger Google Sheets and Slack, I used a custom Apps Script frontend that submits to HubSpot and triggers the automation in parallel.