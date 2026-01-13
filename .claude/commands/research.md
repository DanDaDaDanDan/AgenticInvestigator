# /research - Broad Topic Research

Conduct deep research on an investigation topic.

## Usage

```
/research <topic>
```

## Task

Research the topic broadly to build initial understanding before asking the 35 framework questions.

## MCP Tools

This is the ideal phase for **deep research** tools:

- Use `mcp__mcp-gemini__deep_research` for fast, broad coverage
- Use `mcp__mcp-openai__deep_research` for maximum depth on complex topics
- Consider using both - they complement each other

Also consider **real-time search** for current events:

- `mcp__mcp-xai__web_search` for recent news
- `mcp__mcp-xai__x_search` for social discourse

## Critical: Extracting and Capturing URLs

MCP search tools return results with **citation URLs**. You MUST:

### 1. Extract URLs from responses

When a search tool returns results, look for:
- Markdown links: `[Title](https://url.com/article)`
- Citation blocks with source URLs
- "Sources:" sections at the end of responses

### 2. Capture each URL individually

For each URL you want to cite:

```bash
# Get next source ID from state.json
node scripts/capture.js S001 https://example.com/specific-article cases/<case-id>

# Verify capture
ls evidence/S001/  # Must see metadata.json
```

### 3. Never synthesize sources

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

## Research Focus

- Key claims and controversies
- Named individuals and their roles
- Organizations and relationships
- Timeline of events
- Conflicting accounts or contradictions
- Scientific/academic perspectives
- What different stakeholders are saying

## Instructions

1. **Run deep research** to build comprehensive understanding

2. **Extract all useful URLs** from the research response

3. **Capture each URL** using `/capture-source`
   - Verify metadata.json exists for each
   - Only cite sources that captured successfully

4. **Update summary.md** with findings and [S###] citations

5. **Note leads** for deeper investigation

## PDF Sources

If a URL points to a PDF:

```bash
node scripts/capture.js --document S### https://example.gov/report.pdf cases/<case-id>
```

If PDF capture fails, note the source exists but couldn't be captured.

## Output

- Captured sources in `evidence/S###/` (each with metadata.json)
- Initial `summary.md` with key findings
- Leads identified for further investigation

## Next Step

After research, the orchestrator invokes `/question` to apply the 35 frameworks.
