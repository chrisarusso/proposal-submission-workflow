# Proposal Submission Workflow System

An internal workflow system for managing proposal submissions (RFP responses and client proposals) using Google Apps Script, Google Sheets (for status tracking), Google Docs (for audit log), and automated quality/completeness evaluation.

## Features

- **Markdown Checklist Template** - Default checklist items with support for custom per-proposal items
- **Google Apps Script Web App** - HTML-based UI for managing proposals
- **Google Sheets Integration** - Master status sheet and audit log sheet for tracking proposals and actions
- **Google Docs/Slides Support** - Supports both Google Docs and Google Slides as proposal documents
- **Automated Quality Checks** - Custom scripts and configurable LLM API integration for:
  - Spelling/grammar verification (LLM-based)
  - Completeness analysis (scripts/LLM)
  - Custom string/keyword matching (scripts)
- **Pre-submission Validation** - Ensures all custom required strings are present before submission
- **Audit Trail** - Complete log of all actions (who, what, when)
- **Stage-based Checks** - Automated checks run based on proposal stage (early/mid/late)

## Setup Instructions

### Prerequisites

1. Google Workspace account with access to Google Apps Script
2. Google Drive access for storing documents
3. (Optional) LLM API credentials (OpenAI, Anthropic, or Google) for automated checks

### Step 1: Create Google Sheets and Documents

1. **Master Status Sheet**
   - Create a new Google Sheet
   - Name it "Proposal Master Status"
   - The script will automatically create the required structure
   - Note the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
   - See `docs/master-status-template.md` for structure details

