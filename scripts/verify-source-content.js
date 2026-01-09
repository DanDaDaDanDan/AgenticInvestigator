#!/usr/bin/env node
/**
 * verify-source-content.js - Verify claims exist in captured evidence content
 *
 * Layer 4 Content Verification (Anti-Hallucination):
 *   Extracts text from captured evidence (HTML, PDF) and verifies that
 *   cited claims actually appear in the evidence content.
 *
 * Usage:
 *   node verify-source-content.js <case_dir>
 *   node verify-source-content.js <case_dir> --json     # JSON output
 *   node verify-source-content.js <case_dir> --verbose  # Show all matches
 *
 * Process:
 *   1. Find all [SXXX] citations in case files
 *   2. Extract text from evidence files (HTML, PDF, markdown)
 *   3. Search for claim key phrases in extracted text
 *   4. Report verified/unverified claims with locations
 *
 * Note: This is a LOCAL verification (no AI calls).
 * For AI-based verification, use verify-claims.js
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

// Parse arguments
const args = process.argv.slice(2);
const caseDir = args.find(a => !a.startsWith('--'));
const jsonOutput = args.includes('--json');
const verbose = args.includes('--verbose');

if (!caseDir) {
  console.error('Usage: node verify-source-content.js <case_dir> [--json] [--verbose]');
  process.exit(1);
}

// Files to scan for claims
const CLAIM_FILES = [
  'summary.md',
  'fact-check.md',
  'timeline.md',
  'people.md',
  'positions.md',
  'statements.md',
  'organizations.md',
  'theories.md'
];

/**
 * Extract text content from HTML file
 */
function extractTextFromHtml(htmlPath) {
  if (!fs.existsSync(htmlPath)) return null;

  const html = fs.readFileSync(htmlPath, 'utf-8');

  // Remove script and style tags
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    // Remove all HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Extract text from markdown file (Firecrawl captures)
 */
function extractTextFromMarkdown(mdPath) {
  if (!fs.existsSync(mdPath)) return null;

  const md = fs.readFileSync(mdPath, 'utf-8');

  // Remove markdown formatting but keep text
  let text = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // Remove images
    .replace(/\[[^\]]*\]\([^)]*\)/g, (match) => {
      // Keep link text
      const textMatch = match.match(/\[([^\]]*)\]/);
      return textMatch ? textMatch[1] : '';
    })
    .replace(/^#{1,6}\s+/gm, '') // Remove heading markers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/^\s*[-*+]\s+/gm, '') // List markers
    .replace(/^\s*\d+\.\s+/gm, '') // Numbered list markers
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Try to extract text from a PDF using pdf-parse if available
 * Falls back to checking if text file exists
 */
async function extractTextFromPdf(pdfPath) {
  const textPath = pdfPath.replace('.pdf', '.txt');

  // Check for pre-extracted text file
  if (fs.existsSync(textPath)) {
    return fs.readFileSync(textPath, 'utf-8');
  }

  // Try pdf-parse if available
  try {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);

    // Save extracted text for future use
    if (data.text) {
      const outputPath = path.join(path.dirname(pdfPath), 'extracted_text.txt');
      fs.writeFileSync(outputPath, data.text);
    }

    return data.text;
  } catch (e) {
    // pdf-parse not installed or failed
    return null;
  }
}

/**
 * Load all evidence text for a source
 */
