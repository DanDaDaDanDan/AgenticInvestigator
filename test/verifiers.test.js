const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function copyFixture(fixtureName) {
  const src = path.join(__dirname, 'fixtures', fixtureName);
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'agenticinvestigator-'));
  fs.cpSync(src, dst, { recursive: true });
  return dst;
}

test('verify-all-gates: fixture passes all but claims (no API key)', async (t) => {
  const caseDir = copyFixture('minimal-case');
  t.after(() => fs.rmSync(caseDir, { recursive: true, force: true }));

  delete process.env.GEMINI_API_KEY;

  const output = await require('../scripts/verify-all-gates').run(caseDir);
  assert.equal(output.case_dir, caseDir);
  assert.equal(typeof output.gates, 'object');
  assert.equal(Object.keys(output.gates).length, 9);

  assert.equal(output.gates.claims.passed, false);
  assert.match(output.gates.claims.reason, /GEMINI_API_KEY/i);

  for (const gate of ['coverage', 'tasks', 'adversarial', 'sources', 'content', 'contradictions', 'rigor', 'legal']) {
    assert.equal(output.gates[gate].passed, true, `Expected gate '${gate}' to pass`);
  }
});

test('generate-gaps: stable gap ids and GATE_FAILED present', async (t) => {
  const caseDir = copyFixture('minimal-case');
  t.after(() => fs.rmSync(caseDir, { recursive: true, force: true }));

  delete process.env.GEMINI_API_KEY;

  const generateGaps = require('../scripts/generate-gaps');
  const first = await generateGaps.run(caseDir);
  const second = await generateGaps.run(caseDir);

  assert.ok(Array.isArray(first.blocking));
  assert.ok(Array.isArray(second.blocking));

  const firstIds = first.blocking.map(g => g.gap_id).sort();
  const secondIds = second.blocking.map(g => g.gap_id).sort();
  assert.deepEqual(firstIds, secondIds);

  assert.ok(first.blocking.some(g => g.type === 'GATE_FAILED'));
});
