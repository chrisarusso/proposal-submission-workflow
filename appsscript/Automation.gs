/**
 * Proposal Submission Workflow - Automation
 * Handles custom script execution and LLM API integration
 */

/**
 * Execute automated check based on checklist marker and current stage
 * @param {string} checkId - Check item ID
 * @param {string} proposalId - Proposal ID
 * @param {string} stage - Current stage (early, mid, late)
 * @return {object} Check result
 */
function executeAutomatedCheck(checkId, proposalId, stage) {
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    throw new Error('Proposal not found: ' + proposalId);
  }
  
  // Find the check item
  var checkItem = null;
  if (proposal.checklist && proposal.checklist.items) {
    checkItem = proposal.checklist.items.find(function(item) {
      return item.id === checkId;
    });
  }
  
  if (!checkItem && proposal.customChecklistItems) {
    checkItem = proposal.customChecklistItems.find(function(item) {
      return item.id === checkId;
    });
  }
  
  if (!checkItem) {
    throw new Error('Check item not found: ' + checkId);
  }
  
  // Check if this check is applicable for current stage
  if (checkItem.stage && checkItem.stage !== stage) {
    return {
      success: false,
      message: 'Check not applicable for current stage',
      stage: stage,
      requiredStage: checkItem.stage
    };
  }
  
  var result = null;
  
  // Execute based on check type
  if (checkItem.checkType === 'spelling') {
    result = runSpellingGrammarCheck(proposal.documentId, getLLMConfig());
  } else if (checkItem.checkType === 'completeness') {
    result = runCompletenessCheck(proposal.documentId, proposal);
  } else if (checkItem.checkType === 'strings') {
    var requiredStrings = checkItem.requiredStrings || [];
    // Also include custom required strings for this proposal
    if (proposal.requiredStrings) {
      proposal.requiredStrings.forEach(function(req) {
        requiredStrings.push(req.string);
      });
    }
    result = runStringMatchCheck(proposal.documentId, requiredStrings);
  } else {
    result = {
      success: false,
      message: 'Unknown check type: ' + checkItem.checkType
    };
  }
  
  // Process and log result
  processCheckResult(checkId, proposalId, result, stage);
  
  return result;
}

/**
 * Execute all checks applicable to current proposal stage
 * @param {string} proposalId - Proposal ID
 * @param {string} stage - Current stage (early, mid, late)
 * @return {object} Combined results for all checks
 */
function runStageBasedChecks(proposalId, stage) {
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    throw new Error('Proposal not found: ' + proposalId);
  }
  
  var checks = getChecksForStage(stage, proposal);
  var results = {
    stage: stage,
    checks: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };
  
  checks.forEach(function(check) {
    try {
      var result = executeAutomatedCheck(check.id, proposalId, stage);
      results.checks.push({
        checkId: check.id,
        description: check.description,
        result: result
      });
      
      results.summary.total++;
      if (result.success) {
        results.summary.passed++;
      } else {
        results.summary.failed++;
      }
      if (result.warnings && result.warnings.length > 0) {
        results.summary.warnings += result.warnings.length;
      }
    } catch (e) {
      Logger.log('Error executing check ' + check.id + ': ' + e.toString());
      results.checks.push({
        checkId: check.id,
        description: check.description,
        result: {
          success: false,
          error: e.toString()
        }
      });
      results.summary.total++;
      results.summary.failed++;
    }
  });
  
  // Log the stage-based check run
  logAction('CHECK_AUTO_RUN', proposalId, {
    stage: stage,
    totalChecks: results.summary.total,
    passed: results.summary.passed,
    failed: results.summary.failed
  });
  
  return results;
}

/**
 * Extract text from Google Doc or Slides
 * @param {string} documentId - Google Doc or Slides ID
 * @return {string} Extracted text
 */
