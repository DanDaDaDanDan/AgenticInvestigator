#!/usr/bin/env node
/**
 * verify-citation-density.js - Verify summary.md has sufficient source citations
 *
 * CRITICAL GATE: Every factual claim in summary.md must have a source citation.
 * This prevents the "zero citations" problem where synthesis generates facts
 * without attribution.
 *
 * Usage:
 *   node verify-citation-density.js <case_dir>
 *   node verify-citation-density.js <case_dir> --json     # JSON output
 *   node verify-citation-density.js <case_dir> --verbose  # Show uncited lines
 *
 * Checks:
 *   1. Summary.md exists and has content
 *   2. Citation density meets configured threshold
 *   3. Key sections (Key Findings, Timeline, etc.) have citations
 *   4. No large blocks of uncited factual content
 *
 * A "factual statement" is a line containing:
 *   - Specific numbers, dates, or percentages
 *   - Names of people, places, or organizations
 *   - Claims about actions, events, or states
 *   - NOT: headings, metadata, or structural elements
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

function parseCliArgs(argv) {
  const args = argv.slice(2);
  return {
    caseDir: args.find(a => !a.startsWith('--')),
    jsonOutput: args.includes('--json'),
    verbose: args.includes('--verbose')
  };
}

// THRESHOLD: Minimum percentage of factual lines that must have citations
let CITATION_DENSITY_THRESHOLD = 1.0; // default 100%
try {
  const config = require('./config');
  if (typeof config?.thresholds?.citation_density === 'number') {
    CITATION_DENSITY_THRESHOLD = config.thresholds.citation_density;
  }
} catch (_) {}

// Patterns that indicate a line contains factual content
const FACTUAL_PATTERNS = [
  /\d{4}/,                          // Years (dates)
  /\d+%/,                           // Percentages
  /\$[\d,]+/,                       // Dollar amounts
  /\d+\s*(years?|months?|days?|hours?)/i, // Time periods
  /\d+\s*(people|persons|individuals|arrests|charges)/i, // Counts
  /was\s+\w+ed\b/i,                 // Past tense actions (was killed, was arrested)
  /were\s+\w+ed\b/i,                // Plural past tense
  /according\s+to/i,                // Attribution phrases
  /confirmed|revealed|reported|stated|said|announced/i, // Reporting verbs
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d/i, // Dates
  /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i, // Days
  /\b\d{1,2}:\d{2}\s*(AM|PM|am|pm)?\b/, // Times
  /\b(found|discovered|identified|determined|concluded)\b/i, // Finding verbs
  /\b(charged|convicted|arrested|released|sentenced)\b/i, // Legal actions
];

// Patterns that indicate a line is NOT factual content (skip these)
const NON_FACTUAL_PATTERNS = [
  /^#+\s/,                          // Markdown headings
  /^[-*]\s*$/,                      // Empty list items
  /^\s*\|.*\|\s*$/,                 // Table formatting
  /^[-=]+$/,                        // Horizontal rules
  /^\*\*.*\*\*\s*$/,                // Bold-only lines (headers)
  /^\s*$/,                          // Empty lines
  /^---+$/,                         // Separators
  /^\*[^*]+\*$/,                    // Italic-only metadata
  /^Case\s*ID:/i,                   // Metadata
  /^Investigation\s*(Date|ID|Status):/i, // Metadata
  /^Status:/i,                      // Metadata
  /^Total\s*(Claims|Sources|Tasks):/i, // Statistics headers
  /^\s*\|\s*[-:]+\s*\|/,            // Table header separators
];

// Sections that MUST have citations
const REQUIRED_CITATION_SECTIONS = [
  'Key Findings',
  'Timeline',
  'Background',
  'Evidence',
  'Conclusion'
];

/**
 * Check if a line contains factual content
 */
