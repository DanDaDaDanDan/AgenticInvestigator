#!/usr/bin/env node
/**
 * cross-check.js - Verify claims against authoritative primary sources
 *
 * This script addresses a critical gap in verification: ensuring that
 * captured source content actually matches authoritative primary sources.
 *
 * The Problem It Solves:
 * - Article claims "ICE scored 58/100" citing a captured source
 * - Captured source also says "58/100" (so claim-source verification passes)
 * - But the ACTUAL authoritative source shows "62.7/100"
 * - Without cross-checking, this error propagates undetected
 *
 * Usage:
 *   node scripts/claims/cross-check.js <case-dir> [options]
 *
 * Options:
 *   --detect-only     Just identify claims needing cross-check (no fetching)
 *   --json            Output as JSON
 *   --fix             Generate fix suggestions for mismatches
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Registry of authoritative sources for different data types
 *
 * Each entry maps a pattern/domain to its authoritative source info
 */
const AUTHORITATIVE_SOURCES = {
  // Federal workforce rankings
  'best_places_to_work': {
    patterns: [
      /best places to work/i,
      /partnership for public service/i,
      /federal employee viewpoint survey|FEVS/i,
      /employee engagement.*score/i,
      /agency.*rank.*out of/i
    ],
    domains: ['bestplacestowork.org'],
    primarySource: {
      baseUrl: 'https://bestplacestowork.org/rankings/detail/',
      // Agency codes for DHS subcomponents
      agencyCodes: {
        'ICE': 'HS06',
        'Immigration and Customs Enforcement': 'HS06',
        'CBP': 'HS03',
        'Customs and Border Protection': 'HS03',
        'TSA': 'HS10',
        'Transportation Security Administration': 'HS10',
        'FEMA': 'HS18',
        'DHS': 'HS00',
        'Department of Homeland Security': 'HS00',
        'NASA': 'NN00',
        'FBI': 'DJ02',
        'DEA': 'DJ03'
      }
    },
    extractors: {
      // Regex patterns to extract claimed values
      score: /scored?\s*(\d+\.?\d*)\s*(?:out of\s*)?(?:\/\s*)?100/i,
      rank: /ranking\s*#?(\d+)\s*(?:out of|of)\s*(\d+)/i,
      // These patterns handle markdown bold (**text:**) format
      leadership_score: /leadership[^0-9]*?(\d+\.?\d*)\/100/i,
      pay_score: /pay[^0-9]*?(\d+\.?\d*)\/100/i,
      recognition_score: /recognition[^0-9]*?(\d+\.?\d*)\/100/i
    },
    verifyFn: 'verifyBestPlacesToWork'
  },

  // Court cases
  'court_cases': {
    patterns: [
      /v\.\s+[A-Z]/,  // "X v. Y" case names
      /\d+:\d+-cv-\d+/,  // Case numbers like 0:26-cv-00190
      /filed.*lawsuit/i,
      /court\s+(?:ruled|held|found)/i
    ],
    domains: ['courtlistener.com', 'pacer.gov', 'justia.com'],
    primarySource: {
      courtListener: 'https://www.courtlistener.com/api/rest/v3/',
      pacer: 'https://pacer.uscourts.gov/'
    },
    verifyFn: 'verifyCourtCase'
  },

  // Executive orders
  'executive_orders': {
    patterns: [
      /executive order\s*(?:#?\s*)?(\d+)/i,
      /EO\s*(\d+)/i,
      /presidential\s+(?:action|order|memorandum)/i
    ],
    domains: ['federalregister.gov', 'whitehouse.gov'],
    primarySource: {
      federalRegister: 'https://www.federalregister.gov/api/v1/',
      whitehouse: 'https://www.whitehouse.gov/presidential-actions/'
    },
    verifyFn: 'verifyExecutiveOrder'
  },

  // Legislation
  'legislation': {
    patterns: [
      /\d+\s*U\.?S\.?C\.?\s*§?\s*\d+/i,  // USC citations
      /Public Law\s+\d+-\d+/i,
      /H\.?R\.?\s*\d+/i,
      /S\.?\s*\d+/i
    ],
    domains: ['congress.gov', 'law.cornell.edu'],
    primarySource: {
      congress: 'https://api.congress.gov/v3/',
      cornell: 'https://www.law.cornell.edu/uscode/'
    },
    verifyFn: 'verifyLegislation'
  },

  // Government statistics
  'government_stats': {
    patterns: [
      /(?:FBI|DOJ|DHS|ICE|CBP)\s+(?:data|statistics|report)/i,
      /(?:arrest|deportation|removal)\s+(?:statistics|numbers|data)/i,
      /according to\s+(?:federal|government)\s+data/i
    ],
    domains: ['ice.gov', 'cbp.gov', 'dhs.gov', 'fbi.gov', 'bjs.gov'],
    verifyFn: 'verifyGovernmentStats'
  }
};

/**
 * Detect claims in article that need authoritative cross-checking
 */
function detectCrossCheckClaims(articlePath, sourcesJson) {
  const article = fs.readFileSync(articlePath, 'utf-8');
  const lines = article.split('\n');
  const claims = [];

  // Parse each line for claims with citations
  const citationPattern = /\[S(\d+)\]\([^)]+\)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Find all citations on this line
    let match;
    while ((match = citationPattern.exec(line)) !== null) {
      const sourceId = `S${match[1].padStart(3, '0')}`;
      const citationUrl = match[0].match(/\(([^)]+)\)/)?.[1];

      // Check if line contains patterns needing cross-check
      for (const [sourceType, config] of Object.entries(AUTHORITATIVE_SOURCES)) {
        for (const pattern of config.patterns) {
          if (pattern.test(line)) {
            // Get context: current line plus next 10 lines for multi-line claims
            const contextLines = lines.slice(i, Math.min(i + 11, lines.length)).join('\n');

            // Extract the specific claim with context
            const claim = extractClaimDetails(contextLines, sourceType, config);

            claims.push({
              line: lineNum,
              text: line.trim().substring(0, 200),
              sourceId,
              citationUrl,
              sourceType,
              claim,
              authoritativeSource: config.primarySource,
              verifyFn: config.verifyFn
            });
            break;
          }
        }
      }
    }
    citationPattern.lastIndex = 0;
  }

  return claims;
}

