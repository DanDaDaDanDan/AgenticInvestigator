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

1. `summary.md` - Case metadata, key findings
2. `iterations.md` - Progress log, verification checkpoints, gaps
3. `sources.md` - Source count (check last source ID)

Extract:
- Case ID and topic (from summary.md header)
- Current iteration number (from iterations.md)
- Status (IN PROGRESS / SATURATED / COMPLETE)
- Last verification checkpoint results (from iterations.md)
- Open gaps (from iterations.md)
- Total sources (last [SXXX] ID in sources.md)

### 3. Display Status

```markdown
# Case Status: [case-id]

**Topic**: [from summary.md header]
**Status**: [IN PROGRESS (Iteration N) | SATURATED | COMPLETE]
**Last Updated**: [datetime]

## Progress Summary

| Metric | Value |
|--------|-------|
| Iterations completed | N |
| Total sources | N |
| Positions documented | N |
| People investigated | N |
| Claims fact-checked | N |
| Verification checkpoints | N |

## Termination Checklist

- [ ] no unexplored threads
- [ ] all positions documented
- [ ] alternative theories addressed
- [ ] all major claims fact-checked
- [ ] verification checklist passed

## Last Verification Checkpoint

**Iteration**: N
**Verdict**: PASS/FAIL

### Checklist Status:
| Category | Status |
|----------|--------|
| All people investigated | YES/PARTIAL/NO |
| Claims categorized by position | YES/PARTIAL/NO |
| All positions documented | YES/PARTIAL/NO |
| Alternative theories addressed | YES/PARTIAL/NO |

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
| Verification gaps exist | "Address gaps, then re-verify with `/verify`" |
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
**Last Updated**: 2026-01-05 16:45

## Progress Summary

| Metric | Value |
|--------|-------|
| Iterations completed | 12 |
| Total sources | 67 |
| Positions documented | 4 |
| People investigated | 23 |
| Claims fact-checked | 47 |
| Verification checkpoints | 2 |

## Termination Checklist

- [x] no unexplored threads
- [ ] all positions documented
- [ ] alternative theories addressed
- [x] all major claims fact-checked
- [ ] verification checklist passed

## Last Verification Checkpoint

**Iteration**: 10
**Verdict**: FAIL

### Checklist Status:
| Category | Status |
|----------|--------|
| All people investigated | YES |
| Claims categorized by position | PARTIAL |
| All positions documented | NO |
| Alternative theories addressed | NO |

### Gaps:
1. Position 3 (regulatory oversight) - arguments underdeveloped
2. Alternative theory about prior board approval - unverified
3. Coverup theory - not investigated with evidence
4. Whistleblower claims about timeline - needs investigation

## Next Steps

Address 4 gaps identified in verification checkpoint. Position 3 needs strengthening. Alternative theories need investigation with evidence. Run `/investigate` to continue.
```
