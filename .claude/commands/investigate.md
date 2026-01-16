# /investigate - Main Entry Point

Start or resume an investigation.

## Usage

```
/investigate --new [topic]    # Start new investigation
/investigate                  # Resume active case
/investigate [case-id]        # Resume specific case
```

## Core Principle

**The orchestrator knows nothing about content.**

Read ONLY `state.json`. All work is done by sub-agents via `/action` router.

## The Orchestrator Loop

**THIS IS A LOOP. DO NOT STOP AFTER ONE ACTION.**

```
┌─────────────────────────────────────────────────────┐
│  ORCHESTRATOR LOOP                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Read state.json                                 │
│  2. Dispatch /action based on phase                 │
│  3. /action outputs ORCHESTRATOR SIGNAL             │
│  4. Read the signal:                                │
│     - If CONTINUE → Go to step 1                    │
│     - If COMPLETE → Stop                            │
│                                                     │
│  REPEAT UNTIL COMPLETE                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**When you see "Status: → CONTINUE" in the output, you MUST immediately execute the next action. Do not wait for user input.**

## Workflow Phases

```
PLAN → BOOTSTRAP → QUESTION → FOLLOW → WRITE → VERIFY → COMPLETE
```

### PLAN (New Cases Only)

1. Dispatch `/action plan-investigation "[topic]"` - runs 3 planning steps via sub-agents
   - Step 1: Prompt refinement (what are we REALLY asking?)
   - Step 2: Strategic research (landscape understanding)
   - Step 3: Investigation design (GPT 5.2 Pro with xhigh reasoning)
2. Outputs created: `refined_prompt.md`, `strategic_context.md`, `investigation_plan.md`, `custom_questions.md`
3. After planning completes, update state.json phase to BOOTSTRAP

### BOOTSTRAP

1. Run `node scripts/init-case.js "[topic]"` - creates case structure, git repo, and initial commit
2. Planning outputs are copied into the case directory
3. Dispatch `/action research "[topic]"` (guided by investigation_plan.md)
4. After research, update state.json phase to QUESTION

### QUESTION

Dispatch `/action question` for batches 1-5 (all 35 frameworks) + custom_questions.md from planning.
When all questions answered (including custom), update state.json: phase=FOLLOW, gates.questions=true

### FOLLOW

1. Read `leads.json` for pending leads
2. Dispatch `/action follow L###` for leads (HIGH priority first, then MEDIUM)
3. When leads are investigated: dispatch `/action curiosity` to evaluate completeness
4. If NOT SATISFIED: continue investigating, follow new leads
5. If SATISFIED: update state.json: phase=WRITE, gates.curiosity=true

### WRITE

Dispatch `/action article` to generate short.md and full.md.
Update state.json: phase=VERIFY, gates.article=true

### VERIFY

Dispatch `/action verify` to check all 8 gates.
- If ANY fail: fix issues, loop back
- If ALL pass: phase=COMPLETE

## Continuation Protocol

After EVERY `/action` call, you will see an ORCHESTRATOR SIGNAL like:

```
═══════════════════════════════════════════════════════
ORCHESTRATOR SIGNAL
═══════════════════════════════════════════════════════
Status: → CONTINUE
Next: /action question
DO NOT STOP. Execute the next action immediately.
═══════════════════════════════════════════════════════
```

**Your response to this signal:**

| Signal | Your Action |
|--------|-------------|
| `Status: → CONTINUE` | Immediately dispatch the next `/action` |
| `Status: ✓ COMPLETE` | Report completion to user |

## Orchestrator Rules

1. **ONLY read** `state.json` and `leads.json`
2. **NEVER** read content files (summary.md, questions/*, evidence/*)
3. **ALWAYS** use `/action` router for all work
4. **ALWAYS** continue when signal says CONTINUE
5. **ONLY STOP** when signal says COMPLETE

## When to Pause (Exceptions Only)

- External API failures (retry first)
- Irreconcilable contradictions needing human judgment
- Scope expansion requiring approval
- Legal/ethical concerns

**DO NOT pause to ask "should I continue?" - the signal tells you.**
