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

3. **CRITICAL: Domain-Specific Scientific Research**

   **DO NOT rely only on news articles and regulatory documents.**

   For EVERY investigation topic, explicitly search for:

   | Search Query Pattern | Purpose |
   |---------------------|---------|
   | "[topic] peer-reviewed research" | Academic studies |
   | "[topic] scientific consensus" | Expert agreement |
   | "[topic] veterinary/medical journal" | Domain expertise |
   | "[topic] ethology study" (for animals) | Behavior science |
   | "[topic] myth debunked" | Contrarian evidence |
   | "[topic] criticism academic" | Expert critiques |
   | "what do experts say about [topic]" | SME perspective |

   **Example (egg labels investigation):**
   - "chicken behavior peer-reviewed research"
   - "poultry ethology stress outdoor access"
   - "free-range chicken welfare scientific study"
   - "chicken agoraphobia research"
   - "laying hen behavioral needs veterinary"

   **This prevents surface-level analysis that misses what domain experts consider obvious.**

4. Save output to: `research-leads/iteration-{{iteration}}-{{engine}}.md`

5. Format findings with clear sections:
   - Key People
   - Key Organizations
   - Key Claims (with source URLs)
   - Timeline
   - Contradictions/Conflicts
   - **Scientific/Academic Sources** (MANDATORY - peer-reviewed)
   - **Expert Perspectives** (veterinarians, scientists, researchers)
   - **Marketing vs Science Gaps** (where claims diverge from research)
   - Sources to Capture (URLs)

## Output

Write findings to `{{case_dir}}/research-leads/iteration-{{iteration}}-{{engine}}.md`

**IMPORTANT:** Research leads are NOT citable sources. URLs found here must be captured to `evidence/web/` before citing.