/**
 * Extract specific claim details based on source type
 * @param {string} context - Single line or multi-line context
 * @param {string} sourceType - Type of authoritative source
 * @param {object} config - Source configuration with extractors
 */
function extractClaimDetails(context, sourceType, config) {
  // Keep only first line for raw (full context can be very long)
  const firstLine = context.split('\n')[0];
  const details = { raw: firstLine };

  if (config.extractors) {
    for (const [key, pattern] of Object.entries(config.extractors)) {
      // Search entire context for patterns
      const match = context.match(pattern);
      if (match) {
        details[key] = match[1];
        if (match[2]) details[`${key}_total`] = match[2];
      }
    }
  }

  // Extract agency name for best_places_to_work
  if (sourceType === 'best_places_to_work') {
    const agencyPattern = /\b(ICE|CBP|TSA|FEMA|DHS|NASA|FBI|DEA|Immigration and Customs Enforcement|Customs and Border Protection)\b/i;
    const agencyMatch = context.match(agencyPattern);
    if (agencyMatch) {
      details.agency = agencyMatch[1].toUpperCase();
    }
  }

  return details;
}

/**
 * Generate MCP tool calls for cross-checking claims
 *
 * Returns structured prompts that can be executed by the verification agent
 */
function generateCrossCheckPrompts(claims) {
  const prompts = [];

  for (const claim of claims) {
    if (claim.sourceType === 'best_places_to_work' && claim.claim.agency) {
      const agencyCode = AUTHORITATIVE_SOURCES.best_places_to_work.primarySource.agencyCodes[claim.claim.agency];

      if (agencyCode) {
        const c = claim.claim;
        prompts.push({
          claimIndex: claims.indexOf(claim),
          claim: claim,
          tool: 'mcp__mcp-osint__osint_get',
          params: {
            target: `https://bestplacestowork.org/rankings/detail/?c=${agencyCode}`,
            question: `What is the 2024 engagement score and ranking for this agency? Also list all category scores (leadership, pay, recognition, etc.) with exact numbers.`
          },
          extractionPrompt: `Compare these values:
CLAIMED in article (line ${claim.line}):
- Overall Score: ${c.score || 'not specified'}/100
- Ranking: #${c.rank || '?'} out of ${c.rank_total || '?'} agencies
- Leadership Score: ${c.leadership_score || 'not specified'}/100
- Pay Satisfaction: ${c.pay_score || 'not specified'}/100
- Recognition: ${c.recognition_score || 'not specified'}/100
- Agency: ${c.agency || 'not specified'}

VERIFY: Does the authoritative source match ALL these claimed values exactly?
For each value, check if the authoritative source confirms it.
Return JSON: {"match": true/false, "claimed": {...}, "actual": {...}, "discrepancies": [...]}`
        });
      }
    }

    // Add prompts for other source types...
    if (claim.sourceType === 'executive_orders') {
      const eoMatch = claim.text.match(/executive order\s*(?:#?\s*)?(\d+)/i) ||
                      claim.text.match(/EO\s*(\d+)/i);
      if (eoMatch) {
        prompts.push({
          claimIndex: claims.indexOf(claim),
          claim: claim,
          tool: 'mcp__mcp-osint__osint_get',
          params: {
            target: `https://www.federalregister.gov/documents/search?conditions[presidential_document_type][]=executive_order&conditions[executive_order_number]=${eoMatch[1]}`,
            question: `Find the exact title, date, and key provisions of this executive order.`
          }
        });
      }
    }
  }

  return prompts;
}

/**
 * Format cross-check results report
 */
function formatReport(claims, results, options = {}) {
  if (options.json) {
    return JSON.stringify({ claims, results }, null, 2);
  }

  let report = `
${'='.repeat(70)}
AUTHORITATIVE SOURCE CROSS-CHECK REPORT
${'='.repeat(70)}

Claims requiring cross-check: ${claims.length}
`;

  if (claims.length === 0) {
    report += '\nNo claims detected that require authoritative source verification.\n';
    return report;
  }

  // Group by source type
  const byType = {};
  for (const claim of claims) {
    if (!byType[claim.sourceType]) byType[claim.sourceType] = [];
    byType[claim.sourceType].push(claim);
  }

  for (const [type, typeClaims] of Object.entries(byType)) {
    report += `\n--- ${type.toUpperCase().replace(/_/g, ' ')} (${typeClaims.length} claims) ---\n`;

    for (const claim of typeClaims) {
      report += `
  Line ${claim.line}: [${claim.sourceId}]
    Claim: "${claim.text.substring(0, 100)}..."
    Detected values: ${JSON.stringify(claim.claim, null, 2).split('\n').join('\n    ')}
    Primary source: ${claim.authoritativeSource ? JSON.stringify(claim.authoritativeSource).substring(0, 80) : 'N/A'}...
`;
    }
  }

  if (results && results.length > 0) {
    report += `\n${'='.repeat(70)}\nCROSS-CHECK RESULTS\n${'='.repeat(70)}\n`;

    const mismatches = results.filter(r => !r.match);
    const matches = results.filter(r => r.match);

    if (mismatches.length > 0) {
      report += `\n[!] MISMATCHES FOUND: ${mismatches.length}\n`;
      for (const m of mismatches) {
        report += `
  Line ${m.claim.line}: MISMATCH
    Claimed: ${JSON.stringify(m.claimed)}
    Actual:  ${JSON.stringify(m.actual)}
    Discrepancies: ${m.discrepancies.join(', ')}
`;
      }
    }

    if (matches.length > 0) {
      report += `\n[✓] Verified matches: ${matches.length}\n`;
    }
  }

  return report;
}

/**
 * Main CLI
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 1 || args.includes('--help') || args.includes('-h')) {
    console.log(`
cross-check.js - Verify claims against authoritative primary sources

Usage:
  node scripts/claims/cross-check.js <case-dir> [options]

Options:
  --detect-only   Just identify claims needing cross-check
  --json          Output as JSON
  --output <file> Save results to file
  --prompts       Generate MCP tool prompts for verification

Example:
  node scripts/claims/cross-check.js cases/my-case --detect-only
  node scripts/claims/cross-check.js cases/my-case --prompts > cross-check-prompts.json
`);
    process.exit(args.length < 1 ? 1 : 0);
  }

  const caseDir = args[0];
  const articlePath = path.join(caseDir, 'articles', 'full.md');
  const sourcesPath = path.join(caseDir, 'sources.json');

  if (!fs.existsSync(articlePath)) {
    console.error(`Article not found: ${articlePath}`);
    process.exit(1);
  }

  const options = {
    detectOnly: args.includes('--detect-only'),
    json: args.includes('--json'),
    prompts: args.includes('--prompts')
  };

  // Load sources
  let sources = { sources: [] };
  if (fs.existsSync(sourcesPath)) {
    sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
  }

  // Detect claims needing cross-check
  const claims = detectCrossCheckClaims(articlePath, sources);

  if (options.prompts) {
    const prompts = generateCrossCheckPrompts(claims);
    console.log(JSON.stringify(prompts, null, 2));
    return;
  }

  if (options.detectOnly || options.json) {
    const report = formatReport(claims, null, options);
    console.log(report);
    return;
  }

  // Full report with detection
  console.log(formatReport(claims, null, options));

  if (claims.length > 0) {
    console.log(`\nTo generate verification prompts: --prompts`);
    console.log(`To run verification, pipe prompts to verification agent.`);
  }
}

// Exports for use as module
module.exports = {
  AUTHORITATIVE_SOURCES,
  detectCrossCheckClaims,
  generateCrossCheckPrompts,
  formatReport
};

if (require.main === module) {
  main();
}
