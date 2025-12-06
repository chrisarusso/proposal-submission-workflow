# Proposal Submission Workflow - Setup Guide

Follow these steps to set up the Proposal Submission Workflow system.

## Step 1: Create Google Sheets

### 1.1 Master Status Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Click "Blank" to create a new spreadsheet
3. Name it **"Proposal Master Status"**
4. Copy the Sheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
   - Copy the `{SHEET_ID}` part
   - Example: If URL is `https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0j/edit`, the ID is `1a2b3c4d5e6f7g8h9i0j`
5. **Save this ID** - you'll need it in Step 3

### 1.2 Audit Log Sheet
1. Create another new Google Sheet
2. Name it **"Proposal Audit Log"**
3. Copy the Sheet ID from the URL (same process as above)
4. **Save this ID** - you'll need it in Step 3

**Note:** Don't worry about creating columns or formatting - the script will do this automatically when it first runs.

## Step 2: Set Up Google Apps Script Project

You have two options: **Use clasp (Recommended)** or **Manual Copy-Paste**

### Option A: Using clasp (Recommended - Enables Git Workflow)

See `DEPLOYMENT.md` for detailed clasp setup instructions.

**Quick clasp setup:**
1. Install dependencies: `npm install` (already done!)
2. Enable Apps Script API: https://script.google.com/home/usersettings
3. Login: `npm run clasp:login` (or `npx clasp login`)
4. Create project: `npx clasp create --title "Proposal Submission Workflow" --type standalone`
5. Configure: Copy `.clasp.json.example` to `.clasp.json` and add your Script ID
6. Push files: `npm run clasp:push` (or `npx clasp push`)

Then skip to Step 3.

### Option B: Manual Copy-Paste

