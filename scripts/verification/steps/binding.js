/**
 * binding.js - Step 3: Citation URL consistency check (CRITICAL NEW STEP)
 *
 * This step addresses a critical gap in the previous verification system:
 * the URL in a citation may differ from the URL in sources.json which may
 * differ from the URL in metadata.json.
 *
 * Example of the problem:
 *   Article: [S001](https://example.com/article-v1)
 *   sources.json: url: "https://example.com/article-v2"
 *   metadata.json: url: "https://www.example.com/article-v1"
 *
 * All three should point to the SAME resource. This step:
 * 1. Extracts URL from each citation in the article
 * 2. Gets URL from sources.json for that source ID
 * 3. Gets URL from metadata.json for that source ID
 * 4. Normalizes all three URLs
 * 5. Verifies they all match
 *
 * ANY mismatch is a blocking failure - it means the citation may be
 * pointing to a different resource than what was captured.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const CONST = require('../constants');
const { readJsonSafe, readTextSafe, extractCitations, computeHash } = require('../utils');
const { normalizeUrl, urlsEqual, truncateUrl } = require('../url-normalize');

/**
 * Run binding verification step
 * @param {string} caseDir - Path to case directory
 * @param {object} context - Pipeline context
 * @returns {object} - Step result
 */
function run(caseDir, context) {
  const startTime = Date.now();

  const result = {
    step: 3,
    name: 'binding',
    status: 'pending',
    started_at: new Date().toISOString(),
    completed_at: null,
    metrics: {
      citations_checked: 0,
      citations_with_urls: 0,
      citations_verified: 0,
      url_mismatches: 0,
      orphan_citations: 0,
      missing_metadata_url: 0
    },
    issues: [],
    details: [],
    url_binding_map: {} // sourceId -> { citation, sources_json, metadata, normalized, match }
  };

  try {
    // Get sources.json
    const sourcesJson = context.sourcesJson || readJsonSafe(path.join(caseDir, CONST.PATHS.SOURCES_JSON));
    if (!sourcesJson || !sourcesJson.sources) {
      result.status = 'fail';
      result.issues.push({
        type: 'SOURCES_JSON_MISSING',
        severity: 'blocking',
        message: 'sources.json not found or invalid'
      });
      result.completed_at = new Date().toISOString();
      result.duration_ms = Date.now() - startTime;
      return result;
    }

    // Build source lookup
    const sourceMap = new Map();
    for (const source of sourcesJson.sources) {
      sourceMap.set(source.id, source);
    }

    // Get article
    const article = context.article || readTextSafe(path.join(caseDir, CONST.PATHS.ARTICLE));
    if (!article) {
      result.status = 'fail';
      result.issues.push({
        type: 'ARTICLE_MISSING',
        severity: 'blocking',
        message: 'articles/full.md not found'
      });
      result.completed_at = new Date().toISOString();
      result.duration_ms = Date.now() - startTime;
      return result;
    }

    // Extract all citations
    const citations = extractCitations(article);
    result.metrics.citations_checked = citations.length;

    // Group citations by source ID (may have multiple citations per source)
    const citationsBySource = new Map();
    for (const citation of citations) {
      if (!citationsBySource.has(citation.sourceId)) {
        citationsBySource.set(citation.sourceId, []);
      }
      citationsBySource.get(citation.sourceId).push(citation);
    }

    // Check each unique source
    for (const [sourceId, sourceCitations] of citationsBySource) {
      const bindingResult = {
        sourceId,
        urls: {
          citation: null,
          sources_json: null,
          metadata: null
        },
        normalized: {
          citation: null,
          sources_json: null,
          metadata: null
        },
        match: null,
        issues: []
      };

      // Get citation URL (use first citation with URL)
      const citationWithUrl = sourceCitations.find(c => c.url !== null);
      if (citationWithUrl) {
        bindingResult.urls.citation = citationWithUrl.url;
        bindingResult.normalized.citation = normalizeUrl(citationWithUrl.url);
        result.metrics.citations_with_urls++;
      }

      // Get sources.json URL
      const sourceEntry = sourceMap.get(sourceId);
      if (!sourceEntry) {
        result.metrics.orphan_citations++;
        bindingResult.issues.push({
          type: 'ORPHAN_CITATION',
          message: 'Source not found in sources.json'
        });
        result.issues.push({
          type: 'ORPHAN_CITATION',
          severity: 'blocking',
          sourceId,
          message: `${sourceId} cited in article but not in sources.json`
        });
      } else {
        bindingResult.urls.sources_json = sourceEntry.url;
        bindingResult.normalized.sources_json = normalizeUrl(sourceEntry.url);
      }

      // Get metadata.json URL
      const metadataPath = path.join(caseDir, CONST.PATHS.EVIDENCE_DIR, sourceId, CONST.PATHS.METADATA);
      const metadata = readJsonSafe(metadataPath);
      if (metadata && metadata.url) {
        bindingResult.urls.metadata = metadata.url;
        bindingResult.normalized.metadata = normalizeUrl(metadata.url);
      } else {
        result.metrics.missing_metadata_url++;
        bindingResult.issues.push({
          type: 'MISSING_METADATA_URL',
          message: 'No URL in metadata.json'
        });
      }

      // ============================================================
      // THREE-WAY URL COMPARISON
      // ============================================================

      const urls = {
        citation: bindingResult.normalized.citation,
        sources_json: bindingResult.normalized.sources_json,
        metadata: bindingResult.normalized.metadata
      };

      // Check which URLs we have
      const availableUrls = Object.entries(urls).filter(([_, v]) => v !== null);

      if (availableUrls.length >= 2) {
        // Check if all available URLs match
        const firstUrl = availableUrls[0][1];
        const allMatch = availableUrls.every(([_, url]) => url === firstUrl);

        if (allMatch) {
          bindingResult.match = 'all_match';
          result.metrics.citations_verified++;
        } else {
          bindingResult.match = 'mismatch';
          result.metrics.url_mismatches++;

          // Detail which URLs don't match
          const mismatches = [];
          for (let i = 0; i < availableUrls.length; i++) {
            for (let j = i + 1; j < availableUrls.length; j++) {
              if (availableUrls[i][1] !== availableUrls[j][1]) {
                mismatches.push({
                  a: { source: availableUrls[i][0], url: availableUrls[i][1] },
                  b: { source: availableUrls[j][0], url: availableUrls[j][1] }
                });
              }
            }
          }

          bindingResult.mismatches = mismatches;

          result.issues.push({
            type: 'URL_MISMATCH',
            severity: 'blocking',
            sourceId,
            message: `URLs do not match across citation, sources.json, and metadata.json`,
            details: {
              citation: bindingResult.urls.citation,
              sources_json: bindingResult.urls.sources_json,
              metadata: bindingResult.urls.metadata,
              normalized: {
                citation: urls.citation,
                sources_json: urls.sources_json,
                metadata: urls.metadata
              }
            }
          });
        }
      } else if (availableUrls.length === 1) {
        // Only one URL available - can't verify match
        bindingResult.match = 'insufficient_data';
        // If citation has no URL, that's OK - check sources_json vs metadata
        if (!urls.citation && urls.sources_json && urls.metadata) {
          if (urls.sources_json === urls.metadata) {
            bindingResult.match = 'registry_match';
            result.metrics.citations_verified++;
          } else {
            bindingResult.match = 'mismatch';
            result.metrics.url_mismatches++;
            result.issues.push({
              type: 'URL_MISMATCH',
              severity: 'blocking',
              sourceId,
              message: 'sources.json URL does not match metadata.json URL',
              details: {
                sources_json: bindingResult.urls.sources_json,
                metadata: bindingResult.urls.metadata
              }
            });
          }
        }
      } else {
        bindingResult.match = 'no_urls';
        result.issues.push({
          type: 'NO_URLS_TO_VERIFY',
          severity: 'warning',
          sourceId,
          message: 'No URLs available for verification'
        });
      }

      result.details.push(bindingResult);
      result.url_binding_map[sourceId] = bindingResult;
    }

    // ============================================================
    // DETERMINE OVERALL STATUS
    // ============================================================

    // ANY URL mismatch is blocking
    if (result.metrics.url_mismatches > CONST.BLOCKING.MAX_URL_MISMATCHES) {
      result.status = 'fail';
    }
    // ANY orphan citation is blocking
    else if (result.metrics.orphan_citations > CONST.BLOCKING.MAX_ORPHAN_CITATIONS) {
      result.status = 'fail';
    }
    // Otherwise pass
    else {
      result.status = 'pass';
    }

    // Compute step hash
    const inputHash = computeHash(JSON.stringify(citations.map(c => ({
      sourceId: c.sourceId,
      url: c.url
    }))));
    const outputHash = computeHash(JSON.stringify(result.metrics));
    result.step_hash = computeHash(inputHash + outputHash + (context.previousStepHash || ''));

  } catch (error) {
    result.status = 'error';
    result.issues.push({
      type: 'UNEXPECTED_ERROR',
      severity: 'blocking',
      message: error.message
    });
  }

  result.completed_at = new Date().toISOString();
  result.duration_ms = Date.now() - startTime;

  return result;
}

/**
 * Quick check for URL binding issues (used before full verification)
 * @param {string} caseDir - Path to case directory
 * @returns {object} - Quick check result
 */
function quickCheck(caseDir) {
  const sourcesJson = readJsonSafe(path.join(caseDir, CONST.PATHS.SOURCES_JSON));
  const article = readTextSafe(path.join(caseDir, CONST.PATHS.ARTICLE));

  if (!sourcesJson || !article) {
    return { ok: false, reason: 'Missing sources.json or article' };
  }

  const citations = extractCitations(article);
  const issues = [];

  for (const citation of citations) {
    if (!citation.url) continue;

    const sourceEntry = sourcesJson.sources.find(s => s.id === citation.sourceId);
    if (!sourceEntry) {
      issues.push(`${citation.sourceId}: not in sources.json`);
      continue;
    }

    const normalizedCitation = normalizeUrl(citation.url);
    const normalizedSource = normalizeUrl(sourceEntry.url);

    if (normalizedCitation !== normalizedSource) {
      issues.push(`${citation.sourceId}: citation URL doesn't match sources.json`);
    }
  }

  return {
    ok: issues.length === 0,
    issues
  };
}

module.exports = { run, quickCheck };