function isFactualLine(line) {
  const trimmed = line.trim();

  // Skip non-factual patterns
  for (const pattern of NON_FACTUAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }

  // Skip very short lines (likely not factual statements)
  if (trimmed.length < 30) {
    return false;
  }

  // Check for factual patterns
  for (const pattern of FACTUAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  // Check for proper nouns (capitalized words that aren't sentence starters)
  const words = trimmed.split(/\s+/);
  const properNouns = words.filter((w, i) => {
    if (i === 0) return false; // Skip first word
    return /^[A-Z][a-z]+/.test(w) && !['The', 'This', 'That', 'These', 'Those', 'They', 'When', 'Where', 'Which', 'While'].includes(w);
  });

  if (properNouns.length >= 2) {
    return true;
  }

  return false;
}

/**
 * Check if a line has a source citation
 */
function hasCitation(line) {
  return /\[S\d{3,4}\]/.test(line);
}

/**
 * Extract current section from context
 */
function getCurrentSection(lines, lineIndex) {
  for (let i = lineIndex; i >= 0; i--) {
    const match = lines[i].match(/^#+\s+(.+)/);
    if (match) {
      return match[1].trim();
    }
  }
  return 'Unknown';
}

/**
 * Analyze summary.md for citation density
 */
function analyzeCitationDensity(summaryPath) {
  const content = fs.readFileSync(summaryPath, 'utf-8');
  const lines = content.split('\n');

  const result = {
    total_lines: lines.length,
    factual_lines: [],
    cited_lines: [],
    uncited_lines: [],
    sections: {},
    citation_density: 0,
    total_citations: 0,
    unique_sources: new Set()
  };

  // Count total citations
  const citationMatches = content.match(/\[S\d{3,4}\]/g) || [];
  result.total_citations = citationMatches.length;

  // Extract unique sources
  for (const match of citationMatches) {
    const sourceId = match.match(/\[S(\d{3,4})\]/)[1];
    result.unique_sources.add(`S${sourceId}`);
  }

  // Analyze each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isFactualLine(line)) {
      const section = getCurrentSection(lines, i);
      const cited = hasCitation(line);

      const lineInfo = {
        line_number: i + 1,
        text: line.trim().substring(0, 100) + (line.trim().length > 100 ? '...' : ''),
        section,
        cited
      };

      result.factual_lines.push(lineInfo);

      if (cited) {
        result.cited_lines.push(lineInfo);
      } else {
        result.uncited_lines.push(lineInfo);
      }

      // Track by section
      if (!result.sections[section]) {
        result.sections[section] = { total: 0, cited: 0, uncited: [] };
      }
      result.sections[section].total++;
      if (cited) {
        result.sections[section].cited++;
      } else {
        result.sections[section].uncited.push(lineInfo);
      }
    }
  }

  // Calculate density
  if (result.factual_lines.length > 0) {
    result.citation_density = result.cited_lines.length / result.factual_lines.length;
  }

  result.unique_sources = Array.from(result.unique_sources);

  return result;
}

/**
 * Check for required sections with citations
 */
function checkRequiredSections(analysis) {
  const warnings = [];

  for (const section of REQUIRED_CITATION_SECTIONS) {
    // Find matching section (case-insensitive, partial match)
    const matchingSection = Object.keys(analysis.sections).find(s =>
      s.toLowerCase().includes(section.toLowerCase())
    );

    if (matchingSection) {
      const sectionData = analysis.sections[matchingSection];
      if (sectionData.total > 0 && sectionData.cited === 0) {
        warnings.push(`Section "${matchingSection}" has ${sectionData.total} factual lines but ZERO citations`);
      }
    }
  }

  return warnings;
}

