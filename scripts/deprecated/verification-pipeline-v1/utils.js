/**
 * utils.js - Shared utilities for verification pipeline
 *
 * Common functions for hash computation, file I/O, claim extraction,
 * and statistics parsing used across all verification steps.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const CONST = require('./constants');

// ============================================================
// HASH UTILITIES
// ============================================================

/**
 * Compute SHA256 hash of a string or buffer
 * @param {string|Buffer} data - Data to hash
 * @returns {string} - Hash with prefix (sha256:xxx)
 */
function computeHash(data) {
  const hash = crypto.createHash(CONST.HASH.ALGORITHM)
    .update(data)
    .digest(CONST.HASH.ENCODING);
  return CONST.HASH.PREFIX + hash;
}

/**
 * Compute SHA256 hash of a file
 * @param {string} filePath - Path to file
 * @returns {string|null} - Hash with prefix or null if file doesn't exist
 */
function computeFileHash(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath);
  return computeHash(content);
}

/**
 * Compute chain hash from array of step hashes
 * @param {string[]} stepHashes - Array of step hashes
 * @returns {string} - Combined chain hash
 */
function computeChainHash(stepHashes) {
  const combined = stepHashes.join('|');
  return computeHash(combined);
}

// ============================================================
// FILE I/O UTILITIES
// ============================================================

/**
 * Read JSON file safely
 * @param {string} filePath - Path to JSON file
 * @returns {object|null} - Parsed JSON or null on error
 */
function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

/**
 * Write JSON file with pretty formatting
 * @param {string} filePath - Path to write
 * @param {object} data - Data to write
 */
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Read text file safely
 * @param {string} filePath - Path to file
 * @returns {string|null} - Content or null if doesn't exist
 */
function readTextSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return null;
  }
}

/**
 * List directories in a path
 * @param {string} dirPath - Directory to list
 * @returns {string[]} - Array of directory names
 */
function listDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

// ============================================================
// CITATION EXTRACTION
// ============================================================

/**
 * Extract all citations from text
 * @param {string} text - Text to search
 * @returns {Array<{sourceId: string, url: string|null, position: number}>}
 */
function extractCitations(text) {
  const citations = [];
  const seen = new Set();

  // First pass: full citations [S###](url)
  const fullPattern = new RegExp(CONST.CITATION.FULL.source, 'g');
  let match;
  while ((match = fullPattern.exec(text)) !== null) {
    const sourceId = `S${match[1]}`;
    citations.push({
      sourceId,
      url: match[2],
      position: match.index,
      format: 'full'
    });
    seen.add(`${sourceId}-${match.index}`);
  }

  // Second pass: short citations [S###] (no URL)
  const shortPattern = new RegExp(CONST.CITATION.SHORT.source, 'g');
  while ((match = shortPattern.exec(text)) !== null) {
    const sourceId = `S${match[1]}`;
    const key = `${sourceId}-${match.index}`;
    if (!seen.has(key)) {
      citations.push({
        sourceId,
        url: null,
        position: match.index,
        format: 'short'
      });
    }
  }

  return citations.sort((a, b) => a.position - b.position);
}

/**
 * Get unique source IDs from text
 * @param {string} text - Text to search
 * @returns {Set<string>} - Set of source IDs
 */
function getUniqueSourceIds(text) {
  const citations = extractCitations(text);
  return new Set(citations.map(c => c.sourceId));
}

/**
 * Count citations in text
 * @param {string} text - Text to search
 * @returns {number} - Number of citations
 */
function countCitations(text) {
  const matches = text.match(CONST.CITATION.ANY);
  return matches ? matches.length : 0;
}

// ============================================================
// CLAIM EXTRACTION
// ============================================================

/**
 * Extract claims with their citations from text
 * @param {string} text - Article text
 * @returns {Array<{claim: string, sourceId: string, position: number, line: number}>}
 */
function extractClaimsWithCitations(text) {
  const claims = [];
  const lines = text.split('\n');
  let charOffset = 0;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    // Find citations in this line
    const citationPattern = /([^.!?\n]{10,300})\s*\[S(\d{3})\](?:\([^)]+\))?/g;
    let match;

    while ((match = citationPattern.exec(line)) !== null) {
      let claimText = match[1].trim();

      // Skip if matches skip patterns
      const shouldSkip = CONST.CLAIMS.SKIP_PATTERNS.some(p => p.test(claimText));
      if (shouldSkip) continue;

      // Skip if too short
      if (claimText.length < CONST.CLAIMS.MIN_LENGTH) continue;

      // Clean up claim text
      claimText = claimText
        .replace(/^[-*+]\s*/, '')           // Remove list markers
        .replace(/^\*\*[^*]+\*\*:?\s*/, '') // Remove bold prefixes
        .trim();

      if (claimText.length >= CONST.CLAIMS.MIN_LENGTH) {
        claims.push({
          claim: claimText,
          sourceId: `S${match[2]}`,
          position: charOffset + match.index,
          line: lineNum + 1
        });
      }
    }

    charOffset += line.length + 1; // +1 for newline
  }

  return claims;
}

