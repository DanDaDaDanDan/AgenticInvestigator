#!/usr/bin/env node

/**
 * check-summary-claims.js
 *
 * Validates claims in summary.md against sources and lead investigation results.
 *
 * Usage:
 *   node scripts/check-summary-claims.js cases/case-id/
 *   node scripts/check-summary-claims.js cases/case-id/ --verbose
 *   node scripts/check-summary-claims.js cases/case-id/ --fix-suggestions
 *
 * Checks:
 * 1. All cited sources have captured: true
 * 2. Lead results don't contradict summary claims
 * 3. Statistics in summary appear in cited source
 * 4. Investigated leads with specific results have sources
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const casePath = args.find(a => !a.startsWith('--'));
const verbose = args.includes('--verbose');
const fixSuggestions = args.includes('--fix-suggestions');

if (!casePath) {
    console.error('Usage: node scripts/check-summary-claims.js <case-path> [--verbose] [--fix-suggestions]');
    process.exit(1);
}

const summaryPath = path.join(casePath, 'summary.md');
const sourcesPath = path.join(casePath, 'sources.json');
const leadsPath = path.join(casePath, 'leads.json');
const evidencePath = path.join(casePath, 'evidence');

// Results tracking
const issues = {
    uncapturedSources: [],
    leadContradictions: [],
    leadsMissingSources: [],
    citationProblems: [],
    temporalMissing: []
};

// Load files
function loadFile(filePath, type = 'text') {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return type === 'json' ? JSON.parse(content) : content;
    } catch (e) {
        console.error(`Failed to load ${filePath}: ${e.message}`);
        return null;
    }
}

// Extract all [S###] citations from text
function extractCitations(text) {
    const pattern = /\[S(\d{3})\]/g;
    const citations = new Set();
    let match;
    while ((match = pattern.exec(text)) !== null) {
        citations.add(`S${match[1]}`);
    }
    return Array.from(citations);
}

// Extract statistics from text (numbers with % or $)
function extractStatistics(text) {
    const patterns = [
        /(\d+(?:,\d{3})*(?:\.\d+)?)\s*%/g,  // Percentages
        /\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|billion|M|B)?/gi,  // Dollar amounts
        /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|billion)/gi  // Plain numbers with scale
    ];

    const stats = [];
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            stats.push({
                full: match[0],
                value: match[1],
                context: text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + match[0].length + 50))
            });
        }
    }
    return stats;
}

// Check 1: Verify all cited sources are captured
function checkSourceCapture(summary, sources) {
    const citations = extractCitations(summary);

    for (const citation of citations) {
        const source = sources.sources.find(s => s.id === citation);

        if (!source) {
            issues.uncapturedSources.push({
                sourceId: citation,
                problem: 'Source not found in sources.json',
                severity: 'CRITICAL'
            });
            continue;
        }

        if (source.captured === false) {
            issues.uncapturedSources.push({
                sourceId: citation,
                url: source.url,
                problem: 'Source has captured: false',
                severity: 'CRITICAL'
            });
            continue;
        }

        // Check evidence folder exists
        const evidenceDir = path.join(evidencePath, citation);
        if (!fs.existsSync(evidenceDir)) {
            issues.uncapturedSources.push({
                sourceId: citation,
                problem: 'Evidence folder does not exist',
                severity: 'CRITICAL'
            });
            continue;
        }

        // Check metadata.json exists
        const metadataPath = path.join(evidenceDir, 'metadata.json');
        if (!fs.existsSync(metadataPath)) {
            issues.uncapturedSources.push({
                sourceId: citation,
                problem: 'metadata.json missing from evidence folder',
                severity: 'HIGH'
            });
        }
    }
}

// Check 2: Verify lead results don't contradict summary
function checkLeadContradictions(summary, leads) {
    const summaryLower = summary.toLowerCase();

    for (const lead of leads.leads) {
        if (lead.status !== 'dead_end' && lead.status !== 'investigated') continue;
        if (!lead.result) continue;

        const resultLower = lead.result.toLowerCase();

        // Check for explicit contradictions
        const contradictionPatterns = [
            { pattern: /not found|don't exist|doesn't exist|could not find|no evidence/i, type: 'not_found' },
            { pattern: /not verified|unverified|cannot verify/i, type: 'unverified' },
            { pattern: /incorrect|wrong|false|inaccurate/i, type: 'incorrect' }
        ];

        for (const { pattern, type } of contradictionPatterns) {
            if (pattern.test(lead.result)) {
                // Check if the lead topic is still stated as fact in summary
                const leadKeywords = lead.lead.toLowerCase().split(/\s+/).filter(w => w.length > 4);
                const keywordInSummary = leadKeywords.some(kw => summaryLower.includes(kw));

                if (keywordInSummary && lead.status === 'dead_end') {
                    issues.leadContradictions.push({
                        leadId: lead.id,
                        lead: lead.lead,
                        result: lead.result,
                        type: type,
                        severity: 'HIGH',
                        suggestion: `Review summary for claims about "${lead.lead}" - lead found ${type}`
                    });
                }
            }
        }
    }
}

// Check 3: Verify investigated leads have sources when they contain statistics
function checkLeadSources(leads) {
    for (const lead of leads.leads) {
        if (lead.status !== 'investigated') continue;
        if (!lead.result) continue;

        // Check if result contains specific numbers
        const hasStatistics = /\d+(?:,\d{3})*(?:\.\d+)?/.test(lead.result);
        const hasDollarAmount = /\$\d/.test(lead.result);
        const hasPercentage = /\d+%/.test(lead.result);

        const hasSpecificClaims = hasStatistics || hasDollarAmount || hasPercentage;
        const hasSources = lead.sources && lead.sources.length > 0;

        if (hasSpecificClaims && !hasSources) {
            issues.leadsMissingSources.push({
                leadId: lead.id,
                lead: lead.lead,
                result: lead.result.substring(0, 200) + (lead.result.length > 200 ? '...' : ''),
                severity: 'HIGH',
                suggestion: 'Lead result contains specific claims but has no captured sources'
            });
        }
    }
}

// Check 4: Check for temporal context (dated evidence without dates)
function checkTemporalContext(summary) {
    // Look for statistics that might be time-sensitive
    const timeSensitivePatterns = [
        /(\d+%)\s+of\s+(?:Americans|voters|workers|people)/gi,
        /poll(?:ing|s)?\s+(?:show|found|indicate)/gi,
        /survey(?:s)?\s+(?:show|found|indicate)/gi,
        /(?:Pew|Gallup|poll)\s+.*?\[S\d{3}\]/gi
    ];

    for (const pattern of timeSensitivePatterns) {
        let match;
        while ((match = pattern.exec(summary)) !== null) {
            const context = summary.substring(Math.max(0, match.index - 100), Math.min(summary.length, match.index + match[0].length + 100));

            // Check if temporal context is present
            const hasDate = /\b(20\d{2}|January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(context);

            if (!hasDate) {
                issues.temporalMissing.push({
                    match: match[0],
                    context: context.trim(),
                    severity: 'MEDIUM',
                    suggestion: 'Time-sensitive statistic may need date context (e.g., "[S###, Aug 2023]")'
                });
            }
        }
    }
}

// Main execution
function main() {
    console.log('='.repeat(70));
    console.log('SUMMARY CLAIMS VERIFICATION');
    console.log('='.repeat(70));
    console.log(`Case: ${casePath}`);
    console.log('');

    // Load files
    const summary = loadFile(summaryPath);
    const sources = loadFile(sourcesPath, 'json');
    const leads = loadFile(leadsPath, 'json');

    if (!summary || !sources || !leads) {
        console.error('Failed to load required files');
        process.exit(1);
    }

    // Run checks
    console.log('Running checks...\n');

    checkSourceCapture(summary, sources);
    checkLeadContradictions(summary, leads);
    checkLeadSources(leads);
    checkTemporalContext(summary);

    // Report results
    let totalIssues = 0;
    let criticalIssues = 0;

    // Uncaptured Sources
    if (issues.uncapturedSources.length > 0) {
        console.log('\n' + '─'.repeat(70));
        console.log('1. UNCAPTURED/MISSING SOURCES');
        console.log('─'.repeat(70));
        for (const issue of issues.uncapturedSources) {
            console.log(`\n  [${issue.severity}] ${issue.sourceId}`);
            console.log(`    Problem: ${issue.problem}`);
            if (issue.url) console.log(`    URL: ${issue.url}`);
            totalIssues++;
            if (issue.severity === 'CRITICAL') criticalIssues++;
        }
    }

    // Lead Contradictions
    if (issues.leadContradictions.length > 0) {
        console.log('\n' + '─'.repeat(70));
        console.log('2. LEAD CONTRADICTIONS (claims in summary may need update)');
        console.log('─'.repeat(70));
        for (const issue of issues.leadContradictions) {
            console.log(`\n  [${issue.severity}] ${issue.leadId}: ${issue.lead}`);
            console.log(`    Result: ${issue.result.substring(0, 150)}...`);
            console.log(`    Issue: Lead result suggests ${issue.type}`);
            if (fixSuggestions) console.log(`    Suggestion: ${issue.suggestion}`);
            totalIssues++;
            if (issue.severity === 'CRITICAL' || issue.severity === 'HIGH') criticalIssues++;
        }
    }

    // Leads Missing Sources
    if (issues.leadsMissingSources.length > 0) {
        console.log('\n' + '─'.repeat(70));
        console.log('3. INVESTIGATED LEADS WITHOUT SOURCES');
        console.log('─'.repeat(70));
        for (const issue of issues.leadsMissingSources) {
            console.log(`\n  [${issue.severity}] ${issue.leadId}: ${issue.lead}`);
            console.log(`    Result contains: ${issue.result}`);
            if (fixSuggestions) console.log(`    Suggestion: ${issue.suggestion}`);
            totalIssues++;
            if (issue.severity === 'HIGH') criticalIssues++;
        }
    }

    // Temporal Context
    if (issues.temporalMissing.length > 0) {
        console.log('\n' + '─'.repeat(70));
        console.log('4. MISSING TEMPORAL CONTEXT');
        console.log('─'.repeat(70));
        for (const issue of issues.temporalMissing) {
            console.log(`\n  [${issue.severity}] ${issue.match}`);
            if (verbose) console.log(`    Context: ...${issue.context}...`);
            if (fixSuggestions) console.log(`    Suggestion: ${issue.suggestion}`);
            totalIssues++;
        }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total issues: ${totalIssues}`);
    console.log(`Critical/High severity: ${criticalIssues}`);
    console.log('');

    if (criticalIssues > 0) {
        console.log('❌ FAIL - Critical issues found that must be resolved');
        process.exit(1);
    } else if (totalIssues > 0) {
        console.log('⚠️  WARN - Issues found that should be reviewed');
        process.exit(0);
    } else {
        console.log('✓ PASS - No issues found');
        process.exit(0);
    }
}

main();
