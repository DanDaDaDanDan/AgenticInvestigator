/**
 * Shared configuration for verifiers and orchestration helpers.
 *
 * DEPRECATED: This file is maintained for backwards compatibility.
 * New code should use: const config = require('./lib/config-loader');
 *
 * Configuration is now loaded from:
 *   - framework/config-data.json (thresholds, perspectives, file lists)
 *   - framework/patterns.json (legal, PII, factual patterns, source signals)
 */

'use strict';

const configLoader = require('./lib/config-loader');

// Re-export for backwards compatibility
module.exports = Object.freeze({
  thresholds: configLoader.thresholds,
  perspectives: configLoader.perspectives
});

