# MCP Tooling Reference

External AI capabilities available via MCP servers. Use judgment on when these add value.

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
| BOOTSTRAP | Deep research (both) | Build comprehensive initial understanding |
| QUESTION | Extended thinking (for complex Qs) | Some frameworks need deep reasoning |
| FOLLOW | XAI real-time search | Leads often need current/live data |
| CURIOSITY | Extended thinking | Genuine judgment required |
| VERIFY | Gemini generate_text | Semantic claim verification |

---

## Judgment Guidance

- **Don't over-rely on MCP** - Claude's native capabilities are often sufficient
- **Use deep research early** - Front-load comprehensive understanding
- **Use real-time search for leads** - Leads often involve current events
- **Use extended thinking sparingly** - Reserve for genuinely complex judgment
- **Combine tools** - Deep research + real-time can complement each other

---

## Environment Variables

| Variable | Required For |
|----------|--------------|
| `FIRECRAWL_API_KEY` | `node scripts/capture.js` and `firecrawl-capture.js` |
