# /capture-source - Capture Web Evidence

Capture a **single URL** as evidence for citations.

## Usage

```
/capture-source <url>              # Web page
/capture-source --document <url>   # PDF or document
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

The capture script writes content.md from fetched data. You must NEVER:
- Create evidence/S###/ directories manually
- Write content.md yourself
- Create a source without running the capture script

## Workflow

1. **Get next source ID** from `state.json.next_source`

2. **Run capture script**:
   ```bash
   # Web page
   node scripts/capture.js S### <url> cases/<case-id>

   # PDF or document
   node scripts/capture.js --document S### <url> cases/<case-id>
   ```

3. **Verify capture succeeded**:
   ```bash
   ls evidence/S###/
   # Must see: content.md AND metadata.json
   ```

4. **Only if verified**, register in sources.json:
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

5. **Increment** next_source in state.json

## PDF and Document Handling

### Finding Government PDFs

Use XAI web search with domain filtering to find official documents:

```
mcp__mcp-xai__web_search
  query: "NC statute 122C mental health commitment PDF"
  allowed_domains: ["ncleg.gov", "nccourts.gov", "ncdhhs.gov"]
```

Common government domains:
- State legislation: `ncleg.gov`, `legislature.state.gov`
- Courts: `nccourts.gov`, `uscourts.gov`, `courtlistener.com`
- Federal: `govinfo.gov`, `federalregister.gov`, `congress.gov`
- Health: `cdc.gov`, `ncdhhs.gov`, `hhs.gov`

### Downloading PDFs

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

### Complete PDF Workflow

1. **Search** - Find PDF URL using XAI with domain filtering
2. **Download** - `capture.js --document` saves PDF + metadata.json
3. **Extract** - Gemini reads PDF and extracts relevant content
4. **Save** - Write extracted content to content.md
5. **Register** - Add to sources.json with type "legal" or "government"

### If PDF Capture Fails

1. Try alternate URL (Wayback Machine, different format)
2. Note the URL exists but couldn't be captured
3. Do NOT synthesize content - mark lead as needing the document

## Failure Handling

If capture fails:
1. Try alternate method (Firecrawl for bot-protected sites)
2. Check Wayback Machine: `node scripts/find-wayback-url.js <url>`
3. Try `--document` mode for PDFs
4. **If all fail: DO NOT CITE.** Note the source exists but couldn't be captured.

## Source Types

| Type | Example |
|------|---------|
| `news` | News article with byline |
| `government` | .gov official page |
| `legal` | Court filing, statute |
| `academic` | Peer-reviewed paper |
| `primary` | Press release, official statement |
| `social` | Tweet, public post |

## Red Flags - Fabricated Sources

These indicate a fabricated source that must be deleted:

- No metadata.json in evidence/S###/
- content.md starts with "Research compilation from..."
- Timestamp is a round number like `T20:00:00.000Z`
- URL is a homepage (e.g., `https://pubmed.ncbi.nlm.nih.gov/`) not specific article
- Title includes "Compilation" or "Research Summary"
