# Evidence Capture Scripts

Scripts for capturing, verifying, and managing source evidence.

## Prerequisites

```bash
cd /path/to/AgenticInvestigator
npm install
```

**Required for capture:**
- Firecrawl API key from https://app.firecrawl.dev
- Add to `.env` file: `FIRECRAWL_API_KEY=your_key`

**Optional for WARC archiving:**
- Browsertrix Cloud account from https://browsertrix.com
- Add to `.env` file:
  ```
  BROWSERTRIX_USERNAME=your_email
  BROWSERTRIX_PASSWORD=your_password
  ```

---

## Core Scripts

### `active-case.js`

Set or resolve the active case (`cases/.active`) so tools can omit the case argument.

```bash
node scripts/active-case.js set old-raleigh-murder
node scripts/active-case.js get
node scripts/active-case.js resolve
```

---

### `capture.js` (recommended)

Cross-platform entry point for capturing web page evidence. Uses Firecrawl API for excellent bot-bypass and produces HTML, screenshots, and PDFs.

**Web Page Capture:**
```bash
node scripts/capture.js S001 https://example.com/article cases/[case-id]
node scripts/capture.js S001 https://example.com/article   # uses cases/.active or current dir
```

**Document Download:**
```bash
node scripts/capture.js --document S015 https://sec.gov/filing.pdf
node scripts/capture.js --document S015 https://sec.gov/filing.pdf 10k_2024.pdf cases/[case-id]
```

**Note:** `scripts/capture` is a bash wrapper (WSL/Git Bash). On Windows, prefer `node scripts/capture.js`.

**Output:**
```
evidence/
+-- web/S001/
|   +-- capture.png      # Full-page screenshot
|   +-- capture.pdf      # PDF rendering
|   +-- capture.html     # Raw HTML source
|   +-- metadata.json    # Capture metadata with hashes
+-- documents/
    +-- S015_10k_2024.pdf
    +-- S015_10k_2024.pdf.meta.json
```

---

### `verify-sources.js`

Verify evidence integrity for all sources in a case.

```bash
node scripts/verify-sources.js /path/to/case
```

**Checks:**
- All sources in sources.md have evidence folders
- All evidence files match their recorded SHA-256 hashes
- Reports missing or corrupted evidence

---

### `verify-claims.js`

**Anti-hallucination check**: Verify that claims attributed to sources actually exist in the captured evidence.

```bash
node scripts/verify-claims.js /path/to/case              # Verify all claims
node scripts/verify-claims.js /path/to/case --summary    # Only check summary.md
node scripts/verify-claims.js /path/to/case --json       # Output JSON report
```

**Checks:**
- Extracts all claims with source IDs [SXXX] from case files
- Loads captured evidence (HTML, PDF text, markdown) for each source
- Uses Gemini AI to semantically verify claims exist in evidence
- Reports verdict for each claim

**Verdicts:**

| Verdict | Meaning | Action Required |
|---------|---------|-----------------|
| VERIFIED | Claim found in evidence | None |
| NOT_FOUND | Claim NOT in evidence (hallucination risk) | Find evidence or revise claim |
| PARTIAL | Claim partially supported | Review and clarify |
| CONTRADICTED | Evidence says opposite | Urgent: fix the claim |
| NO_EVIDENCE | No captured evidence for source | Capture the source |

**Requires:** `GEMINI_API_KEY` environment variable or `.env` file.

---

### `firecrawl-capture.js`

Capture using Firecrawl API - excellent for bot-protected sites (Cloudflare, Akamai, etc.).

**Single URL:**
```bash
node scripts/firecrawl-capture.js S001 https://example.com evidence/web/S001
```

**Batch capture:**
```bash
node scripts/firecrawl-capture.js --batch urls.txt /path/to/case
```

**URL list format:**
```
# Comment lines start with #
S001|https://example.com/article|Article Title
S002|https://other.com/page|Another Article
```

**Requires:** `FIRECRAWL_API_KEY` environment variable or `.env` file.

---

### `capture-evidence.js`

Complete evidence capture workflow combining Firecrawl + PDF generation + optional Browsertrix WARC archiving.

```bash
node scripts/capture-evidence.js urls.txt /path/to/case
node scripts/capture-evidence.js urls.txt /path/to/case --browsertrix
```

**Steps:**
1. Firecrawl capture (HTML + markdown + screenshot)
2. PDF generation from captured HTML
3. Browsertrix WARC archive (optional, with `--browsertrix`)
4. Quality audit

**Requires:** `FIRECRAWL_API_KEY` and optionally `BROWSERTRIX_USERNAME`/`BROWSERTRIX_PASSWORD`

---

