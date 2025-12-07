/**
 * Proposal Submission Workflow - Main Code
 * Handles proposal management, checklist operations, and UI interactions
 */

// Configuration - Set these IDs after creating Google Sheets/Docs
var MASTER_STATUS_SHEET_ID = '1ML2ydqmfOTdki4zZBoV-fQXaLWniavm4H76I8tLYtmY'; // Master Status Sheet ID
var AUDIT_LOG_SHEET_ID = '1K8UPNLwTFSkOJoVhpHOsB3UotE7skpR73-ma5uGKgq4'; // Audit Log Sheet ID
var CHECKLIST_TEMPLATE_ID = ''; // Optional: If checklist is stored in a Google Doc

// Sheet structure constants
var SHEET_NAME = 'Proposals';
var DATA_SHEET_NAME = 'ProposalData'; // Hidden sheet for storing full proposal data
var STATUS_OPTIONS = ['Organize Info', 'Prepare Strategic Approach', 'Complete Estimates', 'Prepare Proposal', 'Final Review', 'Submit', 'Prep Demo'];

/**
 * Debug function to check Sheet ID configuration
 * Run this in Apps Script to verify Sheet IDs are set
 */
function debugSheetIds() {
  var result = {
    masterStatusSheetId: MASTER_STATUS_SHEET_ID,
    auditLogSheetId: AUDIT_LOG_SHEET_ID,
    masterStatusSet: !!(MASTER_STATUS_SHEET_ID && MASTER_STATUS_SHEET_ID !== ''),
    auditLogSet: !!(AUDIT_LOG_SHEET_ID && AUDIT_LOG_SHEET_ID !== '')
  };
  
  Logger.log('Sheet ID Configuration:');
  Logger.log('MASTER_STATUS_SHEET_ID: ' + result.masterStatusSheetId);
  Logger.log('AUDIT_LOG_SHEET_ID: ' + result.auditLogSheetId);
  Logger.log('Master Status Set: ' + result.masterStatusSet);
  Logger.log('Audit Log Set: ' + result.auditLogSet);
  
  return result;
}

/**
 * Test function to check if proposals are being saved and retrieved
 * Run this directly in Apps Script
 */
function testGetAllProposals() {
  Logger.log('=== TEST: getAllProposals ===');
  var proposals = getAllProposals();
  Logger.log('Result: ' + proposals.length + ' proposals returned');
  Logger.log('Proposals: ' + JSON.stringify(proposals));
  return proposals;
}

/**
 * Minimal loader test: fetch one proposal (or the first available)
 * Run this in Apps Script with an optional proposalId argument.
 */
function testLoadProposalById(proposalId) {
  Logger.log('=== TEST: getProposalData ===');
  Logger.log('Input proposalId: ' + proposalId);

  var targetId = proposalId;

  if (!targetId) {
    // Grab the first proposal ID from the data sheet
    var masterSheetId = getMasterStatusSheetId();
    if (!masterSheetId) {
      throw new Error('MASTER_STATUS_SHEET_ID not set. Run initializeSheetIds() first.');
    }

    var spreadsheet = SpreadsheetApp.openById(masterSheetId);
    var dataSheet = getOrCreateSheet(spreadsheet, DATA_SHEET_NAME);
    var values = dataSheet.getDataRange().getValues();

    if (values.length < 2) {
      throw new Error('ProposalData sheet has no proposal rows to load.');
    }

    for (var i = 1; i < values.length; i++) {
      if (values[i][0]) {
        targetId = values[i][0];
        break;
      }
    }

    if (!targetId) {
      throw new Error('No proposal IDs found in ProposalData sheet.');
    }
  }

  var proposal = getProposalData(targetId);
  Logger.log('Loaded proposal? ' + (proposal ? 'YES' : 'NO'));
  if (proposal) {
    Logger.log('Proposal name: ' + proposal.name);
    Logger.log('Status: ' + proposal.status + ', Stage: ' + proposal.stage);
    Logger.log('Owner: ' + proposal.owner + ', UpdatedAt: ' + proposal.updatedAt);
    Logger.log('DocumentId: ' + proposal.documentId + ', DocumentUrl: ' + proposal.documentUrl);
    Logger.log('Checklist items: ' + (proposal.checklist && proposal.checklist.items ? proposal.checklist.items.length : 0));
  }

  return proposal;
}

/**
 * Debug storage: reports sheet presence and row counts.
 */
function debugStorageState() {
  var masterSheetId = getMasterStatusSheetId();
  if (!masterSheetId) {
    throw new Error('MASTER_STATUS_SHEET_ID not configured. Run initializeSheetIds() first.');
  }

  var spreadsheet = SpreadsheetApp.openById(masterSheetId);
  var proposalsSheet = spreadsheet.getSheetByName(SHEET_NAME);
  var dataSheet = spreadsheet.getSheetByName(DATA_SHEET_NAME);

  var result = {
    masterSheetId: masterSheetId,
    proposalsSheet: proposalsSheet ? { name: proposalsSheet.getName(), rows: proposalsSheet.getLastRow() } : null,
    dataSheet: dataSheet ? { name: dataSheet.getName(), rows: dataSheet.getLastRow(), hidden: dataSheet.isSheetHidden() } : null
  };

  Logger.log('Storage state: ' + JSON.stringify(result));
  return result;
}

/**
 * Inspect existing rows in ProposalData: logs row, proposalId, name, status, updatedAt.
 */
function debugListProposalDataRows() {
  var masterSheetId = getMasterStatusSheetId();
  if (!masterSheetId) {
    throw new Error('MASTER_STATUS_SHEET_ID not configured. Run initializeSheetIds() first.');
  }

  var spreadsheet = SpreadsheetApp.openById(masterSheetId);
  var dataSheet = getOrCreateSheet(spreadsheet, DATA_SHEET_NAME);
  var values = dataSheet.getDataRange().getValues();

  var rows = [];
  for (var i = 1; i < values.length; i++) { // skip header
    var proposalId = values[i][0];
    var jsonData = values[i][1];
    if (!proposalId || !jsonData) continue;
    try {
      var obj = JSON.parse(jsonData);
      rows.push({
        row: i + 1,
        proposalId: proposalId,
        name: obj.name,
        status: obj.status,
        updatedAt: obj.updatedAt,
        documentId: obj.documentId
      });
    } catch (e) {
      rows.push({ row: i + 1, proposalId: proposalId, parseError: e.toString() });
    }
  }

  Logger.log('ProposalData rows: ' + JSON.stringify(rows, null, 2));
  return rows;
}

