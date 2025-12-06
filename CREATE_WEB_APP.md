# Create Web App Deployment

clasp can create versions, but web app deployments need to be done via the UI. Here's the quick process:

## Steps:

1. **Open Apps Script:**
   ```bash
   npm run clasp:open
   ```

2. **Create Web App Deployment:**
   - Click **"Deploy"** → **"New deployment"**
   - Click the **gear icon** (⚙️) next to "Select type"
   - Choose **"Web app"**
   - **Version:** Select "2" (the version we just created)
   - **Description:** "Proposal Submission Workflow"
   - **Execute as:** "Me"
   - **Who has access:** "Anyone with Google account" (or your org)
   - Click **"Deploy"**

3. **Copy the Web App URL** and use that

## Your New Deployment Info:

- **Version:** 2
- **Deployment ID:** AKfycbyS0c3TjayGE5rTWuj2a_Gw0XeUI1DcwS1MPEG8LwPHx0EOAf6jKMuuKfV6MudW8E7Uqg

The web app URL will be:
```
https://script.google.com/macros/s/AKfycbyS0c3TjayGE5rTWuj2a_Gw0XeUI1DcwS1MPEG8LwPHx0EOAf6jKMuuKfV6MudW8E7Uqg/exec
```

(But you need to create the web app deployment first via the UI to get the full URL)

