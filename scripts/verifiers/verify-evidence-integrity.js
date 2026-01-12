/**
 * verify-evidence-integrity.js - Detect stub vs real evidence
 *
 * Verifies that evidence directories contain ACTUAL captured content,
 * not just agent-written metadata summaries.
 *
 * Stub evidence indicators:
 * - metadata.json has "summary", "key_facts", "key_claims" fields
 * - metadata.json lacks "files" field with hashes
 * - metadata.json lacks "method" (firecrawl, playwright, etc.)
 * - No actual content files (capture.html, capture.md, capture.png)
 *
 * Real evidence indicators:
 * - metadata.json has "files" field with paths and hashes
 * - metadata.json has "method", "http_status", "capture_duration_ms"
 * - Actual content files exist and match metadata
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'evidence-integrity',
  description: 'Verify evidence is real captures, not agent-written stubs',

  run(caseDir) {
    const webDir = path.join(caseDir, 'evidence', 'web');
    const gaps = [];

    if (!fs.existsSync(webDir)) {
      return { passed: true, gaps: [] }; // No web evidence yet
    }

    const sourceDirs = fs.readdirSync(webDir)
      .filter(d => fs.statSync(path.join(webDir, d)).isDirectory())
      .sort();

    let stubCount = 0;
    let validCount = 0;

    for (const sourceId of sourceDirs) {
      const sourceDir = path.join(webDir, sourceId);
      const metaPath = path.join(sourceDir, 'metadata.json');

      if (!fs.existsSync(metaPath)) {
        gaps.push({
          type: 'MISSING_METADATA',
          severity: 'HIGH',
          source_id: sourceId,
          description: `Evidence folder ${sourceId} has no metadata.json`,
          remediation: `Run capture: node scripts/capture.js ${sourceId} <url> ${caseDir}`
        });
        continue;
      }

      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const analysis = analyzeMetadata(meta, sourceDir);

        if (analysis.isStub) {
          stubCount++;
          gaps.push({
            type: 'STUB_EVIDENCE',
            severity: 'BLOCKER',
            source_id: sourceId,
            description: `${sourceId} is stub evidence (agent-written summary, not actual capture)`,
            indicators: analysis.stubIndicators,
            url: meta.url || 'unknown',
            remediation: `Re-capture with: node scripts/capture.js ${sourceId} "${meta.url}" ${caseDir}`
          });
        } else if (analysis.issues.length > 0) {
          gaps.push({
            type: 'EVIDENCE_ISSUES',
            severity: 'MEDIUM',
            source_id: sourceId,
            description: `${sourceId} has evidence integrity issues`,
            issues: analysis.issues
          });
        } else {
          validCount++;
        }
      } catch (e) {
        gaps.push({
          type: 'INVALID_METADATA',
          severity: 'HIGH',
          source_id: sourceId,
          description: `Failed to parse metadata.json: ${e.message}`
        });
      }
    }

    const passed = stubCount === 0;

    return {
      passed,
      gaps,
      summary: {
        total_sources: sourceDirs.length,
        valid_captures: validCount,
        stub_evidence: stubCount,
        issues: gaps.filter(g => g.type === 'EVIDENCE_ISSUES').length
      }
    };
  }
};

/**
 * Analyze metadata to determine if it's a stub or real capture
 */
function analyzeMetadata(meta, sourceDir) {
  const stubIndicators = [];
  const realIndicators = [];
  const issues = [];

  // Stub indicators - things agents write but scripts don't
  if (meta.summary) stubIndicators.push('has "summary" field (agent-written)');
  if (meta.key_facts) stubIndicators.push('has "key_facts" field (agent-written)');
  if (meta.key_claims) stubIndicators.push('has "key_claims" field (agent-written)');
  if (meta.id && !meta.source_id) stubIndicators.push('uses "id" instead of "source_id"');

  // Real capture indicators - things scripts write
  if (meta.files && typeof meta.files === 'object') realIndicators.push('has "files" field');
  if (meta.method) realIndicators.push(`has "method" (${meta.method})`);
  if (meta.http_status) realIndicators.push(`has "http_status" (${meta.http_status})`);
  if (meta.capture_duration_ms) realIndicators.push('has "capture_duration_ms"');

  // Check for actual content files
  const contentFiles = ['capture.html', 'capture.md', 'capture.png', 'capture.pdf', 'content.html', 'content.md'];
  const foundFiles = contentFiles.filter(f => fs.existsSync(path.join(sourceDir, f)));

  if (foundFiles.length > 0) {
    realIndicators.push(`has content files: ${foundFiles.join(', ')}`);
  } else {
    stubIndicators.push('no content files found');
  }

  // Verify files field matches actual files
  if (meta.files) {
    for (const [type, info] of Object.entries(meta.files)) {
      if (info.path) {
        const filePath = path.join(sourceDir, info.path);
        if (!fs.existsSync(filePath)) {
          issues.push(`metadata.files.${type}.path="${info.path}" but file doesn't exist`);
        }
      }
    }
  }

  // Decision: stub if more stub indicators than real, or no real indicators
  const isStub = (stubIndicators.length > realIndicators.length) ||
                 (realIndicators.length === 0 && stubIndicators.length > 0) ||
                 (foundFiles.length === 0 && !meta.files);

  return {
    isStub,
    stubIndicators,
    realIndicators,
    issues
  };
}
