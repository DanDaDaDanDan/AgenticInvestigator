#!/usr/bin/env node
/**
 * init-case.js - Create new investigation case with 35 framework files
 *
 * Usage:
 *   node scripts/init-case.js "short-case-name" "full topic description"
 *   node scripts/init-case.js "short-case-name"  # topic defaults to case name
 *
 * The first argument is the case name (max 5 words, used for folder name).
 * The second argument is the full topic description (stored in state.json).
 *
 * Creates a new case directory and commits to the DATA repository (cases/.git).
 *
 * IMPORTANT: This project has TWO git repositories:
 * - CODE repo: Root .git (scripts, skills, docs)
 * - DATA repo: cases/.git (all investigation data)
 *
 * This script commits to the DATA repo only.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 35 frameworks from reference/frameworks.md
const FRAMEWORKS = [
  { num: '01', slug: 'follow-the-money', name: 'Follow the Money' },
  { num: '02', slug: 'follow-the-silence', name: 'Follow the Silence' },
  { num: '03', slug: 'follow-the-timeline', name: 'Follow the Timeline' },
  { num: '04', slug: 'follow-the-documents', name: 'Follow the Documents' },
  { num: '05', slug: 'follow-the-contradictions', name: 'Follow the Contradictions' },
  { num: '06', slug: 'follow-the-relationships', name: 'Follow the Relationships' },
  { num: '07', slug: 'stakeholder-mapping', name: 'Stakeholder Mapping' },
  { num: '08', slug: 'network-analysis', name: 'Network Analysis' },
  { num: '09', slug: 'means-motive-opportunity', name: 'Means / Motive / Opportunity' },
  { num: '10', slug: 'competing-hypotheses', name: 'Competing Hypotheses' },
  { num: '11', slug: 'assumptions-check', name: 'Assumptions Check' },
  { num: '12', slug: 'pattern-analysis', name: 'Pattern Analysis' },
  { num: '13', slug: 'counterfactual', name: 'Counterfactual' },
  { num: '14', slug: 'pre-mortem', name: 'Pre-Mortem' },
  { num: '15', slug: 'cognitive-bias-check', name: 'Cognitive Bias Check' },
  { num: '16', slug: 'uncomfortable-questions', name: 'Uncomfortable Questions' },
  { num: '17', slug: 'second-order-effects', name: 'Second-Order Effects' },
  { num: '18', slug: 'meta-questions', name: 'Meta Questions' },
  { num: '19', slug: '5-whys-root-cause', name: '5 Whys (Root Cause)' },
  { num: '20', slug: 'sense-making', name: 'Sense-Making' },
  { num: '21', slug: 'first-principles-scientific-reality', name: 'First Principles / Scientific Reality' },
  { num: '22', slug: 'domain-expert-blind-spots', name: 'Domain Expert Blind Spots' },
  { num: '23', slug: 'marketing-vs-scientific-reality', name: 'Marketing vs Scientific Reality' },
  { num: '24', slug: 'subject-experience-ground-truth', name: 'Subject Experience / Ground Truth' },
  { num: '25', slug: 'contrarian-expert-search', name: 'Contrarian Expert Search' },
  { num: '26', slug: 'quantification-base-rates', name: 'Quantification & Base Rates' },
  { num: '27', slug: 'causation-vs-correlation', name: 'Causation vs Correlation' },
  { num: '28', slug: 'definitional-analysis', name: 'Definitional Analysis' },
  { num: '29', slug: 'methodology-audit', name: 'Methodology Audit' },
  { num: '30', slug: 'incentive-mapping', name: 'Incentive Mapping' },
  { num: '31', slug: 'information-asymmetry', name: 'Information Asymmetry' },
  { num: '32', slug: 'comparative-benchmarking', name: 'Comparative Benchmarking' },
  { num: '33', slug: 'regulatory-institutional-capture', name: 'Regulatory & Institutional Capture' },
  { num: '34', slug: 'data-provenance-chain-of-custody', name: 'Data Provenance & Chain of Custody' },
  { num: '35', slug: 'mechanism-tracing', name: 'Mechanism Tracing' },
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createQuestionFile(framework) {
  return `# ${framework.num}: ${framework.name}

**Status:** pending

---

## Questions

*Questions will be answered during the QUESTION phase.*

---

## Leads Generated

*Leads will be added as questions reveal areas needing further investigation.*
`;
}

function createStateJson(caseSlug, topic) {
  return JSON.stringify({
    case: caseSlug,
    topic: topic,
    phase: 'PLAN',
    iteration: 1,
    next_source: 1,
    planning: {
      step: 0,
      refined_prompt: false,
      strategic_context: false,
      investigation_plan: false
    },
    planning_todos: [],
    gates: {
      planning: false,
      questions: false,
      curiosity: false,
      reconciliation: false,
      article: false,
      sources: false,
      integrity: false,
      legal: false,
      balance: false,
      completeness: false,
      significance: false
    }
  }, null, 2);
}

function createSourcesJson() {
  return JSON.stringify({
    sources: []
  }, null, 2);
}

function createLeadsJson() {
  return JSON.stringify({
    max_depth: 3,
    leads: []
  }, null, 2);
}

function createClaimsJson() {
  return JSON.stringify({
    version: 1,
    created_at: new Date().toISOString(),
    claims: []
  }, null, 2);
}

function createFutureResearchMd() {
  return `# Future Research

Leads beyond max_depth that merit future investigation.

---

*No leads deferred yet.*
`;
}

function createFindingsManifest() {
  return JSON.stringify({
    version: 1,
    created_at: new Date().toISOString(),
    assembly_order: ["F001"],
    sections: {
      "background": ["F001"]
    }
  }, null, 2);
}

function createInitialFinding(topic) {
  const now = new Date().toISOString().split('T')[0];
  return `---
id: F001
status: draft
created: ${now}
updated: ${now}
sources: []
supersedes: null
superseded_by: null
confidence: low
related_leads: []
---

# Finding: Investigation Background

## Topic
${topic}

## Initial Context
*Context will be populated during the RESEARCH phase.*

## Key Questions
*Questions to be answered will be identified during the PLAN phase.*
`;
}

function createRemovedPointsMd() {
  return `# Removed Points

Points removed during verification due to unverifiable sources.

---

  *No points removed yet.*
`;
}

/**
 * Programmatic entry point (used by tests). Creates a new case under rootDir/cases/.
 *
 * @param {object} options
 * @param {string} options.rootDir
 * @param {string} options.caseName
 * @param {string} options.topic
 * @param {boolean} options.skipGitCommit
 * @returns {{caseSlug: string, casePath: string}}
 */
