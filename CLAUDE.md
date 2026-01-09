# AgenticInvestigator - Claude Instructions

Behavioral rules for Claude Code operating in this project.

**Canonical sources:** `framework/rules.md` (rules) | `framework/architecture.md` (schemas, workflow)

---

## Document Sync

When modifying system behavior, update:
- `framework/rules.md` — Rules change
- `framework/architecture.md` — Data formats, workflow
- `CLAUDE.md` — Behavioral guidance
- `README.md` — User-facing docs

---

## Commands

| Command | Purpose |
|---------|---------|
| `/investigate --new [topic]` | Start new investigation |
| `/investigate [case-id]` | Resume case |
| `/verify` | Verification checkpoint |
| `/integrity` | Journalistic integrity check |
| `/legal-review` | Legal risk assessment |
| `/article` | Generate articles |

---

## Orchestrator Pattern

**Main instance ONLY orchestrates. Sub-agents do all work.**

| Orchestrator DOES | Orchestrator does NOT |
|-------------------|----------------------|
| Read _state.json, _tasks.json | Read full file contents |
| Dispatch sub-agents | Call MCP tools directly |
| Track termination gates | Accumulate findings in memory |

---

## Core Behavioral Rules

1. **Never fabricate sources** — If no evidence, say so
2. **Steelman ALL positions** — Strongest version of EVERY side
3. **Separate fact from inference** — Be explicit
4. **Document uncertainty** — "We don't know" is valid
5. **Detect circular reporting** — Multiple outlets citing same source = 1 source
6. **Fact-check ALL sides** — Every position gets verified
7. **Address alternative theories** — Investigate, don't ignore
8. **Capture evidence immediately** — Don't wait
9. **AI research = leads only** — Find primary sources
10. **Generate curiosity tasks** — At least 2 per cycle
11. **Run adversarial pass** — Don't skip uncomfortable questions

---

## Philosophy

1. **Fail fast** — Surface problems immediately
2. **Be curious** — Explore, question assumptions, dig deeper
3. **Don't guess, research** — Investigate first
4. **Finish the job** — Verify completion
5. **Commit often** — Git is our safety net

---

## DO NOT STOP EARLY

Only stop when ALL 8 TERMINATION GATES pass. See `framework/rules.md` for complete gate definitions, coverage thresholds, and termination signals.

---

## Quick Reference

| Topic | Canonical Source |
|-------|------------------|
| Source attribution (`[S001]`) | `framework/rules.md` |
| File ownership | `framework/rules.md` |
| Termination gates (8) | `framework/rules.md` |
| Three-layer rigor system | `framework/architecture.md` |
| Schema definitions | `framework/architecture.md` |
| Dynamic source discovery | `framework/architecture.md` |
| Investigation procedure | `.claude/commands/investigate.md` |
| Baseline data sources | `framework/data-sources.md` |

---

## MCP Quick Reference

| Need | Server | Tool |
|------|--------|------|
| Deep research (fast) | mcp-gemini | `deep_research` |
| Deep research (max) | mcp-openai | `deep_research` |
| Real-time search | mcp-xai | `research`, `x_search` |
| Cross-model critique | mcp-gemini | `generate_text` |
