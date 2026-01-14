# Scripts

Utility scripts for AgenticInvestigator. No npm dependencies required - pure Node.js.

## Prerequisites

**Required:** mcp-osint MCP server (for web capture via `osint_fetch`)

---

## Scripts

### `osint-save.js`

Save `osint_fetch` MCP output as evidence.

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

---

### `capture.js`

Download documents/PDFs for evidence capture.

```bash
node scripts/capture.js -d S015 https://sec.gov/filing.pdf cases/[case-id]
node scripts/capture.js --document S015 https://example.gov/report.pdf 10k.pdf cases/[case-id]
```

Creates:
- `evidence/S015/[filename]` - Downloaded document
- `evidence/S015/metadata.json` - Timestamps, hash

**Note:** For web pages, use `osint_fetch` MCP tool + `osint-save.js` instead.

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

### Web Pages

1. Use `osint_fetch` MCP tool to fetch URL
2. Write response to JSON file
3. Run `osint-save.js` to save as evidence
4. Verify `metadata.json` exists

### Documents/PDFs

1. Run `capture.js --document` to download
2. Use `gemini generate_text` with file to extract content
3. Save extracted content to `content.md`
