/**
 * Tests for verify-source.js
 *
 * Tests hash verification and fabrication detection.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const { verifySource, verifyAllSources, verifyArticleSources } = require('../scripts/verify-source');

function createTempCase() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-test-'));
  fs.mkdirSync(path.join(tempDir, 'evidence'));
  fs.mkdirSync(path.join(tempDir, 'articles'));
  return tempDir;
}

function hashContent(content) {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function createValidSource(caseDir, sourceId, content = '# Test Content\n\nSome test content here.') {
  const evidenceDir = path.join(caseDir, 'evidence', sourceId);
  fs.mkdirSync(evidenceDir, { recursive: true });

  // Save content
  fs.writeFileSync(path.join(evidenceDir, 'content.md'), content);
  const contentHash = hashContent(content);

  // Save metadata with proper verification block
  const capturedAt = new Date().toISOString();
  const metadata = {
    source_id: sourceId,
    url: 'https://example.com/article/123',
    title: 'Test Article',
    captured_at: capturedAt,
    capture_method: 'osint_get',
    files: {
      content: {
        path: 'content.md',
        hash: contentHash,
        size: content.length
      }
    },
    verification: {
      raw_file: 'content.md',
      computed_hash: contentHash,
      osint_reported_hash: contentHash,
      verified: true
    },
    _capture_signature: `sig_v2_${crypto.createHash('sha256').update(sourceId + capturedAt).digest('hex').slice(0, 32)}`
  };

  fs.writeFileSync(path.join(evidenceDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  return evidenceDir;
}

// Tests

test('verifySource passes for valid source', async (t) => {
  const caseDir = createTempCase();
  t.after(() => fs.rmSync(caseDir, { recursive: true, force: true }));

  createValidSource(caseDir, 'S001');
  const result = verifySource('S001', caseDir);

  assert.equal(result.valid, true, 'Should be valid');
  assert.equal(result.errors.length, 0, 'Should have no errors');
  assert.ok(result.checks.includes('hash_self_consistent'), 'Should verify hash');
});

test('verifySource fails for missing evidence directory', async (t) => {
  const caseDir = createTempCase();
  t.after(() => fs.rmSync(caseDir, { recursive: true, force: true }));

  const result = verifySource('S999', caseDir);

  assert.equal(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('missing')), 'Should report missing directory');
});

test('verifySource fails for missing metadata.json', async (t) => {
  const caseDir = createTempCase();
  t.after(() => fs.rmSync(caseDir, { recursive: true, force: true }));

  const evidenceDir = path.join(caseDir, 'evidence', 'S001');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, 'content.md'), '# Test');

  const result = verifySource('S001', caseDir);

  assert.equal(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('metadata.json')), 'Should report missing metadata');
});

test('verifySource fails for hash mismatch', async (t) => {
  const caseDir = createTempCase();
  t.after(() => fs.rmSync(caseDir, { recursive: true, force: true }));

  createValidSource(caseDir, 'S001', 'Original content');

  // Tamper with content
  fs.writeFileSync(path.join(caseDir, 'evidence', 'S001', 'content.md'), 'Tampered content');

  const result = verifySource('S001', caseDir);

  assert.equal(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('Hash mismatch')), 'Should detect hash mismatch');
});

test('verifySource warns for missing capture signature', async (t) => {
  const caseDir = createTempCase();
  t.after(() => fs.rmSync(caseDir, { recursive: true, force: true }));

  const evidenceDir = path.join(caseDir, 'evidence', 'S001');
  fs.mkdirSync(evidenceDir, { recursive: true });

  const content = '# Test';
  fs.writeFileSync(path.join(evidenceDir, 'content.md'), content);
  fs.writeFileSync(path.join(evidenceDir, 'raw.html'), '<html>Test</html>');
  const rawHash = hashContent('<html>Test</html>');

  // Metadata without capture signature (mcp-osint format)
  const metadata = {
    url: 'https://example.com',
    captured_at: new Date().toISOString(),
    sha256: rawHash.replace('sha256:', ''),
    files: {
      raw_html: 'raw.html',
      content: 'content.md'
    }
  };
  fs.writeFileSync(path.join(evidenceDir, 'metadata.json'), JSON.stringify(metadata));

  const result = verifySource('S001', caseDir);

  // Source should be valid (hash verification passes) but have a warning
  assert.equal(result.valid, true, 'Should be valid with hash verification');
  assert.ok(result.warnings.some(w => w.includes('_capture_signature') || w.includes('mcp-osint')), 'Should warn about missing signature');
});

test('verifySource warns on round timestamp', async (t) => {
  const caseDir = createTempCase();
  t.after(() => fs.rmSync(caseDir, { recursive: true, force: true }));

  const evidenceDir = path.join(caseDir, 'evidence', 'S001');
  fs.mkdirSync(evidenceDir, { recursive: true });

  const content = '# Test';
  fs.writeFileSync(path.join(evidenceDir, 'content.md'), content);
  const contentHash = hashContent(content);

  // Metadata with suspicious round timestamp
  const metadata = {
    source_id: 'S001',
    url: 'https://example.com/article',
    captured_at: '2026-01-14T20:00:00.000Z',  // Suspiciously round
    capture_method: 'osint_get',
    files: {
      content: { path: 'content.md', hash: contentHash, size: content.length }
    },
    verification: {
      raw_file: 'content.md',
      computed_hash: contentHash
    },
    _capture_signature: 'sig_v2_abc123'
  };
  fs.writeFileSync(path.join(evidenceDir, 'metadata.json'), JSON.stringify(metadata));

  const result = verifySource('S001', caseDir);

  assert.ok(result.warnings.some(w => w.includes('round timestamp')), 'Should warn about round timestamp');
});

test('verifySource detects compilation content', async (t) => {
  const caseDir = createTempCase();
  t.after(() => fs.rmSync(caseDir, { recursive: true, force: true }));

  const evidenceDir = path.join(caseDir, 'evidence', 'S001');
  fs.mkdirSync(evidenceDir, { recursive: true });

  // Content that looks fabricated
  const content = 'Research compilation from multiple academic sources...';
  fs.writeFileSync(path.join(evidenceDir, 'content.md'), content);
  const contentHash = hashContent(content);

  const metadata = {
    source_id: 'S001',
    url: 'https://example.com/article',
    captured_at: new Date().toISOString(),
    capture_method: 'osint_get',
    files: {
      content: { path: 'content.md', hash: contentHash, size: content.length }
    },
    verification: {
      raw_file: 'content.md',
      computed_hash: contentHash
    },
    _capture_signature: 'sig_v2_abc123'
  };
  fs.writeFileSync(path.join(evidenceDir, 'metadata.json'), JSON.stringify(metadata));

  const result = verifySource('S001', caseDir);

  assert.equal(result.valid, false, 'Should be invalid');
  assert.ok(result.errors.some(e => e.includes('compilation pattern')), 'Should detect compilation pattern');
});

test('verifyAllSources processes multiple sources', async (t) => {
  const caseDir = createTempCase();
  t.after(() => fs.rmSync(caseDir, { recursive: true, force: true }));

  createValidSource(caseDir, 'S001');
  createValidSource(caseDir, 'S002');
  createValidSource(caseDir, 'S003');

  const result = verifyAllSources(caseDir);

  assert.equal(result.sources.length, 3, 'Should find 3 sources');
  assert.equal(result.summary.total, 3, 'Total should be 3');
  assert.equal(result.summary.valid, 3, 'All should be valid');
});

test('verifyArticleSources checks cited sources', async (t) => {
  const caseDir = createTempCase();
  t.after(() => fs.rmSync(caseDir, { recursive: true, force: true }));

  createValidSource(caseDir, 'S001');
  createValidSource(caseDir, 'S002');

  // Create article with citations
  const article = '# Investigation\n\nAccording to [S001], something happened. This is confirmed by [S002].';
  fs.writeFileSync(path.join(caseDir, 'articles', 'full.md'), article);

  const result = verifyArticleSources(caseDir);

  assert.deepEqual(result.cited.sort(), ['S001', 'S002'], 'Should find cited sources');
  assert.equal(result.summary.verified, 2, 'Both should verify');
});

test('verifyArticleSources detects missing cited source', async (t) => {
  const caseDir = createTempCase();
  t.after(() => fs.rmSync(caseDir, { recursive: true, force: true }));

  createValidSource(caseDir, 'S001');
  // S002 not created

  // Create article citing both
  const article = '# Investigation\n\nAccording to [S001] and [S002], something happened.';
  fs.writeFileSync(path.join(caseDir, 'articles', 'full.md'), article);

  const result = verifyArticleSources(caseDir);

  assert.equal(result.summary.cited, 2, 'Should find 2 citations');
  assert.equal(result.summary.verified, 1, 'Only 1 should verify');
  assert.equal(result.summary.missing, 1, 'Should detect 1 missing');
});
