/**
 * claims/index.js - Claim Registry System Entry Point
 *
 * The claim registry is the single source of truth for verified claims.
 *
 * Architecture:
 * 1. Sources are captured → claims extracted via LLM → registered in claims.json
 * 2. Article writing uses registered claims
 * 3. Verification = matching article claims to registry
 *
 * Modules:
 * - registry.js: CRUD for claims.json
 * - extract.js: Extract claims from source content (LLM-based)
 * - match.js: Match article claims to registry
 * - capture-integration.js: Integrate extraction into capture flow
 * - verify-article.js: Main verification entry point
 */

'use strict';

const registry = require('./registry');
const extract = require('./extract');
const match = require('./match');
const captureIntegration = require('./capture-integration');
const verifyArticle = require('./verify-article');

module.exports = {
  // Registry operations
  loadRegistry: registry.loadRegistry,
  addClaim: registry.addClaim,
  findClaimById: registry.findClaimById,
  findClaimsBySource: registry.findClaimsBySource,
  findClaimsByNumber: registry.findClaimsByNumber,
  searchClaims: registry.searchClaims,
  updateClaim: registry.updateClaim,
  removeClaim: registry.removeClaim,
  getRegistryStats: registry.getStats,

  // Extraction (LLM-based)
  generateExtractionPrompt: extract.generateExtractionPrompt,
  parseExtractionResponse: extract.parseExtractionResponse,
  verifyQuoteInSource: extract.verifyQuoteInSource,
  prepareExtraction: extract.prepareExtraction,
  postProcessClaims: extract.postProcessClaims,

  // Matching
  extractArticleClaims: match.extractArticleClaims,
  matchClaim: match.matchClaim,
  matchAllClaims: match.matchAllClaims,
  getMatchSummary: match.getMatchSummary,

  // Capture integration
  prepareSourceForExtraction: captureIntegration.prepareSourceForExtraction,
  registerExtractedClaims: captureIntegration.registerExtractedClaims,
  getSourcesNeedingExtraction: captureIntegration.getSourcesNeedingExtraction,
  getExtractionStatus: captureIntegration.getExtractionStatus,

  // Article verification
  verifyArticle: verifyArticle.verifyArticle,
  verifyAndFix: verifyArticle.verifyAndFix,
  generateFixSuggestions: verifyArticle.generateFixSuggestions,
  prepareSourceSearch: verifyArticle.prepareSourceSearch
};