### 2.1 Create New Project
1. Go to [Google Apps Script](https://script.google.com)
2. Click **"New Project"**
3. Name it **"Proposal Submission Workflow"**

### 2.2 Add Script Files
Copy the contents of each file from the `appsscript/` folder into your Apps Script project:

1. **Code.gs**
   - Delete the default `Code.gs` content
   - Copy entire contents from `appsscript/Code.gs`
   - Paste into the editor

2. **Logger.gs**
   - Click **"+"** next to "Files" to add a new file
   - Name it `Logger`
   - Copy contents from `appsscript/Logger.gs`
   - Paste into the editor

3. **Automation.gs**
   - Add another new file named `Automation`
   - Copy contents from `appsscript/Automation.gs`
   - Paste into the editor

4. **ui.html**
   - Click **"+"** and select **"HTML"**
   - Name it `ui`
   - Copy contents from `appsscript/ui.html`
   - Paste into the editor

5. **proposal-detail.html**
   - Add another HTML file named `proposal-detail`
   - Copy contents from `appsscript/proposal-detail.html`
   - Paste into the editor

6. **appsscript.json**
   - Click the **"Project Settings"** gear icon (⚙️) in the left sidebar
   - Scroll down to **"Script Properties"**
   - The manifest will be automatically created, but you can verify the OAuth scopes match what's in `appsscript.json`

### 2.3 Configure Sheet IDs
1. In `Code.gs`, find these lines near the top:
   ```javascript
   var MASTER_STATUS_SHEET_ID = '';
   var AUDIT_LOG_SHEET_ID = '';
   ```

2. Replace the empty strings with your Sheet IDs from Step 1:
   ```javascript
   var MASTER_STATUS_SHEET_ID = '1a2b3c4d5e6f7g8h9i0j'; // Your Master Status Sheet ID
   var AUDIT_LOG_SHEET_ID = '9z8y7x6w5v4u3t2s1r0q'; // Your Audit Log Sheet ID
   ```

3. Click **"Save"** (💾) or press `Ctrl+S` / `Cmd+S`

## Step 3: Set Up Checklist Template (Optional)

You have two options:

### Option A: Use Markdown File (Recommended)
1. Copy `checklist-template.md` to a location accessible by your team
2. The script will use a default checklist if it can't find the template
3. You can update the markdown file and reload it later

### Option B: Store in Google Doc
1. Create a new Google Doc
2. Copy the contents of `checklist-template.md` into it
3. Copy the Document ID from the URL
4. In `Code.gs`, set `CHECKLIST_TEMPLATE_ID` to this ID

## Step 4: Configure LLM API (Optional - for spelling/grammar checks)

If you want automated spelling/grammar checks:

1. Get an API key from one of these providers:
   - **OpenAI**: https://platform.openai.com/api-keys
   - **Anthropic**: https://console.anthropic.com/
   - **Google**: https://makersuite.google.com/app/apikey

2. In Google Apps Script, add a temporary function to configure:
   ```javascript
   function setupLLM() {
     configureLLM('openai', 'your-api-key-here');
   }
   ```
   Replace `'openai'` with your provider (`'openai'`, `'anthropic'`, or `'google'`)
   Replace `'your-api-key-here'` with your actual API key

3. Run the `setupLLM()` function once:
   - Click the function dropdown at the top
   - Select `setupLLM`
   - Click the **Run** button (▶️)
   - Authorize permissions if prompted

4. Delete the `setupLLM()` function after running it (for security)

**Note:** The API key is stored securely in Script Properties and won't be visible in your code.

## Step 5: Enable Required APIs

1. In Google Apps Script, click **"Extensions"** → **"Apps Script API"**
2. Make sure the following APIs are enabled:
   - Google Docs API
   - Google Sheets API
   - Google Slides API
   - Google Drive API

These should be enabled automatically, but verify they're available.

## Step 6: Authorize Permissions

1. In Google Apps Script, click **"Run"** → select any function (like `onOpen`)
2. Click the **Run** button (▶️)
3. You'll be prompted to **"Review Permissions"**
4. Click **"Review Permissions"**
5. Select your Google account
6. Click **"Advanced"** → **"Go to [Project Name] (unsafe)"**
7. Click **"Allow"** to grant permissions

The script needs permissions to:
- Read/write Google Sheets (for status and audit log)
- Read Google Docs and Slides (for proposal analysis)
- Access your email (for audit logging)

## Step 7: Test the Setup

1. In Google Apps Script, run the `onOpen()` function
2. This should create the menu in your spreadsheet
3. Open your Master Status Sheet
4. You should see a new menu: **"Proposal Workflow"**
5. Click **"Proposal Workflow"** → **"Open Dashboard"**
6. The dashboard should open in a dialog

## Step 8: Create Your First Proposal (Test)

1. In the dashboard, click **"Create New Proposal"**
2. Fill in:
   - **Proposal Name**: "Test Proposal"
   - **Type**: "RFP"
   - **Document URL**: (optional for testing - can add later)
3. Click **"Create Proposal"**
4. Check your Master Status Sheet - you should see a new row
5. Check your Audit Log Sheet - you should see a CREATE action logged

## Troubleshooting

### "Sheet ID not configured" error
- Make sure you've set both `MASTER_STATUS_SHEET_ID` and `AUDIT_LOG_SHEET_ID` in `Code.gs`
- Verify the Sheet IDs are correct (no extra spaces or quotes)

### "Permission denied" error
- Make sure you've authorized all permissions (Step 6)
- Verify the Sheets are shared with the same Google account running the script

### Menu doesn't appear
- Make sure you've saved all files
- Try refreshing the spreadsheet page
- Run `onOpen()` function manually in Apps Script

### Dashboard doesn't open
- Check the browser console for errors (F12)
- Make sure `ui.html` file was created correctly
- Verify all script files are saved

## Next Steps

Once setup is complete:

1. **Share the Sheets** with your team members who need access
2. **Review the checklist template** (`checklist-template.md`) and customize if needed
3. **Create your first real proposal** and test the workflow
4. **Add custom required strings** for your proposals
5. **Run automated checks** to test the analysis features

## Support

If you encounter issues:
1. Check the browser console (F12) for JavaScript errors
2. Check the Apps Script execution log (View → Logs)
3. Review the README.md for detailed documentation
4. Verify all Sheet IDs are correct and sheets are accessible

---

**You're all set!** The Proposal Submission Workflow system is ready to use.

