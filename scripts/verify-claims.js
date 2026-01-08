#!/usr/bin/env node
/**
 * verify-claims.js - Verify claims against captured evidence
 *
 * Anti-hallucination check: ensures every claim attributed to a source
 * actually appears in the captured evidence for that source.
 *
 * Usage:
 *   node verify-claims.js <case_dir>              # Verify all claims
 *   node verify-claims.js <case_dir> --summary    # Only check summary.md
 *   node verify-claims.js <case_dir> --json       # Output JSON report
 *
 * Process:
 *   1. Extract claims with source IDs from case files
 *   2. Load captured evidence for each source
 *   3. Use AI to verify claims exist in evidence
 *   4. Report discrepancies
 *
 * Requires: GEMINI_API_KEY environment variable
 */

const fs = require('fs');
const path = require('path');

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.5-flash';

// Files to scan for claims
const CLAIM_FILES = [
  'summary.md',
  'fact-check.md',
  'timeline.md',
  'people.md',
  'positions.md',
  'statements.md'
];

// Parse command line arguments
const args = process.argv.slice(2);
const caseDir = args.find(a => !a.startsWith('--'));
const summaryOnly = args.includes('--summary');
const jsonOutput = args.includes('--json');

if (!caseDir) {
  console.error('Usage: node verify-claims.js <case_dir> [--summary] [--json]');
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable required');
  console.error('Set it in your shell or .env file');
  process.exit(1);
}

/**
 * Extract claims with source IDs from a markdown file
 * Looks for patterns like: "claim text [S001]" or "[S001] claim text"
 */
function extractClaims(filePath, fileName) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const claims = [];

  // Pattern to match source citations
  // Matches: text [S001] or [S001] text or [S001][S002] (multiple sources)
  const sourcePattern = /\[S(\d{3})\]/g;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const matches = [...line.matchAll(sourcePattern)];

    if (matches.length > 0) {
      // Extract source IDs
      const sourceIds = matches.map(m => `S${m[1]}`);

      // Get the claim text (line without the source citations)
      let claimText = line
        .replace(/\[S\d{3}\]/g, '')  // Remove source citations
        .replace(/^\s*[-*•]\s*/, '') // Remove list markers
        .replace(/^\s*\d+\.\s*/, '') // Remove numbered list markers
        .replace(/^#+\s*/, '')       // Remove heading markers
        .replace(/\*\*/g, '')        // Remove bold markers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
        .trim();

      // Skip very short claims or headers
      if (claimText.length > 20) {
        // Get context (surrounding lines)
        const contextStart = Math.max(0, lineNum - 2);
        const contextEnd = Math.min(lines.length - 1, lineNum + 2);
        const context = lines.slice(contextStart, contextEnd + 1).join('\n');

        for (const sourceId of sourceIds) {
          claims.push({
            sourceId,
            claim: claimText,
            context,
            file: fileName,
            line: lineNum + 1
          });
        }
      }
    }
  }

  return claims;
}

/**
 * Load evidence content for a source
 */
function loadEvidence(caseDir, sourceId) {
  const webDir = path.join(caseDir, 'evidence', 'web', sourceId);
  const docsDir = path.join(caseDir, 'evidence', 'documents');

  let content = null;
  let source = null;
  let url = null;

  // Try HTML first (best for text extraction)
  const htmlPath = path.join(webDir, 'capture.html');
  if (fs.existsSync(htmlPath)) {
    content = fs.readFileSync(htmlPath, 'utf-8');
    // Strip HTML tags for cleaner text
    content = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    source = 'html';

    // Try to get URL from metadata
    const metaPath = path.join(webDir, 'metadata.json');
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        url = meta.url;
      } catch (e) {}
    }
  }

  // Try markdown from Firecrawl
  if (!content) {
    const mdPath = path.join(webDir, 'capture.md');
    if (fs.existsSync(mdPath)) {
      content = fs.readFileSync(mdPath, 'utf-8');
      source = 'markdown';

      const metaPath = path.join(webDir, 'metadata.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          url = meta.url;
        } catch (e) {}
      }
    }
  }

  // Try document folder
  if (!content && fs.existsSync(docsDir)) {
    const files = fs.readdirSync(docsDir).filter(f => f.startsWith(sourceId + '_'));
    const textFile = files.find(f => f.endsWith('.txt'));
    if (textFile) {
      content = fs.readFileSync(path.join(docsDir, textFile), 'utf-8');
      source = 'document-text';
    }
  }

  // Truncate very long content
  if (content && content.length > 50000) {
    content = content.substring(0, 50000) + '\n\n[Content truncated at 50000 chars]';
  }

  return { content, source, url };
}

