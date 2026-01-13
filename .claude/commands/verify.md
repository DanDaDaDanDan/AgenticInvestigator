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

## MCP Tools for Verification

Gate 4 (Sources) requires **semantic verification** - checking that evidence actually supports claims. Consider using:

- `mcp__mcp-gemini__generate_text` for semantic claim-evidence matching
- `mcp__mcp-openai__generate_text` for complex judgment calls

This is about verifying that citations actually support what they're cited for, not just that they exist.

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
- **Content semantically supports the claim** (use LLM verification)

This is the most important gate. A citation is only valid if the source actually says what we claim it says.

**Auto-removal:** If source cannot be verified:
1. Try re-capture (URL may have changed)
2. Search for alternate source (XAI real-time search)
3. If none found, remove citation and log to `removed-points.md`

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
