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

## Workflow

```
BOOTSTRAP → QUESTION → FOLLOW → WRITE → VERIFY → COMPLETE
```

### BOOTSTRAP (New Cases)

1. Run `node scripts/init-case.js "[topic]"`
2. `/action research "[topic]"`
3. Set phase: QUESTION

### QUESTION

Run `/action question` for batches 1-5 (all 35 frameworks).
When complete, set phase: FOLLOW, gates.questions: true

### FOLLOW

1. Read `leads.json` for pending leads
2. `/action follow L###` for each HIGH then MEDIUM priority
3. `/action curiosity` to check completeness
4. If NOT SATISFIED: loop back
5. If SATISFIED: set phase: WRITE, gates.curiosity: true

### WRITE

Run `/action article` to generate short.md and full.md.
Set phase: VERIFY, gates.article: true

### VERIFY

Run `/action verify` to check all 6 gates.
- If ANY fail: route back to appropriate phase
- If ALL pass: set phase: COMPLETE

## Orchestrator Rules

1. **ONLY read** `state.json`
2. **NEVER** read content files directly
3. **ALWAYS** use `/action` router
4. **CONTINUE** autonomously until all gates pass
5. Git commits happen automatically via `/action`

## Autonomous Continuation

**Continue until ALL 6 gates pass.**

Only pause for:
- External API failures
- Irreconcilable contradictions needing human judgment
- Scope expansion requiring approval
- Legal/ethical concerns