function extractTextFromDocument(documentId) {
  try {
    // Try as Google Doc first
    try {
      var doc = DocumentApp.openById(documentId);
      return doc.getBody().getText();
    } catch (e) {
      // If that fails, try as Google Slides
      var presentation = SlidesApp.openById(documentId);
      var slides = presentation.getSlides();
      var text = '';
      
      slides.forEach(function(slide) {
        var shapes = slide.getShapes();
        shapes.forEach(function(shape) {
          if (shape.getShapeType() === SlidesApp.ShapeType.TEXT_BOX) {
            text += shape.getText().asString() + '\n';
          }
        });
        
        // Also check for tables
        var tables = slide.getTables();
        tables.forEach(function(table) {
          var numRows = table.getNumRows();
          var numCols = table.getNumColumns();
          for (var i = 0; i < numRows; i++) {
            for (var j = 0; j < numCols; j++) {
              text += table.getCell(i, j).getText().asString() + ' ';
            }
            text += '\n';
          }
        });
      });
      
      return text;
    }
  } catch (e) {
    Logger.log('Error extracting text from document: ' + e.toString());
    throw new Error('Unable to extract text from document. Make sure it is a Google Doc or Slides.');
  }
}

/**
 * LLM-based spelling and grammar check
 * @param {string} documentId - Google Doc or Slides ID
 * @param {object} llmConfig - LLM configuration
 * @return {object} Check result with errors and suggestions
 */
function runSpellingGrammarCheck(documentId, llmConfig) {
  if (!documentId) {
    return {
      success: false,
      message: 'Document not linked to proposal'
    };
  }
  
  try {
    var text = extractTextFromDocument(documentId);
    
    if (!text || text.length < 100) {
      return {
        success: false,
        message: 'Document too short for meaningful analysis'
      };
    }
    
    // Call LLM API for spelling/grammar check
    var prompt = 'Please review the following text for spelling and grammar errors. ' +
                 'Return a JSON object with an "errors" array. Each error should have: ' +
                 '{"text": "the error text", "suggestion": "suggested correction", "line": line_number}. ' +
                 'Text to review:\n\n' + text.substring(0, 8000); // Limit text length
    
    var llmResponse = callLLMAPI(llmConfig.provider, 'chat/completions', {
      model: llmConfig.model || 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a professional proofreader. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    }, llmConfig.apiKey);
    
    var errors = [];
    if (llmResponse && llmResponse.choices && llmResponse.choices.length > 0) {
      try {
        var content = llmResponse.choices[0].message.content;
        var parsed = JSON.parse(content);
        if (parsed.errors) {
          errors = parsed.errors;
        }
      } catch (e) {
        Logger.log('Error parsing LLM response: ' + e.toString());
      }
    }
    
    return {
      success: true,
      checkType: 'spelling',
      errors: errors,
      errorCount: errors.length,
      message: errors.length === 0 ? 'No spelling or grammar errors found' : 
               'Found ' + errors.length + ' potential error(s)'
    };
  } catch (e) {
    Logger.log('Error running spelling/grammar check: ' + e.toString());
    return {
      success: false,
      error: e.toString(),
      message: 'Error running spelling/grammar check'
    };
  }
}

/**
 * Verify all required sections present
 * @param {string} documentId - Google Doc or Slides ID
 * @param {object} proposal - Proposal object with checklist
 * @return {object} Completeness check result
 */