/**
 * Use Gemini to verify a claim exists in evidence
 */
async function verifyClaimWithAI(claim, evidence, url) {
  const prompt = `You are a fact-checking assistant. Your job is to verify whether a specific claim is supported by the provided source evidence.

CLAIM TO VERIFY:
"${claim.claim}"

SOURCE EVIDENCE (from ${url || 'captured document'}):
---
${evidence.substring(0, 30000)}
---

Analyze whether this claim is supported by the evidence above.

Respond in this exact JSON format:
{
  "verdict": "VERIFIED" | "NOT_FOUND" | "PARTIAL" | "CONTRADICTED",
  "confidence": 0.0-1.0,
  "explanation": "Brief explanation of your verdict",
  "relevant_quote": "Exact quote from evidence that supports or contradicts the claim, if found"
}

Verdicts:
- VERIFIED: The claim is clearly supported by the evidence
- NOT_FOUND: The claim is not present in the evidence (possible hallucination)
- PARTIAL: Some aspects of the claim are supported, others are not
- CONTRADICTED: The evidence contradicts the claim

Be strict. If the evidence doesn't explicitly support the claim, mark it NOT_FOUND.`;

  try {
    const response = await fetch(`${API_BASE}/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response text from API');
    }

    return JSON.parse(text);

  } catch (error) {
    return {
      verdict: 'ERROR',
      confidence: 0,
      explanation: `Verification failed: ${error.message}`,
      relevant_quote: null
    };
  }
}

/**
 * Add delay between API calls
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main verification process
 */
async function main() {
  const startTime = Date.now();

  if (!jsonOutput) {
    console.log('='.repeat(70));
    console.log(`${BOLD}Claim-to-Evidence Verification Report${NC}`);
    console.log('='.repeat(70));
    console.log(`Case: ${caseDir}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('');
  }

  // Step 1: Extract all claims
  const allClaims = [];
  const filesToScan = summaryOnly ? ['summary.md'] : CLAIM_FILES;

  for (const fileName of filesToScan) {
    const filePath = path.join(caseDir, fileName);
    const claims = extractClaims(filePath, fileName);
    allClaims.push(...claims);

    if (!jsonOutput && claims.length > 0) {
      console.log(`Found ${claims.length} claims in ${fileName}`);
    }
  }

  if (allClaims.length === 0) {
    if (!jsonOutput) {
      console.log(`${YELLOW}No claims with source citations found${NC}`);
    }
    process.exit(0);
  }

  // Group claims by source ID
  const claimsBySource = {};
  for (const claim of allClaims) {
    if (!claimsBySource[claim.sourceId]) {
      claimsBySource[claim.sourceId] = [];
    }
    claimsBySource[claim.sourceId].push(claim);
  }

  const sourceIds = Object.keys(claimsBySource).sort();

  if (!jsonOutput) {
    console.log('');
    console.log(`Total: ${allClaims.length} claims across ${sourceIds.length} sources`);
    console.log('-'.repeat(70));
    console.log('');
  }

  // Step 2: Verify each claim
  const results = {
    verified: [],
    not_found: [],
    partial: [],
    contradicted: [],
    no_evidence: [],
    errors: []
  };

  let processedCount = 0;

  for (const sourceId of sourceIds) {
    const claims = claimsBySource[sourceId];
    const evidence = loadEvidence(caseDir, sourceId);

    if (!evidence.content) {
      // No evidence for this source
      for (const claim of claims) {
        results.no_evidence.push({
          ...claim,
          verdict: 'NO_EVIDENCE',
          explanation: 'No captured evidence found for this source'
        });
      }

      if (!jsonOutput) {
        console.log(`${RED}[${sourceId}]${NC} No evidence - ${claims.length} claims unverifiable`);
      }
      continue;
    }

    if (!jsonOutput) {
      console.log(`${BLUE}[${sourceId}]${NC} Verifying ${claims.length} claims (${evidence.source})...`);
    }

    for (const claim of claims) {
      const verification = await verifyClaimWithAI(claim, evidence.content, evidence.url);

      const result = {
        ...claim,
        ...verification,
        evidenceSource: evidence.source,
        url: evidence.url
      };

      switch (verification.verdict) {
        case 'VERIFIED':
          results.verified.push(result);
          break;
        case 'NOT_FOUND':
          results.not_found.push(result);
          break;
        case 'PARTIAL':
          results.partial.push(result);
          break;
        case 'CONTRADICTED':
          results.contradicted.push(result);
          break;
        case 'ERROR':
          results.errors.push(result);
          break;
        default:
          results.errors.push(result);
      }

      processedCount++;

      if (!jsonOutput) {
        const icon = {
          VERIFIED: `${GREEN}✓${NC}`,
          NOT_FOUND: `${RED}✗${NC}`,
          PARTIAL: `${YELLOW}~${NC}`,
          CONTRADICTED: `${RED}!!${NC}`,
          ERROR: `${RED}?${NC}`
        }[verification.verdict] || '?';

        // Truncate claim for display
        const shortClaim = claim.claim.length > 60
          ? claim.claim.substring(0, 60) + '...'
          : claim.claim;

        console.log(`  ${icon} ${shortClaim}`);
      }

      // Rate limiting - 30 requests per minute for Gemini
      await delay(2100);
    }
  }

  // Step 3: Generate report
  const stats = {
    total: allClaims.length,
    verified: results.verified.length,
    not_found: results.not_found.length,
    partial: results.partial.length,
    contradicted: results.contradicted.length,
    no_evidence: results.no_evidence.length,
    errors: results.errors.length
  };

  const verificationRate = ((stats.verified + stats.partial) / (stats.total - stats.no_evidence - stats.errors) * 100) || 0;
  const problemCount = stats.not_found + stats.contradicted;

  if (jsonOutput) {
    // JSON output
    console.log(JSON.stringify({
      case_dir: caseDir,
      timestamp: new Date().toISOString(),
      duration_seconds: Math.round((Date.now() - startTime) / 1000),
      stats,
      verification_rate: Math.round(verificationRate * 10) / 10,
      problems: [...results.not_found, ...results.contradicted],
      partial: results.partial,
      no_evidence: results.no_evidence,
      errors: results.errors
    }, null, 2));
  } else {
    // Human-readable output
    console.log('');
    console.log('='.repeat(70));
    console.log(`${BOLD}Summary${NC}`);
    console.log('='.repeat(70));
    console.log(`Total claims checked:    ${stats.total}`);
    console.log(`${GREEN}Verified:                ${stats.verified}${NC}`);
    console.log(`${YELLOW}Partial:                 ${stats.partial}${NC}`);
    console.log(`${RED}Not found (potential hallucination): ${stats.not_found}${NC}`);
    console.log(`${RED}Contradicted:            ${stats.contradicted}${NC}`);
    console.log(`${YELLOW}No evidence available:   ${stats.no_evidence}${NC}`);
    console.log(`Errors:                  ${stats.errors}`);
    console.log('');
    console.log(`Verification rate: ${verificationRate.toFixed(1)}%`);
    console.log(`Duration: ${Math.round((Date.now() - startTime) / 1000)}s`);

    if (problemCount > 0) {
      console.log('');
      console.log('='.repeat(70));
      console.log(`${BOLD}${RED}PROBLEMS REQUIRING ATTENTION${NC}`);
      console.log('='.repeat(70));

      if (results.not_found.length > 0) {
        console.log('');
        console.log(`${RED}${BOLD}Claims NOT FOUND in evidence (possible hallucinations):${NC}`);
        for (const item of results.not_found) {
          console.log('');
          console.log(`  ${RED}Source:${NC} [${item.sourceId}] in ${item.file}:${item.line}`);
          console.log(`  ${RED}Claim:${NC} "${item.claim}"`);
          console.log(`  ${RED}Issue:${NC} ${item.explanation}`);
        }
      }

      if (results.contradicted.length > 0) {
        console.log('');
        console.log(`${RED}${BOLD}Claims CONTRADICTED by evidence:${NC}`);
        for (const item of results.contradicted) {
          console.log('');
          console.log(`  ${RED}Source:${NC} [${item.sourceId}] in ${item.file}:${item.line}`);
          console.log(`  ${RED}Claim:${NC} "${item.claim}"`);
          console.log(`  ${RED}Issue:${NC} ${item.explanation}`);
          if (item.relevant_quote) {
            console.log(`  ${RED}Evidence says:${NC} "${item.relevant_quote}"`);
          }
        }
      }
    }

    if (results.partial.length > 0) {
      console.log('');
      console.log('-'.repeat(70));
      console.log(`${YELLOW}${BOLD}PARTIAL matches (review recommended):${NC}`);
      for (const item of results.partial) {
        console.log('');
        console.log(`  ${YELLOW}Source:${NC} [${item.sourceId}] in ${item.file}:${item.line}`);
        console.log(`  ${YELLOW}Claim:${NC} "${item.claim}"`);
        console.log(`  ${YELLOW}Issue:${NC} ${item.explanation}`);
      }
    }

    if (results.no_evidence.length > 0) {
      console.log('');
      console.log('-'.repeat(70));
      console.log(`${YELLOW}${BOLD}Missing evidence (capture needed):${NC}`);
      const missingBySource = {};
      for (const item of results.no_evidence) {
        if (!missingBySource[item.sourceId]) {
          missingBySource[item.sourceId] = 0;
        }
        missingBySource[item.sourceId]++;
      }
      for (const [sourceId, count] of Object.entries(missingBySource)) {
        console.log(`  [${sourceId}]: ${count} claims, no evidence captured`);
      }
    }

    // Verdict
    console.log('');
    console.log('='.repeat(70));
    if (problemCount === 0 && stats.no_evidence === 0) {
      console.log(`${GREEN}${BOLD}VERDICT: PASS${NC} - All claims verified against evidence`);
    } else if (problemCount > 0) {
      console.log(`${RED}${BOLD}VERDICT: FAIL${NC} - ${problemCount} claims could not be verified`);
      console.log('');
      console.log('Action required: Review flagged claims and either:');
      console.log('  1. Find evidence that supports the claim and capture it');
      console.log('  2. Remove or revise the claim in the case files');
      console.log('  3. Mark the claim as uncertain/unverified');
    } else {
      console.log(`${YELLOW}${BOLD}VERDICT: INCOMPLETE${NC} - ${stats.no_evidence} claims lack evidence`);
      console.log('');
      console.log('Action required: Capture evidence for sources:');
      const missingSources = [...new Set(results.no_evidence.map(r => r.sourceId))];
      console.log(`  ${missingSources.join(', ')}`);
    }
    console.log('='.repeat(70));
  }

  process.exit(problemCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
