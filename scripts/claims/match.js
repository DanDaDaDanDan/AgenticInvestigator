/**
 * match.js - Match Article Claims to Registry Claims
 *
 * Matches claims extracted from an article against the claim registry.
 * Uses LLM for semantic matching - simple and accurate.
 */

'use strict';

const { loadRegistry, normalizeClaim } = require('./registry');

/**
 * Extract claims from article text
 *
 * Finds sentences/passages that contain citations [S###] or [CL###]
 *
 * @param {string} articleText - Article content
 * @returns {array} - Array of {text, sourceId, line}
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

      claims.push({
        text: claimText,
        normalized: normalizeClaim(claimText),
        line: lineNum + 1,
        sourceIds,
        claimIds,
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
 * Generate LLM prompt for semantic claim matching
 *
 * @param {object} articleClaim - Claim from article
 * @param {array} candidates - Candidate registry claims (filtered by source if possible)
 * @returns {string} - Prompt for LLM
 */
function generateMatchPrompt(articleClaim, candidates) {
  if (candidates.length === 0) {
    return null;
  }

  const candidateList = candidates
    .slice(0, 10) // Limit to top 10 candidates to keep prompt reasonable
    .map((c, i) => `${i + 1}. [${c.id}] "${c.text}"\n   Source: ${c.sourceId}\n   Quote: "${c.supporting_quote?.substring(0, 100)}..."`)
    .join('\n\n');

  return `Verify if any registered claim supports this article claim.

ARTICLE CLAIM: "${articleClaim.text}"
${articleClaim.sourceIds.length > 0 ? `Cited sources: ${articleClaim.sourceIds.join(', ')}` : ''}

REGISTERED CLAIMS:
${candidateList}

Instructions:
1. Check if any registered claim conveys the SAME factual information as the article claim
2. Numbers must match exactly (62% ≠ 60%, $50M ≠ $5M)
3. The meaning must be equivalent, not just similar words
4. If the article claim cites a source, prefer matches from that source

Respond in JSON:
{
  "match": <number 1-${Math.min(candidates.length, 10)}> or null,
  "confidence": <0.0-1.0>,
  "status": "VERIFIED" | "UNVERIFIED" | "MISMATCH",
  "reason": "<brief explanation>"
}

- VERIFIED: A registered claim supports the article claim
- UNVERIFIED: No registered claim supports this (claim may need a source)
- MISMATCH: Article claim contradicts or misrepresents a registered claim`;
}

/**
 * Parse LLM match response
 *
 * @param {string} response - LLM response
 * @param {array} candidates - Original candidate claims
 * @returns {object} - {match, confidence, status, reason}
 */
function parseMatchResponse(response, candidates) {
  try {
    let jsonStr = response;

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());

    const matchIndex = parsed.match;
    const matchedClaim = matchIndex && matchIndex >= 1 && matchIndex <= candidates.length
      ? candidates[matchIndex - 1]
      : null;

    return {
      match: matchedClaim,
      confidence: parsed.confidence || 0,
      status: parsed.status || (matchedClaim ? 'VERIFIED' : 'UNVERIFIED'),
      reason: parsed.reason || ''
    };
  } catch (err) {
    return {
      match: null,
      confidence: 0,
      status: 'UNVERIFIED',
      reason: `Failed to parse LLM response: ${err.message}`
    };
  }
}

/**
 * Get candidate claims for matching
 *
 * If article claim cites specific sources, prioritize claims from those sources.
 *
 * @param {object} articleClaim - Claim from article
 * @param {array} allClaims - All registry claims
 * @returns {array} - Candidate claims to check
 */
function getCandidates(articleClaim, allClaims) {
  if (articleClaim.sourceIds.length > 0) {
    // First try claims from cited sources
    const fromCitedSources = allClaims.filter(c =>
      articleClaim.sourceIds.includes(c.sourceId)
    );

    if (fromCitedSources.length > 0) {
      return fromCitedSources;
    }
  }

  // Fall back to all claims
  return allClaims;
}

/**
 * Match all article claims to registry (returns data for LLM verification)
 *
 * This function prepares the matching data. The actual LLM calls
 * should be made by the caller (verify-article.js) to allow for
 * proper async handling and progress reporting.
 *
 * @param {string} caseDir - Case directory
 * @param {string} articleText - Article content
 * @returns {object} - {articleClaims, prompts, registry}
 */
function prepareMatching(caseDir, articleText) {
  const registry = loadRegistry(caseDir);
  const articleClaims = extractArticleClaims(articleText);

  const matchData = [];

  for (const articleClaim of articleClaims) {
    // If article already references a claim ID, it's a direct match
    if (articleClaim.claimIds.length > 0) {
      const directMatch = registry.claims.find(
        c => articleClaim.claimIds.includes(c.id)
      );

      if (directMatch) {
        matchData.push({
          articleClaim,
          directMatch,
          candidates: [],
          prompt: null, // No LLM needed
          status: 'VERIFIED',
          confidence: 1.0,
          reason: 'Direct claim reference'
        });
        continue;
      }
    }

    // Get candidate claims
    const candidates = getCandidates(articleClaim, registry.claims);

    // Generate prompt for LLM
    const prompt = generateMatchPrompt(articleClaim, candidates);

    matchData.push({
      articleClaim,
      directMatch: null,
      candidates,
      prompt,
      status: prompt ? 'PENDING' : 'UNVERIFIED',
      confidence: 0,
      reason: prompt ? 'Awaiting LLM verification' : 'No candidates found'
    });
  }

  return {
    articleClaims,
    matchData,
    registry,
    stats: {
      total: articleClaims.length,
      directMatches: matchData.filter(m => m.directMatch).length,
      pendingLLM: matchData.filter(m => m.prompt).length,
      noCandidates: matchData.filter(m => !m.prompt && !m.directMatch).length
    }
  };
}

/**
 * Process LLM response and update match data
 *
 * @param {object} matchItem - Single item from matchData
 * @param {string} llmResponse - Response from LLM
 * @returns {object} - Updated match item
 */
function processLLMResponse(matchItem, llmResponse) {
  const result = parseMatchResponse(llmResponse, matchItem.candidates);

  return {
    ...matchItem,
    registryClaim: result.match,
    status: result.status,
    confidence: result.confidence,
    reason: result.reason
  };
}

/**
 * Get verification summary
 */
function getMatchSummary(matchData) {
  const summary = {
    total: matchData.length,
    verified: 0,
    unverified: 0,
    mismatch: 0,
    pending: 0
  };

  for (const item of matchData) {
    if (item.status === 'VERIFIED') summary.verified++;
    else if (item.status === 'UNVERIFIED') summary.unverified++;
    else if (item.status === 'MISMATCH') summary.mismatch++;
    else if (item.status === 'PENDING') summary.pending++;
  }

  return summary;
}

module.exports = {
  extractArticleClaims,
  generateMatchPrompt,
  parseMatchResponse,
  getCandidates,
  prepareMatching,
  processLLMResponse,
  getMatchSummary
};
