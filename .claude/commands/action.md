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

### 1. Execute Command

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

### 2. Git Commit

After action completes:
```
git add cases/<case-id>/
git commit -m "[<case-id>] /<command>: <summary>"
```

### 3. Return to Orchestrator

Report: command executed, success/failure, files changed, commit hash.

## Error Handling

- If action fails: DO NOT commit, return error
- If git commit fails: Log warning, continue (non-blocking)
