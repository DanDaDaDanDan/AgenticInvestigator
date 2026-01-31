---
name: action
description: Router for all investigation operations with git commits
user-invocable: false
argument-hint: <command> [args...]
---

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

## Two-Repository System

This project has two independent git repositories:

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

Route to the specified skill. Skills with `context: fork` automatically handle isolation.

**Skills with automatic isolation (context: fork):**
- `/action plan-investigation <topic>` → invoke `/plan-investigation` (3 sequential steps)
- `/action research <topic>` → invoke `/research`
- `/action reconcile` → invoke `/reconcile`
- `/action curiosity` → invoke `/curiosity`
- `/action article` → invoke `/article`
- `/action verify` → invoke `/verify`
- `/action integrity` → invoke `/integrity`
- `/action legal-review` → invoke `/legal-review`
- `/action parallel-review` → invoke `/parallel-review`
- `/action merge-cases <case1> <case2> --topic "..."` → invoke `/merge-cases`

**Lightweight skills (no isolation needed):**
- `/action question <batch>` → invoke `/question`
- `/action follow <lead-id>` → invoke `/follow`
- `/action capture-source <url>` → invoke `/capture-source`

**Parallel processing commands:**
- `/action question-parallel` → spawn 5 parallel `/question` sub-agents
- `/action follow-batch <L001> <L002> ...` → spawn parallel `/follow` sub-agents

### Context Isolation (IMPORTANT)

**The Skill tool does NOT automatically fork.** You must manually dispatch heavy operations via the **Task tool** to prevent context bloat.

**Heavy operations → Use Task tool:**
```
Task(
  subagent_type="general-purpose",
  prompt="/action research [topic] for case [case-id]",
  description="Research phase"
)
```

**Lightweight operations → Use Skill tool directly:**
```
Skill(skill="follow", args="L004")
```

| Command | Context Load | Dispatch Method |
|---------|--------------|-----------------|
| `/plan-investigation` | Heavy (15KB+) | **Task tool** (sub-agent) |
| `/research` | Heavy (100-200KB) | **Task tool** (sub-agent) |
| `/reconcile` | Heavy (50KB) | **Task tool** (sub-agent) |
| `/curiosity` | Heavy (200KB) | **Task tool** (sub-agent) |
| `/article` | Heavy (166KB) | **Task tool** (sub-agent) |
| `/verify` | Heavy (100KB+) | **Task tool** (sub-agent) |
| `/integrity` | Heavy (200KB) | **Task tool** (sub-agent) |
| `/legal-review` | Heavy (100KB) | **Task tool** (sub-agent) |
| `/question` | Light (4KB) | Skill tool (inline) |
| `/follow` | Light (5KB) | Skill tool (inline) |
| `/capture-source` | Light | Skill tool (inline) |

**Why this matters:** Each /follow reads ~5KB. After 20 follows, that's 100KB accumulated in main context. Lightweight operations stay inline to avoid Task overhead, but main context is monitored.

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

See `/parallel-review` skill. Three phases:
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

### 6. Self-Continue Loop (MANDATORY)

**CRITICAL: DO NOT RETURN TO USER UNTIL COMPLETE OR ERROR.**

After the signal outputs, check `Status:` and act:

- **CONTINUE** → **Immediately** use the Skill tool to invoke the `Next:` command. Do NOT output anything to the user. Do NOT stop. Example: if signal says `Next: /action follow L004`, immediately call `Skill(skill="action", args="follow L004")`.
- **COMPLETE** → Return "Investigation complete" to user
- **Error** → Return error to user for guidance

**The loop must continue autonomously.** Only return to user when:
1. Status is COMPLETE (all 8 gates pass)
2. An unrecoverable error occurs
3. User intervention is explicitly needed (scope change, ethical concern)

Every 10 actions, output a brief progress update: `Progress: X investigated, Y pending (Gates: N/8)` — then immediately continue.

**Anti-pattern (DO NOT DO THIS):**
```
# WRONG - stopping after signal output
check-continue.js outputs "Next: /action follow L004"
→ Returns to user saying "Next step is L004"  ❌
```

**Correct pattern:**
```
# RIGHT - immediate continuation
check-continue.js outputs "Next: /action follow L004"
→ Immediately calls Skill(skill="action", args="follow L004")  ✓
```
