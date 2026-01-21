/**
 * extract.js - Extract Factual Claims from Source Content
 *
 * Extracts verifiable factual claims from source content.
 * Uses LLM for extraction, with structured output parsing.
 */

'use strict';

/**
 * Generate prompt for LLM to extract claims from content
 *
 * @param {string} content - Source content (markdown)
 * @param {string} sourceUrl - URL of the source
 * @returns {string} - Prompt for LLM
 */
function generateExtractionPrompt(content, sourceUrl) {
  // Truncate if too long (keep first 15000 chars for context window)
  const truncated = content.length > 15000
    ? content.substring(0, 15000) + '\n\n[Content truncated...]'
    : content;

  return `Extract all verifiable factual claims from this source content. Focus on:
- Statistics and numbers (percentages, counts, dollar amounts, dates)
- Factual statements that can be verified
- Attributions (who said what)
- Events with specific details

For each claim, provide:
1. The exact claim text (as it would appear in an article)
2. The claim type: "statistic", "fact", "attribution", "event", or "comparison"
3. Any numbers with their units and context
4. Key entities mentioned
5. The EXACT supporting quote from the source (copy verbatim)
6. Approximate line number or location in the source

Source URL: ${sourceUrl}

SOURCE CONTENT:
${truncated}

Respond in JSON format:
{
  "claims": [
    {
      "text": "62% of brand payments went to top 10% of creators",
      "type": "statistic",
      "numbers": [
        {"value": 62, "unit": "percent", "context": "brand payments to top creators"},
        {"value": 10, "unit": "percent", "context": "top creators"}
      ],
      "entities": ["brand payments", "creators"],
      "supporting_quote": "The top 10 percent of creators received 62 percent of all brand partnership payments",
      "quote_location": "paragraph 3"
    }
  ]
}

Rules:
- Only extract claims that are EXPLICITLY stated in the source
- Do NOT infer or extrapolate claims
- The supporting_quote must be VERBATIM from the source
- Include all numbers mentioned, even if they seem minor
- Be thorough - extract every verifiable fact`;
}

/**
 * Parse LLM response into structured claims
 *
 * @param {string} response - LLM response (JSON string)
 * @returns {array} - Array of parsed claims
 */
function parseExtractionResponse(response) {
  try {
    // Try to extract JSON from response (may have markdown wrapper)
    let jsonStr = response;

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());

    if (!parsed.claims || !Array.isArray(parsed.claims)) {
      console.error('Invalid extraction response: missing claims array');
      return [];
    }

    // Validate and clean each claim
    return parsed.claims
      .filter(claim => claim.text && claim.supporting_quote)
      .map(claim => ({
        text: claim.text.trim(),
        type: validateType(claim.type),
        numbers: parseNumbers(claim.numbers),
        entities: claim.entities || [],
        supporting_quote: claim.supporting_quote.trim(),
        quote_location: claim.quote_location || null
      }));

  } catch (err) {
    console.error(`Error parsing extraction response: ${err.message}`);
    return [];
  }
}

/**
 * Validate claim type
 */
function validateType(type) {
  const validTypes = ['statistic', 'fact', 'attribution', 'event', 'comparison'];
  if (validTypes.includes(type)) {
    return type;
  }
  return 'fact'; // default
}

/**
 * Parse and validate numbers
 */
function parseNumbers(numbers) {
  if (!numbers || !Array.isArray(numbers)) {
    return [];
  }

  return numbers
    .filter(n => n.value !== undefined && n.value !== null)
    .map(n => ({
      value: parseFloat(n.value),
      unit: n.unit || null,
      context: n.context || null
    }));
}

/**
 * Extract numbers from text using regex (fallback/supplement to LLM)
 *
 * @param {string} text - Claim text
 * @returns {array} - Extracted numbers
 */
function extractNumbersFromText(text) {
  const numbers = [];

  // Percentages
  const percentMatch = text.matchAll(/(\d+(?:\.\d+)?)\s*(?:percent|%)/gi);
  for (const match of percentMatch) {
    numbers.push({
      value: parseFloat(match[1]),
      unit: 'percent',
      context: extractContext(text, match.index)
    });
  }

  // Dollar amounts
  const dollarMatch = text.matchAll(/\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|billion|thousand)?/gi);
  for (const match of dollarMatch) {
    let value = parseFloat(match[1].replace(/,/g, ''));
    const multiplier = match[2]?.toLowerCase();
    if (multiplier === 'thousand') value *= 1000;
    if (multiplier === 'million') value *= 1000000;
    if (multiplier === 'billion') value *= 1000000000;

    numbers.push({
      value,
      unit: 'dollars',
      context: extractContext(text, match.index)
    });
  }

  // Plain numbers with context
  const plainMatch = text.matchAll(/(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s+(\w+)/gi);
  for (const match of plainMatch) {
    // Skip if already captured as percent or dollar
    if (text.substring(match.index - 1, match.index) === '$') continue;
    if (/percent|%/i.test(match[2])) continue;

    numbers.push({
      value: parseFloat(match[1].replace(/,/g, '')),
      unit: match[2].toLowerCase(),
      context: extractContext(text, match.index)
    });
  }

  return numbers;
}

