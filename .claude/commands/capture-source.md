# Source Capture (Agent Mode)

You are a **capture agent**. Your job is to capture web sources as evidence and verify the capture succeeded.

**See `framework/rules.md` for the 5-layer capture protocol.**

---

## Usage

```
/capture-source S001 https://example.com          # Capture web page
/capture-source --document S002 https://sec.gov/file.pdf  # Capture PDF document
```

Case resolution order:
1. Explicit `[case-id]` (when provided by orchestrator)
2. `cases/.active` (set via `node scripts/active-case.js set <case-id>`)
3. Current working directory (if run inside a case)
4. Error with hint

---

## Purpose

Evidence capture is critical for anti-hallucination:
1. **Prove existence** - Source existed at research time
2. **Prove content** - Evidence actually contains cited claims
3. **Permanence** - Content preserved even if URL disappears

---

## Capture Workflow

```
1. VALIDATE: Check URL is valid
2. ASSIGN: Get next source ID from state.json (or infer from sources.json)
3. CAPTURE: Run capture script
4. VERIFY: Check evidence folder exists with required files
5. REGISTER: Add to sources.md with evidence path
6. UPDATE: Increment next_source_id in state.json (optional convenience counter)
```

---

## Capture Commands

### Web Page Capture

```bash
node scripts/capture.js S001 https://example.com cases/[case-id]
```

Creates:
- `evidence/web/S001/capture.html` - Raw HTML
- `evidence/web/S001/capture.png` - Full-page screenshot
- `evidence/web/S001/capture.pdf` - PDF rendering
- `evidence/web/S001/metadata.json` - Timestamps, hashes, status

### Document Capture

```bash
node scripts/capture.js --document S002 https://sec.gov/file.pdf cases/[case-id]
```

Creates:
- `evidence/documents/S002_filename.pdf` - The document
- `evidence/documents/S002_filename.pdf.meta.json` - Metadata

### Bot-Bypass Capture (Cloudflare-protected sites)

```bash
node scripts/firecrawl-capture.js S003 https://protected-site.com cases/[case-id]/evidence/web/S003
```

---

## Verification After Capture

**ALWAYS verify capture succeeded before citing the source.**

### Check 1: Evidence Folder Exists

```bash
ls cases/[case-id]/evidence/web/S001/
# Must show: metadata.json + at least one of (capture.html, capture.pdf, capture.png)
```

### Check 2: Metadata Valid

```bash
cat cases/[case-id]/evidence/web/S001/metadata.json | jq '.files'
# Must show captured files with hashes
```

### Check 3: Run Verification Script

```bash
node scripts/verify-sources.js cases/[case-id]
# Check S001 shows OK (valid) not NO (missing)
```

---

## Registration Format

After successful capture, add to `sources.md`:

```markdown
| S001 | Primary | [Description] | [URL] | [Captured Date] |
```

And update `sources.json` (if exists):

```json
{
  "S001": {
    "url": "https://...",
    "captured_at": "2026-01-09T14:30:00Z",
    "evidence_path": "evidence/web/S001/",
    "files": ["metadata.json", "capture.html", "capture.png"],
    "verified": true
  }
}
```

---

## Anti-Hallucination Rules

1. **Never cite before capture** - No `[S001]` until evidence exists
2. **Never fake capture dates** - Only write date after successful capture
3. **Always verify** - Check evidence folder before registering
4. **Report failures** - If capture fails, don't hide it

---

## Failure Handling

If capture fails:

1. **Try alternate method** - Firecrawl for bot-protected, wget for simple pages
2. **Check Wayback Machine** - `./scripts/find-wayback-url.js`
3. **Document failure** - Note in sources.md that capture failed
4. **Do NOT cite** - Cannot use `[SXXX]` without evidence

---

## Return Format

After capturing sources, return:

```
CAPTURED: [count] sources
  S001: https://example.com - SUCCESS (html, png, pdf)
  S002: https://sec.gov/file.pdf - SUCCESS (document)
  S003: https://protected.com - FAILED (Cloudflare block, trying Firecrawl)

VERIFICATION:
  node scripts/verify-sources.js [case_dir]
  Result: [X]/[Y] sources have evidence

NEXT_SOURCE_ID: S004
```
