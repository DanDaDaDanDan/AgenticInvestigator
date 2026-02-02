# Scripts

Utility scripts for AgenticInvestigator. No npm dependencies required - pure Node.js.

## Prerequisites

**Required:** mcp-osint MCP server (for web capture and PDF download via `osint_get`)

---

## Scripts

### `osint-save.js`

Save `osint_get` output as verifiable evidence with hash verification support.

```bash
# From JSON file (RECOMMENDED - works on all platforms)
# Save the FULL osint_get response (including raw_html) for verification
node scripts/osint-save.js S001 cases/[case-id] osint-output.json

# From URL + markdown file (legacy, no verification)
node scripts/osint-save.js S001 cases/[case-id] --url https://example.com --markdown content.md --title "Title"
```

**Important:**
- On Windows, always use the JSON file method
- Save the FULL osint_get response to enable hash verification
- The `raw_html` field is critical for verifying web page captures

Creates:
- `evidence/S001/content.md` - Markdown content (for reading)
- `evidence/S001/raw.html` - Original HTML (for verification)
- `evidence/S001/osint-response.json` - Full `osint_get` response (capture receipt)
- `evidence/S001/links.json` - Extracted links (if provided)
- `evidence/S001/metadata.json` - Timestamps, hashes, verification block, capture signature

**Note:** For PDFs, use `osint_get` with `output_path` directly - it handles download and SHA256.

**Optional hardening:** Set `EVIDENCE_RECEIPT_KEY` in your environment. When set, `osint-save.js` will write a cryptographic receipt signature into `metadata.json.receipt.signature` and `verify-source.js --strict` can detect manual evidence fabrication/edits.

---

---

## Claim Verification (`scripts/claims/`)

These scripts help verify that article claims are supported by captured evidence.

### `claims/verify-article.js`

Semantic verification entry point - checks each cited claim against the cited source content.

```bash
# Prepare verification (shows counts and next steps)
node scripts/claims/verify-article.js cases/[case-id]

# Output only LLM prompts for batch processing
node scripts/claims/verify-article.js cases/[case-id] --prompts-only

# Generate batch files (recommended for large articles)
node scripts/claims/verify-article.js cases/[case-id] --generate-batches

# Merge and process batch response files
node scripts/claims/verify-article.js cases/[case-id] --merge-batches N

# JSON output
node scripts/claims/verify-article.js cases/[case-id] --json
```

**Workflow:**
1. Run `--generate-batches` to create prompt batches
2. Send prompts to LLM (Gemini 3 Pro recommended) and save responses
3. Save responses as JSON array: `[{index: 0, response: "..."}, ...]`
4. Run `--merge-batches N` to process and get final results

### Planned: Capture-Time Claim Registry

Capture-time claim registries are planned work. Article-time verification is implemented and enforced via `claims/verify-article.js` + `claims/compute-verify.js`.

### `claims/compute-verify.js`

Computational verification for numerical claims (ratios, percentages, counts, multipliers).

```bash
# Generate LLM prompts (JSON)
node scripts/claims/compute-verify.js cases/[case-id] --generate-prompts

# Process responses and write compute-verification.json
node scripts/claims/compute-verify.js cases/[case-id] --responses responses.json
```

### `claims/cross-check.js`

Cross-check a subset of claims against pre-defined authoritative sources (where applicable).

---

### `verify-source.js`

Verify evidence integrity via hash verification and red flag detection.

```bash
# Verify single source
node scripts/verify-source.js S001 cases/[case-id]

# Verify all sources in a case
node scripts/verify-source.js --all cases/[case-id]

# Verify only sources cited in full.md
node scripts/verify-source.js --check-article cases/[case-id]

# With verbose output
node scripts/verify-source.js --all cases/[case-id] --verbose

# JSON output (for programmatic use)
node scripts/verify-source.js --check-article cases/[case-id] --json
```

**Verification checks:**
- Evidence directory exists
- metadata.json exists and is valid JSON
- Required fields present (source_id, url, captured_at, files)
- Capture signature present and valid format
- SHA256 hash of raw file matches stored hash
- Hash matches osint_get reported hash (if available)

**Red flag detection:**
- Round timestamps (e.g., `T20:00:00.000Z`) - suggests manual creation
- Homepage URLs - should be specific article URLs
- Compilation patterns in content.md - suggests fabrication
- Missing capture signature

**Exit codes:**
- 0: All sources verified
- 1: Verification failures found
- 2: Usage error

---

### `audit-findings.js`

Findings hygiene gate: blocks cases where findings are duplicated or misnamed (which can cause `findings.js assemble` to silently ignore critical content).

```bash
node scripts/audit-findings.js cases/[case-id]
node scripts/audit-findings.js cases/[case-id] --block
node scripts/audit-findings.js cases/[case-id] --json
```

### `audit-leads.js`

