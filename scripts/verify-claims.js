#!/usr/bin/env node
/**
 * verify-claims.js - Verify claims against captured evidence
 *
 * Anti-hallucination check: ensures every claim attributed to a source
 * actually appears in the captured evidence for that source.
 *
 * Usage:
 *   node scripts/verify-claims.js <case_dir>              # Verify all claims
 *   node scripts/verify-claims.js <case_dir> --summary    # Only check summary.md
 *   node scripts/verify-claims.js <case_dir> --json       # Output JSON report
 *
 * Process:
 *   1. Extract claims with source IDs from case files
 *   2. Load captured evidence for each source
 *   3. Use AI to verify claims exist in evidence
 *   4. Report discrepancies
 *
 * Requires: GEMINI_API_KEY environment variable
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Load .env when present (keeps CLI usage consistent across scripts)
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {}

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

// Configuration
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

function parseCliArgs(argv) {
  const args = argv.slice(2);
  return {
    caseDir: args.find(a => !a.startsWith('--')),
    summaryOnly: args.includes('--summary'),
    jsonOutput: args.includes('--json')
  };
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
  const sourcePattern = /\[S(\d{3,4})\]/g;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const matches = [...line.matchAll(sourcePattern)];

    if (matches.length > 0) {
      // Extract source IDs
      const sourceIds = matches.map(m => `S${m[1]}`);

      // Get the claim text (line without the source citations)
      let claimText = line
        .replace(/\[S\d{3,4}\]/g, '')  // Remove source citations
        .replace(/^\s*[-*\u2022]\s*/, '') // Remove list markers
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

function extractClaimsFromRegistry(caseDir) {
  const claimsDir = path.join(caseDir, 'claims');
  if (!fs.existsSync(claimsDir)) return [];

  const files = fs.readdirSync(claimsDir).filter(f => /^C\d{4,}\.json$/i.test(f));
  const claims = [];

  for (const fileName of files) {
    const filePath = path.join(claimsDir, fileName);
    try {
      const record = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const claimId = typeof record.id === 'string' ? record.id : path.basename(fileName, '.json');
      const claimText = typeof record.claim === 'string' ? record.claim.trim() : '';
      const sources = Array.isArray(record.supporting_sources) ? record.supporting_sources.map(String) : [];

      if (!claimText || sources.length === 0) continue;

      const evidenceNotes = record.evidence_notes && typeof record.evidence_notes === 'object'
        ? record.evidence_notes
        : null;

      for (const sourceIdRaw of Array.from(new Set(sources))) {
        const sourceId = String(sourceIdRaw).toUpperCase();
        if (!/^S\d{3,4}$/.test(sourceId)) continue;

        claims.push({
          sourceId,
          claim_id: claimId,
          claim: claimText,
          context: evidenceNotes && typeof evidenceNotes[sourceId] === 'string'
            ? evidenceNotes[sourceId]
            : null,
          file: `claims/${fileName}`,
          line: null
        });
      }
    } catch (_) {
      // Skip malformed claim records
    }
  }

  return claims;
}

/**
 * Read file with size limit to prevent OOM on large files.
 * Reads only the first maxBytes instead of loading entire file.
 */
function readLimited(filePath, maxBytes) {
  const stats = fs.statSync(filePath);
  if (stats.size <= maxBytes) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  // Read only first maxBytes to prevent OOM
  const buffer = Buffer.alloc(maxBytes);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, buffer, 0, maxBytes, 0);
  } finally {
    fs.closeSync(fd);
  }
  return buffer.toString('utf-8') + '\n\n[Content truncated at ' + maxBytes + ' bytes]';
}

// Maximum content size for verification (50KB is plenty for claim checking)
const MAX_EVIDENCE_BYTES = 50000;

/**
 * Load evidence content for a source.
 * PREFERS Firecrawl markdown (clean, small) over HTML (large, needs processing).
 * Uses size-limited reads to prevent OOM on large evidence files.
 */
