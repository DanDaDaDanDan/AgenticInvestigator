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

## Protocol

For EVERY action:

### 1. Execute Command

Route to the specified command:
- `/action research <topic>` → Execute `/research`
- `/action question <batch>` → Execute `/question`
- `/action follow <lead-id>` → Execute `/follow`
- `/action curiosity` → Execute `/curiosity`
- `/action capture-source <url>` → Execute `/capture-source`
- `/action verify` → Execute `/verify`
- `/action article` → Execute `/article`
- `/action integrity` → Execute `/integrity`
- `/action legal-review` → Execute `/legal-review`

### 2. Git Commit

After action completes:

```bash
git add cases/<case-id>/
git commit -m "[<case-id>] /<command>: <summary>"
```

**Commit message format:**
```
[case-slug] /command: Brief summary of what changed

Files: N changed
```

### 3. Return to Orchestrator

Report:
- Command executed
- Success/failure
- Files changed
- Commit hash

## Error Handling

- If action fails: DO NOT commit, return error
- If git commit fails: Log warning, continue (non-blocking)

## Examples

```
/action research "egg labeling practices"
→ Executes /research
→ Commits: "[egg-labeling] /research: Initial research, 12 sources captured"

/action question 1
→ Executes /question for batch 1 (frameworks 1-7)
→ Commits: "[egg-labeling] /question: Batch 1 complete (frameworks 1-7)"

/action follow L007
→ Executes /follow for lead L007
→ Commits: "[egg-labeling] /follow: L007 investigated, 3 new sources"
```

## Orchestrator Pattern

The orchestrator ONLY calls `/action`:
```
/action research "topic"
/action question 1
/action question 2
...
/action follow L001
/action curiosity
/action article
/action verify
```

Git history becomes the complete audit ledger.
