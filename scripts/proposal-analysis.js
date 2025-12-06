/**
 * Example Custom Analysis Script for Proposal Submission Workflow
 * 
 * This script demonstrates how to create custom analysis functions
 * that can be called by the Automation.gs module.
 * 
 * To use this script:
 * 1. Store it in a Google Doc or Drive file
 * 2. Reference it in Automation.gs via loadScriptContent()
 * 3. Call it using runCustomScript() with appropriate parameters
 */

/**
 * Analyze proposal budget section
 * Checks for common budget issues and validates structure
 * 
 * @param {object} proposalData - Proposal data object
 * @param {string} stage - Current stage (early, mid, late)
 * @return {object} Analysis result
 */
function analyzeBudget(proposalData, stage) {
  var result = {
    success: true,
    checkType: 'custom',
    scriptName: 'budget-analysis',
    issues: [],
    warnings: [],
    summary: {}
  };
  
  // This would typically extract text from the proposal document
  // For demo purposes, we'll simulate analysis
  var documentText = proposalData.documentText || '';
  
  // Check for budget section
  if (documentText.toLowerCase().indexOf('budget') === -1 &&
      documentText.toLowerCase().indexOf('pricing') === -1 &&
      documentText.toLowerCase().indexOf('cost') === -1) {
    result.issues.push('Budget section not found');
    result.success = false;
  }
  
  // Check for common budget elements
  var budgetKeywords = ['labor', 'materials', 'overhead', 'profit', 'total'];
  var foundKeywords = [];
  
  budgetKeywords.forEach(function(keyword) {
    if (documentText.toLowerCase().indexOf(keyword) !== -1) {
      foundKeywords.push(keyword);
    }
  });
  
  if (foundKeywords.length < 3) {
    result.warnings.push('Budget section may be incomplete. Found only: ' + foundKeywords.join(', '));
  }
  
  result.summary = {
    budgetSectionFound: result.issues.length === 0,
    keywordsFound: foundKeywords.length,
    totalKeywords: budgetKeywords.length
  };
  
  result.message = result.success ? 
    'Budget analysis passed. Found ' + foundKeywords.length + ' budget elements.' :
    'Budget analysis failed: ' + result.issues.join(', ');
  
  return result;
}

/**
 * Validate proposal compliance with RFP requirements
 * Checks for required sections and keywords
 * 
 * @param {object} proposalData - Proposal data object
 * @param {string} stage - Current stage (early, mid, late)
 * @return {object} Analysis result
 */
function validateRFPCompliance(proposalData, stage) {
  var result = {
    success: true,
    checkType: 'custom',
    scriptName: 'rfp-compliance',
    missingSections: [],
    missingKeywords: [],
    complianceScore: 100
  };
  
  var documentText = proposalData.documentText || '';
  var docLower = documentText.toLowerCase();
  
  // Required sections for RFP compliance
  var requiredSections = [
    'executive summary',
    'technical approach',
    'project team',
    'project timeline',
    'budget',
    'company background'
  ];
  
  requiredSections.forEach(function(section) {
    if (docLower.indexOf(section) === -1) {
      result.missingSections.push(section);
      result.complianceScore -= 15;
    }
  });
  
  // Check for required keywords (example)
  var requiredKeywords = proposalData.requiredKeywords || [];
  requiredKeywords.forEach(function(keyword) {
    if (docLower.indexOf(keyword.toLowerCase()) === -1) {
      result.missingKeywords.push(keyword);
      result.complianceScore -= 5;
    }
  });
  
  result.success = result.complianceScore >= 70;
  result.message = result.success ?
    'RFP compliance check passed. Score: ' + result.complianceScore + '%' :
    'RFP compliance check failed. Score: ' + result.complianceScore + '%. Missing: ' + 
    result.missingSections.concat(result.missingKeywords).join(', ');
  
  return result;
}

/**
 * Analyze proposal quality metrics
 * Provides overall quality score based on various factors
 * 
 * @param {object} proposalData - Proposal data object
 * @param {string} stage - Current stage (early, mid, late)
 * @return {object} Analysis result
 */
function analyzeQuality(proposalData, stage) {
  var result = {
    success: true,
    checkType: 'custom',
    scriptName: 'quality-analysis',
    qualityScore: 0,
    metrics: {},
    recommendations: []
  };
  
  var documentText = proposalData.documentText || '';
  var wordCount = documentText.split(/\s+/).length;
  var charCount = documentText.length;
  
  // Calculate quality metrics
  var metrics = {
    wordCount: wordCount,
    charCount: charCount,
    hasExecutiveSummary: documentText.toLowerCase().indexOf('executive summary') !== -1,
    hasTimeline: documentText.toLowerCase().indexOf('timeline') !== -1 || 
                 documentText.toLowerCase().indexOf('schedule') !== -1,
    hasBudget: documentText.toLowerCase().indexOf('budget') !== -1,
    hasTeamInfo: documentText.toLowerCase().indexOf('team') !== -1 || 
                 documentText.toLowerCase().indexOf('qualifications') !== -1
  };
  
  // Calculate quality score
  var score = 0;
  if (metrics.hasExecutiveSummary) score += 20;
  if (metrics.hasTimeline) score += 20;
  if (metrics.hasBudget) score += 20;
  if (metrics.hasTeamInfo) score += 20;
  if (wordCount > 1000) score += 20;
  
  result.qualityScore = score;
  result.metrics = metrics;
  
  // Generate recommendations
  if (!metrics.hasExecutiveSummary) {
    result.recommendations.push('Add an executive summary section');
  }
  if (!metrics.hasTimeline) {
    result.recommendations.push('Include a project timeline or schedule');
  }
  if (!metrics.hasBudget) {
    result.recommendations.push('Add a budget section');
  }
  if (wordCount < 1000) {
    result.recommendations.push('Consider expanding the proposal content');
  }
  
  result.success = score >= 60;
  result.message = 'Quality score: ' + score + '%' + 
    (result.recommendations.length > 0 ? 
      '. Recommendations: ' + result.recommendations.join('; ') : '');
  
  return result;
}

/**
 * Main entry point for custom script execution
 * This function is called by Automation.gs
 * 
 * @param {string} scriptName - Name of the script/function to run
 * @param {object} proposalData - Proposal data object
 * @param {string} stage - Current stage
 * @return {object} Analysis result
 */
function executeCustomAnalysis(scriptName, proposalData, stage) {
  switch (scriptName) {
    case 'budget-analysis':
      return analyzeBudget(proposalData, stage);
    case 'rfp-compliance':
      return validateRFPCompliance(proposalData, stage);
    case 'quality-analysis':
      return analyzeQuality(proposalData, stage);
    default:
      return {
        success: false,
        message: 'Unknown script name: ' + scriptName
      };
  }
}

// Export functions (if using module system)
// In Google Apps Script, functions are global, so no export needed

