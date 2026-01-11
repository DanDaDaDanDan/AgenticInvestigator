/**
 * config-loader.js - Central configuration loader for AgenticInvestigator
 *
 * Single source of truth for all configuration data.
 * Loads from framework/config-data.json and framework/patterns.json
 *
 * ARCHITECTURE NOTE:
 * - Structural checks (file existence, citation counting) -> handled here
 * - Semantic checks (legal risk, PII, factual claims) -> handled by LLM via Gemini 3 Pro MCP calls
 * - See .claude/commands/verify.md for semantic verification criteria
 *
 * Usage:
 *   const config = require('./lib/config-loader');
 *   const threshold = config.thresholds.citation_density;
 *   const citationPattern = config.patterns.citation_format;
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Resolve paths relative to repository root
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'framework', 'config-data.json');
const PATTERNS_PATH = path.join(ROOT_DIR, 'framework', 'patterns.json');

let _configData = null;
let _patternsData = null;
let _compiledPatterns = null;

/**
 * Load JSON file with caching
 */
function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Configuration file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Get raw config data (cached)
 */
function getConfigData() {
  if (!_configData) {
    _configData = loadJSON(CONFIG_PATH);
  }
  return _configData;
}

/**
 * Get raw patterns data (cached)
 */
function getPatternsData() {
  if (!_patternsData) {
    _patternsData = loadJSON(PATTERNS_PATH);
  }
  return _patternsData;
}

/**
 * Compile structural patterns (cached)
 * Only structural patterns are compiled here.
 * Semantic patterns (legal, PII, factual) are handled by LLM verification.
 */
function getCompiledPatterns() {
  if (_compiledPatterns) {
    return _compiledPatterns;
  }

  const raw = getPatternsData();

  _compiledPatterns = {
    // Citation format pattern - structural, for counting [S###] references
    citation_format: raw.citation_format
      ? new RegExp(raw.citation_format.pattern, raw.citation_format.flags || 'g')
      : /\[S(\d{3,4})\]/g,

    // Source origin signals (hints, not definitive - LLM makes final call)
    source_origin: raw.source_origin_signals || {},

    // Source category inference rules (hints)
    source_category: raw.source_category_inference || {},

    // Gap type to severity mapping (configuration)
    gap_severity: raw.gap_type_severity || {}
  };

  return _compiledPatterns;
}

/**
 * Detect source origin from domain and text content
 * NOTE: This provides hints. LLM verification makes final determination.
 * @param {Object} options - { domain, text, sourceRecord }
 * @returns {{ origin: string|null, confidence: string }}
 */
function detectSourceOrigin({ domain, text, sourceRecord }) {
  // Check explicit override first
  if (sourceRecord && typeof sourceRecord === 'object') {
    const explicit = typeof sourceRecord.origin === 'string' ? sourceRecord.origin.trim() : '';
    if (explicit) return { origin: explicit, confidence: 'explicit' };
  }

  const signals = getCompiledPatterns().source_origin;

  // Check domain exact match
  if (domain && signals.domains && signals.domains[domain]) {
    return signals.domains[domain];
  }

  // Check domain suffix
  if (domain && signals.domain_suffixes) {
    for (const [suffix, result] of Object.entries(signals.domain_suffixes)) {
      if (domain.endsWith(suffix)) {
        return result;
      }
    }
  }

  // Check text markers
  const hay = (text || '').toLowerCase();
  if (hay && signals.text_markers) {
    for (const marker of signals.text_markers) {
      if (hay.includes(marker.text)) {
        return { origin: marker.origin, confidence: marker.confidence };
      }
    }
  }

  return { origin: null, confidence: 'unknown' };
}

/**
 * Get source category from source record (hints only)
 * NOTE: LLM verification makes final determination for complex cases.
 * @param {Object} source - Source record from sources.json
 * @returns {string|null}
 */
function getSourceCategory(source) {
  if (!source || typeof source !== 'object') return null;

  // Explicit category takes precedence
  if (typeof source.category === 'string' && source.category.trim()) {
    return source.category.trim().toLowerCase();
  }

  // Infer from source_type
  const sourceType = typeof source.source_type === 'string' ? source.source_type.toLowerCase() : '';
  if (!sourceType) return null;

  const inference = getCompiledPatterns().source_category;
  const keywords = inference.type_keywords || {};

  for (const [keyword, category] of Object.entries(keywords)) {
    if (sourceType.includes(keyword)) {
      return category;
    }
  }

  return null;
}

/**
 * Get severity for a gap type
 * @param {string} gapType
 * @returns {string}
 */
function getGapSeverity(gapType) {
  const mapping = getCompiledPatterns().gap_severity;
  return mapping[gapType] || 'MEDIUM';
}

/**
 * Count citations in text using structural pattern
 * @param {string} text
 * @returns {{ count: number, unique: Set<string>, matches: string[] }}
 */
function countCitations(text) {
  const pattern = getCompiledPatterns().citation_format;
  // Reset regex state since it's global
  pattern.lastIndex = 0;

  const matches = [];
  const unique = new Set();
  let match;

  while ((match = pattern.exec(text)) !== null) {
    matches.push(match[0]);
    unique.add(`S${match[1]}`);
  }

  return { count: matches.length, unique, matches };
}

/**
 * Clear all caches (useful for testing)
 */
function clearCache() {
  _configData = null;
  _patternsData = null;
  _compiledPatterns = null;
}

// Export config data accessors
const config = getConfigData();

module.exports = {
  // Direct access to config values
  thresholds: config.thresholds,
  perspectives: config.perspectives,
  files_to_scan: config.files_to_scan,
  required_files: config.required_files,
  required_citation_sections: config.required_citation_sections,
  curiosity_tasks_per_cycle: config.curiosity_tasks_per_cycle,
  api: config.api,

  // Structural patterns only
  patterns: {
    get citation_format() { return getCompiledPatterns().citation_format; },
    get source_origin() { return getCompiledPatterns().source_origin; },
    get gap_severity() { return getCompiledPatterns().gap_severity; }
  },

  // Utility functions (hints, not definitive)
  detectSourceOrigin,
  getSourceCategory,
  getGapSeverity,
  countCitations,

  // Raw data access (for edge cases)
  getConfigData,
  getPatternsData,
  getCompiledPatterns,

  // Cache management
  clearCache
};
