#!/usr/bin/env node
/**
 * semantic-verify.js - Verify citations semantically support their claims
 *
 * Addresses Root Cause 3: Gate 5c was documented but not implemented.
 * This script uses LLM to verify that cited sources actually contain
 * the facts they're cited for, preventing citation laundering.
 *
 * Usage:
 *   node scripts/semantic-verify.js <case_dir>
 *   node scripts/semantic-verify.js <case_dir> --file summary.md
 *   node scripts/semantic-verify.js <case_dir> --file articles/full.md
 *   node scripts/semantic-verify.js <case_dir> --pre-article (for pre-writing validation)
 *   node scripts/semantic-verify.js <case_dir> --json
 *
 * Exit codes:
 *   0 - All citations semantically verified
 *   1 - Verification failures found
 *   2 - Usage error
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const caseDir = args.find(a => !a.startsWith('--'));
const jsonOutput = args.includes('--json');
const preArticle = args.includes('--pre-article');
const fileArgIdx = args.indexOf('--file');
const targetFile = fileArgIdx !== -1 ? args[fileArgIdx + 1] : null;

if (!caseDir) {
    console.error('Usage: node scripts/semantic-verify.js <case_dir> [--file <path>] [--pre-article] [--json]');
    process.exit(2);
}

// Extract citation-claim pairs from text
// Looks for patterns like: "some claim text [S001](url)" or "claim [S001]"
function extractCitationClaims(text) {
    const results = [];

    // Pattern: sentence or clause ending with [S###] or [S###](url)
    // We capture up to 300 chars before the citation to get context
    const citationPattern = /([^.!?\n]{10,300})\s*\[S(\d{3})\](?:\([^)]+\))?/g;

    let match;
    while ((match = citationPattern.exec(text)) !== null) {
        const claimText = match[1].trim();
        const sourceId = `S${match[2]}`;

        // Skip if claim is just a header or list marker
        if (claimText.match(/^#{1,6}\s/) || claimText.match(/^[-*]\s*$/)) {
            continue;
        }

        results.push({
            claim: claimText,
            sourceId: sourceId,
            fullMatch: match[0],
            position: match.index
        });
    }

    return results;
}

// Extract key statistics/numbers from a claim
function extractStatistics(claim) {
    const stats = [];

    // Percentages
    const percentMatch = claim.match(/(\d+(?:\.\d+)?)\s*%/g);
    if (percentMatch) stats.push(...percentMatch);

    // Dollar amounts
    const dollarMatch = claim.match(/\$\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:million|billion|M|B))?/gi);
    if (dollarMatch) stats.push(...dollarMatch);

    // Plain numbers with scale
    const scaleMatch = claim.match(/\d+(?:,\d{3})*(?:\.\d+)?\s*(?:million|billion)/gi);
    if (scaleMatch) stats.push(...scaleMatch);

    // Counts
    const countMatch = claim.match(/\b\d{1,3}(?:,\d{3})+\b/g);
    if (countMatch) stats.push(...countMatch);

    return [...new Set(stats)];
}

// Load source content for verification
function loadSourceContent(sourceId, caseDir) {
    const contentPath = path.join(caseDir, 'evidence', sourceId, 'content.md');
    const metadataPath = path.join(caseDir, 'evidence', sourceId, 'metadata.json');

    const result = {
        exists: false,
        content: null,
        url: null,
        title: null
    };

    if (fs.existsSync(contentPath)) {
        result.exists = true;
        result.content = fs.readFileSync(contentPath, 'utf8');
    }

    if (fs.existsSync(metadataPath)) {
        try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            result.url = metadata.url;
            result.title = metadata.title;
        } catch (e) {
            // Ignore parse errors
        }
    }

    return result;
}

// Quick heuristic check before LLM verification
function quickVerify(claim, sourceContent) {
    const result = {
        statisticsFound: true,
        keyTermsFound: true,
        details: []
    };

    // Check if statistics in claim appear in source
    const stats = extractStatistics(claim);
    for (const stat of stats) {
        // Normalize the statistic for comparison
        const normalizedStat = stat.replace(/,/g, '').toLowerCase();
        const normalizedContent = sourceContent.toLowerCase();

        if (!normalizedContent.includes(normalizedStat)) {
            result.statisticsFound = false;
            result.details.push(`Statistic "${stat}" not found in source`);
        }
    }

    // Check for key terms (nouns > 5 chars)
    const keyTerms = claim.match(/\b[A-Z][a-z]{4,}\b/g) || [];
    const uniqueTerms = [...new Set(keyTerms)];
    const termsFound = uniqueTerms.filter(term =>
        sourceContent.toLowerCase().includes(term.toLowerCase())
    );

    if (uniqueTerms.length > 0 && termsFound.length < uniqueTerms.length / 2) {
        result.keyTermsFound = false;
        const missingTerms = uniqueTerms.filter(t => !termsFound.includes(t));
        result.details.push(`Key terms not found: ${missingTerms.join(', ')}`);
    }

    return result;
}

// Generate verification prompt for LLM
function generateVerificationPrompt(claim, sourceContent, sourceInfo) {
    const truncatedContent = sourceContent.length > 8000
        ? sourceContent.substring(0, 8000) + '\n\n[...truncated...]'
        : sourceContent;

    return `You are verifying whether a source actually supports a specific claim.

## The Claim Being Made
"${claim}"

## Source Information
- URL: ${sourceInfo.url || 'Unknown'}
- Title: ${sourceInfo.title || 'Unknown'}

## Source Content
${truncatedContent}

## Your Task
Determine if this source ACTUALLY SUPPORTS the specific claim above.

Answer in this exact JSON format:
{
  "supported": true|false,
  "confidence": "HIGH"|"MEDIUM"|"LOW",
  "reason": "Brief explanation of why the source does or doesn't support the claim",
  "quote": "Direct quote from source that supports/contradicts (if applicable, max 200 chars)",
  "issues": ["list of specific problems if not supported"]
}

Be strict:
- The source must contain the actual fact, not just related information
- Statistics must match exactly (52% is not 72%)
- Attribution matters ("Company X says" vs stating as fact)
- If the source discusses the topic but doesn't actually support the specific claim, return supported: false`;
}

// Perform verification on all citation-claim pairs
async function verifyCitations(caseDir, targetFilePath) {
    const results = {
        file: targetFilePath,
        totalCitations: 0,
        verified: 0,
        failed: 0,
        skipped: 0,
        needsLlmVerification: [],
        failures: [],
        warnings: []
    };

    // Read target file
    const fullPath = path.join(caseDir, targetFilePath);
    if (!fs.existsSync(fullPath)) {
        results.error = `File not found: ${fullPath}`;
        return results;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const citationClaims = extractCitationClaims(content);
    results.totalCitations = citationClaims.length;

    // Process each citation
    for (const cc of citationClaims) {
        const source = loadSourceContent(cc.sourceId, caseDir);

        if (!source.exists) {
            results.failures.push({
                sourceId: cc.sourceId,
                claim: cc.claim.substring(0, 100) + (cc.claim.length > 100 ? '...' : ''),
                issue: 'SOURCE_MISSING',
                detail: 'Evidence content.md does not exist'
            });
            results.failed++;
            continue;
        }

        // Quick heuristic check
        const quickResult = quickVerify(cc.claim, source.content);

        if (!quickResult.statisticsFound) {
            // Statistics mismatch is a definite failure
            results.failures.push({
                sourceId: cc.sourceId,
                claim: cc.claim.substring(0, 100) + (cc.claim.length > 100 ? '...' : ''),
                issue: 'STATISTIC_MISMATCH',
                detail: quickResult.details.join('; ')
            });
            results.failed++;
        } else if (!quickResult.keyTermsFound) {
            // Key terms missing - needs LLM verification
            results.needsLlmVerification.push({
                sourceId: cc.sourceId,
                claim: cc.claim,
                sourceInfo: source,
                reason: quickResult.details.join('; '),
                prompt: generateVerificationPrompt(cc.claim, source.content, source)
            });
            results.warnings.push({
                sourceId: cc.sourceId,
                claim: cc.claim.substring(0, 100) + (cc.claim.length > 100 ? '...' : ''),
                issue: 'NEEDS_LLM_VERIFICATION',
                detail: quickResult.details.join('; ')
            });
        } else {
            // Passed quick check
            results.verified++;
        }
    }

    // Mark remaining as needing verification if any warnings
    results.skipped = results.needsLlmVerification.length;

    return results;
}

// Main execution
async function main() {
    const filesToCheck = preArticle
        ? ['summary.md']
        : (targetFile ? [targetFile] : ['summary.md', 'articles/full.md']);

    const allResults = [];
    let hasFailures = false;

    for (const file of filesToCheck) {
        const results = await verifyCitations(caseDir, file);
        allResults.push(results);

        if (results.failed > 0) hasFailures = true;
    }

    if (jsonOutput) {
        console.log(JSON.stringify({
            caseDir,
            preArticle,
            files: allResults,
            hasFailures
        }, null, 2));
    } else {
        console.log('='.repeat(70));
        console.log('SEMANTIC CITATION VERIFICATION');
        console.log('='.repeat(70));
        console.log(`Case: ${caseDir}`);
        console.log(`Mode: ${preArticle ? 'Pre-Article Validation' : 'Post-Article Verification'}`);
        console.log('');

        for (const results of allResults) {
            console.log('\n' + '-'.repeat(70));
            console.log(`File: ${results.file}`);
            console.log('-'.repeat(70));

            if (results.error) {
                console.log(`\x1b[31mERROR:\x1b[0m ${results.error}`);
                continue;
            }

            console.log(`Total citations: ${results.totalCitations}`);
            console.log(`  Verified (quick check): ${results.verified}`);
            console.log(`  Failed: ${results.failed}`);
            console.log(`  Needs LLM verification: ${results.skipped}`);

            if (results.failures.length > 0) {
                console.log('\n\x1b[31mFAILURES:\x1b[0m');
                for (const f of results.failures) {
                    console.log(`\n  [${f.sourceId}] ${f.issue}`);
                    console.log(`    Claim: "${f.claim}"`);
                    console.log(`    Detail: ${f.detail}`);
                }
            }

            if (results.warnings.length > 0) {
                console.log('\n\x1b[33mWARNINGS (need LLM verification):\x1b[0m');
                for (const w of results.warnings) {
                    console.log(`\n  [${w.sourceId}] ${w.issue}`);
                    console.log(`    Claim: "${w.claim}"`);
                    console.log(`    Detail: ${w.detail}`);
                }
            }

            if (results.needsLlmVerification.length > 0) {
                console.log('\n\x1b[36mLLM VERIFICATION PROMPTS:\x1b[0m');
                console.log('The following citations need LLM-based semantic verification.');
                console.log('Use mcp__mcp-gemini__generate_text with each prompt below:');

                for (let i = 0; i < Math.min(3, results.needsLlmVerification.length); i++) {
                    const item = results.needsLlmVerification[i];
                    console.log(`\n--- ${item.sourceId} ---`);
                    console.log(`Claim: "${item.claim.substring(0, 100)}..."`);
                    console.log(`Reason: ${item.reason}`);
                }

                if (results.needsLlmVerification.length > 3) {
                    console.log(`\n... and ${results.needsLlmVerification.length - 3} more`);
                }
            }
        }

        console.log('\n' + '='.repeat(70));
        if (hasFailures) {
            console.log('\x1b[31mFAIL\x1b[0m - Citation verification failures found');
            console.log('\nStatistic mismatches indicate citation laundering.');
            console.log('Either fix the statistic or find a source that supports the claim.');
        } else if (allResults.some(r => r.skipped > 0)) {
            console.log('\x1b[33mWARN\x1b[0m - Some citations need LLM verification');
            console.log('\nRun LLM verification on flagged citations before proceeding.');
        } else {
            console.log('\x1b[32mPASS\x1b[0m - All citations passed quick verification');
        }
        console.log('='.repeat(70));
    }

    process.exit(hasFailures ? 1 : 0);
}

// Export for programmatic use
module.exports = {
    extractCitationClaims,
    extractStatistics,
    quickVerify,
    verifyCitations,
    generateVerificationPrompt
};

if (require.main === module) {
    main().catch(err => {
        console.error(`Fatal error: ${err.message}`);
        process.exit(2);
    });
}
