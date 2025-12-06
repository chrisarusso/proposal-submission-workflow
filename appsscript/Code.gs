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
 * Web app entry point - returns the dashboard HTML
 * Deploy this function as a web app to access via URL
 */
function doGet() {
  return showProposalDashboard();
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
 * Initialize new proposal with default checklist
 */
function createProposal(proposalData) {
  // Use helper function to get Sheet ID (checks Script Properties first)
  var masterSheetId = getMasterStatusSheetId();
  
  Logger.log('createProposal called');
  Logger.log('masterSheetId (from helper): [' + masterSheetId + ']');
  
  if (!masterSheetId || masterSheetId === '') {
    throw new Error('MASTER_STATUS_SHEET_ID not configured. Please run initializeSheetIds() or set Script Properties.');
  }
  
  var proposalId = Utilities.getUuid();
  var user = Session.getActiveUser().getEmail();
  
  var proposal = {
    id: proposalId,
    name: proposalData.name || 'Untitled Proposal',
    type: proposalData.type || 'RFP', // RFP or Client
    status: 'Draft',
    stage: 'early',
    owner: user,
    assignees: proposalData.assignees || [],
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
          
          // Only include open proposals
          if (proposal.status !== 'Closed') {
            proposals.push({
              id: proposal.id,
              name: proposal.name,
              type: proposal.type,
              status: proposal.status,
              progress: proposal.progress,
              owner: proposal.owner,
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
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    throw new Error('Proposal not found: ' + proposalId);
  }
  
  var oldStatus = proposal.status;
  proposal.status = newStatus;
  
  // Update stage based on status
  if (newStatus === 'Draft' || newStatus === 'In Progress') {
    proposal.stage = 'early';
  } else if (newStatus === 'In Review') {
    proposal.stage = 'mid';
  } else if (newStatus === 'Ready for Submission' || newStatus === 'Submitted') {
    proposal.stage = 'late';
  }
  
  saveProposalData(proposalId, proposal);
  
  logAction('STATUS_CHANGE', proposalId, {
    oldStatus: oldStatus,
    newStatus: newStatus
  });
  
  return proposal;
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
    var headers = ['Proposal ID', 'Proposal Name', 'Type', 'Status', 'Progress %', 'Owner', 'Last Updated', 'Deadline', 'Next Action'];
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
  var rowData = [
    data.id,
    data.name,
    data.type,
    data.status,
    data.progress + '%',
    data.owner,
    data.updatedAt ? new Date(data.updatedAt).toLocaleString() : '',
    data.deadline ? new Date(data.deadline).toLocaleDateString() : '',
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

