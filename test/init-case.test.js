/**
 * Tests for init-case.js
 *
 * Verifies that case initialization creates the correct v2 structure.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const INIT_SCRIPT = path.join(ROOT, 'scripts', 'init-case.js');

// Expected 35 frameworks
const EXPECTED_FRAMEWORKS = [
  '01-follow-the-money',
  '02-follow-the-silence',
  '03-follow-the-timeline',
  '04-follow-the-documents',
  '05-follow-the-contradictions',
  '06-follow-the-relationships',
  '07-stakeholder-mapping',
  '08-network-analysis',
  '09-means-motive-opportunity',
  '10-competing-hypotheses',
  '11-assumptions-check',
  '12-pattern-analysis',
  '13-counterfactual',
  '14-pre-mortem',
  '15-cognitive-bias-check',
  '16-uncomfortable-questions',
  '17-second-order-effects',
  '18-meta-questions',
  '19-5-whys-root-cause',
  '20-sense-making',
  '21-first-principles-scientific-reality',
  '22-domain-expert-blind-spots',
  '23-marketing-vs-scientific-reality',
  '24-subject-experience-ground-truth',
  '25-contrarian-expert-search',
  '26-quantification-base-rates',
  '27-causation-vs-correlation',
  '28-definitional-analysis',
  '29-methodology-audit',
  '30-incentive-mapping',
  '31-information-asymmetry',
  '32-comparative-benchmarking',
  '33-regulatory-institutional-capture',
  '34-data-provenance-chain-of-custody',
  '35-mechanism-tracing',
];

/**
 * Create a temporary directory for test cases
 */
function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agenticinvestigator-test-'));
}

/**
 * Run init-case.js with given case name and optional full topic in specified directory
 */
function runInitCase(caseName, cwd, fullTopic = null) {
  const topicArg = fullTopic ? ` "${fullTopic}"` : '';
  execSync(`node "${INIT_SCRIPT}" "${caseName}"${topicArg}`, { cwd, stdio: 'pipe' });
}

test('init-case.js creates correct directory structure', async (t) => {
  const tempDir = createTempDir();
  const casesDir = path.join(tempDir, 'cases');
  fs.mkdirSync(casesDir);

  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  runInitCase('Test Topic Here', tempDir);

  const caseDir = path.join(casesDir, 'test-topic-here');

  // Check directories exist
  assert.ok(fs.existsSync(caseDir), 'Case directory should exist');
  assert.ok(fs.existsSync(path.join(caseDir, 'questions')), 'questions/ should exist');
  assert.ok(fs.existsSync(path.join(caseDir, 'evidence')), 'evidence/ should exist');
  assert.ok(fs.existsSync(path.join(caseDir, 'articles')), 'articles/ should exist');

  // Check files exist
  assert.ok(fs.existsSync(path.join(caseDir, 'state.json')), 'state.json should exist');
  assert.ok(fs.existsSync(path.join(caseDir, 'sources.json')), 'sources.json should exist');
  assert.ok(fs.existsSync(path.join(caseDir, 'leads.json')), 'leads.json should exist');
  assert.ok(fs.existsSync(path.join(caseDir, 'findings')), 'findings/ should exist');
  assert.ok(fs.existsSync(path.join(caseDir, 'findings', 'manifest.json')), 'findings/manifest.json should exist');
  assert.ok(fs.existsSync(path.join(caseDir, 'findings', 'F001.md')), 'findings/F001.md should exist');
  assert.ok(fs.existsSync(path.join(caseDir, 'removed-points.md')), 'removed-points.md should exist');

  // Check manifest contains F001 in assembly_order
  const manifest = JSON.parse(fs.readFileSync(path.join(caseDir, 'findings', 'manifest.json'), 'utf-8'));
  assert.ok(manifest.assembly_order.includes('F001'), 'manifest should include F001 in assembly_order');
  assert.ok(manifest.sections.background.includes('F001'), 'manifest should include F001 in background section');
});

test('init-case.js creates valid state.json with v2 schema', async (t) => {
  const tempDir = createTempDir();
  const casesDir = path.join(tempDir, 'cases');
  fs.mkdirSync(casesDir);

  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  runInitCase('Schema Test', tempDir);

  const stateFile = path.join(casesDir, 'schema-test', 'state.json');
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));

  // Check required fields
  assert.equal(state.case, 'schema-test', 'case field should match slug');
  assert.equal(state.topic, 'Schema Test', 'topic field should match input');
  assert.equal(state.phase, 'PLAN', 'phase should always start as PLAN');
  assert.equal(state.iteration, 1, 'iteration should be 1');
  assert.equal(state.next_source, 1, 'next_source should be 1');

  // Check gates
  assert.ok(typeof state.gates === 'object', 'gates should be an object');
  const expectedGates = ['planning', 'questions', 'curiosity', 'reconciliation', 'article', 'sources', 'integrity', 'legal', 'balance', 'completeness', 'significance'];
  for (const gate of expectedGates) {
    assert.ok(gate in state.gates, `gates.${gate} should exist`);
    assert.equal(state.gates[gate], false, `gates.${gate} should be false`);
  }
  assert.equal(Object.keys(state.gates).length, 11, 'should have exactly 11 gates');
});

