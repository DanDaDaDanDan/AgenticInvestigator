#!/usr/bin/env node
/**
 * merge-batch-leads.js - Merge leads from batch*_results.json files into leads.json
 *
 * Usage: node scripts/merge-batch-leads.js <case-path>
 */

const fs = require('fs');
const path = require('path');

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

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: node scripts/merge-batch-leads.js <case-path>');
    process.exit(1);
  }

  const casePath = args[0];
  const leadsPath = path.join(casePath, 'leads.json');

  // Read existing leads
  const leads = readJsonFile(leadsPath, { max_depth: 3, leads: [], version: 1 });
  const existingLeadTexts = new Set(leads.leads.map(l => l.lead));

  // Find highest existing lead number
  let maxLeadNum = leads.leads.reduce((max, l) => {
    const num = parseInt(l.id.replace('L', ''), 10);
    return num > max ? num : max;
  }, 0);

  console.log(`Existing leads: ${leads.leads.length} (max ID: L${String(maxLeadNum).padStart(3, '0')})`);

  // Find all batch result files
  const batchFiles = [];

  // Check root of case
  for (let i = 1; i <= 10; i++) {
    const batchFile = path.join(casePath, `batch${i}_results.json`);
    if (fs.existsSync(batchFile)) {
      batchFiles.push(batchFile);
    }
  }

  // Check temp directory
  const tempDir = path.join(casePath, 'temp');
  if (fs.existsSync(tempDir)) {
    for (let i = 1; i <= 10; i++) {
      const batchFile = path.join(tempDir, `batch${i}_results.json`);
      if (fs.existsSync(batchFile)) {
        batchFiles.push(batchFile);
      }
    }
  }

  console.log(`Found ${batchFiles.length} batch files`);

  let totalAdded = 0;
  let totalSkipped = 0;

  // Process each batch file
  for (const batchFile of batchFiles) {
    const batchData = readJsonFile(batchFile);
    if (!batchData || !batchData.leads_added) {
      console.log(`  Skipping ${path.basename(batchFile)} - no leads_added`);
      continue;
    }

    const batchLeads = batchData.leads_added;
    let added = 0;
    let skipped = 0;

    for (const lead of batchLeads) {
      // Check for duplicate by lead text
      if (existingLeadTexts.has(lead.lead)) {
        skipped++;
        continue;
      }

      // Assign new sequential ID
      maxLeadNum++;
      const newLead = {
        id: `L${String(maxLeadNum).padStart(3, '0')}`,
        lead: lead.lead,
        from: lead.from,
        priority: lead.priority || 'MEDIUM',
        depth: lead.depth || 0,
        parent: lead.parent || null,
        status: lead.status || 'pending',
        result: lead.result || null,
        sources: lead.sources || []
      };

      leads.leads.push(newLead);
      existingLeadTexts.add(lead.lead);
      added++;
    }

    console.log(`  ${path.basename(batchFile)}: +${added} leads (${skipped} duplicates)`);
    totalAdded += added;
    totalSkipped += skipped;
  }

  // Update version and save
  leads.version = (leads.version || 0) + 1;
  fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));

  console.log(`\nTotal: ${totalAdded} leads added, ${totalSkipped} duplicates skipped`);
  console.log(`New lead count: ${leads.leads.length}`);
  console.log(`New max ID: L${String(maxLeadNum).padStart(3, '0')}`);

  return { success: true, added: totalAdded, skipped: totalSkipped, total: leads.leads.length };
}

main();
