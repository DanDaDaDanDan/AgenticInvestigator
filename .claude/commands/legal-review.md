# /legal-review - Legal Risk Assessment

Assess legal risks before publication.

## Usage

```
/legal-review              # Review active case
/legal-review [case-id]    # Review specific case
```

## IMPORTANT: Sub-Agent Execution

This command reads article + sources + evidence metadata (~100KB). To avoid polluting the main orchestrator context:

**The `/action` router MUST invoke legal-review via a Task sub-agent.**

The sub-agent reads files, performs review, returns only READY/NOT READY status.

## Task

Evaluate `summary.md` and `articles/full.md` for defamation and legal risks.

## MCP Tools

For complex legal judgment calls, consider **extended thinking**:

- `mcp__mcp-openai__generate_text` (GPT 5.2 Pro) for nuanced risk assessment
- Particularly useful for per se defamatory claims and evidence tier classification

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
   - Subject classification (public/private)
   - Claim risk assessment
   - Evidence tier review
   - Attribution audit (proper hedging?)

5. **Write output to `legal-review.md`**

6. **Update state.json:** Set `gates.legal` based on result

## High-Risk Claims (per se defamatory)

- Criminal conduct allegations
- Professional incompetence
- Sexual misconduct
- Financial fraud
- Mental health claims

## Status Values

- **READY:** Pass Gate 6
- **READY WITH CHANGES:** Specific fixes needed
- **NOT READY:** Major issues, back to FOLLOW phase

---
*This is AI-generated analysis, not legal advice.*
