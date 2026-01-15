# /legal-review - Legal Risk Assessment

Assess legal risks before publication.

## Usage

```
/legal-review              # Review active case
/legal-review [case-id]    # Review specific case
```

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

---

## CRITICAL: Presumption of Innocence

**Until convicted, a person is legally innocent.** Stating guilt as fact before conviction is:
- Defamatory per se
- Factually incorrect (guilt is a legal determination)
- Potentially grounds for lawsuit

### Legal Status Language

| Stage | WRONG | CORRECT |
|-------|-------|---------|
| Arrested | "killed" / "murdered" | "was arrested in connection with" |
| Charged | "committed the crime" | "has been charged with" / "faces charges of" |
| Indicted | "is guilty of" | "was indicted on charges of" |
| On trial | "the killer" | "the defendant" / "the accused" |
| Convicted | n/a | "was convicted of" / "was found guilty of" |
| Acquitted | "got away with" | "was acquitted of" / "was found not guilty" |
| Alleged | "did X" | "allegedly did X" / "is accused of X" |

### Required Checks for Criminal Allegations

1. **Identify all statements of criminal conduct**
2. **Verify legal status** - What stage is the case at?
3. **Check language** - Does it presume guilt?
4. **Require hedging** for pre-conviction:
   - "allegedly"
   - "accused of"
   - "charged with"
   - "according to [prosecutor/police/indictment]"
5. **Attribution** - Who is making the accusation? Attribute it.

### Examples

**WRONG:** "Ryan killed his teacher Zoe Walsh in January 2026."
- States guilt as fact
- No attribution
- Defamatory if he's not convicted

**CORRECT:** "Ryan has been charged with the murder of his teacher Zoe Walsh. According to the indictment, [details]. He has pleaded not guilty and awaits trial."
- States legal status (charged)
- Attributes allegations to legal documents
- Notes defendant's position

**WRONG:** "The murderer then fled the scene."
- Labels someone as "murderer" without conviction

**CORRECT:** "The suspect then fled the scene, according to police reports."
- Uses "suspect" (neutral term)
- Attributes to source

### Civil vs Criminal

| Type | Language | Notes |
|------|----------|-------|
| Criminal | "accused" / "charged" / "alleged" | Presumption of innocence applies |
| Civil | "sued for" / "lawsuit alleges" | Lower burden, but still hedge |
| Settled | "settled without admission" | Cannot imply guilt from settlement |

---

## Status Values

- **READY:** Pass Gate 6
- **READY WITH CHANGES:** Specific fixes needed
- **NOT READY:** Major issues, back to FOLLOW phase

---
*This is AI-generated analysis, not legal advice.*
