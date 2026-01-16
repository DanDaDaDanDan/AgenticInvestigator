# /verify - Check 7 Gates

Verify investigation readiness for publication.

## Usage

```
/verify              # Verify active case
/verify [case-id]    # Verify specific case
```

## The 7 Gates

| # | Gate | Pass Criteria |
|---|------|---------------|
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

## Output

Update `state.json` gates with results.

## Result

**ALL PASS:** "Verification: PASS - Ready for publication"

**ANY FAIL:** Return specific failures and what needs fixing.

## Next Steps

- If PASS: Investigation complete
- If FAIL: Route back to appropriate phase based on which gate failed
