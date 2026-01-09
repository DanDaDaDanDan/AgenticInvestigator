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

### Orchestrator MUST DO

- Read state files: `_state.json`, `_tasks.json`, `_coverage.json`
- Dispatch sub-agents with specific tasks
- Track gate status via mechanical verification scripts
- Log all agent dispatches

### Orchestrator MUST NOT

- Read full content of `findings/*.md`, `outlet-profiles/*.md`
- Reason about investigation completeness (use verify scripts)
- Make substantive claims about findings
- Skip skills by "combining" them
- Self-report gate passage

### Strict Delegation

| Agent Type | Responsibility |
|------------|----------------|
| Research agents | Gather information, write to findings/ |
| Capture agents | Run capture scripts, verify evidence |
| Verification agents | Run verify scripts, report results |
| Orchestrator | Dispatch, track state, enforce gates |

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

Only stop when ALL 9 TERMINATION GATES pass mechanically.

### Mechanical Verification Required

```bash
# MUST run before marking COMPLETE
node scripts/verify-all-gates.js cases/[case-id]

# Exit 0 = can terminate
# Exit 1 = must continue
```

### Required Skills (Must Invoke)

Before marking investigation COMPLETE, orchestrator MUST invoke:

1. `/verify` — Verification checkpoint
2. `/integrity` — Journalistic integrity check
3. `/legal-review` — Legal risk assessment
4. `/article` — Article generation (if requested)

**Do NOT combine or substitute skills.** Each has unique output requirements.

See `framework/rules.md` for complete gate definitions, coverage thresholds, and termination signals.

---

## Quick Reference

| Topic | Canonical Source |
|-------|------------------|
| Source attribution (`[S001]`) | `framework/rules.md` |
| File ownership | `framework/rules.md` |
| Termination gates (9) | `framework/rules.md` |
| 5-layer capture protocol | `framework/rules.md` |
| Three-layer rigor system | `framework/architecture.md` |
| Schema definitions | `framework/architecture.md` |
| Dynamic source discovery | `framework/architecture.md` |
| Gate results schema | `framework/architecture.md` |
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
