/**
 * Shared configuration for verifiers and orchestration helpers.
 *
 * Keep this file small and dependency-free so every script can require it.
 */

'use strict';

module.exports = Object.freeze({
  thresholds: {
    // Citation density is enforced on "factual lines" (see verify-citation-density.js).
    // Set to 1.0 for "every factual line must be cited".
    citation_density: 1.0,

    // CAPTURE BEFORE CITE: every cited source must be captured.
    capture_ready: 1.0
  },

  perspectives: {
    // Required perspectives for task coverage. Tasks may use aliases; verifiers normalize.
    required: [
      'Money',
      'Timeline',
      'Silence',
      'Documents',
      'Contradictions',
      'Relationships',
      'Hypotheses',
      'Assumptions',
      'Counterfactual',
      'Blind Spots'
    ]
  }
});

