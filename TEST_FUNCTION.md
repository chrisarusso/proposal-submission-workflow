# Test Function - Add Manually

If `testGetAllProposals` doesn't show up in the function dropdown, add this function manually in Apps Script:

## Copy and Paste This:

```javascript
function testGetAllProposals() {
  Logger.log('=== TEST: getAllProposals ===');
  var proposals = getAllProposals();
  Logger.log('Result: ' + proposals.length + ' proposals returned');
  Logger.log('Proposals: ' + JSON.stringify(proposals));
  return proposals;
}
```

## Steps:

1. Open Apps Script: `npm run clasp:open`
2. Open `Code.gs`
3. Scroll to the bottom
4. Paste the function above
5. Save (Cmd+S or Ctrl+S)
6. Select `testGetAllProposals` from function dropdown
7. Click Run (▶️)
8. Check View → Logs

## Or Just Run getAllProposals Directly:

You can also just run `getAllProposals()` directly:
1. Select `getAllProposals` from function dropdown
2. Click Run
3. Check the logs - you should see all the detailed logging I added

