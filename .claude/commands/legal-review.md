# /legal-review - Legal Risk Assessment

Assess legal risks before publication.

## Usage

```
/legal-review              # Review active case
/legal-review [case-id]    # Review specific case
```

## Task

Evaluate `summary.md` and `articles/full.md` for legal risks.

## Instructions

1. **Read source material:**
   - `summary.md` - Main findings with citations
   - `articles/full.md` - Article to review
   - `sources.json` - Source registry
   - `evidence/S###/metadata.json` - Evidence strength

2. **Classify each subject** (public official/figure vs private) - determines standard

3. **Evaluate evidence strength** for each claim:
   - Tier 1 STRONG: Primary docs, official records → publish confidently
   - Tier 2 MEDIUM: Two independent sources → publish with hedging
   - Tier 3 WEAK: Single/anonymous source → needs more work
   - Tier 4 INSUFFICIENT: Speculation → don't publish

4. **Run the Legal Checklist** (below)

5. **Write output to `legal-review.md`**

6. **Update state.json:** Set `gates.legal` based on result

---

## Legal Checklist

Review each area. The LLM knows the details - this is a reminder to consider each:

### Defamation Risks
- [ ] **Presumption of innocence** - Pre-conviction language uses "alleged/charged/accused"?
- [ ] **Per se categories** - Criminal conduct, sexual misconduct, professional incompetence, loathsome disease, business fraud
- [ ] **Opinion vs fact** - Opinions clearly labeled? Facts verifiable?
- [ ] **Public vs private figure** - Correct standard applied?
- [ ] **Fair comment** - Opinion based on disclosed true facts?
- [ ] **Attribution** - Defamatory statements attributed to sources, not asserted as our conclusion?

### Privacy Risks
- [ ] **Private facts** - Disclosing non-newsworthy private information?
- [ ] **Intrusion** - How was information obtained?
- [ ] **False light** - Misleading implications from true facts?
- [ ] **Right of publicity** - Commercial use of name/likeness?

### Source & Procedure Risks
- [ ] **Confidential sources** - Promises made? Legal exposure?
- [ ] **Sealed records** - Court-sealed or expunged records used?
- [ ] **Juvenile information** - Protected status considered?
- [ ] **Ongoing proceedings** - Sub judice concerns? Gag orders?
- [ ] **Copyright/fair use** - Quotation length appropriate?

### Subject Response
- [ ] **Right of reply** - Subject given opportunity to respond?
- [ ] **Response included** - Their denial/explanation in article?
- [ ] **Contact attempts documented** - If no response, did we try?

---

## Status Values

- **READY:** Pass Gate 6
- **READY WITH CHANGES:** Specific fixes needed, list them
- **NOT READY:** Major issues, back to FOLLOW phase

---
*This is AI-generated analysis, not legal advice.*
