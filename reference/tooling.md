# MCP Tooling Reference

External AI capabilities available via MCP servers. Use judgment on when these add value.

---

## OSINT Data Sources (mcp-osint)

Primary tool for data retrieval. Two main operations: **search** and **get**.

### Core Tools

| Tool | Purpose |
|------|---------|
| `osint_search` | Find resources across 14 data sources |
| `osint_get` | Retrieve content (URLs, PDFs, resource_ids) |
| `osint_preview` | Preview resource before fetching |
| `osint_list_sources` | List available sources and status |

### Unified osint_get

**One tool handles all retrieval.** Automatically detects format and retrieves appropriately.

```
mcp__mcp-osint__osint_get
  target: "https://example.com/article"    # URL or resource_id from osint_search
  output_path: "evidence/S001/paper.pdf"   # Required for PDF/binary URLs
  question: "What are the key findings?"   # Optional - what to extract
  summarize: true                          # Optional - extract only relevant content
  columns: ["name", "value"]               # For resource_id tabular data only
  filters: [{"column": "state", "operator": "eq", "value": "CA"}]  # For resource_id only
  limit: 100                               # For tabular data (default: 100, max: 500)
```

**Filter operators:** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `starts_with`, `in`

**Returns consistent structure:**
```json
{
  "format": "markdown|pdf|json|text|binary",
  "content": "...",           // For text formats
  "raw_html": "...",          // For web pages - full HTML
  "output_path": "...",       // For binary files
  "metadata": {
    "url": "...",
    "title": "...",           // For web pages
    "sha256": "abc123...",    // Always computed
    "size_bytes": 12345,
    "content_type": "text/html",
    "captured_at": "2026-01-14T..."
  },
  "links": ["..."],           // For web pages
  "provenance": { "source": "firecrawl|download|connector", "method": "scrape|http_get|connector_extract", "cache_hit": false }
}
```

**Routing logic:**
| Input | Action | Returns |
|-------|--------|---------|
| Web URL | Firecrawl scrape | `format: "markdown"`, `content`, `raw_html`, `links` |
| PDF URL | Download binary | `format: "pdf"`, `output_path` |
| resource_id | Connector extract | `format: "json"/"text"`, `content` (supports columns, filters, limit) |

### Search

```
mcp__mcp-osint__osint_search
  query: "SEC enforcement cryptocurrency 2024"
  source: "sec_edgar"   # Optional - auto-routes if omitted
  limit: 10
```

### Available Data Sources

| Source | Data Type | Example Query |
|--------|-----------|---------------|
| `data_gov` | Federal government data | "EPA air quality California" |
| `legiscan` | State/federal legislation | "Michigan renewable energy bill 2024" |
| `courtlistener` | Court cases | "Brown v. Board of Education" |
| `census` | Demographics | "population by county Texas" |
| `openalex` | Academic research | "machine learning medical diagnosis" |
| `semantic_scholar` | Academic papers | "transformer architecture NLP" |
| `pubmed` | Medical research | "vaccine efficacy studies" |
| `core` | Open access papers | "climate change agriculture" |
| `sec_edgar` | SEC filings | "Apple 10-K filing 2024" |
| `fred` | Economic data | "GDP quarterly growth rate" |
| `opensanctions` | Sanctions data | "Russian sanctions oligarchs" |
| `gdelt` | Global news | "Ukraine conflict news" |
| `wikidata` | Structured knowledge | "company headquarters locations" |
| `crt_sh` | SSL certificates | "microsoft.com subdomains" |

### Source Selection Guide

| Topic | Primary | Secondary |
|-------|---------|-----------|
| Laws/regulations | legiscan | courtlistener |
| Court cases | courtlistener | legiscan |
| Academic research | openalex | pubmed, semantic_scholar |
| Medical/health | pubmed | openalex |
| Company financials | sec_edgar | fred |
| Economic data | fred | census |
| Demographics | census | data_gov |
| Government programs | data_gov | census |
| Global events | gdelt | (web search) |

---

## Deep Research

For comprehensive understanding of complex topics. Best for bootstrapping and thorough exploration.

