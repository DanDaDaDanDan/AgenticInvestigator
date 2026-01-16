# /action - Router with Git

Route all actions through git commits for full audit trail.

## Usage

```
/action <command> [args...]
```

## Purpose

Every investigation action flows through `/action` to ensure:
1. Git commits after each action (audit trail)
2. Consistent logging
3. Clean orchestrator pattern
4. **Continuation signal for autonomous operation**

## Protocol

### 1. Determine Case Path

Find the active case directory (most recent in `cases/`).

### 2. Execute Command

Route to the specified command:
- `/action plan-investigation <topic>` → `/plan-investigation` (**via sub-agents** - 3 sequential steps)
- `/action research <topic>` → `/research` (**via sub-agent**)
- `/action question <batch>` → `/question`
- `/action follow <lead-id>` → `/follow`
- `/action reconcile` → `/reconcile` (**via sub-agent**)
- `/action curiosity` → `/curiosity` (**via sub-agent**)
- `/action capture-source <url>` → `/capture-source`
- `/action verify` → `/verify` (**via sub-agent**)
- `/action article` → `/article` (**via sub-agent**)
- `/action integrity` → `/integrity` (**via sub-agent**)
- `/action legal-review` → `/legal-review` (**via sub-agent**)

### Context Isolation for Heavy Reads

Commands marked **via sub-agent** read large amounts of files (~200KB+). Use Task tool to isolate:

| Command | Reads | Why Sub-Agent |
|---------|-------|---------------|
| `/plan-investigation` | deep_research + 35 frameworks (~15KB for Step 3) | 3 sequential sub-agents, GPT 5.2 Pro for design |
| `/research` | deep_research results + captured sources (~100-200KB) | Heavy MCP calls, source capture |
| `/reconcile` | summary + leads + sources (~50KB) | Cross-reference all findings |
| `/curiosity` | 35 files + leads + summary + sources (~200KB) | Full investigation context |
| `/article` | summary + 35 question files (~166KB) | Needs framework context |
| `/verify` | article + all cited evidence (~100KB+) | Evidence files are large |
| `/integrity` | article + summary + 35 questions + sources (~200KB) | Perspective coverage |
| `/legal-review` | article + sources + evidence (~100KB) | Legal requires full context |

**Dispatch pattern:**
```
Task (subagent_type: "general-purpose")
  prompt: "Execute /curiosity for case [path]. Read all files, call external models, return only verdict."
```

Sub-agent returns structured result. Main context stays clean.

### 3. Post-Processing

**After `/article` completes**, generate PDFs:
```bash
node scripts/generate-pdf.js cases/<case-id>/
```
This creates `articles/short.pdf` and `articles/full.pdf` with publication-ready typography.

### 4. Git Commit

After action (and post-processing) completes, commit changes to the case repository:

```bash
cd cases/<case-id>/
git add .
git commit -m "/<command>: <summary>"
```

All phases (including PLAN) commit to the case repo since the case is created first.

### 5. Output Continuation Signal

**CRITICAL:** After every action, run the gate checker and output its result:

```bash
node scripts/check-continue.js cases/<case-id>/
```

This outputs the ORCHESTRATOR SIGNAL that tells the orchestrator what to do next.

## Error Handling

- If action fails: DO NOT commit, return error with continuation signal
- If git commit fails: Log warning, continue (non-blocking)

## Example Output

After successful action:

```
Action: /research completed
Commit: abc123
Files: summary.md, evidence/S001/*, sources.json

═══════════════════════════════════════════════════════
ORCHESTRATOR SIGNAL
═══════════════════════════════════════════════════════
Case: topic-slug
Phase: QUESTION
Iteration: 1
Gates: 0/8 passing
───────────────────────────────────────────────────────
Status: → CONTINUE
Reason: Questions phase - answer framework questions
Next: /action question

DO NOT STOP. Execute the next action immediately.
═══════════════════════════════════════════════════════
```

The orchestrator MUST read this signal and execute the next action.
