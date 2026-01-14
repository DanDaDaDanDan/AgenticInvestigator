# /capture-source - Capture Web Evidence

Capture a **single URL** as evidence for citations.

## Usage

```
/capture-source <url>              # Any URL (web page or PDF)
/capture-source --osint <query>    # Structured data from OSINT sources
```

## Critical Rules

### 1. One Source = One URL

**NEVER create "research compilation" or synthesized sources.**

| Valid Source | Invalid Source |
|--------------|----------------|
| Single article URL | "Research compilation from multiple sources" |
| Specific PDF document | "Summary of academic literature" |
| One government page | "NC DHHS / Research Compilation" |

If information comes from multiple URLs, capture each URL as a separate source.

### 2. Verification Required

After capture, **verify these files exist**:

```
evidence/S###/
├── content.md       # REQUIRED - actual captured content
├── metadata.json    # REQUIRED - with sha256 hash
└── [document.pdf]   # For PDFs - the actual file
```

**If metadata.json doesn't have sha256, the capture FAILED.** Do not cite.

### 3. Never Write content.md Manually

The capture tools write content.md from fetched data. You must NEVER:
- Create evidence/S###/ directories manually
- Write content.md yourself
- Create a source without using capture tools

---

## Unified Capture with osint_get

**One tool handles all URL retrieval.** It auto-detects format and retrieves appropriately.

### Web Pages

```
mcp__mcp-osint__osint_get
  target: "https://example.com/article"
  question: "Extract key facts about [topic]" (optional)
```

**Returns:**
```json
{
  "format": "markdown",
  "content": "# Article Title\n\nThe full markdown content...",
  "metadata": {
    "url": "https://example.com/article",
    "title": "Article Title",
    "sha256": "abc123...",
    "size_bytes": 23456,
    "captured_at": "2026-01-14T..."
  },
  "links": ["https://...", "..."]
}
```

**Save to evidence:** Use Write tool to save content to evidence/S###/content.md and metadata to metadata.json.

### PDFs

```
mcp__mcp-osint__osint_get
  target: "https://example.gov/report.pdf"
  output_path: "cases/<case-id>/evidence/S###/document.pdf"
```

**Returns:**
```json
{
  "format": "pdf",
  "output_path": "cases/<case-id>/evidence/S###/document.pdf",
  "metadata": {
    "url": "https://example.gov/report.pdf",
    "sha256": "def456...",
    "size_bytes": 1234567,
    "captured_at": "2026-01-14T..."
  }
}
```

**Then extract content with Gemini:**
```
mcp__mcp-gemini__generate_text
  prompt: "Extract the key provisions about [topic] from this document.
           Include section numbers and exact quotes for important passages."
  files: ["cases/<case-id>/evidence/S###/document.pdf"]
```

Save Gemini's output to `evidence/S###/content.md`.

### After Capture

Register in sources.json:
```json
{
  "id": "S###",
  "url": "https://exact-url-captured.com/article",
  "title": "Exact title from the source",
  "type": "news|government|legal|academic",
  "captured": "2026-01-14"
}
```

---

## Structured Data Capture (OSINT Sources)

For government databases, academic papers, court records, etc., use mcp-osint search:

### Available OSINT Sources

| Source | Data Type | Example Query |
|--------|-----------|---------------|
| `data_gov` | Federal datasets | "EPA air quality California" |
| `legiscan` | State legislation | "Michigan renewable energy bill 2024" |
| `courtlistener` | Court cases | "Brown v. Board of Education" |
| `census` | Demographics | "population by county Texas" |
| `openalex` | Academic papers | "machine learning medical diagnosis" |
| `pubmed` | Medical research | "vaccine efficacy studies" |
| `sec_edgar` | SEC filings | "Apple 10-K filing 2024" |
| `fred` | Economic data | "GDP quarterly growth rate" |
| `opensanctions` | Sanctions data | "Russian sanctions oligarchs" |
| `gdelt` | Global news | "Ukraine conflict news" |

### OSINT Capture Workflow

1. **Search for the resource:**
   ```
   mcp__mcp-osint__osint_search
     query: "food dyes children behavior"
     source: "pubmed" (optional - auto-routes if not specified)
   ```

2. **Preview the resource (optional):**
   ```
   mcp__mcp-osint__osint_preview
     resource_id: "<id from search results>"
   ```

3. **Fetch the data:**
   ```
   mcp__mcp-osint__osint_get
     target: "<resource_id from search results>"
     output_path: "cases/<case-id>/evidence/S###/paper.pdf" (if PDF)
   ```

4. **Save as evidence:**
   - For PDFs: Use Gemini to extract content to content.md
   - For text/json: Save content directly to content.md
   - Create metadata.json with sha256 from response
   - Register in sources.json

---

## Source Types

| Type | Example |
|------|---------|
| `news` | News article with byline |
| `government` | .gov official page |
| `legal` | Court filing, statute |
| `academic` | Peer-reviewed paper |
| `primary` | Press release, official statement |
| `social` | Tweet, public post |
| `data` | Dataset from OSINT source |

---

## Failure Handling

If capture fails:

1. **For web pages:**
   - Try `osint_get` again
   - Check Wayback Machine: `node scripts/find-wayback-url.js <url>`
   - Fetch archived version with `osint_get`

2. **For PDFs:**
   - Ensure `output_path` is provided
   - Check if document is publicly accessible

3. **For OSINT sources:**
   - Try different search terms
   - Try a different source connector
   - Check if API key is configured (see `osint_list_sources`)

4. **If all fail: DO NOT CITE.** Note the source exists but couldn't be captured.

---

## Red Flags - Fabricated Sources

These indicate a fabricated source that must be deleted:

- No metadata.json in evidence/S###/
- No sha256 hash in metadata.json
- content.md starts with "Research compilation from..."
- Timestamp is a round number like `T20:00:00.000Z`
- URL is a homepage (e.g., `https://pubmed.ncbi.nlm.nih.gov/`) not specific article
- Title includes "Compilation" or "Research Summary"
- Type includes "synthesis" or "aggregation"

---

## Quick Reference

| Need | Method |
|------|--------|
| Web article | `osint_get target=<url>` |
| PDF document | `osint_get target=<url> output_path=<path>` + Gemini extract |
| Academic paper | `osint_search` → `osint_get target=<resource_id>` |
| Court case | `osint_search` (courtlistener) → `osint_get` |
| Government data | `osint_search` (data_gov/census) → `osint_get` |
| SEC filing | `osint_search` (sec_edgar) → `osint_get` |
| Legislation | `osint_search` (legiscan) → `osint_get` |
