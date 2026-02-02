#!/usr/bin/env node
/**
 * verify-source.js - Verify evidence integrity via hash verification
 *
 * Detects fabricated sources by:
 * 1. Hash verification: SHA256 of raw content matches stored hash
 * 2. Structure validation: Required fields present
 * 3. Red flag detection: Round timestamps, suspicious patterns
 *
 * Usage:
 *   node scripts/verify-source.js <source_id> <case_dir>
 *   node scripts/verify-source.js --all <case_dir>
 *   node scripts/verify-source.js --check-article <case_dir>
 *
 * Exit codes:
 *   0 - All sources verified
 *   1 - Verification failures found
 *   2 - Usage error
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { normalizeUrl } = require('./osint-save');

const RECEIPT_KEY_ENV = 'EVIDENCE_RECEIPT_KEY';

// Red flag patterns that suggest fabrication
const FABRICATION_PATTERNS = {
  roundTimestamp: /T\d{2}:00:00\.000Z$/,
  compilationContent: /^(Research compilation|Summary of|Synthesis of|Overview of)/i,
  homepageUrl: /^https?:\/\/[^/]+\/?$/,
  suspiciousTitle: /(compilation|synthesis|summary|overview|aggregat)/i
};

function getReceiptKey() {
  const key = process.env[RECEIPT_KEY_ENV];
  if (!key || typeof key !== 'string' || !key.trim()) return null;
  return key;
}

function verifyReceiptSignature(payload, signatureHex, key) {
  const expected = crypto.createHmac('sha256', key).update(payload).digest('hex');
  return expected === signatureHex;
}

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function hostMatches(a, b) {
  const aa = String(a || '').toLowerCase();
  const bb = String(b || '').toLowerCase();
  if (!aa || !bb) return false;
  return aa === bb || aa.endsWith(`.${bb}`) || bb.endsWith(`.${aa}`);
}

function safeUrlHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function extractCapturedFromHeaderUrl(html) {
  // Some capture pipelines prepend a provenance comment header.
  // This is not a trust anchor (it can be forged), but it is a useful consistency check.
  const head = String(html || '').slice(0, 2000);
  const m = head.match(/<!--\s*Captured from:\s*(https?:\/\/[^>\s]+)\s*-->/i);
  return m ? String(m[1]).trim() : null;
}

function extractCanonicalUrlFromHtml(html) {
  const raw = String(html || '');

  // Prefer canonical/og:url from the <head> section to avoid matching embedded third-party HTML.
  const headMatch = raw.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const haystack = headMatch ? headMatch[1] : raw;
  const patterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i,
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i
  ];
  for (const re of patterns) {
    const m = haystack.match(re);
    if (m && m[1]) return String(m[1]).trim();
  }
  return null;
}

function extractDominantAnchorHostname(html, options = {}) {
  const maxMatches = Number.isFinite(options.maxMatches) ? options.maxMatches : 500;
  const raw = String(html || '');
  const re = /<a[^>]+href=["'](https?:\/\/[^"']+)["']/ig;
  const counts = new Map();
  let total = 0;

  let match;
  while ((match = re.exec(raw)) !== null) {
    total += 1;
    if (total > maxMatches) break;
    try {
      const host = new URL(match[1]).hostname.toLowerCase();
      counts.set(host, (counts.get(host) || 0) + 1);
    } catch {
      // ignore invalid URLs
    }
  }

  if (counts.size === 0) return null;

  let topHost = null;
  let topCount = 0;
  for (const [host, count] of counts.entries()) {
    if (count > topCount) {
      topHost = host;
      topCount = count;
    }
  }

  return {
    hostname: topHost,
    count: topCount,
    total,
    share: total > 0 ? topCount / total : 0,
    uniqueHosts: counts.size
  };
}

function wordsFromText(text) {
  const raw = String(text || '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .toLowerCase();

  const words = raw
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 3);

  return [...new Set(words)];
}

function tokenOverlapRatio(aWords, bWords) {
  const a = Array.isArray(aWords) ? aWords : [];
  const b = Array.isArray(bWords) ? bWords : [];
  if (a.length === 0 || b.length === 0) return 0;
  const bSet = new Set(b);
  const overlap = a.filter(w => bSet.has(w)).length;
  return overlap / Math.min(a.length, b.length);
}

function verifySource(sourceId, caseDir, options = {}) {
  const strict = options.strict === true;
  const publication = options.publication === true;
  const evidenceDir = path.join(caseDir, 'evidence', sourceId);
  const metadataPath = path.join(evidenceDir, 'metadata.json');
  const result = {
    sourceId,
    valid: false,
    checks: [],
    errors: [],
    warnings: []
  };

  // Check 1: Evidence directory exists
  if (!fs.existsSync(evidenceDir)) {
    result.errors.push(`Evidence directory missing: evidence/${sourceId}/`);
    return result;
  }
  result.checks.push('directory_exists');

  // Check 2: metadata.json exists
  if (!fs.existsSync(metadataPath)) {
    result.errors.push('metadata.json missing - source may be fabricated');
    return result;
  }
  result.checks.push('metadata_exists');

  // Check 3: Parse metadata
  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  } catch (e) {
    result.errors.push(`metadata.json invalid JSON: ${e.message}`);
    return result;
  }
  result.checks.push('metadata_valid_json');

  // Check 4: Required fields
  // STRICT: Every source MUST have a valid URL (http/https)
  // No "synthesis" or "internal analysis" sources allowed - One Source = One URL
  const hasUrl = !!metadata.url;
  const hasCapturedAt = !!metadata.captured_at;
  const hasFiles = !!metadata.files;
  const hasSha256 = !!metadata.sha256;

  // Check for forbidden source types (synthesis sources are fabrication)
  const FORBIDDEN_TYPES = [
    'research_synthesis', 'synthesis', 'compilation',
    'internal_analysis', 'methodology_note', 'methodological_analysis',
    'academic_research_synthesis', 'literature_review_synthesis'
  ];
  if (FORBIDDEN_TYPES.includes(metadata.type)) {
    result.errors.push(`Forbidden source type: ${metadata.type} - One Source = One URL. No synthesis/compilation sources allowed.`);
  }
  // Also catch any type containing "synthesis" or "compilation"
  if (metadata.type && (metadata.type.includes('synthesis') || metadata.type.includes('compilation'))) {
    if (!FORBIDDEN_TYPES.includes(metadata.type)) {
      result.errors.push(`Forbidden source type pattern: ${metadata.type} - types containing 'synthesis' or 'compilation' are not allowed`);
    }
  }

  // URL is REQUIRED for all sources
  if (!hasUrl) {
    result.errors.push('Required field missing: url - every source must have a URL');
  } else {
    // Validate URL format - must be http or https
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(metadata.url)) {
      result.errors.push(`Invalid URL format: "${metadata.url}" - must start with http:// or https://`);
    }
    // Check for suspicious URLs that indicate fabrication
    if (metadata.url.includes('synthesis') || metadata.url.includes('compilation') || metadata.url.includes('multiple_sources')) {
      result.errors.push(`Fabricated URL detected: "${metadata.url}" - URLs cannot contain synthesis/compilation indicators`);
    }
  }
  if (!hasCapturedAt) result.errors.push('Required field missing: captured_at');
  if (!hasFiles && !hasSha256) result.errors.push('Required field missing: files or sha256');

  if (result.errors.length > 0) return result;
  result.checks.push('required_fields');

  // Check 4c: Provenance (publication-mode hardening)
  // For sources used in publication, require at least one provenance signal:
  // - receipt (osint-save.js), OR
  // - provenance block (firecrawl/browsertrix/mcp-osint), OR
  // - capture_method / method (osint_get / download), OR
  // - a plausible capture signature (sig_v2_osint_* / sig_v2_<hash> / sig_v2_*<timestamp>)
  if (publication) {
    const hasReceipt = !!(metadata.receipt && typeof metadata.receipt === 'object');
    const hasProvenance = !!(metadata.provenance && typeof metadata.provenance === 'object');
    const hasMethod = !!(
      (metadata.method && typeof metadata.method === 'string' && metadata.method.trim()) ||
      (metadata.verification?.method && typeof metadata.verification.method === 'string' && metadata.verification.method.trim())
    );
    const hasCaptureMethod = !!(metadata.capture_method && typeof metadata.capture_method === 'string' && metadata.capture_method.trim());

    const sig = metadata._capture_signature;
    const hasCaptureSignature = (() => {
      if (!sig || typeof sig !== 'string') return false;
      if (!sig.startsWith('sig_v2_')) return false;
      const suffix = sig.slice('sig_v2_'.length);
      if (!suffix) return false;

      // Mirrors (lightly) the later signature format checks: accept signatures that look like they were generated
      // by an automated capture pipeline (osint prefix / hash suffix / embedded timestamp pattern).
      if (suffix.startsWith('osint')) return true;
      if (/^[a-f0-9]{32}$/i.test(suffix)) return true;
      if (/\d{4}[-T]\d{2}/.test(suffix)) return true; // YYYY-MM or YYYYTMM pattern
      return false;
    })();

    if (!hasReceipt && !hasProvenance && !hasMethod && !hasCaptureMethod && !hasCaptureSignature) {
      result.errors.push('Missing capture provenance (expected receipt, provenance, method, or capture_method)');
      return result;
    }
    result.checks.push('provenance_present');
  }

  // Check 4b: Cryptographic receipt verification (optional; REQUIRED in strict mode)
  // If enabled, this prevents a model from fabricating/editing evidence files after capture.
  const receiptKey = getReceiptKey();
  const receipt = metadata.receipt;

  if (strict && !receiptKey) {
    result.errors.push(`Strict mode requires ${RECEIPT_KEY_ENV} to be set to verify receipt signatures`);
  }

  if (receipt && typeof receipt === 'object') {
    const receiptFile = receipt.osint_response_file;
    const expectedReceiptHash = receipt.osint_response_hash;

    if (receiptFile) {
      const receiptPath = path.join(evidenceDir, receiptFile);
      if (!fs.existsSync(receiptPath)) {
        result.errors.push(`Receipt file missing: ${receiptFile}`);
      } else if (expectedReceiptHash) {
        const actualReceiptHash = hashFile(receiptPath);
        if (actualReceiptHash === expectedReceiptHash) {
          result.checks.push('receipt_file_hash');
        } else {
          result.errors.push(`Receipt hash mismatch: file=${actualReceiptHash}, stored=${expectedReceiptHash}`);
        }
      } else if (strict) {
        result.errors.push('Receipt missing osint_response_hash');
      } else {
        result.warnings.push('Receipt present but osint_response_hash missing');
      }
    } else if (strict) {
      result.errors.push('Receipt missing osint_response_file');
    }

    if (receipt.payload && receipt.signature) {
      if (receiptKey) {
        const ok = verifyReceiptSignature(receipt.payload, receipt.signature, receiptKey);
        if (ok) {
          result.checks.push('receipt_signature');

          // Verify receipt payload file hashes against current evidence files.
          // This detects post-hoc edits even if metadata.json was also modified.
          try {
            const payloadObj = JSON.parse(receipt.payload);
            const payloadFiles = payloadObj && typeof payloadObj === 'object' ? payloadObj.files : null;
            if (payloadFiles && typeof payloadFiles === 'object') {
              for (const [key, expectedHash] of Object.entries(payloadFiles)) {
                if (!expectedHash) continue;

                let relPath = null;
                const fileInfo = metadata.files?.[key];
                if (fileInfo && typeof fileInfo === 'object' && fileInfo.path) relPath = fileInfo.path;
                else if (typeof fileInfo === 'string') relPath = fileInfo;
                else if (key === 'osint_response' && receipt.osint_response_file) relPath = receipt.osint_response_file;

                if (!relPath) continue;
                const filePath = path.join(evidenceDir, relPath);
                if (!fs.existsSync(filePath)) {
                  result.errors.push(`Receipt payload references missing file: ${relPath}`);
                  continue;
                }

                const actualHash = hashFile(filePath);
                if (actualHash !== expectedHash) {
                  result.errors.push(`Receipt payload hash mismatch for ${relPath}: actual=${actualHash}, expected=${expectedHash}`);
                }
              }
            } else if (strict) {
              result.errors.push('Receipt payload missing files map (cannot verify evidence file hashes)');
            }
          } catch (e) {
            if (strict) result.errors.push(`Receipt payload is not valid JSON: ${e.message}`);
            else result.warnings.push(`Receipt payload is not valid JSON: ${e.message}`);
          }
        } else {
          result.errors.push('Receipt signature invalid (evidence may be fabricated or manually edited)');
        }
      } else {
        result.warnings.push(`Receipt signature present but ${RECEIPT_KEY_ENV} not set; cannot verify cryptographically`);
      }
    } else if (strict) {
      result.errors.push('Receipt missing payload/signature (set EVIDENCE_RECEIPT_KEY before capturing)');
    }
  } else if (strict) {
    result.errors.push('Missing receipt block (metadata.receipt). Re-capture using osint_get + osint-save.js');
  }

  if (result.errors.length > 0) return result;

  // Check 5: Capture signature validation
  // Legitimate signatures from osint-save.js: sig_v2_[32 hex chars] or sig_v2_osint_[method]_[timestamp]
  // Fabricated signatures are human-readable: sig_v2_synthesis_topic_name
  if (metadata._capture_signature) {
    const sig = metadata._capture_signature;

    // Must start with sig_v2_
    if (!sig.startsWith('sig_v2_')) {
      result.errors.push(`Invalid capture signature format: "${sig}" - must start with sig_v2_`);
    } else {
      const sigSuffix = sig.slice(7); // After "sig_v2_"

      // Check for fabrication indicators in signature
      const fabricationWords = ['synthesis', 'compilation', 'aggregat', 'summary', 'overview', 'multiple'];
      const hasFabricationWord = fabricationWords.some(word => sigSuffix.toLowerCase().includes(word));

      if (hasFabricationWord) {
        result.errors.push(`Fabricated capture signature: "${sig}" - signatures cannot contain synthesis/compilation words`);
      } else {
        // Valid signature patterns:
        // 1. 32 hex chars: sig_v2_8cb2516b48e77f82f560e7966d6ab5fb
        // 2. osint prefix: sig_v2_osint_[method]_[something]
        // 3. Contains timestamp-like pattern
        const isHexHash = /^[a-f0-9]{32}$/.test(sigSuffix);
        const isOsintFormat = sigSuffix.startsWith('osint');
        const hasTimestamp = /\d{4}[-T]\d{2}/.test(sigSuffix); // YYYY-MM or YYYYTMM pattern

        if (isHexHash || isOsintFormat || hasTimestamp) {
          result.checks.push('capture_signature');
        } else {
          const msg = `Unusual capture signature format: "${sig}" - may be manually created`;
          if (publication) result.errors.push(msg);
          else result.warnings.push(msg);
        }
      }
    }
  } else {
    // Not an error for direct mcp-osint captures
    result.warnings.push('No _capture_signature (direct mcp-osint capture)');
  }

  // Check 6: Hash verification - supports both formats
  // Format A (osint-save): verification.raw_file + verification.computed_hash
  // Format B (mcp-osint): files.raw_html + sha256
  let verificationPassed = false;

  if (metadata.verification && metadata.verification.raw_file) {
    // Format A: osint-save verification block
    const v = metadata.verification;
    const rawPath = path.join(evidenceDir, v.raw_file);

    if (fs.existsSync(rawPath)) {
      const actualHash = hashFile(rawPath);

      if (v.computed_hash && actualHash === v.computed_hash) {
        result.checks.push('hash_self_consistent');
        verificationPassed = true;
      } else if (v.computed_hash) {
        result.errors.push(`Hash mismatch: file=${actualHash}, stored=${v.computed_hash}`);
      }

      // Check against osint_get reported hash (if provided)
      if (v.osint_reported_hash) {
        if (actualHash === v.osint_reported_hash) {
          result.checks.push('hash_matches_osint');
        } else {
          // WARNING: osint_get sha256 semantics can vary by provider (raw_html vs canonicalized html vs other).
          // In strict mode we rely on the cryptographic receipt signature instead.
          result.warnings.push(`Hash differs from osint_get: ${actualHash} vs ${v.osint_reported_hash}`);
        }
      }
    } else {
      result.errors.push(`Verification file missing: ${v.raw_file}`);
    }
  } else if (metadata.files && metadata.sha256) {
    // Format B: mcp-osint direct format (files.raw_html + sha256)
    const rawHtmlFile = metadata.files.raw_html;
    if (rawHtmlFile) {
      const rawPath = path.join(evidenceDir, rawHtmlFile);
      if (fs.existsSync(rawPath)) {
        const actualHash = hashFile(rawPath);
        const expectedHash = metadata.sha256.startsWith('sha256:') ? metadata.sha256 : `sha256:${metadata.sha256}`;

        if (actualHash === expectedHash) {
          result.checks.push('hash_verified_mcp_osint');
          verificationPassed = true;
        } else {
          result.errors.push(`Hash mismatch: file=${actualHash}, metadata=${expectedHash}`);
        }
      } else {
        result.errors.push(`Raw HTML file missing: ${rawHtmlFile}`);
      }
    }
  } else if (metadata.files) {
    // Legacy format - check files block for hashes (osint-save.js format)
    let hasVerifiableFile = false;

    for (const [key, fileInfo] of Object.entries(metadata.files)) {
      if (typeof fileInfo === 'object' && fileInfo.path && fileInfo.hash) {
        const filePath = path.join(evidenceDir, fileInfo.path);
        if (fs.existsSync(filePath)) {
          const actualHash = hashFile(filePath);
          if (actualHash === fileInfo.hash) {
            hasVerifiableFile = true;
            verificationPassed = true;
          } else {
            result.errors.push(`Hash mismatch for ${fileInfo.path}: actual=${actualHash}, stored=${fileInfo.hash}`);
          }
        }
      }
    }

    if (hasVerifiableFile) {
      result.checks.push('legacy_hash_verified');
    }
  }

  if (!verificationPassed) {
    result.errors.push('No verifiable hash information - cannot confirm evidence integrity');
  }

  // Check 6.5: URL/content consistency heuristics (best-effort)
  // Goal: detect cases where evidence files contain content from a different page/domain than metadata.url.
  // NOTE: Without an external receipt, this cannot fully prevent coherent fabrication; it only catches common capture mixups.
  try {
    const expectedUrl = typeof metadata.url === 'string' ? metadata.url.trim() : '';
    const expectedHost = safeUrlHost(expectedUrl);

    // Only run these checks when a raw HTML file exists.
    const rawRel =
      (metadata.verification && metadata.verification.raw_file) ||
      (metadata.files && typeof metadata.files.raw_html === 'string' ? metadata.files.raw_html : null) ||
      null;

    if (expectedHost && rawRel) {
      const rawPath = path.join(evidenceDir, rawRel);
      if (fs.existsSync(rawPath)) {
        const html = fs.readFileSync(rawPath, 'utf-8');

        // 6.5a) Header "Captured from" (if present)
        const headerUrl = extractCapturedFromHeaderUrl(html);
        if (headerUrl) {
          const normalizedHeader = normalizeUrl(headerUrl);
          const normalizedExpected = normalizeUrl(expectedUrl);
          if (normalizedHeader && normalizedExpected && normalizedHeader !== normalizedExpected) {
            const msg = `raw.html header URL disagrees with metadata.url: header=${headerUrl}, metadata=${expectedUrl}`;
            if (publication) result.errors.push(msg);
            else result.warnings.push(msg);
          } else {
            result.checks.push('header_url_consistent');
          }
        }

        // 6.5b) Canonical / og:url (if present)
        const canonicalRaw = extractCanonicalUrlFromHtml(html);
        if (canonicalRaw) {
          let canonicalAbs = canonicalRaw;
          try {
            canonicalAbs = new URL(canonicalRaw, expectedUrl).toString();
          } catch {
            // If we can't resolve, compare raw string.
            canonicalAbs = canonicalRaw;
          }

          const normalizedCanonical = normalizeUrl(canonicalAbs);
          const normalizedExpected = normalizeUrl(expectedUrl);
          if (normalizedCanonical && normalizedExpected && normalizedCanonical !== normalizedExpected) {
            const msg = `Canonical URL disagrees with metadata.url: canonical=${canonicalAbs}, metadata=${expectedUrl}`;
            if (publication) result.errors.push(msg);
            else result.warnings.push(msg);
          } else {
            result.checks.push('canonical_url_consistent');
          }
        }

        // 6.5c) Dominant anchor hostname (helps catch domain mixups like RockAndIce vs Climbing.com)
        const dom = extractDominantAnchorHostname(html);
        if (dom && dom.total >= 25 && dom.share >= 0.6 && !hostMatches(dom.hostname, expectedHost)) {
          const msg = `Dominant anchor hostname "${dom.hostname}" disagrees with metadata.url host "${expectedHost}" (${dom.count}/${dom.total} anchor hrefs)`;
          if (publication) result.errors.push(msg);
          else result.warnings.push(msg);
        } else if (dom) {
          result.checks.push('dominant_anchor_host_ok');
        }

        // 6.5d) Domain-specific sanity: AAC Publications slugs should broadly align with the page title.
        // This catches common “wrong slug/path pasted” errors that still pass hash checks.
        if (hostMatches(expectedHost, 'publications.americanalpineclub.org')) {
          const m = expectedUrl.match(/\/articles\/\d+\/([^/?#]+)$/i);
          const slug = m ? decodeURIComponent(m[1]) : null;
          if (slug && slug.length >= 25 && (slug.match(/-/g) || []).length >= 3 && metadata.title) {
            const slugWords = wordsFromText(slug.replace(/[-_]+/g, ' '));
            const titleWords = wordsFromText(String(metadata.title).replace(/^aac publications\s*-\s*/i, ' '));
            const overlap = tokenOverlapRatio(slugWords, titleWords);
            if (overlap < 0.2) {
              const msg = `AAC URL slug appears inconsistent with metadata.title (overlap=${overlap.toFixed(2)}): slug="${slug}", title="${String(metadata.title).trim()}"`;
              if (publication) result.errors.push(msg);
              else result.warnings.push(msg);
            } else {
              result.checks.push('aac_slug_matches_title');
            }
          }
        }
      }
    }
  } catch (e) {
    // Never fail verification due to heuristic crashes.
    result.warnings.push(`URL/content consistency check failed to run: ${e.message}`);
  }

  // Check 7: Red flags

  // Round timestamp
  if (metadata.captured_at && FABRICATION_PATTERNS.roundTimestamp.test(metadata.captured_at)) {
    result.warnings.push(`Suspicious round timestamp: ${metadata.captured_at}`);
  }

  // Homepage URL (not specific article)
  if (metadata.url && FABRICATION_PATTERNS.homepageUrl.test(metadata.url)) {
    result.warnings.push(`URL appears to be homepage, not specific article: ${metadata.url}`);
  }

  // Suspicious title
  if (metadata.title && FABRICATION_PATTERNS.suspiciousTitle.test(metadata.title)) {
    result.warnings.push(`Title suggests compilation, not single source: ${metadata.title}`);
  }

  // Check content.md for fabrication patterns
  const contentPath = path.join(evidenceDir, 'content.md');
  if (fs.existsSync(contentPath)) {
    const contentStart = fs.readFileSync(contentPath, 'utf-8').slice(0, 200);
    if (FABRICATION_PATTERNS.compilationContent.test(contentStart)) {
      result.errors.push('content.md starts with compilation pattern - likely fabricated');
    }
  }

  result.checks.push('red_flag_scan');

  // Final verdict
  result.valid = result.errors.length === 0;

  return result;
}

