# Proposal Submission Workflow - Audit Log Sheet Template

This Google Sheet contains an append-only log of all actions taken in the proposal submission workflow system.

## Sheet Structure

The sheet has one tab named "Audit Log" with the following columns:

| Timestamp | User Email | Action | Proposal ID | Proposal Name | Details |
|-----------|------------|--------|-------------|---------------|---------|
| YYYY-MM-DD HH:MM:SS | user@email.com | ACTION_TYPE | {proposal-id} | {Proposal Name} | {JSON details} |

## Column Descriptions

- **Timestamp**: Date and time of the action (format: YYYY-MM-DD HH:MM:SS)
- **User Email**: Email address of the user who performed the action
- **Action**: Type of action (see Action Types below)
- **Proposal ID**: Unique identifier of the proposal
- **Proposal Name**: Name of the proposal (for easy reference)
- **Details**: JSON string containing additional action details

## Action Types

- **CREATE** - New proposal created
- **UPDATE** - Proposal data updated
- **CHECK_COMPLETE** - Checklist item marked complete/incomplete
- **CHECK_AUTO_RUN** - Automated check executed
- **STATUS_CHANGE** - Proposal status changed
- **CUSTOM_ITEM_ADDED** - Custom checklist item added
- **CUSTOM_ITEM_REMOVED** - Custom checklist item removed
- **REQUIRED_STRING_ADDED** - Required string added
- **REQUIRED_STRING_REMOVED** - Required string removed
- **VALIDATION_RUN** - Pre-submission validation executed
- **DELETE** - Proposal deleted

## Example Rows

| Timestamp | User Email | Action | Proposal ID | Proposal Name | Details |
|-----------|------------|--------|-------------|---------------|---------|
| 2024-01-15 10:30:22 | john@example.com | CREATE | abc123-def456 | Acme Corp RFP | {"name":"Acme Corp RFP","type":"RFP"} |
| 2024-01-15 10:31:05 | john@example.com | CHECK_COMPLETE | abc123-def456 | Acme Corp RFP | {"itemId":"item_1","completed":true} |
| 2024-01-15 10:32:15 | system | CHECK_AUTO_RUN | abc123-def456 | Acme Corp RFP | {"checkId":"item_2","checkType":"completeness","success":true,"stage":"early","message":"All required sections found (100%)"} |
| 2024-01-15 11:00:00 | jane@example.com | STATUS_CHANGE | abc123-def456 | Acme Corp RFP | {"oldStatus":"In Progress","newStatus":"In Review"} |
| 2024-01-15 11:05:15 | jane@example.com | REQUIRED_STRING_ADDED | abc123-def456 | Acme Corp RFP | {"stringId":"str_123","string":"NDA","description":"Non-disclosure agreement"} |
| 2024-01-15 11:30:00 | system | CHECK_AUTO_RUN | abc123-def456 | Acme Corp RFP | {"checkId":"item_5","checkType":"strings","success":true,"foundCount":2,"missingCount":0,"message":"All required strings found (2/2)"} |
| 2024-01-15 12:00:00 | john@example.com | VALIDATION_RUN | abc123-def456 | Acme Corp RFP | {"valid":true,"errors":0,"warnings":0,"missingStrings":0} |

## Setup Instructions

1. Create a new Google Sheet
2. Name it "Proposal Audit Log"
3. The script will automatically create the "Audit Log" tab with headers when first run
4. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
5. Set `AUDIT_LOG_SHEET_ID` in `Code.gs` to this Sheet ID

## Features

- **Automatic Logging**: All actions are automatically logged when they occur
- **Filtering**: Use Google Sheets built-in filter to filter by user, action type, proposal, date range, etc.
- **Sorting**: Click column headers to sort (default: most recent first)
- **Search**: Use Ctrl+F to search within the sheet
- **Export**: Easy to export to CSV or Excel for analysis
- **Append-Only**: The system only appends new rows, never modifies existing ones

## Usage Tips

- **Filter by Proposal**: Use the filter on "Proposal ID" column to see all actions for a specific proposal
- **Filter by User**: Use the filter on "User Email" column to see all actions by a specific user
- **Filter by Action Type**: Use the filter on "Action" column to see specific types of actions
- **Date Range Filtering**: Use the filter on "Timestamp" column to filter by date range
- **Details Column**: The Details column contains JSON - you can parse it or use it for advanced filtering

## Notes

- The sheet is automatically maintained by the Proposal Submission Workflow system
- Rows are never deleted or modified by the system (append-only)
- You can manually add notes or comments to rows if needed
- The sheet can grow large over time - consider archiving old entries periodically