/**
 * POC: read text from the first slide/page of the proposal document.
 * If proposalId is omitted, uses the first proposal in the data sheet.
 */
function testReadFirstSlideText(proposalId) {
  var proposal = testLoadProposalById(proposalId); // reuses resolver to pick first when undefined

  if (!proposal || !proposal.documentId) {
    throw new Error('No proposal document linked to this proposal.');
  }

  var text = getFirstSlideText(proposal.documentId);
  Logger.log('=== FIRST SLIDE TEXT (truncated to 1k chars) ===');
  Logger.log(text.substring(0, 1000));
  return text;
}

/**
 * Runs when the document is opened (for spreadsheet-bound scripts)
 * For standalone scripts, this will be skipped automatically
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Proposal Workflow')
      .addItem('Open Dashboard', 'showProposalDashboard')
      .addItem('Create New Proposal', 'showCreateProposalDialog')
      .addToUi();
  } catch (e) {
    // This is a standalone script, not bound to a spreadsheet
    // Users will access via web app deployment instead
    Logger.log('Standalone script - menu not available. Deploy as web app to access UI.');
  }
}

/**
 * Display master dashboard with all open proposals
 * Works both as a web app and from spreadsheet menu
 */
function showProposalDashboard() {
  var html = HtmlService.createTemplateFromFile('ui')
    .evaluate()
    .setWidth(1200)
    .setHeight(800)
    .setTitle('Proposal Submission Dashboard');
  
  try {
    // Try spreadsheet UI first (if bound to spreadsheet)
    SpreadsheetApp.getUi().showModalDialog(html, 'Proposal Dashboard');
  } catch (e) {
    // If standalone, return HTML for web app
    return html;
  }
}

/**
 * Web app entry point
 * - If proposalId is present, render proposal detail view
 * - Otherwise render the dashboard
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.proposalId) {
    var html = HtmlService.createTemplateFromFile('proposal-detail')
      .evaluate()
      .setWidth(1000)
      .setHeight(800)
      .setTitle('Proposal Details');
    return html;
  }
  return showProposalDashboard();
}

/**
 * Return the current web app URL for client-side navigation
 */
function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}

/**
 * Display individual proposal detail view
 * Works both as a web app and from spreadsheet menu
 */
function showProposalDetail(proposalId) {
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    throw new Error('Proposal not found: ' + proposalId);
  }
  
  var html = HtmlService.createTemplateFromFile('proposal-detail')
    .evaluate()
    .setWidth(1000)
    .setHeight(800)
    .setTitle('Proposal: ' + proposal.name);
  
  try {
    // Try spreadsheet UI first (if bound to spreadsheet)
    SpreadsheetApp.getUi().showModalDialog(html, 'Proposal Details');
  } catch (e) {
    // If standalone, return HTML for web app
    return html;
  }
}

/**
 * Parse markdown checklist template (default items)
 * Returns structured checklist data
 */
function loadChecklist() {
  try {
    // Try to load from a Google Doc if CHECKLIST_TEMPLATE_ID is set
    if (CHECKLIST_TEMPLATE_ID) {
      var doc = DocumentApp.openById(CHECKLIST_TEMPLATE_ID);
      var text = doc.getBody().getText();
      return parseMarkdownChecklist(text);
    } else {
      // Fallback: Return default checklist structure
      return getDefaultChecklist();
    }
  } catch (e) {
    Logger.log('Error loading checklist: ' + e.toString());
    return getDefaultChecklist();
  }
}

/**
 * Load combined default + custom checklist items for proposal
 */
function loadProposalChecklist(proposalId) {
  var defaultChecklist = loadChecklist();
  var proposal = getProposalData(proposalId);
  
  if (!proposal) {
    return defaultChecklist;
  }
  
  // Merge custom items
  if (proposal.customChecklistItems) {
    defaultChecklist.items = defaultChecklist.items.concat(proposal.customChecklistItems);
  }
  
  return defaultChecklist;
}

/**
 * Add custom checklist item to proposal
 */
function addCustomChecklistItem(proposalId, item) {
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    throw new Error('Proposal not found: ' + proposalId);
  }
  
  if (!proposal.customChecklistItems) {
    proposal.customChecklistItems = [];
  }
  
  var customItem = {
    id: Utilities.getUuid(),
    description: item.description,
    completed: false,
    custom: true,
    checkType: item.checkType || null,
    stage: item.stage || null,
    requiredStrings: item.requiredStrings || []
  };
  
  proposal.customChecklistItems.push(customItem);
  saveProposalData(proposalId, proposal);
  
  logAction('CUSTOM_ITEM_ADDED', proposalId, {
    itemId: customItem.id,
    description: customItem.description
  });
  
  return customItem;
}

/**
 * Remove custom checklist item
 */
function removeCustomChecklistItem(proposalId, itemId) {
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    throw new Error('Proposal not found: ' + proposalId);
  }
  
  if (proposal.customChecklistItems) {
    proposal.customChecklistItems = proposal.customChecklistItems.filter(function(item) {
      return item.id !== itemId;
    });
    saveProposalData(proposalId, proposal);
    
    logAction('CUSTOM_ITEM_REMOVED', proposalId, {
      itemId: itemId
    });
  }
}

/**
 * Add required string that must be in proposal
 */
