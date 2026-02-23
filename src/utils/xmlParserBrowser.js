/**
 * Secure XML Parser - Browser Compatible Version
 * 
 * Provides XXE-safe XML parsing for web applications.
 * This is a simplified version that works in browser environments.
 */

/**
 * XXE-safe regex-based XML extraction
 * This approach is inherently safe from XXE as it doesn't use DOM parsers
 */

/**
 * Extract content between XML tags safely
 * @param {string} xml XML string
 * @param {string} tagName Tag name to extract
 * @returns {Array} Array of tag contents
 */
function extractTags(xml, tagName) {
  const results = [];
  const regex = new RegExp(`<${tagName}[\\s\\S]*?>([\\s\\S]*?)</${tagName}>`, 'gi');
  let match;
  
  while ((match = regex.exec(xml)) !== null) {
    // Only return the inner content, not the full tag
    results.push(match[1]);
  }
  
  return results;
}

/**
 * Extract attribute value from XML tag
 * @param {string} xml XML string containing the tag
 * @param {string} tagName Tag name
 * @param {string} attributeName Attribute name
 * @returns {string|null} Attribute value or null
 */
function extractAttribute(xml, tagName, attributeName) {
  const regex = new RegExp(`<${tagName}\\s+[^>]*${attributeName}="([^"]*)"`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

/**
 * Parse simple XML structure into JavaScript object
 * @param {string} xml XML string
 * @returns {Object} Parsed object
 */
function parseSimpleXML(xml) {
  const result = {};
  
  // Extract header information
  const headerContent = extractTags(xml, 'HEADER')[0];
  if (headerContent) {
    result.HEADER = {};
    
    const versionMatch = headerContent.match(/<VERSION>(.*?)<\/VERSION>/);
    const requestMatch = headerContent.match(/<TALLYREQUEST>(.*?)<\/TALLYREQUEST>/);
    const statusMatch = headerContent.match(/<STATUS>(.*?)<\/STATUS>/);
    
    if (versionMatch) result.HEADER.VERSION = versionMatch[1].trim();
    if (requestMatch) result.HEADER.TALLYREQUEST = requestMatch[1].trim();
    if (statusMatch) result.HEADER.STATUS = statusMatch[1].trim();
  }
  
  // Extract body information
  const bodyContent = extractTags(xml, 'BODY')[0];
  if (bodyContent) {
    result.BODY = {};
    
    const dataMatch = bodyContent.match(/<DATA>([\s\S]*?)<\/DATA>/);
    const descMatch = bodyContent.match(/<DESC>([\s\S]*?)<\/DESC>/);
    const lineErrorMatch = bodyContent.match(/<LINEERROR>(.*?)<\/LINEERROR>/);
    
    if (dataMatch) result.BODY.DATA = dataMatch[1].trim();
    if (descMatch) result.BODY.DESC = descMatch[1].trim();
    if (lineErrorMatch) result.BODY.LINEERROR = lineErrorMatch[1].trim();
  }
  
  return result;
}

/**
 * Check if XML contains potentially dangerous elements
 * @param {string} xml XML string to check
 * @returns {Object} Security check result
 */
function securityCheck(xml) {
  const result = {
    isSafe: true,
    issues: []
  };
  
  // Check for DOCTYPE declarations
  if (/<!DOCTYPE/i.test(xml)) {
    result.isSafe = false;
    result.issues.push('DOCTYPE declarations are not allowed');
  }
  
  // Check for entity declarations
  if (/<!ENTITY/i.test(xml)) {
    result.isSafe = false;
    result.issues.push('ENTITY declarations are not allowed');
  }
  
  // Check for external system identifiers
  if (/SYSTEM["']/i.test(xml)) {
    result.isSafe = false;
    result.issues.push('External system references are not allowed');
  }
  
  // Check for external public identifiers
  if (/PUBLIC["']/i.test(xml)) {
    result.isSafe = false;
    result.issues.push('External public references are not allowed');
  }
  
  // Check for null bytes
  if (xml.includes('\x00')) {
    result.isSafe = false;
    result.issues.push('Null bytes are not allowed');
  }
  
  return result;
}

/**
 * Validate and parse XML safely
 * @param {string} xml XML string to process
 * @param {string} context Context for error messages
 * @returns {Object} Result with parsed data or error
 */
function safeParse(xml, context = 'XML') {
  // Security check first
  const security = securityCheck(xml);
  
  if (!security.isSafe) {
    return {
      success: false,
      error: `Security check failed: ${security.issues.join(', ')}`,
      data: null
    };
  }
  
  try {
    const data = parseSimpleXML(xml);
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    return {
      success: false,
      error: `${context} parsing failed: ${error.message}`,
      data: null
    };
  }
}

module.exports = {
  extractTags,
  extractAttribute,
  parseSimpleXML,
  securityCheck,
  safeParse
};
