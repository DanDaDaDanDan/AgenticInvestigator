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

Capture web page evidence using Firecrawl API.

**Web Page:**
```bash
node scripts/capture.js S001 https://example.com cases/[case-id]
```

**Document:**
```bash
node scripts/capture.js --document S015 https://sec.gov/filing.pdf cases/[case-id]
```

Creates:
- `evidence/web/S001/capture.html`
- `evidence/web/S001/capture.png`
- `evidence/web/S001/capture.pdf`
- `evidence/web/S001/metadata.json`

---

### `firecrawl-capture.js`

Direct Firecrawl API capture for bot-protected sites.

```bash
node scripts/firecrawl-capture.js S001 https://example.com evidence/web/S001
```

---

### `find-wayback-url.js`

Find Wayback Machine archived URLs.

```bash
node scripts/find-wayback-url.js https://example.com
node scripts/find-wayback-url.js https://example.com --json
```

---

### `logger.js`

Logging utility used by other scripts.

---

### `config.js` / `lib/config-loader.js`

Configuration management.

---

### `run-tests.js`

Test runner for the project.
