# /research - Broad Topic Research

Conduct deep research on an investigation topic.

## Usage

```
/research <topic>
```

## Task

Research the topic broadly to build initial understanding before asking the 35 framework questions.

## MCP Tools

This is the ideal phase for **deep research** tools (see `reference/tooling.md`):

- Use `mcp__mcp-gemini__deep_research` for fast, broad coverage
- Use `mcp__mcp-openai__deep_research` for maximum depth on complex topics
- Consider using both - they complement each other

Also consider **real-time search** for current events:

- `mcp__mcp-xai__web_search` for recent news
- `mcp__mcp-xai__x_search` for social discourse

## Research Focus

- Key claims and controversies
- Named individuals and their roles
- Organizations and relationships
- Timeline of events
- Conflicting accounts or contradictions
- Scientific/academic perspectives
- What different stakeholders are saying

## Instructions

1. **Start with deep research** to build comprehensive understanding

2. **Supplement with real-time search** for current developments

3. **Capture sources immediately** - Use `/capture-source` for important URLs

4. **Update summary.md** - Write initial findings with [S###] citations

5. **Note leads** - Flag questions that need deeper investigation

## Output

- Captured sources in `evidence/web/S###/`
- Initial `summary.md` with key findings
- Leads identified for further investigation

## Next Step

After research, the orchestrator invokes `/question` to apply the 35 frameworks.
