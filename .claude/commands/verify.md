# /verify - Check 6 Gates

Verify investigation readiness for publication.

## Usage

```
/verify              # Verify active case
/verify [case-id]    # Verify specific case
```

## The 6 Gates

| # | Gate | Check | Pass Criteria |
|---|------|-------|---------------|
| 1 | Questions | All `questions/*.md` | Status: investigated (or not-applicable) |
| 2 | Curiosity | `/curiosity` judgment | Verdict: SATISFIED |
| 3 | Article | `articles/full.md` | Exists with [S###] citations |
| 4 | Sources | Evidence verification | All [S###] verified or auto-removed |
| 5 | Integrity | `/integrity` review | Status: READY |
| 6 | Legal | `/legal-review` | Status: READY |

## Verification Flow

### Gate 1: Questions Check

Read each `questions/*.md` file. Check **Status:** field.

```
35/35 frameworks have Status: investigated → PASS
Any framework has Status: pending → FAIL
```

### Gate 2: Curiosity Check

Invoke `/curiosity` if not already run this iteration.

```
Verdict: SATISFIED → PASS
Verdict: NOT SATISFIED → FAIL (returns list of outstanding leads)
```

### Gate 3: Article Check

```bash
# Check if article exists and has citations
ls articles/full.md  # Must exist
grep -c '\[S[0-9]\+\]' articles/full.md  # Must have citations
```

### Gate 4: Sources Check

For each [S###] citation in `summary.md` and `articles/*.md`:

1. **Evidence exists?** `evidence/S###/metadata.json` present
2. **Content supports claim?** Use Gemini to verify claim appears in evidence
3. **Source still accessible?** Check URL not 404

**Auto-removal flow:**
- If source cannot be verified, try `/capture-source` to re-capture
- If still fails, search for alternate source
- If no alternate found:
  - Remove citation from summary.md and articles
  - Log to `removed-points.md`
  - Continue verification

### Gate 5: Integrity Check

Invoke `/integrity` if not already run.

```
Status: READY → PASS
Status: READY WITH CHANGES → FAIL (but specific fixes needed)
Status: NOT READY → FAIL
```

### Gate 6: Legal Check

Invoke `/legal-review` if not already run.

```
Status: READY → PASS
Status: READY WITH CHANGES → FAIL (but specific fixes needed)
Status: NOT READY → FAIL
```

## Output

Update `state.json` with gate results:

```json
{
  "gates": {
    "questions": true,
    "curiosity": true,
    "article": true,
    "sources": true,
    "integrity": true,
    "legal": true
  }
}
```

## Result

**ALL PASS:** Return "Verification: PASS - Ready for publication"

**ANY FAIL:** Return specific failures:
```
Verification: FAIL
- Gate 1 (Questions): 32/35 complete
- Gate 4 (Sources): S089 unverifiable, removed
- Gate 5 (Integrity): Needs balance improvement
```

## Next Steps

- If PASS: Investigation complete
- If FAIL: Orchestrator routes back to appropriate phase:
  - Questions fail → `/action question`
  - Curiosity fail → `/action follow`
  - Article fail → `/action article`
  - Sources fail → Already handled by auto-removal
  - Integrity/Legal fail → Address specific issues

## Semantic Verification (Gate 4)

Use Gemini 3 Pro for semantic source verification:

```
mcp__mcp-gemini__generate_text
  model: "gemini-3-pro"
  prompt: |
    Verify this claim appears in the source content:

    CLAIM: "[text citing S###]"

    SOURCE CONTENT:
    [content from evidence/S###/content.md]

    Does the source support this claim? Answer: VERIFIED | NOT FOUND | CONTRADICTS
```