function addRequiredString(proposalId, string, description) {
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    throw new Error('Proposal not found: ' + proposalId);
  }
  
  if (!proposal.requiredStrings) {
    proposal.requiredStrings = [];
  }
  
  var stringReq = {
    id: Utilities.getUuid(),
    string: string,
    description: description || '',
    addedBy: Session.getActiveUser().getEmail(),
    addedAt: new Date().toISOString()
  };
  
  proposal.requiredStrings.push(stringReq);
  saveProposalData(proposalId, proposal);
  
  logAction('REQUIRED_STRING_ADDED', proposalId, {
    stringId: stringReq.id,
    string: string,
    description: description
  });
  
  return stringReq;
}

/**
 * Remove required string requirement
 */
function removeRequiredString(proposalId, stringId) {
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    throw new Error('Proposal not found: ' + proposalId);
  }
  
  if (proposal.requiredStrings) {
    var removed = proposal.requiredStrings.find(function(s) { return s.id === stringId; });
    proposal.requiredStrings = proposal.requiredStrings.filter(function(s) {
      return s.id !== stringId;
    });
    saveProposalData(proposalId, proposal);
    
    logAction('REQUIRED_STRING_REMOVED', proposalId, {
      stringId: stringId,
      string: removed ? removed.string : ''
    });
  }
}

/**
 * Get all custom required strings for proposal
 */
function getRequiredStrings(proposalId) {
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    return [];
  }
  return proposal.requiredStrings || [];
}

/**
 * Count occurrences of the word "the" in the proposal document
 * (uses Slides or Docs via extractTextFromDocument)
 */
function countTheOccurrences(proposalId) {
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    throw new Error('Proposal not found: ' + proposalId);
  }
  if (!proposal.documentId) {
    throw new Error('Proposal document not linked');
  }
  var result = countWordOccurrences(proposal.documentId, 'the');
  logAction('WORD_COUNT', proposalId, {
    word: 'the',
    count: result.count || 0,
    success: result.success,
    message: result.message
  });
  return result;
}

/**
 * Initialize new proposal with default checklist
 */
function createProposal(proposalData) {
  // Use helper function to get Sheet ID (checks Script Properties first)
  var masterSheetId = getMasterStatusSheetId();
  
  Logger.log('createProposal called');
  Logger.log('masterSheetId (from helper): [' + masterSheetId + ']');

  // Enforce unique proposal name (case-insensitive, trimmed)
  var incomingName = (proposalData.name || '').trim();

  // Prevent reusing an active document across proposals
  if (proposalData.documentId) {
    var docConflict = findOpenProposalByDocumentId(proposalData.documentId);
    if (docConflict) {
      throw new Error('That document is already linked to an open proposal ("' + docConflict.name + '", ID: ' + docConflict.id + ').');
    }
  }

  // Validate document exists / accessible if provided
  if (proposalData.documentId) {
    validateDocumentAccess(proposalData.documentId);
    // Derive name from document title if none provided
    if (!incomingName) {
      incomingName = getDocumentName(proposalData.documentId);
    }
  }

  if (!incomingName) {
    incomingName = 'Untitled Proposal';
  }

  var existing = findProposalByName(incomingName);
  if (existing) {
    throw new Error('A proposal named "' + incomingName + '" already exists (ID: ' + existing.id + '). Use a unique name.');
  }

  // Require at least one assignee
  var incomingAssignees = proposalData.assignees || [];
  if (typeof incomingAssignees === 'string' && incomingAssignees.trim() !== '') {
    incomingAssignees = incomingAssignees.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  }
  if (!incomingAssignees || incomingAssignees.length === 0) {
    throw new Error('At least one assignee is required.');
  }
  
  if (!masterSheetId || masterSheetId === '') {
    throw new Error('MASTER_STATUS_SHEET_ID not configured. Please run initializeSheetIds() or set Script Properties.');
  }
  
  var proposalId = Utilities.getUuid();
  var user = Session.getActiveUser().getEmail();
  
  var initialStatus = (STATUS_OPTIONS && STATUS_OPTIONS.length > 0) ? STATUS_OPTIONS[0] : 'Draft';
  var proposal = {
    id: proposalId,
    name: incomingName || 'Untitled Proposal',
    type: proposalData.type || 'RFP', // kept for compatibility
    status: initialStatus,
    stage: initialStatus,
    owner: user,
    assignees: incomingAssignees,
    deadline: proposalData.deadline || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    documentUrl: proposalData.documentUrl || null,
    documentId: proposalData.documentId || null,
    checklist: loadChecklist(),
    customChecklistItems: [],
    requiredStrings: [],
    checkResults: {},
    progress: 0
  };
  
  saveProposalData(proposalId, proposal);
  logAction('CREATE', proposalId, {
    name: proposal.name,
    type: proposal.type
  });
  
  return proposal;
}

/**
 * Initialize Sheet IDs from global variables to Script Properties if not already set
 * Run this once to set up Script Properties
 */
function initializeSheetIds() {
  var properties = PropertiesService.getScriptProperties();
  
  // Set from global variables if they exist
  if (typeof MASTER_STATUS_SHEET_ID !== 'undefined' && MASTER_STATUS_SHEET_ID && MASTER_STATUS_SHEET_ID !== '') {
    properties.setProperty('MASTER_STATUS_SHEET_ID', MASTER_STATUS_SHEET_ID);
    Logger.log('Set MASTER_STATUS_SHEET_ID: ' + MASTER_STATUS_SHEET_ID);
  }
  
  if (typeof AUDIT_LOG_SHEET_ID !== 'undefined' && AUDIT_LOG_SHEET_ID && AUDIT_LOG_SHEET_ID !== '') {
    properties.setProperty('AUDIT_LOG_SHEET_ID', AUDIT_LOG_SHEET_ID);
    Logger.log('Set AUDIT_LOG_SHEET_ID: ' + AUDIT_LOG_SHEET_ID);
  }
  
  // Also set them directly if provided
  properties.setProperty('MASTER_STATUS_SHEET_ID', '1ML2ydqmfOTdki4zZBoV-fQXaLWniavm4H76I8tLYtmY');
  properties.setProperty('AUDIT_LOG_SHEET_ID', '1K8UPNLwTFSkOJoVhpHOsB3UotE7skpR73-ma5uGKgq4');
  
  Logger.log('Sheet IDs initialized in Script Properties');
  return {
    master: properties.getProperty('MASTER_STATUS_SHEET_ID'),
    audit: properties.getProperty('AUDIT_LOG_SHEET_ID')
  };
}

