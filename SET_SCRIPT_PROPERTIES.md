# Set Script Properties Manually

Since the function dropdown isn't showing `initializeSheetIds`, set the Script Properties manually:

## Method 1: Via Apps Script UI

1. **Open Apps Script:**
   ```bash
   npm run clasp:open
   ```

2. **Go to Project Settings:**
   - Click the **gear icon** (⚙️) in the left sidebar
   - Scroll down to **"Script Properties"**

3. **Add Properties:**
   - Click **"Add script property"**
   - **Name:** `MASTER_STATUS_SHEET_ID`
   - **Value:** `1ML2ydqmfOTdki4zZBoV-fQXaLWniavm4H76I8tLYtmY`
   - Click **"Save script properties"**
   
   - Click **"Add script property"** again
   - **Name:** `AUDIT_LOG_SHEET_ID`
   - **Value:** `1K8UPNLwTFSkOJoVhpHOsB3UotE7skpR73-ma5uGKgq4`
   - Click **"Save script properties"**

## Method 2: Run This Code Directly

1. In Apps Script editor, paste this code at the bottom of `Code.gs`:

```javascript
function setSheetIdsNow() {
  var properties = PropertiesService.getScriptProperties();
  properties.setProperty('MASTER_STATUS_SHEET_ID', '1ML2ydqmfOTdki4zZBoV-fQXaLWniavm4H76I8tLYtmY');
  properties.setProperty('AUDIT_LOG_SHEET_ID', '1K8UPNLwTFSkOJoVhpHOsB3UotE7skpR73-ma5uGKgq4');
  Logger.log('Sheet IDs set!');
  Logger.log('Master: ' + properties.getProperty('MASTER_STATUS_SHEET_ID'));
  Logger.log('Audit: ' + properties.getProperty('AUDIT_LOG_SHEET_ID'));
  return 'Done! Check logs.';
}
```

2. Select `setSheetIdsNow` from function dropdown
3. Click **Run** (▶️)
4. Check **View → Logs** to confirm
5. Delete the `setSheetIdsNow` function after running

## Verify It Worked

After setting Script Properties:
1. Try creating a proposal again
2. It should work now!