| Tool | Model | Use When |
|------|-------|----------|
| `mcp__mcp-gemini__deep_research` | Gemini | Fast deep research, good breadth |
| `mcp__mcp-openai__deep_research` | GPT | Maximum depth, thorough analysis |

**Good for:** Initial topic research, understanding controversies, mapping stakeholder positions, academic/scientific deep dives.

---

## Real-Time Search (XAI)

For current events, live data, and social discourse. These search the live web and X/Twitter.

| Tool | Searches | Use When |
|------|----------|----------|
| `mcp__mcp-xai__web_search` | Live web | Current news, recent developments |
| `mcp__mcp-xai__x_search` | X/Twitter | Social discourse, public reaction, breaking news |
| `mcp__mcp-xai__research` | Combined | Broad real-time research |

**Good for:** Following leads, checking current status, finding recent statements, gauging public discourse, discovering what people are saying now.

---

## Extended Thinking

For complex judgment calls requiring deep reasoning.

| Tool | Model | Use When |
|------|-------|----------|
| `mcp__mcp-openai__generate_text` | GPT 5.2 Pro | Complex analysis, nuanced judgment, contested questions |
| `mcp__mcp-gemini__generate_text` | Gemini 3 Pro | Semantic verification, content analysis, PDF extraction |

**Good for:** Evaluating competing hypotheses, analyzing contradictions, making judgment calls on ambiguous evidence, steelmanning positions, assessing whether claims are truly supported, extracting content from PDFs.

---

## Capture Workflow

### All Content Types (Unified)

```
1. osint_get target=<url_or_resource_id> [output_path=...] [question=...]
   → Returns { format, content/output_path, metadata.sha256 }

2. Save to evidence/S###/ with metadata.json containing sha256

3. For PDFs: Use Gemini to extract content to content.md
```

### Examples

**Web article:**
```
osint_get target="https://news.example.com/article"
→ { format: "markdown", content: "...", metadata: { sha256: "..." } }
```

**PDF document:**
```
osint_get target="https://pmc.ncbi.nlm.nih.gov/.../paper.pdf"
          output_path="evidence/S001/paper.pdf"
→ { format: "pdf", output_path: "evidence/S001/paper.pdf", metadata: { sha256: "..." } }
```

**Search result:**
```
osint_search query="food dyes children behavior" source="pubmed"
→ Returns papers with resource_ids

osint_get target="pubmed:paper:35484553:fulltext"
→ Auto-follows to PDF if available
```

---

## When to Use What

| Phase | Recommended Tools | Rationale |
|-------|-------------------|-----------|
| BOOTSTRAP | Deep research + OSINT search | Build comprehensive understanding from authoritative sources |
| QUESTION | Extended thinking + OSINT | Frameworks need deep reasoning and data |
| FOLLOW | XAI real-time + OSINT specific | Leads need current data + authoritative sources |
| CURIOSITY | Extended thinking | Genuine judgment required |
| VERIFY | Gemini generate_text + OSINT | Semantic verification against original sources |

---

## Judgment Guidance

- **Use OSINT for authoritative sources** - Government, academic, legal, financial
- **Use XAI for current events** - Real-time search for breaking news
- **Use deep research early** - Front-load comprehensive understanding
- **Use extended thinking sparingly** - Reserve for genuinely complex judgment
- **Combine tools** - OSINT structured data + real-time search complement each other

---

## Environment Variables

| Variable | Required For |
|----------|--------------|
| `FIRECRAWL_API_KEY` | `osint_get` web pages (via mcp-osint) |
| `LEGISCAN_API_KEY` | `osint_search` (legiscan) |
| `COURTLISTENER_API_KEY` | `osint_search` (courtlistener) |
| `FRED_API_KEY` | `osint_search` (fred) |
| `OPENSANCTIONS_API_KEY` | `osint_search` (opensanctions) |

**Optional (higher rate limits):**
- `DATAGOV_API_KEY`, `CENSUS_API_KEY`, `CORE_API_KEY`
- `POLITE_EMAIL` - For OpenAlex, PubMed, SEC (recommended)
