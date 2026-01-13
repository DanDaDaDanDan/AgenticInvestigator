# /legal-review - Legal Risk Assessment

Assess legal risks before publication.

## Usage

```
/legal-review              # Review active case
/legal-review [case-id]    # Review specific case
```

## Task

Evaluate `summary.md` and `articles/full.md` for defamation and legal risks.

## Instructions

1. **Read source material:**
   - `summary.md` - Main findings with citations
   - `articles/full.md` - Article to review
   - `sources.json` - Source registry
   - `evidence/S###/metadata.json` - Evidence strength

2. **Apply legal framework:**

   | Subject Type | Standard | Burden |
   |--------------|----------|--------|
   | Public Official/Figure | Actual Malice | Knowledge of falsity OR reckless disregard |
   | Private Figure | Negligence | Failure to exercise reasonable care |

3. **Evidence tiers:**

   | Tier | Strength | Standard |
   |------|----------|----------|
   | 1 STRONG | Publish confidently | Primary docs, official records |
   | 2 MEDIUM | Publish with hedging | Two independent sources, expert analysis |
   | 3 WEAK | Needs more work | Single source, anonymous only |
   | 4 INSUFFICIENT | Don't publish | Speculation, biased source alone |

4. **Perform checks:**
   - **Subject Classification:** Public/private figure for each person
   - **Claim Risk Assessment:** Risk level for each factual claim
   - **Evidence Tier Review:** Sufficient evidence for each claim?
   - **Attribution Audit:** Proper hedging language used?

5. **Write output to `legal-review.md`**

6. **Update state.json:**
   - If READY: `{ "gates": { "legal": true } }`
   - If NOT READY: `{ "gates": { "legal": false } }`

## High-Risk Claims (per se defamatory)

- Criminal conduct allegations
- Professional incompetence
- Sexual misconduct
- Financial fraud
- Mental health claims

## Output Format

Write to `legal-review.md`:

```markdown
# Legal Risk Assessment

**Status:** READY | READY WITH CHANGES | NOT READY
**Overall Risk:** LOW | MEDIUM | HIGH | HIGHEST

## Subject Classifications
| Subject | Classification | Applicable Standard |
|---------|---------------|---------------------|

## High-Risk Claims
| Claim | Subject | Risk | Evidence Tier | Issue |
|-------|---------|------|---------------|-------|

## Required Hedging
| Original Text | Suggested Revision | Reason |
|---------------|-------------------|--------|

## Evidence Gaps
### Critical (must address before publication)
1. ...

### Important (should address)
1. ...

## Pre-Publication Checklist
- [ ] All subjects properly classified
- [ ] High-risk claims have Tier 1-2 evidence
- [ ] Hedging language applied where needed
- [ ] No claims based solely on anonymous sources
- [ ] Opinion clearly distinguished from fact
- [ ] Subject's response sought/documented
- [ ] Headlines don't state allegations as fact

---
*This is AI-generated analysis, not legal advice.*
*Legal review completed: YYYY-MM-DD*
```

## Status Values

- **READY:** Pass Gate 6
- **READY WITH CHANGES:** Specific fixes needed, then re-check
- **NOT READY:** Major issues, back to FOLLOW phase

## Next Step

Orchestrator uses status to determine gate passage or remediation.
