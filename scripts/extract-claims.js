#!/usr/bin/env node
/**
 * extract-claims.js - Extract and classify claims from article text
 *
 * Provides utilities for extracting factual claims from markdown articles,
 * classifying them by type, and preparing them for verification.
 *
 * Usage:
 *   node scripts/extract-claims.js <article_path>
 *   node scripts/extract-claims.js <article_path> --json
 *
 * Claim types:
 *   - quantitative: Numbers, percentages, statistics
 *   - factual_narrative: Factual statements about events/actions
 *   - attribution: Statements attributed to sources ("X said...")
 *   - temporal: Time-based claims ("in 2024...")
 *   - comparative: Comparisons ("more than", "largest")
 *   - causal: Cause-effect relationships
 *   - analysis: Interpretive claims requiring judgment
 *
 * Exit codes:
 *   0 - Success
 *   1 - File not found
 *   2 - Usage error
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Generate a short hash for claim identification
 */
function hashClaim(text) {
  return `sha256:${crypto.createHash('sha256').update(text).digest('hex')}`;
}

/**
 * Classify a claim by its type
 */
function classifyClaim(text) {
  const types = [];

  // Quantitative: contains numbers, percentages, statistics
  if (/\d+(?:\.\d+)?%/.test(text) ||
      /\$\d+/.test(text) ||
      /\b\d+(?:,\d{3})+\b/.test(text) ||
      /\d+\s*(?:million|billion|thousand)/i.test(text)) {
    types.push('quantitative');
  }

  // Attribution: quotes or attributed statements
  if (/(?:said|stated|according to|reported|claimed|wrote|announced|confirmed)/i.test(text) ||
      /"[^"]+"/g.test(text)) {
    types.push('attribution');
  }

  // Temporal: time-based claims
  if (/(?:in \d{4}|since \d{4}|between \d{4}|from \d{4}|until \d{4})/i.test(text) ||
      /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/i.test(text)) {
    types.push('temporal');
  }

  // Comparative: comparisons
  if (/(?:more than|less than|greater than|fewer than|larger|smaller|highest|lowest|most|least|compared to|versus)/i.test(text)) {
    types.push('comparative');
  }

  // Causal: cause-effect
  if (/(?:because|therefore|as a result|led to|caused|resulted in|due to|consequently)/i.test(text)) {
    types.push('causal');
  }

  // Analysis: interpretive language
  if (/(?:suggests|indicates|implies|appears to|seems to|likely|probably|arguably|potentially)/i.test(text)) {
    types.push('analysis');
  }

  // Default to factual_narrative if no specific type detected
  if (types.length === 0) {
    types.push('factual_narrative');
  }

  return types;
}

/**
 * Extract all numbers and statistics from text
 */
function extractNumbers(text) {
  const numbers = [];

  // Percentages
  const percentages = text.match(/(\d+(?:\.\d+)?)\s*%/g);
  if (percentages) {
    percentages.forEach(p => {
      numbers.push({
        type: 'percentage',
        raw: p,
        value: parseFloat(p.replace('%', '').trim())
      });
    });
  }

  // Dollar amounts
  const dollars = text.match(/\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|billion|M|B|k|K)?/gi);
  if (dollars) {
    dollars.forEach(d => {
      const valueMatch = d.match(/\$(\d+(?:,\d{3})*(?:\.\d+)?)/);
      const multiplierMatch = d.match(/(million|billion|M|B|k|K)$/i);
      let value = parseFloat(valueMatch[1].replace(/,/g, ''));
      if (multiplierMatch) {
        const mult = multiplierMatch[1].toLowerCase();
        if (mult === 'k') value *= 1000;
        if (mult === 'm' || mult === 'million') value *= 1000000;
        if (mult === 'b' || mult === 'billion') value *= 1000000000;
      }
      numbers.push({
        type: 'currency',
        raw: d,
        value: value
      });
    });
  }

  // Large numbers with commas
  const largeNums = text.match(/\b(\d{1,3}(?:,\d{3})+)\b/g);
  if (largeNums) {
    largeNums.forEach(n => {
      numbers.push({
        type: 'count',
        raw: n,
        value: parseInt(n.replace(/,/g, ''), 10)
      });
    });
  }

  // Numbers with scale words
  const scaleNums = text.match(/(\d+(?:\.\d+)?)\s*(million|billion|thousand)/gi);
  if (scaleNums) {
    scaleNums.forEach(n => {
      const valueMatch = n.match(/(\d+(?:\.\d+)?)/);
      const scale = n.toLowerCase();
      let value = parseFloat(valueMatch[1]);
      if (scale.includes('thousand')) value *= 1000;
      if (scale.includes('million')) value *= 1000000;
      if (scale.includes('billion')) value *= 1000000000;
      numbers.push({
        type: 'scaled',
        raw: n,
        value: value
      });
    });
  }

  return numbers;
}

