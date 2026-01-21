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
- `evidence/S001/links.json` - Extracted links (if provided)
- `evidence/S001/metadata.json` - Timestamps, hashes, verification block, capture signature

**Note:** For PDFs, use `osint_get` with `output_path` directly - it handles download and SHA256.

---

---

## Claim Registry (`scripts/claims/`)

The claim registry system verifies article claims against source evidence. Claims are extracted from sources using LLM at capture time, then article verification is simple matching.

### `claims/verify-article.js`

Main verification entry point - matches article claims to registry.

```bash
# Basic verification
node scripts/claims/verify-article.js cases/[case-id]

# With fix suggestions
node scripts/claims/verify-article.js cases/[case-id] --fix

# JSON output
node scripts/claims/verify-article.js cases/[case-id] --json
```

Creates:
- `claim-verification.json` - Structured verification results
- `claim-verification-report.md` - Human-readable report

### `claims/migrate-sources.js`

Batch extract claims from existing sources (LLM-based).

```bash
# Check extraction status
node scripts/claims/migrate-sources.js cases/[case-id] status

# Generate LLM prompt for one source
node scripts/claims/migrate-sources.js cases/[case-id] prompt S001

# Generate prompts for all sources (JSON output)
node scripts/claims/migrate-sources.js cases/[case-id] prompt-all

# Register claims from LLM response file
node scripts/claims/migrate-sources.js cases/[case-id] register S001 response.json
```

**Workflow:**
1. Run `status` to see which sources need extraction
2. Run `prompt <source-id>` to get the LLM prompt
3. Send prompt to Gemini 3 Pro
4. Save LLM response to file
5. Run `register <source-id> <response-file>` to register claims

### `claims/capture-integration.js`

Integrate claim extraction into source capture workflow.

```bash
# Check status
node scripts/claims/capture-integration.js cases/[case-id] status

# Prepare extraction prompt for a source
node scripts/claims/capture-integration.js cases/[case-id] prepare S001

# List sources pending extraction
node scripts/claims/capture-integration.js cases/[case-id] list-pending
```

### Other Claim Modules

| Module | Purpose |
|--------|---------|
| `registry.js` | CRUD for claims.json |
| `extract.js` | Generate LLM prompts for claim extraction |
| `match.js` | Match article claims to registry |
| `report.js` | Generate verification reports |
| `index.js` | Module exports |

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