function run(caseDir) {
  const startTime = Date.now();
  const summaryPath = path.join(caseDir, 'summary.md');

  if (!fs.existsSync(summaryPath)) {
    const failures = ['summary.md not found'];
    return {
      timestamp: new Date().toISOString(),
      case_dir: caseDir,
      duration_ms: Date.now() - startTime,
      passed: false,
      citation_density: 0,
      threshold: CITATION_DENSITY_THRESHOLD * 100,
      stats: {
        total_lines: 0,
        factual_lines: 0,
        cited_lines: 0,
        uncited_lines: 0,
        total_citations: 0,
        unique_sources: 0
      },
      failures,
      gaps: [{
        type: 'UNCITED_ASSERTION',
        object: { file: 'summary.md' },
        message: failures[0],
        suggested_actions: ['create_summary', 'add_citations']
      }],
      sections: [],
      uncited_samples: []
    };
  }

  const analysis = analyzeCitationDensity(summaryPath);
  const sectionWarnings = checkRequiredSections(analysis);

  // Determine pass/fail
  const passed = analysis.citation_density >= CITATION_DENSITY_THRESHOLD;
  const failures = [];

  if (!passed) {
    failures.push(`Citation density ${(analysis.citation_density * 100).toFixed(1)}% below threshold ${(CITATION_DENSITY_THRESHOLD * 100)}%`);
  }

  if (analysis.factual_lines.length > 0 && analysis.total_citations === 0) {
    failures.push('summary.md has ZERO source citations - every fact must be cited');
  }

  if (analysis.uncited_lines.length > 0) {
    failures.push(`${analysis.uncited_lines.length} factual statements without citations`);
  }

  failures.push(...sectionWarnings);

  const overallPassed = failures.length === 0;
  const gaps = overallPassed ? [] : [{
    type: 'UNCITED_ASSERTION',
    object: {
      file: 'summary.md',
      citation_density: Math.round(analysis.citation_density * 1000) / 10,
      threshold: CITATION_DENSITY_THRESHOLD * 100,
      factual_lines: analysis.factual_lines.length,
      uncited_lines: analysis.uncited_lines.length
    },
    message: failures.join('; '),
    suggested_actions: ['add_citations', 'recapture_sources', 'revise_summary']
  }];

  return {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    passed: overallPassed,
    citation_density: Math.round(analysis.citation_density * 1000) / 10,
    threshold: CITATION_DENSITY_THRESHOLD * 100,
    stats: {
      total_lines: analysis.total_lines,
      factual_lines: analysis.factual_lines.length,
      cited_lines: analysis.cited_lines.length,
      uncited_lines: analysis.uncited_lines.length,
      total_citations: analysis.total_citations,
      unique_sources: analysis.unique_sources.length
    },
    failures,
    gaps,
    sections: Object.entries(analysis.sections).map(([name, data]) => ({
      name,
      factual_lines: data.total,
      cited: data.cited,
      density: data.total > 0 ? Math.round((data.cited / data.total) * 100) : 0
    })),
    uncited_samples: analysis.uncited_lines.slice(0, 10).map(l => ({
      line: l.line_number,
      section: l.section,
      text: l.text
    }))
  };
}

function printHuman(output, { verbose }) {
  console.log('='.repeat(70));
  console.log(`${BOLD}Citation Density Verification${NC}`);
  console.log('='.repeat(70));
  console.log(`Case: ${output.case_dir}`);
  console.log(`File: summary.md`);
  console.log('');

  console.log(`${BLUE}Statistics:${NC}`);
  console.log(`  Total lines:        ${output.stats.total_lines}`);
  console.log(`  Factual lines:      ${output.stats.factual_lines}`);
  console.log(`  With citations:     ${output.stats.cited_lines}`);
  console.log(`  Without citations:  ${output.stats.uncited_lines}`);
  console.log(`  Total [SXXX] refs:  ${output.stats.total_citations}`);
  console.log(`  Unique sources:     ${output.stats.unique_sources}`);
  console.log('');

  const densityColor = (output.citation_density / 100) >= CITATION_DENSITY_THRESHOLD ? GREEN : RED;
  console.log(`${BOLD}Citation Density:${NC} ${densityColor}${output.citation_density.toFixed(1)}%${NC} (threshold: ${output.threshold}%)`);
  console.log('');

  console.log(`${BLUE}Section Breakdown:${NC}`);
  for (const section of output.sections) {
    const color = section.density >= 80 ? GREEN : (section.density >= 50 ? YELLOW : RED);
    console.log(`  ${section.name.padEnd(30)} ${section.cited}/${section.factual_lines} ${color}(${section.density}%)${NC}`);
  }
  console.log('');

  if (verbose && output.uncited_samples.length > 0) {
    console.log(`${RED}Uncited Factual Lines (sample):${NC}`);
    for (const line of output.uncited_samples) {
      console.log(`  ${YELLOW}Line ${line.line}${NC} [${line.section}]`);
      console.log(`    "${line.text}"`);
    }
    console.log('');
  }

  console.log('='.repeat(70));
  if (output.passed) {
    console.log(`${GREEN}${BOLD}PASS${NC}: Citation density meets threshold`);
  } else {
    console.log(`${RED}${BOLD}FAIL${NC}: Citation density requirements not met`);
    console.log('');
    console.log('Failures:');
    for (const failure of output.failures) {
      console.log(`  ${RED}!${NC} ${failure}`);
    }
  }
  console.log('='.repeat(70));
}

function cli() {
  const { caseDir, jsonOutput, verbose } = parseCliArgs(process.argv);

  if (!caseDir) {
    console.error('Usage: node verify-citation-density.js <case_dir> [--json] [--verbose]');
    process.exit(1);
  }

  const output = run(caseDir);

  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    printHuman(output, { verbose });
  }

  process.exit(output.passed ? 0 : 1);
}

module.exports = { run };

if (require.main === module) {
  cli();
}
