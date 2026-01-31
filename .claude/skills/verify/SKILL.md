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

## The 8 Gates (Process Gates 0-7)

This skill checks the 8 process gates. Quality gates (8-10) are checked separately in AI self-review.

| # | Gate | Pass Criteria |
|---|------|---------------|
| 0 | Planning | Investigation strategy designed (`state.json.gates.planning === true`) |
| 1 | Questions | All `questions/*.md` have Status: investigated (or not-applicable) |
| 2 | Curiosity | `/curiosity` returns SATISFIED |
| 3 | Reconciliation | All lead results reconciled with findings |
| 4 | Article | `articles/full.md` + `full.pdf` exist with [S###] citations |
| 5 | Sources | **Claim Verification** - Semantic + Computational verification |
| 6 | Integrity | `/integrity` returns READY (with multi-agent debate) |
| 7 | Legal | `/legal-review` returns READY (with multi-agent debate) |

### Quality Gates (8-10) — PLANNED

Quality gates are not yet implemented as separate verification steps. They are currently evaluated as part of the AI self-review process.

| # | Gate | Pass Criteria | Status |
|---|------|---------------|--------|
| 8 | Balance | All stakeholders represented; counterarguments addressed | Planned |
| 9 | Completeness | Framework insights reflected; no obvious gaps | Planned |
| 10 | Significance | Clear takeaway; novel findings identified | Planned |

**Future enhancement:** Dedicated `/balance-audit`, `/completeness-audit`, `/significance-audit` skills.

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
Verify lead results are reconciled with findings:
- Lead results that contradict finding claims must be updated
- Unverified claims must have caveats

### Gate 4: Article
Verify:
- `articles/full.md` exists with [S###] citations
- `articles/full.pdf` exists
- Sources Consulted section lists uncited sources

### Gate 5: Sources - Two-Part Verification

Gate 5 now has TWO verification steps:

#### Step 5A: Semantic Claim Verification (existing)

```bash
node scripts/claims/verify-article.js cases/<case-id>/ --generate-batches
# Process batches with LLM
node scripts/claims/verify-article.js cases/<case-id>/ --merge-batches N
```

Matches every factual claim against source content using LLM semantic understanding.

| Status | Meaning | Action |
|--------|---------|--------|
| SUPPORTED | Claim has source support | None |
| UNSOURCED | Source doesn't support claim | Find source or remove claim |
| SOURCE_MISSING | Evidence file missing | Re-capture or remove |

#### Step 5B: Computational Fact-Checking (NEW)

```bash
node scripts/claims/compute-verify.js cases/<case-id>/ --generate-prompts
# Process prompts with LLM (include code execution)
node scripts/claims/compute-verify.js cases/<case-id>/ --responses <file>
```

Verifies numerical claims computationally:
- Percentages and percentage changes
- Dollar amounts and financial figures
- Ratios and rankings
- Growth multiples (doubled, tripled)
- Counts (employees, cases, etc.)

| Status | Meaning | Action |
|--------|---------|--------|
| MATCHED | Computed value matches claim (within 5%) | None |
| DISCREPANCY | Computed value differs significantly | Investigate and correct |
| DATA_NOT_FOUND | Source lacks verifiable numbers | Flag for manual review |

#### Combining Results

Gate 5 passes when BOTH:
- Step 5A: No UNSOURCED claims (or all have caveats)
- Step 5B: No DISCREPANCY items (or all explained/corrected)

#### Outputs

- `claim-verification.json` - Semantic verification results
- `claim-verification-report.md` - Human-readable semantic report
- `compute-verification.json` - Computational verification results

### Gate 6: Integrity (with Multi-Agent Debate)

Invoke `/integrity` which now uses **Critic/Defender/Arbiter debate** for flag resolution:

1. **Stage 1**: Context-free scan (reads ONLY article)
2. **Stage 2**: Multi-agent debate for each flag
   - CRITIC argues for FIX
   - DEFENDER argues for CLEAR with evidence
   - ARBITER decides final resolution
3. **Stage 3**: Output `integrity-review.md`

Use `--no-debate` for faster single-pass review (less robust).

### Gate 7: Legal (with Multi-Agent Debate)

Invoke `/legal-review` which now uses **Critic/Defender/Arbiter debate** for flag resolution:

1. **Stage 1**: Context-free scan (reads ONLY article)
2. **Stage 2**: Multi-agent debate for each flag
   - CRITIC argues for FIX (identifies legal risk)
   - DEFENDER argues for CLEAR with evidence
   - ARBITER decides final resolution
3. **Stage 3**: Output `legal-review.md`

Use `--no-debate` for faster single-pass review (less robust).

### Gates 6+7: Parallel Review Optimization

When Gate 5 passes and both Gates 6 and 7 need to run:
```
/action parallel-review
```

This runs both reviews in parallel, each with their own multi-agent debate.

## Output

Update `state.json` gates with results.

## Result

**ALL PASS (Gates 0-7):** Check if AI self-review is needed (which covers quality gates 8-10)

**ANY FAIL:** Return specific failures and fixes

## AI Self-Review (First Iteration Only)

After all process gates (0-7) pass for the first time, trigger automatic AI review.
The self-review covers quality gates (8-10): Balance, Completeness, Significance.

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
Review this investigative article as a critical senior editor who will be blamed
if readers find errors. Focus on these SPECIFIC issues:

1. VERDICT LANGUAGE: Flag any use of CONFIRMED, VALIDATED, RESOLVED, REFUTED,
   PROVEN, or similar courtroom terminology for probabilistic evidence.
   Replace with: "supported by", "consistent with", "strongest evidence suggests"

2. LEVEL-OF-ANALYSIS MIXING: Check if the article slides between different
   analytical levels (individual behavior, catalog concentration, market
   concentration, creator income, belief formation) without explicit transitions.
   Each section should state which level it addresses.

3. EVIDENCE vs INFERENCE: Flag places where the article states inferences as
   if they were direct findings. Pattern: "Study shows X" when study actually
   showed Y and X is the author's interpretation.

4. REGULATORY/LEGAL ACCURACY: Verify any statute or article citations.
   Would a lawyer or policy expert immediately see an error? Example: citing
   "EU AI Act Article 50" for something Article 50 doesn't actually address.

5. ADVOCACY FRAMING: Does this read like journalism or "persuasive advocacy
   dressed as scholarship"? Is evidence presented to inform or to win an argument?

6. SYNTHESIS CITATIONS: Flag any citations to "multiple_sources_synthesis" or
   similar non-URL sources. These are fabricated and must be replaced.

7. CAUSAL OVER-REACH: Flag causal claims that outrun study designs. Example:
   7-day experiment → "directly reduces" is too strong.

8. BALANCE (Gate 8): Are all major stakeholders represented? Are counterarguments
   addressed substantively or dismissed?

9. COMPLETENESS (Gate 9): Do the 35 frameworks' insights appear in the article?
   Any obvious gaps in coverage?

10. SIGNIFICANCE (Gate 10): Is there a clear takeaway? Novel findings?

For each issue found:
- Quote the problematic text
- Explain why it's problematic
- Provide specific replacement text

If article is ready for publication as-is, say "READY FOR PUBLICATION" explicitly.
```

### After Self-Review

- **If feedback:** Set `ai_review_complete = true`, invoke `/case-feedback`
- **If no feedback:** Set `ai_review_complete = true`, complete

## Verification Workflow Summary

```
┌────────────────────────────────────────────────────────────────┐
│  GATE 5: TWO-PART VERIFICATION                                 │
│                                                                │
│  Step 5A: Semantic Verification                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 1. Extract claims with [S###] citations                  │ │
│  │ 2. Generate LLM prompts for each claim                   │ │
│  │ 3. LLM checks: "Does source support this claim?"         │ │
│  │ 4. Report: SUPPORTED / UNSOURCED / SOURCE_MISSING        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                          ↓                                     │
│  Step 5B: Computational Verification                          │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 1. Extract numerical claims (%, $, ratios, counts)       │ │
│  │ 2. Generate Python verification code                     │ │
│  │ 3. Execute code (compute actual values)                  │ │
│  │ 4. Compare: claimed vs computed (5% tolerance)           │ │
│  │ 5. Report: MATCHED / DISCREPANCY / DATA_NOT_FOUND        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                          ↓                                     │
│  PASS when: 5A clean AND 5B clean                             │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  GATES 6+7: MULTI-AGENT DEBATE REVIEW                         │
│                                                                │
│  Stage 1: Context-Free Scan (reads ONLY article)              │
│  ┌────────────────────┐     ┌────────────────────┐           │
│  │ /integrity scan    │     │ /legal-review scan │           │
│  └─────────┬──────────┘     └─────────┬──────────┘           │
│            ↓                          ↓                        │
│       flags[]                    flags[]                       │
│                                                                │
│  Stage 2: Multi-Agent Debate (for each flag)                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  ┌─────────┐   ┌──────────┐   ┌─────────┐              │ │
│  │  │ CRITIC  │ ← │  DEBATE  │ → │DEFENDER │              │ │
│  │  │(find    │   │ (rounds) │   │(find    │              │ │
│  │  │ issues) │   └────┬─────┘   │evidence)│              │ │
│  │  └─────────┘        │         └─────────┘              │ │
│  │                     ↓                                   │ │
│  │              ┌─────────────┐                           │ │
│  │              │   ARBITER   │                           │ │
│  │              │ (decides)   │                           │ │
│  │              └──────┬──────┘                           │ │
│  │                     ↓                                   │ │
│  │  Resolution: CLEARED / FIX_REQUIRED / ESCALATE         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Stage 3: Apply fixes, write review files                     │
└────────────────────────────────────────────────────────────────┘
```

## Next Steps

- If PASS (Gates 0-7) + ai_review_complete: Investigation complete
- If PASS (Gates 0-7) + needs self-review: AI review (covers Gates 8-10) → /case-feedback if issues found
- If FAIL (Gates 0-7): Route to appropriate phase based on which gate failed

## Quality Gates Coverage

The AI self-review explicitly checks:
- **Gate 8 (Balance):** Stakeholder representation, counterargument handling
- **Gate 9 (Completeness):** Framework coverage, obvious gaps
- **Gate 10 (Significance):** Clear takeaway, novel findings

These are evaluated within the self-review rather than as separate automated gates.
Future enhancement: dedicated quality audit skills for independent verification.
