# /integrity - Journalistic Integrity Check

Verify journalistic standards before publication.

## Usage

```
/integrity              # Check active case
/integrity [case-id]    # Check specific case
```

## Task

Evaluate `summary.md` and `articles/full.md` against journalistic ethics standards.

## MCP Tools

For nuanced judgment calls on fairness and balance, consider **extended thinking**:

- `mcp__mcp-openai__generate_text` (GPT 5.2 Pro) for detecting subtle bias
- Particularly useful for steelman checks and adversarial review

## Instructions

1. **Read source material:**
   - `summary.md` - Main findings
   - `articles/full.md` - Article to review
   - `questions/*.md` - For perspective coverage
   - `sources.json` - Source registry

2. **Evaluate against standards:**

   | Standard | Definition | Red Flags |
   |----------|------------|-----------|
   | Balance | All significant viewpoints represented | One-sided sourcing |
   | Fairness | Proportional coverage | Asymmetric scrutiny |
   | Objectivity | Facts separated from opinion | Editorializing |
   | Impartiality | No favoritism | Loaded language |

3. **Perform checks:**
   - **Balance Analysis:** Source distribution by viewpoint
   - **Language Audit:** Loaded/biased language
   - **Presumption of Innocence:** Are accused persons treated fairly?
   - **Steelman Check:** Strongest version of each argument presented?
   - **Adversarial Review:** What would criticized parties object to?

4. **Write output to `integrity-review.md`**

5. **Update state.json:** Set `gates.integrity` based on result

---

## Fair Treatment of Accused Persons

Journalistic ethics require fair treatment of anyone accused of wrongdoing:

### Requirements

1. **Include their response** - Did we seek comment? Include their denial/explanation?
2. **Context for accusations** - Who is accusing? What's their relationship/motive?
3. **Legal status clarity** - Charged? Convicted? Under investigation?
4. **Avoid presuming guilt** - Language should not treat allegations as proven facts

### Red Flags

| Issue | Example | Fix |
|-------|---------|-----|
| Missing response | Article criticizes person without their comment | Add "X did not respond to requests for comment" or include their statement |
| Guilt language | "the killer" for uncharged person | Use "suspect" / "accused" / "alleged" |
| One-sided sourcing | Only prosecution/accusers quoted | Include defense perspective |
| Motive blindness | Accuser's potential bias not noted | Note relationships, conflicts of interest |

### Defendant's Perspective

For criminal cases, the article MUST include:
- Current legal status (arrested/charged/indicted/convicted)
- Defendant's plea (if entered)
- Defense's position or "declined to comment"
- Note if trial is pending

---

## Status Values

- **READY:** Pass Gate 5
- **READY WITH CHANGES:** Specific fixes needed
- **NOT READY:** Major issues, back to FOLLOW phase

## Next Step

Orchestrator uses status to determine gate passage or remediation.
