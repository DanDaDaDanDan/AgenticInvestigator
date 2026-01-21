# Source Verification Architecture: Redesign Proposal

## Executive Summary

The current verification system has grown organically into 6+ scripts with overlapping functionality, scattered verification state, and gaps that allow fabrication or citation laundering to slip through. This document proposes a unified architecture that provides **bulletproof, verifiable, auditable** source handling.

---

## Current State Analysis

### Existing Scripts (6 verification-related)

| Script | Purpose | Output | Problems |
|--------|---------|--------|----------|
| `audit-citations.js` | Check sources exist | Console | No state persistence |
| `verify-source.js` | Hash + red flags | Console | Patterns duplicated |
| `semantic-verify.js` | Claim-evidence match | LLM prompts | DEPRECATED, still used |
| `verify-claims.js` | Full claim verification | JSON + report | Newest, most complete |
| `verify-numbers.js` | Statistics matching | Console | No state persistence |
| `osint-save.js` | Save captures | Files | Good, but isolated |

### Critical Gaps

1. **Citation URL Mismatch** - Article says `[S001](url-A)`, metadata has `url-B` → NOT CAUGHT
2. **No Verification Chain** - Steps independent, no proof of ordering
3. **Scattered State** - Results in console, multiple JSON files, no single source of truth
4. **Fabrication Patterns Duplicated** - Same regex in 3+ files
5. **Claim Hash Collision** - SHA256(text only) means identical text = same hash
6. **No URL Normalization** - `https://www.example.com` ≠ `https://example.com/`

---

## Core Principles for Bulletproof Verification

### 1. Chain of Custody
Every source must have an unbroken chain from capture to citation:
```
osint_get → raw_html → SHA256 → metadata.json → sources.json → citation
```

### 2. Immutable Evidence
Once captured, evidence files NEVER change. Any modification invalidates the source.

### 3. Single Source of Truth
One `verification-state.json` per case tracks ALL verification steps.

### 4. Fail-Safe Defaults
If verification cannot PROVE support, it FAILS. No benefit of the doubt.

### 5. Deterministic & Reproducible
Running verification twice with same inputs produces same outputs.

### 6. Cryptographic Binding
Each verification step is cryptographically linked to inputs + previous step.

---

## Proposed Architecture

### Unified Verification Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        VERIFICATION PIPELINE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌───────┐ │
│  │ CAPTURE  │──▶│ INTEGRITY│──▶│ BINDING  │──▶│ SEMANTIC │──▶│ STATS │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └───────┘ │
│       │              │              │              │              │     │
│       ▼              ▼              ▼              ▼              ▼     │
│  [Chain Link]   [Chain Link]   [Chain Link]   [Chain Link]   [Chain]   │
│                                                                         │
│                    ▼ ▼ ▼ ▼ ▼                                           │
│              verification-state.json                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step Details

#### Step 1: CAPTURE (existing osint-save.js, enhanced)
- **Input:** osint_get response (raw_html, content, metadata)
- **Output:** evidence/S###/ with metadata.json containing:
  - `capture_hash`: SHA256(raw_html)
  - `capture_timestamp`: ISO timestamp (millisecond precision)
  - `capture_url`: Exact URL fetched
  - `capture_signature`: sig_v2_xxx (proof of osint_get capture)
- **Verification:** Raw file hash matches capture_hash

