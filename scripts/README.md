# Scripts

Utility scripts for AgenticInvestigator.

## Prerequisites

```bash
npm install
```

**Required:**
- Firecrawl API key: `FIRECRAWL_API_KEY` in `.env`

---

## Scripts

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

### `capture.js`

Capture web page evidence using Firecrawl API (markdown only).

**Web Page:**
```bash
node scripts/capture.js S001 https://example.com cases/[case-id]
```

**Document:**
```bash
node scripts/capture.js --document S015 https://sec.gov/filing.pdf cases/[case-id]
```

Creates:
- `evidence/S001/content.md` - Markdown content
- `evidence/S001/links.json` - Extracted links
- `evidence/S001/metadata.json` - Timestamps, hashes

---

### `firecrawl-capture.js`

Direct Firecrawl API capture (markdown extraction).

```bash
node scripts/firecrawl-capture.js S001 https://example.com evidence/S001
```

Creates `content.md`, `links.json`, and `metadata.json`.

---

### `find-wayback-url.js`

Find Wayback Machine archived URLs.

```bash
node scripts/find-wayback-url.js https://example.com
node scripts/find-wayback-url.js https://example.com --json
```

---

### `logger.js`

Logging utility used by other scripts. Supports:
- Log levels: DEBUG, INFO, WARN, ERROR
- File logging with rotation
- Operation tracking with success/failure states

Environment variables:
- `LOG_LEVEL` - Set log level (default: info)
- `LOG_FILE` - Enable file logging to specified path