function extractCitedSources(articlePath) {
  if (!fs.existsSync(articlePath)) {
    return [];
  }

  const content = fs.readFileSync(articlePath, 'utf-8');
  const citations = content.match(/\[S\d{3}\]/g) || [];
  const unique = [...new Set(citations)].map(c => c.slice(1, -1));
  return unique;
}

function verifyAllSources(caseDir, options = {}) {
  const evidenceDir = path.join(caseDir, 'evidence');

  if (!fs.existsSync(evidenceDir)) {
    return { sources: [], summary: { total: 0, valid: 0, invalid: 0 } };
  }

  const sources = fs.readdirSync(evidenceDir)
    .filter(d => d.match(/^S\d{3}$/))
    .sort();

  const results = sources.map(sourceId => verifySource(sourceId, caseDir, options));

  return {
    sources: results,
    summary: {
      total: results.length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length
    }
  };
}

function verifyArticleSources(caseDir, options = {}) {
  const articlePath = path.join(caseDir, 'articles', 'full.md');
  const citedSources = extractCitedSources(articlePath);

  if (citedSources.length === 0) {
    return {
      cited: [],
      results: [],
      summary: { cited: 0, verified: 0, failed: 0, missing: 0 }
    };
  }

  // Publication-mode by default for cited sources (stricter provenance/signature handling).
  const publication = options.publication !== false;

  const results = citedSources.map(sourceId => {
    const result = verifySource(sourceId, caseDir, { ...options, publication });
    result.citedInArticle = true;
    return result;
  });

  return {
    cited: citedSources,
    results,
    summary: {
      cited: citedSources.length,
      verified: results.filter(r => r.valid).length,
      failed: results.filter(r => !r.valid && r.checks.length > 0).length,
      missing: results.filter(r => r.checks.length === 0).length
    }
  };
}

