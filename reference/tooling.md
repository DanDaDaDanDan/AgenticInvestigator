# MCP Tooling Reference

External AI capabilities available via MCP servers. Use judgment on when these add value.

---

## OSINT Data Sources (mcp-osint)

Primary tool for structured data and web capture. Provides access to 14 authoritative data sources.

### Web Capture

| Tool | Purpose |
|------|---------|
| `osint_fetch` | Fetch URL as markdown (uses Firecrawl) |

```
mcp__mcp-osint__osint_fetch
  url: "https://example.com/article"
  extract_question: "What are the key facts?" (optional)
```

Returns: title, markdown content, links. Save with `osint-save.js`.

### Structured Data Search

| Tool | Purpose |
|------|---------|
| `osint_search` | Search across 14 data sources |
| `osint_preview` | Preview resource before fetching |
| `osint_get` | Fetch data from resource |
| `osint_list_sources` | List available sources |

```
mcp__mcp-osint__osint_search
  query: "SEC enforcement cryptocurrency 2024"
  source: "sec_edgar" (optional - auto-routes if omitted)
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
| `mcp__mcp-gemini__generate_text` | Gemini 3 Pro | Semantic verification, content analysis |

**Good for:** Evaluating competing hypotheses, analyzing contradictions, making judgment calls on ambiguous evidence, steelmanning positions, assessing whether claims are truly supported.

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

## Capture Workflow

### Web Pages

1. `osint_fetch` to get content
2. `osint-save.js` to save as evidence
3. Verify metadata.json exists

### PDFs/Documents

1. `capture.js --document` to download
2. `gemini generate_text` with file to extract content
3. Save extracted content to content.md

### Structured Data

1. `osint_search` to find resource
2. `osint_preview` to check structure
3. `osint_get` to fetch data
4. Save to evidence with proper metadata

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
| `FIRECRAWL_API_KEY` | `osint_fetch` (via mcp-osint) |
| `LEGISCAN_API_KEY` | `osint_search` (legiscan) |
| `COURTLISTENER_API_KEY` | `osint_search` (courtlistener) |
| `FRED_API_KEY` | `osint_search` (fred) |
| `OPENSANCTIONS_API_KEY` | `osint_search` (opensanctions) |

**Optional (higher rate limits):**
- `DATAGOV_API_KEY`, `CENSUS_API_KEY`, `CORE_API_KEY`
- `POLITE_EMAIL` - For OpenAlex, PubMed, SEC (recommended)
