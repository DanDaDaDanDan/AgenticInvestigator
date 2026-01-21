/**
 * match.js - Match Article Claims to Registry Claims
 *
 * Matches claims extracted from an article against the claim registry.
 * Uses multiple matching strategies: exact, number-based, and semantic.
 */

'use strict';

const { loadRegistry, normalizeClaim } = require('./registry');
const { extractNumbersFromText } = require('./extract');

/**
 * Extract claims from article text
 *
 * Finds sentences/passages that contain citations [S###] or [CL###]
 *
 * @param {string} articleText - Article content
 * @returns {array} - Array of {text, sourceId, line, numbers}
 */
function extractArticleClaims(articleText) {
  const claims = [];
  const lines = articleText.split('\n');

  // Pattern for citations: [S001], [S001](url), [CL001], etc.
  const citationPattern = /\[(S\d{3}|CL\d{4})\](?:\([^)]+\))?/g;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    // Skip headers, empty lines, metadata
    if (line.startsWith('#') || line.trim() === '' || line.startsWith('---')) {
      continue;
    }

    // Find all citations in this line
    const matches = [...line.matchAll(citationPattern)];

    if (matches.length === 0) continue;

    // Split line into sentences
    const sentences = splitIntoSentences(line);

    for (const sentence of sentences) {
      const sentenceMatches = [...sentence.matchAll(citationPattern)];

      if (sentenceMatches.length === 0) continue;

      // Extract the claim text (sentence without the citation markup)
      const claimText = sentence
        .replace(/\[(S\d{3}|CL\d{4})\](?:\([^)]+\))?/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (claimText.length < 10) continue; // Too short to be meaningful

      // Get source/claim IDs referenced
      const sourceIds = sentenceMatches
        .map(m => m[1])
        .filter(id => id.startsWith('S'));

      const claimIds = sentenceMatches
        .map(m => m[1])
        .filter(id => id.startsWith('CL'));

      // Extract numbers from the claim
      const numbers = extractNumbersFromText(claimText);

      claims.push({
        text: claimText,
        normalized: normalizeClaim(claimText),
        line: lineNum + 1,
        sourceIds,
        claimIds,
        numbers,
        raw: sentence.trim()
      });
    }
  }

  return claims;
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text) {
  // Simple sentence splitting (handles most cases)
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .filter(s => s.trim().length > 0);
}

/**
 * Match a single article claim to registry claims
 *
 * @param {object} articleClaim - Claim from article
 * @param {array} registryClaims - All registry claims
 * @returns {object} - {match: claim|null, score: number, matchType: string}
 */
function matchClaim(articleClaim, registryClaims) {
  let bestMatch = null;
  let bestScore = 0;
  let bestMatchType = 'none';

  for (const regClaim of registryClaims) {
    // Strategy 1: Exact normalized text match
    const exactScore = exactMatch(articleClaim.normalized, regClaim.normalized);
    if (exactScore > bestScore) {
      bestScore = exactScore;
      bestMatch = regClaim;
      bestMatchType = 'exact';
    }

    // Strategy 2: Number-based match (same numbers = likely same claim)
    if (articleClaim.numbers.length > 0 && regClaim.numbers.length > 0) {
      const numberScore = numberMatch(articleClaim.numbers, regClaim.numbers);
      if (numberScore > bestScore) {
        bestScore = numberScore;
        bestMatch = regClaim;
        bestMatchType = 'number';
      }
    }

    // Strategy 3: Keyword overlap (semantic similarity proxy)
    const keywordScore = keywordMatch(articleClaim.normalized, regClaim.normalized);
    if (keywordScore > bestScore) {
      bestScore = keywordScore;
      bestMatch = regClaim;
      bestMatchType = 'keyword';
    }

    // Strategy 4: Source-constrained match (if article cites a source, only match claims from that source)
    if (articleClaim.sourceIds.length > 0) {
      const sourceScore = sourceConstrainedMatch(articleClaim, regClaim);
      if (sourceScore > bestScore) {
        bestScore = sourceScore;
        bestMatch = regClaim;
        bestMatchType = 'source_constrained';
      }
    }
  }

  // Threshold for accepting a match
  const threshold = 0.5;

  if (bestScore >= threshold) {
    return { match: bestMatch, score: bestScore, matchType: bestMatchType };
  }

  return { match: null, score: bestScore, matchType: 'none' };
}

/**
 * Exact text match scoring
 */
function exactMatch(text1, text2) {
  if (text1 === text2) return 1.0;

  // Check if one contains the other
  if (text1.includes(text2) || text2.includes(text1)) {
    const shorter = Math.min(text1.length, text2.length);
    const longer = Math.max(text1.length, text2.length);
    return shorter / longer;
  }

  return 0;
}

/**
 * Number-based match scoring
 *
 * Claims with the same specific numbers are likely the same claim
 */