test('init-case.js stores full topic separately from short case name', async (t) => {
  const tempDir = createTempDir();
  const casesDir = path.join(tempDir, 'cases');
  fs.mkdirSync(casesDir);

  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  // Pass short name and full topic as separate arguments
  const shortName = 'fda-pharma-influence';
  const fullTopic = 'How does the pharmaceutical industry influence FDA drug approval processes?';
  runInitCase(shortName, tempDir, fullTopic);

  const stateFile = path.join(casesDir, 'fda-pharma-influence', 'state.json');
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));

  assert.equal(state.case, 'fda-pharma-influence', 'case field should be short slug');
  assert.equal(state.topic, fullTopic, 'topic field should be full description');
});

test('init-case.js creates valid sources.json', async (t) => {
  const tempDir = createTempDir();
  const casesDir = path.join(tempDir, 'cases');
  fs.mkdirSync(casesDir);

  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  runInitCase('Sources Test', tempDir);

  const sourcesFile = path.join(casesDir, 'sources-test', 'sources.json');
  const sources = JSON.parse(fs.readFileSync(sourcesFile, 'utf-8'));

  assert.ok(typeof sources === 'object', 'sources.json should be an object');
  assert.ok(Array.isArray(sources.sources), 'sources.sources should be an array');
  assert.equal(sources.sources.length, 0, 'sources should be empty initially');
});

test('init-case.js creates valid leads.json', async (t) => {
  const tempDir = createTempDir();
  const casesDir = path.join(tempDir, 'cases');
  fs.mkdirSync(casesDir);

  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  runInitCase('Leads Test', tempDir);

  const leadsFile = path.join(casesDir, 'leads-test', 'leads.json');
  const leads = JSON.parse(fs.readFileSync(leadsFile, 'utf-8'));

  assert.ok(typeof leads === 'object', 'leads.json should be an object');
  assert.ok(Array.isArray(leads.leads), 'leads.leads should be an array');
  assert.equal(leads.leads.length, 0, 'leads should be empty initially');
});

test('init-case.js creates all 35 framework question files', async (t) => {
  const tempDir = createTempDir();
  const casesDir = path.join(tempDir, 'cases');
  fs.mkdirSync(casesDir);

  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  runInitCase('Frameworks Test', tempDir);

  const questionsDir = path.join(casesDir, 'frameworks-test', 'questions');
  const files = fs.readdirSync(questionsDir);

  assert.equal(files.length, 35, 'should have exactly 35 framework files');

  for (const framework of EXPECTED_FRAMEWORKS) {
    const filename = `${framework}.md`;
    assert.ok(files.includes(filename), `${filename} should exist`);
  }
});

test('init-case.js framework files have correct structure', async (t) => {
  const tempDir = createTempDir();
  const casesDir = path.join(tempDir, 'cases');
  fs.mkdirSync(casesDir);

  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  runInitCase('Framework Content Test', tempDir);

  const questionsDir = path.join(casesDir, 'framework-content-test', 'questions');

  // Check first framework file structure
  const firstFramework = fs.readFileSync(
    path.join(questionsDir, '01-follow-the-money.md'),
    'utf-8'
  );

  assert.ok(firstFramework.includes('# 01: Follow the Money'), 'should have framework title');
  assert.ok(firstFramework.includes('**Status:** pending'), 'should have pending status');
  assert.ok(firstFramework.includes('## Questions'), 'should have Questions section');
  assert.ok(firstFramework.includes('## Leads Generated'), 'should have Leads section');
});

test('init-case.js slugifies topic correctly', async (t) => {
  const tempDir = createTempDir();
  const casesDir = path.join(tempDir, 'cases');
  fs.mkdirSync(casesDir);

  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  runInitCase('Complex Topic: With Special Ch@rs & Numbers 123!', tempDir);

  const expectedSlug = 'complex-topic-with-special-ch-rs-numbers-123';
  const caseDir = path.join(casesDir, expectedSlug);

  assert.ok(fs.existsSync(caseDir), `Case directory should be slugified to: ${expectedSlug}`);
});

test('init-case.js fails if case already exists', async (t) => {
  const tempDir = createTempDir();
  const casesDir = path.join(tempDir, 'cases');
  fs.mkdirSync(casesDir);

  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  // Create first case
  runInitCase('Duplicate Test', tempDir);

  // Try to create same case again
  assert.throws(
    () => runInitCase('Duplicate Test', tempDir),
    /already exists/i,
    'Should fail when case already exists'
  );
});
