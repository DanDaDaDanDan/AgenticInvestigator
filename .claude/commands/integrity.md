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
   - **Steelman Check:** Strongest version of each argument presented?
   - **Adversarial Review:** What would criticized parties object to?

4. **Write output to `integrity-review.md`**

5. **Update state.json:** Set `gates.integrity` based on result

## Status Values

- **READY:** Pass Gate 5
- **READY WITH CHANGES:** Specific fixes needed
- **NOT READY:** Major issues, back to FOLLOW phase

## Next Step

Orchestrator uses status to determine gate passage or remediation.
