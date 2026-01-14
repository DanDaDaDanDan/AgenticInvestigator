# Scripts

Utility scripts for AgenticInvestigator. No npm dependencies required - pure Node.js.

## Prerequisites

**Required:** mcp-osint MCP server (for web capture and PDF download via `osint_get`)

---

## Scripts

### `osint-save.js`

Save `osint_get` web page output as evidence with proper metadata and capture signature.

```bash
# From JSON file (RECOMMENDED - works on all platforms)
node scripts/osint-save.js S001 cases/[case-id] osint-output.json

# From URL + markdown file
node scripts/osint-save.js S001 cases/[case-id] --url https://example.com --markdown content.md --title "Title"
```

**Important:** On Windows, always use the JSON file method. Do NOT use stdin/echo - JSON escaping breaks.

Creates:
- `evidence/S001/content.md` - Markdown content
- `evidence/S001/links.json` - Extracted links (if provided)
- `evidence/S001/metadata.json` - Timestamps, hashes, capture signature

**Note:** For PDFs, use `osint_get` with `output_path` directly - it handles download and SHA256.

---

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