function runCompletenessCheck(documentId, proposal) {
  if (!documentId) {
    return {
      success: false,
      message: 'Document not linked to proposal'
    };
  }
  
  try {
    var docText = extractTextFromDocument(documentId).toLowerCase();
    
    // Get all required sections from checklist
    var requiredSections = [];
    if (proposal.checklist && proposal.checklist.items) {
      proposal.checklist.items.forEach(function(item) {
        if (item.checkType === 'completeness' && item.description) {
          // Extract section name from description
          var sectionName = extractSectionName(item.description);
          if (sectionName) {
            requiredSections.push({
              name: sectionName,
              description: item.description,
              found: false
            });
          }
        }
      });
    }
    
    // Check for each section
    var foundSections = [];
    var missingSections = [];
    
    requiredSections.forEach(function(section) {
      // Simple keyword matching - could be enhanced
      var keywords = section.name.toLowerCase().split(/\s+/);
      var found = keywords.some(function(keyword) {
        return docText.indexOf(keyword) !== -1;
      });
      
      section.found = found;
      if (found) {
        foundSections.push(section.name);
      } else {
        missingSections.push(section.name);
      }
    });
    
    var completionPercentage = requiredSections.length > 0 ? 
      Math.round((foundSections.length / requiredSections.length) * 100) : 100;
    
    return {
      success: missingSections.length === 0,
      checkType: 'completeness',
      completionPercentage: completionPercentage,
      foundSections: foundSections,
      missingSections: missingSections,
      totalSections: requiredSections.length,
      message: missingSections.length === 0 ? 
        'All required sections found (' + completionPercentage + '%)' :
        'Missing ' + missingSections.length + ' required section(s): ' + missingSections.join(', ')
    };
  } catch (e) {
    Logger.log('Error running completeness check: ' + e.toString());
    return {
      success: false,
      error: e.toString(),
      message: 'Error running completeness check'
    };
  }
}

/**
 * Check for required strings/patterns in document
 * @param {string} documentId - Google Doc or Slides ID
 * @param {Array<string>} requiredStrings - Array of strings to find
 * @return {object} String match check result
 */
function runStringMatchCheck(documentId, requiredStrings) {
  if (!documentId) {
    return {
      success: false,
      message: 'Document not linked to proposal'
    };
  }
  
  if (!requiredStrings || requiredStrings.length === 0) {
    return {
      success: true,
      message: 'No required strings specified'
    };
  }
  
  try {
    var docText = extractTextFromDocument(documentId);
    var docTextLower = docText.toLowerCase();
    
    var foundStrings = [];
    var missingStrings = [];
    var stringLocations = {};
    
    requiredStrings.forEach(function(str) {
      var strLower = str.toLowerCase();
      var index = docTextLower.indexOf(strLower);
      
      if (index !== -1) {
        foundStrings.push(str);
        // Find line number (approximate)
        var beforeMatch = docText.substring(0, index);
        var lineNumber = beforeMatch.split('\n').length;
        stringLocations[str] = {
          found: true,
          position: index,
          line: lineNumber,
          context: docText.substring(Math.max(0, index - 50), Math.min(docText.length, index + str.length + 50))
        };
      } else {
        missingStrings.push(str);
        stringLocations[str] = {
          found: false
        };
      }
    });
    
    return {
      success: missingStrings.length === 0,
      checkType: 'strings',
      foundStrings: foundStrings,
      missingStrings: missingStrings,
      stringLocations: stringLocations,
      totalStrings: requiredStrings.length,
      foundCount: foundStrings.length,
      missingCount: missingStrings.length,
      message: missingStrings.length === 0 ?
        'All required strings found (' + foundStrings.length + '/' + requiredStrings.length + ')' :
        'Missing ' + missingStrings.length + ' required string(s): ' + missingStrings.join(', ')
    };
  } catch (e) {
    Logger.log('Error running string match check: ' + e.toString());
    return {
      success: false,
      error: e.toString(),
      message: 'Error running string match check'
    };
  }
}

/**
 * Count occurrences of a word (case-insensitive, whole word) in a Doc/Slides document
 * @param {string} documentId
 * @param {string} word
 * @return {object} { success, count, message }
 */
