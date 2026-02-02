#!/usr/bin/env node
/**
 * build-article-context.js - Bundle case context for article generation
 *
 * The article-writing model benefits from having one large, structured input file.
 * This script builds an "article context bundle" by concatenating:
 * - refined_prompt.md / strategic_context.md / investigation_plan.md / custom_questions.md
 * - canonical findings (findings/F###.md in manifest order)
 * - optionally: all framework question files (questions/*.md)
 *
 * Usage:
 *   node scripts/build-article-context.js <case_dir>
 *   node scripts/build-article-context.js <case_dir> --output <file>
 *   node scripts/build-article-context.js <case_dir> --no-questions
 *   node scripts/build-article-context.js <case_dir> --block   (fail if findings hygiene fails)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { auditFindings } = require('./audit-findings');

function readIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function extractMarkdownSection(text, headingRegex) {
  const raw = String(text || '');
  const m = raw.match(new RegExp(`^##\\s+${headingRegex.source}\\s*$[\\s\\S]*?(?=^##\\s+|\\Z)`, 'im'));
  return m ? m[0].trim() : null;
}

function parseFindingFrontmatter(fileText) {
  const match = fileText.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { metadata: {}, body: fileText.trim() };

  const frontmatter = match[1];
  const body = match[2];
  const metadata = {};

  for (const line of frontmatter.split('\n')) {
    const [key, ...rest] = line.split(':');
    if (!key || rest.length === 0) continue;
    const rawValue = rest.join(':').trim();
    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      try {
        metadata[key.trim()] = JSON.parse(rawValue);
      } catch {
        metadata[key.trim()] = rawValue;
      }
    } else {
      metadata[key.trim()] = rawValue;
    }
  }

  return { metadata, body: body.trim() };
}

function loadCanonicalFindings(caseDir) {
  const findingsDir = path.join(caseDir, 'findings');
  const manifestPath = path.join(findingsDir, 'manifest.json');

  let assemblyOrder = [];
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      assemblyOrder = Array.isArray(manifest.assembly_order) ? manifest.assembly_order : [];
    } catch {
      // ignore; fall back to filename sort
    }
  }

  const allCanonical = fs.existsSync(findingsDir)
    ? fs.readdirSync(findingsDir).filter(f => /^F\d{3}\.md$/.test(f)).map(f => f.replace('.md', '')).sort()
    : [];

  const ordered = [
    ...assemblyOrder.filter(id => /^F\d{3}$/.test(id)),
    ...allCanonical.filter(id => !assemblyOrder.includes(id))
  ];

  const out = [];
  const citedSourceIds = new Set();
  for (const id of ordered) {
    const p = path.join(findingsDir, `${id}.md`);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, 'utf-8');
    const { metadata, body } = parseFindingFrontmatter(raw);
    if (metadata.status === 'stale' || metadata.status === 'superseded') continue;

    // Prefer frontmatter `sources: [...]` but also scan body for [S###] mentions.
    const fmSources = metadata.sources;
    if (Array.isArray(fmSources)) {
      for (const s of fmSources) {
        if (typeof s === 'string' && /^S\d{3}$/.test(s)) citedSourceIds.add(s);
      }
    }
    const citedInBody = body.match(/\[S\d{3}\]/g) || [];
    for (const tag of citedInBody) {
      const sid = tag.slice(1, -1);
      if (/^S\d{3}$/.test(sid)) citedSourceIds.add(sid);
    }

    out.push(`### ${id}: ${metadata.title || ''}`.trim());
    out.push(body);
    out.push('');
  }

  return { markdown: out.join('\n'), citedSourceIds: [...citedSourceIds].sort() };
}

function loadQuestions(caseDir) {
  const questionsDir = path.join(caseDir, 'questions');
  if (!fs.existsSync(questionsDir)) return '';

  const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.md')).sort();
  const out = [];
  for (const file of files) {
    const p = path.join(questionsDir, file);
    const content = fs.readFileSync(p, 'utf-8').trim();
    out.push(`### questions/${file}`);
    out.push(content);
    out.push('');
  }
  return out.join('\n');
}

function buildBundle(caseDir, options = {}) {
  const { includeQuestions = true } = options;

  const parts = [];
  const assembled = loadCanonicalFindings(caseDir);
  const sourcesJson = readJsonIfExists(path.join(caseDir, 'sources.json'));
  parts.push('# Article Context Bundle');
  parts.push(`- Case: ${caseDir}`);
  parts.push(`- Generated: ${new Date().toISOString()}`);
  parts.push('');
  parts.push('## IMPORTANT: Evidence vs Planning Docs');
  parts.push('This bundle includes planning artifacts (refined prompt / strategic context / investigation plan).');
  parts.push('Treat them as *scope and hypotheses*, not evidence.');
  parts.push('For any factual claim in the article, rely on findings with `[S###]` citations and the underlying captured evidence.');
  parts.push('If a planning doc contains an appealing number or fact, assume it may be wrong unless it is also supported by a finding with captured sources.');
  parts.push('');

  // Provide a compact “source guardrail” list for the writer, based on the sources actually cited in findings.
  // This helps reduce accidental citation laundering from questions/planning docs and keeps the article tightly grounded.
  if (assembled.citedSourceIds.length > 0) {
    parts.push('## Source Guardrails (Derived From Findings)');
    parts.push('Only treat the following S-IDs as citable evidence unless you add a new finding with new, verified sources.');
    parts.push('If you use micromorts, explicitly state they measure death risk only (not injury risk).');
    parts.push('');
    for (const sourceId of assembled.citedSourceIds) {
      const entry = sourcesJson?.sources?.find(s => s && s.id === sourceId);
      const url = entry?.url ? String(entry.url).trim() : '(missing in sources.json)';
      const title = entry?.title ? String(entry.title).trim() : '';
      parts.push(`- ${sourceId}${title ? ` — ${title}` : ''}: ${url}`);
    }
    parts.push('');
  }
  parts.push('');

  const refined = readIfExists(path.join(caseDir, 'refined_prompt.md'));
  if (refined) {
    parts.push('## Refined Prompt');
    parts.push(refined.trim());
    parts.push('');
  }

  // During revision cycles, include actionable revision instructions for the writer.
  const state = readJsonIfExists(path.join(caseDir, 'state.json'));
  const feedbackRel = state?.revision?.feedback_file;
  if (feedbackRel && typeof feedbackRel === 'string') {
    const feedbackPath = path.join(caseDir, feedbackRel);
    const feedbackText = readIfExists(feedbackPath);
    if (feedbackText) {
      const changes = extractMarkdownSection(feedbackText, /Article Changes\b/i);
      parts.push('## Revision Instructions (Article Changes)');
      parts.push(`Feedback file: ${feedbackRel}`);
      parts.push('');
      parts.push(changes || '(No "## Article Changes" section found in feedback file.)');
      parts.push('');
    }
  }

  const outline = readIfExists(path.join(caseDir, 'articles', 'outline.md'));
  if (outline) {
    parts.push('## Article Outline (Scope Control)');
    parts.push(outline.trim());
    parts.push('');
  }

  parts.push('## Findings (Canonical, Assembled)');
  parts.push(assembled.markdown);
  parts.push('');

  // Planning artifacts go after findings to reduce accidental "planning-number → publication" leakage.
  const strategic = readIfExists(path.join(caseDir, 'strategic_context.md'));
  if (strategic) {
    parts.push('## Strategic Context (NOT EVIDENCE)');
    parts.push('If this section contains specific numbers, treat them as hypotheses unless they are supported by findings with captured sources.');
    parts.push('');
    parts.push(strategic.trim());
    parts.push('');
  }

  const plan = readIfExists(path.join(caseDir, 'investigation_plan.md'));
  if (plan) {
    parts.push('## Investigation Plan (NOT EVIDENCE)');
    parts.push(plan.trim());
    parts.push('');
  }

  const custom = readIfExists(path.join(caseDir, 'custom_questions.md'));
  if (custom) {
    parts.push('## Custom Questions (NOT EVIDENCE)');
    parts.push(custom.trim());
    parts.push('');
  }

  if (includeQuestions) {
    const q = loadQuestions(caseDir);
    if (q) {
      parts.push('## Framework Questions (questions/*.md)');
      parts.push(q);
      parts.push('');
    }
  }

  return parts.join('\n');
}

function printUsage() {
  console.log('build-article-context.js - Bundle case context for article generation');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/build-article-context.js <case_dir> [--output <file>] [--no-questions] [--block]');
}

function main() {
  const args = process.argv.slice(2);
  const caseDir = args.find(a => !a.startsWith('--'));
  const block = args.includes('--block');
  const includeQuestions = !args.includes('--no-questions');

  if (!caseDir) {
    printUsage();
    process.exit(2);
  }
  if (!fs.existsSync(caseDir)) {
    console.error(`Case directory not found: ${caseDir}`);
    process.exit(2);
  }

  const hygiene = auditFindings(caseDir);
  const hygieneHasErrors =
    hygiene.error ||
    (hygiene.summary?.errors || 0) > 0 ||
    (hygiene.duplicates || []).length > 0 ||
    (hygiene.manifest?.missingCanonicalInAssemblyOrder || []).length > 0;

  if (hygieneHasErrors) {
    const msg = 'Findings hygiene issues detected (duplicate IDs and/or non-canonical filenames).';
    if (block) {
      console.error(`ERROR: ${msg}`);
      console.error(`Run: node scripts/audit-findings.js ${caseDir} --block`);
      process.exit(1);
    } else {
      console.error(`WARNING: ${msg}`);
      console.error(`Run: node scripts/audit-findings.js ${caseDir} --block`);
    }
  }

  let outputPath = null;
  const outIdx = args.indexOf('--output');
  if (outIdx !== -1 && args[outIdx + 1]) outputPath = args[outIdx + 1];

  const bundle = buildBundle(caseDir, { includeQuestions });

  if (outputPath) {
    const resolved = path.isAbsolute(outputPath) ? outputPath : path.join(process.cwd(), outputPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, bundle);
    console.log(`Wrote: ${resolved}`);
  } else {
    process.stdout.write(bundle);
  }
}

if (require.main === module) {
  main();
}

module.exports = { buildBundle };