### `browsertrix-capture.js`

Create forensic-grade WARC archives using Browsertrix Cloud. Produces `.wacz` files (combined WARC archives).

**Single URL:**
```bash
node scripts/browsertrix-capture.js S001 https://example.com evidence/web/S001
```

**With wait for completion:**
```bash
node scripts/browsertrix-capture.js S001 https://example.com evidence/web/S001 --wait
```

**Requires:** `BROWSERTRIX_USERNAME` and `BROWSERTRIX_PASSWORD` environment variables.

---

## Verification Scripts

### `verify-all-gates.js`

**Master termination gate checker.** Runs all 9 gates and outputs `gate_results.json`.

```bash
node scripts/verify-all-gates.js cases/[case-id]
node scripts/verify-all-gates.js cases/[case-id] --json
```

**Exit codes:**
- `0` = All gates pass, can terminate
- `1` = Gates failed, must continue investigation

**Gates checked:**
1. Coverage - Thresholds met
2. Tasks - All completed
3. Adversarial - Complete
4. Sources - Evidence folders exist
5. Content - Claims in evidence text
6. Claims - AI verification
7. Contradictions - All explored
8. Rigor - 20 frameworks
9. Legal - Review file exists

---

### `verify-source-content.js`

**Layer 4 content verification.** Extracts text from evidence and verifies claims exist.

```bash
node scripts/verify-source-content.js cases/[case-id]
node scripts/verify-source-content.js cases/[case-id] --json
```

**Checks:**
- Extracts text from HTML, PDF, and Markdown evidence
- Searches for key phrases from claims
- Reports found/not found for each claim

---

### `verify-citation-density.js`

**Citation density validator.** Ensures summary.md has sufficient source citations.

```bash
node scripts/verify-citation-density.js cases/[case-id]
node scripts/verify-citation-density.js cases/[case-id] --verbose  # Show uncited lines
```

**Checks:**
- summary.md exists and has content
- 100% of factual statements have `[SXXX]` citations (configurable via `scripts/config.js`)
- Key sections (Key Findings, Timeline, etc.) have citations
- No large blocks of uncited factual content

**CRITICAL:** Investigation cannot terminate if summary.md has zero citations or low citation density.

---

### `verify-state-consistency.js`

**State vs filesystem validator.** Compares what state files claim vs what exists.

```bash
node scripts/verify-state-consistency.js cases/[case-id]
node scripts/verify-state-consistency.js cases/[case-id] --fix  # Show fix suggestions
```

**Checks:**
- `sources.md` entries vs `evidence/web/` folders
- Coverage counts computed from actual files (evidence, findings, claims)
- `tasks/*.json` completed tasks vs output files
- `state.json` minimal schema sanity (flat, small)

---

### `validate-schema.js`

**Minimal schema validator** for core case files (prevents silent drift).

```bash
node scripts/validate-schema.js cases/[case-id]
node scripts/validate-schema.js cases/[case-id] --json
```

---

### `verify-sources-dedup.js`

Detect duplicate URLs mapped to multiple `S###` IDs (can inflate "independent" corroboration).

```bash
node scripts/verify-sources-dedup.js cases/[case-id]
node scripts/verify-sources-dedup.js cases/[case-id] --json
```

---

### `verify-circular-reporting.js`

Heuristic circular reporting detection (AP/Reuters/etc). Flags claims whose supporting sources appear to share the same origin.

```bash
node scripts/verify-circular-reporting.js cases/[case-id]
node scripts/verify-circular-reporting.js cases/[case-id] --json
```

---

### `verify-integrity.js`

Ledger and file ownership checks (append-only audit trail, balanced file locks).

```bash
node scripts/verify-integrity.js cases/[case-id]
node scripts/verify-integrity.js cases/[case-id] --json
```

---

### `orchestrator-verify.js`

Strict, summary-only wrapper: runs gap generation + termination gates and prints only counts/reasons/paths.

```bash
node scripts/orchestrator-verify.js cases/[case-id]
node scripts/orchestrator-verify.js cases/[case-id] --json
```

---

### `ledger-append.js`

**Unified append-only ledger for investigation coordination.** The ledger (`ledger.json`) is the single source of truth for all investigation actions.

```bash
# Initialize
node scripts/ledger-append.js cases/[case-id] --init

# Append entries
node scripts/ledger-append.js cases/[case-id] <type> [options]
```

**Entry Types:**

