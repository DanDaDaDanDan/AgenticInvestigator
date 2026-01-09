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

### Auto-Invoked by /investigate (agentic flow)
| Command | When Triggered |
|---------|----------------|
| `/questions` | Iteration 1, every 4th iteration, when stuck, entering finale |
| `/financial` | When financial entities or money-related claims detected |
| `/verify` | Verification phase + finale loop |
| `/integrity` | Finale loop step 3 |
| `/legal-review` | Finale loop step 4 |
| `/article` | End of finale (all checks passed) |

### Manual Diagnostics
| Command | Purpose |
|---------|---------|
| `/status` | Check investigation progress |

---

## Investigation Finale

**The finale is a loop.** Addressing issues requires re-verification.

```
FINALE LOOP (entry: verification_passed && gaps.length == 0)

1. /questions   → Late-stage adversarial frameworks
                  If critical new questions → back to INVESTIGATION LOOP

2. /verify      → Full verification
                  If FAILS → back to INVESTIGATION LOOP

3. /integrity   → Journalistic integrity check
                  If MAJOR issues → address → go to step 2

4. /legal-review → Legal risk assessment
                   If HIGH risks → address → go to step 2

5. ALL CLEAR    → /article (generate articles)
```

**Why loop?** Fixing legal/integrity issues may introduce new unverified claims.

---

## /questions Integration

Run `/questions` at key points to prevent tunnel vision:

| Trigger | Frameworks |
|---------|------------|
| `iteration == 1` | Early: Core (Money, Silence, Timeline, Documents, Contradictions, Relationships) |
| `iteration % 4 == 0` | Mid: Add ACH, Assumptions, Patterns, Meta, 5 Whys |
| Verification fails with unclear gaps | Stuck: Pre-Mortem, Bias Check, Uncomfortable Questions |
| Entering finale | Late: Counterfactual, Pre-Mortem, Cognitive Bias, Second-Order |

---

## /financial Integration

Auto-invoke `/financial` when triggers detected in _extraction.json:

| Trigger | Investigation Focus |
|---------|---------------------|
| Entity type: `corporation` | SEC filings, ownership chains, contracts |
| Entity type: `nonprofit/foundation` | 990 analysis, compensation, related parties |
| Entity type: `PAC` | FEC filings, donor analysis, expenditures |
| Claims involving money/funding/contracts/fraud | Financial verification, money trails |
| "Follow the Money" questions generated | Full financial toolkit |

**Why auto-invoke?** "Follow the Money" is framework #1. Financial angles are critical but easy to skip.

---

## OSINT Source Knowledge

Investigation agents embed OSINT source knowledge directly (no manual /osint command).

| Entity Type | Sources Checked |
|-------------|-----------------|
| Person | OpenCorporates, courts, OpenSanctions, ICIJ, campaign finance |
| Corporation | SEC EDGAR, State SOS, OpenCorporates, USAspending, courts |
| Nonprofit | ProPublica 990s, Candid, IRS, state charity registration |
| Government | USAspending, GAO/OIG reports, FOIA libraries |

Full source reference: `framework/data-sources.md`

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

**See `framework/rules.md` for canonical rules.**

- **Sources**: `[S001]` format, append-only, every claim needs attribution
- **Evidence**: Capture immediately with `./scripts/capture`
- **Verification**: 6-item checklist, all must be YES
- **Termination**: `verification_passed && gaps.length == 0`
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
