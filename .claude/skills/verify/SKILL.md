---
name: verify
description: Check all 8 gates for investigation readiness
context: fork
agent: general-purpose
user-invocable: false
argument-hint: [case-id]
---

# /verify - Check 8 Gates

Verify investigation readiness for publication.

## Usage

```
/verify              # Verify active case
/verify [case-id]    # Verify specific case
```

## The 8 Gates

| # | Gate | Pass Criteria |
|---|------|---------------|
| 0 | Planning | Investigation strategy designed (`state.json.gates.planning === true`) |
| 1 | Questions | All `questions/*.md` have Status: investigated (or not-applicable) |
| 2 | Curiosity | `/curiosity` returns SATISFIED |
| 3 | Reconciliation | All lead results reconciled with summary.md |
| 4 | Article | `articles/full.md` + `full.pdf` exist with [S###] citations |
| 5 | Sources | **Claim Registry Verification** - Match article claims to registry |
| 6 | Integrity | `/integrity` returns READY |
| 7 | Legal | `/legal-review` returns READY |

## Gate Details

### Gate 0: Planning
Verify investigation planning was completed:
- Check `state.json.gates.planning === true`
- Verify planning outputs exist: `refined_prompt.md`, `investigation_plan.md`

### Gate 1: Questions
Check each `questions/*.md` file has Status: investigated or not-applicable.

### Gate 2: Curiosity
Invoke `/curiosity` if not already run this iteration.

### Gate 3: Reconciliation
Verify lead results are reconciled with summary.md:
- Lead results that contradict summary.md claims must be updated
- Unverified claims must have caveats

### Gate 4: Article
Verify:
- `articles/full.md` exists with [S###] citations
- `articles/full.pdf` exists
- Sources Consulted section lists uncited sources

### Gate 5: Sources - Claim Registry Verification

**Run claim-based verification:**

```bash
node scripts/claims/verify-article.js cases/<case-id>/ --fix
```

This matches every factual claim in the article against the claim registry.

#### How It Works

1. **Extract claims from article** - Finds sentences with citations
2. **Match to registry** - Multiple strategies:
   - Exact text match
   - Number matching (same statistics)
   - Keyword overlap
   - Source-constrained matching
3. **Report results** - Verified, unverified, or mismatched

#### Verification States

| Status | Meaning | Action |
|--------|---------|--------|
| VERIFIED | Claim matched registry entry from cited source | None |
| UNVERIFIED | No matching claim in registry | Find source or remove claim |
| SOURCE_MISMATCH | Claim found but from different source | Update citation |

#### Handling Unverified Claims

For each unverified claim:

1. **Search for supporting source:**
   ```
   mcp__mcp-xai__research or mcp__mcp-osint__osint_search
   ```

2. **Capture source** (which extracts and registers claims):
   ```
   /capture-source <url>
   ```

3. **Re-run verification** - Newly registered claims should match

4. **If no source found:**
   - Add caveat ("reportedly", "according to...")
   - Or remove the claim

#### Pre-requisite: Claim Registry Populated

Before running verification, ensure claims have been extracted from sources:

```bash
# Check status
node scripts/claims/migrate-sources.js cases/<case-id> status

# Generate extraction prompt for one source
node scripts/claims/capture-integration.js cases/<case-id> prepare S001

# Send prompt to LLM (Gemini 3 Pro recommended)
mcp__mcp-gemini__generate_text prompt=<extraction_prompt> model=gemini-3-pro

# Register extracted claims
node scripts/claims/migrate-sources.js cases/<case-id> register S001 response.json
```

#### Outputs

- `claim-verification.json` - Structured verification results
- `claim-verification-report.md` - Human-readable report with fix suggestions

### Gate 6: Integrity
Invoke `/integrity` if not already run.

### Gate 7: Legal
Invoke `/legal-review` if not already run.

### Gates 6+7: Parallel Review Optimization

When Gate 5 passes and both Gates 6 and 7 need to run:
```
/action parallel-review
```

## Output

Update `state.json` gates with results.

## Result

**ALL PASS:** Check if AI self-review is needed

**ANY FAIL:** Return specific failures and fixes

## AI Self-Review (First Iteration Only)

After all 8 gates pass for the first time, trigger automatic AI review.

### When to Trigger

Check `state.json`:
- If `ai_review_complete` is missing or `false`: trigger self-review
- If `ai_review_complete` is `true`: skip to completion

### Self-Review Process

Use **GPT 5.2 Pro** via `mcp__mcp-openai__generate_text`:

| Parameter | Value |
|-----------|-------|
| model | gpt-5.2-pro |
| reasoning_effort | high |
| max_output_tokens | 16384 |

Prompt:
```
Review this investigative article as a senior editor. Identify:

1. CLARITY: Passages that are confusing
2. EVIDENCE: Claims needing stronger support
3. BALANCE: Missing perspectives
4. STRUCTURE: Flow issues
5. GAPS: Unanswered questions
6. TONE: Advocacy or excessive hedging

Be specific. Quote problematic text and suggest improvements.
If the article is ready for publication, say so explicitly.
```

### After Self-Review

- **If feedback:** Set `ai_review_complete = true`, invoke `/case-feedback`
- **If no feedback:** Set `ai_review_complete = true`, complete

## Next Steps

- If PASS + ai_review_complete: Investigation complete
- If PASS + needs self-review: AI review → /case-feedback
- If FAIL: Route to appropriate phase based on which gate failed
