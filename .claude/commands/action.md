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

## ⚠️ CRITICAL: Two-Repository System

This project has **TWO independent git repositories**:

| Repository | Location | Contains |
|------------|----------|----------|
| **CODE** | Root `.git` | Scripts, skills, reference, CLAUDE.md |
| **DATA** | `cases/.git` | ALL investigation case data |

**All `/action` commits go to the DATA repository (`cases/.git`).**

To commit to cases repo from project root:
```bash
git -C cases add -A
git -C cases commit -m "[case-slug] /command: summary"
```

## Protocol

### 1. Determine Case Path

Find the active case directory (read `cases/.active` or most recent in `cases/`).

### 2. Execute Command

Route to the specified command:
- `/action plan-investigation <topic>` → `/plan-investigation` (**via sub-agents** - 3 sequential steps)
- `/action research <topic>` → `/research` (**via sub-agent**)
- `/action question <batch>` → `/question`
- `/action question-parallel` → `/question` (all 5 batches in parallel, **via sub-agents**)
- `/action follow <lead-id>` → `/follow`
- `/action follow-batch <L001> <L002> ...` → Multiple `/follow` in parallel (**via sub-agents**)
- `/action reconcile` → `/reconcile` (**via sub-agent**)
- `/action curiosity` → `/curiosity` (**via sub-agent**)
- `/action capture-source <url>` → `/capture-source`
- `/action verify` → `/verify` (**via sub-agent**)
- `/action article` → `/article` (**via sub-agent**)
- `/action integrity` → `/integrity` (**via sub-agent**)
- `/action legal-review` → `/legal-review` (**via sub-agent**)
- `/action parallel-review` → `/integrity` + `/legal-review` in parallel (**via sub-agents**)

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

### Parallel Processing Commands

#### `/action follow-batch L001 L002 L003 L004`

1. `node scripts/leads-lock.js batch-claim <case> L001 L002 L003 L004`
2. `node scripts/allocate-sources.js allocate <case> 48 <batch-id>`
3. Spawn parallel Task agents for each lead with `--source-range` and `--batch-id`
4. `node scripts/merge-batch-results.js <case> <batch-id> <results-json>`
5. Single git commit: `[case-id] /follow-batch: L001 L002 L003 L004`

#### `/action question-parallel`

1. Allocate: 100 source IDs + 50 lead IDs per batch
2. Spawn 5 parallel Tasks: `/question N --parallel --source-start X --source-end Y`
3. `node scripts/merge-question-batches.js <case>`
4. Run batch 6 (custom_questions.md) if exists

#### `/action parallel-review`

See `/parallel-review` command. Three phases:
1. Parallel Stage 1: context-free scans (integrity + legal)
2. Parallel Stage 2: contextual evaluation with flags
3. Sequential: merge fixes, detect conflicts, apply/ESCALATE

### 3. Post-Processing

**After `/article` completes**, generate PDFs:
```bash
node scripts/generate-pdf.js cases/<case-id>/
```
This creates `articles/short.pdf`, `articles/medium.pdf`, and `articles/full.pdf`.

### 4. Git Commit (DATA Repository)

After action (and post-processing) completes, commit changes to the **DATA repository** (`cases/.git`):

```bash
# From project root - commit to cases repo
git -C cases add -A
git -C cases commit -m "[<case-id>] /<command>: <summary>"
```

**⚠️ Do NOT commit case data to the root repository** - it is gitignored there.

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
