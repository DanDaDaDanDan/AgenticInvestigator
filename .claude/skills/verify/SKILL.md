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
| 5 | Sources | **Unified Verification Pipeline** - 5-step verification with audit trail |
| 6 | Integrity | `/integrity` returns READY |
| 7 | Legal | `/legal-review` returns READY |

## Gate Details

### Gate 0: Planning
Verify investigation planning was completed:
- Check `state.json.gates.planning === true`
- Verify planning outputs exist in case directory: `refined_prompt.md`, `investigation_plan.md`
- If `custom_questions.md` exists, verify it was processed during QUESTION phase

**Note:** This gate is typically already passed by the time we reach VERIFY.

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
- `articles/full.md` has **Sources Consulted** section listing uncited sources from `sources.json`
- `articles/full.pdf` exists (generated via `node scripts/generate-pdf.js`)
- `articles/short.md` and `short.pdf` exist (optional but expected)
- `articles/medium.md` and `medium.pdf` exist (optional but expected)

**Sources Consulted Check:**
1. Read `sources.json` to get total captured source count
2. Count [S###] markers in full.md's "Sources Cited" section
3. Verify "Sources Consulted" section exists and lists remaining sources
4. **FAIL if:** Sources Consulted section is missing or empty when uncited sources exist

### Gate 5: Sources - Unified Verification Pipeline

**Run the unified 5-step verification pipeline:**

```bash
node scripts/verification/index.js cases/<case-id>/ --generate-report --block
```

This runs all verification steps in sequence with cryptographic chain hash:

#### Step 1: CAPTURE
Verifies each cited source has:
- Entry in sources.json with `captured: true`
- `evidence/S###/` directory exists
- `metadata.json` is valid
- `content.md` is not empty

#### Step 2: INTEGRITY
Hash verification and red flag detection:
- `_capture_signature` present in metadata.json
- Hash matches computed hash (content not tampered)
- No fabrication patterns (round timestamps, homepage URLs, "compilation" content)

#### Step 3: BINDING (CRITICAL NEW STEP)
**Three-way URL consistency check:**

This step catches citation laundering where the URL in the article differs from what was captured:

| Location | URL Must Match |
|----------|---------------|
| Article citation | `[S001](https://example.com/article)` |
| sources.json | `"url": "https://example.com/article"` |
| metadata.json | `"url": "https://example.com/article"` |

After URL normalization (removing www, trailing slashes, etc), ALL THREE must match.

**ANY mismatch is a BLOCKING failure** - it means the citation may point to a different resource than what was captured.

#### Step 4: SEMANTIC
Claim-evidence verification using two tiers:
- Tier 1: Fast heuristics (statistics in source, key terms present)
- Tier 2: LLM prompts generated for claims failing heuristics

Updates `evidence/S###/claim-support.json` with verification results.

#### Step 5: STATISTICS
Number matching verification:
- Extracts percentages, dollar amounts, counts with citations
- Searches cited source for exact numbers
- Flags mismatches (e.g., article says 72% but source says 52%)

**Outputs:**
- `verification-state.json` - Complete pipeline state with chain hash
- `verification-report.md` - Human-readable report with actionable fixes

**Blocking Criteria:**
- ANY source not captured (Step 1)
- ANY URL mismatch (Step 3) - Maximum: 0
- ANY orphan citation (Step 3) - Maximum: 0
- >10% claims unsupported (Step 4)
- ANY statistic mismatch (Step 5)

**If Pipeline Fails:**

1. Read `verification-report.md` for specific issues and fix suggestions
2. For URL mismatches: Update article citations OR re-capture sources
3. For missing sources: Run `/capture-source` with the correct URL
4. For unsupported claims: Find supporting source or caveat the claim
5. Re-run verification after fixes

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
   - Invoke `/case-feedback` with the review findings
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

The self-review runs once to catch obvious issues before human review. Running it repeatedly would create an infinite loop. After the AI-triggered revision, the human user can provide additional feedback via `/case-feedback` if needed.

## Next Steps

- If PASS + ai_review_complete: Investigation complete
- If PASS + needs self-review: Trigger AI review → /case-feedback cycle
- If FAIL: Route back to appropriate phase based on which gate failed