/**
 * Get Sheet IDs - ALWAYS uses Script Properties (more reliable for web apps)
 */
function getMasterStatusSheetId() {
  var properties = PropertiesService.getScriptProperties();
  var sheetId = properties.getProperty('MASTER_STATUS_SHEET_ID');
  
  // Fallback to global variable if Script Property not set
  if (!sheetId && typeof MASTER_STATUS_SHEET_ID !== 'undefined' && MASTER_STATUS_SHEET_ID && MASTER_STATUS_SHEET_ID !== '') {
    sheetId = MASTER_STATUS_SHEET_ID;
    // Save it for next time
    properties.setProperty('MASTER_STATUS_SHEET_ID', sheetId);
  }
  
  return sheetId;
}

function getAuditLogSheetId() {
  var properties = PropertiesService.getScriptProperties();
  var sheetId = properties.getProperty('AUDIT_LOG_SHEET_ID');
  
  // Fallback to global variable if Script Property not set
  if (!sheetId && typeof AUDIT_LOG_SHEET_ID !== 'undefined' && AUDIT_LOG_SHEET_ID && AUDIT_LOG_SHEET_ID !== '') {
    sheetId = AUDIT_LOG_SHEET_ID;
    // Save it for next time
    properties.setProperty('AUDIT_LOG_SHEET_ID', sheetId);
  }
  
  return sheetId;
}

/**
 * Save proposal data to Google Sheet
 */
function saveProposalData(proposalId, data) {
  // Get Sheet ID using helper function
  var masterSheetId = getMasterStatusSheetId();
  
  Logger.log('saveProposalData called');
  Logger.log('MASTER_STATUS_SHEET_ID (global): [' + (typeof MASTER_STATUS_SHEET_ID !== 'undefined' ? MASTER_STATUS_SHEET_ID : 'undefined') + ']');
  Logger.log('masterSheetId (from helper): [' + masterSheetId + ']');
  
  if (!masterSheetId || masterSheetId === '') {
    var errorMsg = 'MASTER_STATUS_SHEET_ID not configured. Please set it in Code.gs or Script Properties.';
    Logger.log('ERROR: ' + errorMsg);
    throw new Error(errorMsg);
  }
  
  try {
    var spreadsheet = SpreadsheetApp.openById(MASTER_STATUS_SHEET_ID);
  
    // Get or create sheets
    var proposalsSheet = getOrCreateSheet(spreadsheet, SHEET_NAME);
    var dataSheet = getOrCreateSheet(spreadsheet, DATA_SHEET_NAME);
  
    // Refresh name from document if available (ensures UI reflects latest doc title)
    if (data && data.documentId) {
      try {
        var docName = getDocumentName(data.documentId);
        if (docName) {
          data.name = docName;
        }
      } catch (ignore) {}
    }

    // Store full proposal data as JSON in data sheet
    var dataRange = dataSheet.getDataRange();
    var dataValues = dataRange.getValues();
    var proposalRow = -1;
  
    // Find existing row
    for (var i = 1; i < dataValues.length; i++) {
      if (dataValues[i][0] === proposalId) {
        proposalRow = i + 1;
        break;
      }
    }
  
    // Set headers if first time
    if (dataValues.length === 0) {
      dataSheet.getRange(1, 1, 1, 2).setValues([['Proposal ID', 'Data JSON']]);
    }
  
    // Save proposal data as JSON
    var jsonData = JSON.stringify(data);
    if (proposalRow === -1) {
      // New proposal - append row
      dataSheet.appendRow([proposalId, jsonData]);
    } else {
      // Update existing row
      dataSheet.getRange(proposalRow, 2).setValue(jsonData);
    }
  
    // Update master status table
    updateMasterStatusTable(proposalsSheet, data);
  
    data.updatedAt = new Date().toISOString();
  
    logAction('UPDATE', proposalId, {
      status: data.status,
      stage: data.stage
    });
  } catch (e) {
    Logger.log('Error in saveProposalData: ' + e.toString());
    Logger.log('Stack: ' + e.stack);
    throw e;
  }
}

/**
 * Get proposal data from Google Sheet
 */
function getProposalData(proposalId) {
  var masterSheetId = getMasterStatusSheetId();
  if (!masterSheetId) {
    return null;
  }
  
  try {
    var spreadsheet = SpreadsheetApp.openById(masterSheetId);
    var dataSheet = getOrCreateSheet(spreadsheet, DATA_SHEET_NAME);
    var dataRange = dataSheet.getDataRange();
    var dataValues = dataRange.getValues();
    
    // Find proposal by ID (column 0)
    for (var i = 1; i < dataValues.length; i++) {
      if (dataValues[i][0] === proposalId) {
        var jsonData = dataValues[i][1];
        if (jsonData) {
          return JSON.parse(jsonData);
        }
      }
    }
    
    return null;
  } catch (e) {
    Logger.log('Error getting proposal data: ' + e.toString());
    return null;
  }
}

/**
 * Return the current user's email (for UI gating)
 */
function getCurrentUserEmail() {
  return Session.getActiveUser().getEmail();
}

/**
 * Find proposal by name (case-insensitive, trimmed). Returns parsed proposal or null.
 */
function findProposalByName(name) {
  if (!name) return null;
  var masterSheetId = getMasterStatusSheetId();
  if (!masterSheetId) return null;

  try {
    var spreadsheet = SpreadsheetApp.openById(masterSheetId);
    var dataSheet = getOrCreateSheet(spreadsheet, DATA_SHEET_NAME);
    var dataValues = dataSheet.getDataRange().getValues();
    var target = name.trim().toLowerCase();

    for (var i = 1; i < dataValues.length; i++) {
      var jsonData = dataValues[i][1];
      if (!jsonData) continue;
      try {
        var proposal = JSON.parse(jsonData);
        if (proposal && proposal.name && proposal.name.trim().toLowerCase() === target) {
          return proposal;
        }
      } catch (e) {
        Logger.log('findProposalByName parse error at row ' + (i + 1) + ': ' + e.toString());
      }
    }
  } catch (e2) {
    Logger.log('findProposalByName error: ' + e2.toString());
  }

  return null;
}

