/**
 * capture.js - Step 1: Verify source capture integrity
 *
 * Verifies that all cited sources have been properly captured:
 * - Entry exists in sources.json with captured: true
 * - Evidence directory exists with required files
 * - Metadata.json exists and contains required fields
 *
 * This is the first line of defense - if sources aren't captured,
 * no further verification is possible.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const CONST = require('../constants');
const { readJsonSafe, readTextSafe, listDirectories, computeHash, getUniqueSourceIds } = require('../utils');

/**
 * Run capture verification step
 * @param {string} caseDir - Path to case directory
 * @param {object} context - Pipeline context (article content, sources.json, etc.)
 * @returns {object} - Step result with status and metrics
 */
function run(caseDir, context) {
  const startTime = Date.now();

  const result = {
    step: 1,
    name: 'capture',
    status: 'pending',
    started_at: new Date().toISOString(),
    completed_at: null,
    metrics: {
      sources_in_json: 0,
      sources_cited: 0,
      sources_captured: 0,
      sources_missing: 0,
      sources_uncaptured: 0
    },
    issues: [],
    details: []
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

    result.metrics.sources_in_json = sourcesJson.sources.length;

    // Get cited sources from article
    const article = context.article || readTextSafe(path.join(caseDir, CONST.PATHS.ARTICLE));
    const citedSourceIds = article ? getUniqueSourceIds(article) : new Set();
    result.metrics.sources_cited = citedSourceIds.size;

    // Build lookup map
    const sourceMap = new Map();
    for (const source of sourcesJson.sources) {
      sourceMap.set(source.id, source);
    }

    // Check each cited source
    for (const sourceId of citedSourceIds) {
      const sourceEntry = sourceMap.get(sourceId);
      const evidenceDir = path.join(caseDir, CONST.PATHS.EVIDENCE_DIR, sourceId);
      const metadataPath = path.join(evidenceDir, CONST.PATHS.METADATA);
      const contentPath = path.join(evidenceDir, CONST.PATHS.CONTENT);

      const sourceResult = {
        sourceId,
        checks: [],
        passed: true
      };

      // Check 1: Entry in sources.json
      if (!sourceEntry) {
        sourceResult.checks.push({
          check: 'in_sources_json',
          passed: false,
          message: 'Not found in sources.json'
        });
        sourceResult.passed = false;
        result.metrics.sources_missing++;
        result.issues.push({
          type: 'SOURCE_NOT_IN_REGISTRY',
          severity: 'blocking',
          sourceId,
          message: `${sourceId} cited in article but not in sources.json`
        });
      } else {
        sourceResult.checks.push({ check: 'in_sources_json', passed: true });
        sourceResult.url = sourceEntry.url;
        sourceResult.title = sourceEntry.title;

        // Check 2: captured: true
        if (sourceEntry.captured !== true) {
          sourceResult.checks.push({
            check: 'captured_true',
            passed: false,
            message: `captured: ${sourceEntry.captured}`
          });
          sourceResult.passed = false;
          result.metrics.sources_uncaptured++;
          result.issues.push({
            type: 'SOURCE_NOT_CAPTURED',
            severity: 'blocking',
            sourceId,
            message: `${sourceId} has captured: ${sourceEntry.captured} (should be true)`
          });
        } else {
          sourceResult.checks.push({ check: 'captured_true', passed: true });
        }
      }

      // Check 3: Evidence directory exists
      if (!fs.existsSync(evidenceDir)) {
        sourceResult.checks.push({
          check: 'evidence_dir_exists',
          passed: false,
          message: 'Evidence directory missing'
        });
        sourceResult.passed = false;
        result.issues.push({
          type: 'EVIDENCE_DIR_MISSING',
          severity: 'blocking',
          sourceId,
          message: `evidence/${sourceId}/ directory does not exist`
        });
      } else {
        sourceResult.checks.push({ check: 'evidence_dir_exists', passed: true });

        // Check 4: metadata.json exists
        if (!fs.existsSync(metadataPath)) {
          sourceResult.checks.push({
            check: 'metadata_exists',
            passed: false,
            message: 'metadata.json missing'
          });
          sourceResult.passed = false;
          result.issues.push({
            type: 'METADATA_MISSING',
            severity: 'blocking',
            sourceId,
            message: `evidence/${sourceId}/metadata.json does not exist`
          });
        } else {
          sourceResult.checks.push({ check: 'metadata_exists', passed: true });

          // Check 5: metadata.json is valid JSON
          const metadata = readJsonSafe(metadataPath);
          if (!metadata) {
            sourceResult.checks.push({
              check: 'metadata_valid',
              passed: false,
              message: 'metadata.json is not valid JSON'
            });
            sourceResult.passed = false;
            result.issues.push({
              type: 'METADATA_INVALID',
              severity: 'blocking',
              sourceId,
              message: `evidence/${sourceId}/metadata.json is not valid JSON`
            });
          } else {
            sourceResult.checks.push({ check: 'metadata_valid', passed: true });
            sourceResult.metadata = {
              url: metadata.url,
              captured_at: metadata.captured_at,
              has_signature: !!metadata._capture_signature
            };
          }
        }

        // Check 6: content.md exists and not empty
        if (!fs.existsSync(contentPath)) {
          sourceResult.checks.push({
            check: 'content_exists',
            passed: false,
            message: 'content.md missing'
          });
          sourceResult.passed = false;
          result.issues.push({
            type: 'CONTENT_MISSING',
            severity: 'blocking',
            sourceId,
            message: `evidence/${sourceId}/content.md does not exist`
          });
        } else {
          const content = readTextSafe(contentPath);
          if (!content || content.trim().length === 0) {
            sourceResult.checks.push({
              check: 'content_not_empty',
              passed: false,
              message: 'content.md is empty'
            });
            sourceResult.passed = false;
            result.issues.push({
              type: 'CONTENT_EMPTY',
              severity: 'blocking',
              sourceId,
              message: `evidence/${sourceId}/content.md is empty`
            });
          } else {
            sourceResult.checks.push({ check: 'content_not_empty', passed: true });
            sourceResult.contentLength = content.length;
          }
        }
      }

      if (sourceResult.passed) {
        result.metrics.sources_captured++;
      }

      result.details.push(sourceResult);
    }

    // Determine overall status
    const blockingIssues = result.issues.filter(i => i.severity === 'blocking');
    if (blockingIssues.length > 0) {
      result.status = 'fail';
    } else {
      result.status = 'pass';
    }

    // Compute step hash
    const inputHash = computeHash(JSON.stringify({
      sourcesJson: sourcesJson.sources.map(s => ({ id: s.id, captured: s.captured })),
      citedSources: Array.from(citedSourceIds).sort()
    }));
    const outputHash = computeHash(JSON.stringify(result.metrics));
    result.step_hash = computeHash(inputHash + outputHash);

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

module.exports = { run };
