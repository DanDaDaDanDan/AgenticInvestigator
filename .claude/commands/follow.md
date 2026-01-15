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
  target: "<resource_id from search results>"
  question: "what specific information to extract"
```

### Web Page and PDF Fetching

Use `osint_get` to capture any URL (web pages or PDFs):

```
mcp__mcp-osint__osint_get
  target: "https://example.com/article"
  question: "Extract facts about [topic]" (optional)
  output_path: "evidence/S###/doc.pdf" (required for PDFs)
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

**For any URL (web pages or PDFs):**
```
mcp__mcp-osint__osint_get
  target: "https://exact-url.com/article"
  output_path: "evidence/S###/doc.pdf" (for PDFs)
```
Returns content/path with SHA256 hash. Save to evidence folder.

**For OSINT structured data:**
Use `osint_get` with resource_id and save the response with proper metadata.

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

### 5. Primary vs Secondary Sources

Leads about a person/org need their primary source (actual interview, statement, filing), not articles that quote them. If an article quotes someone with a hyperlink, that link is likely the primary source - capture it.

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
   - Web pages: `osint_get target=<url>` → save to evidence
   - PDFs: `osint_get target=<url> output_path=<path>` → Gemini extract
   - Structured data: `osint_get target=<resource_id>` → save to evidence

5. **Verify metadata.json exists** for each capture

6. **Update the lead status** in `leads.json`:
   - `investigated` with result and source IDs
   - `dead_end` with explanation

7. **Update the framework document** - Add findings to `questions/*.md`

8. **Update summary.md** - Add significant findings with `[S###](url)` citations

9. **Generate new leads** if discovered:
   - Set `depth` = parent lead's depth + 1
   - Set `parent` = parent lead's ID
   - If new depth > `max_depth` → add to `future_research.md` instead

---

## Depth Tracking

When investigating a lead spawns new leads:

```json
// Parent lead being investigated
{ "id": "L005", "depth": 1, ... }

// New lead generated while investigating L005
{
  "id": "L042",
  "lead": "Interview transcript from news article",
  "from": "L005",
  "depth": 2,
  "parent": "L005",
  "status": "pending"
}
```

If `depth` would exceed `max_depth`:
1. Do NOT add to leads.json
2. Add to `future_research.md`:

```markdown
## L005 → Interview transcript
- **Parent:** L005 (depth 2)
- **Would be depth:** 3 (exceeds max_depth)
- **Lead:** Interview transcript from news article
- **Why relevant:** Contains primary source quotes
```

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
