# Debug: Sheet ID Configuration Issue

The Sheet IDs are configured in the code, but you're still getting the error. Let's debug this.

## Step 1: Verify Code in Apps Script

1. Open: `npm run clasp:open`
2. Open `Code.gs` file
3. Scroll to the top (lines 6-9)
4. Verify you see:
   ```javascript
   var MASTER_STATUS_SHEET_ID = '1ML2ydqmfOTdki4zZBoV-fQXaLWniavm4H76I8tLYtmY';
   var AUDIT_LOG_SHEET_ID = '1K8UPNLwTFSkOJoVhpHOsB3UotE7skpR73-ma5uGKgq4';
   ```

If they're empty strings (`''`), the push didn't work. Try:
```bash
npm run clasp:push
```

## Step 2: Test the Variables Directly

Add this test function to Code.gs temporarily:

```javascript
function testSheetIds() {
  Logger.log('MASTER_STATUS_SHEET_ID: ' + MASTER_STATUS_SHEET_ID);
  Logger.log('AUDIT_LOG_SHEET_ID: ' + AUDIT_LOG_SHEET_ID);
  
  if (!MASTER_STATUS_SHEET_ID || MASTER_STATUS_SHEET_ID === '') {
    Logger.log('ERROR: MASTER_STATUS_SHEET_ID is not set!');
  } else {
    Logger.log('SUCCESS: MASTER_STATUS_SHEET_ID is set');
  }
  
  return {
    master: MASTER_STATUS_SHEET_ID,
    audit: AUDIT_LOG_SHEET_ID
  };
}
```

Then:
1. Run `testSheetIds()` function in Apps Script
2. Check View → Logs to see what values are logged
3. This will tell us if the variables are actually set at runtime

## Step 3: Check Execution Context

The error might be happening because:
- The web app is executing in a different context
- Variables aren't being initialized properly
- There's a caching issue

Try accessing the web app URL with a query parameter to force refresh:
```
https://script.google.com/macros/s/.../exec?v=2
```

## Step 4: Manual Verification

1. In Apps Script editor, click "Run" → select `createProposal`
2. You'll need to provide test data, but this will show if the function works
3. Check the execution log for errors

## Step 5: Check Sheet Permissions

Make sure:
1. Both sheets exist and are accessible
2. The Google account running the script has access to both sheets
3. Try opening the sheets directly:
   - Master: https://docs.google.com/spreadsheets/d/1ML2ydqmfOTdki4zZBoV-fQXaLWniavm4H76I8tLYtmY/edit
   - Audit: https://docs.google.com/spreadsheets/d/1K8UPNLwTFSkOJoVhpHOsB3UotE7skpR73-ma5uGKgq4/edit