function countWordOccurrences(documentId, word) {
  if (!documentId) {
    return {
      success: false,
      message: 'Document not linked to proposal'
    };
  }
  if (!word) {
    return {
      success: false,
      message: 'No word provided'
    };
  }
  try {
    var text = extractTextFromDocument(documentId);
    if (!text) {
      return {
        success: false,
        message: 'No text extracted from document'
      };
    }
    // Escape regex special chars
    var escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp('\\b' + escaped + '\\b', 'gi');
    var matches = text.match(regex);
    var count = matches ? matches.length : 0;
    return {
      success: true,
      word: word,
      count: count,
      message: 'Found ' + count + ' occurrence(s) of "' + word + '"'
    };
  } catch (e) {
    Logger.log('Error counting word occurrences: ' + e.toString());
    return {
      success: false,
      message: 'Error counting word occurrences: ' + e.toString()
    };
  }
}

/**
 * Execute custom analysis script
 * @param {string} scriptName - Name of script to run
 * @param {object} proposalData - Proposal data
 * @param {string} stage - Current stage
 * @return {object} Analysis results
 */
function runCustomScript(scriptName, proposalData, stage) {
  try {
    // Load script from scripts directory
    // Note: In Google Apps Script, you'd need to include the script as a library
    // or load it from a Google Doc/Drive file
    // This is a placeholder implementation
    
    var scriptContent = loadScriptContent(scriptName);
    if (!scriptContent) {
      return {
        success: false,
        message: 'Script not found: ' + scriptName
      };
    }
    
    // Execute script (simplified - actual implementation would use eval or similar)
    // WARNING: Using eval is dangerous - in production, use a safer method
    // For now, return a placeholder result
    return {
      success: true,
      checkType: 'custom',
      scriptName: scriptName,
      message: 'Custom script executed (placeholder)',
      result: {
        stage: stage,
        proposalId: proposalData.id
      }
    };
  } catch (e) {
    Logger.log('Error running custom script: ' + e.toString());
    return {
      success: false,
      error: e.toString(),
      message: 'Error running custom script'
    };
  }
}

/**
 * Generic LLM API caller
 * @param {string} provider - LLM provider (openai, anthropic, google)
 * @param {string} endpoint - API endpoint
 * @param {object} payload - Request payload
 * @param {string} apiKey - API key
 * @return {object} API response
 */
function callLLMAPI(provider, endpoint, payload, apiKey) {
  if (!apiKey) {
    throw new Error('API key not provided');
  }
  
  var url = '';
  var options = {
    method: 'post',
    headers: {},
    payload: JSON.stringify(payload),
    contentType: 'application/json'
  };
  
  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/' + endpoint;
    options.headers['Authorization'] = 'Bearer ' + apiKey;
  } else if (provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/' + endpoint;
    options.headers['x-api-key'] = apiKey;
    options.headers['anthropic-version'] = '2023-06-01';
  } else if (provider === 'google') {
    url = 'https://generativelanguage.googleapis.com/v1/' + endpoint + '?key=' + apiKey;
    // Google API format may differ
  } else {
    throw new Error('Unsupported provider: ' + provider);
  }
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      throw new Error('API request failed with code: ' + responseCode);
    }
    
    return JSON.parse(response.getContentText());
  } catch (e) {
    Logger.log('Error calling LLM API: ' + e.toString());
    throw e;
  }
}

/**
 * Set up LLM configuration
 * @param {string} provider - LLM provider
 * @param {string} apiKey - API key
 * @return {object} Configuration object
 */
function configureLLM(provider, apiKey) {
  if (!getSupportedProviders().includes(provider)) {
    throw new Error('Unsupported provider: ' + provider);
  }
  
  // Store in Script Properties (secure)
  var properties = PropertiesService.getScriptProperties();
  properties.setProperty('LLM_PROVIDER', provider);
  properties.setProperty('LLM_API_KEY', apiKey);
  
  return {
    provider: provider,
    apiKey: apiKey, // Note: In production, don't return the key
    configured: true
  };
}

/**
 * Get LLM configuration from Script Properties
 * @return {object} Configuration object
 */