async function loadEvidenceText(caseDir, sourceId) {
  const webDir = path.join(caseDir, 'evidence', 'web', sourceId);
  const docsDir = path.join(caseDir, 'evidence', 'documents');

  let texts = [];
  let source = null;
  let url = null;

  // Load metadata for URL
  const metaPath = path.join(webDir, 'metadata.json');
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      url = meta.url;
    } catch (e) {}
  }

  // Try markdown (Firecrawl - best quality)
  const mdPath = path.join(webDir, 'capture.md');
  const mdText = extractTextFromMarkdown(mdPath);
  if (mdText) {
    texts.push({ text: mdText, source: 'markdown' });
  }

  // Try HTML
  const htmlPath = path.join(webDir, 'capture.html');
  const htmlText = extractTextFromHtml(htmlPath);
  if (htmlText) {
    texts.push({ text: htmlText, source: 'html' });
  }

  // Try PDF
  const pdfPath = path.join(webDir, 'capture.pdf');
  if (fs.existsSync(pdfPath)) {
    const pdfText = await extractTextFromPdf(pdfPath);
    if (pdfText) {
      texts.push({ text: pdfText, source: 'pdf' });
    }
  }

  // Check documents folder
  if (fs.existsSync(docsDir)) {
    const files = fs.readdirSync(docsDir).filter(f => f.startsWith(sourceId + '_'));
    for (const file of files) {
      const filePath = path.join(docsDir, file);
      if (file.endsWith('.txt')) {
        const text = fs.readFileSync(filePath, 'utf-8');
        texts.push({ text, source: `document-${file}` });
      } else if (file.endsWith('.pdf')) {
        const pdfText = await extractTextFromPdf(filePath);
        if (pdfText) {
          texts.push({ text: pdfText, source: `document-${file}` });
        }
      }
    }
  }

  // Combine all texts
  const combinedText = texts.map(t => t.text).join(' ');
  const sources = texts.map(t => t.source);

  return {
    text: combinedText,
    sources,
    url,
    hasEvidence: texts.length > 0
  };
}

/**
 * Extract claims with source IDs from a file
 */
