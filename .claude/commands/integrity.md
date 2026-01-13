# /integrity - Journalistic Integrity Check

Verify journalistic standards before publication.

## Usage

```
/integrity              # Check active case
/integrity [case-id]    # Check specific case
```

## Task

Evaluate `summary.md` and `articles/full.md` against journalistic ethics standards.

## Instructions

1. **Read source material:**
   - `summary.md` - Main findings
   - `articles/full.md` - Article to review
   - `questions/*.md` - Framework answers (for perspective coverage)
   - `sources.json` - Source registry

2. **Evaluate against standards:**

   | Standard | Definition | Red Flags |
   |----------|------------|-----------|
   | Balance | All significant viewpoints represented | One-sided sourcing |
   | Fairness | Proportional coverage | Asymmetric scrutiny |
   | Objectivity | Facts separated from opinion | Editorializing |
   | Impartiality | No favoritism | Loaded language |

3. **Perform checks:**
   - **Balance Analysis:** Count sources by viewpoint, assess distribution
   - **Language Audit:** Scan for loaded/biased language
   - **Steelman Check:** Is strongest version of each argument presented?
   - **Adversarial Review:** What would criticized parties object to?

4. **Write output to `integrity-review.md`**

5. **Update state.json:**
   - If READY: `{ "gates": { "integrity": true } }`
   - If NOT READY: `{ "gates": { "integrity": false } }`

## Output Format

Write to `integrity-review.md`:

```markdown
# Integrity Review

**Status:** READY | READY WITH CHANGES | NOT READY

## Balance Assessment
| Position | Sources | % |
|----------|---------|---|

**Balance Rating:** EXEMPLARY | GOOD | ADEQUATE | POOR

## Language Issues
| Location | Issue | Suggested Revision |
|----------|-------|-------------------|

## Steelman Check
| Position | Strongest Version? | Score |
|----------|-------------------|-------|

## Adversarial Review
What would subjects object to?

## Required Corrections
### Blocking
1. ...

### Recommended
1. ...

## Checklist
- [ ] All positions represented proportionally
- [ ] Language neutral throughout
- [ ] Scrutiny applied equally
- [ ] Facts separated from analysis
- [ ] Strongest arguments presented
- [ ] Exculpatory evidence included

---
*Integrity review completed: YYYY-MM-DD*
```

## Status Values

- **READY:** Pass Gate 5
- **READY WITH CHANGES:** Specific fixes needed, then re-check
- **NOT READY:** Major issues, back to FOLLOW phase

## Next Step

Orchestrator uses status to determine gate passage or remediation.