#### Step 2: INTEGRITY (replaces verify-source.js)
- **Input:** All evidence/S###/ directories
- **Checks:**
  1. metadata.json exists and valid JSON
  2. capture_signature present and valid format
  3. Raw file (raw.html or PDF) hash matches metadata.capture_hash
  4. NO fabrication patterns:
     - Round timestamp (T##:00:00.000Z)
     - Homepage URL (^https?://[^/]+/?$)
     - content.md starts with "Research compilation..."
     - Type is "research_synthesis"
- **Output:** List of valid sources with integrity hashes

#### Step 3: BINDING (NEW - Critical Addition)
- **Input:** Article citations, sources.json, metadata.json files
- **Checks:**
  1. **Citation URL Match:** For each `[S###](url)` in article:
     - Extract URL from citation markdown
     - Get URL from sources.json for that ID
     - Get URL from metadata.json for that ID
     - ALL THREE MUST MATCH (after normalization)
  2. **Citation ID Exists:** [S###] has entry in sources.json
  3. **Citation Captured:** sources.json has captured: true
  4. **No Orphan Citations:** All [S###] in article exist in sources.json
  5. **No Unused Critical Sources:** HIGH priority sources should be cited
- **URL Normalization:**
  - Remove trailing slash
  - Lowercase scheme and host
  - Sort query parameters
  - Remove default ports (80, 443)
- **Output:** Citation binding map (citation_id → source_id → evidence_path)

#### Step 4: SEMANTIC (enhanced verify-claims.js)
- **Input:** Article claims, source content
- **Checks:**
  1. **Claim Extraction:** Extract all factual claims with citations
  2. **Key Term Presence:** Proper nouns from claim appear in source
  3. **Statistic Presence:** Numbers from claim appear in source (exact)
  4. **LLM Verification:** For claims failing heuristics:
     - Send claim + source to Gemini 3 Pro
     - Require explicit "supported: true" with quote
- **Output:** Per-claim verification with supporting quotes
- **Storage:** evidence/S###/claim-support.json (per-source persistence)

#### Step 5: STATISTICS (enhanced verify-numbers.js)
- **Input:** Article statistics, source content
- **Checks:**
  1. **Exact Match:** Number in article appears exactly in source
  2. **Scale Match:** $50M in article, 50,000,000 in source (normalized)
  3. **No Uncited Statistics:** Flag significant numbers without citations
- **Output:** Statistics verification report

### Unified Output: verification-state.json

```json
{
  "version": "2.0.0",
  "case_id": "ice-in-minnesota-...",
  "generated_at": "2026-01-20T15:30:00.000Z",
  "article": {
    "path": "articles/full.md",
    "hash": "sha256:abc123...",
    "word_count": 8500,
    "citation_count": 88
  },
  "pipeline": [
    {
      "step": 1,
      "name": "capture",
      "status": "pass",
      "started_at": "...",
      "completed_at": "...",
      "metrics": {
        "sources_checked": 52,
        "sources_valid": 52,
        "sources_invalid": 0
      },
      "step_hash": "sha256:def456..."
    },
    {
      "step": 2,
      "name": "integrity",
      "status": "pass",
      "metrics": {
        "hash_matches": 52,
        "red_flags_found": 0,
        "fabrication_detected": 0
      },
      "step_hash": "sha256:ghi789..."
    },
    {
      "step": 3,
      "name": "binding",
      "status": "pass",
      "metrics": {
        "citations_verified": 88,
        "url_mismatches": 0,
        "orphan_citations": 0
      },
      "step_hash": "sha256:jkl012..."
    },
    {
      "step": 4,
      "name": "semantic",
      "status": "pass",
      "metrics": {
        "claims_extracted": 142,
        "verified_heuristic": 98,
        "verified_llm": 31,
        "flagged_review": 8,
        "failed": 5
      },
      "step_hash": "sha256:mno345..."
    },
    {
      "step": 5,
      "name": "statistics",
      "status": "pass",
      "metrics": {
        "numbers_checked": 23,
        "exact_matches": 21,
        "scale_matches": 2,
        "mismatches": 0,
        "uncited_flagged": 3
      },
      "step_hash": "sha256:pqr678..."
    }
  ],
  "chain_hash": "sha256:stu901...",
  "final_status": "VERIFIED",
  "blocking_issues": [],
  "warnings": [
    "8 claims flagged for manual review",
    "3 uncited significant numbers"
  ]
}
```

### Chain Hash Computation

Each step's hash includes:
1. Step name
2. Step inputs hash
3. Step outputs hash
4. Previous step's hash

Final chain_hash = hash of all step_hashes concatenated.

This creates a **Merkle-like verification chain** where:
- Tampering with any step invalidates the chain
- Chain can be independently verified
- Steps can be audited individually or as a whole

---

## File Structure Changes

### Current (Fragmented)
```
scripts/
├── audit-citations.js     # Existence check
├── semantic-verify.js     # DEPRECATED
├── verify-claims.js       # Claim verification
├── verify-numbers.js      # Statistics
├── verify-source.js       # Hash + red flags
├── osint-save.js          # Capture saving
├── extract-claims.js      # Claim extraction
└── ...
```

### Proposed (Unified)
```
scripts/
├── verification/
│   ├── index.js           # Main entry point: verify-all
│   ├── pipeline.js        # Orchestrates 5 steps
│   ├── steps/
│   │   ├── capture.js     # Step 1
│   │   ├── integrity.js   # Step 2
│   │   ├── binding.js     # Step 3 (NEW)
│   │   ├── semantic.js    # Step 4
│   │   └── statistics.js  # Step 5
│   ├── constants.js       # All thresholds, patterns
│   ├── url-normalize.js   # URL canonicalization
│   ├── claim-extract.js   # Claim extraction
│   └── report.js          # Generate reports
├── osint-save.js          # Keep (capture flow)
└── [deprecated]/          # Old scripts for migration
    ├── audit-citations.js
    ├── semantic-verify.js
    ├── verify-claims.js
    ├── verify-numbers.js
    └── verify-source.js
```

### Usage

```bash
# Run full verification pipeline
node scripts/verification/index.js <case_dir>

# Run with options
node scripts/verification/index.js <case_dir> \
  --generate-report \
  --generate-state \
  --block \
  --verbose

# Run specific step only (for debugging)
node scripts/verification/index.js <case_dir> --step binding

# Generate human-readable report from existing state
node scripts/verification/report.js <case_dir>
```

---

## constants.js - Single Source of Truth

```javascript
module.exports = {
  // Confidence thresholds
  CONFIDENCE_PASS: 0.85,
  CONFIDENCE_FLAG: 0.60,
  CONFIDENCE_FAIL: 0.40,

  // Fabrication patterns (compiled once)
  FABRICATION: {
    ROUND_TIMESTAMP: /T\d{2}:00:00\.000Z$/,
    COMPILATION_CONTENT: /^(Research compilation|Summary of|Synthesis of|Overview of)/i,
    HOMEPAGE_URL: /^https?:\/\/[^/]+\/?$/,
    SUSPICIOUS_TITLE: /(compilation|synthesis|summary|overview|aggregat)/i,
    SUSPICIOUS_TYPE: /^(research_synthesis|compilation|aggregate)$/i
  },

  // Citation patterns
  CITATION: {
    FULL: /\[S(\d{3})\]\(([^)]+)\)/g,   // [S001](url)
    SHORT: /\[S(\d{3})\]/g,              // [S001]
    URL_IN_CITATION: /\[S\d{3}\]\(([^)]+)\)/
  },

  // Statistics patterns
  STATISTICS: {
    PERCENTAGE: /(\d+(?:\.\d+)?)\s*%/g,
    CURRENCY: /\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|billion|M|B|k|K)?/gi,
    LARGE_NUMBER: /\b(\d{1,3}(?:,\d{3})+)\b/g,
    SCALED: /(\d+(?:\.\d+)?)\s*(million|billion|thousand)/gi
  },

  // Hash algorithms
  HASH_ALGORITHM: 'sha256',
  SIGNATURE_PREFIX: 'sig_v2_',

  // Blocking thresholds
  BLOCKING: {
    MAX_FAILED_CLAIMS_PERCENT: 0.05,      // 5% failed = block
    MAX_FLAGGED_CLAIMS_PERCENT: 0.10,     // 10% flagged = block
    MAX_URL_MISMATCHES: 0,                 // ANY mismatch = block
    MAX_INTEGRITY_FAILURES: 0              // ANY integrity fail = block
  }
};
```

---

## New Step 3: Citation Binding

This is the **critical missing piece** in the current architecture.

### Problem
Article contains: `[S001](https://example.com/article-v1)`
sources.json has: `url: "https://example.com/article-v2"`
metadata.json has: `url: "https://www.example.com/article-v1"`

All three are "close" but different. Current system doesn't catch this.

### Solution

```javascript
// scripts/verification/steps/binding.js

const { normalizeUrl } = require('../url-normalize');

function verifyBinding(caseDir) {
  const article = readArticle(caseDir);
  const sourcesJson = readSourcesJson(caseDir);

  const results = {
    citations_verified: 0,
    url_mismatches: [],
    orphan_citations: [],
    missing_sources: []
  };

  // Extract all citations from article
  const citations = extractCitationsWithUrls(article);

  for (const citation of citations) {
    const { sourceId, citationUrl } = citation;

    // Get URL from sources.json
    const sourceEntry = sourcesJson.sources.find(s => s.id === sourceId);
    if (!sourceEntry) {
      results.orphan_citations.push(sourceId);
      continue;
    }
    const sourcesJsonUrl = sourceEntry.url;

    // Get URL from metadata.json
    const metadataPath = path.join(caseDir, 'evidence', sourceId, 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath));
    const metadataUrl = metadata.url;

    // Normalize all URLs
    const normCitation = normalizeUrl(citationUrl);
    const normSourcesJson = normalizeUrl(sourcesJsonUrl);
    const normMetadata = normalizeUrl(metadataUrl);

    // All three must match
    if (normCitation !== normSourcesJson || normSourcesJson !== normMetadata) {
      results.url_mismatches.push({
        sourceId,
        citation_url: citationUrl,
        sources_json_url: sourcesJsonUrl,
        metadata_url: metadataUrl,
        normalized: {
          citation: normCitation,
          sources_json: normSourcesJson,
          metadata: normMetadata
        }
      });
    } else {
      results.citations_verified++;
    }
  }

  return results;
}
```

### URL Normalization

```javascript
// scripts/verification/url-normalize.js

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);

    // Lowercase scheme and host
    let normalized = parsed.protocol + '//' + parsed.host.toLowerCase();

    // Remove default ports
    normalized = normalized.replace(/:80$/, '').replace(/:443$/, '');

    // Add path (remove trailing slash unless root)
    let pathname = parsed.pathname;
    if (pathname !== '/' && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    normalized += pathname;

    // Sort query parameters
    const params = new URLSearchParams(parsed.search);
    const sortedParams = new URLSearchParams([...params].sort());
    const query = sortedParams.toString();
    if (query) {
      normalized += '?' + query;
    }

    // Ignore hash
    return normalized;
  } catch (e) {
    // Invalid URL - return as-is for comparison
    return url;
  }
}
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
1. Create `scripts/verification/` directory structure
2. Implement `constants.js` with all patterns centralized
3. Implement `url-normalize.js`
4. Create `pipeline.js` skeleton

### Phase 2: Steps (Week 2)
1. Port integrity check from verify-source.js → `steps/integrity.js`
2. Port semantic check from verify-claims.js → `steps/semantic.js`
3. Port statistics from verify-numbers.js → `steps/statistics.js`
4. Implement NEW `steps/binding.js`
5. Update capture flow in `steps/capture.js`

### Phase 3: Integration (Week 3)
1. Implement verification-state.json generation
2. Implement chain hash computation
3. Create unified `index.js` entry point
4. Create `report.js` for human-readable output

### Phase 4: Migration (Week 4)
1. Move old scripts to `scripts/deprecated/`
2. Update CLAUDE.md and SKILL.md files
3. Update /verify skill to use new pipeline
4. Test with existing cases

---

## Success Criteria

### Verification is "Bulletproof" when:

1. **No citation laundering possible**
   - Every claim is verified against its cited source
   - Source must actually contain the claimed fact

2. **No URL mismatch possible**
   - Citation URL = sources.json URL = metadata.json URL
   - Any mismatch is a blocking failure

3. **No fabrication possible**
   - Raw content hash verification
   - Capture signature required
   - Fabrication patterns detected

4. **No statistical drift possible**
   - Numbers in article match numbers in source exactly
   - Scale normalization (50M = 50,000,000)

5. **Complete audit trail**
   - verification-state.json with chain hash
   - Per-source claim-support.json
   - Human-readable report

6. **100% coverage**
   - Every claim with citation is verified
   - No claim skipped or assumed valid

7. **Reproducible**
   - Same inputs → same outputs
   - Deterministic hash computation

---

## Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Scripts | 6+ fragmented | 1 unified pipeline |
| State | Console output, scattered JSON | Single verification-state.json |
| URL Matching | NOT CHECKED | Normalized 3-way match |
| Patterns | Duplicated in 3+ files | Single constants.js |
| Ordering | Manual, any order | Enforced pipeline |
| Chain Verification | None | Cryptographic chain hash |
| Audit Trail | Per-source JSON | Chain + per-source + report |
| Failure Mode | Silent pass | Explicit fail with reason |

---

## Appendix: Migration Guide

### For Existing Cases

1. Run new verification pipeline on existing cases
2. It will generate verification-state.json
3. Existing evidence/ structure is compatible
4. Old claim-verification.json files remain valid

### For New Development

1. Use `node scripts/verification/index.js` instead of individual scripts
2. Check verification-state.json for pipeline status
3. Use `--block` flag in CI/automation

### Backward Compatibility

Old scripts remain in `scripts/deprecated/` and continue to work.
New scripts are preferred but not required for existing workflows.