/**
 * Extract context around a match
 */
function extractContext(text, index, windowSize = 30) {
  const start = Math.max(0, index - windowSize);
  const end = Math.min(text.length, index + windowSize);
  return text.substring(start, end).trim();
}

/**
 * Verify that a quote exists in the source content
 *
 * @param {string} quote - The supporting quote
 * @param {string} content - Source content
 * @returns {object} - {found: boolean, location: string|null}
 */
function verifyQuoteInSource(quote, content) {
  // Normalize both for comparison
  const normalizedQuote = quote.toLowerCase().replace(/\s+/g, ' ').trim();
  const normalizedContent = content.toLowerCase().replace(/\s+/g, ' ');

  // Try exact match first
  const exactIndex = normalizedContent.indexOf(normalizedQuote);
  if (exactIndex !== -1) {
    // Find approximate line number
    const beforeMatch = content.substring(0, exactIndex);
    const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
    return { found: true, location: `line ${lineNumber}`, matchType: 'exact' };
  }

  // Try fuzzy match (first 50 chars of quote)
  const partialQuote = normalizedQuote.substring(0, 50);
  const partialIndex = normalizedContent.indexOf(partialQuote);
  if (partialIndex !== -1) {
    const beforeMatch = content.substring(0, partialIndex);
    const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
    return { found: true, location: `line ${lineNumber}`, matchType: 'partial' };
  }

  return { found: false, location: null, matchType: 'none' };
}

/**
 * Quick extraction using regex patterns (no LLM, for fast preliminary scan)
 *
 * @param {string} content - Source content
 * @returns {array} - Array of potential claims (numbers with context)
 */
function quickExtract(content) {
  const claims = [];

  // Split into sentences
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);

  for (const sentence of sentences) {
    const numbers = extractNumbersFromText(sentence);

    if (numbers.length > 0) {
      claims.push({
        text: sentence.trim(),
        type: 'statistic',
        numbers,
        entities: [],
        supporting_quote: sentence.trim(),
        quote_location: null,
        extraction_method: 'regex'
      });
    }
  }

  return claims;
}

/**
 * Main extraction function
 *
 * Returns a prompt for LLM extraction. The caller should:
 * 1. Call this to get the prompt
 * 2. Send prompt to LLM
 * 3. Call parseExtractionResponse with the LLM response
 * 4. Optionally verify quotes with verifyQuoteInSource
 *
 * @param {string} content - Source content
 * @param {string} sourceUrl - Source URL
 * @param {object} options - Options
 * @returns {object} - {prompt, quickClaims}
 */
function prepareExtraction(content, sourceUrl, options = {}) {
  const prompt = generateExtractionPrompt(content, sourceUrl);

  // Also do quick regex extraction as supplement
  const quickClaims = options.includeQuick !== false
    ? quickExtract(content)
    : [];

  return { prompt, quickClaims };
}

/**
 * Post-process extracted claims
 *
 * @param {array} claims - Claims from LLM
 * @param {string} content - Original source content
 * @returns {array} - Verified and enriched claims
 */
function postProcessClaims(claims, content) {
  return claims.map(claim => {
    // Verify quote exists in source
    const verification = verifyQuoteInSource(claim.supporting_quote, content);

    // Extract additional numbers if LLM missed any
    const textNumbers = extractNumbersFromText(claim.text);
    const allNumbers = mergeNumbers(claim.numbers, textNumbers);

    return {
      ...claim,
      numbers: allNumbers,
      quote_verified: verification.found,
      quote_location: verification.location || claim.quote_location,
      quote_match_type: verification.matchType
    };
  });
}

/**
 * Merge number arrays, avoiding duplicates
 */
function mergeNumbers(nums1, nums2) {
  const seen = new Set();
  const merged = [];

  for (const num of [...(nums1 || []), ...(nums2 || [])]) {
    const key = `${num.value}:${num.unit}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(num);
    }
  }

  return merged;
}

module.exports = {
  generateExtractionPrompt,
  parseExtractionResponse,
  verifyQuoteInSource,
  quickExtract,
  prepareExtraction,
  postProcessClaims,
  extractNumbersFromText
};
