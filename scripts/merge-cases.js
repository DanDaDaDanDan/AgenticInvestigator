#!/usr/bin/env node

/**
 * merge-cases.js - Merge multiple investigation cases into a new unified case
 *
 * Usage: node scripts/merge-cases.js <case1> <case2> [case3...] --topic "New Topic"
 *
 * This script handles the mechanical merging:
 * - Renumbers sources and leads
 * - Copies evidence folders
 * - Merges summaries and questions
 * - Creates ID mapping for reference
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CASES_DIR = path.join(__dirname, '..', 'cases');

/**
 * Compute SHA256 hash of a file
 */
function computeHash(filePath) {
  const content = fs.readFileSync(filePath);
  return 'sha256:' + crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Recompute and update hash in metadata.json for a source
 * This ensures hash integrity after copying files during merge
 */
function recomputeSourceHash(evidenceDir) {
  const metaPath = path.join(evidenceDir, 'metadata.json');
  if (!fs.existsSync(metaPath)) return;

  const metadata = loadJson(metaPath);
  if (!metadata) return;

  // Determine verification file (prefer raw.html, then PDF, then content.md)
  let verificationFile = null;
  let computedHash = null;

  const rawHtmlPath = path.join(evidenceDir, 'raw.html');
  const contentMdPath = path.join(evidenceDir, 'content.md');

  // Check for PDF files
  const files = fs.readdirSync(evidenceDir);
  const pdfFile = files.find(f => f.endsWith('.pdf'));

  if (fs.existsSync(rawHtmlPath)) {
    verificationFile = 'raw.html';
    computedHash = computeHash(rawHtmlPath);
  } else if (pdfFile) {
    verificationFile = pdfFile;
    computedHash = computeHash(path.join(evidenceDir, pdfFile));
  } else if (fs.existsSync(contentMdPath)) {
    verificationFile = 'content.md';
    computedHash = computeHash(contentMdPath);
  } else {
    return; // No verifiable file found
  }

  const hashWithoutPrefix = computedHash.replace('sha256:', '');

  // Update sha256 field
  metadata.sha256 = hashWithoutPrefix;

  // Ensure files field exists
  if (!metadata.files) {
    metadata.files = {};
  }

  // Map verification file to files field
  if (verificationFile === 'raw.html') {
    metadata.files.raw_html = 'raw.html';
  }
  if (fs.existsSync(contentMdPath)) {
    metadata.files.content = 'content.md';
  }

  // Add/update verification block
  metadata.verification = {
    raw_file: verificationFile,
    computed_hash: computedHash,
    verified_at: new Date().toISOString()
  };

  saveJson(metaPath, metadata);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function parseArgs(args) {
  const cases = [];
  let topic = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topic' && args[i + 1]) {
      topic = args[++i];
    } else if (!args[i].startsWith('--')) {
      cases.push(args[i]);
    }
  }

  return { cases, topic };
}

function findCase(slug) {
  // Try exact match first
  const exactPath = path.join(CASES_DIR, slug);
  if (fs.existsSync(exactPath)) return exactPath;

  // Try partial match
  const entries = fs.readdirSync(CASES_DIR);
  for (const entry of entries) {
    if (entry.includes(slug)) {
      return path.join(CASES_DIR, entry);
    }
  }

  return null;
}

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return '';
  }
}