function numberMatch(nums1, nums2) {
  if (nums1.length === 0 || nums2.length === 0) return 0;

  let matches = 0;

  for (const n1 of nums1) {
    for (const n2 of nums2) {
      // Check if values match (with small tolerance for rounding)
      const tolerance = 0.01;
      const diff = Math.abs(n1.value - n2.value) / Math.max(n1.value, n2.value, 1);

      if (diff <= tolerance) {
        // Same value
        matches++;

        // Bonus if same unit
        if (n1.unit === n2.unit) {
          matches += 0.5;
        }
      }
    }
  }

  // Score based on proportion of numbers matched
  const maxPossible = Math.max(nums1.length, nums2.length);
  return Math.min(1.0, matches / maxPossible);
}

/**
 * Keyword overlap scoring (Jaccard similarity)
 */
function keywordMatch(text1, text2) {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'that', 'this', 'these', 'those'
  ]);

  const words1 = new Set(
    text1.split(/\s+/)
      .map(w => w.replace(/[^a-z0-9]/g, ''))
      .filter(w => w.length > 2 && !stopWords.has(w))
  );

  const words2 = new Set(
    text2.split(/\s+/)
      .map(w => w.replace(/[^a-z0-9]/g, ''))
      .filter(w => w.length > 2 && !stopWords.has(w))
  );

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Source-constrained match
 *
 * If article cites source S027, only consider registry claims from S027
 */
function sourceConstrainedMatch(articleClaim, regClaim) {
  if (!articleClaim.sourceIds.includes(regClaim.sourceId)) {
    return 0;
  }

  // Within the same source, use keyword matching
  const keywordScore = keywordMatch(articleClaim.normalized, regClaim.normalized);

  // Boost score since source already matches
  return Math.min(1.0, keywordScore * 1.5);
}

/**
 * Match all article claims to registry
 *
 * @param {string} caseDir - Case directory
 * @param {string} articleText - Article content
 * @returns {array} - Array of {articleClaim, registryClaim, score, matchType, status}
 */
function matchAllClaims(caseDir, articleText) {
  const registry = loadRegistry(caseDir);
  const articleClaims = extractArticleClaims(articleText);

  const results = [];

  for (const articleClaim of articleClaims) {
    // If article already references a claim ID, look it up directly
    if (articleClaim.claimIds.length > 0) {
      const directMatch = registry.claims.find(
        c => articleClaim.claimIds.includes(c.id)
      );

      if (directMatch) {
        results.push({
          articleClaim,
          registryClaim: directMatch,
          score: 1.0,
          matchType: 'direct_reference',
          status: 'VERIFIED'
        });
        continue;
      }
    }

    // Otherwise, try to match
    const { match, score, matchType } = matchClaim(articleClaim, registry.claims);

    if (match) {
      // Check if the match is from the cited source
      const sourceMatch = articleClaim.sourceIds.length === 0 ||
        articleClaim.sourceIds.includes(match.sourceId);

      results.push({
        articleClaim,
        registryClaim: match,
        score,
        matchType,
        status: sourceMatch ? 'VERIFIED' : 'SOURCE_MISMATCH'
      });
    } else {
      results.push({
        articleClaim,
        registryClaim: null,
        score,
        matchType: 'none',
        status: 'UNVERIFIED'
      });
    }
  }

  return results;
}

/**
 * Get verification summary
 */
function getMatchSummary(results) {
  const summary = {
    total: results.length,
    verified: 0,
    unverified: 0,
    sourceMismatch: 0,
    byMatchType: {}
  };

  for (const result of results) {
    if (result.status === 'VERIFIED') summary.verified++;
    else if (result.status === 'UNVERIFIED') summary.unverified++;
    else if (result.status === 'SOURCE_MISMATCH') summary.sourceMismatch++;

    const type = result.matchType;
    summary.byMatchType[type] = (summary.byMatchType[type] || 0) + 1;
  }

  return summary;
}

/**
 * Generate prompt for LLM-based semantic matching (for difficult cases)
 */
function generateSemanticMatchPrompt(articleClaim, candidates) {
  const candidateList = candidates
    .map((c, i) => `${i + 1}. [${c.id}] "${c.text}" (from ${c.sourceId})`)
    .join('\n');

  return `Does any of these registered claims support the following article claim?

ARTICLE CLAIM: "${articleClaim.text}"

REGISTERED CLAIMS:
${candidateList}

If one of the registered claims supports the article claim, respond with the claim number (1, 2, etc.).
If none support it, respond with "NONE".
If the article claim says something different than the registered claim, respond with "MISMATCH" and explain the difference.

Response format:
{
  "match": 1 or "NONE" or "MISMATCH",
  "confidence": 0.0-1.0,
  "explanation": "brief explanation"
}`;
}

module.exports = {
  extractArticleClaims,
  matchClaim,
  matchAllClaims,
  getMatchSummary,
  generateSemanticMatchPrompt,
  exactMatch,
  numberMatch,
  keywordMatch
};
