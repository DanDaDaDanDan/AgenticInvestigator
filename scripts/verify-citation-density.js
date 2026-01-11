#!/usr/bin/env node
/**
 * verify-citation-density.js - Structural citation verification
 *
 * ARCHITECTURE NOTE:
 * This script handles STRUCTURAL checks only:
 * - Does summary.md exist?
 * - Does it have any [SXXX] citations?
 * - How many total citations and unique sources?
 *
 * SEMANTIC checks (is every factual claim cited?) are handled by
 * LLM verification via Gemini 3 Pro MCP calls. The LLM understands
 * what constitutes a "factual claim" better than regex patterns.
 * See .claude/commands/verify.md for semantic verification criteria.
 *
 * Usage:
 *   node scripts/verify-citation-density.js <case_dir>
 *   node scripts/verify-citation-density.js <case_dir> --json
 */

const fs = require('fs');
const path = require('path');
const config = require('./lib/config-loader');

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
    jsonOutput: args.includes('--json')
  };
}

/**
 * Analyze summary.md for citation presence (structural check)
 */
function analyzeCitations(summaryPath) {
  const content = fs.readFileSync(summaryPath, 'utf-8');
  const lines = content.split('\n');

  // Use structural citation counting from config-loader
  const { count: totalCitations, unique: uniqueSources } = config.countCitations(content);

  // Count lines with citations (structural)
  let linesWithCitations = 0;
  const citationPattern = config.patterns.citation_format;

  for (const line of lines) {
    citationPattern.lastIndex = 0;
    if (citationPattern.test(line)) {
      linesWithCitations++;
    }
  }

  return {
    total_lines: lines.length,
    lines_with_citations: linesWithCitations,
    total_citations: totalCitations,
    unique_sources: Array.from(uniqueSources)
  };
}

function run(caseDir) {
  const startTime = Date.now();
  const summaryPath = path.join(caseDir, 'summary.md');

  if (!fs.existsSync(summaryPath)) {
    return {
      timestamp: new Date().toISOString(),
      case_dir: caseDir,
      duration_ms: Date.now() - startTime,
      passed: false,
      stats: {
        total_lines: 0,
        lines_with_citations: 0,
        total_citations: 0,
        unique_sources: 0
      },
      gaps: [{
        type: 'UNCITED_ASSERTION',
        object: { file: 'summary.md' },
        message: 'summary.md not found',
        suggested_actions: ['create_summary', 'add_citations']
      }],
      note: 'Semantic checks (factual claim coverage) handled by LLM verification'
    };
  }

  const analysis = analyzeCitations(summaryPath);

  // Structural check: summary must have at least some citations
  const gaps = [];
  let passed = true;

  if (analysis.total_citations === 0) {
    passed = false;
    gaps.push({
      type: 'UNCITED_ASSERTION',
      object: {
        file: 'summary.md',
        total_citations: 0,
        unique_sources: 0
      },
      message: 'summary.md has ZERO [SXXX] citations - sources must be cited',
      suggested_actions: ['add_citations', 'recapture_sources', 'revise_summary']
    });
  }

  return {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    passed,
    stats: {
      total_lines: analysis.total_lines,
      lines_with_citations: analysis.lines_with_citations,
      total_citations: analysis.total_citations,
      unique_sources: analysis.unique_sources.length
    },
    unique_source_ids: analysis.unique_sources,
    gaps,
    note: 'Semantic checks (factual claim coverage) handled by LLM verification'
  };
}

function printHuman(output) {
  console.log('='.repeat(70));
  console.log(`${BOLD}Citation Verification (Structural)${NC}`);
  console.log('='.repeat(70));
  console.log(`Case: ${output.case_dir}`);
  console.log(`File: summary.md`);
  console.log('');

  console.log(`${BLUE}Statistics:${NC}`);
  console.log(`  Total lines:          ${output.stats.total_lines}`);
  console.log(`  Lines with citations: ${output.stats.lines_with_citations}`);
  console.log(`  Total [SXXX] refs:    ${output.stats.total_citations}`);
  console.log(`  Unique sources:       ${output.stats.unique_sources}`);
  console.log('');

  if (output.unique_source_ids && output.unique_source_ids.length > 0) {
    console.log(`${BLUE}Sources cited:${NC} ${output.unique_source_ids.join(', ')}`);
    console.log('');
  }

  console.log(`${YELLOW}NOTE:${NC} Semantic verification (are all factual claims cited?) is`);
  console.log('handled by LLM verification via Gemini 3 Pro. Run /verify for full check.');
  console.log('');

  console.log('='.repeat(70));
  if (output.passed) {
    console.log(`${GREEN}${BOLD}PASS${NC}: Summary has citations`);
  } else {
    console.log(`${RED}${BOLD}FAIL${NC}: Citation requirements not met`);
    console.log('');
    console.log('Issues:');
    for (const gap of output.gaps) {
      console.log(`  ${RED}!${NC} ${gap.message}`);
    }
  }
  console.log('='.repeat(70));
}

function cli() {
  const { caseDir, jsonOutput } = parseCliArgs(process.argv);

  if (!caseDir) {
    console.error('Usage: node scripts/verify-citation-density.js <case_dir> [--json]');
    process.exit(1);
  }

  const output = run(caseDir);

  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    printHuman(output);
  }

  process.exit(output.passed ? 0 : 1);
}

module.exports = { run };

if (require.main === module) {
  cli();
}
