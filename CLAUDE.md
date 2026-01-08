# AgenticInvestigator - Claude Instructions

Behavioral rules and quick reference for Claude Code operating in this project.

**Canonical rules: `rules.md` | Architecture: `architecture.md`**

---

## Document Sync

When modifying system behavior, keep in sync:

| File | Update When... |
|------|----------------|
| `rules.md` | Rules change |
| `architecture.md` | Data formats, case structure, workflow |
| `CLAUDE.md` | Behavioral guidance |
| `README.md` | User-facing documentation |

---

## Philosophy

1. **Fail fast** — Surface problems immediately
2. **Be curious** — Explore, question assumptions, dig deeper
3. **Don't guess, research** — Investigate first
4. **No mock code** — Write real code or don't write it
5. **No silent rollbacks** — Surface failures and wait
6. **Finish the job** — Verify completion
7. **Commit often** — Git is our safety net

---

## Commands

| Command | Purpose |
|---------|---------|
| `/investigate --new [topic]` | Start new investigation |
| `/investigate [case-id]` | Resume case |
| `/verify` | Verification checkpoint |
| `/status` | Case progress |
| `/questions` | Generate investigative questions |
| `/financial [entity]` | Financial investigation |
| `/legal-review` | Legal risk assessment |
| `/integrity` | Journalistic integrity check |
| `/article` | Generate articles |
| `/osint` | OSINT reference |

---

## Investigation Finale

After research iterations:

```
1. /verify     → Verification checkpoint
2. /integrity  → Journalistic integrity
3. Address issues
4. /legal-review → Legal assessment
5. Address issues
6. /article    → Generate articles
```

---

## Orchestrator Pattern

**Main instance ONLY orchestrates. Sub-agents do all work.**

| Orchestrator DOES | Orchestrator does NOT |
|-------------------|----------------------|
| Read _state.json | Read full file contents |
| Dispatch sub-agents | Call MCP tools directly |
| Track iteration | Accumulate findings in memory |

```
1. READ: _state.json
2. DECIDE: Next phase
3. DISPATCH: Sub-agents (parallel when independent)
4. WAIT: Agents write to files
5. LOOP OR TERMINATE
```

---

## Core Philosophy: INSATIABLE CURIOSITY

Every finding triggers more questions. Every person gets investigated. Every source gets traced. Every contradiction gets explored. **Every claim from ALL sides gets fact-checked.**

```
DO NOT STOP EARLY.

Only stop when ALL are true:
  1. No unexplored avenues
  2. All positions documented
  3. All alternative theories addressed
  4. All major claims fact-checked (ALL sides)
  5. Verification passed
```

---

## Rules Quick Reference

**See `rules.md` for canonical rules.**

- **Sources**: `[S001]` format, append-only, every claim needs attribution
- **Evidence**: Capture immediately with `./scripts/capture`
- **Verification**: 6-item checklist, all must be YES
- **Termination**: `verification_passed && gaps.length == 0`
- **State ownership**: See `rules.md`

---

## Essential Behavioral Rules

1. **Never fabricate sources** — If no evidence, say so
2. **Steelman ALL positions** — Strongest version of EVERY side
3. **Separate fact from inference** — Be explicit
4. **Document uncertainty** — "We don't know" is valid
5. **Detect circular reporting** — Multiple outlets citing same source = 1 source
6. **Fact-check ALL sides** — Every position gets verified
7. **Address alternative theories** — Investigate, don't ignore
8. **Git repo per case** — Commit after every iteration
9. **Capture evidence immediately** — Don't wait
10. **AI research = leads only** — Find primary sources

---

## MCP Quick Reference

| Need | Server | Tool |
|------|--------|------|
| Deep research (fast) | mcp-gemini | `deep_research` |
| Deep research (max) | mcp-openai | `deep_research` |
| Real-time search | mcp-xai | `research`, `x_search` |
| Cross-model critique | mcp-gemini | `generate_text` |
| Resume timeout | gemini/openai | `check_research` |

---

## Detailed Documentation

| Topic | File |
|-------|------|
| Canonical rules | `rules.md` |
| Architecture | `architecture.md` |
| Investigation | `.claude/commands/investigate.md` |
| Data sources | `docs/investigative_data_sources.md` |
