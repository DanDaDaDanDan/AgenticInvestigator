# /capture-source - Capture Web Evidence

Capture a **single URL** as evidence for citations.

## Usage

```
/capture-source <url>              # Web page (uses osint_fetch)
/capture-source --document <url>   # PDF or document (direct download)
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
├── metadata.json    # REQUIRED - capture timestamp, URL, hash
└── links.json       # Optional - extracted links
```

**If metadata.json doesn't exist, the capture FAILED.** Do not cite.

### 3. Never Write content.md Manually

The capture tools write content.md from fetched data. You must NEVER:
- Create evidence/S###/ directories manually
- Write content.md yourself
- Create a source without using capture tools

---

## Web Page Capture (Primary Method)

Use `osint_fetch` from mcp-osint for web pages:

### Step 1: Fetch the page

```
mcp__mcp-osint__osint_fetch
  url: "https://example.com/article"
  extract_question: "Extract key facts about [topic]" (optional)
```

This returns:
- `title` - Page title
- `markdown` - Clean markdown content
- `links` - Links found on page

### Step 2: Save as evidence

Write the fetch result to a JSON file, then save:

```bash
# Write osint output to temp file
# Then run:
node scripts/osint-save.js S### cases/<case-id> osint-output.json

# Or with inline data via stdin
```

### Step 3: Verify and register

```bash
# Verify capture succeeded
ls evidence/S###/
# Must see: content.md AND metadata.json
```

Then register in sources.json:
```json
{
  "id": "S###",
  "url": "https://exact-url-captured.com/article",
  "title": "Exact title from the source",
  "outlet": "Publication name",
  "captured_at": "2026-01-13T...",
  "type": "news|government|legal|academic"
}
```

---

## Document/PDF Capture

For PDFs and downloadable documents, use direct download:

```bash
node scripts/capture.js --document S### https://example.gov/file.pdf cases/<case-id>
```

This saves the PDF to `evidence/S###/file.pdf` with metadata.json.

### Extracting PDF Content

After downloading, read the PDF with Gemini to create content.md:

```
mcp__mcp-gemini__generate_text
  prompt: "Extract the key provisions about [topic] from this document.
           Include section numbers and exact quotes for important passages."
  files: ["cases/<case-id>/evidence/S###/document.pdf"]
```

Then save Gemini's output to `evidence/S###/content.md`.

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
     query: "EPA air quality data California 2024"
     source: "data_gov" (optional - auto-routes if not specified)
   ```

2. **Preview the resource:**
   ```
   mcp__mcp-osint__osint_preview
     resource_id: "<id from search results>"
   ```

3. **Fetch the data:**
   ```
   mcp__mcp-osint__osint_get
     resource_id: "<id from search results>"
     question: "all data about PM2.5 levels"
   ```

4. **Save as evidence:**
   - Write the response to evidence/S###/content.md
   - Create metadata.json with source information
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
   - Try `osint_fetch` with different parameters
   - Check Wayback Machine: `node scripts/find-wayback-url.js <url>`
   - Fetch archived version with `osint_fetch`

2. **For PDFs:**
   - Try alternate URL format
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
- content.md starts with "Research compilation from..."
- Timestamp is a round number like `T20:00:00.000Z`
- URL is a homepage (e.g., `https://pubmed.ncbi.nlm.nih.gov/`) not specific article
- Title includes "Compilation" or "Research Summary"

---

## Quick Reference

| Need | Method |
|------|--------|
| Web article | `osint_fetch` → `osint-save.js` |
| PDF document | `capture.js --document` |
| Academic paper | `osint_search` (openalex/pubmed) → `osint_get` |
| Court case | `osint_search` (courtlistener) → `osint_get` |
| Government data | `osint_search` (data_gov/census) → `osint_get` |
| SEC filing | `osint_search` (sec_edgar) → `osint_get` |
| Legislation | `osint_search` (legiscan) → `osint_get` |
