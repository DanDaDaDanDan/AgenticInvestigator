# /research - Broad Topic Research

Conduct deep research on an investigation topic.

## Usage

```
/research <topic>
```

## Task

Research the topic broadly to build initial understanding before asking the 35 framework questions.

---

## MCP Tools

### Deep Research (Comprehensive)

For building comprehensive initial understanding:

- `mcp__mcp-gemini__deep_research` - Fast, broad coverage
- `mcp__mcp-openai__deep_research` - Maximum depth on complex topics

Consider using both - they complement each other.

### Real-Time Search

For current events and live information:

- `mcp__mcp-xai__web_search` - Recent news, current articles
- `mcp__mcp-xai__x_search` - Social discourse, public reaction
- `mcp__mcp-xai__research` - Combined broad real-time research

### OSINT Structured Data (NEW)

For authoritative structured sources, use `mcp-osint`:

| Source | Use For | Example Query |
|--------|---------|---------------|
| `osint_search` (auto) | Auto-route to best source | "EPA regulations on emissions" |
| `data_gov` | Federal government data | "federal spending education" |
| `legiscan` | State/federal legislation | "California privacy law 2024" |
| `courtlistener` | Court cases and opinions | "patent infringement Apple v Samsung" |
| `census` | Demographics and population | "income distribution by state" |
| `openalex` | Academic research | "climate change impact agriculture" |
| `pubmed` | Medical/health research | "vaccine efficacy COVID" |
| `sec_edgar` | SEC filings and financials | "Tesla 10-K 2024" |
| `fred` | Economic data | "unemployment rate historical" |
| `gdelt` | Global news events | "protests Iran 2024" |

#### OSINT Search Example

```
mcp__mcp-osint__osint_search
  query: "SEC enforcement actions cryptocurrency 2024"
  source: "sec_edgar" (optional - omit for auto-routing)
  limit: 10
```

---

## Critical: Extracting and Capturing URLs

### From MCP Search Results

When a search tool returns results, look for:
- Markdown links: `[Title](https://url.com/article)`
- Citation blocks with source URLs
- "Sources:" sections at the end of responses

### Capture Each URL

For each URL you want to cite, use `osint_get`:

**Web pages:**
```
mcp__mcp-osint__osint_get
  target: "https://example.com/specific-article"
```
Returns markdown with SHA256 hash. Save to evidence folder.

**PDFs and documents:**
```
mcp__mcp-osint__osint_get
  target: "https://example.gov/report.pdf"
  output_path: "cases/<case-id>/evidence/S###/report.pdf"
```
Then use Gemini to extract content to content.md.

### From OSINT Structured Sources

When using `osint_search`, you get resource IDs that can be fetched directly:

1. Search: `osint_search` returns resources with IDs
2. Preview: `osint_preview` to see structure
3. Fetch: `osint_get` to retrieve data
4. Save: Write to evidence/S###/ with proper metadata

### Never Synthesize Sources

**WRONG:**
```
I'll create S007 as a "Research compilation from NC statutes and DHHS reports"
```

**RIGHT:**
```
From the search results, I found these specific URLs:
- https://ncleg.gov/specific-statute-page → capture as S007
- https://ncdhhs.gov/specific-report → capture as S008
```

---

## Research Focus

- Key claims and controversies
- Named individuals and their roles
- Organizations and relationships
- Timeline of events
- Conflicting accounts or contradictions
- Scientific/academic perspectives (use openalex, pubmed)
- Legal context (use courtlistener, legiscan)
- Financial aspects (use sec_edgar, fred)
- What different stakeholders are saying

---

## Instructions

1. **Run deep research** to build comprehensive understanding

2. **Run OSINT searches** for structured data:
   - Academic sources: `osint_search` with openalex/pubmed
   - Legal sources: `osint_search` with courtlistener/legiscan
   - Financial: `osint_search` with sec_edgar/fred
   - Government data: `osint_search` with data_gov/census

3. **Extract all useful URLs** from responses

4. **Capture each URL** using `osint_get`:
   - Web pages: `osint_get target=<url>` → save to evidence
   - PDFs: `osint_get target=<url> output_path=<path>` → Gemini extract
   - Structured data: `osint_get target=<resource_id>` → save to evidence

5. **Verify metadata.json exists** for each capture

6. **Update summary.md** with findings and [S###] citations

7. **Note leads** for deeper investigation

---

## OSINT Source Selection Guide

| Topic Involves | Primary Source | Secondary |
|----------------|----------------|-----------|
| Laws/regulations | legiscan | courtlistener |
| Court cases | courtlistener | legiscan |
| Academic research | openalex | pubmed |
| Medical/health | pubmed | openalex |
| Company financials | sec_edgar | fred |
| Economic data | fred | census |
| Demographics | census | data_gov |
| Government programs | data_gov | census |
| Global events | gdelt | (web search) |

---

## Output

- Captured sources in `evidence/S###/` (each with metadata.json)
- Initial `summary.md` with key findings and [S###] citations
- Leads identified for further investigation

## Next Step

After research, the orchestrator invokes `/question` to apply the 35 frameworks.
