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
| `/article` | summary + 35 question files (~166KB) | GPT 5.2 Pro × 3 parallel calls, up to 60 min each |
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
This creates `articles/short.pdf`, `articles/medium.pdf`, and `articles/full.pdf`.

### 4. Git Commit

After action (and post-processing) completes, commit changes to the case repository:

```bash
cd cases/<case-id>/
git add .
git commit -m "/<command>: <summary>"
```

All phases (including PLAN) commit to the case repo since the case is created first.

### 5. Output Continuation Signal

After every action, run:

```bash
node scripts/check-continue.js cases/<case-id>/
```

This outputs the ORCHESTRATOR SIGNAL with `Status:` and `Next:` fields.

## Error Handling

- Action fails → return error (no commit)
- Git commit fails → log warning, continue

### 6. Self-Continue Loop

After the signal outputs, check `Status:` and act:

- **CONTINUE** → Invoke the `Next:` command immediately, then repeat from step 5
- **COMPLETE** → Return "Investigation complete" to user
- **Error** → Return error to user for guidance

Every 10 actions, output: `Progress: X investigated, Y pending (Gates: N/8)`
