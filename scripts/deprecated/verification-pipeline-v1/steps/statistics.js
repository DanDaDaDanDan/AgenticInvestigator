/**
 * statistics.js - Step 5: Statistics and number verification
 *
 * Verifies that statistics and numbers cited in the article match
 * exactly what appears in the cited sources. This prevents "statistical
 * drift" where numbers change as they flow through the system.
 *
 * Example:
 *   Article says: "72% of users..."  [S001]
 *   Source says: "52% of users..."
 *   Result: MISMATCH - blocking failure
 *
 * Also flags significant uncited numbers for review.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const CONST = require('../constants');
const {
  readJsonSafe,
  readTextSafe,
  extractStatistics,
  findNumberInText,
  extractCitations,
  computeHash
} = require('../utils');

/**
 * Run statistics verification step
 * @param {string} caseDir - Path to case directory
 * @param {object} context - Pipeline context
 * @returns {object} - Step result
 */
function run(caseDir, context) {
  const startTime = Date.now();

  const result = {
    step: 5,
    name: 'statistics',
    status: 'pending',
    started_at: new Date().toISOString(),
    completed_at: null,
    metrics: {
      numbers_extracted: 0,
      numbers_with_citations: 0,
      exact_matches: 0,
      approximate_matches: 0,
      mismatches: 0,
      source_missing: 0,
      uncited_significant: 0
    },
    issues: [],
    details: {
      verified: [],
      mismatched: [],
      uncited: []
    }
  };

  try {
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

    // Remove sources section from article (don't verify numbers in source list)
    const articleContent = article.replace(/## Sources.*$/s, '');

    // ============================================================
    // EXTRACT NUMBERS WITH CITATIONS
    // ============================================================

    const numbersWithCitations = extractNumbersWithCitations(articleContent);
    result.metrics.numbers_extracted = numbersWithCitations.length;

    // Process each number
    for (const num of numbersWithCitations) {
      result.metrics.numbers_with_citations++;

      // Load source content
      const contentPath = path.join(caseDir, CONST.PATHS.EVIDENCE_DIR, num.sourceId, CONST.PATHS.CONTENT);
      const sourceContent = readTextSafe(contentPath);

      if (!sourceContent) {
        result.metrics.source_missing++;
        result.details.mismatched.push({
          ...num,
          issue: 'SOURCE_MISSING',
          message: `Source ${num.sourceId} content not found`
        });
        continue;
      }

      // Search for the number in source
      const found = findNumberInText(sourceContent, num.value, 0.01); // 1% tolerance

      if (found.found) {
        if (found.exact) {
          result.metrics.exact_matches++;
          result.details.verified.push({
            ...num,
            match_type: 'exact',
            found_as: found.match
          });
        } else {
          result.metrics.approximate_matches++;
          result.details.verified.push({
            ...num,
            match_type: 'approximate',
            found_as: found.match,
            warning: 'Approximate match - verify manually'
          });
        }
      } else {
        result.metrics.mismatches++;
        result.details.mismatched.push({
          ...num,
          issue: 'NOT_FOUND',
          message: `Number ${num.raw} not found in source ${num.sourceId}`
        });
        result.issues.push({
          type: 'STATISTIC_MISMATCH',
          severity: 'blocking',
          sourceId: num.sourceId,
          message: `Statistic "${num.raw}" not found in cited source`,
          context: num.context
        });
      }
    }

    // ============================================================
    // FIND UNCITED SIGNIFICANT NUMBERS
    // ============================================================

    const allStats = extractStatistics(articleContent);
    const citedPositions = new Set(numbersWithCitations.map(n => n.position));

    for (const stat of allStats) {
      // Check if this number is cited
      // (Simple check: is there a citation nearby?)
      const nearbyText = articleContent.substring(
        Math.max(0, stat.position - 50),
        Math.min(articleContent.length, stat.position + stat.raw.length + 50)
      );

      const hasCitation = /\[S\d{3}\]/.test(nearbyText);

      if (!hasCitation && isSignificant(stat)) {
        result.metrics.uncited_significant++;
        result.details.uncited.push({
          ...stat,
          context: nearbyText.trim()
        });
      }
    }

    // ============================================================
    // DETERMINE OVERALL STATUS
    // ============================================================

    if (result.metrics.mismatches > 0) {
      result.status = 'fail';
    } else if (result.metrics.uncited_significant > 5) {
      result.status = 'warn';
    } else {
      result.status = 'pass';
    }

    // Compute step hash
    const inputHash = computeHash(articleContent);
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
 * Extract numbers with their citations from text
 * @param {string} text - Article text
 * @returns {Array} - Numbers with citation info
 */
function extractNumbersWithCitations(text) {
  const results = [];

  // Pattern: number followed by citation within 50 chars
  const patterns = [
    {
      // Percentage with citation
      regex: /(\d+(?:\.\d+)?)\s*%[^[]{0,50}\[S(\d{3})\]/g,
      type: 'percentage',
      extract: (m) => ({
        value: parseFloat(m[1]),
        raw: m[1] + '%',
        unit: '%',
        sourceId: `S${m[2]}`
      })
    },
    {
      // Dollar amount with citation
      regex: /\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|billion|M|B|k|K)?[^[]{0,50}\[S(\d{3})\]/gi,
      type: 'currency',
      extract: (m) => {
        let value = parseFloat(m[1].replace(/,/g, ''));
        const scale = m[2];
        if (scale && CONST.SCALE[scale.toLowerCase()]) {
          value *= CONST.SCALE[scale.toLowerCase()];
        }
        return {
          value,
          raw: '$' + m[1] + (scale || ''),
          unit: '$',
          sourceId: `S${m[3]}`
        };
      }
    },
    {
      // Count with citation (e.g., "2,000 agents")
      regex: /\b(\d+(?:,\d{3})+|\d{3,})\s+(?:agents?|people|workers|officers|personnel|individuals|cases|deaths|incidents)[^[]{0,50}\[S(\d{3})\]/gi,
      type: 'count',
      extract: (m) => ({
        value: parseInt(m[1].replace(/,/g, ''), 10),
        raw: m[1],
        unit: 'count',
        sourceId: `S${m[2]}`
      })
    },
    {
      // Scaled number with citation
      regex: /\b(\d+(?:\.\d+)?)\s*(million|billion|thousand)[^[]{0,30}\[S(\d{3})\]/gi,
      type: 'scaled',
      extract: (m) => {
        let value = parseFloat(m[1]);
        const scale = m[2].toLowerCase();
        if (CONST.SCALE[scale]) {
          value *= CONST.SCALE[scale];
        }
        return {
          value,
          raw: m[1] + ' ' + m[2],
          unit: 'scaled',
          sourceId: `S${m[3]}`
        };
      }
    }
  ];

  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = regex.exec(text)) !== null) {
      const extracted = pattern.extract(match);
      const context = text.substring(
        Math.max(0, match.index - 30),
        Math.min(text.length, match.index + match[0].length + 30)
      ).trim();

      results.push({
        type: pattern.type,
        ...extracted,
        context,
        position: match.index,
        fullMatch: match[0]
      });
    }
  }

  // Deduplicate by position
  const seen = new Set();
  return results.filter(r => {
    const key = `${r.position}-${r.sourceId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Determine if a statistic is significant enough to require citation
 * @param {object} stat - Statistic object
 * @returns {boolean} - True if significant
 */
function isSignificant(stat) {
  // Percentages are always significant
  if (stat.type === 'percentage') {
    return true;
  }

  // Currency amounts over $1000
  if (stat.type === 'currency' && stat.value >= 1000) {
    return true;
  }

  // Counts over 100
  if (stat.type === 'count' && stat.value >= 100) {
    return true;
  }

  // Scaled numbers are always significant
  if (stat.type === 'scaled') {
    return true;
  }

  return false;
}

module.exports = { run, extractNumbersWithCitations, isSignificant };
