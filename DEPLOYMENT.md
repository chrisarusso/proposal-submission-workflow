# Deployment Guide - Using clasp (Command Line Apps Script)

This guide shows you how to use `clasp` (Google's official CLI tool) to deploy your Apps Script project, enabling git-like workflows.

## What is clasp?

`clasp` (Command Line Apps Script Projects) is Google's official command-line tool that lets you:
- Push code from your local filesystem to Google Apps Script
- Pull code from Apps Script to your local filesystem
- Use version control (git) with your Apps Script projects
- Deploy and manage your scripts efficiently

## Step 1: Install clasp

### Option A: Using npm in this project (Recommended)
```bash
npm install
```

This installs `clasp` as a dev dependency. Then use npm scripts:
```bash
npm run clasp:login
npm run clasp:push
```

Or use `npx` to run clasp:
```bash
npx clasp login
npx clasp push
```

### Option B: Install globally
```bash
npm install -g @google/clasp
```

### Option C: Using Homebrew (Mac)
```bash
brew install clasp
```

### Option D: Using Chocolatey (Windows)
```choco install clasp
```

Verify installation:
```bash
clasp --version
# or
npx clasp --version
```

## Step 2: Enable Apps Script API

1. Go to https://script.google.com/home/usersettings
2. Turn on **"Google Apps Script API"**
3. This allows clasp to access your scripts

## Step 3: Login to clasp

```bash
clasp login
```

This will:
- Open your browser
- Ask you to authorize clasp
- Grant permissions to manage your Apps Script projects

## Step 4: Create Apps Script Project (if not exists)

### Option A: Create new project via clasp
```bash
clasp create --title "Proposal Submission Workflow" --type standalone
```

This creates a new standalone Apps Script project and gives you a `scriptId`.

### Option B: Use existing project
If you already created a project in the Apps Script web editor:
1. Open your project in https://script.google.com
2. Go to **Project Settings** (gear icon)
3. Copy the **Script ID**
4. Save it for Step 5

## Step 5: Configure clasp

1. Copy the example config file:
   ```bash
   cp .clasp.json.example .clasp.json
   ```

2. Edit `.clasp.json` and add your Script ID:
   ```json
   {
     "scriptId": "your-actual-script-id-here",
     "rootDir": "./appsscript"
   }
   ```

   Replace `your-actual-script-id-here` with your Script ID from Step 4.

## Step 6: Push Files to Apps Script

Push all files from the `appsscript/` directory:

```bash
clasp push
```

This will:
- Upload all `.gs` files as script files
- Upload all `.html` files as HTML files
- Upload `appsscript.json` as the manifest
- Show you what files were pushed

## Step 7: Pull Files from Apps Script (Optional)

If you make changes in the web editor and want to sync them locally:

```bash
clasp pull
```

## Step 8: Open Project in Web Editor

```bash
clasp open
```

This opens your project in the Apps Script web editor where you can:
- Configure Sheet IDs
- Set up API keys
- Test functions
- Deploy the web app

## Step 9: Set Sheet IDs

After pushing, you still need to configure the Sheet IDs:

1. Run `clasp open` to open in web editor
2. Edit `Code.gs`
3. Set `MASTER_STATUS_SHEET_ID` and `AUDIT_LOG_SHEET_ID`
4. Save (clasp will sync automatically, or push again with `clasp push`)

## Common clasp Commands

### Using npm scripts (if installed locally):
```bash
# Push local files to Apps Script
npm run clasp:push

# Pull files from Apps Script to local
npm run clasp:pull

# Open project in web editor
npm run clasp:open

# Deploy as web app
npm run clasp:deploy

# View logs
npm run clasp:logs
```

### Using clasp directly:
```bash
# Push local files to Apps Script
clasp push
# or: npx clasp push

# Pull files from Apps Script to local
clasp pull
# or: npx clasp pull

# Open project in web editor
clasp open
# or: npx clasp open

# List all your Apps Script projects
clasp list

# Create a new project
clasp create --title "Project Name" --type standalone

# Deploy as web app (after setting up in web editor)
clasp deploy

# View logs
clasp logs

# Show project info
clasp status
```

## Using Git with clasp

Since clasp syncs with local files, you can use git normally:

```bash
# Initialize git repo (if not already done)
git init

# Add files
git add .

# Commit
git commit -m "Initial proposal workflow setup"

# Push to remote (GitHub, GitLab, etc.)
git push origin main
```

**Important:** Make sure `.clasp.json` is in `.gitignore` if it contains sensitive info, or use environment variables.

## Workflow Example

1. **Make changes locally:**
   ```bash
   # Edit files in appsscript/
   vim appsscript/Code.gs
   ```

2. **Push to Apps Script:**
   ```bash
   clasp push
   ```

3. **Test in web editor:**
   ```bash
   clasp open
   ```

4. **Commit to git:**
   ```bash
   git add .
   git commit -m "Updated proposal workflow"
   git push
   ```

## Troubleshooting

### "clasp: command not found"
- Make sure clasp is installed: `npm install -g @google/clasp`
- Verify PATH includes npm global bin directory

### "Script ID not found"
- Check `.clasp.json` has correct `scriptId`
- Verify the script exists and you have access

### "Permission denied"
- Run `clasp login` again
- Check Apps Script API is enabled: https://script.google.com/home/usersettings

### "Files not pushing"
- Check `.claspignore` isn't excluding files you want
- Verify files are in `rootDir` (default: `./appsscript`)
- Check file extensions are `.gs`, `.html`, or `.json`

## Alternative: Manual Copy-Paste

If you prefer not to use clasp, you can manually copy files:

1. Open https://script.google.com
2. Create new project
3. For each file in `appsscript/`:
   - Create new file (or edit existing)
   - Copy contents from local file
   - Paste into Apps Script editor
   - Save

This works but is slower and doesn't support version control as well.

## Next Steps

After deploying with clasp:

1. Configure Sheet IDs in `Code.gs` (via web editor)
2. Set up LLM API keys (if using)
3. Authorize permissions
4. Test the workflow

See `SETUP.md` for detailed configuration steps.

