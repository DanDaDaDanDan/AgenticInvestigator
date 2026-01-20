#!/usr/bin/env node
/**
 * merge-batch-results.js - Merge results from parallel follow agents
 *
 * Merges temp files from parallel agents into main case files:
 * - summary-batch-{id}.md fragments → summary.md
 * - leads-batch-{id}.json new leads → leads.json
 * - sources-batch-{id}.json entries → sources.json
 *
 * Usage: node scripts/merge-batch-results.js <case-path> <batch-id>
 */

const fs = require('fs');
const path = require('path');

/**
 * Read JSON file safely
 */
function readJsonFile(filePath, defaultValue = {}) {
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Append content to summary.md
 */
function mergeSummaryFragments(casePath, batchId, fragments) {
  const summaryPath = path.join(casePath, 'summary.md');
  let summary = '';
  if (fs.existsSync(summaryPath)) {
    summary = fs.readFileSync(summaryPath, 'utf-8');
  }

  // Add findings section if fragments exist
  if (fragments && fragments.length > 0) {
    // Check if we already have a "Findings from Leads" section
    if (!summary.includes('## Findings from Leads')) {
      summary += '\n\n## Findings from Leads\n';
    }

    fragments.forEach(fragment => {
      if (fragment.content && fragment.content.trim()) {
        summary += `\n### ${fragment.lead_id}: ${fragment.lead_title || 'Result'}\n`;
        summary += fragment.content + '\n';
      }
    });
  }

  fs.writeFileSync(summaryPath, summary);
  return { success: true, fragments_merged: fragments.length };
}

/**
 * Merge new leads into leads.json
 */
function mergeNewLeads(casePath, newLeads, leadIdStart) {
  const leadsPath = path.join(casePath, 'leads.json');
  const leads = readJsonFile(leadsPath, { max_depth: 3, leads: [], version: 1 });

  let nextId = leadIdStart;
  const addedLeads = [];

  newLeads.forEach(newLead => {
    // Assign ID if not already assigned
    if (!newLead.id) {
      newLead.id = `L${String(nextId++).padStart(3, '0')}`;
    }

    // Check if lead already exists (by content match)
    const exists = leads.leads.some(l =>
      l.lead === newLead.lead && l.parent === newLead.parent
    );

    if (!exists) {
      leads.leads.push(newLead);
      addedLeads.push(newLead.id);
    }
  });

  // Increment version
  leads.version = (leads.version || 0) + 1;

  fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));
  return { success: true, added: addedLeads, next_id: nextId };
}

/**
 * Update lead status in leads.json
 */
function updateLeadStatus(casePath, updates) {
  const leadsPath = path.join(casePath, 'leads.json');
  const leads = readJsonFile(leadsPath, { max_depth: 3, leads: [], version: 1 });

  updates.forEach(update => {
    const lead = leads.leads.find(l => l.id === update.id);
    if (lead) {
      lead.status = update.status;
      lead.result = update.result;
      lead.sources = update.sources || [];
      // Clear claim info
      delete lead.claimed_by;
      delete lead.claimed_at;
    }
  });

  // Increment version
  leads.version = (leads.version || 0) + 1;

  fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));
  return { success: true, updated: updates.length };
}

/**
 * Merge new sources into sources.json
 */
function mergeSources(casePath, newSources) {
  const sourcesPath = path.join(casePath, 'sources.json');
  const sources = readJsonFile(sourcesPath, { sources: [] });

  const addedSources = [];

  newSources.forEach(source => {
    // Check if source already exists
    const exists = sources.sources.some(s => s.id === source.id);
    if (!exists) {
      sources.sources.push(source);
      addedSources.push(source.id);
    }
  });

  fs.writeFileSync(sourcesPath, JSON.stringify(sources, null, 2));
  return { success: true, added: addedSources };
}

/**
 * Update state.json with batch results
 */
function updateState(casePath, batchId, results) {
  const statePath = path.join(casePath, 'state.json');
  const state = readJsonFile(statePath);

  // Update next_source if needed
  if (results.highest_source_used && results.highest_source_used >= state.next_source) {
    state.next_source = results.highest_source_used + 1;
  }

  // Clear source allocation for this batch
  if (state.source_allocations && state.source_allocations[batchId]) {
    state.source_allocations[batchId].status = 'committed';
    state.source_allocations[batchId].committed_at = new Date().toISOString();
    delete state.source_allocations[batchId];
  }

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  return { success: true };
}

/**
 * Update framework question files with lead findings
 */
