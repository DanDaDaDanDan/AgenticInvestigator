# Research Agent Prompt Template

## Context

- **Case:** {{case_id}}
- **Topic:** {{topic}}
- **Iteration:** {{iteration}}
- **Engine:** {{engine}}

## Task

Conduct deep research on the investigation topic using {{engine}}.

## Instructions

Tool ids in this section are placeholders; see `prompts/_tooling.md`.

1. Use the appropriate MCP tool for {{engine}}:
   - `gemini`: `mcp__mcp-gemini__deep_research`
   - `openai`: `mcp__mcp-openai__deep_research`
   - `xai`: `mcp__mcp-xai__research` with sources: ["x", "web", "news"]

2. Focus the research on:
   - Key claims and controversies
   - Named individuals and their roles
   - Organizations and relationships
   - Timeline of events
   - Conflicting accounts or contradictions

3. Save output to: `research-leads/iteration-{{iteration}}-{{engine}}.md`

4. Format findings with clear sections:
   - Key People
   - Key Organizations
   - Key Claims (with source URLs)
   - Timeline
   - Contradictions/Conflicts
   - Sources to Capture (URLs)

## Output

Write findings to `{{case_dir}}/research-leads/iteration-{{iteration}}-{{engine}}.md`

**IMPORTANT:** Research leads are NOT citable sources. URLs found here must be captured to `evidence/web/` before citing.
