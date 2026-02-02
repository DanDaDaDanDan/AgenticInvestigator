/**
 * gates.js - Derive gate statuses from deterministic checks + required artifacts.
 *
 * Goal: make gate status hard to self-report incorrectly by deriving pass/fail from
 * concrete files and deterministic audits.
 *
 * Notes:
 * - Gate 5 is strict: it requires BOTH deterministic preflight AND completed semantic+compute
 *   verification outputs.
 * - Some gates are "artifact-derived" (e.g., integrity-review.md status). These are only as
 *   trustworthy as the process that produced them, but they make auditing explicit.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { auditFindings } = require('./audit-findings');
const { auditCitations } = require('./audit-citations');
const { verifyArticleSources } = require('./verify-source');
const { auditFile: auditNumericsFile } = require('./audit-numerics');
const { auditArticleOutline } = require('./audit-article-outline');
const { auditLeads } = require('./audit-leads');
const { auditRiskMicromort } = require('./audit-risk-micromort');

function safeReadText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return null;
  }
}

function safeReadJson(filePath) {
  const text = safeReadText(filePath);
  if (!text) return { ok: false, error: 'READ_FAILED' };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: 'INVALID_JSON', message: err.message };
  }
}

function fileStat(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function exists(filePath) {
  return !!fileStat(filePath);
}

function listFiles(dirPath, filterFn) {
  try {
    return fs.readdirSync(dirPath).filter(filterFn);
  } catch {
    return [];
  }
}

function maxMtimeMs(filePaths) {
  let max = 0;
  for (const filePath of filePaths) {
    const st = fileStat(filePath);
    if (!st) continue;
    const ms = st.mtimeMs || 0;
    if (ms > max) max = ms;
  }
  return max;
}

function parseBoldStatus(contents, allowedValues) {
  if (!contents) return null;
  const matches = Array.from(contents.matchAll(/^\*\*(.+?)\*\*$/gm));
  for (let i = matches.length - 1; i >= 0; i--) {
    const candidate = String(matches[i][1] || '').trim();
    if (allowedValues.includes(candidate)) return candidate;
  }
  return null;
}

function derivePlanningGate(caseDir) {
  const requiredFiles = [
    'refined_prompt.md',
    'strategic_context.md',
    'investigation_plan.md'
  ];
  const missing = requiredFiles.filter(f => !exists(path.join(caseDir, f)));
  return { ok: missing.length === 0, missing };
}

function deriveQuestionsGate(caseDir) {
  const questionsDir = path.join(caseDir, 'questions');
  if (!exists(questionsDir)) {
    return { ok: false, error: 'QUESTIONS_DIR_MISSING', total: 0, failures: [] };
  }

  const files = listFiles(questionsDir, f => f.endsWith('.md'));
  const failures = [];

  for (const file of files) {
    const fullPath = path.join(questionsDir, file);
    const text = safeReadText(fullPath) || '';
    const m = text.match(/\*\*Status:\*\*\s*([^\n\r]+)/i);
    const status = (m ? m[1] : '').trim().toLowerCase();

    if (!status) {
      failures.push({ file, status: null, reason: 'Missing "**Status:**" line' });
      continue;
    }

    if (status !== 'investigated' && status !== 'not-applicable') {
      failures.push({ file, status, reason: 'Status is not investigated/not-applicable' });
    }
  }

  return { ok: failures.length === 0, total: files.length, failures };
}

function deriveCuriosityGate(caseDir) {
  const leadsPath = path.join(caseDir, 'leads.json');
  const parsed = safeReadJson(leadsPath);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, path: leadsPath, message: parsed.message };
  }

  const leads = Array.isArray(parsed.value?.leads) ? parsed.value.leads : [];
  const pending = leads.filter(l => l && l.status === 'pending');
  return {
    ok: pending.length === 0,
    pending: pending.length,
    pendingIds: pending.slice(0, 25).map(l => l.id).filter(Boolean)
  };
}

function deriveReconciliationGate(caseDir) {
  const logPath = path.join(caseDir, 'reconciliation-log.md');
  if (!exists(logPath)) {
    return { ok: false, error: 'RECONCILIATION_LOG_MISSING', path: logPath };
  }

  const leadsPath = path.join(caseDir, 'leads.json');
  const sourcesPath = path.join(caseDir, 'sources.json');
  const findingsDir = path.join(caseDir, 'findings');

  const inputs = [leadsPath, sourcesPath];
  const findingFiles = listFiles(findingsDir, f => f.endsWith('.md') || f.endsWith('.json'))
    .map(f => path.join(findingsDir, f));
  inputs.push(...findingFiles);

  const inputsLatest = maxMtimeMs(inputs);
  const logMtime = (fileStat(logPath)?.mtimeMs || 0);

  // Fail closed: if reconciliation log is older than any primary input, reconciliation is stale.
  const stale = inputsLatest > logMtime;

  // Lead hygiene: investigated lead results with numeric claims must have valid sources.
  const leadHygiene = auditLeads(caseDir);
  const leadHygieneOk = !!leadHygiene.ok;

  return {
    ok: !stale && leadHygieneOk,
    stale,
    logMtimeMs: logMtime,
    inputsLatestMtimeMs: inputsLatest,
    leadHygiene: leadHygieneOk ? { ok: true } : leadHygiene
  };
}

function deriveArticleGate(caseDir) {
  const articlePath = path.join(caseDir, 'articles', 'full.md');
  const pdfPath = path.join(caseDir, 'articles', 'full.pdf');
  const outline = auditArticleOutline(caseDir);
  const micromort = auditRiskMicromort(caseDir, { articleRel: path.join('articles', 'full.md') });

  const articleOk = exists(articlePath) && (fileStat(articlePath)?.size || 0) > 0;
  const pdfOk = exists(pdfPath) && (fileStat(pdfPath)?.size || 0) > 0;

  const text = articleOk ? (safeReadText(articlePath) || '') : '';
  const hasCitations = /\[S\d{3}\]/.test(text);

  return {
    ok: articleOk && pdfOk && hasCitations && outline.ok && micromort.ok,
    articlePath,
    pdfPath,
    hasCitations,
    outline,
    micromort
  };
}

function deriveGate5Preflight(caseDir, options) {
  const strictRequested = !!options?.strict;
  const receiptKeyConfigured = typeof process.env.EVIDENCE_RECEIPT_KEY === 'string' && process.env.EVIDENCE_RECEIPT_KEY.trim().length > 0;
  const strict = strictRequested || receiptKeyConfigured;

  const findings = auditFindings(caseDir);
  const findingsOk = !findings.error &&
    (findings.summary?.errors || 0) === 0 &&
    (findings.duplicates || []).length === 0 &&
    (findings.manifest?.missingCanonicalInAssemblyOrder || []).length === 0;

  const citations = auditCitations(caseDir);
  const citationsOk = !!citations.allPassed;

  const sources = verifyArticleSources(caseDir, { strict });
  const sourcesOk = (sources.summary?.failed || 0) === 0 && (sources.summary?.missing || 0) === 0;

  const fullArticlePath = path.join(caseDir, 'articles', 'full.md');
  const numerics = exists(fullArticlePath) ? auditNumericsFile(fullArticlePath) : { error: 'ARTICLE_NOT_FOUND' };
  const numericHardErrors = Array.isArray(numerics.details)
    ? numerics.details.filter(d => d.severity === 'error').length
    : 0;
  const numericsOk = !numerics.error && numericHardErrors === 0;

  const ok = findingsOk && citationsOk && sourcesOk && numericsOk;
  return {
    ok,
    strict,
    strictRequested,
    receiptKeyConfigured,
    findings: { ok: findingsOk, summary: findings.summary, duplicates: findings.duplicates },
    citations: { ok: citationsOk, passed: citations.passed, failed: citations.failed, warnings: citations.warnings },
    sources: { ok: sourcesOk, summary: sources.summary },
    numerics: {
      ok: numericsOk,
      totalNumericSentences: numerics.totalNumericSentences,
      uncitedNumericSentences: numerics.uncitedNumericSentences,
      hardErrors: numericHardErrors
    }
  };
}

function deriveGate5Semantic(caseDir) {
  const semanticPath = path.join(caseDir, 'semantic-verification.json');
  const parsed = safeReadJson(semanticPath);
  if (!parsed.ok) {
    return { ok: false, error: 'SEMANTIC_VERIFICATION_MISSING_OR_INVALID', path: semanticPath };
  }
  const summary = parsed.value?.summary || {};
  const requiredFields = [
    'total',
    'verified',
    'unverified',
    'skipped',
    'noSource',
    'sourceMissing',
    'sourceInvalid',
    'noResponse',
    'parseErrors',
    'invalidResponses',
    'citationUrlMismatches'
  ];
  const missingFields = requiredFields.filter(f => typeof summary[f] !== 'number');
  if (missingFields.length > 0) {
    return { ok: false, error: 'SEMANTIC_VERIFICATION_SCHEMA_MISMATCH', path: semanticPath, missingFields, summary };
  }

  // Fail closed: a full article with citations should yield at least one extracted/verifiable claim.
  if (summary.total <= 0) {
    return { ok: false, error: 'SEMANTIC_VERIFICATION_EMPTY', path: semanticPath, summary };
  }

  const ok = summary.unverified === 0 &&
    summary.noSource === 0 &&
    summary.sourceMissing === 0 &&
    summary.sourceInvalid === 0 &&
    summary.noResponse === 0 &&
    summary.parseErrors === 0 &&
    summary.invalidResponses === 0 &&
    summary.citationUrlMismatches === 0;
  return { ok, path: semanticPath, summary };
}

function deriveGate5Compute(caseDir) {
  const computePath = path.join(caseDir, 'compute-verification.json');
  const parsed = safeReadJson(computePath);
  if (!parsed.ok) {
    return { ok: false, error: 'COMPUTE_VERIFICATION_MISSING_OR_INVALID', path: computePath };
  }
  const summary = parsed.value?.summary || {};
  const requiredFields = [
    'total',
    'verified',
    'discrepancies',
    'dataNotFound',
    'noSource',
    'sourceMissing',
    'sourceInvalid',
    'noResponse',
    'parseErrors',
    'errors'
  ];
  const missingFields = requiredFields.filter(f => typeof summary[f] !== 'number');
  if (missingFields.length > 0) {
    return { ok: false, error: 'COMPUTE_VERIFICATION_SCHEMA_MISMATCH', path: computePath, missingFields, summary };
  }

  const ok = summary.discrepancies === 0 &&
    summary.noSource === 0 &&
    summary.dataNotFound === 0 &&
    summary.sourceMissing === 0 &&
    summary.sourceInvalid === 0 &&
    summary.noResponse === 0 &&
    summary.parseErrors === 0 &&
    summary.errors === 0;
  return { ok, path: computePath, summary };
}

function deriveGate5Sources(caseDir, options) {
  const strict = !!options?.strict;
  const preflight = deriveGate5Preflight(caseDir, { strict });
  const semantic = deriveGate5Semantic(caseDir);
  const compute = deriveGate5Compute(caseDir);

  return {
    ok: preflight.ok && semantic.ok && compute.ok,
    strict,
    preflight,
    semantic,
    compute
  };
}

function deriveReviewGateFromFile(caseDir, fileName) {
  const filePath = path.join(caseDir, fileName);
  if (!exists(filePath)) {
    return { ok: false, error: 'MISSING', path: filePath };
  }
  const text = safeReadText(filePath);
  const status = parseBoldStatus(text, ['READY', 'READY WITH CHANGES', 'NOT READY']);
  return { ok: status === 'READY', status, path: filePath };
}

function derivePassFailGateFromFile(caseDir, fileName, label) {
  const filePath = path.join(caseDir, fileName);
  if (!exists(filePath)) {
    return { ok: false, error: 'MISSING', path: filePath };
  }
  const text = safeReadText(filePath);
  const status = parseBoldStatus(text, ['PASS', 'FAIL']);
  return { ok: status === 'PASS', status, path: filePath, label };
}

function deriveAllGates(caseDir, options = {}) {
  const planning = derivePlanningGate(caseDir);
  const questions = deriveQuestionsGate(caseDir);
  const curiosity = deriveCuriosityGate(caseDir);
  const reconciliation = deriveReconciliationGate(caseDir);
  const article = deriveArticleGate(caseDir);
  const sources = deriveGate5Sources(caseDir, options);
  const integrity = deriveReviewGateFromFile(caseDir, 'integrity-review.md');
  const legal = deriveReviewGateFromFile(caseDir, 'legal-review.md');
  const balance = derivePassFailGateFromFile(caseDir, 'balance-audit.md', 'Balance');
  const completeness = derivePassFailGateFromFile(caseDir, 'completeness-audit.md', 'Completeness');
  const significance = derivePassFailGateFromFile(caseDir, 'significance-audit.md', 'Significance');

  const gates = {
    planning: planning.ok,
    questions: questions.ok,
    curiosity: curiosity.ok,
    reconciliation: reconciliation.ok,
    article: article.ok,
    sources: sources.ok,
    integrity: integrity.ok,
    legal: legal.ok,
    balance: balance.ok,
    completeness: completeness.ok,
    significance: significance.ok
  };

  return {
    gates,
    details: {
      planning,
      questions,
      curiosity,
      reconciliation,
      article,
      sources,
      integrity,
      legal,
      balance,
      completeness,
      significance
    }
  };
}

module.exports = {
  deriveAllGates,
  derivePlanningGate,
  deriveQuestionsGate,
  deriveCuriosityGate,
  deriveReconciliationGate,
  deriveArticleGate,
  deriveGate5Preflight,
  deriveGate5Sources
};