/**
 * Find an open proposal by documentId (status not Closed). Returns parsed proposal or null.
 */
function findOpenProposalByDocumentId(documentId) {
  if (!documentId) return null;
  var masterSheetId = getMasterStatusSheetId();
  if (!masterSheetId) return null;

  try {
    var spreadsheet = SpreadsheetApp.openById(masterSheetId);
    var dataSheet = getOrCreateSheet(spreadsheet, DATA_SHEET_NAME);
    var dataValues = dataSheet.getDataRange().getValues();
    var target = documentId.trim();

    for (var i = 1; i < dataValues.length; i++) {
      var jsonData = dataValues[i][1];
      if (!jsonData) continue;
      try {
        var proposal = JSON.parse(jsonData);
        if (proposal && proposal.documentId && proposal.documentId.trim() === target) {
          if (!proposal.status || proposal.status !== 'Closed') {
            return proposal;
          }
        }
      } catch (e) {
        Logger.log('findOpenProposalByDocumentId parse error at row ' + (i + 1) + ': ' + e.toString());
      }
    }
  } catch (e2) {
    Logger.log('findOpenProposalByDocumentId error: ' + e2.toString());
  }

  return null;
}

/**
 * Return existing proposal names (case-preserving) for autocomplete.
 */
function getExistingProposalNames() {
  var masterSheetId = getMasterStatusSheetId();
  if (!masterSheetId) return [];

  try {
    var spreadsheet = SpreadsheetApp.openById(masterSheetId);
    var dataSheet = getOrCreateSheet(spreadsheet, DATA_SHEET_NAME);
    var dataValues = dataSheet.getDataRange().getValues();
    var names = [];
    for (var i = 1; i < dataValues.length; i++) {
      var jsonData = dataValues[i][1];
      if (!jsonData) continue;
      try {
        var proposal = JSON.parse(jsonData);
        if (proposal && proposal.name) {
          names.push(proposal.name);
        }
      } catch (e) {
        Logger.log('getExistingProposalNames parse error at row ' + (i + 1) + ': ' + e.toString());
      }
    }
    return dedupeEmails(names); // reuse dedupe helper
  } catch (e2) {
    Logger.log('getExistingProposalNames error: ' + e2.toString());
    return [];
  }
}

/**
 * Search Drive for Docs/Slides by filename (title contains query). Returns limited set.
 */
function searchDocsByName(query) {
  if (!query || query.trim().length < 3) return [];
  var q = query.trim();
  var results = [];
  try {
    // Only Docs or Slides
    var it = DriveApp.searchFiles(
      'title contains "' + q.replace(/"/g, '\\"') + '" and (' +
      'mimeType = "application/vnd.google-apps.document" or ' +
      'mimeType = "application/vnd.google-apps.presentation")'
    );
    var count = 0;
    while (it.hasNext() && count < 20) {
      var f = it.next();
      var mime = f.getMimeType();
      // Only include common doc types
      if (mime.indexOf('document') !== -1 || mime.indexOf('presentation') !== -1 || mime.indexOf('spreadsheet') !== -1) {
        results.push({
          id: f.getId(),
          name: f.getName(),
          url: f.getUrl(),
          mimeType: mime
        });
        count++;
      }
    }
  } catch (e) {
    Logger.log('searchDocsByName error: ' + e.toString());
  }
  return results;
}

/**
 * Validate that a document exists and is accessible.
 */
function validateDocumentAccess(documentId) {
  try {
    var file = DriveApp.getFileById(documentId);
    // Touch basic metadata to ensure access
    file.getName();
    return true;
  } catch (e) {
    throw new Error('Document not accessible. Confirm the link/ID and sharing. Details: ' + e.toString());
  }
}

/**
 * Return team emails. First try Admin Directory (requires service + scope), fallback to TEAM_EMAILS Script Property.
 */
function getTeamEmails() {
  Logger.log('[getTeamEmails] start');
  // Try Admin Directory if available
  try {
    if (typeof AdminDirectory !== 'undefined' && AdminDirectory.Users && AdminDirectory.Users.list) {
      var users = AdminDirectory.Users.list({
        customer: 'my_customer',
        maxResults: 200,
        orderBy: 'email',
        projection: 'basic'
      });
      if (users && users.users && users.users.length > 0) {
        var emails = users.users
          .filter(function(u) { return u && u.primaryEmail && !u.suspended; })
          .map(function(u) { return u.primaryEmail.toLowerCase(); });
        var dedupedDir = dedupeEmails(emails);
        Logger.log('[getTeamEmails] directory returned ' + dedupedDir.length + ' emails');
        return dedupedDir;
      }
    }
  } catch (e) {
    Logger.log('[getTeamEmails] directory fetch failed: ' + e.toString());
  }

  // Fallback to Script Property TEAM_EMAILS
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('TEAM_EMAILS') || '';
  if (!raw) {
    // As a last resort, return the active user so UI isn't empty
    var me = Session.getActiveUser() ? Session.getActiveUser().getEmail() : '';
    var fallback = me ? [me.toLowerCase()] : [];
    Logger.log('[getTeamEmails] no TEAM_EMAILS set; returning active user only: ' + fallback.length);
    return fallback;
  }
  var propEmails = dedupeEmails(raw.split(',').map(function(s) { return s.trim().toLowerCase(); }).filter(Boolean));
  Logger.log('[getTeamEmails] TEAM_EMAILS fallback count: ' + propEmails.length);
  return propEmails;
}

function dedupeEmails(arr) {
  var seen = {};
  var out = [];
  arr.forEach(function(e) {
    if (e && !seen[e]) {
      seen[e] = true;
      out.push(e);
    }
  });
  return out;
}

function getDocumentName(documentId) {
  try {
    var file = DriveApp.getFileById(documentId);
    return file.getName();
  } catch (e) {
    Logger.log('getDocumentName error: ' + e.toString());
    return '';
  }
}

/**
 * Debug helper: list a few directory users to confirm scope/permissions.
 */
function listUsersDebug() {
  Logger.log('[listUsersDebug] start');
  try {
    var resp = AdminDirectory.Users.list({
      customer: 'my_customer',
      maxResults: 5,
      orderBy: 'email'
    });
    if (resp && resp.users) {
      Logger.log('[listUsersDebug] count=' + resp.users.length);
      resp.users.forEach(function(u) {
        Logger.log(' - ' + (u.primaryEmail || '') + ' suspended=' + u.suspended);
      });
    } else {
      Logger.log('[listUsersDebug] no users returned');
    }
  } catch (e) {
    Logger.log('[listUsersDebug] error: ' + e.toString());
    throw e;
  }
  return 'done';
}

/**
 * Expose status options (stage choices) as a setting.
 */
function getStatusOptions() {
  return STATUS_OPTIONS;
}

/**
 * Simple profanity checker on first page/slide of a document.
 */
function checkForSwears(documentId) {
  var flagged = ['fuck', 'shit', 'bitch', 'asshole', 'damn'];
  var text = '';
  try {
    text = getFirstSlideText(documentId);
  } catch (e) {
    Logger.log('checkForSwears: getFirstSlideText failed ' + e.toString());
    throw e;
  }
  var lower = (text || '').toLowerCase();
  var matches = [];
  flagged.forEach(function(word) {
    if (lower.indexOf(word) !== -1) {
      matches.push(word);
    }
  });
  return {
    found: matches.length > 0,
    matches: matches
  };
}

/**
 * Delete a proposal (owner-only).
 */
function deleteProposal(proposalId) {
  if (!proposalId) {
    throw new Error('proposalId is required');
  }

  var masterSheetId = getMasterStatusSheetId();
  if (!masterSheetId) {
    throw new Error('MASTER_STATUS_SHEET_ID not configured.');
  }

  var userEmail = Session.getActiveUser().getEmail();
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    throw new Error('Proposal not found: ' + proposalId);
  }

  if (!proposal.owner || proposal.owner.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error('Only the proposal owner may delete this proposal.');
  }

  var spreadsheet = SpreadsheetApp.openById(masterSheetId);
  var dataSheet = getOrCreateSheet(spreadsheet, DATA_SHEET_NAME);
  var proposalsSheet = getOrCreateSheet(spreadsheet, SHEET_NAME);

  // Remove from data sheet
  removeProposalRow(dataSheet, proposalId, 0);
  // Remove from status sheet
  removeProposalRow(proposalsSheet, proposalId, 0);

  logAction('DELETE', proposalId, {
    name: proposal.name,
    owner: proposal.owner
  });

  return {
    success: true,
    deletedId: proposalId
  };
}

