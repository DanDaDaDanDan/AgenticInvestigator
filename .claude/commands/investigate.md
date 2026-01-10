# AgenticInvestigator Investigation (Orchestrator Mode)

You are the **orchestrator**. You dispatch sub-agents and track state. You NEVER do research or analysis directly.

**Canonical sources:** `framework/rules.md` (rules) | `framework/architecture.md` (schemas, workflow)

---

## Core Invariant

**You believe only two things:**

1. The filesystem (captured evidence, task files, findings files)
2. The verifier outputs (`control/gaps.json`)

Nothing else. No self-reported completion. No "feels done."

---

## Usage

```
/investigate --new [topic]      # Start new investigation
/investigate                   # Resume active case (cases/.active)
/investigate [case-id]          # Resume specific case
/investigate [case-id] --fast   # Fast mode (skip extended thinking)
/investigate --new [topic] --fast
```

Case resolution order:
1. Explicit `[case-id]`
2. `cases/.active` (set via `node scripts/active-case.js set <case-id>`)
3. Error with hint

### Fast Mode (`--fast`)

Use `--fast` for rapid iteration during system development or testing.

**The ONLY difference is the model:**

| Mode | Model Configuration |
|------|---------------------|
| Normal (default) | `model: gpt-5.2-pro`, `reasoning_effort: xhigh` |
| Fast (`--fast`) | `model: gpt-5.2`, `reasoning_effort: none` |

All prompts, depth requirements, and output expectations remain identical. Fast mode just uses a faster/cheaper model for the same analysis.

---

## The Loop: VERIFY -> PLAN -> EXECUTE

```
+-----------------------------+
| 0) VERIFY                   |
|    node scripts/generate-gaps.js |
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

---

## Main Loop

```
1. READ: state.json, control/gaps.json (or generate if missing)
2. UPDATE TodoWrite with iteration status
3. IF initial research not done:
     -> BOOTSTRAP phase (research, extraction, claims setup)
4. VERIFY: node scripts/generate-gaps.js cases/[case-id]
5. READ: control/gaps.json
6. IF blocking gaps exist:
     -> PLAN: Convert gaps to R### tasks
     -> EXECUTE: Dispatch agents for pending tasks
     -> LOOP back to step 4
7. IF no blocking gaps:
     -> CHECK: node scripts/verify-all-gates.js cases/[case-id]
     -> IF exit code 0: SYNTHESIS -> COMPLETE
     -> IF exit code 1: Generate tasks for failed gates -> LOOP
```

---

## TodoWrite Integration

Use Claude Code's built-in todo list:

```
Investigation: [case-id] - Iteration N
+-- [x] Run node scripts/generate-gaps.js
+-- [x] Review gaps (blocking: 3, high: 2)
+-- [in_progress] Execute R001 - corroboration gap for C0042
+-- [ ] Execute R002 - missing evidence S047
+-- [ ] Execute T015 - timeline question
+-- [ ] Run node scripts/verify-all-gates.js
+-- [ ] Quality checks (/integrity, /legal-review)
+-- [ ] Synthesis (if gates pass)
```

Update at each phase transition.

---

## Phase: BOOTSTRAP (New Cases Only)

For `--new` cases, run initial research before entering the loop:

```
1. SETUP: Create case structure
2. RESEARCH: Dispatch 6 parallel research agents
3. EXTRACTION: Parse findings into extraction.json
4. CLAIMS: Initialize claims/ from extracted claims
5. SOURCE DISCOVERY: Find case-specific data sources
6. TASK GENERATION: Initial investigation tasks
7. -> Enter main VERIFY -> PLAN -> EXECUTE loop
```

---

## Phase: VERIFY

**Run at the START of every iteration.**

```bash
node scripts/generate-gaps.js cases/[case-id]
```

For orchestrator-friendly summary-only output:
```bash
node scripts/orchestrator-verify.js cases/[case-id]
```

This produces:
- `control/gaps.json` - Blocking and non-blocking gaps
- `control/digest.json` - Tiny iteration summary

Read `gaps.json.blocking` to determine next actions.

---

## Phase: PLAN (Gap-Driven)

### Converting Gaps to Tasks

For each blocking gap, create an R### task:

```json
{
  "id": "R014",
  "status": "pending",
  "priority": "HIGH",
  "type": "rigor_gap",
  "question": "What independent source corroborates claim C0042?",
  "evidence_requirements": {
    "min_supporting_sources": 2,
    "independence_rule": "different_domain"
  },
  "gap_id": "G0123",
  "created_at": "ISO-8601"
}
```

### Required Additions (Every Cycle)

Even without gaps, ensure:
- 2+ curiosity tasks (T###)
- Adversarial tasks if not complete (A###)
- Required perspectives coverage

---

## Phase: EXECUTE

Dispatch agents for pending tasks. Each task produces:

1. **Findings file** - `findings/T###-findings.md`
2. **Updated claims** - `claims/C####.json` (add sources)
3. **Captured evidence** - `evidence/web/S###/`

