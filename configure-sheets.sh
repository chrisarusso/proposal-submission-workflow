#!/bin/bash

echo "=========================================="
echo "Proposal Workflow - Sheet Configuration"
echo "=========================================="
echo ""
echo "You need to create two Google Sheets and get their IDs."
echo ""
echo "Step 1: Create Google Sheets"
echo "---------------------------"
echo "1. Go to https://sheets.google.com"
echo "2. Create a new sheet named 'Proposal Master Status'"
echo "3. Create another new sheet named 'Proposal Audit Log'"
echo ""
echo "Step 2: Get Sheet IDs"
echo "-------------------"
echo "For each sheet, copy the Sheet ID from the URL:"
echo "  URL format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit"
echo ""
echo "Example: If URL is:"
echo "  https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0j/edit"
echo "Then Sheet ID is: 1a2b3c4d5e6f7g8h9i0j"
echo ""
read -p "Enter Master Status Sheet ID: " MASTER_ID
read -p "Enter Audit Log Sheet ID: " AUDIT_ID

echo ""
echo "Updating Code.gs..."

# Update Code.gs with the Sheet IDs
sed -i.bak "s/var MASTER_STATUS_SHEET_ID = '';/var MASTER_STATUS_SHEET_ID = '${MASTER_ID}';/" appsscript/Code.gs
sed -i.bak "s/var AUDIT_LOG_SHEET_ID = '';/var AUDIT_LOG_SHEET_ID = '${AUDIT_ID}';/" appsscript/Code.gs

echo "✅ Updated Code.gs with your Sheet IDs"
echo ""
echo "Pushing changes to Apps Script..."
npm run clasp:push

echo ""
echo "✅ Done! Your Sheet IDs are now configured."
echo ""
echo "Next steps:"
echo "1. Make sure both sheets are shared with your Google account"
echo "2. Test creating a proposal in the web app"

