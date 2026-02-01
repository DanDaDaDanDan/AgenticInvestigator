---
name: verify
description: Check all 11 gates for investigation readiness
context: fork
agent: general-purpose
user-invocable: false
argument-hint: [case-id]
---

# /verify - Check 11 Gates

Verify investigation readiness for publication.

## Usage

```
/verify              # Verify active case
/verify [case-id]    # Verify specific case
```

## The 11 Gates

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
| 8 | Balance | `/balance-audit` - All stakeholders represented; counterarguments addressed |
| 9 | Completeness | `/completeness-audit` - Framework insights reflected; no obvious gaps |
| 10 | Significance | `/significance-audit` - Clear takeaway; novel findings identified |

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

#### Step 5A: Semantic Claim Verification

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

#### Step 5B: Computational Fact-Checking

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

Invoke `/integrity` which uses **Critic/Defender/Arbiter debate** for flag resolution:

1. **Stage 1**: Context-free scan (reads ONLY article)
2. **Stage 2**: Multi-agent debate for each flag
   - CRITIC argues for FIX
   - DEFENDER argues for CLEAR with evidence
   - ARBITER decides final resolution
3. **Stage 3**: Output `integrity-review.md`

Use `--no-debate` for faster single-pass review (less robust).

### Gate 7: Legal (with Multi-Agent Debate)

Invoke `/legal-review` which uses **Critic/Defender/Arbiter debate** for flag resolution:

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

### Gate 8: Balance

Invoke `/balance-audit` to verify:
- All stakeholders mentioned in the investigation have a voice
- The strongest counterargument to the main thesis is addressed
- No one-sided framing is detected

See `/balance-audit` skill for details.

### Gate 9: Completeness

Invoke `/completeness-audit` to verify:
- Key insights from framework questions are reflected in the article
- No obvious angles or perspectives are missing
- Investigated leads are appropriately represented

See `/completeness-audit` skill for details.

### Gate 10: Significance

Invoke `/significance-audit` to verify:
- The main takeaway can be stated in one clear sentence
- Novel findings are explicitly identified
- The "so what?" question is answered

See `/significance-audit` skill for details.

## Output

Update `state.json` gates with results.

## Result

**ALL PASS (Gates 0-10):** Investigation complete

**ANY FAIL:** Return specific failures and fixes

## Gate Execution Order

1. **Gates 0-4**: Pre-verification checks (planning, questions, curiosity, reconciliation, article)
2. **Gate 5**: Source verification (semantic + computational)
3. **Gates 6-7**: Review gates (integrity + legal) - can run in parallel
4. **Gates 8-10**: Quality gates (balance, completeness, significance) - run sequentially

Quality gates (8-10) only run after process gates (0-7) pass. This ensures the article content is stable before evaluating quality.

## Verification Workflow Summary

```
┌────────────────────────────────────────────────────────────────┐
│  GATES 0-4: PRE-VERIFICATION                                    │
│  Planning → Questions → Curiosity → Reconciliation → Article   │
└────────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│  GATE 5: TWO-PART VERIFICATION                                  │
│                                                                 │
│  Step 5A: Semantic Verification                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Extract claims with [S###] citations                  │  │
│  │ 2. Generate LLM prompts for each claim                   │  │
│  │ 3. LLM checks: "Does source support this claim?"         │  │
│  │ 4. Report: SUPPORTED / UNSOURCED / SOURCE_MISSING        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  Step 5B: Computational Verification                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Extract numerical claims (%, $, ratios, counts)       │  │
│  │ 2. Generate Python verification code                     │  │
│  │ 3. Execute code (compute actual values)                  │  │
│  │ 4. Compare: claimed vs computed (5% tolerance)           │  │
│  │ 5. Report: MATCHED / DISCREPANCY / DATA_NOT_FOUND        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  PASS when: 5A clean AND 5B clean                              │
└────────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│  GATES 6+7: MULTI-AGENT DEBATE REVIEW                          │
│                                                                 │
│  Stage 1: Context-Free Scan (reads ONLY article)               │
│  ┌────────────────────┐     ┌────────────────────┐            │
│  │ /integrity scan    │     │ /legal-review scan │            │
│  └─────────┬──────────┘     └─────────┬──────────┘            │
│            ↓                          ↓                         │
│       flags[]                    flags[]                        │
│                                                                 │
│  Stage 2: Multi-Agent Debate (for each flag)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ┌─────────┐   ┌──────────┐   ┌─────────┐               │  │
│  │  │ CRITIC  │ ← │  DEBATE  │ → │DEFENDER │               │  │
│  │  │(find    │   │ (rounds) │   │(find    │               │  │
│  │  │ issues) │   └────┬─────┘   │evidence)│               │  │
│  │  └─────────┘        │         └─────────┘               │  │
│  │                     ↓                                    │  │
│  │              ┌─────────────┐                            │  │
│  │              │   ARBITER   │                            │  │
│  │              │ (decides)   │                            │  │
│  │              └──────┬──────┘                            │  │
│  │                     ↓                                    │  │
│  │  Resolution: CLEARED / FIX_REQUIRED / ESCALATE          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Stage 3: Apply fixes, write review files                      │
└────────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│  GATES 8-10: QUALITY GATES                                      │
│                                                                 │
│  Run sequentially after process gates pass:                    │
│  ┌────────────────────┐                                        │
│  │ /balance-audit     │ → Gate 8: Stakeholder representation  │
│  └─────────┬──────────┘                                        │
│            ↓                                                    │
│  ┌────────────────────┐                                        │
│  │ /completeness-audit│ → Gate 9: Framework coverage          │
│  └─────────┬──────────┘                                        │
│            ↓                                                    │
│  ┌────────────────────┐                                        │
│  │ /significance-audit│ → Gate 10: Clear takeaway             │
│  └────────────────────┘                                        │
└────────────────────────────────────────────────────────────────┘
                          ↓
                    COMPLETE (11/11 gates pass)
```

## Next Steps

- If ALL 11 PASS: Investigation complete
- If FAIL (Gates 0-7): Route to appropriate phase based on which gate failed
- If FAIL (Gates 8-10): Fix quality issues and re-run quality audit