async function mergeCases(sourceCases, topic) {
  console.log(`\nMerging ${sourceCases.length} cases into: "${topic}"\n`);

  // Validate source cases
  const casePaths = [];
  for (const caseSlug of sourceCases) {
    const casePath = findCase(caseSlug);
    if (!casePath) {
      console.error(`Error: Case not found: ${caseSlug}`);
      process.exit(1);
    }

    const state = loadJson(path.join(casePath, 'state.json'));
    if (!state) {
      console.error(`Error: No state.json in ${caseSlug}`);
      process.exit(1);
    }

    casePaths.push({ slug: caseSlug, path: casePath, state });
    console.log(`  ✓ Found case: ${path.basename(casePath)}`);
  }

  // Create new case
  const newSlug = slugify(topic);
  const newPath = path.join(CASES_DIR, newSlug);

  if (fs.existsSync(newPath)) {
    console.error(`Error: Case already exists: ${newSlug}`);
    process.exit(1);
  }

  console.log(`\nCreating new case: ${newSlug}`);
  fs.mkdirSync(newPath, { recursive: true });
  fs.mkdirSync(path.join(newPath, 'evidence'), { recursive: true });
  fs.mkdirSync(path.join(newPath, 'questions'), { recursive: true });
  fs.mkdirSync(path.join(newPath, 'articles'), { recursive: true });

  // Initialize mapping
  const mapping = {
    sources: {},
    leads: {}
  };

  // Merge sources
  console.log('\nMerging sources...');
  const mergedSources = [];
  let nextSourceId = 1;

  for (const { slug, path: casePath } of casePaths) {
    const sourcesFile = loadJson(path.join(casePath, 'sources.json')) || { sources: [] };
    const sources = sourcesFile.sources || [];
    mapping.sources[slug] = {};

    for (const source of sources) {
      const oldId = source.id || source.source_id;
      const newId = `S${String(nextSourceId).padStart(3, '0')}`;
      mapping.sources[slug][oldId] = newId;

      // Copy evidence folder
      const oldEvidence = path.join(casePath, 'evidence', oldId);
      const newEvidence = path.join(newPath, 'evidence', newId);

      if (fs.existsSync(oldEvidence)) {
        copyDirRecursive(oldEvidence, newEvidence);

        // Update source_id in metadata.json
        const metaPath = path.join(newEvidence, 'metadata.json');
        if (fs.existsSync(metaPath)) {
          const meta = loadJson(metaPath);
          if (meta) {
            meta.source_id = newId;
            meta._merged_from = { case: slug, original_id: oldId };
            saveJson(metaPath, meta);
          }
        }

        // Recompute hash to ensure integrity after copy
        recomputeSourceHash(newEvidence);
      }

      // Add to merged sources
      mergedSources.push({
        ...source,
        id: newId,
        _merged_from: { case: slug, original_id: oldId }
      });

      nextSourceId++;
    }

    console.log(`  ✓ ${slug}: ${sources.length} sources (now ${Object.keys(mapping.sources[slug]).length} mapped)`);
  }

  saveJson(path.join(newPath, 'sources.json'), { sources: mergedSources });

  // Merge leads
  console.log('\nMerging leads...');
  const mergedLeads = { max_depth: 3, leads: [] };
  let nextLeadId = 1;

  for (const { slug, path: casePath } of casePaths) {
    const leadsFile = loadJson(path.join(casePath, 'leads.json')) || { leads: [] };
    const leads = leadsFile.leads || [];
    mapping.leads[slug] = {};

    // First pass: create ID mapping
    for (const lead of leads) {
      const oldId = lead.id;
      const newId = `L${String(nextLeadId).padStart(3, '0')}`;
      mapping.leads[slug][oldId] = newId;
      nextLeadId++;
    }

    // Second pass: update references
    for (const lead of leads) {
      const newLead = {
        ...lead,
        id: mapping.leads[slug][lead.id],
        _merged_from: { case: slug, original_id: lead.id }
      };

      // Update parent reference
      if (lead.parent && mapping.leads[slug][lead.parent]) {
        newLead.parent = mapping.leads[slug][lead.parent];
      }

      // Update source references
      if (lead.sources && lead.sources.length > 0) {
        newLead.sources = lead.sources.map(s => {
          return mapping.sources[slug][s] || s;
        });
      }

      mergedLeads.leads.push(newLead);
    }

    console.log(`  ✓ ${slug}: ${leads.length} leads`);
  }

  saveJson(path.join(newPath, 'leads.json'), mergedLeads);

  // Merge summaries
  console.log('\nMerging summaries...');
  let mergedSummary = `# ${topic}\n\n`;
  mergedSummary += `> This investigation merges findings from ${casePaths.length} source cases.\n\n`;
  mergedSummary += `## Source Cases\n\n`;

  for (const { slug, path: casePath, state } of casePaths) {
    mergedSummary += `- **${state.topic || slug}**\n`;
  }

  mergedSummary += `\n---\n\n`;

  // Helper to update citations in text
  function updateCitations(text, slug) {
    // Update [S###] references
    text = text.replace(/\[S(\d{3})\]/g, (match, num) => {
      const oldId = `S${num}`;
      const newId = mapping.sources[slug]?.[oldId];
      return newId ? `[${newId}]` : match;
    });

    // Update [S###](url) references
    text = text.replace(/\[S(\d{3})\]\(([^)]+)\)/g, (match, num, url) => {
      const oldId = `S${num}`;
      const newId = mapping.sources[slug]?.[oldId];
      return newId ? `[${newId}](${url})` : match;
    });

    // Update L### references
    text = text.replace(/\bL(\d{3})\b/g, (match, num) => {
      const oldId = `L${num}`;
      const newId = mapping.leads[slug]?.[oldId];
      return newId || match;
    });

    return text;
  }

  // Merge findings from each case
  console.log('\nMerging findings...');
  const newFindingsDir = path.join(newPath, 'findings');
  if (!fs.existsSync(newFindingsDir)) {
    fs.mkdirSync(newFindingsDir, { recursive: true });
  }

  const now = new Date().toISOString().split('T')[0];
  let newFindingNum = 1;
  const manifest = { version: 1, assembly_order: [], sections: {} };

  for (const { slug, path: casePath, state } of casePaths) {
    const findingsDir = path.join(casePath, 'findings');
    if (fs.existsSync(findingsDir)) {
      const findingFiles = fs.readdirSync(findingsDir)
        .filter(f => f.match(/^F\d{3}\.md$/))
        .sort();

      for (const file of findingFiles) {
        const oldContent = readFile(path.join(findingsDir, file));
        if (oldContent) {
          const newId = `F${String(newFindingNum++).padStart(3, '0')}`;
          // Update citations in content
          const updatedContent = updateCitations(oldContent, slug)
            // Update the id in frontmatter
            .replace(/^id: F\d{3}/m, `id: ${newId}`)
            // Add origin note
            .replace(/^(---\n)/, `$1# Origin: ${slug}\n`);

          fs.writeFileSync(path.join(newFindingsDir, `${newId}.md`), updatedContent);
          manifest.assembly_order.push(newId);
        }
      }
    }
  }

  fs.writeFileSync(path.join(newFindingsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Copy and merge question files
  console.log('\nMerging question frameworks...');
  const questionFiles = new Set();

  for (const { slug, path: casePath } of casePaths) {
    const questionsDir = path.join(casePath, 'questions');
    if (fs.existsSync(questionsDir)) {
      for (const file of fs.readdirSync(questionsDir)) {
        questionFiles.add(file);
      }
    }
  }

  for (const file of questionFiles) {
    let mergedContent = '';

    for (const { slug, path: casePath } of casePaths) {
      const filePath = path.join(casePath, 'questions', file);
      if (fs.existsSync(filePath)) {
        const content = readFile(filePath);
        if (content) {
          if (mergedContent) {
            mergedContent += `\n\n---\n\n## Additional Findings from: ${slug}\n\n`;
          }
          mergedContent += updateCitations(content, slug);
        }
      }
    }

    if (mergedContent) {
      fs.writeFileSync(path.join(newPath, 'questions', file), mergedContent);
    }
  }

  console.log(`  ✓ Merged ${questionFiles.size} question files`);

  // Create cross-case custom questions
  console.log('\nGenerating cross-case questions...');
  let crossCaseQuestions = `# Cross-Case Analysis Questions\n\n`;
  crossCaseQuestions += `**Status:** pending\n\n`;
  crossCaseQuestions += `These questions emerged from merging the source investigations.\n\n`;
  crossCaseQuestions += `---\n\n`;
  crossCaseQuestions += `## Questions\n\n`;
  crossCaseQuestions += `### Q1: What connections exist between the merged cases?\n\n`;
  crossCaseQuestions += `**Answer:** [To be investigated]\n\n`;
  crossCaseQuestions += `### Q2: What patterns span all source investigations?\n\n`;
  crossCaseQuestions += `**Answer:** [To be investigated]\n\n`;
  crossCaseQuestions += `### Q3: What new questions arise from the combined evidence?\n\n`;
  crossCaseQuestions += `**Answer:** [To be investigated]\n\n`;
  crossCaseQuestions += `### Q4: How do the findings reinforce or contradict each other?\n\n`;
  crossCaseQuestions += `**Answer:** [To be investigated]\n\n`;
  crossCaseQuestions += `---\n\n`;
  crossCaseQuestions += `## Leads Generated\n\n`;
  crossCaseQuestions += `[New leads will be generated during cross-case analysis]\n`;

  fs.writeFileSync(path.join(newPath, 'cross-case-questions.md'), crossCaseQuestions);

  // Create state.json
  const newState = {
    case: newSlug,
    topic: topic,
    phase: 'MERGE',
    iteration: 1,
    next_source: nextSourceId,
    next_lead: nextLeadId,
    merged_from: casePaths.map(c => ({
      case: path.basename(c.path),
      topic: c.state.topic
    })),
    mapping: mapping,
    planning: {
      step: 3,
      refined_prompt: false,
      strategic_context: false,
      investigation_plan: false
    },
    gates: {
      planning: false,
      questions: false,
      curiosity: false,
      reconciliation: false,
      article: false,
      sources: false,
      integrity: false,
      legal: false
    }
  };

  saveJson(path.join(newPath, 'state.json'), newState);

  // Create future_research.md
  fs.writeFileSync(path.join(newPath, 'future_research.md'),
    `# Future Research\n\nLeads beyond max_depth or deferred for later investigation.\n`);

  // Update .active
  fs.writeFileSync(path.join(CASES_DIR, '.active'), newSlug);

  console.log(`
═══════════════════════════════════════════════════════
MERGE COMPLETE
═══════════════════════════════════════════════════════
New case: ${newSlug}
Sources merged: ${mergedSources.length}
Leads merged: ${mergedLeads.leads.length}
Question files: ${questionFiles.size}

Next steps:
1. Run /action curiosity to identify cross-case gaps
2. Investigate new leads with /action follow
3. Generate articles with /action article
4. Verify with /action verify
═══════════════════════════════════════════════════════
`);

  return newPath;
}

// Main
const args = process.argv.slice(2);

if (args.length < 3 || !args.includes('--topic')) {
  console.log(`
Usage: node scripts/merge-cases.js <case1> <case2> [case3...] --topic "New Topic"

Example:
  node scripts/merge-cases.js renee-good ice-morale --topic "ICE in Minnesota"
`);
  process.exit(1);
}

const { cases, topic } = parseArgs(args);

if (cases.length < 2) {
  console.error('Error: Need at least 2 cases to merge');
  process.exit(1);
}

if (!topic) {
  console.error('Error: --topic is required');
  process.exit(1);
}

mergeCases(cases, topic);
