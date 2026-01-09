# AgenticInvestigator - Claude Instructions

Behavioral rules and quick reference for Claude Code operating in this project.

**Canonical rules: `framework/rules.md` | Architecture: `framework/architecture.md`**

---

## Document Sync

When modifying system behavior, keep in sync:

| File | Update When... |
|------|----------------|
| `framework/rules.md` | Rules change |
| `framework/architecture.md` | Data formats, case structure, workflow |
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

### Entry Point
| Command | Purpose |
|---------|---------|
| `/investigate --new [topic]` | Start new investigation |
| `/investigate [case-id]` | Resume case |

### Manual Overrides (auto-invoked by main loop)
| Command | Purpose |
|---------|---------|
| `/verify` | Run verification checkpoint |
| `/integrity` | Run journalistic integrity check |
| `/legal-review` | Run legal risk assessment |
| `/article` | Generate publication-ready articles |
| `/status` | Check investigation progress |

---

## Dynamic Task Generation (Core Innovation)

**The system generates investigation tasks dynamically** based on what the case needs—not hardcoded templates.

### Instead of Hardcoded Commands

| Old | New |
|-----|-----|
| `/financial` with 6 fixed angles | Tasks generated specific to THIS entity |
| `/questions` by iteration count | Required perspectives in every task generation |
| Phase triggers (entity types, keywords) | Tasks emerge from case analysis |

### Three-Layer Rigor System

1. **Layer 1: Required Perspectives** (every task generation cycle)
   - Money, Timeline, Silence, Documents, Contradictions
   - Relationships, Hypotheses, Assumptions, Counterfactual, Blind Spots
   - + Curiosity check (at least 2 tasks per cycle)

2. **Layer 2: Adversarial Pass** (after initial task generation)
   - What would disprove each claim?
   - Strongest argument for unexplored positions?
   - What assumptions are embedded?

3. **Layer 3: Rigor Checkpoint** (before termination)
   - Validate ALL 20 frameworks addressed
   - Cannot terminate with unexplained gaps

---

## 8 Termination Gates

**ALL must pass to complete:**

```
1. Coverage thresholds met:
   - People: investigated/mentioned ≥ 90%
   - Entities: investigated/mentioned ≥ 90%
   - Claims: verified/total ≥ 80%
   - Sources: captured/cited = 100%
   - Positions: documented/identified = 100%
   - Contradictions: explored/identified = 100%

2. No HIGH priority tasks pending
3. adversarial_complete == true
4. rigor_checkpoint_passed == true
5. verification_passed == true
6. quality_checks_passed == true
7. All positions steelmanned
8. No unexplored contradictions
```

**If ANY gate fails → generate tasks to address → loop.**

---

## OSINT Source Knowledge

Investigation agents know OSINT sources—tasks generate relevant sources for THIS case.

| Entity Type | Sources Known |
|-------------|---------------|
| Person | OpenCorporates, courts, OpenSanctions, ICIJ, campaign finance |
| Corporation | SEC EDGAR, State SOS, OpenCorporates, USAspending, courts |
| Nonprofit | ProPublica 990s, Candid, IRS, state charity registration |
| Government | USAspending, GAO/OIG reports, FOIA libraries |

**The LLM knows domain knowledge.** We don't spell it out—we generate what's relevant.

Full source reference: `framework/data-sources.md`

---

## Orchestrator Pattern

**Main instance ONLY orchestrates. Sub-agents do all work.**

| Orchestrator DOES | Orchestrator does NOT |
|-------------------|----------------------|
| Read _state.json, _tasks.json | Read full file contents |
| Dispatch sub-agents | Call MCP tools directly |
| Track termination gates | Accumulate findings in memory |

```
1. READ: _state.json, _tasks.json, _coverage.json
2. GENERATE TASKS: With required perspectives + curiosity check
3. RUN ADVERSARIAL PASS: Generate counter-tasks
4. EXECUTE TASKS: Parallel where independent
5. UPDATE COVERAGE: Track metrics
6. CHECK 8 TERMINATION GATES
7. LOOP OR TERMINATE
```

---

## Core Philosophy: INSATIABLE CURIOSITY

Every finding triggers more questions. Every person gets investigated. Every source gets traced. Every contradiction gets explored. **Every claim from ALL sides gets fact-checked.**

```
DO NOT STOP EARLY.

Only stop when ALL 8 TERMINATION GATES pass:
  1. Coverage thresholds met
  2. No HIGH priority tasks pending
  3. Adversarial complete
  4. Rigor checkpoint passed (20 frameworks)
  5. Verification passed
  6. Quality checks passed
  7. All positions steelmanned
  8. No unexplored contradictions
```

---

## Rules Quick Reference

**See `framework/rules.md` for canonical rules.**

- **Sources**: `[S001]` format, append-only, every claim needs attribution
- **Evidence**: Capture immediately with `./scripts/capture`
- **Tasks**: 10 required perspectives + curiosity check per cycle
- **Coverage**: Track metrics in `_coverage.json`
- **Termination**: All 8 gates must pass
- **State ownership**: See `framework/rules.md`

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
11. **Generate curiosity tasks** — At least 2 per cycle
12. **Run adversarial pass** — Don't skip uncomfortable questions

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
| Canonical rules | `framework/rules.md` |
| Architecture | `framework/architecture.md` |
| Investigation | `.claude/commands/investigate.md` |
| Data sources | `framework/data-sources.md` |
