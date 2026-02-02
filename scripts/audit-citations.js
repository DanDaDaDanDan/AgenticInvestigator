#!/usr/bin/env node
/**
 * audit-citations.js - Pre-generation citation audit
 *
 * Addresses Root Cause 1: One-way trust flow with no backward verification.
 * This script audits all citations in findings/ BEFORE article generation
 * to ensure every cited source is properly captured and verified.
 *
 * Usage:
 *   node scripts/audit-citations.js <case_dir>
 *   node scripts/audit-citations.js <case_dir> --block (exit 1 if any failures)
 *   node scripts/audit-citations.js <case_dir> --json
 *
 * Checks for each citation:
 *   1. Source exists in sources.json with captured: true
 *   2. evidence/S###/ directory exists
 *   3. metadata.json exists with _capture_signature
 *   4. content.md exists and is not empty
 *   5. Not flagged as fabricated (no compilation pattern)
 *
 * Exit codes:
 *   0 - All citations pass audit (or --block not used)
 *   1 - Audit failures found (when --block is used)
 *   2 - Usage error
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { verifySource } = require('./verify-source');
const { normalizeUrl } = require('./osint-save');

function isHttpUrl(url) {
    return typeof url === 'string' && /^https?:\/\/.+/i.test(url.trim());
}

function isForbiddenSourceType(type) {
    if (!type || typeof type !== 'string') return false;
    return /synth|compil/i.test(type);
}

// Parse command line arguments
const args = process.argv.slice(2);
const caseDir = args.find(a => !a.startsWith('--'));
const jsonOutput = args.includes('--json');
const blockMode = args.includes('--block');

if (!caseDir) {
    console.error('Usage: node scripts/audit-citations.js <case_dir> [--block] [--json]');
    process.exit(2);
}

// Extract all [S###] citations from text
function extractCitations(text) {
    const pattern = /\[S(\d{3})\]/g;
    const citations = new Map(); // sourceId -> count

    let match;
    while ((match = pattern.exec(text)) !== null) {
        const sourceId = `S${match[1]}`;
        citations.set(sourceId, (citations.get(sourceId) || 0) + 1);
    }

    return citations;
}

// Audit a single citation
function auditCitation(sourceId, caseDir, sourcesJson) {
    const result = {
        sourceId,
        passed: true,
        checks: [],
        errors: [],
        warnings: []
    };

    const evidenceDir = path.join(caseDir, 'evidence', sourceId);
    const metadataPath = path.join(evidenceDir, 'metadata.json');
    const contentPath = path.join(evidenceDir, 'content.md');

    // Check 1: Source in sources.json
    const sourceEntry = sourcesJson.sources?.find(s => s.id === sourceId);
    if (!sourceEntry) {
        result.errors.push('Not found in sources.json');
        result.passed = false;
    } else {
        result.checks.push('in_sources_json');
        result.url = sourceEntry.url;
        result.title = sourceEntry.title;

        // Enforce One Source = One URL (no placeholders like research_synthesis)
        if (!isHttpUrl(sourceEntry.url)) {
            result.errors.push(`Invalid URL in sources.json: "${sourceEntry.url}" (must be http/https)`);
            result.passed = false;
        }
        if (isForbiddenSourceType(sourceEntry.type)) {
            result.errors.push(`Forbidden source type in sources.json: "${sourceEntry.type}" (no synthesis/compilation sources allowed)`);
            result.passed = false;
        }

        // Check 1b: captured: true
        if (sourceEntry.captured !== true) {
            result.errors.push(`captured: ${sourceEntry.captured} (should be true)`);
            result.passed = false;
        } else {
            result.checks.push('captured_true');
        }
    }

    // Check 2: Evidence directory exists
    if (!fs.existsSync(evidenceDir)) {
        result.errors.push('Evidence directory missing');
        result.passed = false;
        return result; // Can't do further checks
    }
    result.checks.push('evidence_dir_exists');

    // Check 3: metadata.json exists and is valid
    if (!fs.existsSync(metadataPath)) {
        result.errors.push('metadata.json missing');
        result.passed = false;
    } else {
        try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            result.checks.push('metadata_exists');

            // Check for capture signature
            if (!metadata._capture_signature) {
                result.warnings.push('No _capture_signature (may be manually created)');
            } else {
                result.checks.push('has_signature');
            }

            // Check for verification block
            if (metadata.verification && metadata.verification.verified) {
                result.checks.push('verified');
            } else if (!metadata.sha256 && !metadata.verification) {
                result.warnings.push('No verification hash');
            }

            // Check URL consistency (normalized, to avoid false mismatches from tracking params)
            if (sourceEntry && metadata.url && sourceEntry.url) {
                const normalizedMeta = normalizeUrl(metadata.url);
                const normalizedSources = normalizeUrl(sourceEntry.url);
                if (normalizedMeta && normalizedSources && normalizedMeta !== normalizedSources) {
                    result.warnings.push('URL mismatch between sources.json and metadata');
                }
            }

        } catch (e) {
            result.errors.push(`Invalid metadata.json: ${e.message}`);
            result.passed = false;
        }
    }

    // Check 4: content.md exists and is not empty
    if (!fs.existsSync(contentPath)) {
        result.errors.push('content.md missing');
        result.passed = false;
    } else {
        const content = fs.readFileSync(contentPath, 'utf8');

        if (content.trim().length === 0) {
            result.errors.push('content.md is empty');
            result.passed = false;
        } else {
            result.checks.push('content_exists');
            result.contentLength = content.length;

            // Check 5: Not a fabricated compilation
            const contentStart = content.slice(0, 200).toLowerCase();
            if (contentStart.match(/^(research compilation|summary of|synthesis of|overview of)/)) {
                result.errors.push('content.md appears to be fabricated (compilation pattern)');
                result.passed = false;
            } else {
                result.checks.push('not_fabricated');
            }
        }
    }

    // Check 6: Full verify-source integrity (hashes, URL validity, signature red flags)
    const integrity = verifySource(sourceId, caseDir, {
        strict: !!process.env.EVIDENCE_RECEIPT_KEY,
        publication: true
    });
    if (!integrity.valid) {
        for (const err of integrity.errors) {
            result.errors.push(`verify-source: ${err}`);
        }
        result.passed = false;
    } else {
        result.checks.push('verify_source_valid');
    }
    if (integrity.warnings && integrity.warnings.length > 0) {
        for (const warn of integrity.warnings) {
            result.warnings.push(`verify-source: ${warn}`);
        }
    }

    return result;
}

// Main audit function
function auditCitations(caseDir) {
    const findingsDir = path.join(caseDir, 'findings');
    const results = {
        caseDir,
        findingsDir,
        timestamp: new Date().toISOString(),
        totalCitations: 0,
        uniqueSources: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        details: [],
        failures: [],
        warningsList: []
    };

    // Load all findings
    if (!fs.existsSync(findingsDir)) {
        results.error = 'findings/ directory not found';
        return results;
    }

    // Read all finding files
    const findingFiles = fs.readdirSync(findingsDir)
        .filter(f => f.match(/^F\d{3}\.md$/))
        .sort();

    if (findingFiles.length === 0) {
        results.error = 'No finding files found in findings/';
        return results;
    }

    // Concatenate all findings content
    let allContent = '';
    for (const file of findingFiles) {
        allContent += fs.readFileSync(path.join(findingsDir, file), 'utf8') + '\n';
    }

    // Load sources.json
    const sourcesPath = path.join(caseDir, 'sources.json');
    let sourcesJson = { sources: [] };
    if (fs.existsSync(sourcesPath)) {
        try {
            sourcesJson = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
        } catch (e) {
            results.error = `Invalid sources.json: ${e.message}`;
            return results;
        }
    }

    // Extract citations from all findings
    const citations = extractCitations(allContent);
    results.totalCitations = Array.from(citations.values()).reduce((a, b) => a + b, 0);
    results.uniqueSources = citations.size;

    // Audit each citation
    for (const [sourceId, count] of citations) {
        const audit = auditCitation(sourceId, caseDir, sourcesJson);
        audit.citationCount = count;
        results.details.push(audit);

        if (audit.passed) {
            results.passed++;
        } else {
            results.failed++;
            results.failures.push({
                sourceId,
                url: audit.url,
                errors: audit.errors
            });
        }

        if (audit.warnings.length > 0) {
            results.warnings++;
            results.warningsList.push({
                sourceId,
                warnings: audit.warnings
            });
        }
    }

    results.allPassed = results.failed === 0;

    return results;
}

// Main execution
function main() {
    const results = auditCitations(caseDir);

    if (jsonOutput) {
        console.log(JSON.stringify(results, null, 2));
    } else {
        console.log('='.repeat(70));
        console.log('CITATION AUDIT - Pre-Article Generation');
        console.log('='.repeat(70));
        console.log(`Case: ${caseDir}`);
        console.log(`Timestamp: ${results.timestamp}`);
        console.log('');

        if (results.error) {
            console.log(`\x1b[31mERROR:\x1b[0m ${results.error}`);
            process.exit(2);
        }

        console.log(`Citations in findings/: ${results.totalCitations} (${results.uniqueSources} unique sources)`);
        console.log(`  Passed: ${results.passed}`);
        console.log(`  Failed: ${results.failed}`);
        console.log(`  With warnings: ${results.warnings}`);

        if (results.failures.length > 0) {
            console.log('\n' + '-'.repeat(70));
            console.log('\x1b[31mFAILURES (must fix before article generation):\x1b[0m');
            console.log('-'.repeat(70));

            for (const f of results.failures) {
                console.log(`\n  [${f.sourceId}]`);
                if (f.url) console.log(`    URL: ${f.url}`);
                for (const err of f.errors) {
                    console.log(`    \x1b[31m✗\x1b[0m ${err}`);
                }
            }
        }

        if (results.warningsList.length > 0) {
            console.log('\n' + '-'.repeat(70));
            console.log('\x1b[33mWARNINGS (review recommended):\x1b[0m');
            console.log('-'.repeat(70));

            for (const w of results.warningsList) {
                console.log(`\n  [${w.sourceId}]`);
                for (const warn of w.warnings) {
                    console.log(`    \x1b[33m!\x1b[0m ${warn}`);
                }
            }
        }

        // Passed sources summary
        const passedSources = results.details.filter(d => d.passed);
        if (passedSources.length > 0) {
            console.log('\n' + '-'.repeat(70));
            console.log('\x1b[32mPASSED:\x1b[0m');
            console.log('-'.repeat(70));

            for (const p of passedSources) {
                const checks = p.checks.length;
                console.log(`  \x1b[32m✓\x1b[0m [${p.sourceId}] ${checks} checks passed`);
            }
        }

        console.log('\n' + '='.repeat(70));

        if (results.allPassed) {
            console.log('\x1b[32mAUDIT PASSED\x1b[0m - All citations verified, safe to generate articles');
        } else {
            console.log('\x1b[31mAUDIT FAILED\x1b[0m - Fix citation issues before generating articles');
            console.log('\nRequired actions:');
            console.log('  1. Re-capture missing sources using /capture-source');
            console.log('  2. Verify sources.json entries have captured: true');
            console.log('  3. Ensure evidence directories have metadata.json and content.md');
        }
        console.log('='.repeat(70));
    }

    // Exit code based on mode
    if (blockMode && !results.allPassed) {
        process.exit(1);
    }
    process.exit(0);
}

// Export for programmatic use
module.exports = {
    extractCitations,
    auditCitation,
    auditCitations
};

if (require.main === module) {
    main();
}
