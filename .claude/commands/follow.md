# /follow - Pursue Lead to Conclusion

Investigate a single lead to its conclusion.

## Usage

```
/follow <lead-id>
```

## Task

Take a lead from `leads.json` and investigate until you either:
- Find the answer (with captured sources)
- Hit a dead end (documented why)
- Generate new leads needing separate investigation

---

## MCP Tools

### Real-Time Search (Primary)

Leads often involve current events or live information:

- `mcp__mcp-xai__web_search` - Current news, recent articles, live web
- `mcp__mcp-xai__x_search` - Social discourse, public statements, breaking news
- `mcp__mcp-xai__research` - Broad real-time research

### OSINT Structured Sources

For authoritative data, use `mcp-osint`:

| Lead Type | Best Source | Query Example |
|-----------|-------------|---------------|
| Legal filings | `courtlistener` | "case number 2024-CV-12345" |
| Legislation | `legiscan` | "bill status HB 1234 Texas" |
| Academic claims | `openalex` / `pubmed` | "study on X effect" |
| Financial data | `sec_edgar` | "10-K filing company name" |
| Economic stats | `fred` | "unemployment rate 2024" |
| Government data | `data_gov` | "EPA inspection records" |
| Demographics | `census` | "population county X" |
| Global events | `gdelt` | "conflict region timeline" |

#### OSINT Search Syntax

```
mcp__mcp-osint__osint_search
  query: "specific search query"
  source: "courtlistener" (optional - omit for auto-routing)
  limit: 10
```

After finding a resource:
```
mcp__mcp-osint__osint_get
  resource_id: "<from search results>"
  question: "what specific information to extract"
```

### Web Page Fetching

Use `osint_fetch` to capture web pages:

```
mcp__mcp-osint__osint_fetch
  url: "https://example.com/article"
  extract_question: "Extract facts about [topic]" (optional)
```

### Extended Thinking

For leads requiring complex judgment:

- `mcp__mcp-openai__generate_text` for weighing conflicting evidence

---

## When to Use What

| Lead Involves | Primary Tool | Notes |
|---------------|--------------|-------|
| Recent news | `xai__web_search` | Real-time results |
| Social media | `xai__x_search` | X/Twitter search |
| Court cases | `osint_search` (courtlistener) | Authoritative legal data |
| Legislation | `osint_search` (legiscan) | Bill text and status |
| Academic papers | `osint_search` (openalex/pubmed) | Peer-reviewed sources |
| Company info | `osint_search` (sec_edgar) | Official SEC filings |
| Statistics | `osint_search` (fred/census) | Government statistics |
| Historical context | `deep_research` | Comprehensive analysis |

---

## Critical: Source Capture

### 1. Extract URLs from search results

MCP tools return results with citation URLs. Look for:
- Markdown links in the response
- "Sources:" sections
- Specific article/document URLs

### 2. Capture before citing

**For web pages (use osint_fetch):**
```
mcp__mcp-osint__osint_fetch
  url: "https://exact-url.com/article"
```
Then save: `node scripts/osint-save.js S### cases/<case-id> output.json`

**For PDFs:**
```bash
node scripts/capture.js --document S### https://example.gov/file.pdf cases/<case-id>
```

**For OSINT structured data:**
Use `osint_get` and save the response with proper metadata.

### 3. Verify capture

```bash
ls evidence/S###/
# Must see: content.md AND metadata.json
```

### 4. Never synthesize

**DO NOT** create sources like:
- "Research compilation from..."
- "Summary of academic literature"
- Sources pointing to homepages instead of specific articles

Each source = one specific URL or resource that was actually fetched.

---

## Instructions

1. **Read the lead** from `leads.json`

2. **Choose appropriate tool:**
   - Current events → XAI real-time search
   - Legal/court data → osint_search (courtlistener)
   - Academic claims → osint_search (openalex/pubmed)
   - Financial data → osint_search (sec_edgar)
   - Government data → osint_search (data_gov/census)

3. **Execute search** using MCP tools

4. **Extract and capture sources:**
   - Web pages: `osint_fetch` → `osint-save.js`
   - PDFs: `capture.js --document`
   - Structured data: `osint_get` → save to evidence

5. **Verify metadata.json exists** for each capture

6. **Update the lead status** in `leads.json`:
   - `investigated` with result and source IDs
   - `dead_end` with explanation

7. **Update the framework document** - Add findings to `questions/*.md`

8. **Update summary.md** - Add significant findings with [S###] citations

9. **Generate new leads** if discovered

---

## Lead Statuses

- `pending` - Not yet investigated
- `investigated` - Completed with result
- `dead_end` - Pursued but no useful info found

## Dead End Criteria

A lead is a genuine dead end if:
- Information doesn't exist or isn't public
- Multiple search approaches found nothing
- Capture failed and no alternatives exist

A lead is NOT a dead end if:
- You just haven't searched enough
- The information is hard to find but probably exists
- You found partial information that could be expanded

---

## OSINT-Specific Guidance

### Academic/Medical Claims

1. Search with `osint_search` (openalex or pubmed)
2. Preview with `osint_preview` to check relevance
3. Fetch full record with `osint_get`
4. Save with proper citation (DOI, PMID, etc.)

### Legal/Court Cases

1. Search with `osint_search` (courtlistener)
2. Get case details with `osint_get`
3. For full opinions, may need to fetch URL separately

### Financial Data

1. Search with `osint_search` (sec_edgar)
2. Preview filing structure
3. Fetch specific sections with `osint_get`

---

## Output

- Updated `leads.json` with result
- Sources captured to `evidence/S###/` (each with metadata.json)
- Updated `questions/*.md` with findings
- Updated `summary.md` with key points

## Next Step

After leads are investigated, orchestrator invokes `/curiosity`.
