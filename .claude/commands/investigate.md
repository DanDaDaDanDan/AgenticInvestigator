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

Read ONLY `state.json`. All research, analysis, and writing is done by sub-agents via `/action` router.

## Workflow

```
/investigate [topic]
      │
      ▼
┌─────────────────┐
│ BOOTSTRAP       │  /action research
│                 │  Capture sources, draft summary.md
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ QUESTION        │  /action question (5 batches)
│                 │  Answer all 35 frameworks
│                 │  Generate leads in leads.json
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ FOLLOW          │  /action follow (repeat per lead)
│                 │  Pursue each lead to conclusion
│     ◄───────────┤  /action curiosity → NOT SATISFIED
└────────┬────────┘
         │ /action curiosity → SATISFIED
         ▼
┌─────────────────┐
│ WRITE           │  /action article
│                 │  Generate short.md and full.md
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ VERIFY          │  /action verify (6 gates)
│                 │  /action integrity, /action legal-review
│     ◄───────────┤  Fails → back to FOLLOW
└────────┬────────┘
         │ All pass
         ▼
     COMPLETE
```

## Phase: BOOTSTRAP (New Cases Only)

For `--new` cases:

1. **Setup case structure:**
   ```bash
   node scripts/init-case.js "[topic]"
   ```
   Creates: state.json, questions/*.md (35 empty files), evidence/, articles/

2. **Initial research:**
   ```
   /action research "[topic]"
   ```
   Captures initial sources, drafts summary.md

3. **Update state:**
   ```json
   { "phase": "QUESTION" }
   ```

## Phase: QUESTION

Answer all 35 framework questions in 5 batches:

```
/action question 1   # Frameworks 1-7
/action question 2   # Frameworks 8-14
/action question 3   # Frameworks 15-20
/action question 4   # Frameworks 21-25
/action question 5   # Frameworks 26-35
```

Each batch:
- Reads frameworks from `_frameworks.md`
- Writes answers to `questions/NN-*.md`
- Captures sources as needed
- Generates leads in `leads.json`

When all 35 complete:
```json
{ "phase": "FOLLOW", "gates": { "questions": true } }
```

## Phase: FOLLOW

Pursue all leads to conclusion:

1. **Read leads.json** - Find pending leads
2. **For each HIGH priority lead:**
   ```
   /action follow L###
   ```
3. **For each MEDIUM priority lead:**
   ```
   /action follow L###
   ```
4. **Check curiosity:**
   ```
   /action curiosity
   ```
5. **If NOT SATISFIED:** Loop back to step 1
6. **If SATISFIED:**
   ```json
   { "phase": "WRITE", "gates": { "curiosity": true } }
   ```

## Phase: WRITE

Generate publication articles:

```
/action article
```

Creates:
- `articles/short.md` (400-800 words)
- `articles/full.md` (2000-4000 words)

When complete:
```json
{ "phase": "VERIFY", "gates": { "article": true } }
```

## Phase: VERIFY

Check all 6 gates:

```
/action verify
```

This invokes:
- Gate 1-3: Automatic checks
- Gate 4: Source verification (auto-removes failures)
- Gate 5: `/action integrity`
- Gate 6: `/action legal-review`

**If ANY gate fails:**
- Sources fail → Already auto-removed
- Integrity/Legal fail → Fix specific issues
- Questions/Curiosity fail → Back to FOLLOW phase

**If ALL gates pass:**
```json
{ "phase": "COMPLETE", "gates": { "questions": true, "curiosity": true, "article": true, "sources": true, "integrity": true, "legal": true } }
```

## Orchestrator Rules

1. **ONLY read** `state.json`
2. **NEVER** read content files (summary.md, findings, evidence)
3. **ALWAYS** use `/action` router for all operations
4. **NEVER** do research or analysis directly
5. **CONTINUE** autonomously until all gates pass
6. **Git commits** happen automatically via `/action` router

## State.json (Only File Orchestrator Reads)

```json
{
  "case": "topic-slug",
  "topic": "Full topic description",
  "phase": "QUESTION",
  "iteration": 2,
  "next_source": 48,
  "gates": {
    "questions": false,
    "curiosity": false,
    "article": false,
    "sources": false,
    "integrity": false,
    "legal": false
  }
}
```

## TodoWrite Integration

Track progress with Claude's built-in todo:

```
Investigation: [case-id]
├── [x] BOOTSTRAP: Case setup
├── [x] BOOTSTRAP: Initial research
├── [x] QUESTION: Batch 1 (frameworks 1-7)
├── [x] QUESTION: Batch 2 (frameworks 8-14)
├── [in_progress] QUESTION: Batch 3 (frameworks 15-20)
├── [ ] QUESTION: Batch 4 (frameworks 21-25)
├── [ ] QUESTION: Batch 5 (frameworks 26-35)
├── [ ] FOLLOW: Pursue leads
├── [ ] CURIOSITY: Verify completeness
├── [ ] WRITE: Generate articles
├── [ ] VERIFY: 6 gates
└── [ ] COMPLETE
```

## Autonomous Continuation

**Continue until ALL 6 gates pass.**

Do NOT ask the user:
- "Would you like me to continue?"
- "Should I fix this?"
- "8/9 gates passing, what next?"

DO:
- Read state.json
- Dispatch appropriate `/action` command
- Loop until complete

**Only pause for:**
- External API failures
- Irreconcilable contradictions needing human judgment
- Scope expansion requiring approval
- Legal/ethical concerns

## Example Session

```
User: /investigate --new "egg labeling practices"

Orchestrator:
1. node scripts/init-case.js "egg labeling practices"
   → Creates cases/egg-labeling-practices/

2. /action research "egg labeling practices"
   → [git commit: research complete]

3. Reads state.json: phase = QUESTION

4. /action question 1
   → [git commit: frameworks 1-7 complete]

5. /action question 2
   → [git commit: frameworks 8-14 complete]

... continues through all phases ...

N. /action verify
   → All 6 gates PASS

"Investigation complete. Ready for publication."
```