function printResult(result, verbose = false) {
  const status = result.valid ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`${status} ${result.sourceId}`);

  if (!result.valid || verbose) {
    for (const error of result.errors) {
      console.log(`    \x1b[31mERROR:\x1b[0m ${error}`);
    }
  }

  if (verbose) {
    for (const warning of result.warnings) {
      console.log(`    \x1b[33mWARN:\x1b[0m ${warning}`);
    }
    console.log(`    Checks passed: ${result.checks.join(', ')}`);
  }
}

function printUsage() {
  console.log('verify-source.js - Verify evidence integrity');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/verify-source.js <source_id> <case_dir>   Verify single source');
  console.log('  node scripts/verify-source.js --all <case_dir>        Verify all sources');
  console.log('  node scripts/verify-source.js --check-article <case_dir>  Verify cited sources');
  console.log('');
  console.log('Options:');
  console.log('  --verbose, -v    Show detailed output');
  console.log('  --json           Output as JSON');
  console.log('  --strict         Require cryptographic receipt verification (set EVIDENCE_RECEIPT_KEY)');
  console.log('');
  console.log('Exit codes:');
  console.log('  0 - All verified');
  console.log('  1 - Verification failures');
  console.log('  2 - Usage error');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(args.length === 0 ? 2 : 0);
  }

  const verbose = args.includes('--verbose') || args.includes('-v');
  const jsonOutput = args.includes('--json');
  const strict = args.includes('--strict');
  const filteredArgs = args.filter(a => !a.startsWith('-'));

  let result;

  if (args.includes('--all')) {
    const caseDir = filteredArgs[0];
    if (!caseDir) {
      console.error('Error: case_dir required');
      process.exit(2);
    }

    result = verifyAllSources(caseDir, { strict });

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\nVerifying all sources in ${caseDir}/evidence/\n`);
      for (const r of result.sources) {
        printResult(r, verbose);
      }
      console.log(`\n${result.summary.valid}/${result.summary.total} sources verified`);
    }

    process.exit(result.summary.invalid > 0 ? 1 : 0);

  } else if (args.includes('--check-article')) {
    const caseDir = filteredArgs[0];
    if (!caseDir) {
      console.error('Error: case_dir required');
      process.exit(2);
    }

    result = verifyArticleSources(caseDir, { strict });

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\nVerifying sources cited in ${caseDir}/articles/full.md\n`);
      console.log(`Cited sources: ${result.cited.join(', ') || '(none)'}\n`);

      for (const r of result.results) {
        printResult(r, verbose);
      }

      const s = result.summary;
      console.log(`\n${s.verified}/${s.cited} sources verified`);
      if (s.failed > 0) console.log(`  ${s.failed} failed verification`);
      if (s.missing > 0) console.log(`  ${s.missing} missing evidence`);
    }

    process.exit(result.summary.failed > 0 || result.summary.missing > 0 ? 1 : 0);

  } else {
    const sourceId = filteredArgs[0];
    const caseDir = filteredArgs[1];

    if (!sourceId || !caseDir) {
      console.error('Error: source_id and case_dir required');
      process.exit(2);
    }

    result = verifySource(sourceId, caseDir, { strict });

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printResult(result, verbose || !result.valid);
    }

    process.exit(result.valid ? 0 : 1);
  }
}

// Export for programmatic use
module.exports = { verifySource, verifyAllSources, verifyArticleSources };

if (require.main === module) {
  main().catch(err => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(2);
  });
}
