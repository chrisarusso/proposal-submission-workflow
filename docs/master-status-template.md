# Proposal Master Status - Google Sheet Template

This Google Sheet tracks all proposals and their current status. The sheet has two tabs:

## Tab 1: "Proposals" (Main Status Table)

This is the main visible table that shows all proposals. It has the following columns:

| Proposal ID | Proposal Name | Type | Status | Progress % | Owner | Last Updated | Deadline | Next Action |
|-------------|---------------|------|--------|------------|-------|--------------|----------|-------------|
| {auto-generated} | {Proposal Name} | RFP/Client | Draft/In Progress/In Review/Ready for Submission/Submitted/Closed | 0-100% | {owner@email.com} | {timestamp} | {date} | {suggested action} |

**Column Descriptions:**
- **Proposal ID**: Unique identifier (auto-generated UUID)
- **Proposal Name**: Name of the proposal
- **Type**: Either "RFP" or "Client"
- **Status**: Current status (Draft, In Progress, In Review, Ready for Submission, Submitted, Closed)
- **Progress %**: Completion percentage based on checklist items
- **Owner**: Email of the proposal owner
- **Last Updated**: Timestamp of last update
- **Deadline**: Proposal submission deadline
- **Next Action**: Suggested next action based on status and progress

## Tab 2: "ProposalData" (Hidden - Data Storage)

This hidden sheet stores the full proposal data as JSON. It has two columns:

| Proposal ID | Data JSON |
|-------------|-----------|
| {proposal-id} | {JSON string with full proposal data} |

**Note:** This sheet is automatically hidden and should not be manually edited. It contains:
- Full checklist data (default + custom items)
- Required strings
- Check results
- Metadata
- All other proposal details

## Setup Instructions

1. Create a new Google Sheet
2. Name it "Proposal Master Status"
3. The first tab will automatically be named "Proposals"
4. The script will automatically create the "ProposalData" tab when first run
5. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
6. Set `MASTER_STATUS_SHEET_ID` in `Code.gs` to this Sheet ID

## Features

- **Automatic Updates**: The table is automatically updated when proposals are created, updated, or status changes
- **Filtering**: Use Google Sheets built-in filter to filter by status, type, owner, etc.
- **Sorting**: Click column headers to sort
- **Filtered View**: Only shows open proposals (status != "Closed") in the dashboard UI
- **Real-time Sync**: Changes made through the UI are immediately reflected in the sheet

## Notes

- The sheet is automatically maintained by the Proposal Submission Workflow system
- You can manually view/edit the Proposals tab, but changes may be overwritten by the system
- The ProposalData tab should never be manually edited
- Use the web UI for creating and managing proposals to ensure data consistency
