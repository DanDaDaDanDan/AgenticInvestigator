# Tooling Map (MCP)

Prompt templates in this repo may reference placeholder MCP tool ids like:
- `mcp__mcp-gemini__deep_research`
- `mcp__mcp-openai__deep_research`
- `mcp__mcp-openai__generate_text`
- `mcp__mcp-gemini__generate_text`
- `mcp__mcp-xai__research`

Update these to match your actual Claude Code MCP server + tool identifiers.

## Expected Capabilities

- Research:
  - Deep web research with citations/URLs.
  - Ability to return a structured, source-linked report.

- Critique:
  - Adversarial review of a draft (bias, missing perspectives, missing evidence).

- Synthesis:
  - Generate structured outputs that follow the case file contracts (tasks, claims, findings).

## Environment Variables (Scripts)

- `GEMINI_API_KEY`: required for `node scripts/verify-claims.js` (AI claim verification).
- `FIRECRAWL_API_KEY`: required for `node scripts/firecrawl-capture.js` (bot-protected captures).

## Notes

- If you do not have MCP tools configured, keep the prompts as-is and run the local verifiers (`node scripts/generate-gaps.js` and `node scripts/verify-all-gates.js`) to drive the workflow.

