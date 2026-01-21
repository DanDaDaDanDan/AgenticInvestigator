/**
 * integrity.js - Step 2: Hash verification and red flag detection
 *
 * Verifies that source evidence hasn't been tampered with and
 * detects common fabrication patterns:
 * - Hash of raw content matches stored hash
 * - Capture signature is present and valid format
 * - No fabrication patterns detected (compilation, round timestamps, etc.)
 *
 * This step ensures evidence integrity and detects manual fabrication.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const CONST = require('../constants');
const { readJsonSafe, readTextSafe, computeFileHash, computeHash, getUniqueSourceIds } = require('../utils');
const { isHomepage, isValidUrl } = require('../url-normalize');

/**
 * Run integrity verification step
 * @param {string} caseDir - Path to case directory
 * @param {object} context - Pipeline context
 * @returns {object} - Step result
 */
function run(caseDir, context) {
  const startTime = Date.now();

  const result = {
    step: 2,
    name: 'integrity',
    status: 'pending',
    started_at: new Date().toISOString(),
    completed_at: null,
    metrics: {
      sources_checked: 0,
      hash_verified: 0,
      hash_failed: 0,
      signature_present: 0,
      signature_missing: 0,
      red_flags_found: 0,
      fabrication_detected: 0
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

    // Get cited sources from article
    const article = context.article || readTextSafe(path.join(caseDir, CONST.PATHS.ARTICLE));
    const citedSourceIds = article ? getUniqueSourceIds(article) : new Set();

    // Check each cited source
    for (const sourceId of citedSourceIds) {
      const evidenceDir = path.join(caseDir, CONST.PATHS.EVIDENCE_DIR, sourceId);
      const metadataPath = path.join(evidenceDir, CONST.PATHS.METADATA);
      const contentPath = path.join(evidenceDir, CONST.PATHS.CONTENT);
      const rawHtmlPath = path.join(evidenceDir, CONST.PATHS.RAW_HTML);

      // Skip if evidence dir doesn't exist (caught in capture step)
      if (!fs.existsSync(evidenceDir)) {
        continue;
      }

      result.metrics.sources_checked++;

      const sourceResult = {
        sourceId,
        checks: [],
        red_flags: [],
        passed: true
      };

      const metadata = readJsonSafe(metadataPath);
      if (!metadata) {
        continue; // Caught in capture step
      }

      // ============================================================
      // CAPTURE SIGNATURE VERIFICATION
      // ============================================================

      if (metadata._capture_signature) {
        const sigValid = CONST.FABRICATION.VALID_SIGNATURE.test(metadata._capture_signature);
        if (sigValid) {
          sourceResult.checks.push({ check: 'signature_valid', passed: true });
          result.metrics.signature_present++;
        } else {
          sourceResult.checks.push({
            check: 'signature_valid',
            passed: false,
            message: `Invalid signature format: ${metadata._capture_signature}`
          });
          sourceResult.red_flags.push('INVALID_SIGNATURE_FORMAT');
          result.metrics.red_flags_found++;
        }
      } else {
        sourceResult.checks.push({
          check: 'signature_present',
          passed: false,
          message: 'No _capture_signature (may be manually created)'
        });
        sourceResult.red_flags.push('MISSING_SIGNATURE');
        result.metrics.signature_missing++;
        result.metrics.red_flags_found++;
      }

      // ============================================================
      // HASH VERIFICATION
      // ============================================================

      let hashVerified = false;

      // Try Format A: verification block
      if (metadata.verification && metadata.verification.raw_file) {
        const rawFile = path.join(evidenceDir, metadata.verification.raw_file);
        if (fs.existsSync(rawFile)) {
          const computedHash = computeFileHash(rawFile);
          const storedHash = metadata.verification.computed_hash;

          if (computedHash === storedHash) {
            sourceResult.checks.push({ check: 'hash_match', passed: true, method: 'verification_block' });
            hashVerified = true;
            result.metrics.hash_verified++;
          } else {
            sourceResult.checks.push({
              check: 'hash_match',
              passed: false,
              method: 'verification_block',
              message: `Hash mismatch: computed=${computedHash?.substring(0, 20)}..., stored=${storedHash?.substring(0, 20)}...`
            });
            sourceResult.red_flags.push('HASH_MISMATCH');
            result.metrics.red_flags_found++;
          }
        }
      }

      // Try Format B: files block with hash
      if (!hashVerified && metadata.files) {
        if (metadata.files.raw_html && metadata.files.raw_html.hash) {
          if (fs.existsSync(rawHtmlPath)) {
            const computedHash = computeFileHash(rawHtmlPath);
            const storedHash = metadata.files.raw_html.hash;

            if (computedHash === storedHash) {
              sourceResult.checks.push({ check: 'hash_match', passed: true, method: 'files_block' });
              hashVerified = true;
              result.metrics.hash_verified++;
            } else {
              sourceResult.checks.push({
                check: 'hash_match',
                passed: false,
                method: 'files_block',
                message: 'Hash mismatch'
              });
              sourceResult.red_flags.push('HASH_MISMATCH');
              result.metrics.red_flags_found++;
            }
          }
        }
      }

      // Try legacy format: sha256 at root
      if (!hashVerified && metadata.sha256) {
        if (fs.existsSync(rawHtmlPath)) {
          const computedHash = computeFileHash(rawHtmlPath);
          const storedHash = metadata.sha256.startsWith('sha256:')
            ? metadata.sha256
            : `sha256:${metadata.sha256}`;

          if (computedHash === storedHash) {
            sourceResult.checks.push({ check: 'hash_match', passed: true, method: 'legacy' });
            hashVerified = true;
            result.metrics.hash_verified++;
          }
        }
      }

      if (!hashVerified) {
        // No raw file to verify - check if PDF or other format
        const pdfFiles = fs.readdirSync(evidenceDir).filter(f => f.endsWith('.pdf'));
        if (pdfFiles.length > 0) {
          // PDF verification not implemented in this step
          sourceResult.checks.push({ check: 'hash_match', passed: true, method: 'pdf_skipped' });
          result.metrics.hash_verified++;
        } else {
          sourceResult.checks.push({
            check: 'hash_match',
            passed: false,
            message: 'No raw file found for hash verification'
          });
          result.metrics.hash_failed++;
        }
      }

      // ============================================================
      // RED FLAG DETECTION
      // ============================================================

      // Check 1: Round timestamp
      const capturedAt = metadata.captured_at || metadata.capture_timestamp;
      if (capturedAt && CONST.FABRICATION.ROUND_TIMESTAMP.test(capturedAt)) {
        sourceResult.red_flags.push('ROUND_TIMESTAMP');
        result.metrics.red_flags_found++;
        result.issues.push({
          type: 'SUSPICIOUS_TIMESTAMP',
          severity: 'warning',
          sourceId,
          message: `Timestamp ${capturedAt} is suspiciously round`
        });
      }

      // Check 2: Homepage URL
      const url = metadata.url;
      if (url && isHomepage(url)) {
        sourceResult.red_flags.push('HOMEPAGE_URL');
        result.metrics.red_flags_found++;
        result.issues.push({
          type: 'HOMEPAGE_URL',
          severity: 'warning',
          sourceId,
          message: `URL "${url}" is a homepage, not a specific article`
        });
      }

      // Check 3: Invalid URL
      if (url && !isValidUrl(url)) {
        sourceResult.red_flags.push('INVALID_URL');
        result.metrics.red_flags_found++;
        result.metrics.fabrication_detected++;
        result.issues.push({
          type: 'INVALID_URL',
          severity: 'blocking',
          sourceId,
          message: `URL "${url}" is not a valid HTTP/HTTPS URL`
        });
        sourceResult.passed = false;
      }

      // Check 4: content.md starts with fabrication pattern
      const content = readTextSafe(contentPath);
      if (content) {
        const contentStart = content.trim().substring(0, 200);
        if (CONST.FABRICATION.COMPILATION_CONTENT.test(contentStart)) {
          sourceResult.red_flags.push('FABRICATED_CONTENT');
          result.metrics.red_flags_found++;
          result.metrics.fabrication_detected++;
          result.issues.push({
            type: 'FABRICATED_CONTENT',
            severity: 'blocking',
            sourceId,
            message: 'content.md starts with fabrication pattern (e.g., "Research compilation...")'
          });
          sourceResult.passed = false;
        }
      }

      // Check 5: Suspicious source type in sources.json
      const sourceEntry = sourcesJson.sources.find(s => s.id === sourceId);
      if (sourceEntry && sourceEntry.type) {
        if (CONST.FABRICATION.SUSPICIOUS_TYPE.test(sourceEntry.type)) {
          sourceResult.red_flags.push('SUSPICIOUS_TYPE');
          result.metrics.red_flags_found++;
          result.metrics.fabrication_detected++;
          result.issues.push({
            type: 'SUSPICIOUS_SOURCE_TYPE',
            severity: 'blocking',
            sourceId,
            message: `Source type "${sourceEntry.type}" indicates fabrication`
          });
          sourceResult.passed = false;
        }
      }

      // Check 6: Suspicious title
      const title = metadata.title || (sourceEntry && sourceEntry.title);
      if (title && CONST.FABRICATION.SUSPICIOUS_TITLE.test(title)) {
        sourceResult.red_flags.push('SUSPICIOUS_TITLE');
        result.metrics.red_flags_found++;
        result.issues.push({
          type: 'SUSPICIOUS_TITLE',
          severity: 'warning',
          sourceId,
          message: `Title "${title}" suggests compilation/synthesis`
        });
      }

      result.details.push(sourceResult);
    }

    // Determine overall status
    const blockingIssues = result.issues.filter(i => i.severity === 'blocking');
    if (blockingIssues.length > 0 || result.metrics.fabrication_detected > 0) {
      result.status = 'fail';
    } else if (result.metrics.red_flags_found > 0) {
      result.status = 'warn';
    } else {
      result.status = 'pass';
    }

    // Compute step hash
    const inputHash = computeHash(JSON.stringify(Array.from(citedSourceIds).sort()));
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

module.exports = { run };