function initCase({ rootDir, caseName, topic, skipGitCommit = false }) {
  const caseSlug = slugify(caseName);
  const casePath = path.join(rootDir, 'cases', caseSlug);

  // Check if case already exists
  if (fs.existsSync(casePath)) {
    throw new Error(`Case already exists at ${casePath}`);
  }

  console.log(`Creating case: ${caseSlug}`);
  console.log(`Case name: ${caseName}`);
  console.log(`Full topic: ${topic}`);
  console.log(`Path: ${casePath}`);
  console.log('');

  // Create directory structure
  const dirs = [
    casePath,
    path.join(casePath, 'findings'),
    path.join(casePath, 'questions'),
    path.join(casePath, 'evidence'),
    path.join(casePath, 'articles'),
    path.join(casePath, 'analysis')
  ];

  dirs.forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created: ${path.relative(rootDir, dir)}/`);
  });

  // Create state.json (always starts at PLAN phase)
  fs.writeFileSync(
    path.join(casePath, 'state.json'),
    createStateJson(caseSlug, topic)
  );
  console.log('Created: state.json (phase: PLAN)');

  // Create sources.json
  fs.writeFileSync(
    path.join(casePath, 'sources.json'),
    createSourcesJson()
  );
  console.log('Created: sources.json');

  // Create leads.json
  fs.writeFileSync(
    path.join(casePath, 'leads.json'),
    createLeadsJson()
  );
  console.log('Created: leads.json');

  // Create claims.json (claim registry)
  fs.writeFileSync(
    path.join(casePath, 'claims.json'),
    createClaimsJson()
  );
  console.log('Created: claims.json (claim registry)');

  // Create findings/manifest.json
  fs.writeFileSync(
    path.join(casePath, 'findings', 'manifest.json'),
    createFindingsManifest()
  );
  console.log('Created: findings/manifest.json');

  // Create initial finding F001
  fs.writeFileSync(
    path.join(casePath, 'findings', 'F001.md'),
    createInitialFinding(topic)
  );
  console.log('Created: findings/F001.md (initial finding)');

  // Create removed-points.md
  fs.writeFileSync(
    path.join(casePath, 'removed-points.md'),
    createRemovedPointsMd()
  );
  console.log('Created: removed-points.md');

  // Create future_research.md
  fs.writeFileSync(
    path.join(casePath, 'future_research.md'),
    createFutureResearchMd()
  );
  console.log('Created: future_research.md');

  // Create 35 question files
  console.log('');
  console.log('Creating 35 framework question files...');

  FRAMEWORKS.forEach(framework => {
    const filename = `${framework.num}-${framework.slug}.md`;
    fs.writeFileSync(
      path.join(casePath, 'questions', filename),
      createQuestionFile(framework)
    );
  });

  console.log('Created: questions/ (35 files)');

  // Update .active file to point to new case
  const activePath = path.join(rootDir, 'cases', '.active');
  fs.writeFileSync(activePath, caseSlug);
  console.log(`Updated: .active → ${caseSlug}`);

  // Commit to DATA repository (cases/.git)
  if (!skipGitCommit) {
    console.log('');
    console.log('Committing to DATA repository (cases/.git)...');
    try {
      const casesDir = path.join(rootDir, 'cases');
      execSync('git add -A', { cwd: casesDir, stdio: 'pipe' });
      execSync(`git commit -m "Initialize investigation: ${topic}"`, { cwd: casesDir, stdio: 'pipe' });
      console.log('Committed to cases/.git');
    } catch (err) {
      console.error('Warning: Git commit failed (cases/.git may not exist or no changes)');
      console.error(err.message);
    }
  }

  // Summary
  console.log('');
  console.log('='.repeat(50));
  console.log('Case initialized successfully!');
  console.log('');
  console.log('Repository: DATA (cases/.git)');
  console.log('');
  console.log('Structure:');
  console.log(`  cases/${caseSlug}/`);
  console.log('  ├── state.json         (phase: PLAN)');
  console.log('  ├── findings/          (decomposed findings)');
  console.log('  │   ├── manifest.json');
  console.log('  │   └── F001.md');
  console.log('  ├── sources.json');
  console.log('  ├── leads.json         (max_depth: 3)');
  console.log('  ├── claims.json        (claim registry)');
  console.log('  ├── removed-points.md');
  console.log('  ├── future_research.md');
  console.log('  ├── questions/         (35 framework files)');
  console.log('  ├── evidence/');
  console.log('  ├── articles/');
  console.log('  └── analysis/');
  console.log('');
  console.log('Next step: /action plan-investigation');

  return { caseSlug, casePath };
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node scripts/init-case.js "short-case-name" "full topic description"');
    console.error('       node scripts/init-case.js "short-case-name"  # topic defaults to case name');
    process.exit(1);
  }

  const caseName = args[0];
  const topic = args.length > 1 ? args.slice(1).join(' ') : caseName;

  try {
    initCase({ rootDir: process.cwd(), caseName, topic, skipGitCommit: false });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  initCase,
  slugify
};