function getLLMConfig() {
  var properties = PropertiesService.getScriptProperties();
  var provider = properties.getProperty('LLM_PROVIDER') || 'openai';
  var apiKey = properties.getProperty('LLM_API_KEY');
  
  if (!apiKey) {
    throw new Error('LLM API key not configured. Use configureLLM() to set it up.');
  }
  
  return {
    provider: provider,
    apiKey: apiKey,
    model: provider === 'openai' ? 'gpt-4' : 
           provider === 'anthropic' ? 'claude-3-opus-20240229' :
           provider === 'google' ? 'gemini-pro' : 'default'
  };
}

/**
 * Get list of supported LLM providers
 * @return {Array<string>} Array of provider names
 */
function getSupportedProviders() {
  return ['openai', 'anthropic', 'google'];
}

/**
 * Process check result and update proposal
 * @param {string} checkId - Check item ID
 * @param {string} proposalId - Proposal ID
 * @param {object} result - Check result
 * @param {string} stage - Current stage
 */
function processCheckResult(checkId, proposalId, result, stage) {
  var proposal = getProposalData(proposalId);
  if (!proposal) {
    return;
  }
  
  // Store check results
  if (!proposal.checkResults) {
    proposal.checkResults = {};
  }
  
  proposal.checkResults[checkId] = {
    result: result,
    stage: stage,
    timestamp: new Date().toISOString()
  };
  
  // Auto-complete if threshold met (configurable)
  var config = getAutomationConfig();
  if (result.success && config.autoCompleteThreshold !== false) {
    // Mark checklist item as complete
    updateChecklistItem(proposalId, checkId, true);
  }
  
  // Save updated proposal
  saveProposalData(proposalId, proposal);
  
  // Log action
  logAction('CHECK_AUTO_RUN', proposalId, {
    checkId: checkId,
    checkType: result.checkType,
    success: result.success,
    stage: stage,
    message: result.message
  });
}

/**
 * Load automation settings
 * @return {object} Automation configuration
 */
function getAutomationConfig() {
  var properties = PropertiesService.getScriptProperties();
  return {
    autoCompleteThreshold: properties.getProperty('AUTO_COMPLETE_THRESHOLD') !== 'false',
    stageMappings: {
      early: ['completeness'],
      mid: ['completeness', 'strings'],
      late: ['spelling', 'completeness', 'strings']
    }
  };
}

/**
 * Get checks applicable to given stage
 * @param {string} stage - Stage (early, mid, late)
 * @param {object} proposal - Proposal object
 * @return {Array} List of check items for stage
 */
function getChecksForStage(stage, proposal) {
  var checks = [];
  var config = getAutomationConfig();
  var allowedTypes = config.stageMappings[stage] || [];
  
  // Get checks from default checklist
  if (proposal.checklist && proposal.checklist.items) {
    proposal.checklist.items.forEach(function(item) {
      if (item.checkType && allowedTypes.includes(item.checkType)) {
        if (!item.stage || item.stage === stage) {
          checks.push(item);
        }
      }
    });
  }
  
  // Get checks from custom items
  if (proposal.customChecklistItems) {
    proposal.customChecklistItems.forEach(function(item) {
      if (item.checkType && allowedTypes.includes(item.checkType)) {
        if (!item.stage || item.stage === stage) {
          checks.push(item);
        }
      }
    });
  }
  
  return checks;
}

// Helper functions

function extractSectionName(description) {
  // Simple extraction - look for common section keywords
  var keywords = ['summary', 'approach', 'methodology', 'qualifications', 'budget', 'timeline', 'schedule', 'background', 'experience'];
  var descLower = description.toLowerCase();
  
  for (var i = 0; i < keywords.length; i++) {
    if (descLower.indexOf(keywords[i]) !== -1) {
      return keywords[i];
    }
  }
  
  return null;
}

function loadScriptContent(scriptName) {
  // Placeholder - would load from Drive or include as library
  // In production, scripts could be stored in a Google Doc or Drive folder
  return null;
}