function loadEvidence(caseDir, sourceId) {
  const webDir = path.join(caseDir, 'evidence', 'web', sourceId);
  const docsDir = path.join(caseDir, 'evidence', 'documents');

  let content = null;
  let source = null;
  let url = null;

  // Helper to load URL from metadata
  function loadUrl() {
    const metaPath = path.join(webDir, 'metadata.json');
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        return meta.url;
      } catch (e) {}
    }
    return null;
  }

  // PREFER markdown from Firecrawl (already clean text, no processing needed)
  const mdPath = path.join(webDir, 'capture.md');
  if (fs.existsSync(mdPath)) {
    content = readLimited(mdPath, MAX_EVIDENCE_BYTES);
    source = 'markdown';
    url = loadUrl();
  }

  // Fall back to HTML only if no markdown (with size-limited read)
  if (!content) {
    const htmlPath = path.join(webDir, 'capture.html');
    if (fs.existsSync(htmlPath)) {
      // Read limited amount BEFORE processing to prevent OOM
      // Use 2x limit since HTML has tag overhead that gets stripped
      const rawHtml = readLimited(htmlPath, MAX_EVIDENCE_BYTES * 2);

      // Strip HTML tags (safe now - operating on limited content)
      content = rawHtml
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Final size limit after stripping tags
      if (content.length > MAX_EVIDENCE_BYTES) {
        content = content.substring(0, MAX_EVIDENCE_BYTES) + '\n\n[Content truncated]';
      }

      source = 'html';
      url = loadUrl();
    }
  }

  // Try document folder
  if (!content && fs.existsSync(docsDir)) {
    const files = fs.readdirSync(docsDir).filter(f => f.startsWith(sourceId + '_'));
    const textFile = files.find(f => f.endsWith('.txt'));
    if (textFile) {
      content = readLimited(path.join(docsDir, textFile), MAX_EVIDENCE_BYTES);
      source = 'document-text';
    }
  }

  return { content, source, url };
}

/**
 * Use Gemini to verify a claim exists in evidence
 */