function updateQuestionFiles(casePath, findings) {
  let updated = 0;

  findings.forEach(finding => {
    if (!finding.framework_file || !finding.content) return;

    const frameworkPath = path.join(casePath, 'questions', finding.framework_file);
    if (!fs.existsSync(frameworkPath)) return;

    let content = fs.readFileSync(frameworkPath, 'utf-8');

    // Add findings section if not present
    if (!content.includes('## Findings from Leads')) {
      content += '\n\n## Findings from Leads\n';
    }

    // Add the finding
    content += `\n### ${finding.lead_id} Result\n${finding.content}\n`;

    fs.writeFileSync(frameworkPath, content);
    updated++;
  });

  return { success: true, updated };
}

/**
 * Main merge function - combines all batch results
 */
function mergeBatchResults(casePath, batchId, results) {
  const mergeResults = {
    batch_id: batchId,
    timestamp: new Date().toISOString(),
    operations: {}
  };

  // 1. Update lead statuses
  if (results.lead_updates && results.lead_updates.length > 0) {
    mergeResults.operations.lead_updates = updateLeadStatus(casePath, results.lead_updates);
  }

  // 2. Add new child leads
  if (results.new_leads && results.new_leads.length > 0) {
    const leadIdStart = results.lead_id_start || 1;
    mergeResults.operations.new_leads = mergeNewLeads(casePath, results.new_leads, leadIdStart);
  }

  // 3. Merge sources
  if (results.new_sources && results.new_sources.length > 0) {
    mergeResults.operations.sources = mergeSources(casePath, results.new_sources);
  }

  // 4. Merge summary fragments
  if (results.summary_fragments && results.summary_fragments.length > 0) {
    mergeResults.operations.summary = mergeSummaryFragments(casePath, batchId, results.summary_fragments);
  }

  // 5. Update question files
  if (results.framework_findings && results.framework_findings.length > 0) {
    mergeResults.operations.questions = updateQuestionFiles(casePath, results.framework_findings);
  }

  // 6. Update state
  mergeResults.operations.state = updateState(casePath, batchId, results);

  return mergeResults;
}

/**
 * Clean up temp files for a batch
 */
function cleanupBatchFiles(casePath, batchId) {
  const tempDir = path.join(casePath, 'temp');
  if (!fs.existsSync(tempDir)) return { success: true, cleaned: 0 };

  const pattern = new RegExp(`.*-batch-${batchId}\\..*`);
  const files = fs.readdirSync(tempDir).filter(f => pattern.test(f));

  files.forEach(f => {
    fs.unlinkSync(path.join(tempDir, f));
  });

  return { success: true, cleaned: files.length };
}

// CLI
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`Usage: node scripts/merge-batch-results.js <case-path> <batch-id> [results-json]

Arguments:
  case-path    Path to the case directory
  batch-id     Batch identifier
  results-json JSON string with batch results (or pass via stdin)

Results JSON format:
{
  "lead_updates": [
    { "id": "L001", "status": "investigated", "result": "...", "sources": ["S001"] }
  ],
  "new_leads": [
    { "lead": "...", "from": "L001", "parent": "L001", "depth": 1, "priority": "MEDIUM" }
  ],
  "new_sources": [
    { "id": "S001", "url": "...", "captured": true }
  ],
  "summary_fragments": [
    { "lead_id": "L001", "lead_title": "...", "content": "..." }
  ],
  "framework_findings": [
    { "lead_id": "L001", "framework_file": "01-follow-the-money.md", "content": "..." }
  ],
  "highest_source_used": 5,
  "lead_id_start": 10
}
`);
    process.exit(1);
  }

  const casePath = args[0];
  const batchId = args[1];

  // Get results from argument or stdin
  let resultsJson = args[2];
  if (!resultsJson) {
    // Try reading from stdin
    try {
      resultsJson = fs.readFileSync(0, 'utf-8');
    } catch (e) {
      console.error('Error: No results provided. Pass as argument or via stdin.');
      process.exit(1);
    }
  }

  let results;
  try {
    results = JSON.parse(resultsJson);
  } catch (e) {
    console.error('Error: Invalid JSON in results');
    process.exit(1);
  }

  const mergeResults = mergeBatchResults(casePath, batchId, results);
  console.log(JSON.stringify(mergeResults, null, 2));

  process.exit(0);
}

// Export functions for programmatic use
module.exports = {
  mergeBatchResults,
  mergeNewLeads,
  updateLeadStatus,
  mergeSources,
  mergeSummaryFragments,
  updateQuestionFiles,
  updateState,
  cleanupBatchFiles
};

// Run CLI if executed directly
if (require.main === module) {
  main();
}