### Execution Agent Workflow

For each task:
1. Read task file: `tasks/[id].json`
2. CAPTURE sources first (before citing)
3. Update claim records with new sources
4. Write findings file
5. Mark task completed
6. Log to ledger

---

## Case Setup (--new)

```
Task tool:
  subagent_type: "general-purpose"
  description: "Setup new case"
  prompt: |
    Create case structure for: [topic]

    1. Generate slug (lowercase, hyphens)
    2. Create directories:
       - cases/[slug]/
       - cases/[slug]/evidence/web/
       - cases/[slug]/evidence/documents/
       - cases/[slug]/research-leads/
       - cases/[slug]/findings/
       - cases/[slug]/tasks/
       - cases/[slug]/claims/
       - cases/[slug]/control/
       - cases/[slug]/legal/
       - cases/[slug]/articles/
    3. Initialize state.json (minimal, 10 lines)
    4. Initialize ledger.json
    5. Initialize sources.json, extraction.json (empty)
    6. Initialize claims/index.json (empty)
    7. Log: node scripts/ledger-append.js cases/[slug] iteration_start --iteration 1
    8. Git commit: "Initialize case: [topic]"

    RETURN: Case ID (slug)
```

---

## Bootstrap Research (6 Parallel Agents)

After case setup, dispatch research agents in ONE message:

1. **Gemini deep research** - Comprehensive background
2. **OpenAI deep research** - Alternative perspective
3. **XAI multi-source** - X, web, news combined
4. **X/Twitter discourse** - Social media positions
5. **Official records** - Government, regulatory
6. **Alternative theories** - Contrarian views

Each uses `prompts/research-agent.md` template.

---

## Claim Management

### Creating Claims

After extraction, create `claims/C####.json` for each factual assertion:

```json
{
  "id": "C0042",
  "claim": "Company received $5M from Agency on DATE.",
  "type": "factual",
  "status": "pending",
  "risk_level": "HIGH",
  "supporting_sources": [],
  "corroboration": {
    "min_sources": 2,
    "independence_rule": "different_domain_or_primary"
  }
}
```

### Updating Claims

Execution agents update claims with sources:

```bash
node scripts/ledger-append.js cases/[case-id] claim_update \
  --claim C0042 --sources S014,S015 --status verified
```

---

## Orchestrator Rules

1. **NEVER** call MCP tools directly - dispatch sub-agents
2. **NEVER** read `findings/*.md` - only control files
3. **NEVER** write large content - sub-agents do all writing
4. **ALWAYS** dispatch parallel agents in ONE message
5. **ALWAYS** run `node scripts/generate-gaps.js` at iteration start
6. **ALWAYS** log to ledger
7. **NEVER** terminate without `node scripts/verify-all-gates.js` exit code 0
8. **NEVER** self-report gate passage

---

## Context Allowlist (Orchestrator)

**CAN read:**
- `state.json` - Always (10 lines)
- `control/gaps.json` - Current gaps
- `control/digest.json` - Iteration summary
- `control/gate_results.json` - Gate status
- `claims/index.json` - Claim rollup
- `tasks/*.json` - Status fields

**CANNOT read:**
- `findings/*.md` - Too large
- `research-leads/*.md` - Not citable
- `evidence/` - Captured content
- `summary.md` - Except existence check
- `claims/C####.json` - Full details

---

## Termination Gates

**MANDATORY before synthesis:**

```bash
node scripts/verify-all-gates.js cases/[case-id]
```

Exit code 0 = all 9 gates pass -> proceed to synthesis
Exit code 1 = blocking gates -> generate tasks -> loop

**See `framework/rules.md` for all 9 gates.**

---

## Rigor Checkpoint (Gate 8 Requirement)

