#!/usr/bin/env node
/**
 * Fix YAML frontmatter in findings files to use proper JSON arrays
 */

const fs = require('fs');
const path = require('path');

const findingsDir = process.argv[2] || 'D:/Personal/AgenticInvestigator/cases/solo-free-climbing-deaths-and-risk-factors/findings';
const files = fs.readdirSync(findingsDir).filter(f => f.endsWith('.md'));

for (const file of files) {
  const filePath = path.join(findingsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Fix sources and related_leads arrays - change [S001, S002] to ["S001", "S002"]
  content = content.replace(/^(sources|related_leads): \[([^\]]*)\]$/gm, (match, key, arrayContent) => {
    if (!arrayContent.trim()) return match;  // Empty array
    const items = arrayContent.split(',').map(item => {
      const trimmed = item.trim();
      // If already quoted, leave it
      if (trimmed.startsWith('"')) return trimmed;
      return '"' + trimmed + '"';
    });
    return key + ': [' + items.join(', ') + ']';
  });

  fs.writeFileSync(filePath, content);
  console.log('Fixed:', file);
}
console.log('Done!');
