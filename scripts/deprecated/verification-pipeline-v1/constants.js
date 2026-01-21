/**
 * constants.js - Single source of truth for verification patterns and thresholds
 *
 * All regex patterns, confidence thresholds, and blocking criteria are
 * centralized here to prevent duplication and ensure consistency.
 */

'use strict';

module.exports = {
  // Version for verification state compatibility
  VERSION: '2.0.0',

  // ============================================================
  // CONFIDENCE THRESHOLDS
  // ============================================================
  CONFIDENCE: {
    PASS: 0.85,      // Above this = verified
    FLAG: 0.60,      // Between FLAG and PASS = needs review
    FAIL: 0.40       // Below this = failed
  },

  // ============================================================
  // FABRICATION DETECTION PATTERNS
  // ============================================================
  FABRICATION: {
    // Timestamps exactly on the hour with no milliseconds are suspicious
    // Real captures have millisecond precision
    ROUND_TIMESTAMP: /T\d{2}:00:00\.000Z$/,

    // Content that starts with compilation language indicates synthesis
    COMPILATION_CONTENT: /^(Research compilation|Summary of|Synthesis of|Overview of|Aggregated from|Combined from)/i,

    // Homepage URLs instead of specific articles
    HOMEPAGE_URL: /^https?:\/\/[^/]+\/?$/,

    // Suspicious titles indicating synthesis
    SUSPICIOUS_TITLE: /(compilation|synthesis|summary|overview|aggregat|combined)/i,

    // Invalid source types
    SUSPICIOUS_TYPE: /^(research_synthesis|compilation|aggregate|combined|synthesized)$/i,

    // Missing capture signature format
    VALID_SIGNATURE: /^sig_v[12]_[a-f0-9]{32}$/
  },

  // ============================================================
  // CITATION PATTERNS
  // ============================================================
  CITATION: {
    // Full citation with URL: [S001](https://example.com)
    FULL: /\[S(\d{3})\]\(([^)]+)\)/g,

    // Short citation without URL: [S001]
    SHORT: /\[S(\d{3})\]/g,

    // Extract URL from full citation
    URL_EXTRACT: /\[S(\d{3})\]\(([^)]+)\)/,

    // Any citation pattern (for counting)
    ANY: /\[S\d{3}\]/g
  },

  // ============================================================
  // STATISTICS EXTRACTION PATTERNS
  // ============================================================
  STATISTICS: {
    // Percentages: 72%, 3.5%
    PERCENTAGE: /(\d+(?:\.\d+)?)\s*%/g,

    // Currency: $50, $1,000, $50 million, $1.5B
    CURRENCY: /\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|billion|trillion|M|B|T|k|K)?/gi,

    // Large numbers with commas: 1,000 or 10,000,000
    LARGE_NUMBER: /\b(\d{1,3}(?:,\d{3})+)\b/g,

    // Scaled numbers: 50 million, 1.5 billion
    SCALED: /(\d+(?:\.\d+)?)\s*(million|billion|trillion|thousand)/gi,

    // Any significant number (for uncited detection)
    SIGNIFICANT: /\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*(%|million|billion|trillion|thousand)?/gi
  },

  // ============================================================
  // SCALE MULTIPLIERS
  // ============================================================
  SCALE: {
    'k': 1000,
    'K': 1000,
    'thousand': 1000,
    'm': 1000000,
    'M': 1000000,
    'million': 1000000,
    'b': 1000000000,
    'B': 1000000000,
    'billion': 1000000000,
    't': 1000000000000,
    'T': 1000000000000,
    'trillion': 1000000000000
  },

  // ============================================================
  // HASH CONFIGURATION
  // ============================================================
  HASH: {
    ALGORITHM: 'sha256',
    ENCODING: 'hex',
    PREFIX: 'sha256:'
  },

  // ============================================================
  // BLOCKING THRESHOLDS (any of these = verification fails)
  // ============================================================
  BLOCKING: {
    // Maximum percentage of claims that can fail
    MAX_FAILED_CLAIMS_PERCENT: 0.05,      // 5%

    // Maximum percentage of claims flagged for review
    MAX_FLAGGED_CLAIMS_PERCENT: 0.10,     // 10%

    // ANY URL mismatch is a blocking failure
    MAX_URL_MISMATCHES: 0,

    // ANY integrity failure is a blocking failure
    MAX_INTEGRITY_FAILURES: 0,

    // ANY orphan citation is a blocking failure
    MAX_ORPHAN_CITATIONS: 0,

    // ANY missing source is a blocking failure
    MAX_MISSING_SOURCES: 0
  },

  // ============================================================
  // CLAIM EXTRACTION PATTERNS
  // ============================================================
  CLAIMS: {
    // Context window for extracting claim text before citation
    CONTEXT_CHARS: 300,

    // Minimum claim length to be considered
    MIN_LENGTH: 15,

    // Patterns to skip (not real claims)
    SKIP_PATTERNS: [
      /^#{1,6}\s+/,           // Markdown headers
      /^[-*+]\s*$/,           // Empty list items
      /^\[S\d{3}\]\(/,        // Just a citation
      /^>\s/,                 // Blockquotes
      /^```/,                 // Code blocks
      /^\|/                   // Table rows
    ]
  },

  // ============================================================
  // KEY TERM EXTRACTION
  // ============================================================
  KEY_TERMS: {
    // Proper nouns (capitalized words not at sentence start)
    PROPER_NOUN: /(?<=[a-z]\s)[A-Z][a-z]{3,}(?:\s[A-Z][a-z]+)*/g,

    // Minimum characters for key term
    MIN_LENGTH: 4,

    // Percentage of key terms that must be found in source
    MIN_FOUND_RATIO: 0.5
  },

  // ============================================================
  // LLM VERIFICATION SETTINGS
  // ============================================================
  LLM: {
    // Maximum source content length to send to LLM
    MAX_CONTENT_LENGTH: 6000,

    // Model preferences
    PREFERRED_MODEL: 'gemini-3-pro',
    FALLBACK_MODEL: 'gpt-5.2',

    // Response format requirements
    REQUIRED_FIELDS: ['supported', 'confidence', 'supporting_quote', 'issues', 'method']
  },

  // ============================================================
  // VERIFICATION STEPS (in order)
  // ============================================================
  STEPS: [
    { id: 1, name: 'capture', description: 'Verify source capture integrity' },
    { id: 2, name: 'integrity', description: 'Hash verification and red flag detection' },
    { id: 3, name: 'binding', description: 'Citation URL consistency check' },
    { id: 4, name: 'semantic', description: 'Claim-evidence semantic verification' },
    { id: 5, name: 'statistics', description: 'Statistics and number verification' }
  ],

  // ============================================================
  // FILE PATHS (relative to case directory)
  // ============================================================
  PATHS: {
    ARTICLE: 'articles/full.md',
    SOURCES_JSON: 'sources.json',
    VERIFICATION_STATE: 'verification-state.json',
    VERIFICATION_REPORT: 'verification-report.md',
    EVIDENCE_DIR: 'evidence',
    CLAIM_SUPPORT: 'claim-support.json',
    METADATA: 'metadata.json',
    CONTENT: 'content.md',
    RAW_HTML: 'raw.html'
  }
};
