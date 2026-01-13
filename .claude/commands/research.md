# /research - Broad Topic Research

Conduct deep research on an investigation topic.

## Usage

```
/research <topic> [--engine gemini|openai|xai]
```

## Task

Research the topic broadly to build initial understanding before asking the 35 framework questions.

## Instructions

1. **Use MCP deep research tools:**
   - `mcp__mcp-gemini__deep_research` (default - fast)
   - `mcp__mcp-openai__deep_research` (thorough)
   - `mcp__mcp-xai__research` with sources: ["x", "web", "news"] (real-time)

2. **Research focus:**
   - Key claims and controversies
   - Named individuals and their roles
   - Organizations and relationships
   - Timeline of events
   - Conflicting accounts or contradictions

3. **CRITICAL: Include scientific sources**

   Search for:
   - "[topic] peer-reviewed research"
   - "[topic] scientific consensus"
   - "[topic] expert criticism"
   - "[topic] myth debunked"
   - "what do experts say about [topic]"

4. **Capture sources immediately**

   For any important URL found, use `/capture-source` before continuing.

5. **Update summary.md**

   Write initial findings to summary.md with [S###] citations for captured sources.

## Output

- Captured sources in `evidence/S###/`
- Initial `summary.md` with key findings
- Leads identified for further investigation (note in summary.md)

## Next Step

After research, the orchestrator will invoke `/question` to apply the 35 frameworks.
