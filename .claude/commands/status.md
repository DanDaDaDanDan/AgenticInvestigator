# Case Status

Display the current status of AgenticInvestigator investigations.

---

## USAGE

```
/status              # Show status of active case
/status [case-id]    # Show status of specific case
/status --list       # List all cases
```

---

## PROCEDURE

### 1. Determine Which Case

**If `--list` flag**: List all cases in `cases/` directory with basic info.

**If case-id provided**: Use `cases/[case-id]/`

**If no argument**: Read `cases/.active` to get current case.

### 2. Gather Status Information

Read from the case directory:

1. `summary.md` - Case metadata, key findings, verification score
2. `iterations.md` - Progress log, verification checkpoints, gaps
3. `sources.md` - Source count (check last source ID)

Extract:
- Case ID and topic (from summary.md header)
- Current iteration number (from iterations.md)
- Verification score (from summary.md header)
- Status (IN PROGRESS / SATURATED / COMPLETE)
- Last verification checkpoint results (from iterations.md)
- Open gaps (from iterations.md)
- Total sources (last [SXXX] ID in sources.md)

### 3. Display Status

```markdown
# Case Status: [case-id]

**Topic**: [from summary.md header]
**Status**: [IN PROGRESS (Iteration N) | SATURATED | COMPLETE]
**Verification Score**: [X]/100
**Last Updated**: [datetime]

## Progress Summary

| Metric | Value |
|--------|-------|
| Iterations completed | N |
| Total sources | N |
| People investigated | N |
| Claims fact-checked | N |
| Verification checkpoints | N |
| Last verification score | X/100 |

## Termination Checklist

- [ ] iteration >= 10
- [ ] verification_score >= 90
- [ ] no unexplored threads
- [ ] prosecution case complete
- [ ] defense case complete
- [ ] conspiracy theories addressed
- [ ] all accusations fact-checked

## Last Verification Checkpoint

**Iteration**: N
**Score**: X/100
**Verdict**: PASS/FAIL

### Gaps (if any):
1. [Gap]
2. [Gap]

## Next Steps

[Based on status and gaps]
```

### 4. Recommendations

Based on status, suggest next action:

| Situation | Recommendation |
|-----------|----------------|
| Investigation incomplete | "Continue with `/investigate`" |
| Verification score < 90 | "Address gaps, then re-verify with `/verify`" |
| All conditions met | "Investigation complete. Final review recommended." |
| No active case | "Start new investigation with `/investigate --new`" |

---

## UTILITY FUNCTIONS

### Set Active Case

To change the active case:
```bash
echo "[case-id]" > cases/.active
```

### List All Cases

```bash
ls -la cases/
```

### Archive a Case

To archive a completed case:
```bash
mkdir -p cases/archive
mv cases/[case-id] cases/archive/
```

---

## EXAMPLE OUTPUT

```markdown
# Case Status: inv-20260105-143022

**Topic**: Corporate Fraud Investigation
**Status**: IN PROGRESS (Iteration 12)
**Verification Score**: 72/100
**Last Updated**: 2026-01-05 16:45

## Progress Summary

| Metric | Value |
|--------|-------|
| Iterations completed | 12 |
| Total sources | 67 |
| People investigated | 23 |
| Claims fact-checked | 47 |
| Verification checkpoints | 2 |
| Last verification score | 72/100 |

## Termination Checklist

- [x] iteration >= 10
- [ ] verification_score >= 90
- [x] no unexplored threads
- [x] prosecution case complete
- [ ] defense case complete
- [ ] conspiracy theories addressed
- [x] all accusations fact-checked

## Last Verification Checkpoint

**Iteration**: 10
**Score**: 72/100
**Verdict**: FAIL

### Gaps:
1. Defense argument about prior board approval - unverified
2. Coverup conspiracy theory - not fully debunked
3. Whistleblower claims about timeline - needs investigation

## Next Steps

Address 3 gaps identified in verification checkpoint. Defense case needs strengthening. Run `/investigate` to continue.
```
