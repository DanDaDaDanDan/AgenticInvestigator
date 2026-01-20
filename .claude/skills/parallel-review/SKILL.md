---
name: parallel-review
description: Run integrity and legal reviews in parallel
context: fork
agent: general-purpose
user-invocable: false
argument-hint: [case-id]
---

# /parallel-review - Parallel Integrity and Legal Review

Run integrity and legal reviews in parallel.

## Usage

```
/parallel-review              # Review active case
/parallel-review [case-id]    # Review specific case
```

## Prerequisites

Gate 5 (Sources) must pass before running.

## Three-Phase Pattern

### Phase 1: Parallel Context-Free Scans

Spawn two parallel sub-agents:

```
Task: "/integrity --stage-1-only [case-path]"
      Read ONLY articles/full.md. Return flags JSON.

Task: "/legal-review --stage-1-only [case-path]"
      Read ONLY articles/full.md. Return flags JSON.
```

### Phase 2: Parallel Contextual Evaluation

With flags from Phase 1:

```
Task: "/integrity --stage-2-only [case-path] --flags [flags-json]"
      Evaluate against evidence. Return resolutions JSON.

Task: "/legal-review --stage-2-only [case-path] --flags [flags-json]"
      Evaluate against evidence. Return resolutions JSON.
```

### Phase 3: Merge and Apply

In main orchestrator:

1. **Collect** resolutions from both agents
2. **Detect conflicts** - overlapping text fixes
3. **Apply** non-conflicting fixes to `articles/full.md`
4. **ESCALATE** conflicting fixes for human review
5. **Write** `integrity-review.md` and `legal-review.md`
6. **Update** `state.json` gates

## Conflict Handling

| Type | Resolution |
|------|------------|
| Identical fix | Apply once |
| Complementary | Merge (e.g., add citation + rephrase) |
| Incompatible | ESCALATE - do not apply |

## Error Recovery

If one review fails:
- Save successful result to `state.json.parallel_review`
- Retry only failed review
- Continue Phase 3 when both complete

## Output

- `integrity-review.md` - Integrity review results
- `legal-review.md` - Legal review results
- `articles/full.md` - With fixes applied
- `state.json` - Gates 6+7 updated
