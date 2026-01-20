# /investigate - Main Entry Point

Start or resume an investigation.

## Usage

```
/investigate --new [topic]    # Start new investigation (REQUIRED for new cases)
/investigate                  # Resume active case
/investigate [case-id]        # Resume specific case
```

## --new Flag Requirement

Only `--new` creates a new case. All other invocations operate on existing cases only.

| Input | Behavior |
|-------|----------|
| `--new [topic]` | Creates new case via `init-case.js` |
| `[case-id]` | Resumes existing case (error if not found) |
| *(no args)* | Resumes case from `cases/.active` (error if no active case) |

## Two-Repository System

This project has **TWO independent git repositories**:
- **CODE repo** (root `.git`): Scripts, skills, reference docs
- **DATA repo** (`cases/.git`): ALL investigation case data

All investigation commits go to the **DATA repo** (`cases/.git`).

## Core Principle

**The orchestrator knows nothing about content.**

Read ONLY `state.json`. All work is done by sub-agents via `/action` router.

## The Orchestrator Loop

```
1. Read state.json
2. Dispatch /action based on phase
3. /action self-loops until COMPLETE or error
4. Only intervene if /action returns with an error
```

The `/action` skill handles continuation internally - you just start it.

## Workflow Phases

```
CREATE CASE → PLAN → BOOTSTRAP → QUESTION → FOLLOW → WRITE → VERIFY → COMPLETE
```

### CREATE CASE (requires --new)

Only create a case when `--new` is specified. Otherwise, return an error if no existing case is found.

1. Run `node scripts/init-case.js "[topic]"` - creates case structure with `phase: PLAN`
3. Case folder now exists at `cases/[topic-slug]/`
4. Script commits to **DATA repo** (`cases/.git`)
5. All subsequent work happens inside the case folder

### PLAN

1. Dispatch `/action plan-investigation "[topic]"` - runs 3 planning steps via sub-agents
   - Step 1: Prompt refinement (what are we REALLY asking?)
   - Step 2: Strategic research (landscape understanding)
   - Step 3: Investigation design (GPT 5.2 Pro with xhigh reasoning)
2. Outputs created directly in case folder: `refined_prompt.md`, `strategic_context.md`, `investigation_plan.md`, `custom_questions.md`
3. All commits go to the **DATA repo** (`cases/.git`)
4. After planning completes, update state.json: `phase: BOOTSTRAP`, `gates.planning: true`

### BOOTSTRAP

1. Dispatch `/action research "[topic]"` (guided by investigation_plan.md)
2. After research, update state.json phase to QUESTION

### QUESTION

Dispatch `/action question` for batches 1-5 (all 35 frameworks) + custom_questions.md from planning.
When all questions answered (including custom), update state.json: phase=FOLLOW, gates.questions=true

**Parallel option:** Use `/action question-parallel` to run all 5 batches concurrently (~5x faster).

### FOLLOW

1. Read `leads.json` for pending leads
2. Dispatch `/action follow L###` for leads (HIGH priority first, then MEDIUM)
3. When all leads are terminal (investigated or dead_end): dispatch `/action reconcile`
4. After reconciliation: dispatch `/action curiosity` to evaluate completeness
5. If NOT SATISFIED: continue investigating, follow new leads
6. If SATISFIED: update state.json: phase=WRITE, gates.curiosity=true, gates.reconciliation=true

**Parallel option:** Use `/action follow-batch L001 L002 L003 L004` to process 3-5 leads concurrently (~4x faster).
Use `node scripts/check-continue.js <case-path> --batch` to get batch recommendations.

### WRITE

Dispatch `/action article` to generate short.md and full.md.
Update state.json: phase=VERIFY, gates.article=true

### VERIFY

Dispatch `/action verify` to check all 8 gates.
- If ANY fail: fix issues, loop back
- If ALL pass: phase=COMPLETE

**Parallel option:** When Gate 5 passes and Gates 6+7 both need to run, use `/action parallel-review` to run integrity and legal reviews concurrently (~2x faster).

## Orchestrator Rules

1. Read only `state.json` and `leads.json`
2. Use `/action` router for all work
3. Let `/action` handle continuation (it self-loops)
4. Intervene only on errors or exceptions (API failures, contradictions, scope expansion, legal concerns)
