/**
 * claims/index.js - Article Claim Verification
 *
 * Verification flow:
 * 1. Extract claims from article (sentences with [S###] citations)
 * 2. For each claim, load the cited source content
 * 3. Ask LLM: "Does this source support this claim?"
 * 4. Report results
 *
 * Additionally:
 * - Cross-check authoritative claims (bestplacestowork.org, etc.)
 * - Computational verification for numerical claims
 */

'use strict';

const verifyArticle = require('./verify-article');
const crossCheck = require('./cross-check');
const computeVerify = require('./compute-verify');

module.exports = {
  // Article claim extraction
  extractArticleClaims: verifyArticle.extractArticleClaims,
  isSourceReference: verifyArticle.isSourceReference,

  // Verification (LLM-based)
  prepareVerification: verifyArticle.prepareVerification,
  processVerificationResponses: verifyArticle.processVerificationResponses,

  // Reporting
  generateReport: verifyArticle.generateReport,

  // Authoritative source cross-checking
  crossCheck: {
    detectCrossCheckClaims: crossCheck.detectCrossCheckClaims,
    generateCrossCheckPrompts: crossCheck.generateCrossCheckPrompts,
    formatReport: crossCheck.formatReport,
    AUTHORITATIVE_SOURCES: crossCheck.AUTHORITATIVE_SOURCES
  },

  // Computational fact-checking for numerical claims
  computeVerify: {
    extractNumericalClaims: computeVerify.extractNumericalClaims,
    prepareVerification: computeVerify.prepareVerification,
    processVerificationResponses: computeVerify.processVerificationResponses,
    generateReport: computeVerify.generateReport,
    NUMERICAL_PATTERNS: computeVerify.NUMERICAL_PATTERNS
  }
};
