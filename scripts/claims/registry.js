/**
 * registry.js - Claim Registry CRUD Operations
 *
 * The claim registry is the single source of truth for verified claims.
 * Claims are added when sources are captured, and articles are verified
 * against this registry.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Initialize empty claims registry
 */
function initRegistry() {
  return {
    version: 1,
    created_at: new Date().toISOString(),
    claims: []
  };
}

/**
 * Get path to claims.json for a case
 */
function getRegistryPath(caseDir) {
  return path.join(caseDir, 'claims.json');
}

/**
 * Load claims registry, creating if doesn't exist
 */
function loadRegistry(caseDir) {
  const registryPath = getRegistryPath(caseDir);

  if (!fs.existsSync(registryPath)) {
    const registry = initRegistry();
    saveRegistry(caseDir, registry);
    return registry;
  }

  try {
    const content = fs.readFileSync(registryPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error loading claims registry: ${err.message}`);
    return initRegistry();
  }
}

/**
 * Save claims registry
 */
function saveRegistry(caseDir, registry) {
  const registryPath = getRegistryPath(caseDir);
  registry.updated_at = new Date().toISOString();
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

/**
 * Generate claim ID
 */
function generateClaimId(registry) {
  const nextNum = registry.claims.length + 1;
  return `CL${String(nextNum).padStart(4, '0')}`;
}

/**
 * Generate content hash for deduplication
 */
function hashClaim(text, sourceId) {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256')
    .update(`${normalized}:${sourceId}`)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Add a claim to the registry
 *
 * @param {string} caseDir - Path to case directory
 * @param {object} claim - Claim to add
 * @param {string} claim.text - The factual claim text
 * @param {string} claim.type - Claim type (statistic, fact, attribution, etc.)
 * @param {string} claim.sourceId - Source ID (S###)
 * @param {string} claim.sourceUrl - URL of the source
 * @param {string} claim.supporting_quote - Exact quote from source
 * @param {object} claim.quote_location - Location in source (line, char_start, etc.)
 * @param {array} claim.numbers - Extracted numbers [{value, unit, context}]
 * @param {array} claim.entities - Key entities mentioned
 * @returns {object} - The added claim with ID
 */
function addClaim(caseDir, claim) {
  const registry = loadRegistry(caseDir);

  // Check for duplicate (same text + source)
  const hash = hashClaim(claim.text, claim.sourceId);
  const existing = registry.claims.find(c => c.hash === hash);

  if (existing) {
    return { ...existing, duplicate: true };
  }

  const newClaim = {
    id: generateClaimId(registry),
    hash,
    text: claim.text,
    normalized: normalizeClaim(claim.text),
    type: claim.type || 'fact',
    numbers: claim.numbers || [],
    entities: claim.entities || [],
    sourceId: claim.sourceId,
    sourceUrl: claim.sourceUrl,
    supporting_quote: claim.supporting_quote,
    quote_location: claim.quote_location || {},
    extracted_at: new Date().toISOString(),
    extraction_method: claim.extraction_method || 'auto'
  };

  registry.claims.push(newClaim);
  saveRegistry(caseDir, registry);

  return newClaim;
}

/**
 * Normalize claim text for matching
 */
function normalizeClaim(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/\.$/, '')
    .trim();
}

/**
 * Find claim by ID
 */
function findClaimById(caseDir, claimId) {
  const registry = loadRegistry(caseDir);
  return registry.claims.find(c => c.id === claimId);
}

/**
 * Find claims by source ID
 */
function findClaimsBySource(caseDir, sourceId) {
  const registry = loadRegistry(caseDir);
  return registry.claims.filter(c => c.sourceId === sourceId);
}

/**
 * Find claims containing a specific number
 */
function findClaimsByNumber(caseDir, value, tolerance = 0.01) {
  const registry = loadRegistry(caseDir);
  return registry.claims.filter(claim => {
    return claim.numbers.some(num => {
      const diff = Math.abs(num.value - value) / Math.max(num.value, value);
      return diff <= tolerance;
    });
  });
}

/**
 * Search claims by text similarity (simple keyword match)
 */
function searchClaims(caseDir, query) {
  const registry = loadRegistry(caseDir);
  const queryWords = query.toLowerCase().split(/\s+/);

  return registry.claims
    .map(claim => {
      const claimWords = claim.normalized.split(/\s+/);
      const matchCount = queryWords.filter(qw =>
        claimWords.some(cw => cw.includes(qw) || qw.includes(cw))
      ).length;
      const score = matchCount / queryWords.length;
      return { claim, score };
    })
    .filter(r => r.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .map(r => r.claim);
}

/**
 * Update a claim
 */
function updateClaim(caseDir, claimId, updates) {
  const registry = loadRegistry(caseDir);
  const index = registry.claims.findIndex(c => c.id === claimId);

  if (index === -1) {
    return null;
  }

  registry.claims[index] = {
    ...registry.claims[index],
    ...updates,
    updated_at: new Date().toISOString()
  };

  saveRegistry(caseDir, registry);
  return registry.claims[index];
}

/**
 * Remove a claim
 */
function removeClaim(caseDir, claimId) {
  const registry = loadRegistry(caseDir);
  const index = registry.claims.findIndex(c => c.id === claimId);

  if (index === -1) {
    return false;
  }

  registry.claims.splice(index, 1);
  saveRegistry(caseDir, registry);
  return true;
}

/**
 * Get registry statistics
 */
function getStats(caseDir) {
  const registry = loadRegistry(caseDir);

  const byType = {};
  const bySource = {};

  for (const claim of registry.claims) {
    byType[claim.type] = (byType[claim.type] || 0) + 1;
    bySource[claim.sourceId] = (bySource[claim.sourceId] || 0) + 1;
  }

  return {
    total: registry.claims.length,
    byType,
    bySource,
    sourcesWithClaims: Object.keys(bySource).length
  };
}

/**
 * Export all claims for a source (useful for debugging)
 */
function exportClaimsForSource(caseDir, sourceId) {
  const claims = findClaimsBySource(caseDir, sourceId);
  return claims.map(c => ({
    id: c.id,
    text: c.text,
    quote: c.supporting_quote,
    numbers: c.numbers
  }));
}

module.exports = {
  loadRegistry,
  saveRegistry,
  addClaim,
  findClaimById,
  findClaimsBySource,
  findClaimsByNumber,
  searchClaims,
  updateClaim,
  removeClaim,
  getStats,
  exportClaimsForSource,
  normalizeClaim,
  hashClaim
};
