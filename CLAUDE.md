# AgenticInvestigator - Claude Instructions

Behavioral rules for Claude Code operating in this project.

**Canonical sources:** `framework/rules.md` (rules) | `framework/architecture.md` (schemas, workflow)

---

## Core Invariant

**The orchestrator believes only two things:**

1. The filesystem (captured evidence, task files, findings files)
2. The verifier outputs (`control/gaps.json`)

Nothing else. No self-reported completion. No "feels done."

---

## The Loop: VERIFY -> PLAN -> EXECUTE

```
+-----------------------------+
| 0) VERIFY                   |
|    node scripts/generate-gaps.js    |
+--------------+--------------+
               | produces
               v
+-----------------------------+
| control/gaps.json          |
+--------------+--------------+
               | drives
               v
+-----------------------------+
| 1) PLAN                     |
|    gaps -> R### tasks        |
|    + A### adversarial       |
|    + T### investigation     |
+--------------+--------------+
               |
               v
+-----------------------------+
| 2) EXECUTE                  |
|    capture evidence         |
|    update claims            |
|    write findings           |
+--------------+--------------+
               |
               v
       (back to VERIFY)
```

**Termination:** `control/gaps.json.blocking` empty AND `node scripts/verify-all-gates.js` exits 0.
**Orchestrator-friendly summary:** `node scripts/orchestrator-verify.js cases/[case-id]`

---

## Commands

| Command | Purpose |
|---------|---------|
| `/investigate --new [topic]` | Start new investigation |
| `/investigate [case-id]` | Resume case |
| `/verify` | Run verification |
| `/integrity` | Journalistic integrity check |
| `/legal-review` | Legal risk assessment |
| `/article` | Generate articles |

---

## Orchestrator Pattern

**Main instance ONLY orchestrates. Sub-agents do all work.**

### Orchestrator CAN Read

- `state.json` - Minimal state (10 lines)
- `control/gaps.json` - Current gaps (THE input for decisions)
- `control/digest.json` - Iteration summary
- `control/gate_results.json` - Gate status
- `claims/index.json` - Claim rollup
- `tasks/*.json` - Status fields only

### Orchestrator CANNOT Read

- `findings/*.md` - Too large
- `research-leads/*.md` - Not citable
- `evidence/` - Raw content
- `summary.md` - Except existence check

### Orchestrator Responsibilities

1. Run `node scripts/generate-gaps.js` at start of each iteration
2. Read `gaps.json.blocking` to determine actions
3. Dispatch sub-agents with prompts from `.claude/commands/prompts/`
4. Track progress via TodoWrite (Claude Code todo list)
5. Run `node scripts/verify-all-gates.js` to check termination

### Orchestrator MUST NOT

- Call MCP tools directly
- Reason about investigation completeness
- Make substantive claims about findings
- Skip skills by "combining" them
- Self-report gate passage

---

## Sub-Agent Delegation

| Agent Type | Responsibility | Prompt Template |
|------------|----------------|-----------------|
| Research | Gather information | `prompts/research-agent.md` |
| Extraction | Parse and structure | `prompts/extraction-agent.md` |
| Task generation | Create tasks from gaps | `prompts/task-gen-agent.md` |
| Execution | Investigate tasks | `prompts/execution-agent.md` |
| Adversarial | Find blind spots | `prompts/adversarial-agent.md` |
| Synthesis | Write final report | `prompts/synthesis-agent.md` |

---

## Context Minimalism

**Prevent context explosion in orchestrator and sub-agents.**

### Sub-Agents (EXCEPT Synthesis) Read ONLY:

- `state.json` - 10 lines max
- `tasks/[assigned].json` - Their task
- `claims/[relevant].json` - Claims being updated
- `control/gaps.json` - To understand what's needed

### Sub-Agents MUST NOT Read:

- `findings/*.md` - Other outputs
- `research-leads/*.md` - Raw research
- Full `summary.md`

**Exception:** Synthesis agent reads all files for integration.

---

## Core Rules

1. **CAPTURE BEFORE CITE** - No `[SXXX]` without `evidence/web/SXXX/`
2. **EVERY FACT NEEDS A SOURCE** - Every factual statement in `summary.md` MUST have `[SXXX]` citation
3. **Question-shaped tasks** - Not topics, but questions with evidence requirements
4. **Corroboration is data** - Claims have explicit evidence bundles in `claims/`
5. **Gaps drive tasks** - Tasks generated from `gaps.json`, not generic exploration
6. **Continuous verification** - Legal/integrity run every iteration, not end-of-run
7. **Steelman ALL positions** - Strongest version of EVERY side
8. **Document uncertainty** - "We don't know" is valid
9. **Detect circular reporting** - Multiple outlets citing same source = 1 source

### Two-Phase Verification Architecture

Verification happens in two phases:

**Phase 1: Structural (Scripts)**
- Zero `[SXXX]` citations in summary.md (automatic FAIL)
- Missing required files (automatic FAIL)
- Missing evidence for cited sources (automatic FAIL)

**Phase 2: Semantic (Gemini 3 Pro MCP)**
- Every factual claim has citation (LLM judgment)
- No unmitigated legal risks (LLM judgment)
- No unprotected PII (LLM with context understanding)
- Balanced and fair coverage (LLM judgment)

