# /verify - Check 6 Gates

Verify investigation readiness for publication.

## Usage

```
/verify              # Verify active case
/verify [case-id]    # Verify specific case
```

## The 6 Gates

| # | Gate | Pass Criteria |
|---|------|---------------|
| 1 | Questions | All `questions/*.md` have Status: investigated (or not-applicable) |
| 2 | Curiosity | `/curiosity` returns SATISFIED |
| 3 | Article | `articles/full.md` exists with [S###] citations |
| 4 | Sources | All [S###] citations have evidence and support the claim |
| 5 | Integrity | `/integrity` returns READY |
| 6 | Legal | `/legal-review` returns READY |

## Gate Details

### Gate 1: Questions
Check each `questions/*.md` file has Status: investigated or not-applicable.

### Gate 2: Curiosity
Invoke `/curiosity` if not already run this iteration.

### Gate 3: Article
Verify `articles/full.md` exists and contains [S###] citations.

### Gate 4: Sources
For each [S###] citation in summary.md and articles:
- Evidence exists in `evidence/S###/`
- Content supports the claim

**Auto-removal:** If source cannot be verified, try re-capture, then search for alternate. If none found, remove citation and log to `removed-points.md`.

### Gate 5: Integrity
Invoke `/integrity` if not already run.

### Gate 6: Legal
Invoke `/legal-review` if not already run.

## Output

Update `state.json` gates with results.

## Result

**ALL PASS:** "Verification: PASS - Ready for publication"

**ANY FAIL:** Return specific failures and what needs fixing.

## Next Steps

- If PASS: Investigation complete
- If FAIL: Route back to appropriate phase based on which gate failed