async function verifyClaimWithAI(claim, evidence, url, apiKey) {
  const prompt = `You are a fact-checking assistant. A claim is attributed to THIS specific source. Verify if THIS SOURCE actually says what the claim states.

CLAIM TO VERIFY:
"${claim.claim}"

SOURCE EVIDENCE (from ${url || 'captured document'}):
---
${evidence.substring(0, 30000)}
---

KEY PRINCIPLE: The claim is attributed to THIS source. The source must actually contain the information claimed.

WHAT COUNTS AS SUPPORT:
- Paraphrasing: Same meaning, different words
  ✓ Source: "lost $1.2 million" → Claim: "lost $1.2M" (format difference)
  ✓ Source: "five million dollar loss" → Claim: "$5M loss" (same meaning)
  ✓ Source: "CEO John Smith resigned" → Claim: "Smith stepped down" (paraphrase)

- Summarizing what the source says:
  ✓ Source: "lost $5M, laid off 200, closed 3 offices" → Claim: "major cutbacks" (summarizes stated facts)

WHAT DOES NOT COUNT AS SUPPORT:
- Inferences beyond what source states:
  ✗ Source: "CEO resigned" → Claim: "leadership crisis" (source doesn't say "crisis")
  ✗ Source: "lost money" → Claim: "lost $5M" (source doesn't specify amount)

- Adding context not in source:
  ✗ Source says X, claim adds "widely known" context Y (Y must be in source to cite source for Y)

- Different specifics:
  ✗ Source: "January 15" → Claim: "January 20" (different date)
  ✗ Source: "$5M" → Claim: "$50M" (different amount)

Respond in JSON:
{
  "verdict": "VERIFIED" | "SYNTHESIS" | "PARTIAL" | "NOT_FOUND" | "CONTRADICTED",
  "confidence": 0.0-1.0,
  "explanation": "Brief explanation",
  "relevant_quote": "Exact quote from source, if found"
}

Verdicts:
- VERIFIED: Source directly states or closely paraphrases the claim
- SYNTHESIS: Source contains all the facts that the claim summarizes (claim doesn't add new info)
- PARTIAL: Source supports some specifics but not others (e.g., right event, wrong date)
- NOT_FOUND: Source does not contain the claimed information
- CONTRADICTED: Source states the opposite

Be rigorous. If the source doesn't actually say it, the verdict is NOT_FOUND.`;

  try {
    const response = await fetch(`${API_BASE}/models/${MODEL}:generateContent?key=${apiKey}`, {
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
async function run(caseDir, options = {}) {
  const startTime = Date.now();
  const summaryOnly = options.summaryOnly === true;
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const delayMs = typeof options.delay_ms === 'number' ? options.delay_ms : 2100;

  // Suppress console output; callers decide how to render.
  const jsonOutput = true;

  if (!caseDir || typeof caseDir !== 'string') {
    return {
      case_dir: caseDir || null,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      passed: false,
      reason: 'Missing case directory argument',
      stats: { total: 0, verified: 0, not_found: 0, partial: 0, contradicted: 0, no_evidence: 0, errors: 0 },
      verification_rate: 0,
      gaps: [{
        type: 'STATE_INCONSISTENT',
        object: { field: 'case_dir' },
        message: 'Missing case directory argument',
        suggested_actions: ['provide_case_dir']
      }]
    };
  }

  if (!apiKey) {
    return {
      case_dir: caseDir,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      passed: false,
      reason: 'GEMINI_API_KEY not set - cannot run AI verification',
      stats: { total: 0, verified: 0, not_found: 0, partial: 0, contradicted: 0, no_evidence: 0, errors: 0 },
      verification_rate: 0,
      gaps: [{
        type: 'STATE_INCONSISTENT',
        object: { env: 'GEMINI_API_KEY' },
        message: 'GEMINI_API_KEY not set - cannot run AI verification',
        suggested_actions: ['set_gemini_api_key']
      }]
    };
  }

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
  if (summaryOnly) {
    const filePath = path.join(caseDir, 'summary.md');
    allClaims.push(...extractClaims(filePath, 'summary.md'));
  } else {
    const registryClaims = extractClaimsFromRegistry(caseDir);
    if (registryClaims.length > 0) {
      allClaims.push(...registryClaims);
    } else {
      for (const fileName of CLAIM_FILES) {
        const filePath = path.join(caseDir, fileName);
        const claims = extractClaims(filePath, fileName);
        allClaims.push(...claims);
      }

      const findingsDir = path.join(caseDir, 'findings');
      if (fs.existsSync(findingsDir)) {
        const findingsFiles = fs.readdirSync(findingsDir).filter(f => f.endsWith('.md'));
        for (const fileName of findingsFiles) {
          const filePath = path.join(findingsDir, fileName);
          allClaims.push(...extractClaims(filePath, `findings/${fileName}`));
        }
      }
    }
  }

  if (allClaims.length === 0) {
    return {
      case_dir: caseDir,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      passed: true,
      reason: 'No claims found to verify',
      stats: { total: 0, verified: 0, not_found: 0, partial: 0, contradicted: 0, no_evidence: 0, errors: 0 },
      verification_rate: 100,
      problems: [],
      partial: [],
      no_evidence: [],
      errors: [],
      gaps: []
    };
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
    synthesis: [],  // Valid journalistic inference/synthesis
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
      const verification = await verifyClaimWithAI(claim, evidence.content, evidence.url, apiKey);

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
        case 'SYNTHESIS':
          results.synthesis.push(result);
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
          VERIFIED: `${GREEN}OK${NC}`,
          SYNTHESIS: `${GREEN}SYN${NC}`,
          NOT_FOUND: `${RED}MISS${NC}`,
          PARTIAL: `${YELLOW}WARN${NC}`,
          CONTRADICTED: `${RED}!!${NC}`,
          ERROR: `${RED}ERR${NC}`
        }[verification.verdict] || 'ERR';

        // Truncate claim for display
        const shortClaim = claim.claim.length > 60
          ? claim.claim.substring(0, 60) + '...'
          : claim.claim;

        console.log(`  ${icon} ${shortClaim}`);
      }

      // Rate limiting - 30 requests per minute for Gemini
      await delay(delayMs);
    }
  }

  // Step 3: Generate report
  // First, aggregate by claim_id to determine if each unique claim is supported
  const claimAggregates = {};
  const allResults = [
    ...results.verified.map(r => ({ ...r, status: 'verified' })),
    ...results.synthesis.map(r => ({ ...r, status: 'synthesis' })),
    ...results.not_found.map(r => ({ ...r, status: 'not_found' })),
    ...results.partial.map(r => ({ ...r, status: 'partial' })),
    ...results.contradicted.map(r => ({ ...r, status: 'contradicted' })),
    ...results.no_evidence.map(r => ({ ...r, status: 'no_evidence' })),
    ...results.errors.map(r => ({ ...r, status: 'error' }))
  ];

  for (const result of allResults) {
    const id = result.claim_id || result.claim;
    if (!claimAggregates[id]) {
      claimAggregates[id] = { claim_id: id, sources: [], bestStatus: null };
    }
    claimAggregates[id].sources.push({ sourceId: result.sourceId, status: result.status, result });
  }

  // Determine best status for each claim
  // Priority: verified/synthesis (both PASS) > partial > not_found > contradicted
  const aggregatedResults = {
    verified: [],
    synthesis: [],
    not_found: [],
    partial: [],
    contradicted: [],
    no_evidence: [],
    errors: []
  };

  for (const [claimId, agg] of Object.entries(claimAggregates)) {
    const statuses = agg.sources.map(s => s.status);
    const hasVerified = statuses.includes('verified');
    const hasSynthesis = statuses.includes('synthesis');
    const hasPartial = statuses.includes('partial');
    const hasContradicted = statuses.includes('contradicted');
    const hasNotFound = statuses.includes('not_found');
    const hasNoEvidence = statuses.includes('no_evidence');
    const hasError = statuses.includes('error');

    // A claim is OK if any source verifies, synthesizes, or partially verifies it
    if (hasVerified) {
      aggregatedResults.verified.push(agg.sources.find(s => s.status === 'verified').result);
    } else if (hasSynthesis) {
      // SYNTHESIS counts as passing - valid journalistic inference
      aggregatedResults.synthesis.push(agg.sources.find(s => s.status === 'synthesis').result);
    } else if (hasPartial) {
      aggregatedResults.partial.push(agg.sources.find(s => s.status === 'partial').result);
    } else if (hasContradicted) {
      // Only flag as contradicted if no source supports the claim
      aggregatedResults.contradicted.push(agg.sources.find(s => s.status === 'contradicted').result);
    } else if (hasNotFound && !hasNoEvidence && !hasError) {
      // All sources checked, none found it
      aggregatedResults.not_found.push(agg.sources.find(s => s.status === 'not_found').result);
    } else if (hasNoEvidence) {
      aggregatedResults.no_evidence.push(agg.sources.find(s => s.status === 'no_evidence').result);
    } else if (hasError) {
      aggregatedResults.errors.push(agg.sources.find(s => s.status === 'error').result);
    }
  }

  // Use aggregated results for stats (unique claims, not claim-source pairs)
  const stats = {
    total: Object.keys(claimAggregates).length,
    verified: aggregatedResults.verified.length,
    synthesis: aggregatedResults.synthesis.length,
    not_found: aggregatedResults.not_found.length,
    partial: aggregatedResults.partial.length,
    contradicted: aggregatedResults.contradicted.length,
    no_evidence: aggregatedResults.no_evidence.length,
    errors: aggregatedResults.errors.length,
    // Keep raw pair counts for reference
    raw_pairs: allClaims.length
  };

  // verified + synthesis + partial all count as supported
  const supportedCount = stats.verified + stats.synthesis + stats.partial;
  const checkableCount = stats.total - stats.no_evidence - stats.errors;
  const verificationRate = (supportedCount / checkableCount * 100) || 0;
  const problemCount = stats.not_found + stats.contradicted;

  if (jsonOutput) {
    // Use aggregated results for problems/gaps (only claims with no supporting source)
    const problems = [...aggregatedResults.not_found, ...aggregatedResults.contradicted];
    const gaps = [];

    for (const item of aggregatedResults.not_found) {
      gaps.push({
        type: 'CONTENT_MISMATCH',
        object: {
          source_id: item.sourceId,
          ...(item.claim_id ? { claim_id: item.claim_id } : {}),
          file: item.file,
          line: item.line
        },
        message: `${item.claim_id ? `Claim ${item.claim_id}` : 'Claim'} not found in any of its attributed sources (AI verification)`,
        suggested_actions: ['recapture_source', 'revise_claim', 'remove_or_recite']
      });
    }

    for (const item of aggregatedResults.contradicted) {
      gaps.push({
        type: 'CONTRADICTED_CLAIM',
        object: {
          source_id: item.sourceId,
          ...(item.claim_id ? { claim_id: item.claim_id } : {}),
          file: item.file,
          line: item.line
        },
        message: `${item.claim_id ? `Claim ${item.claim_id}` : 'Claim'} contradicted by evidence (AI verification)`,
        suggested_actions: ['revise_claim', 'add_context', 'remove_or_recite']
      });
    }

    for (const item of aggregatedResults.no_evidence) {
      gaps.push({
        type: 'MISSING_EVIDENCE',
        object: { source_id: item.sourceId },
        message: `${item.sourceId} has no captured evidence - AI cannot verify claims`,
        suggested_actions: ['capture_source', 'recapture_source']
      });
    }

    for (const item of aggregatedResults.errors) {
      gaps.push({
        type: 'STATE_INCONSISTENT',
        object: { source_id: item.sourceId },
        message: `AI verification error for ${item.sourceId}: ${item.explanation || 'unknown error'}`,
        suggested_actions: ['retry_verification', 'check_api_key']
      });
    }

    const passed = problemCount === 0 && stats.no_evidence === 0 && stats.errors === 0;
    return {
      case_dir: caseDir,
      timestamp: new Date().toISOString(),
      duration_seconds: Math.round((Date.now() - startTime) / 1000),
      duration_ms: Date.now() - startTime,
      passed,
      stats,
      verification_rate: Math.round(verificationRate * 10) / 10,
      problems,
      synthesis: aggregatedResults.synthesis,
      partial: aggregatedResults.partial,
      no_evidence: aggregatedResults.no_evidence,
      errors: aggregatedResults.errors,
      gaps
    };
  } else {
    // Human-readable output
    console.log('');
    console.log('='.repeat(70));
    console.log(`${BOLD}Summary${NC}`);
    console.log('='.repeat(70));
    console.log(`Total claims checked:    ${stats.total}`);
    console.log(`${GREEN}Verified:                ${stats.verified}${NC}`);
    console.log(`${GREEN}Synthesis (valid inference): ${stats.synthesis}${NC}`);
    console.log(`${YELLOW}Partial:                 ${stats.partial}${NC}`);
    console.log(`${RED}Not found (no basis):    ${stats.not_found}${NC}`);
    console.log(`${RED}Contradicted:            ${stats.contradicted}${NC}`);
    console.log(`${YELLOW}No evidence available:   ${stats.no_evidence}${NC}`);
    console.log(`Errors:                  ${stats.errors}`);
    console.log('');
    console.log(`Supported (verified+synthesis+partial): ${supportedCount}/${checkableCount}`);
    console.log(`Verification rate: ${verificationRate.toFixed(1)}%`);
    console.log(`Duration: ${Math.round((Date.now() - startTime) / 1000)}s`);

    if (problemCount > 0) {
      console.log('');
      console.log('='.repeat(70));
      console.log(`${BOLD}${RED}PROBLEMS REQUIRING ATTENTION${NC}`);
      console.log('='.repeat(70));

      if (aggregatedResults.not_found.length > 0) {
        console.log('');
        console.log(`${RED}${BOLD}Claims NOT FOUND in any source (possible hallucinations):${NC}`);
        for (const item of aggregatedResults.not_found) {
          console.log('');
          console.log(`  ${RED}Source:${NC} [${item.sourceId}] in ${item.file}:${item.line}`);
          console.log(`  ${RED}Claim:${NC} "${item.claim}"`);
          console.log(`  ${RED}Issue:${NC} ${item.explanation}`);
        }
      }

      if (aggregatedResults.contradicted.length > 0) {
        console.log('');
        console.log(`${RED}${BOLD}Claims CONTRADICTED by evidence:${NC}`);
        for (const item of aggregatedResults.contradicted) {
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

    if (aggregatedResults.partial.length > 0) {
      console.log('');
      console.log('-'.repeat(70));
      console.log(`${YELLOW}${BOLD}PARTIAL matches (review recommended):${NC}`);
      for (const item of aggregatedResults.partial) {
        console.log('');
        console.log(`  ${YELLOW}Source:${NC} [${item.sourceId}] in ${item.file}:${item.line}`);
        console.log(`  ${YELLOW}Claim:${NC} "${item.claim}"`);
        console.log(`  ${YELLOW}Issue:${NC} ${item.explanation}`);
      }
    }

    if (aggregatedResults.no_evidence.length > 0) {
      console.log('');
      console.log('-'.repeat(70));
      console.log(`${YELLOW}${BOLD}Missing evidence (capture needed):${NC}`);
      const missingBySource = {};
      for (const item of aggregatedResults.no_evidence) {
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

function printHuman(output) {
  console.log('='.repeat(70));
  console.log(`${BOLD}Claim-to-Evidence Verification${NC}`);
  console.log('='.repeat(70));
  console.log(`Case: ${output.case_dir}`);
  console.log('');

  if (output.reason && !output.passed) {
    console.log(`${RED}FAIL${NC}: ${output.reason}`);
    return;
  }

  console.log(`Total claims checked:    ${output.stats.total}`);
  console.log(`${GREEN}Verified:                ${output.stats.verified}${NC}`);
  console.log(`${GREEN}Synthesis:               ${output.stats.synthesis || 0}${NC}`);
  console.log(`${YELLOW}Partial:                 ${output.stats.partial}${NC}`);
  console.log(`${RED}Not found:               ${output.stats.not_found}${NC}`);
  console.log(`${RED}Contradicted:            ${output.stats.contradicted}${NC}`);
  console.log(`${YELLOW}No evidence available:   ${output.stats.no_evidence}${NC}`);
  console.log(`Errors:                  ${output.stats.errors}`);
  console.log('');
  console.log(output.passed ? `${GREEN}PASS${NC}` : `${RED}FAIL${NC}`);
}

async function cli() {
  const parsed = parseCliArgs(process.argv);
  const caseDir = parsed.caseDir;
  const jsonOutput = parsed.jsonOutput || parsed.summaryOnly;

  if (!caseDir) {
    console.error('Usage: node scripts/verify-claims.js <case_dir> [--summary] [--json]');
    process.exit(1);
  }

  const output = await run(caseDir, { summaryOnly: parsed.summaryOnly });

  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    printHuman(output);
  }

  process.exit(output.passed ? 0 : 1);
}

module.exports = { run };

if (require.main === module) {
  cli().catch(error => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}