Structural checks run via `node scripts/verify-all-gates.js`.
Semantic checks run via `mcp__mcp-gemini__generate_text` with `model: "gemini-3-pro"`.

See `.claude/commands/verify.md` for full verification flow.

---

## Parallel Agent Safety

**Each file has exactly ONE writer.**

```
CORRECT (parallel OK):
+-- Agent 1 -> findings/T001-findings.md
+-- Agent 2 -> findings/T002-findings.md
+-- Agent 3 -> findings/T003-findings.md

WRONG (race condition):
+-- Agent 1 -> summary.md  NO
+-- Agent 2 -> summary.md  NO
```

---

## Task Management (TodoWrite)

Use Claude Code's built-in TodoWrite for tracking:

```
Investigation: [case-id] - Iteration N
+-- [x] Run node scripts/generate-gaps.js
+-- [x] Review blocking gaps (3 found)
+-- [in_progress] Execute R001 - corroboration gap
+-- [ ] Execute R002 - missing evidence
+-- [ ] Execute T015 - timeline question
+-- [ ] Run verification check
+-- [ ] Check termination gates
+-- [ ] Synthesis (if gates pass)
```

Update TodoWrite at each phase transition.

---

## Gap-Driven Workflow

### Every Iteration:

1. **VERIFY:** `node scripts/generate-gaps.js cases/[case-id]`
2. **READ:** `control/gaps.json` - blocking gaps drive all work
3. **PLAN:** Create R### tasks for blocking gaps
4. **EXECUTE:** Dispatch agents for pending tasks
5. **VERIFY AGAIN:** Back to step 1

### Gap Types

| Type | Severity | Action |
|------|----------|--------|
| `MISSING_EVIDENCE` | BLOCKER | Capture source |
| `INSUFFICIENT_CORROBORATION` | BLOCKER | Find more sources |
| `CONTENT_MISMATCH` | BLOCKER | Fix claim or find evidence |
| `LEGAL_WORDING_RISK` | HIGH | Revise language |
| `PERSPECTIVE_MISSING` | MEDIUM | Create task |
| `ADVERSARIAL_INCOMPLETE` | MEDIUM | Run adversarial pass |

---

## 9 Termination Gates

**ALL must pass to terminate.**

| Gate | What's Checked |
|------|----------------|
| 1. Coverage | Required files exist |
| 2. Tasks | All HIGH priority completed |
| 3. Adversarial | A### tasks exist and completed |
| 4. Sources | Evidence for all [SXXX] |
| 5. Content | Claims found in evidence |
| 6. Corroboration | Claims meet thresholds |
| 7. Contradictions | All explored |
| 8. Rigor | 35 frameworks addressed |
| 9. Legal | No blocking legal gaps |

```bash
# Run before synthesis
node scripts/verify-all-gates.js cases/[case-id]
# Exit 0 = can terminate
# Exit 1 = must continue
```

---

## Required Skills

Before marking COMPLETE, invoke these skills:

| Skill | Required Output |
|-------|-----------------|
| `/verify` | Verification checkpoint |
| `/integrity` | Journalistic integrity |
| `/legal-review` | Legal review file |
| `/article` | Articles (if requested) |

**Do NOT combine or substitute skills.**

---

## Ledger System

All actions logged via `ledger-append.js`:

```bash
node scripts/ledger-append.js <case> iteration_start --iteration N
node scripts/ledger-append.js <case> task_create --task R001 --gap G0001
node scripts/ledger-append.js <case> source_capture --source S001 --url "..."
node scripts/ledger-append.js <case> claim_update --claim C0042 --sources S001,S002
node scripts/ledger-append.js <case> task_complete --task R001 --output findings/R001.md
```

---

## MCP Quick Reference

| Need | Server | Tool | Model |
|------|--------|------|-------|
| **Semantic verification** | mcp-gemini | `generate_text` | `gemini-3-pro` |
| Deep research (fast) | mcp-gemini | `deep_research` | - |
| Deep research (max) | mcp-openai | `deep_research` | - |
| Real-time search | mcp-xai | `research`, `x_search` | - |
| Cross-model critique | mcp-gemini | `generate_text` | `gemini-3-pro` |

**Semantic verification** (legal risk, PII, citation coverage, balance) MUST use Gemini 3 Pro.

---

## Document Sync

When modifying system behavior, update:

| File | Update When |
|------|-------------|
| `framework/rules.md` | Rules change |
| `framework/architecture.md` | Schemas, workflow |
| `CLAUDE.md` | Behavioral guidance |
| `README.md` | User-facing docs |

---

## Quick Reference

| Topic | Canonical Source |
|-------|------------------|
| The Loop | `framework/rules.md` |
| Gap schema | `framework/architecture.md` |
| Claim schema | `framework/architecture.md` |
| Task schema | `framework/architecture.md` |
| Termination gates (9) | `framework/rules.md` |
| Agent prompts | `.claude/commands/prompts/` |
| Investigation procedure | `.claude/commands/investigate.md` |

---

## Anti-Gaming Rules

- Do NOT skip verification
- Do NOT claim saturation to avoid iterations
- Do NOT cherry-pick claims to check
- Do NOT ignore alternative theories
- Do NOT give benefit of the doubt on gaps
- Do NOT accept ANY metric below 100%
- Do NOT "document gaps" instead of fixing them
- Do NOT cite without captured evidence
- Do NOT self-report gate passage