/**
 * Extract named entities (proper nouns)
 */
function extractEntities(text) {
  const entities = [];

  // Proper nouns (capitalized words not at start of sentence)
  const properNouns = text.match(/(?<=[a-z]\s)[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || [];

  // Names in quotes
  const quotedNames = text.match(/"[^"]+"/g) || [];

  // Organizations (common patterns)
  const orgs = text.match(/(?:the\s)?[A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*(?:\s(?:Company|Corporation|Corp|Inc|LLC|Association|Commission|Agency|Department|Institute|Foundation))/g) || [];

  return [...new Set([...properNouns, ...orgs])];
}

/**
 * Parse markdown into sections
 */
function parseSections(markdown) {
  const sections = [];
  const lines = markdown.split('\n');
  let currentSection = { title: 'Introduction', content: [], startLine: 1 };

  lines.forEach((line, index) => {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      if (currentSection.content.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        level: headerMatch[1].length,
        title: headerMatch[2],
        content: [],
        startLine: index + 1
      };
    } else {
      currentSection.content.push({ text: line, lineNumber: index + 1 });
    }
  });

  if (currentSection.content.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Extract citation patterns from text
 * Returns array of { sourceIds: [], position, context }
 */
function extractCitationPatterns(text) {
  const patterns = [];

  // Match [S###] or [S###](url) - may have multiple citations
  const citationRegex = /\[S(\d{3})\](?:\([^)]+\))?/g;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    const sourceId = `S${match[1]}`;
    const position = match.index;

    // Get context - text before the citation (up to 300 chars or previous citation)
    let contextStart = Math.max(0, position - 300);
    const contextText = text.substring(contextStart, position).trim();

    // Find sentence boundaries
    const sentences = contextText.split(/(?<=[.!?])\s+/);
    const lastSentence = sentences[sentences.length - 1] || '';

    patterns.push({
      sourceId,
      position,
      context: lastSentence,
      fullMatch: match[0]
    });
  }

  return patterns;
}

/**
 * Split compound sentences into individual claims
 */
function splitCompoundClaims(text) {
  const claims = [];

  // Split on common conjunctions that separate independent clauses
  const splitPatterns = [
    /;\s+/,                          // Semicolons
    /,\s+and\s+(?=[A-Z])/,          // ", and" before capital letter
    /,\s+but\s+/,                    // ", but"
    /,\s+while\s+/,                  // ", while"
    /,\s+whereas\s+/,                // ", whereas"
    /,\s+although\s+/,               // ", although"
  ];

  let segments = [text];
  for (const pattern of splitPatterns) {
    segments = segments.flatMap(s => s.split(pattern));
  }

  return segments
    .map(s => s.trim())
    .filter(s => s.length > 20); // Filter out fragments
}

/**
 * Extract claims from article text
 * @param {string} content - Article markdown content
 * @returns {Array} Array of claim objects
 */
function extractClaims(content) {
  const claims = [];
  const sections = parseSections(content);
  let claimCounter = 1;

  for (const section of sections) {
    // Skip non-content sections
    if (/^(?:Sources|References|Citations|Notes|Appendix)/i.test(section.title)) {
      continue;
    }

    // Join section content
    const sectionText = section.content.map(c => c.text).join('\n');

    // Split into paragraphs
    const paragraphs = sectionText.split(/\n\n+/);

    for (const paragraph of paragraphs) {
      if (paragraph.trim().length < 30) continue;

      // Find citations in this paragraph
      const citations = extractCitationPatterns(paragraph);

      for (const citation of citations) {
        // Get the claim text (context before the citation)
        let claimText = citation.context;

        // Skip if claim is too short or just markup
        if (claimText.length < 15) continue;
        if (/^[-*#>\s]+$/.test(claimText)) continue;

        // Skip if claim starts with markdown header (section headers aren't claims)
        if (/^#{1,6}\s+/.test(claimText)) continue;

        // Skip if claim is primarily a URL or link reference
        if (/^\[S\d{3}\]\(https?:\/\//.test(claimText)) continue;

        // Clean up claim text - remove leading bullets and markdown formatting
        claimText = claimText.replace(/^[-*+]\s*/, '').replace(/^\*\*[^*]+\*\*:?\s*/, '').trim();

        // Find line number for this claim
        const lineInfo = section.content.find(c =>
          c.text.includes(claimText.substring(0, 50))
        );

        // Split compound claims
        const subClaims = splitCompoundClaims(claimText);

        for (const subClaim of subClaims) {
          const types = classifyClaim(subClaim);
          const numbers = extractNumbers(subClaim);
          const entities = extractEntities(subClaim);

          claims.push({
            claim_id: `C${String(claimCounter++).padStart(3, '0')}`,
            claim_text: subClaim,
            claim_hash: hashClaim(subClaim),
            claim_types: types,
            location: {
              section: section.title,
              line: lineInfo?.lineNumber || null
            },
            sources_cited: [citation.sourceId],
            extracted_numbers: numbers,
            extracted_entities: entities,
            original_context: citation.context
          });
        }
      }
    }
  }

  // Merge claims with multiple citations for same text
  const mergedClaims = [];
  const seen = new Map();

  for (const claim of claims) {
    const key = claim.claim_text;
    if (seen.has(key)) {
      const existing = seen.get(key);
      existing.sources_cited = [...new Set([...existing.sources_cited, ...claim.sources_cited])];
    } else {
      seen.set(key, claim);
      mergedClaims.push(claim);
    }
  }

  return mergedClaims;
}

/**
 * Analyze claims and produce summary statistics
 */
function analyzeClaims(claims) {
  const summary = {
    total_claims: claims.length,
    by_type: {},
    by_section: {},
    quantitative_claims: 0,
    multi_source_claims: 0,
    unique_sources: new Set()
  };

  for (const claim of claims) {
    // Count by type
    for (const type of claim.claim_types) {
      summary.by_type[type] = (summary.by_type[type] || 0) + 1;
    }

    // Count by section
    const section = claim.location.section;
    summary.by_section[section] = (summary.by_section[section] || 0) + 1;

    // Count quantitative
    if (claim.claim_types.includes('quantitative')) {
      summary.quantitative_claims++;
    }

    // Count multi-source
    if (claim.sources_cited.length > 1) {
      summary.multi_source_claims++;
    }

    // Track unique sources
    claim.sources_cited.forEach(s => summary.unique_sources.add(s));
  }

  summary.unique_sources = summary.unique_sources.size;

  return summary;
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const articlePath = args.find(a => !a.startsWith('--'));
  const jsonOutput = args.includes('--json');

  if (!articlePath) {
    console.error('Usage: node scripts/extract-claims.js <article_path> [--json]');
    process.exit(2);
  }

  if (!fs.existsSync(articlePath)) {
    console.error(`File not found: ${articlePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(articlePath, 'utf8');
  const claims = extractClaims(content);
  const summary = analyzeClaims(claims);

  if (jsonOutput) {
    console.log(JSON.stringify({ claims, summary }, null, 2));
  } else {
    console.log('='.repeat(70));
    console.log('CLAIM EXTRACTION RESULTS');
    console.log('='.repeat(70));
    console.log(`File: ${articlePath}`);
    console.log('');
    console.log(`Total claims extracted: ${summary.total_claims}`);
    console.log(`Unique sources cited: ${summary.unique_sources}`);
    console.log(`Quantitative claims: ${summary.quantitative_claims}`);
    console.log(`Multi-source claims: ${summary.multi_source_claims}`);
    console.log('');
    console.log('Claims by type:');
    for (const [type, count] of Object.entries(summary.by_type)) {
      console.log(`  ${type}: ${count}`);
    }
    console.log('');
    console.log('Claims by section:');
    for (const [section, count] of Object.entries(summary.by_section)) {
      console.log(`  ${section}: ${count}`);
    }
    console.log('');
    console.log('-'.repeat(70));
    console.log('Sample claims:');
    console.log('-'.repeat(70));
    for (const claim of claims.slice(0, 5)) {
      console.log(`\n[${claim.claim_id}] (${claim.claim_types.join(', ')})`);
      console.log(`  Text: "${claim.claim_text.substring(0, 80)}${claim.claim_text.length > 80 ? '...' : ''}"`);
      console.log(`  Sources: ${claim.sources_cited.join(', ')}`);
      if (claim.extracted_numbers.length > 0) {
        console.log(`  Numbers: ${claim.extracted_numbers.map(n => n.raw).join(', ')}`);
      }
    }
    if (claims.length > 5) {
      console.log(`\n... and ${claims.length - 5} more claims`);
    }
    console.log('='.repeat(70));
  }
}

// Export for programmatic use
module.exports = {
  extractClaims,
  analyzeClaims,
  classifyClaim,
  extractNumbers,
  extractEntities,
  extractCitationPatterns,
  splitCompoundClaims,
  hashClaim
};

if (require.main === module) {
  main();
}
