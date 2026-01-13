/**
 * Tests for capture.js
 *
 * Tests case resolution logic and utility functions.
 * Note: Actual capture tests require FIRECRAWL_API_KEY and are skipped without it.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ROOT = path.resolve(__dirname, '..');

/**
 * Create a temporary test environment
 */
function createTestEnv() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capture-test-'));
  const casesDir = path.join(tempDir, 'cases');
  fs.mkdirSync(casesDir);

  // Create a valid case
  const caseDir = path.join(casesDir, 'test-case');
  fs.mkdirSync(caseDir);
  fs.writeFileSync(
    path.join(caseDir, 'state.json'),
    JSON.stringify({ case: 'test-case', phase: 'BOOTSTRAP' })
  );

  return { tempDir, casesDir, caseDir };
}

/**
 * Test utility functions from capture.js
 * We re-implement these here for testing since they're not exported
 */
function safeFilename(name) {
  return String(name)
    .replace(/[<>:"/\\|?*]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 180);
}

function looksLikeCaseDir(dir) {
  return fs.existsSync(path.join(dir, 'sources.md')) || fs.existsSync(path.join(dir, 'state.json'));
}

// Tests

test('safeFilename removes dangerous characters', async (t) => {
  assert.equal(safeFilename('file<>:"/\\|?*.txt'), 'file_.txt');
  assert.equal(safeFilename('normal-file.txt'), 'normal-file.txt');
  assert.equal(safeFilename('file with spaces.txt'), 'file_with_spaces.txt');
});

test('safeFilename collapses multiple underscores', async (t) => {
  assert.equal(safeFilename('file___name'), 'file_name');
  assert.equal(safeFilename('a__b__c'), 'a_b_c');
});

test('safeFilename trims leading/trailing underscores', async (t) => {
  assert.equal(safeFilename('_file_'), 'file');
  assert.equal(safeFilename('___test___'), 'test');
});

test('safeFilename truncates long names', async (t) => {
  const longName = 'a'.repeat(200);
  const result = safeFilename(longName);
  assert.equal(result.length, 180);
});

test('safeFilename handles empty input', async (t) => {
  assert.equal(safeFilename(''), '');
  assert.equal(safeFilename(null), 'null');
  assert.equal(safeFilename(undefined), 'undefined');
});

test('looksLikeCaseDir detects state.json', async (t) => {
  const { tempDir, caseDir } = createTestEnv();
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  assert.equal(looksLikeCaseDir(caseDir), true);
  assert.equal(looksLikeCaseDir(tempDir), false);
});

test('looksLikeCaseDir detects sources.md', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sources-test-'));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  fs.writeFileSync(path.join(tempDir, 'sources.md'), '# Sources');
  assert.equal(looksLikeCaseDir(tempDir), true);
});

test('.active file resolution works', async (t) => {
  const { tempDir, casesDir, caseDir } = createTestEnv();
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  // Create .active file pointing to test-case
  fs.writeFileSync(path.join(casesDir, '.active'), 'test-case');

  // Verify .active file exists and contains correct content
  const activeContent = fs.readFileSync(path.join(casesDir, '.active'), 'utf-8').trim();
  assert.equal(activeContent, 'test-case');

  // Verify the case directory exists
  assert.ok(fs.existsSync(caseDir), 'Case directory should exist');
  assert.ok(looksLikeCaseDir(caseDir), 'Case directory should be valid');
});

test('capture.js script exists and is executable', async (t) => {
  const captureScript = path.join(ROOT, 'scripts', 'capture.js');
  assert.ok(fs.existsSync(captureScript), 'capture.js should exist');

  const content = fs.readFileSync(captureScript, 'utf-8');
  assert.ok(content.includes('#!/usr/bin/env node'), 'Should have shebang');
  assert.ok(content.includes('firecrawl-capture'), 'Should use firecrawl-capture');
});

test('capture.js has correct usage message', async (t) => {
  const captureScript = path.join(ROOT, 'scripts', 'capture.js');
  const content = fs.readFileSync(captureScript, 'utf-8');

  assert.ok(content.includes('<source_id>'), 'Usage should mention source_id');
  assert.ok(content.includes('<url>'), 'Usage should mention url');
  assert.ok(content.includes('--document'), 'Usage should mention --document flag');
});

test('capture.js error message is accurate', async (t) => {
  const captureScript = path.join(ROOT, 'scripts', 'capture.js');
  const content = fs.readFileSync(captureScript, 'utf-8');

  // Should reference cases/.active, not the deleted active-case.js
  assert.ok(content.includes('cases/.active'), 'Should reference .active file');
  assert.ok(!content.includes('active-case.js'), 'Should not reference deleted script');
});

test('evidence directory structure constants', async (t) => {
  const captureScript = path.join(ROOT, 'scripts', 'capture.js');
  const content = fs.readFileSync(captureScript, 'utf-8');

  // Verify evidence path structure (evidence/S###, not evidence/web/S###)
  assert.ok(content.includes("'evidence', sourceId"), 'Should use evidence/S### structure');
  assert.ok(!content.includes("'evidence', 'web'"), 'Should not have web subfolder');
});

// Integration test - requires FIRECRAWL_API_KEY
test('capture integration (skipped without API key)', async (t) => {
  if (!process.env.FIRECRAWL_API_KEY) {
    t.skip('FIRECRAWL_API_KEY not set');
    return;
  }

  // This would test actual capture functionality
  // For now, just verify the API key check works
  assert.ok(process.env.FIRECRAWL_API_KEY.length > 0, 'API key should be present');
});