function extractClaimsFromFile(filePath, fileName) {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const claims = [];

  // Pattern to match [SXXX] citations
  const sourcePattern = /\[S(\d{3})\]/g;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const matches = [...line.matchAll(sourcePattern)];

    if (matches.length > 0) {
      // Get source IDs
      const sourceIds = [...new Set(matches.map(m => `S${m[1]}`))];

      // Get claim text
      let claimText = line
        .replace(/\[S\d{3}\]/g, '')
        .replace(/^\s*[-*]\s*/, '')
        .replace(/^\s*\d+\.\s*/, '')
        .replace(/^#+\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .trim();

      if (claimText.length > 15) {
        // Extract key phrases for searching
        const keyPhrases = extractKeyPhrases(claimText);

        for (const sourceId of sourceIds) {
          claims.push({
            sourceId,
            claim: claimText,
            keyPhrases,
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
 * Extract key searchable phrases from a claim
 * Focus on: names, numbers, dates, specific terms
 */
function extractKeyPhrases(claim) {
  const phrases = [];

  // Extract quoted text
  const quotes = claim.match(/"([^"]+)"/g) || [];
  for (const q of quotes) {
    phrases.push(q.replace(/"/g, ''));
  }

  // Extract numbers (including currency, percentages)
  const numbers = claim.match(/\$?[\d,]+\.?\d*%?/g) || [];
  for (const n of numbers) {
    if (n.length > 1) phrases.push(n);
  }

  // Extract dates
  const dates = claim.match(/\d{4}|\w+ \d{1,2},? \d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}/g) || [];
  phrases.push(...dates);

  // Extract capitalized terms (names, proper nouns)
  const proper = claim.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  for (const p of proper) {
    if (p.length > 2 && !['The', 'This', 'That', 'They', 'What', 'When', 'Where', 'Which', 'While'].includes(p)) {
      phrases.push(p);
    }
  }

  // Key substantive words (4+ letters, not common)
  const stopWords = new Set(['that', 'this', 'with', 'from', 'were', 'have', 'been', 'will', 'would', 'could', 'should', 'about', 'their', 'there', 'which', 'while', 'being', 'these', 'those', 'other', 'after', 'before', 'through', 'during', 'between', 'because', 'against', 'according']);
  const words = claim.toLowerCase().split(/\W+/);
  for (const w of words) {
    if (w.length >= 5 && !stopWords.has(w)) {
      phrases.push(w);
    }
  }

  return [...new Set(phrases)];
}

/**
 * Search for phrases in text
 * Returns matches found
 */
function searchInText(text, phrases) {
  const textLower = text.toLowerCase();
  const matches = [];

  for (const phrase of phrases) {
    const phraseLower = phrase.toLowerCase();
    const index = textLower.indexOf(phraseLower);
    if (index !== -1) {
      // Get surrounding context
      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + phrase.length + 50);
      const context = text.substring(start, end);

      matches.push({
        phrase,
        index,
        context: '...' + context + '...'
      });
    }
  }

  return matches;
}

/**
 * Main verification function
 */
async function main() {
  const startTime = Date.now();

  if (!jsonOutput) {
    console.log('='.repeat(70));
    console.log(`${BOLD}Source Content Verification Report${NC}`);
    console.log('='.repeat(70));
    console.log(`Case: ${caseDir}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('');
  }

  // Extract all claims from case files
  const allClaims = [];
  for (const fileName of CLAIM_FILES) {
    const filePath = path.join(caseDir, fileName);
    const claims = extractClaimsFromFile(filePath, fileName);
    allClaims.push(...claims);

    if (!jsonOutput && claims.length > 0) {
      console.log(`Found ${claims.length} claims in ${fileName}`);
    }
  }

  // Also check findings folder
  const findingsDir = path.join(caseDir, 'findings');
  if (fs.existsSync(findingsDir)) {
    const findingsFiles = fs.readdirSync(findingsDir).filter(f => f.endsWith('.md'));
    for (const fileName of findingsFiles) {
      const filePath = path.join(findingsDir, fileName);
      const claims = extractClaimsFromFile(filePath, `findings/${fileName}`);
      allClaims.push(...claims);

      if (!jsonOutput && claims.length > 0) {
        console.log(`Found ${claims.length} claims in findings/${fileName}`);
      }
    }
  }

  if (allClaims.length === 0) {
    if (!jsonOutput) {
      console.log(`${YELLOW}No claims with source citations found${NC}`);
    }
    process.exit(0);
  }

  // Group by source
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

  // Verify each source
  const results = {
    verified: [],
    partial: [],
    not_found: [],
    no_evidence: []
  };

  for (const sourceId of sourceIds) {
    const claims = claimsBySource[sourceId];
    const evidence = await loadEvidenceText(caseDir, sourceId);

    if (!evidence.hasEvidence) {
      for (const claim of claims) {
        results.no_evidence.push({
          ...claim,
          reason: 'No evidence files found'
        });
      }

      if (!jsonOutput) {
        console.log(`${RED}[${sourceId}]${NC} No evidence - ${claims.length} claims unverifiable`);
      }
      continue;
    }

    if (!jsonOutput) {
      console.log(`${BLUE}[${sourceId}]${NC} Checking ${claims.length} claims (sources: ${evidence.sources.join(', ')})`);
    }

    for (const claim of claims) {
      const matches = searchInText(evidence.text, claim.keyPhrases);
      const matchRatio = matches.length / Math.max(claim.keyPhrases.length, 1);

      const result = {
        ...claim,
        matchCount: matches.length,
        totalPhrases: claim.keyPhrases.length,
        matchRatio,
        matches: matches.slice(0, 3), // Keep top 3 matches
        evidenceSources: evidence.sources,
        url: evidence.url
      };

      if (matchRatio >= 0.5) {
        results.verified.push(result);
        if (!jsonOutput) {
          const shortClaim = claim.claim.length > 55 ? claim.claim.substring(0, 55) + '...' : claim.claim;
          console.log(`  ${GREEN}✓${NC} ${shortClaim}`);
          if (verbose && matches.length > 0) {
            console.log(`    ${BLUE}Found: ${matches.map(m => m.phrase).join(', ')}${NC}`);
          }
        }
      } else if (matchRatio >= 0.2) {
        results.partial.push(result);
        if (!jsonOutput) {
          const shortClaim = claim.claim.length > 55 ? claim.claim.substring(0, 55) + '...' : claim.claim;
          console.log(`  ${YELLOW}~${NC} ${shortClaim} (${matches.length}/${claim.keyPhrases.length} matches)`);
        }
      } else {
        results.not_found.push(result);
        if (!jsonOutput) {
          const shortClaim = claim.claim.length > 55 ? claim.claim.substring(0, 55) + '...' : claim.claim;
          console.log(`  ${RED}✗${NC} ${shortClaim} (${matches.length}/${claim.keyPhrases.length} matches)`);
        }
      }
    }
  }

  // Summary
  const stats = {
    total: allClaims.length,
    verified: results.verified.length,
    partial: results.partial.length,
    not_found: results.not_found.length,
    no_evidence: results.no_evidence.length
  };

  const verificationRate = ((stats.verified + stats.partial) / (stats.total - stats.no_evidence) * 100) || 0;

  if (jsonOutput) {
    console.log(JSON.stringify({
      case_dir: caseDir,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      stats,
      verification_rate: Math.round(verificationRate * 10) / 10,
      verified: results.verified,
      partial: results.partial,
      not_found: results.not_found,
      no_evidence: results.no_evidence
    }, null, 2));
  } else {
    console.log('');
    console.log('='.repeat(70));
    console.log(`${BOLD}Summary${NC}`);
    console.log('='.repeat(70));
    console.log(`Total claims:      ${stats.total}`);
    console.log(`${GREEN}Verified:          ${stats.verified}${NC}`);
    console.log(`${YELLOW}Partial:           ${stats.partial}${NC}`);
    console.log(`${RED}Not found:         ${stats.not_found}${NC}`);
    console.log(`${YELLOW}No evidence:       ${stats.no_evidence}${NC}`);
    console.log('');
    console.log(`Content verification rate: ${verificationRate.toFixed(1)}%`);
    console.log(`Duration: ${Date.now() - startTime}ms`);

    if (results.not_found.length > 0) {
      console.log('');
      console.log('-'.repeat(70));
      console.log(`${RED}${BOLD}Claims NOT FOUND in evidence:${NC}`);
      for (const item of results.not_found.slice(0, 10)) {
        console.log('');
        console.log(`  ${RED}[${item.sourceId}]${NC} in ${item.file}:${item.line}`);
        console.log(`  Claim: "${item.claim.substring(0, 80)}${item.claim.length > 80 ? '...' : ''}"`);
        console.log(`  Key phrases: ${item.keyPhrases.slice(0, 5).join(', ')}`);
      }
      if (results.not_found.length > 10) {
        console.log(`\n  ... and ${results.not_found.length - 10} more`);
      }
    }

    // Verdict
    console.log('');
    console.log('='.repeat(70));
    const problemCount = results.not_found.length;
    if (problemCount === 0 && stats.no_evidence === 0) {
      console.log(`${GREEN}${BOLD}VERDICT: PASS${NC} - All claims found in evidence content`);
    } else if (problemCount > 0) {
      console.log(`${RED}${BOLD}VERDICT: FAIL${NC} - ${problemCount} claims not found in evidence`);
      console.log('');
      console.log('Action required: Review flagged claims. Either:');
      console.log('  1. Verify the claim exists in evidence (may need better capture)');
      console.log('  2. Use verify-claims.js for AI-based verification');
      console.log('  3. Remove or revise the unsupported claim');
    } else {
      console.log(`${YELLOW}${BOLD}VERDICT: INCOMPLETE${NC} - ${stats.no_evidence} claims lack evidence`);
      console.log('');
      console.log('Action required: Capture evidence for missing sources');
    }
    console.log('='.repeat(70));
  }

  // Exit with error if problems found
  process.exit(results.not_found.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
