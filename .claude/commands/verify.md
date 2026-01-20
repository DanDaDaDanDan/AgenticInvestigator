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
| 5 | Sources | All [S###] citations captured, verified, and semantically support claims |
| 6 | Integrity | `/integrity` returns READY |
| 7 | Legal | `/legal-review` returns READY |

## MCP Tools for Verification

Gate 5 (Sources) requires **semantic verification** - checking that evidence actually supports claims. Consider using:

- `mcp__mcp-gemini__generate_text` for semantic claim-evidence matching
- `mcp__mcp-openai__generate_text` for complex judgment calls

This is about verifying that citations actually support what they're cited for, not just that they exist.

## Gate Details

### Gate 0: Planning
Verify investigation planning was completed:
- Check `state.json.gates.planning === true`
- Verify planning outputs exist in case directory: `refined_prompt.md`, `investigation_plan.md`
- If `custom_questions.md` exists, verify it was processed during QUESTION phase

**Note:** This gate is typically already passed by the time we reach VERIFY. It's checked for completeness.

### Gate 1: Questions
Check each `questions/*.md` file has Status: investigated or not-applicable.

### Gate 2: Curiosity
Invoke `/curiosity` if not already run this iteration.

### Gate 3: Reconciliation

Verify lead investigation results are reconciled with summary.md:

1. **Read leads.json** - extract all leads with status "investigated" or "dead_end"
2. **For each lead result that contradicts or caveats a summary.md claim:**
   - The summary.md claim MUST be updated or caveated
   - Example: If L016 found "PAC names don't exist in FEC records", summary.md cannot state those PACs as fact

**FAIL if:**
- Lead result contradicts summary.md claim without caveat
- Lead marked "dead_end" for a claim still stated as fact in summary.md
- Unverified claims (leads like "Verify X") still asserted without verification note

### Gate 4: Article
Verify:
- `articles/full.md` exists and contains [S###] citations
- `articles/full.pdf` exists (generated via `node scripts/generate-pdf.js`)
- `articles/short.md` and `short.pdf` exist (optional but expected)
- `articles/medium.md` and `medium.pdf` exist (optional but expected)

### Gate 5: Sources (Enhanced)

For each [S###] citation in summary.md and articles, verify:

**5a. Capture Verification (BLOCKING)**

Check sources.json for each cited source:
```json
{ "id": "S###", "captured": true }  // REQUIRED
```

**FAIL IMMEDIATELY if ANY cited source has:**
- `captured: false` in sources.json
- Missing entry in sources.json
- Empty or missing `evidence/S###/` directory
- No `metadata.json` in evidence folder

This is a HARD BLOCK. Do not proceed to 5b until all sources are captured.

**5b. Source Integrity (Fabrication Check)**

Check each evidence/S###/ folder:
```bash
ls evidence/S###/
```

**FAIL if:**
- content.md starts with "Research compilation..."
- URL in sources.json is a homepage, not specific article
- Timestamp is suspiciously round (e.g., `T20:00:00.000Z`)
- No `_capture_signature` in metadata.json

These indicate fabricated sources that must be deleted and re-captured properly.

**5c. Semantic Verification (Citation Supports Claim)**

For each `[claim text] [S###](url)` pattern:

1. Extract the specific claim being made
2. Read `evidence/S###/content.md`
3. Use LLM to verify: "Does this source support the specific claim: '[claim]'?"

**FAIL if:**
- Source doesn't mention the claimed fact
- Source contradicts the claim
- Statistic cited is different from statistic in source (e.g., "72%" cited but source says "52%")
- Claim is more certain than source supports

This catches **citation laundering** - attaching citations to claims they don't support.

**5d. Lead Results Source Coverage**

Check leads.json for investigated leads:
```json
{
  "status": "investigated",
  "result": "Contains specific claims or statistics",
  "sources": []  // FAIL - should have source IDs
}
```

**FAIL if:**
- Lead result contains specific numbers/statistics but `sources: []` is empty
- Lead result makes factual claims without captured evidence

**5e. Auto-removal (Last Resort)**

If source cannot be verified after attempting 5a-5d:
1. If fabricated → delete evidence/S###/ and remove from sources.json
2. Try re-capture (URL may have changed)
3. Search for alternate source (XAI real-time search)
4. If none found, remove citation and log to `removed-points.md`

### Gate 6: Integrity
Invoke `/integrity` if not already run.

### Gate 7: Legal
Invoke `/legal-review` if not already run.

### Gates 6+7: Parallel Review Optimization

When Gate 5 passes and both Gates 6 and 7 need to run, use `/parallel-review` for faster execution:

```
If gates.sources === true && gates.integrity === false && gates.legal === false:
  → Use /action parallel-review instead of sequential /integrity then /legal-review
```

This runs both reviews concurrently using the three-phase pattern:
1. Parallel Stage 1 (context-free scans)
2. Parallel Stage 2 (contextual evaluation)
3. Sequential fix application

See `/parallel-review` command for details.

## Output

Update `state.json` gates with results.

## Result

**ALL PASS:** Check if AI self-review is needed (see below)

**ANY FAIL:** Return specific failures and what needs fixing.

## AI Self-Review (First Iteration Only)

After all 8 gates pass for the first time, trigger an automatic AI review of the articles before declaring completion.

### When to Trigger

Check `state.json`:
- If `ai_review_complete` is missing or `false`: trigger self-review
- If `ai_review_complete` is `true`: skip to completion

### Self-Review Process

Use **GPT 5.2 Pro with extended thinking** for the self-review via `mcp__mcp-openai__generate_text`:

| Parameter | Value |
|-----------|-------|
| model | gpt-5.2-pro |
| reasoning_effort | high |
| max_output_tokens | 16384 |

1. **Read the full article** (`articles/full.md`)

2. **Call GPT 5.2 Pro** with the self-review prompt (see below)

3. **Parse the response** for substantive feedback

4. **If feedback is substantive:**
   - Set `state.json.ai_review_complete = true`
   - Invoke `/feedback` with the review findings
   - This triggers a revision cycle

5. **If article is publication-ready (no substantive feedback):**
   - Set `state.json.ai_review_complete = true`
   - Proceed to completion

### Self-Review Prompt Template

```
Review this investigative article as a senior editor. Identify:

1. CLARITY: Passages that are confusing or could be clearer
2. EVIDENCE: Claims that need stronger support or additional caveats
3. BALANCE: Missing perspectives or viewpoints that should be represented
4. STRUCTURE: Flow issues, awkward transitions, sections that feel unbalanced
5. GAPS: Questions a reader would reasonably have that aren't addressed
6. TONE: Areas where neutral tone slips into advocacy or excessive hedging

Be specific. For each issue, quote the problematic text and suggest improvement.

If the article is strong and ready for publication, say so explicitly.
```

### Why Only Once

The self-review runs once to catch obvious issues before human review. Running it repeatedly would create an infinite loop. After the AI-triggered revision, the human user can provide additional feedback via `/feedback` if needed.

## Next Steps

- If PASS + ai_review_complete: Investigation complete
- If PASS + needs self-review: Trigger AI review → /feedback cycle
- If FAIL: Route back to appropriate phase based on which gate failed
