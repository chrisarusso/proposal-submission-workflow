# Redeploy Web App to Pick Up Changes

When you update code in Apps Script, web app deployments sometimes need to be refreshed to pick up the changes.

## Quick Fix:

1. **Open your project:**
   ```bash
   npm run clasp:open
   ```
   Or visit: https://script.google.com/d/1VlAcX2h9TSKcGahwj35po3-livG5yY-7cSWh-99F_d1_FH3Z-l5ZVFj5/edit

2. **Go to Deployments:**
   - Click **"Deploy"** → **"Manage deployments"**

3. **Edit your deployment:**
   - Click the **pencil icon** (✏️) next to your deployment
   - You don't need to change anything
   - Just click **"Deploy"** again

4. **Test:**
   - Try creating a proposal again
   - The new deployment should have the updated Sheet IDs

## Alternative: Create New Deployment

If redeploying doesn't work:

1. Go to **"Deploy"** → **"New deployment"**
2. Click the gear icon (⚙️) → Select **"Web app"**
3. Configure:
   - Description: "Proposal Submission Workflow v2"
   - Execute as: "Me"
   - Who has access: "Anyone with Google account" (or your org)
4. Click **"Deploy"**
5. Copy the new URL and use that instead

## Verify Code Has Sheet IDs

To double-check the code in Apps Script has the Sheet IDs:

1. In the web editor, open `Code.gs`
2. Look for lines 7-8:
   ```javascript
   var MASTER_STATUS_SHEET_ID = '1ML2ydqmfOTdki4zZBoV-fQXaLWniavm4H76I8tLYtmY';
   var AUDIT_LOG_SHEET_ID = '1K8UPNLwTFSkOJoVhpHOsB3UotE7skpR73-ma5uGKgq4';
   ```
3. If they're empty strings (`''`), the push didn't work - try pushing again:
   ```bash
   npm run clasp:push
   ```