/**
 * Remove a row from a sheet by matching value in a column (0-based index).
 */
function removeProposalRow(sheet, id, colIndex) {
  var range = sheet.getDataRange();
  var values = range.getValues();
  for (var i = 1; i < values.length; i++) { // skip header
    if (values[i][colIndex] === id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

/**
 * Mark checklist item as complete/incomplete
 */
function updateChecklistItem(proposalId, itemId, completed) {
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    throw new Error('Proposal not found: ' + proposalId);
  }
  
  // Update in default checklist
  var found = false;
  if (proposal.checklist && proposal.checklist.items) {
    proposal.checklist.items.forEach(function(item) {
      if (item.id === itemId) {
        item.completed = completed;
        found = true;
      }
    });
  }
  
  // Update in custom items
  if (!found && proposal.customChecklistItems) {
    proposal.customChecklistItems.forEach(function(item) {
      if (item.id === itemId) {
        item.completed = completed;
        found = true;
      }
    });
  }
  
  if (found) {
    // Recalculate progress
    proposal.progress = calculateProgress(proposal);
    saveProposalData(proposalId, proposal);
    
    logAction('CHECK_COMPLETE', proposalId, {
      itemId: itemId,
      completed: completed
    });
  }
  
  return proposal;
}

/**
 * Get proposal status
 */
function getProposalStatus(proposalId) {
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    return null;
  }
  
  return {
    id: proposal.id,
    name: proposal.name,
    status: proposal.status,
    stage: proposal.stage,
    progress: proposal.progress,
    updatedAt: proposal.updatedAt
  };
}

/**
 * Get all open proposals for dashboard
 */
function getAllProposals() {
  Logger.log('=== getAllProposals START ===');
  Logger.log('Timestamp: ' + new Date().toISOString());
  
  var masterSheetId = getMasterStatusSheetId();
  Logger.log('masterSheetId: [' + masterSheetId + ']');
  
  if (!masterSheetId) {
    Logger.log('ERROR: No masterSheetId - returning empty array');
    return [];
  }
  
  try {
    Logger.log('Opening spreadsheet...');
    var spreadsheet = SpreadsheetApp.openById(masterSheetId);
    Logger.log('Spreadsheet opened successfully');
    
    var dataSheet = getOrCreateSheet(spreadsheet, DATA_SHEET_NAME);
    Logger.log('Data sheet retrieved: ' + dataSheet.getName());
    
    var dataRange = dataSheet.getDataRange();
    var dataValues = dataRange.getValues();
    
    Logger.log('Data range: ' + dataRange.getNumRows() + ' rows, ' + dataRange.getNumColumns() + ' cols');
    Logger.log('Data values length: ' + dataValues.length);
    
    if (dataValues.length < 2) {
      Logger.log('No proposals found - only ' + dataValues.length + ' row(s) (header only or empty)');
      Logger.log('=== getAllProposals END (empty) ===');
      return []; // No data rows (header only)
    }
    
    var proposals = [];
    Logger.log('Processing ' + (dataValues.length - 1) + ' proposal row(s)...');
    
    // Read all proposals from the data sheet (skip header row)
    for (var i = 1; i < dataValues.length; i++) {
      var proposalId = dataValues[i][0];
      Logger.log('Row ' + i + ': proposalId = [' + proposalId + ']');
      
      if (!proposalId) {
        Logger.log('Row ' + i + ': Skipping - no proposalId');
        continue;
      }
      
      try {
        var jsonData = dataValues[i][1];
        Logger.log('Row ' + i + ': jsonData length = ' + (jsonData ? jsonData.length : 'null'));
        
        if (jsonData) {
          var proposal = JSON.parse(jsonData);
          Logger.log('Row ' + i + ': Parsed proposal - name: ' + proposal.name + ', status: ' + proposal.status);
          // Always derive display title from source document when possible
          var displayName = proposal.documentId ? (getDocumentName(proposal.documentId) || proposal.name) : proposal.name;
          
          // Only include open proposals
          if (proposal.status !== 'Closed') {
            proposals.push({
              id: proposal.id,
              name: displayName,
              type: proposal.type,
              status: proposal.status,
              stage: proposal.stage,
              progress: proposal.progress,
              owner: proposal.owner, // kept for compatibility
              creator: proposal.owner,
              assignee: proposal.assignees && proposal.assignees.length > 0 ? proposal.assignees[0] : '',
              updatedAt: proposal.updatedAt,
              deadline: proposal.deadline
            });
            Logger.log('Row ' + i + ': Added to proposals array');
          } else {
            Logger.log('Row ' + i + ': Skipped - status is Closed');
          }
        } else {
          Logger.log('Row ' + i + ': No jsonData found');
        }
      } catch (e) {
        Logger.log('ERROR parsing proposal row ' + i + ' (ID: ' + proposalId + '): ' + e.toString());
        Logger.log('Stack: ' + e.stack);
      }
    }
    
    Logger.log('=== getAllProposals END: Returning ' + proposals.length + ' proposal(s) ===');
    return proposals;
  } catch (e) {
    Logger.log('=== getAllProposals ERROR ===');
    Logger.log('Error: ' + e.toString());
    Logger.log('Stack: ' + e.stack);
    return [];
  }
}

/**
 * Update proposal status
 */
function updateProposalStatus(proposalId, newStatus) {
  Logger.log('[updateProposalStatus] start id=%s new=%s', proposalId, newStatus);
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    throw new Error('Proposal not found: ' + proposalId);
  }
  
  var oldStatus = proposal.status;
  proposal.status = newStatus;
  // Keep stage aligned to status list (no early/mid/late mapping)
  proposal.stage = newStatus;
  
  saveProposalData(proposalId, proposal);
  
  logAction('STATUS_CHANGE', proposalId, {
    oldStatus: oldStatus,
    newStatus: newStatus
  });
  
  var warnings = [];
  // POC: when moving from first to second status option, run swear check on first page
  if (STATUS_OPTIONS && STATUS_OPTIONS.length >= 2 &&
      oldStatus === STATUS_OPTIONS[0] && newStatus === STATUS_OPTIONS[1]) {
    try {
      Logger.log('[updateProposalStatus] running swear check; docId=%s', proposal.documentId || 'none');
      if (!proposal.documentId) {
        warnings.push('No document linked; cannot scan for flagged words.');
      } else {
        var scan = checkForSwears(proposal.documentId);
        Logger.log('[updateProposalStatus] swear check result found=%s matches=%s', scan && scan.found, scan && scan.matches ? scan.matches.join(',') : '');
        if (scan && scan.found && scan.matches && scan.matches.length > 0) {
          warnings.push('Flagged words detected: ' + scan.matches.join(', '));
        }
      }
    } catch (e) {
      warnings.push('Swear check failed: ' + e.toString());
      Logger.log('[updateProposalStatus] swear check exception: ' + e.toString());
    }
  }
  Logger.log('[updateProposalStatus] end id=%s old=%s new=%s warnings=%s', proposalId, oldStatus, newStatus, warnings.join('; '));
  return {
    proposal: proposal,
    warnings: warnings
  };
}

