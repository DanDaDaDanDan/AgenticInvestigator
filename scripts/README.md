# Evidence Capture Scripts

Scripts for capturing, verifying, and managing source evidence.

## Prerequisites

```bash
cd /path/to/AgenticInvestigator
npm install
npx playwright install chromium
```

For Firecrawl (optional but recommended for bot-protected sites):
- Get API key from https://app.firecrawl.dev
- Add to `.env` file: `FIRECRAWL_API_KEY=your_key`

---

## Core Scripts

### `capture`

Main entry point for capturing web page evidence. Creates screenshots, PDFs, and HTML captures.

**Web Page Capture:**
```bash
./scripts/capture S001 https://example.com/article
./scripts/capture S001 https://example.com/article /path/to/case
```

**Document Download:**
```bash
./scripts/capture --document S015 https://sec.gov/filing.pdf
./scripts/capture --document S015 https://sec.gov/filing.pdf 10k_2024.pdf
```

**Output:**
```
evidence/
├── web/S001/
│   ├── capture.png      # Full-page screenshot
│   ├── capture.pdf      # PDF rendering
│   ├── capture.html     # Raw HTML source
│   └── metadata.json    # Capture metadata with hashes
└── documents/
    ├── S015_10k_2024.pdf
    └── S015_10k_2024.pdf.meta.json
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

Complete evidence capture workflow combining Firecrawl + PDF generation + optional ArchiveBox backup.

```bash
node scripts/capture-evidence.js urls.txt /path/to/case
node scripts/capture-evidence.js urls.txt /path/to/case --archivebox
```

**Steps:**
1. Firecrawl capture (HTML + screenshot)
2. PDF generation from captured HTML
3. ArchiveBox WARC backup (optional)
4. Quality audit

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

### `find-failed-captures.js`

Audit capture quality - find captures that may have failed.

```bash
node scripts/find-failed-captures.js /path/to/case
```

**Identifies:**
- Non-200 HTTP status codes
- Bot block pages
- 404 Not Found errors
- Access denied pages

---

### `archivebox-backup.js`

Create forensic-grade WARC backups using ArchiveBox.

```bash
node scripts/archivebox-backup.js urls.txt /path/to/archive
```

**Requires:** ArchiveBox installed (`pip install archivebox` or Docker).

---

## Integration with Investigation Workflow

### During Research

When AI research returns a claim:

1. **Find primary source** (search for actual URL)
2. **Capture immediately:**
   ```bash
   ./scripts/capture S042 https://actual-source.com/article
   ```
3. **Verify claim exists** in captured content
4. **Register in sources.md** with evidence path

### Before Finalization

Run verification to ensure all sources are captured:

```bash
node scripts/verify-sources.js cases/inv-YYYYMMDD-HHMMSS
```

Target: 100% capture rate for sources cited in summary.md.

---

## Metadata Schema

```json
{
  "source_id": "S001",
  "url": "https://example.com/article",
  "title": "Page Title",
  "captured_at": "2026-01-07T14:23:00Z",
  "capture_duration_ms": 5230,
  "method": "playwright",
  "http_status": 200,
  "files": {
    "png": { "path": "capture.png", "hash": "sha256:...", "size": 1234567 },
    "pdf": { "path": "capture.pdf", "hash": "sha256:...", "size": 234567 },
    "html": { "path": "capture.html", "hash": "sha256:...", "size": 34567 }
  },
  "wayback": {
    "submitted": true,
    "status": 200,
    "archiveUrl": "https://web.archive.org/web/..."
  },
  "errors": []
}
```

---

## Troubleshooting

### Capture fails with timeout
- Some pages take longer to load
- Try Firecrawl for bot-protected sites
- Check if site blocks automated browsers

### Bot detection / Access denied
- Use `firecrawl-capture.js` - it has excellent bot bypass
- Check Wayback Machine for archived version: `node scripts/find-wayback-url.js URL`

### Missing screenshots but HTML captured
- JavaScript-heavy sites may fail screenshot
- HTML fallback ensures some evidence captured
- Consider Firecrawl which handles JS rendering better

### Wayback Machine submission fails
- May be rate limited
- Will retry on next capture
- Not critical - local copy is primary evidence
