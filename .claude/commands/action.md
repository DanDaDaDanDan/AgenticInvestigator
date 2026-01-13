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
- `/action research <topic>` → `/research`
- `/action question <batch>` → `/question`
- `/action follow <lead-id>` → `/follow`
- `/action curiosity` → `/curiosity`
- `/action capture-source <url>` → `/capture-source`
- `/action verify` → `/verify`
- `/action article` → `/article`
- `/action integrity` → `/integrity`
- `/action legal-review` → `/legal-review`

### 3. Git Commit

After action completes, commit within the **case repository**:
```bash
cd cases/<case-id>/
git add .
git commit -m "/<command>: <summary>"
```

### 4. Output Continuation Signal

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
Gates: 0/6 passing
───────────────────────────────────────────────────────
Status: → CONTINUE
Reason: Questions phase - answer framework questions
Next: /action question

DO NOT STOP. Execute the next action immediately.
═══════════════════════════════════════════════════════
```

The orchestrator MUST read this signal and execute the next action.