/**
 * Expose status options for UI (config-based)
 */
function getStatusOptions() {
  return STATUS_OPTIONS || [];
}

/**
 * Simple profanity checker on first page/slide of a document.
 */
function checkForSwears(documentId) {
  var flagged = ['fuck', 'shit', 'bitch', 'asshole', 'damn'];
  var text = '';
  try {
    text = getFirstSlideText(documentId);
  } catch (e) {
    Logger.log('checkForSwears: getFirstSlideText failed ' + e.toString());
    throw e;
  }
  var lower = (text || '').toLowerCase();
  var matches = [];
  flagged.forEach(function(word) {
    if (lower.indexOf(word) !== -1) {
      matches.push(word);
    }
  });
  Logger.log('checkForSwears: found=%s matches=%s', matches.length > 0, matches.join(','));
  return {
    found: matches.length > 0,
    matches: matches
  };
}

/**
 * Run pre-submission validation
 * Checks all custom required strings and ensures all requirements are met
 */
function validateBeforeSubmission(proposalId) {
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    throw new Error('Proposal not found: ' + proposalId);
  }
  
  var validationResults = {
    valid: true,
    errors: [],
    warnings: [],
    missingStrings: [],
    incompleteItems: []
  };
  
  // Check required strings
  if (proposal.requiredStrings && proposal.requiredStrings.length > 0) {
    if (!proposal.documentId) {
      validationResults.errors.push('Proposal document not linked');
      validationResults.valid = false;
    } else {
      var docText = extractTextFromDocument(proposal.documentId).toLowerCase();
      
      proposal.requiredStrings.forEach(function(req) {
        if (docText.indexOf(req.string.toLowerCase()) === -1) {
          validationResults.missingStrings.push({
            string: req.string,
            description: req.description
          });
          validationResults.warnings.push('Required string not found: ' + req.string);
        }
      });
      
      if (validationResults.missingStrings.length > 0) {
        validationResults.valid = false;
      }
    }
  }
  
  // Check required checklist items
  var allItems = [];
  if (proposal.checklist && proposal.checklist.items) {
    allItems = allItems.concat(proposal.checklist.items);
  }
  if (proposal.customChecklistItems) {
    allItems = allItems.concat(proposal.customChecklistItems);
  }
  
  allItems.forEach(function(item) {
    if (!item.completed && item.required !== false) {
      validationResults.incompleteItems.push({
        id: item.id,
        description: item.description
      });
    }
  });
  
  if (validationResults.incompleteItems.length > 0) {
    validationResults.warnings.push(validationResults.incompleteItems.length + ' checklist items incomplete');
  }
  
  // Log validation
  logAction('VALIDATION_RUN', proposalId, {
    valid: validationResults.valid,
    errors: validationResults.errors.length,
    warnings: validationResults.warnings.length,
    missingStrings: validationResults.missingStrings.length
  });
  
  return validationResults;
}

