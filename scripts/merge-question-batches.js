#!/usr/bin/env node
/**
 * merge-question-batches.js - Merge results from parallel question batches
 *
 * After running 5 question batches in parallel, this script:
 * - Merges findings-batch-N.md files into findings/ (creates F### files)
 * - Merges leads-batch-N.json files into leads.json (with sequential IDs)
 * - Merges sources-batch-N.json files into sources.json
 * - Updates state.json next_source to highest used + 1
 * - Cleans up temp files
 *
 * Usage: node scripts/merge-question-batches.js <case-path>
 */

const fs = require('fs');
const path = require('path');

// Batch configuration
const BATCHES = [
  { num: 1, frameworks: ['01', '02', '03', '04', '05', '06', '07'] },
  { num: 2, frameworks: ['08', '09', '10', '11', '12', '13', '14'] },
  { num: 3, frameworks: ['15', '16', '17', '18', '19', '20'] },
  { num: 4, frameworks: ['21', '22', '23', '24', '25'] },
  { num: 5, frameworks: ['26', '27', '28', '29', '30', '31', '32', '33', '34', '35'] }
];

/**
 * Read JSON file safely
 */
function readJsonFile(filePath, defaultValue = null) {
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.error(`Error reading ${filePath}: ${e.message}`);
    return defaultValue;
  }
}

/**
 * Ensure temp directory exists
 */
function ensureTempDir(casePath) {
  const tempDir = path.join(casePath, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
}

/**
 * Get the next finding ID
 */
function getNextFindingId(findingsDir) {
  const files = fs.readdirSync(findingsDir)
    .filter(f => f.match(/^F\d{3}\.md$/))
    .sort();

  if (files.length === 0) return 1;
  return parseInt(files[files.length - 1].slice(1, 4)) + 1;
}

/**
 * Merge findings batch files into findings/
 */
function mergeFindingsBatches(casePath) {
  const findingsDir = path.join(casePath, 'findings');
  const manifestPath = path.join(findingsDir, 'manifest.json');
  const tempDir = path.join(casePath, 'temp');

  if (!fs.existsSync(findingsDir)) {
    fs.mkdirSync(findingsDir, { recursive: true });
  }

  // Load manifest
  let manifest = { version: 1, assembly_order: [], sections: {} };
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  }

  const now = new Date().toISOString().split('T')[0];
  const mergedBatches = [];
  let nextId = getNextFindingId(findingsDir);

  // Process batches in order (1-5)
  for (let batchNum = 1; batchNum <= 5; batchNum++) {
    const batchFile = path.join(tempDir, `findings-batch-${batchNum}.md`);
    // Also support legacy summary-batch-N.md files
    const legacyFile = path.join(tempDir, `summary-batch-${batchNum}.md`);

    const fileToUse = fs.existsSync(batchFile) ? batchFile : (fs.existsSync(legacyFile) ? legacyFile : null);

    if (fileToUse) {
      const batchContent = fs.readFileSync(fileToUse, 'utf-8').trim();
      if (batchContent) {
        // Create a finding for this batch
        const id = `F${String(nextId++).padStart(3, '0')}`;
        const content = `---
id: ${id}
status: draft
created: ${now}
updated: ${now}
sources: []
supersedes: null
superseded_by: null
confidence: medium
related_leads: []
---

# Finding: Batch ${batchNum} Discoveries

${batchContent}
`;
        fs.writeFileSync(path.join(findingsDir, `${id}.md`), content);
        manifest.assembly_order.push(id);
        mergedBatches.push(batchNum);
      }
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return { merged: mergedBatches, findings_created: mergedBatches.length };
}

/**
 * Merge leads from batch files into leads.json
 */
function mergeLeadsBatches(casePath) {
  const leadsPath = path.join(casePath, 'leads.json');
  const tempDir = path.join(casePath, 'temp');

  // Read existing leads
  const leads = readJsonFile(leadsPath, { max_depth: 3, leads: [], version: 1 });

  // Find highest existing lead ID
  let maxLeadNum = leads.leads.reduce((max, l) => {
    const num = parseInt(l.id.replace('L', ''), 10);
    return num > max ? num : max;
  }, 0);

  const mergedBatches = [];
  let totalNewLeads = 0;

  // Process batches in order (1-5)
  for (let batchNum = 1; batchNum <= 5; batchNum++) {
    const batchFile = path.join(tempDir, `leads-batch-${batchNum}.json`);
    if (fs.existsSync(batchFile)) {
      const batchData = readJsonFile(batchFile, { leads: [] });
      const batchLeads = batchData.leads || [];

      // Assign new IDs to batch leads and add to main leads
      batchLeads.forEach(lead => {
        // Check if this lead already exists (by content match)
        const exists = leads.leads.some(l =>
          l.lead === lead.lead && l.from === lead.from
        );

        if (!exists) {
          maxLeadNum++;
          lead.id = `L${String(maxLeadNum).padStart(3, '0')}`;
          leads.leads.push(lead);
          totalNewLeads++;
        }
      });

      mergedBatches.push(batchNum);
    }
  }

  // Update version
  leads.version = (leads.version || 0) + 1;

  fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));
  return { merged: mergedBatches, new_leads: totalNewLeads, max_id: maxLeadNum };
}

/**
 * Merge sources from batch files into sources.json
 */
