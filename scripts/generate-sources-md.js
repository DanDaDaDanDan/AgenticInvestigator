#!/usr/bin/env node
/**
 * generate-sources-md.js - Generate sources.md from captured evidence
 *
 * Usage: node generate-sources-md.js <case-dir>
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node generate-sources-md.js <case-dir>');
  process.exit(1);
}

const caseDir = args[0];

// Read existing sources.md to get descriptions
const sourcesPath = path.join(caseDir, 'sources.md');
const existingContent = fs.readFileSync(sourcesPath, 'utf-8');

// Parse existing source descriptions
const sourceDescriptions = {};
const descRegex = /\*\*\[S(\d+)\]\*\*\s+(.+)/g;
let match;
while ((match = descRegex.exec(existingContent)) !== null) {
  const id = `S${match[1].padStart(3, '0')}`;
  sourceDescriptions[id] = match[2].trim();
}

// Get all evidence directories
const webDir = path.join(caseDir, 'evidence', 'web');
const evidenceDirs = fs.existsSync(webDir) ? fs.readdirSync(webDir).filter(d => d.startsWith('S')) : [];

// Collect evidence metadata
const sources = [];
for (const sourceId of evidenceDirs.sort()) {
  const metadataPath = path.join(webDir, sourceId, 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      sources.push({
        id: sourceId,
        url: metadata.url,
        title: metadata.title,
        captured_at: metadata.captured_at,
        evidence_dir: `evidence/web/${sourceId}/`,
        hash: metadata.files?.html?.hash || metadata.files?.png?.hash || 'N/A',
        description: sourceDescriptions[sourceId] || metadata.title || 'No description'
      });
    } catch (e) {
      console.error(`Error reading ${sourceId}: ${e.message}`);
    }
  }
}

// AI Research sources (moved to research-leads)
const aiResearchIds = ['S007', 'S037', 'S038', 'S039', 'S040', 'S042', 'S051', 'S081', 'S082', 'S083', 'S084', 'S094', 'S095', 'S103'];

// Sources without URLs (court filings, etc.)
const noUrlSources = {
  'S014': { desc: 'Moore v. Happy Egg Co., CA Superior Court SF (2021). 90%+ indoor confinement claims. Dismissed 2022.', reason: 'State court filing - no public URL' },
  'S032': { desc: 'Vital Farms "Egg Central Station" Springfield MO. 86,000 sq ft processing facility.', reason: 'No dedicated article found' },
  'S049': { desc: 'Spring Creek Farms (TX) Lawsuit vs. Vital Farms 2023. $300k coop investment, settled privately.', reason: 'State court filing - no public URL' },
  'S050': { desc: 'Vital Farms SEC 10-K: Farmer Retention Risks. Company acknowledges retention risks.', reason: 'See S005/S029 SEC filings' },
  'S052': { desc: 'Vital Farms Farm Size Data. Farms range 50-700 acres total.', reason: 'See S005/S029 SEC filings' },
  'S054': { desc: 'Vital Farms Reports No HPAI Outbreaks 2022-2024. Proactive indoor housing.', reason: 'See S041 APHIS data (negative result)' },
  'S062': { desc: 'Vital Farms Buy-Sell Contract Model. Farmers purchase birds and feed.', reason: 'See S005/S029 SEC filings' },
  'S063': { desc: 'Vital Farms SEC 10-K FY2021 "No Voluntary Attrition" claim.', reason: 'See S005/S029 SEC filings' },
  'S074': { desc: '2024 Class Action vs Kroger for False Pasture-Raised Claims (Law360).', reason: 'Paywalled - Law360 subscription required' }
};

// Generate new sources.md
let output = `# Source Registry

**Case**: inv-20260106-143022
**Topic**: Pasture-Raised Eggs at Harris Teeter

---

## Source Statistics

| Metric | Count |
|--------|-------|
| Total Sources | ${sources.length + aiResearchIds.length + Object.keys(noUrlSources).length} |
| Captured (web) | ${sources.length} |
| Research Leads | ${aiResearchIds.length} |
| Unavailable | ${Object.keys(noUrlSources).length} |

---

## Captured Sources

*All sources below have captured evidence with SHA-256 hashes for verification.*

`;

// Add captured sources
for (const src of sources) {
  output += `### [${src.id}] ${src.title || 'Untitled'}

| Field | Value |
|-------|-------|
| **URL** | ${src.url} |
| **Captured** | ${new Date(src.captured_at).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')} |
| **Evidence** | \`${src.evidence_dir}\` |
| **Hash** | \`${src.hash}\` |

**Description**: ${src.description}

---

`;
}

// Add AI Research leads section
output += `## Research Leads (Not Citable)

*AI research outputs are stored in \`research-leads/\` folder. These are used to find primary sources but are NOT cited in final outputs.*

| ID | Source | See |
|----|--------|-----|
`;

for (const id of aiResearchIds) {
  const desc = sourceDescriptions[id] || 'AI Research';
  output += `| ${id} | ${desc.substring(0, 60)}... | \`research-leads/ai-research-index.md\` |\n`;
}

output += `
---

## Unavailable Sources

*Sources that could not be captured (paywalled, state court filings, etc.)*

| ID | Description | Reason |
|----|-------------|--------|
`;

for (const [id, info] of Object.entries(noUrlSources)) {
  output += `| ${id} | ${info.desc.substring(0, 50)}... | ${info.reason} |\n`;
}

output += `
---

## Evidence Verification

Run \`node scripts/verify-sources.js cases/inv-20260106-143022\` to verify all evidence hashes.
`;

// Write output
const outputPath = path.join(caseDir, 'sources-new.md');
fs.writeFileSync(outputPath, output);
console.log(`Generated: ${outputPath}`);
console.log(`Captured sources: ${sources.length}`);
console.log(`Research leads: ${aiResearchIds.length}`);
console.log(`Unavailable: ${Object.keys(noUrlSources).length}`);