// ============================================================
// STATISTICS EXTRACTION
// ============================================================

/**
 * Extract all statistics from text
 * @param {string} text - Text to search
 * @returns {Array<{type: string, raw: string, value: number}>}
 */
function extractStatistics(text) {
  const stats = [];
  const seen = new Set();

  // Percentages
  let match;
  const pctPattern = new RegExp(CONST.STATISTICS.PERCENTAGE.source, 'g');
  while ((match = pctPattern.exec(text)) !== null) {
    if (!seen.has(match[0])) {
      stats.push({
        type: 'percentage',
        raw: match[0],
        value: parseFloat(match[1])
      });
      seen.add(match[0]);
    }
  }

  // Currency
  const currPattern = new RegExp(CONST.STATISTICS.CURRENCY.source, 'gi');
  while ((match = currPattern.exec(text)) !== null) {
    if (!seen.has(match[0])) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      const scale = match[2];
      if (scale && CONST.SCALE[scale.toLowerCase()]) {
        value *= CONST.SCALE[scale.toLowerCase()];
      }
      stats.push({
        type: 'currency',
        raw: match[0],
        value
      });
      seen.add(match[0]);
    }
  }

  // Large numbers
  const numPattern = new RegExp(CONST.STATISTICS.LARGE_NUMBER.source, 'g');
  while ((match = numPattern.exec(text)) !== null) {
    if (!seen.has(match[0])) {
      stats.push({
        type: 'count',
        raw: match[0],
        value: parseInt(match[1].replace(/,/g, ''), 10)
      });
      seen.add(match[0]);
    }
  }

  // Scaled numbers
  const scaledPattern = new RegExp(CONST.STATISTICS.SCALED.source, 'gi');
  while ((match = scaledPattern.exec(text)) !== null) {
    if (!seen.has(match[0])) {
      let value = parseFloat(match[1]);
      const scale = match[2].toLowerCase();
      if (CONST.SCALE[scale]) {
        value *= CONST.SCALE[scale];
      }
      stats.push({
        type: 'scaled',
        raw: match[0],
        value
      });
      seen.add(match[0]);
    }
  }

  return stats;
}

/**
 * Search for a number in text (with tolerance)
 * @param {string} text - Text to search
 * @param {number} target - Number to find
 * @param {number} tolerance - Percentage tolerance (default 0.01 = 1%)
 * @returns {{found: boolean, exact: boolean, match: string|null}}
 */
function findNumberInText(text, target, tolerance = 0.01) {
  const stats = extractStatistics(text);

  for (const stat of stats) {
    const ratio = stat.value / target;
    if (ratio === 1) {
      return { found: true, exact: true, match: stat.raw };
    }
    if (ratio >= (1 - tolerance) && ratio <= (1 + tolerance)) {
      return { found: true, exact: false, match: stat.raw };
    }
  }

  // Also check raw text for the number
  const normalized = text.toLowerCase().replace(/,/g, '');
  const targetStr = target.toString();
  if (normalized.includes(targetStr)) {
    return { found: true, exact: true, match: targetStr };
  }

  return { found: false, exact: false, match: null };
}

// ============================================================
// KEY TERM EXTRACTION
// ============================================================

/**
 * Extract key terms (proper nouns) from text
 * @param {string} text - Text to search
 * @returns {string[]} - Array of key terms
 */
function extractKeyTerms(text) {
  const terms = [];

  // Look for capitalized words not at sentence start
  const pattern = /(?<=[a-z]\s)[A-Z][a-z]{3,}(?:\s[A-Z][a-z]+)*/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match[0].length >= CONST.KEY_TERMS.MIN_LENGTH) {
      terms.push(match[0]);
    }
  }

  return [...new Set(terms)];
}

/**
 * Check if key terms from claim appear in source
 * @param {string} claim - Claim text
 * @param {string} source - Source content
 * @returns {{found: number, total: number, missing: string[]}}
 */
function checkKeyTerms(claim, source) {
  const terms = extractKeyTerms(claim);
  const sourceLower = source.toLowerCase();

  const missing = [];
  let found = 0;

  for (const term of terms) {
    if (sourceLower.includes(term.toLowerCase())) {
      found++;
    } else {
      missing.push(term);
    }
  }

  return {
    found,
    total: terms.length,
    missing,
    passed: terms.length === 0 || (found / terms.length) >= CONST.KEY_TERMS.MIN_FOUND_RATIO
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Hash utilities
  computeHash,
  computeFileHash,
  computeChainHash,

  // File I/O
  readJsonSafe,
  writeJson,
  readTextSafe,
  listDirectories,

  // Citations
  extractCitations,
  getUniqueSourceIds,
  countCitations,

  // Claims
  extractClaimsWithCitations,

  // Statistics
  extractStatistics,
  findNumberInText,

  // Key terms
  extractKeyTerms,
  checkKeyTerms
};
