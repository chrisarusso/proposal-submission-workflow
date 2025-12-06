# Configure Sheet IDs

You need to set your Google Sheet IDs before the workflow can work.

## Quick Setup

### Option 1: Use the helper script
```bash
./configure-sheets.sh
```

### Option 2: Manual Configuration

1. **Create Google Sheets:**
   - Go to https://sheets.google.com
   - Create a new sheet named **"Proposal Master Status"**
   - Create another new sheet named **"Proposal Audit Log"**

2. **Get Sheet IDs:**
   - Open each sheet
   - Look at the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
   - Copy the `{SHEET_ID}` part (the long string between `/d/` and `/edit`)

3. **Update Code.gs:**
   - Open `appsscript/Code.gs`
   - Find these lines near the top:
     ```javascript
     var MASTER_STATUS_SHEET_ID = '';
     var AUDIT_LOG_SHEET_ID = '';
     ```
   - Replace the empty strings with your Sheet IDs:
     ```javascript
     var MASTER_STATUS_SHEET_ID = 'your-master-status-sheet-id';
     var AUDIT_LOG_SHEET_ID = 'your-audit-log-sheet-id';
     ```

4. **Push changes:**
   ```bash
   npm run clasp:push
   ```

## Example

If your Master Status Sheet URL is:
```
https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0j/edit
```

Then your Sheet ID is: `1a2b3c4d5e6f7g8h9i0j`

## Verify Configuration

After pushing, test by:
1. Opening your web app URL
2. Clicking "Create New Proposal"
3. If it works, you'll see the proposal appear in your Master Status Sheet

## Troubleshooting

**"Sheet ID not configured" error:**
- Make sure you've set both Sheet IDs in Code.gs
- Verify there are no extra spaces or quotes
- Make sure you pushed the changes: `npm run clasp:push`

**"Permission denied" error:**
- Make sure both sheets are shared with your Google account
- Check that the script has access to Google Sheets API

**Sheet not found:**
- Double-check the Sheet ID is correct
- Make sure the sheet exists and is accessible