function mergeSourcesBatches(casePath) {
  const sourcesPath = path.join(casePath, 'sources.json');
  const tempDir = path.join(casePath, 'temp');

  // Read existing sources
  const sources = readJsonFile(sourcesPath, { sources: [] });

  const mergedBatches = [];
  let totalNewSources = 0;
  let maxSourceNum = 0;

  // Find highest existing source ID
  sources.sources.forEach(s => {
    const num = parseInt(s.id.replace('S', ''), 10);
    if (num > maxSourceNum) maxSourceNum = num;
  });

  // Process batches in order (1-5)
  for (let batchNum = 1; batchNum <= 5; batchNum++) {
    const batchFile = path.join(tempDir, `sources-batch-${batchNum}.json`);
    if (fs.existsSync(batchFile)) {
      const batchData = readJsonFile(batchFile, { sources: [] });
      const batchSources = batchData.sources || [];

      // Check for batch metadata with highest_used
      if (batchData._batch_metadata && batchData._batch_metadata.highest_used) {
        if (batchData._batch_metadata.highest_used > maxSourceNum) {
          maxSourceNum = batchData._batch_metadata.highest_used;
        }
      }

      // Add batch sources (they should already have unique IDs from allocation)
      batchSources.forEach(source => {
        const exists = sources.sources.some(s => s.id === source.id);
        if (!exists) {
          sources.sources.push(source);
          totalNewSources++;
          const num = parseInt(source.id.replace('S', ''), 10);
          if (num > maxSourceNum) maxSourceNum = num;
        }
      });

      mergedBatches.push(batchNum);
    }
  }

  fs.writeFileSync(sourcesPath, JSON.stringify(sources, null, 2));
  return { merged: mergedBatches, new_sources: totalNewSources, max_id: maxSourceNum };
}

/**
 * Update state.json with merge results
 */
function updateState(casePath, maxSourceId) {
  const statePath = path.join(casePath, 'state.json');
  const state = readJsonFile(statePath);

  if (!state) {
    return { success: false, error: 'state.json not found' };
  }

  // Update next_source to highest used + 1
  if (maxSourceId >= state.next_source) {
    state.next_source = maxSourceId + 1;
  }

  // Clear any source allocations for question batches
  if (state.source_allocations) {
    Object.keys(state.source_allocations).forEach(key => {
      if (key.startsWith('question_batch_')) {
        delete state.source_allocations[key];
      }
    });
  }

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  return { success: true, next_source: state.next_source };
}

/**
 * Clean up temp files
 */
function cleanupTempFiles(casePath) {
  const tempDir = path.join(casePath, 'temp');
  if (!fs.existsSync(tempDir)) {
    return { cleaned: 0 };
  }

  const files = fs.readdirSync(tempDir);
  const batchFiles = files.filter(f =>
    f.match(/^(summary|leads|sources)-batch-\d+\.(md|json)$/)
  );

  batchFiles.forEach(f => {
    fs.unlinkSync(path.join(tempDir, f));
  });

  // Remove temp dir if empty
  if (fs.readdirSync(tempDir).length === 0) {
    fs.rmdirSync(tempDir);
  }

  return { cleaned: batchFiles.length };
}

/**
 * Check if batch temp files exist
 */
function checkBatchFiles(casePath) {
  const tempDir = path.join(casePath, 'temp');
  if (!fs.existsSync(tempDir)) {
    return { exists: false, batches: [] };
  }

  const files = fs.readdirSync(tempDir);
  const batches = [];

  for (let i = 1; i <= 5; i++) {
    const hasLeads = files.includes(`leads-batch-${i}.json`);
    const hasFindings = files.includes(`findings-batch-${i}.md`) || files.includes(`summary-batch-${i}.md`);
    const hasSources = files.includes(`sources-batch-${i}.json`);
    if (hasLeads || hasFindings || hasSources) {
      batches.push({ num: i, leads: hasLeads, findings: hasFindings, sources: hasSources });
    }
  }

  return { exists: batches.length > 0, batches };
}

/**
 * Main merge function
 */
function mergeQuestionBatches(casePath) {
  const results = {
    timestamp: new Date().toISOString(),
    case: casePath
  };

  // Check for batch files
  const batchCheck = checkBatchFiles(casePath);
  if (!batchCheck.exists) {
    return { success: false, error: 'No batch files found', results };
  }
  results.found_batches = batchCheck.batches;

  // Merge summaries
  results.findings = mergeFindingsBatches(casePath);

  // Merge leads
  results.leads = mergeLeadsBatches(casePath);

  // Merge sources
  results.sources = mergeSourcesBatches(casePath);

  // Update state
  const maxSourceId = results.sources.max_id;
  results.state = updateState(casePath, maxSourceId);

  // Cleanup
  results.cleanup = cleanupTempFiles(casePath);

  results.success = true;
  return results;
}

// CLI
function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(`Usage: node scripts/merge-question-batches.js <case-path> [--check]

Arguments:
  case-path    Path to the case directory
  --check      Only check for batch files, don't merge

Merges temp files from parallel question processing:
  temp/findings-batch-N.md → findings/F###.md
  temp/leads-batch-N.json  → leads.json
  temp/sources-batch-N.json → sources.json
`);
    process.exit(1);
  }

  const casePath = args[0];
  const checkOnly = args.includes('--check');

  if (!fs.existsSync(casePath)) {
    console.error(`Error: Case path not found: ${casePath}`);
    process.exit(1);
  }

  if (checkOnly) {
    const check = checkBatchFiles(casePath);
    console.log(JSON.stringify(check, null, 2));
    process.exit(check.exists ? 0 : 1);
  }

  const results = mergeQuestionBatches(casePath);
  console.log(JSON.stringify(results, null, 2));
  process.exit(results.success ? 0 : 1);
}

// Export functions for programmatic use
module.exports = {
  mergeQuestionBatches,
  mergeFindingsBatches,
  mergeLeadsBatches,
  mergeSourcesBatches,
  updateState,
  cleanupTempFiles,
  checkBatchFiles
};

// Run CLI if executed directly
if (require.main === module) {
  main();
}