Lead hygiene audit: for investigated leads, numeric claims (digits) must have valid sources listed in `sources[]`.

```bash
node scripts/audit-leads.js cases/[case-id] --block
node scripts/audit-leads.js cases/[case-id] --json
```

### `audit-article-outline.js`

Article outline audit: enforces the presence of `articles/outline.md` with deliverables + scope-control sections (prevents tangent domination).

```bash
node scripts/audit-article-outline.js cases/[case-id] --block
node scripts/audit-article-outline.js cases/[case-id] --json
```

### `audit-risk-micromort.js`

Risk framing audit: if the article publishes **death-risk** rates (e.g., “1 in X”, “Y%”, “Z× more deadly”) it must include a micromort conversion (micromorts measure death risk only).

```bash
node scripts/audit-risk-micromort.js cases/[case-id] --block
node scripts/audit-risk-micromort.js cases/[case-id] --json
```

### `gate5-preflight.js`

Run deterministic Gate 5 preflight checks (findings hygiene, citations, evidence integrity for cited sources, and numeric citation hygiene).

```bash
node scripts/gate5-preflight.js cases/[case-id]
node scripts/gate5-preflight.js cases/[case-id] --json
# Strict receipts (requires EVIDENCE_RECEIPT_KEY; auto-enabled when the env var is set)
node scripts/gate5-preflight.js cases/[case-id] --strict
```

### `update-gates.js`

Derive gate statuses from deterministic checks + required artifacts, and optionally write them to `state.json`.

```bash
node scripts/update-gates.js cases/[case-id] --json
node scripts/update-gates.js cases/[case-id] --write
node scripts/update-gates.js cases/[case-id] --write --strict
```

### `ingest-feedback.js`

Start a revision cycle from one or more feedback files by creating `feedback/revisionN.md` (verbatim) and updating `state.json`.

```bash
node scripts/ingest-feedback.js cases/[case-id] feedback-1.md feedback-2.md
```

### `audit-numerics.js`

Flags numeric sentences without `[S###]` citations (helps prevent unsourced “precise-looking” numbers).

```bash
node scripts/audit-numerics.js cases/[case-id] --block --article articles/full.md
node scripts/audit-numerics.js cases/[case-id] --json
```

### `build-article-context.js`

Bundle case context into a single file for high-context article generation.

```bash
node scripts/build-article-context.js cases/[case-id] --output cases/[case-id]/articles/article-context.md
node scripts/build-article-context.js cases/[case-id] --no-questions
```

### `capture.js`

Download documents/PDFs for evidence capture. **Legacy** - prefer `osint_get` with `output_path`.

```bash
node scripts/capture.js -d S015 https://sec.gov/filing.pdf cases/[case-id]
node scripts/capture.js --document S015 https://example.gov/report.pdf 10k.pdf cases/[case-id]
```

Creates:
- `evidence/S015/[filename]` - Downloaded document
- `evidence/S015/metadata.json` - Timestamps, hash

**Note:** `osint_get` with `output_path` is now preferred for PDF downloads.

---

### `init-case.js`

Create a new investigation case with 35 framework files.

```bash
node scripts/init-case.js "topic description"
```

Creates:
- `cases/[topic-slug]/`
- `state.json`, `sources.json`, `leads.json`
- `questions/` with 35 framework files
- `evidence/`, `articles/` directories

---

### `find-wayback-url.js`

Find Wayback Machine archived URLs.

```bash
node scripts/find-wayback-url.js https://example.com
node scripts/find-wayback-url.js https://example.com --json
node scripts/find-wayback-url.js --batch input.txt output.json
```

---

### `check-continue.js`

Determine next orchestrator action based on state.json and leads.json.

```bash
node scripts/check-continue.js cases/[case-id]
```

Outputs ORCHESTRATOR SIGNAL with next action.

---

### `logger.js`

Logging utility used by other scripts. Supports:
- Log levels: DEBUG, INFO, WARN, ERROR
- File logging with rotation
- Operation tracking with success/failure states

Environment variables:
- `LOG_LEVEL` - Set log level (default: info)
- `LOG_FILE` - Enable file logging to specified path

---

## Capture Workflow

### All Content (Unified with osint_get)

```
osint_get target=<url_or_resource_id> [output_path=<path_for_pdfs>]
→ Returns { format, content/output_path, metadata.sha256 }
```

**For web pages:**
1. `osint_get target=<url>` returns markdown with SHA256
2. Save content to `evidence/S###/content.md`
3. Save metadata to `evidence/S###/metadata.json`

**For PDFs:**
1. `osint_get target=<url> output_path=evidence/S###/doc.pdf`
2. Use Gemini to extract content to `content.md`
3. osint_get already created metadata with SHA256

**Alternative for web pages:**
1. `osint_get` returns JSON with content
2. Save JSON to temp file
3. Run `osint-save.js` to create evidence with capture signature
