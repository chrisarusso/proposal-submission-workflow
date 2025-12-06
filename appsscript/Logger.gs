/**
 * Proposal Submission Workflow - Logger
 * Handles audit trail management (who, what, when)
 */

/**
 * Log action with user email and timestamp
 * @param {string} action - Action type (CREATE, UPDATE, CHECK_COMPLETE, etc.)
 * @param {string} proposalId - Proposal ID
 * @param {object} details - Additional details object
 */
function logAction(action, proposalId, details) {
  // Get Sheet ID using helper function from Code.gs
  var auditLogSheetId = getAuditLogSheetId();
  if (!auditLogSheetId) {
    Logger.log('AUDIT_LOG_SHEET_ID not configured, skipping log');
    return;
  }
  
  try {
    var spreadsheet = SpreadsheetApp.openById(auditLogSheetId);
    var sheet = spreadsheet.getSheetByName('Audit Log');
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet('Audit Log');
      // Set headers
      sheet.getRange(1, 1, 1, 6).setValues([[
        'Timestamp',
        'User Email',
        'Action',
        'Proposal ID',
        'Proposal Name',
        'Details'
      ]]);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    
    var user = getCurrentUser();
    var timestamp = new Date();
    var timestampStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    
    // Get proposal name if available
    var proposalName = 'Unknown';
    try {
      var proposal = getProposalData(proposalId);
      if (proposal) {
        proposalName = proposal.name;
      }
    } catch (e) {
      // Ignore errors getting proposal name
    }
    
    // Format details as JSON string
    var detailsStr = JSON.stringify(details);
    
    // Append row to sheet
    sheet.appendRow([
      timestampStr,
      user,
      action,
      proposalId,
      proposalName,
      detailsStr
    ]);
    
    Logger.log('Action logged: ' + action + ' for proposal ' + proposalId);
  } catch (e) {
    Logger.log('Error logging action: ' + e.toString());
  }
}

/**
 * Retrieve audit trail for specific proposal
 * @param {string} proposalId - Proposal ID
 * @param {number} limit - Maximum number of entries to return (optional)
 * @return {Array} Array of log entries
 */
function getAuditLog(proposalId, limit) {
  var auditLogSheetId = getAuditLogSheetId();
  if (!auditLogSheetId) {
    return [];
  }
  
  try {
    var spreadsheet = SpreadsheetApp.openById(auditLogSheetId);
    var sheet = spreadsheet.getSheetByName('Audit Log');
    
    if (!sheet) {
      return [];
    }
    
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    
    if (values.length < 2) {
      return []; // No data rows (header only)
    }
    
    var logs = [];
    var proposalIdCol = 3; // Column D (0-indexed: 3)
    
    // Skip header row
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (row[proposalIdCol] === proposalId) {
        try {
          logs.push({
            timestamp: row[0],
            user: row[1],
            action: row[2],
            proposalId: row[3],
            proposalName: row[4],
            details: JSON.parse(row[5] || '{}')
          });
        } catch (e) {
          // Skip invalid rows
        }
      }
    }
    
    // Sort by timestamp descending (most recent first)
    logs.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    if (limit) {
      logs = logs.slice(0, limit);
    }
    
    return logs;
  } catch (e) {
    Logger.log('Error getting audit log: ' + e.toString());
    return [];
  }
}

/**
 * Retrieve all audit entries
 * @param {number} limit - Maximum number of entries to return (optional)
 * @return {Array} Array of all log entries
 */
function getAllAuditLogs(limit) {
  var auditLogSheetId = getAuditLogSheetId();
  if (!auditLogSheetId) {
    return [];
  }
  
  try {
    var spreadsheet = SpreadsheetApp.openById(auditLogSheetId);
    var sheet = spreadsheet.getSheetByName('Audit Log');
    
    if (!sheet) {
      return [];
    }
    
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    
    if (values.length < 2) {
      return []; // No data rows (header only)
    }
    
    var logs = [];
    
    // Skip header row
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      try {
        logs.push({
          timestamp: row[0],
          user: row[1],
          action: row[2],
          proposalId: row[3],
          proposalName: row[4],
          details: JSON.parse(row[5] || '{}')
        });
      } catch (e) {
        Logger.log('Error parsing log row ' + i + ': ' + e.toString());
      }
    }
    
    // Sort by timestamp descending
    logs.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    if (limit) {
      logs = logs.slice(0, limit);
    }
    
    return logs;
  } catch (e) {
    Logger.log('Error getting all audit logs: ' + e.toString());
    return [];
  }
}

/**
 * Get current user email for logging
 * @return {string} User email
 */
function getCurrentUser() {
  try {
    return Session.getActiveUser().getEmail();
  } catch (e) {
    return 'unknown@example.com';
  }
}

/**
 * Parse log entry from text format (legacy support - no longer used with Sheets)
 * Format: [YYYY-MM-DD HH:MM:SS] [user@email.com] [ACTION] [Proposal: Name] [Details]
 * @param {string} text - Log entry text
 * @return {object} Parsed log entry object
 */
function parseLogEntry(text) {
  try {
    var regex = /\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[Proposal:\s+([^\]]+)\]\s+\[(.+)\]/;
    var match = text.match(regex);
    
    if (!match) {
      return null;
    }
    
    var details = {};
    try {
      details = JSON.parse(match[5]);
    } catch (e) {
      details = { raw: match[5] };
    }
    
    return {
      timestamp: match[1],
      user: match[2],
      action: match[3],
      proposalName: match[4],
      details: details
    };
  } catch (e) {
    Logger.log('Error parsing log entry: ' + e.toString());
    return null;
  }
}

/**
 * Search audit logs by criteria
 * @param {object} criteria - Search criteria {user, action, dateFrom, dateTo, proposalId}
 * @return {Array} Filtered log entries
 */
function searchAuditLogs(criteria) {
  var auditLogSheetId = getAuditLogSheetId();
  if (!auditLogSheetId) {
    return [];
  }
  
  try {
    var spreadsheet = SpreadsheetApp.openById(auditLogSheetId);
    var sheet = spreadsheet.getSheetByName('Audit Log');
    
    if (!sheet) {
      return [];
    }
    
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    
    if (values.length < 2) {
      return [];
    }
    
    var filtered = [];
    
    // Skip header row
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var timestamp = row[0];
      var user = row[1];
      var action = row[2];
      var proposalId = row[3];
      
      var match = true;
      
      if (criteria.user && user.toLowerCase().indexOf(criteria.user.toLowerCase()) === -1) {
        match = false;
      }
      
      if (criteria.action && action !== criteria.action) {
        match = false;
      }
      
      if (criteria.proposalId && proposalId !== criteria.proposalId) {
        match = false;
      }
      
      if (criteria.dateFrom && new Date(timestamp) < new Date(criteria.dateFrom)) {
        match = false;
      }
      
      if (criteria.dateTo && new Date(timestamp) > new Date(criteria.dateTo)) {
        match = false;
      }
      
      if (match) {
        try {
          filtered.push({
            timestamp: timestamp,
            user: user,
            action: action,
            proposalId: proposalId,
            proposalName: row[4],
            details: JSON.parse(row[5] || '{}')
          });
        } catch (e) {
          Logger.log('Error parsing log row ' + i + ': ' + e.toString());
        }
      }
    }
    
    // Sort by timestamp descending
    filtered.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    return filtered;
  } catch (e) {
    Logger.log('Error searching audit logs: ' + e.toString());
    return [];
  }
}

