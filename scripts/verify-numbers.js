#!/usr/bin/env node
/**
 * verify-numbers.js - Verify statistics in articles match cited sources
 *
 * Addresses Root Cause 6: Keyword-based contradiction detection is insufficient.
 * This script specifically checks numerical claims (percentages, counts, dollar
 * amounts) against their cited sources to catch statistical drift.
 *
 * Usage:
 *   node scripts/verify-numbers.js <case_dir>
 *   node scripts/verify-numbers.js <case_dir> --strict (fails on any mismatch)
 *   node scripts/verify-numbers.js <case_dir> --json
 *
 * Exit codes:
 *   0 - All numbers verified or within tolerance
 *   1 - Number mismatches found
 *   2 - Usage error
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const caseDir = args.find(a => !a.startsWith('--'));
const jsonOutput = args.includes('--json');
const strictMode = args.includes('--strict');

if (!caseDir) {
    console.error('Usage: node scripts/verify-numbers.js <case_dir> [--strict] [--json]');
    process.exit(2);
}

// Extract numbers with their context and citation
function extractNumbersWithCitations(text) {
    const results = [];

    // Match patterns like: "72% [S001]" or "2,000 agents [S015]" or "$50 million [S023]"
    const patterns = [
        // Percentage with citation
        {
            regex: /(\d+(?:\.\d+)?)\s*%[^[]{0,50}\[S(\d{3})\]/g,
            type: 'percentage',
            extract: (m) => ({ value: parseFloat(m[1]), unit: '%', sourceId: `S${m[2]}` })
        },
        // Dollar amount with citation
        {
            regex: /\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|billion|M|B|k|K)?[^[]{0,50}\[S(\d{3})\]/gi,
            type: 'currency',
            extract: (m) => ({
                value: parseFloat(m[1].replace(/,/g, '')),
                multiplier: getMultiplier(m[2]),
                unit: '$',
                sourceId: `S${m[3]}`
            })
        },
        // Count with citation (e.g., "2,000 agents")
        {
            regex: /\b(\d+(?:,\d{3})+|\d{3,})\s+(?:agents?|people|workers|officers|personnel|individuals|cases|deaths|incidents)[^[]{0,50}\[S(\d{3})\]/gi,
            type: 'count',
            extract: (m) => ({
                value: parseInt(m[1].replace(/,/g, ''), 10),
                unit: 'count',
                sourceId: `S${m[2]}`
            })
        },
        // Generic large number with citation
        {
            regex: /\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|billion|thousand)?[^[]{0,30}\[S(\d{3})\]/gi,
            type: 'number',
            extract: (m) => ({
                value: parseFloat(m[1].replace(/,/g, '')),
                multiplier: getMultiplier(m[2]),
                unit: 'number',
                sourceId: `S${m[3]}`
            })
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
                context: context,
                rawMatch: match[0],
                position: match.index
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

function getMultiplier(unit) {
    if (!unit) return 1;
    switch (unit.toLowerCase()) {
        case 'k':
        case 'thousand': return 1000;
        case 'm':
        case 'million': return 1000000;
        case 'b':
        case 'billion': return 1000000000;
        default: return 1;
    }
}

// Search for numbers in source content
function findNumbersInSource(sourceContent, targetNumber, tolerance = 0.1) {
    const matches = [];

    // Extract all numbers from source
    const numberPatterns = [
        /(\d+(?:\.\d+)?)\s*%/g,  // Percentages
        /\$(\d+(?:,\d{3})*(?:\.\d+)?)/g,  // Dollar amounts
        /\b(\d+(?:,\d{3})+)\b/g,  // Large numbers with commas
        /\b(\d{3,})\b/g  // Numbers 3+ digits
    ];

    const foundNumbers = [];
    for (const pattern of numberPatterns) {
        let m;
        while ((m = pattern.exec(sourceContent)) !== null) {
            const val = parseFloat(m[1].replace(/,/g, ''));
            if (!isNaN(val)) {
                foundNumbers.push({
                    value: val,
                    raw: m[0],
                    context: sourceContent.substring(
                        Math.max(0, m.index - 50),
                        Math.min(sourceContent.length, m.index + m[0].length + 50)
                    )
                });
            }
        }
    }

    // Find exact or close matches
    for (const num of foundNumbers) {
        const ratio = num.value / targetNumber;
        if (ratio === 1) {
            matches.push({ ...num, matchType: 'exact' });
        } else if (ratio >= (1 - tolerance) && ratio <= (1 + tolerance)) {
            matches.push({ ...num, matchType: 'approximate', ratio });
        }
    }

    return matches;
}

// Load source content
function loadSourceContent(sourceId, caseDir) {
    const contentPath = path.join(caseDir, 'evidence', sourceId, 'content.md');
    if (fs.existsSync(contentPath)) {
        return fs.readFileSync(contentPath, 'utf8');
    }
    return null;
}

// Main verification function
function verifyNumbers(caseDir) {
    const results = {
        articlePath: null,
        totalNumbers: 0,
        verified: 0,
        mismatched: 0,
        missing: 0,
        uncitedNumbers: 0,
        details: {
            verified: [],
            mismatched: [],
            missing: [],
            uncited: []
        }
    };

    // Read article
    const articlePath = path.join(caseDir, 'articles', 'full.md');
    if (!fs.existsSync(articlePath)) {
        results.error = 'articles/full.md not found';
        return results;
    }
    results.articlePath = articlePath;

    const articleContent = fs.readFileSync(articlePath, 'utf8');

    // Extract numbers with citations
    const numbersWithCitations = extractNumbersWithCitations(articleContent);
    results.totalNumbers = numbersWithCitations.length;

    // Verify each number
    for (const num of numbersWithCitations) {
        const sourceContent = loadSourceContent(num.sourceId, caseDir);

        if (!sourceContent) {
            results.missing++;
            results.details.missing.push({
                ...num,
                issue: `Source ${num.sourceId} content not found`
            });
            continue;
        }

        // Calculate effective value for comparison
        const effectiveValue = num.value * (num.multiplier || 1);

        // Search for the number in source
        const matches = findNumbersInSource(sourceContent, effectiveValue);

        if (matches.length === 0) {
            // Try searching for the raw value without multiplier
            const rawMatches = findNumbersInSource(sourceContent, num.value);

            if (rawMatches.length === 0) {
                results.mismatched++;
                results.details.mismatched.push({
                    ...num,
                    issue: `Number ${num.value}${num.unit === '%' ? '%' : ''} not found in source`,
                    sourceExcerpt: sourceContent.substring(0, 500) + '...'
                });
            } else {
                results.verified++;
                results.details.verified.push({
                    ...num,
                    foundAs: rawMatches[0].raw,
                    matchType: rawMatches[0].matchType
                });
            }
        } else {
            const exactMatch = matches.find(m => m.matchType === 'exact');
            if (exactMatch) {
                results.verified++;
                results.details.verified.push({
                    ...num,
                    foundAs: exactMatch.raw,
                    matchType: 'exact'
                });
            } else {
                // Only approximate match
                results.verified++;
                results.details.verified.push({
                    ...num,
                    foundAs: matches[0].raw,
                    matchType: 'approximate',
                    ratio: matches[0].ratio,
                    warning: 'Value is approximate match, not exact'
                });
            }
        }
    }

    // Also find numbers without citations (potential issue)
    const uncitedPattern = /\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*(%|million|billion|agents?|people|workers)?(?![^[]*\[S\d{3}\])/gi;
    let uncitedMatch;
    const contentWithoutSources = articleContent.replace(/## Sources.*$/s, ''); // Remove sources section

    const uncitedNumbers = [];
    while ((uncitedMatch = uncitedPattern.exec(contentWithoutSources)) !== null) {
        const val = parseFloat(uncitedMatch[1].replace(/,/g, ''));
        // Only flag significant numbers (> 100 or percentages)
        if (val > 100 || uncitedMatch[2] === '%') {
            const context = contentWithoutSources.substring(
                Math.max(0, uncitedMatch.index - 50),
                Math.min(contentWithoutSources.length, uncitedMatch.index + uncitedMatch[0].length + 50)
            );

            // Skip if it's in a citation-like context already
            if (!context.match(/\[S\d{3}\]/)) {
                uncitedNumbers.push({
                    value: val,
                    raw: uncitedMatch[0],
                    context: context.trim()
                });
            }
        }
    }

    // Deduplicate uncited numbers
    const seenUncited = new Set();
    for (const un of uncitedNumbers) {
        const key = `${un.value}-${un.raw}`;
        if (!seenUncited.has(key)) {
            seenUncited.add(key);
            results.details.uncited.push(un);
        }
    }
    results.uncitedNumbers = results.details.uncited.length;

    return results;
}

// Main execution
function main() {
    const results = verifyNumbers(caseDir);

    if (jsonOutput) {
        console.log(JSON.stringify(results, null, 2));
    } else {
        console.log('='.repeat(70));
        console.log('NUMBER VERIFICATION');
        console.log('='.repeat(70));
        console.log(`Case: ${caseDir}`);
        console.log(`Mode: ${strictMode ? 'Strict' : 'Normal'}`);
        console.log('');

        if (results.error) {
            console.log(`\x1b[31mERROR:\x1b[0m ${results.error}`);
            process.exit(2);
        }

        console.log(`Total numbers with citations: ${results.totalNumbers}`);
        console.log(`  Verified: ${results.verified}`);
        console.log(`  Mismatched: ${results.mismatched}`);
        console.log(`  Source missing: ${results.missing}`);
        console.log(`  Uncited significant numbers: ${results.uncitedNumbers}`);

        if (results.details.verified.length > 0) {
            console.log('\n\x1b[32mVERIFIED:\x1b[0m');
            for (const v of results.details.verified.slice(0, 10)) {
                const match = v.matchType === 'exact' ? '' : ` (${v.matchType})`;
                console.log(`  [${v.sourceId}] ${v.value}${v.unit === '%' ? '%' : ''} → found as "${v.foundAs}"${match}`);
                if (v.warning) {
                    console.log(`    \x1b[33mWARN:\x1b[0m ${v.warning}`);
                }
            }
            if (results.details.verified.length > 10) {
                console.log(`  ... and ${results.details.verified.length - 10} more`);
            }
        }

        if (results.details.mismatched.length > 0) {
            console.log('\n\x1b[31mMISMATCHED:\x1b[0m');
            for (const m of results.details.mismatched) {
                console.log(`\n  [${m.sourceId}] ${m.value}${m.unit === '%' ? '%' : ''}`);
                console.log(`    Context: "${m.context}"`);
                console.log(`    Issue: ${m.issue}`);
            }
        }

        if (results.details.missing.length > 0) {
            console.log('\n\x1b[33mMISSING SOURCES:\x1b[0m');
            for (const m of results.details.missing) {
                console.log(`  [${m.sourceId}] ${m.value}${m.unit === '%' ? '%' : ''} - ${m.issue}`);
            }
        }

        if (results.details.uncited.length > 0) {
            console.log('\n\x1b[33mUNCITED NUMBERS (review needed):\x1b[0m');
            for (const u of results.details.uncited.slice(0, 5)) {
                console.log(`  ${u.raw}`);
                console.log(`    Context: "...${u.context}..."`);
            }
            if (results.details.uncited.length > 5) {
                console.log(`  ... and ${results.details.uncited.length - 5} more`);
            }
        }

        console.log('\n' + '='.repeat(70));

        const hasCriticalFailures = results.mismatched > 0 || results.missing > 0;
        const hasWarnings = results.uncitedNumbers > 0;

        if (hasCriticalFailures) {
            console.log('\x1b[31mFAIL\x1b[0m - Number verification failures found');
            console.log('\nMismatched numbers indicate the article states different values than sources.');
            console.log('Either correct the article or find sources that support the claimed numbers.');
        } else if (hasWarnings && strictMode) {
            console.log('\x1b[33mWARN\x1b[0m - Uncited significant numbers found');
            console.log('\nIn strict mode, all significant numbers should have citations.');
        } else if (hasWarnings) {
            console.log('\x1b[32mPASS\x1b[0m - All cited numbers verified (uncited numbers flagged for review)');
        } else {
            console.log('\x1b[32mPASS\x1b[0m - All numbers verified');
        }
        console.log('='.repeat(70));
    }

    const exitCode = (results.mismatched > 0 || results.missing > 0) ? 1 :
                     (strictMode && results.uncitedNumbers > 0) ? 1 : 0;
    process.exit(exitCode);
}

// Export for programmatic use
module.exports = {
    extractNumbersWithCitations,
    findNumbersInSource,
    verifyNumbers
};

if (require.main === module) {
    main();
}
