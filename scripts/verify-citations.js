#!/usr/bin/env node
/**
 * verify-citations.js - Validate that all [S###] citations have captured evidence
 *
 * This is an ENFORCEMENT script that prevents hallucinated citations.
 * Any findings file citing [S###] without corresponding evidence/web/S###/ fails.
 *
 * Usage:
 *   node scripts/verify-citations.js cases/[case-id]
 *   node scripts/verify-citations.js cases/[case-id] --json
 *   node scripts/verify-citations.js cases/[case-id] --fix    # Show what needs fixing
 *
 * Exit codes:
 *   0 - All citations have evidence
 *   1 - Citations found without evidence (BLOCKER)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const showFix = args.includes('--fix');
const caseDir = args.find(a => !a.startsWith('--'));

if (!caseDir) {
  console.error('Usage: node scripts/verify-citations.js <case_dir> [--json] [--fix]');
  process.exit(1);
}

if (!fs.existsSync(caseDir)) {
  console.error(`Error: Case directory not found: ${caseDir}`);
  process.exit(1);
}

// Extract all [S###] citations from text
function extractCitations(text) {
  const pattern = /\[S(\d{3,4})\]/g;
  const citations = new Set();
  let match;
  while ((match = pattern.exec(text)) !== null) {
    citations.add(`S${match[1]}`);
  }
  return Array.from(citations).sort();
}

// Check if evidence exists for a source ID
// STRICT: Requires actual content files, not just metadata.json stubs
function evidenceExists(caseDir, sourceId) {
  const webPath = path.join(caseDir, 'evidence', 'web', sourceId);

  // Check web evidence - MUST have metadata.json AND actual content
  if (fs.existsSync(webPath)) {
    const metaPath = path.join(webPath, 'metadata.json');
    if (fs.existsSync(metaPath)) {
      // Check for actual captured content files
      const files = fs.readdirSync(webPath);
      const contentFiles = files.filter(f =>
        f.startsWith('capture.') ||  // capture.md, capture.html, capture.png, capture.pdf
        f.endsWith('.html') ||
        f.endsWith('.md') ||
        f.endsWith('.pdf') ||
        f === 'content.md' ||
        f === 'content.html' ||
        f === 'extracted_text.txt'
      );

      if (contentFiles.length > 0) {
        return { exists: true, type: 'web', path: webPath, hasContent: true };
      }

      // Check if metadata.json has a "files" field (proper firecrawl capture)
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        if (meta.files && Object.keys(meta.files).length > 0) {
          // Has files metadata but files might be missing - check
          const fileKeys = Object.keys(meta.files);
          const hasFiles = fileKeys.some(k => {
            const filePath = path.join(webPath, meta.files[k].path || meta.files[k]);
            return fs.existsSync(filePath);
          });
          if (hasFiles) {
            return { exists: true, type: 'web', path: webPath, hasContent: true };
          }
        }
        // metadata.json exists but has no "files" field = stub/fake evidence
        return { exists: false, type: 'stub', path: webPath, hasContent: false,
                 reason: 'metadata.json exists but no actual content captured' };
      } catch (e) {
        return { exists: false, type: 'error', path: webPath, hasContent: false,
                 reason: `metadata.json parse error: ${e.message}` };
      }
    }
  }

  // Check document evidence
  const docDir = path.join(caseDir, 'evidence', 'documents');
  if (fs.existsSync(docDir)) {
    const files = fs.readdirSync(docDir);
    const docFile = files.find(f => f.startsWith(`${sourceId}_`));
    if (docFile) {
      return { exists: true, type: 'document', path: path.join(docDir, docFile), hasContent: true };
    }
  }

  return { exists: false, type: null, path: null, hasContent: false };
}

// Scan all findings files
function scanFindings(caseDir) {
  const findingsDir = path.join(caseDir, 'findings');
  const results = {
    files_scanned: 0,
    total_citations: 0,
    valid_citations: 0,
    stub_citations: 0,  // metadata.json exists but no actual content
    missing_evidence: [],
    stub_evidence: [],  // Track stubs separately
    by_file: {}
  };

  if (!fs.existsSync(findingsDir)) {
    return results;
  }

  const files = fs.readdirSync(findingsDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(findingsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const citations = extractCitations(content);

    results.files_scanned++;
    results.by_file[file] = {
      citations: citations.length,
      valid: 0,
      stubs: [],
      missing: []
    };

    for (const sourceId of citations) {
      results.total_citations++;
      const evidence = evidenceExists(caseDir, sourceId);

      if (evidence.exists && evidence.hasContent) {
        results.valid_citations++;
        results.by_file[file].valid++;
      } else if (evidence.type === 'stub') {
        // Metadata exists but no actual content - this is FAKE evidence
        results.stub_citations++;
        results.stub_evidence.push({
          source_id: sourceId,
          cited_in: file,
          evidence_path: evidence.path,
          reason: evidence.reason
        });
        results.by_file[file].stubs.push(sourceId);
      } else {
        results.missing_evidence.push({
          source_id: sourceId,
          cited_in: file,
          evidence_path_expected: `evidence/web/${sourceId}/`,
          reason: evidence.reason || 'No evidence folder exists'
        });
        results.by_file[file].missing.push(sourceId);
      }
    }
  }

  return results;
}

// Also scan summary.md if it exists
function scanSummary(caseDir, results) {
  const summaryPath = path.join(caseDir, 'summary.md');
  if (!fs.existsSync(summaryPath)) {
    return;
  }

  const content = fs.readFileSync(summaryPath, 'utf-8');
  const citations = extractCitations(content);

  results.by_file['summary.md'] = {
    citations: citations.length,
    valid: 0,
    stubs: [],
    missing: []
  };

  for (const sourceId of citations) {
    results.total_citations++;
    const evidence = evidenceExists(caseDir, sourceId);

    if (evidence.exists && evidence.hasContent) {
      results.valid_citations++;
      results.by_file['summary.md'].valid++;
    } else if (evidence.type === 'stub') {
      // Metadata exists but no actual content
      results.stub_citations++;
      const existing = results.stub_evidence.find(
        m => m.source_id === sourceId && m.cited_in === 'summary.md'
      );
      if (!existing) {
        results.stub_evidence.push({
          source_id: sourceId,
          cited_in: 'summary.md',
          evidence_path: evidence.path,
          reason: evidence.reason
        });
      }
      results.by_file['summary.md'].stubs.push(sourceId);
    } else {
      // Check if already in missing_evidence from findings
      const existing = results.missing_evidence.find(
        m => m.source_id === sourceId && m.cited_in === 'summary.md'
      );
      if (!existing) {
        results.missing_evidence.push({
          source_id: sourceId,
          cited_in: 'summary.md',
          evidence_path_expected: `evidence/web/${sourceId}/`,
          reason: evidence.reason || 'No evidence folder exists'
        });
      }
      results.by_file['summary.md'].missing.push(sourceId);
    }
  }
}

// Get URL for source from sources.json if available
function getSourceUrl(caseDir, sourceId) {
  const sourcesPath = path.join(caseDir, 'sources.json');
  if (!fs.existsSync(sourcesPath)) return null;

  try {
    const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
    if (sources[sourceId] && sources[sourceId].url) {
      return sources[sourceId].url;
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Main
const results = scanFindings(caseDir);
scanSummary(caseDir, results);

// Deduplicate missing evidence (same source cited in multiple files)
const uniqueMissing = [];
const seenSources = new Set();
for (const m of results.missing_evidence) {
  if (!seenSources.has(m.source_id)) {
    seenSources.add(m.source_id);
    m.url = getSourceUrl(caseDir, m.source_id);
    m.cited_in_files = results.missing_evidence
      .filter(x => x.source_id === m.source_id)
      .map(x => x.cited_in);
    uniqueMissing.push(m);
  }
}

// Deduplicate stub evidence (same source cited in multiple files)
const uniqueStubs = [];
const seenStubSources = new Set();
for (const s of results.stub_evidence) {
  if (!seenStubSources.has(s.source_id)) {
    seenStubSources.add(s.source_id);
    s.url = getSourceUrl(caseDir, s.source_id);
    s.cited_in_files = results.stub_evidence
      .filter(x => x.source_id === s.source_id)
      .map(x => x.cited_in);
    uniqueStubs.push(s);
  }
}

results.unique_missing = uniqueMissing;
results.unique_stubs = uniqueStubs;
// FAIL if missing OR stubs (stubs are fake evidence)
results.pass = uniqueMissing.length === 0 && uniqueStubs.length === 0;

if (jsonOutput) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log('='.repeat(60));
  console.log('CITATION VERIFICATION');
  console.log('='.repeat(60));
  console.log(`Case: ${caseDir}`);
  console.log(`Files scanned: ${results.files_scanned + (results.by_file['summary.md'] ? 1 : 0)}`);
  console.log(`Total citations: ${results.total_citations}`);
  console.log(`Valid (with real content): ${results.valid_citations}`);
  console.log(`Stub evidence (metadata only): ${uniqueStubs.length}`);
  console.log(`Missing evidence: ${uniqueMissing.length}`);
  console.log('');

  if (results.pass) {
    console.log('PASS: All citations have captured evidence with actual content');
  } else {
    console.log('FAIL: Citations found WITHOUT proper captured evidence');
    console.log('');

    // Show stubs first (more insidious - looks like evidence but isn't)
    if (uniqueStubs.length > 0) {
      console.log('STUB EVIDENCE (metadata.json exists but NO actual content):');
      for (const s of uniqueStubs) {
        console.log(`  ${s.source_id}: cited in ${s.cited_in_files.join(', ')}`);
        console.log(`    Path: ${s.evidence_path}`);
        console.log(`    Issue: ${s.reason}`);
      }
      console.log('');
    }

    if (uniqueMissing.length > 0) {
      console.log('MISSING EVIDENCE (no evidence folder at all):');
      for (const m of uniqueMissing) {
        console.log(`  ${m.source_id}: cited in ${m.cited_in_files.join(', ')}`);
        if (m.url) {
          console.log(`    URL: ${m.url}`);
        }
        console.log(`    Expected: ${m.evidence_path_expected}`);
      }
    }

    if (showFix) {
      console.log('');
      console.log('To fix, capture each source properly:');
      console.log('');

      // Fix stubs
      for (const s of uniqueStubs) {
        if (s.url) {
          console.log(`# Re-capture ${s.source_id} (has stub, needs real content):`);
          console.log(`node scripts/capture.js ${s.source_id} "${s.url}" ${caseDir}`);
        } else {
          console.log(`# ${s.source_id}: URL unknown - check sources.json`);
        }
      }

      // Fix missing
      for (const m of uniqueMissing) {
        if (m.url) {
          console.log(`node scripts/capture.js ${m.source_id} "${m.url}" ${caseDir}`);
        } else {
          console.log(`# ${m.source_id}: URL unknown - check sources.json or findings files`);
        }
      }
    }
  }
}

process.exit(results.pass ? 0 : 1);
