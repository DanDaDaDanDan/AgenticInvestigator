#!/usr/bin/env node
/**
 * run-tests.js - Minimal in-process test harness.
 *
 * The Codex execution environment may block child_process spawning (EPERM),
 * which prevents `node --test` from working. This runner avoids spawning.
 *
 * Usage:
 *   node scripts/run-tests.js
 */

'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

function copyFixture(fixtureName) {
  const repoRoot = path.join(__dirname, '..');
  const src = path.join(repoRoot, 'fixtures', fixtureName);
  const dst = fs.mkdtempSync(path.join(os.tmpdir(), 'agenticinvestigator-'));
  fs.cpSync(src, dst, { recursive: true });
  return dst;
}

function rmSafe(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

async function main() {
  const checks = [];

  async function check(name, fn) {
    try {
      await fn();
      checks.push({ name, ok: true });
    } catch (e) {
      checks.push({ name, ok: false, error: e });
    }
  }

  await check('verify-all-gates: fixture passes all but claims', async () => {
    const caseDir = copyFixture('minimal-case');
    try {
      delete process.env.GEMINI_API_KEY;

      const output = await require('./verify-all-gates').run(caseDir);
      assert.equal(output.case_dir, caseDir);
      assert.equal(typeof output.gates, 'object');
      assert.equal(Object.keys(output.gates).length, 9);

      assert.equal(output.gates.claims.passed, false);
      assert.match(output.gates.claims.reason, /GEMINI_API_KEY/i);

      for (const gate of ['coverage', 'tasks', 'adversarial', 'sources', 'content', 'contradictions', 'rigor', 'legal']) {
        assert.equal(output.gates[gate].passed, true, `Expected gate '${gate}' to pass`);
      }
    } finally {
      rmSafe(caseDir);
    }
  });

  await check('generate-gaps: stable gap ids and GATE_FAILED present', async () => {
    const caseDir = copyFixture('minimal-case');
    try {
      delete process.env.GEMINI_API_KEY;

      const generateGaps = require('./generate-gaps');
      const first = await generateGaps.run(caseDir);
      const second = await generateGaps.run(caseDir);

      assert.ok(Array.isArray(first.blocking));
      assert.ok(Array.isArray(second.blocking));

      const firstIds = first.blocking.map(g => g.gap_id).sort();
      const secondIds = second.blocking.map(g => g.gap_id).sort();
      assert.deepEqual(firstIds, secondIds);

      assert.ok(first.blocking.some(g => g.type === 'GATE_FAILED'));
    } finally {
      rmSafe(caseDir);
    }
  });

  const failed = checks.filter(c => !c.ok);
  for (const c of checks) {
    if (c.ok) console.log(`PASS ${c.name}`);
    else console.log(`FAIL ${c.name}: ${c.error && c.error.message ? c.error.message : String(c.error)}`);
  }

  if (failed.length > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}