2. **Audit Log Sheet**
   - Create a new Google Sheet
   - Name it "Proposal Audit Log"
   - The script will automatically create the required structure
   - See `docs/action-log-template.md` for structure details
   - Note the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`

### Step 2: Set Up Google Apps Script Project

1. Go to [Google Apps Script](https://script.google.com)
2. Create a new project
3. Copy the contents of each file from `appsscript/` directory:
   - `Code.gs`
   - `Logger.gs`
   - `Automation.gs`
   - `ui.html`
   - `proposal-detail.html`
   - `appsscript.json`

4. **Configure Sheet IDs**
   - In `Code.gs`, set `MASTER_STATUS_SHEET_ID` to your Master Status Sheet ID
   - In `Code.gs`, set `AUDIT_LOG_SHEET_ID` to your Audit Log Sheet ID
   - (Optional) Set `CHECKLIST_TEMPLATE_ID` if storing checklist in a Google Doc

5. **Set Up Checklist Template**
   - Copy `checklist-template.md` to a location accessible by the script
   - Or create a Google Doc with the checklist content

### Step 3: Configure LLM API (Optional)

If you want to use automated spelling/grammar checks:

1. Get API credentials from your chosen provider:
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/
   - Google: https://makersuite.google.com/app/apikey

2. In Google Apps Script, run this function once:
   ```javascript
   configureLLM('openai', 'your-api-key-here');
   ```
   Replace `'openai'` with your provider and `'your-api-key-here'` with your actual API key.

   The API key will be stored securely in Script Properties.

### Step 4: Deploy the Web App

1. In Google Apps Script, click "Deploy" > "New deployment"
2. Select type: "Web app"
3. Set execution as: "Me"
4. Set access: "Anyone with Google account" (or your organization)
5. Click "Deploy"
6. Copy the Web App URL

### Step 5: Set Up Custom Scripts (Optional)

1. Store custom analysis scripts in the `scripts/` directory
2. Reference them in `Automation.gs` via `loadScriptContent()`
3. See `scripts/proposal-analysis.js` for examples

## Usage

### Accessing the Dashboard

1. Open the Google Apps Script project
2. Run the `onOpen()` function or use the custom menu
3. Click "Open Dashboard" to view all proposals

### Creating a New Proposal

1. Click "Create New Proposal" in the dashboard
2. Fill in:
   - Proposal Name
   - Type (RFP or Client)
   - Deadline (optional)
   - Document URL (Google Doc or Google Slides link)
3. Click "Create Proposal"

**Note:** The system supports both Google Docs and Google Slides as proposal documents. When you provide a document URL, the system will automatically detect the document type and extract text for analysis.

### Managing Checklist Items

- Default checklist items are loaded from the template
- Add custom checklist items via the proposal detail view
- Mark items complete by checking the checkbox
- All actions are logged to the audit trail

### Adding Required Strings

1. Open a proposal detail view
2. In the "Required Strings" section, enter a string and description
3. Click "Add"
4. These strings will be validated before submission

### Running Automated Checks

1. Open a proposal detail view
2. Click "Run Automated Checks"
3. Checks will run based on the current proposal stage:
   - **Early stage**: Completeness checks
   - **Mid stage**: Completeness and string matching
   - **Late stage**: Spelling/grammar, completeness, and string matching

### Pre-submission Validation

1. Before submitting a proposal for review, click "Validate Before Submission"
2. The system will check:
   - All custom required strings are present
   - All required checklist items are completed
3. Warnings and errors will be displayed
4. Submission will be blocked if critical items are missing

## File Structure

```
proposal-submission-workflow/
├── checklist-template.md          # Markdown checklist template
├── appsscript/
│   ├── Code.gs                    # Main Apps Script logic
│   ├── Automation.gs              # Custom scripts & API/LLM integration
│   ├── Logger.gs                  # Action logging utilities
│   ├── ui.html                    # Dashboard UI
│   ├── proposal-detail.html      # Proposal detail view UI
│   └── appsscript.json            # Apps Script manifest
├── scripts/
│   └── proposal-analysis.js       # Example custom analysis script
├── docs/
│   ├── master-status-template.md  # Template for master status doc
│   └── action-log-template.md     # Template for audit log structure
└── README.md                       # This file
```

## Checklist Metadata Tags

The checklist template supports metadata tags for automated checks:

- `[check:spelling]` - Triggers LLM-based spelling/grammar check
- `[check:completeness]` - Verifies required sections are present
- `[check:strings:keyword1,keyword2]` - Checks for required strings/keywords
- `[stage:early]` - Check runs in early stage
- `[stage:mid]` - Check runs in mid stage
- `[stage:late]` - Check runs in late stage

Example:
```markdown
- [ ] [check:spelling] [stage:late] Final proofread of proposal document
- [ ] [check:completeness] [stage:early] Verify all required sections are present
- [ ] [check:strings:NDA,confidentiality] Ensure required legal terms are included
```

## Custom Scripts

Custom analysis scripts can be created to perform specialized checks. See `scripts/proposal-analysis.js` for examples.

Scripts should export a function that accepts:
- `proposalData` (object) - Proposal data
- `stage` (string) - Current stage (early/mid/late)

And return an object with:
- `success` (boolean) - Whether check passed
- `checkType` (string) - Type of check
- `message` (string) - Result message
- Additional result data as needed

## Troubleshooting

### "Sheet ID not configured" error
- Make sure `MASTER_STATUS_SHEET_ID` and `AUDIT_LOG_SHEET_ID` are set in `Code.gs`
- Sheet IDs are found in the Google Sheet URL: `/spreadsheets/d/{SHEET_ID}/`
- Both master status and audit log now use Google Sheets

### Proposal document support
- The system supports both Google Docs and Google Slides as proposal documents
- When linking a proposal document, use the full URL or just the document ID
- The system will automatically detect whether it's a Doc or Slides and extract text accordingly

### LLM API errors
- Verify API key is configured correctly
- Check API key has sufficient credits/quota
- Ensure provider name matches exactly: 'openai', 'anthropic', or 'google'

### Checklist not loading
- Verify checklist template file is accessible
- Check `CHECKLIST_TEMPLATE_ID` is set if using a Google Doc
- Default checklist will be used if template cannot be loaded

### Audit log not updating
- Verify `AUDIT_LOG_DOC_ID` is set correctly
- Check script has edit permissions on the audit log document
- Ensure document is not in view-only mode

## Security Notes

- API keys are stored in Script Properties (encrypted by Google)
- User actions are logged with email addresses for audit purposes
- Documents should be shared only with authorized users
- Consider using Google Workspace domain restrictions for deployment

## Support

For issues or questions, refer to the plan document or contact your system administrator.

## License

Internal use only.