| Type | Purpose | Required Options |
|------|---------|------------------|
| `iteration_start` | Begin VERIFY -> PLAN -> EXECUTE cycle | `--iteration N` |
| `iteration_complete` | End of cycle | `--iteration N` |
| `phase_start` | Begin phase | `--phase NAME --iteration N` |
| `phase_complete` | End phase | `--phase NAME --iteration N` |
| `agent_dispatch` | Sub-agent dispatched | `--agent NAME --output FILE` |
| `agent_complete` | Sub-agent finished | `--agent NAME --output FILE` |
| `task_create` | New task created | `--task ID --priority HIGH/MEDIUM/LOW` |
| `task_complete` | Task finished | `--task ID --output FILE` |
| `source_capture` | Evidence captured | `--source ID --url URL --path PATH` |
| `claim_create` | New claim registered | `--claim CXXXX --risk HIGH/MEDIUM/LOW` |
| `claim_update` | Claim updated | `--claim CXXXX` |
| `gate_check` | Gate verification | `--gate NAME --passed true/false` |
| `synthesis_complete` | Final report | `--iteration N --output FILE` |
| `file_lock` | Claim file ownership | `--file PATH --agent NAME` |
| `file_unlock` | Release ownership | `--file PATH --agent NAME` |

**Examples:**
```bash
node scripts/ledger-append.js cases/topic iteration_start --iteration 3
node scripts/ledger-append.js cases/topic task_create --task R001 --priority HIGH --gap G0001
node scripts/ledger-append.js cases/topic source_capture --source S001 --url "https://..." --path evidence/web/S001/
node scripts/ledger-append.js cases/topic claim_update --claim C0042 --sources S014,S015 --status verified
node scripts/ledger-append.js cases/topic gate_check --gate corroboration --passed false --reason "2 claims below threshold"
```

---

## Utility Scripts

### `find-wayback-url.js`

Find Wayback Machine archived URLs.

**Single URL:**
```bash
node scripts/find-wayback-url.js https://example.com
node scripts/find-wayback-url.js https://example.com --json
```

**Batch lookup:**
```bash
node scripts/find-wayback-url.js --batch urls.txt wayback-results.json
```

---

## Integration with Investigation Workflow

### During Research

When AI research returns a claim:

1. **Find primary source** (search for actual URL)
2. **Capture immediately:**
   ```bash
   node scripts/capture.js S042 https://actual-source.com/article
   ```
3. **Verify claim exists** in captured content
4. **Register in sources.md** with evidence path

### Before Finalization

Run verification to ensure all sources are captured:

```bash
node scripts/verify-sources.js cases/[topic-slug]
```

Target: 100% capture rate for sources cited in summary.md.

---

## Metadata Schema

**Firecrawl capture:**
```json
{
  "source_id": "S001",
  "url": "https://example.com/article",
  "title": "Page Title",
  "captured_at": "2026-01-07T14:23:00Z",
  "capture_duration_ms": 5230,
  "method": "firecrawl",
  "firecrawl_version": "v1",
  "http_status": 200,
  "files": {
    "markdown": { "path": "capture.md", "hash": "sha256:...", "size": 12345 },
    "html": { "path": "capture.html", "hash": "sha256:...", "size": 34567 },
    "screenshot": { "path": "screenshot.png", "hash": "sha256:...", "size": 1234567 }
  },
  "errors": []
}
```

**Combined firecrawl+browsertrix capture:**
```json
{
  "source_id": "S001",
  "url": "https://example.com/article",
  "captured_at": "2026-01-07T14:23:00Z",
  "method": "firecrawl+browsertrix",
  "browsertrix_captured_at": "2026-01-07T14:25:00Z",
  "browsertrix_crawl_id": "abc123",
  "browsertrix_state": "complete",
  "files": {
    "markdown": { "path": "capture.md", "hash": "sha256:...", "size": 12345 },
    "html": { "path": "capture.html", "hash": "sha256:...", "size": 34567 },
    "wacz_crawl-abc123": { "path": "crawl-abc123.wacz", "hash": "sha256:...", "size": 38000000 }
  }
}
```

---

## Troubleshooting

### Capture fails with timeout
- Some sites take longer to load
- Firecrawl has built-in retry logic
- Check if site requires authentication

### Bot detection / Access denied
- Firecrawl has excellent bot bypass (Cloudflare, Akamai, etc.)
- For persistent issues, check Wayback Machine: `node scripts/find-wayback-url.js URL`
- Consider Browsertrix for full WARC archiving

### Missing screenshots
- Some sites block screenshot capture
- HTML/markdown capture still provides evidence
- WACZ archives from Browsertrix include full page state

### Browsertrix crawl fails
- Check credentials in `.env`
- Verify Browsertrix Cloud account is active
- Check crawl status in Browsertrix dashboard

### Firecrawl API errors
- Check API key is valid
- Rate limits may apply - script has built-in backoff
- Check https://status.firecrawl.dev for service issues
