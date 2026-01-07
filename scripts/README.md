# Evidence Capture Scripts

Scripts for capturing and verifying source evidence.

## Prerequisites

```bash
cd /path/to/AgenticInvestigator
npm install playwright
npx playwright install chromium
```

## Scripts

### `capture`

Capture web page evidence (screenshot, PDF, HTML) or download documents.

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

### `verify-sources.js`

Verify source evidence integrity.

```bash
node scripts/verify-sources.js /path/to/case
```

**Checks:**
- All sources in sources.md have evidence folders
- All evidence files match their recorded SHA-256 hashes
- Reports missing or corrupted evidence

**Output:**
```
============================================================
Source Evidence Verification Report
============================================================
Case: /path/to/case
Time: 2026-01-07T12:00:00.000Z

Found 47 source IDs in sources.md

✓ S001: valid (3 files)
✓ S002: valid (3 files)
✗ S003: missing (0 files)
📄 S015: document (1 files)
...

------------------------------------------------------------
Summary
------------------------------------------------------------
Total sources:     47
Valid (web):       30
Valid (document):  10
Partial:           2
Missing:           5

Capture rate: 89.4%
```

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

Target: 100% capture rate for sources cited in summary.md

## Metadata Schema

```json
{
  "source_id": "S001",
  "url": "https://example.com/article",
  "title": "Page Title",
  "captured_at": "2026-01-07T14:23:00Z",
  "capture_duration_ms": 5230,
  "method": "playwright",
  "playwright_version": "1.40.0",
  "viewport": { "width": 1920, "height": 1080 },
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

## Troubleshooting

### Capture fails with timeout
- Some pages take longer to load
- Try increasing timeout in capture-url.js
- Check if site blocks automated browsers

### Missing screenshots but HTML captured
- JavaScript-heavy sites may fail screenshot
- HTML fallback ensures some evidence captured
- Consider manual screenshot if needed

### Wayback Machine submission fails
- May be rate limited
- Will retry on next capture
- Not critical - local copy is primary evidence