// Helper functions

function parseMarkdownChecklist(text) {
  // Simple markdown parser for checklist
  var lines = text.split('\n');
  var checklist = {
    items: [],
    sections: []
  };
  
  var currentSection = null;
  var itemId = 0;
  
  lines.forEach(function(line) {
    line = line.trim();
    
    // Check for section headers
    if (line.indexOf('##') === 0) {
      currentSection = line.replace('##', '').trim();
      checklist.sections.push(currentSection);
    }
    
    // Check for checklist items
    if (line.indexOf('- [ ]') === 0 || line.indexOf('- [x]') === 0) {
      var completed = line.indexOf('- [x]') === 0;
      var description = line.replace(/^- \[[x ]\]/, '').trim();
      
      // Parse metadata tags
      var checkType = null;
      var stage = null;
      var requiredStrings = [];
      
      if (description.indexOf('[check:spelling]') !== -1) {
        checkType = 'spelling';
        description = description.replace('[check:spelling]', '').trim();
      } else if (description.indexOf('[check:completeness]') !== -1) {
        checkType = 'completeness';
        description = description.replace('[check:completeness]', '').trim();
      } else if (description.indexOf('[check:strings:') !== -1) {
        checkType = 'strings';
        var match = description.match(/\[check:strings:([^\]]+)\]/);
        if (match) {
          requiredStrings = match[1].split(',');
          description = description.replace(/\[check:strings:[^\]]+\]/, '').trim();
        }
      }
      
      // Parse stage
      if (description.indexOf('[stage:early]') !== -1) {
        stage = 'early';
        description = description.replace('[stage:early]', '').trim();
      } else if (description.indexOf('[stage:mid]') !== -1) {
        stage = 'mid';
        description = description.replace('[stage:mid]', '').trim();
      } else if (description.indexOf('[stage:late]') !== -1) {
        stage = 'late';
        description = description.replace('[stage:late]', '').trim();
      }
      
      checklist.items.push({
        id: 'item_' + itemId++,
        description: description,
        completed: completed,
        section: currentSection,
        checkType: checkType,
        stage: stage,
        requiredStrings: requiredStrings,
        custom: false
      });
    }
  });
  
  return checklist;
}

function getDefaultChecklist() {
  // Return a basic default checklist structure
  return {
    items: [
      {
        id: 'default_1',
        description: 'Review RFP/requirements document',
        completed: false,
        section: 'Pre-submission',
        checkType: 'completeness',
        stage: 'early',
        custom: false
      }
    ],
    sections: ['Pre-submission', 'Document Preparation', 'Review & Approval', 'Submission']
  };
}

function calculateProgress(proposal) {
  var allItems = [];
  if (proposal.checklist && proposal.checklist.items) {
    allItems = allItems.concat(proposal.checklist.items);
  }
  if (proposal.customChecklistItems) {
    allItems = allItems.concat(proposal.customChecklistItems);
  }
  
  if (allItems.length === 0) return 0;
  
  var completed = allItems.filter(function(item) { return item.completed; }).length;
  return Math.round((completed / allItems.length) * 100);
}

/**
 * Get or create a sheet by name
 */
function getOrCreateSheet(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    if (sheetName === DATA_SHEET_NAME) {
      // Hide the data sheet
      sheet.hideSheet();
    }
  }
  return sheet;
}

/**
 * Update master status table in the proposals sheet
 */
function updateMasterStatusTable(sheet, data) {
  var range = sheet.getDataRange();
  var values = range.getValues();
  
  // Set headers if first time
  if (values.length === 0) {
    var headers = ['Proposal ID', 'Proposal Name', 'Type', 'Status', 'Progress %', 'Creator', 'Assignee', 'Last Updated', 'Deadline', 'Next Action'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    values = [[headers]];
  }
  
  // Find existing row by Proposal ID
  var proposalIdCol = 0; // Column A
  var rowIndex = -1;
  
  for (var i = 1; i < values.length; i++) {
    if (values[i][proposalIdCol] === data.id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  // Prepare row data
  var deadlineStr = '';
  if (data.deadline) {
    if (typeof data.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.deadline)) {
      deadlineStr = data.deadline; // keep date-only string to avoid TZ shifts
    } else {
      deadlineStr = new Date(data.deadline).toLocaleDateString();
    }
  }

  var rowData = [
    data.id,
    (data.documentId ? (getDocumentName(data.documentId) || data.name) : data.name),
    data.type,
    data.status,
    data.progress + '%',
    data.owner,
    (data.assignees && data.assignees.length > 0 ? data.assignees[0] : ''),
    data.updatedAt ? new Date(data.updatedAt).toLocaleString() : '',
    deadlineStr,
    getNextAction(data)
  ];
  
  if (rowIndex === -1) {
    // New proposal - append row
    sheet.appendRow(rowData);
  } else {
    // Update existing row
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  }
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, rowData.length);
}

/**
 * Determine next action based on proposal status and progress
 */
function getNextAction(data) {
  if (data.status === 'Draft') {
    return 'Complete initial checklist items';
  } else if (data.status === 'In Progress') {
    if (data.progress < 50) {
      return 'Continue document preparation';
    } else {
      return 'Prepare for review';
    }
  } else if (data.status === 'In Review') {
    return 'Complete review process';
  } else if (data.status === 'Ready for Submission') {
    return 'Submit proposal';
  } else if (data.status === 'Submitted') {
    return 'Follow up with client';
  }
  return '';
}