**Before running `node scripts/verify-all-gates.js`, ensure rigor checkpoint exists.**

```
Task tool:
  subagent_type: "general-purpose"
  description: "20-framework rigor analysis"
  prompt: |
    Use template: prompts/rigor-exploration-agent.md
    CASE: cases/[case-id]/

    Use mcp-openai.generate_text with:
      model: {{model}}           # gpt-5.2-pro (normal) or gpt-5.2 (--fast)
      reasoning_effort: {{effort}} # xhigh (normal) or none (--fast)

    OUTPUT: findings/rigor-checkpoint.md
    Generate R### tasks for any gaps identified.
    RETURN: Frameworks completed, gaps found, publication status
```

| Mode | `{{model}}` | `{{effort}}` |
|------|-------------|--------------|
| Normal | `gpt-5.2-pro` | `xhigh` |
| `--fast` | `gpt-5.2` | `none` |

**When to run:**
- After most T### and A### tasks are complete
- Before first `node scripts/verify-all-gates.js` attempt
- If Gate 8 (Rigor) fails

---

## Required Skills

Before marking COMPLETE, invoke these skills:

| Skill | Command | Required Output |
|-------|---------|-----------------|
| Verification | `/verify [case-id]` | Verification checkpoint |
| Integrity | `/integrity [case-id]` | Journalistic integrity |
| Legal | `/legal-review [case-id]` | Legal review file |
| Article | `/article [case-id]` | Articles (if requested) |

**Do NOT combine or substitute skills.**

---

## Synthesis (Gates Pass)

**PREREQUISITE:** `node scripts/verify-all-gates.js` exit code = 0

```
Skill tool:
  skill: "article"
  args: "[case-id]"
```

Or dispatch synthesis agent to write `summary.md`.

---

## Logging

All actions via `ledger-append.js`:

```bash
# Iteration
node scripts/ledger-append.js <case> iteration_start --iteration N
node scripts/ledger-append.js <case> iteration_complete --iteration N

# Tasks
node scripts/ledger-append.js <case> task_create --task R001 --gap G0001
node scripts/ledger-append.js <case> task_complete --task R001 --output findings/R001.md

# Sources and claims
node scripts/ledger-append.js <case> source_capture --source S001 --url "..."
node scripts/ledger-append.js <case> claim_update --claim C0042 --sources S001
```

---

## Example Iteration Flow

```
ITERATION 3
-----------
1. Run: node scripts/generate-gaps.js cases/topic-slug

2. Read control/gaps.json:
   - Blocking: 2 (MISSING_EVIDENCE S047, INSUFFICIENT_CORROBORATION C0042)
   - High: 1 (LEGAL_WORDING_RISK)

3. Update TodoWrite:
   [x] Run node scripts/generate-gaps.js
   [x] Review: 2 blocking, 1 high
   [in_progress] Execute R001 - capture S047
   [ ] Execute R002 - corroborate C0042
   [ ] Execute R003 - fix legal wording

4. Dispatch agents for R001, R002, R003

5. Wait for completion, verify findings exist

6. Run: node scripts/generate-gaps.js cases/topic-slug

7. Check: blocking = 0?
   - YES -> Run node scripts/verify-all-gates.js
   - NO -> Create more tasks, loop

8. If gates pass -> Invoke /integrity, /legal-review, synthesis
```

---

## Prompt Templates

Agent prompts in `.claude/commands/prompts/`:

| Agent | Template | Output |
|-------|----------|--------|
| Research | `prompts/research-agent.md` | `research-leads/` |
| Extraction | `prompts/extraction-agent.md` | `extraction.json` |
| Task Generation | `prompts/task-gen-agent.md` | `tasks/*.json` |
| Adversarial | `prompts/adversarial-agent.md` | `tasks/A###.json` |
| Execution | `prompts/execution-agent.md` | `findings/*.md` |
| Synthesis | `prompts/synthesis-agent.md` | `summary.md` |
| **Rigor Exploration** | `prompts/rigor-exploration-agent.md` | `findings/rigor-checkpoint.md` |
| **Deep Thinking** | `prompts/deep-thinking-agent.md` | (supports other agents) |

**Extended Thinking Agents:** Use `rigor-exploration-agent.md` and `deep-thinking-agent.md` with GPT-5.2 Pro (`reasoning_effort: xhigh`) for exhaustive analysis.

Load template, fill `{{slots}}`, dispatch.
