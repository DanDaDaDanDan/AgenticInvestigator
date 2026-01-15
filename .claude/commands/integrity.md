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
   - `questions/*.md` - For perspective coverage
   - `sources.json` - Source registry

2. **Run the Integrity Checklist** (below)

3. **Write output to `integrity-review.md`**

4. **Update state.json:** Set `gates.integrity` based on result

---

## Integrity Checklist

Review each area. The LLM knows the details - this is a reminder to consider each:

### Balance & Fairness
- [ ] **Source diversity** - Multiple viewpoints represented proportionally?
- [ ] **Steelmanning** - Strongest version of each position presented?
- [ ] **False balance** - Fringe views given undue weight?
- [ ] **Asymmetric scrutiny** - One side examined more critically than others?
- [ ] **Missing perspectives** - Whose voice is absent that should be included?

### Accuracy & Attribution
- [ ] **Circular reporting** - Multiple outlets citing same original source counted as one?
- [ ] **Hearsay chains** - Tracing claims back to primary source?
- [ ] **Selective quoting** - Quotes in context? Ellipses hiding meaning?
- [ ] **Outdated information** - Presented as current when it's not?
- [ ] **Correlation vs causation** - Causal claims supported?

### Treatment of Subjects
- [ ] **Presumption of innocence** - Accused persons treated fairly, not presumed guilty?
- [ ] **Right of reply** - Criticized parties given chance to respond?
- [ ] **Response included** - Denials/explanations actually in the article?
- [ ] **Motive transparency** - Accusers' potential biases noted?
- [ ] **Legal status clarity** - Clear whether charged, convicted, alleged?

### Transparency & Disclosure
- [ ] **Methodology noted** - How investigation was conducted?
- [ ] **Limitations acknowledged** - What we couldn't verify?
- [ ] **Conflicts disclosed** - Any relationships that matter?
- [ ] **Uncertainty flagged** - Contested claims marked as contested?

### Language & Tone
- [ ] **Loaded language** - Neutral terminology used?
- [ ] **Editorializing** - Facts separated from opinion?
- [ ] **Sensationalism** - Headlines/framing accurate to content?
- [ ] **Dehumanization** - All subjects treated with basic dignity?

---

## Status Values

- **READY:** Pass Gate 5
- **READY WITH CHANGES:** Specific fixes needed, list them
- **NOT READY:** Major issues, back to FOLLOW phase
