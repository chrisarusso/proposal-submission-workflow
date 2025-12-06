# Fix: Web App Cache Issue

The web app is running cached code. Here's how to fix it:

## Solution: Force Redeploy

1. **Open Apps Script:**
   ```bash
   npm run clasp:open
   ```

2. **Go to Deployments:**
   - Click **"Deploy"** → **"Manage deployments"**

3. **Edit and Redeploy:**
   - Click the **pencil icon** (✏️) next to your deployment
   - Change the **Version** from "New version" to a specific version number (or leave as "New version")
   - Click **"Deploy"**

4. **OR Create New Deployment:**
   - Click **"Deploy"** → **"New deployment"**
   - Select type: **"Web app"**
   - Description: "Proposal Workflow v2" (or any name)
   - Execute as: **"Me"**
   - Who has access: **"Anyone with Google account"** (or your org)
   - Click **"Deploy"**
   - Copy the NEW URL and use that

## Why This Happens

Google Apps Script web apps cache the code version. When you push new code, the web app doesn't automatically use it - you need to redeploy to create a new version.

## Verify It Worked

After redeploying:
1. Try creating a proposal again
2. Check the execution logs - you should see the new debug messages
3. The error should be resolved

## Alternative: Use Script Properties

If redeploying doesn't work, you can set the Sheet IDs in Script Properties:

1. In Apps Script, go to **"Project Settings"** (gear icon)
2. Scroll to **"Script Properties"**
3. Add:
   - Property: `MASTER_STATUS_SHEET_ID`, Value: `1ML2ydqmfOTdki4zZBoV-fQXaLWniavm4H76I8tLYtmY`
   - Property: `AUDIT_LOG_SHEET_ID`, Value: `1K8UPNLwTFSkOJoVhpHOsB3UotE7skpR73-ma5uGKgq4`
4. The code will now use Script Properties as a fallback

