# Legal Risk Assessment

You are running the **legal risk assessment** - a pre-publication review to identify defamation exposure, evidence gaps, and claims requiring additional verification.

This command helps journalists and editors make informed publication decisions by systematically assessing each claim's legal risk.

---

## USAGE

```
/legal-review              # Review active case
/legal-review [case-id]    # Review specific case
```

---

## LEGAL FRAMEWORK

### Defamation Elements (US)

To prove defamation, a plaintiff must show:

1. **False statement of fact** (not opinion)
2. **Publication** to third parties
3. **Fault** (negligence for private figures, actual malice for public figures)
4. **Damages** (harm to reputation)

### The Public Figure Defense

| Figure Type | Standard | What Plaintiff Must Prove |
|-------------|----------|---------------------------|
| **Public Official** | Actual Malice | Knowledge of falsity OR reckless disregard for truth |
| **All-Purpose Public Figure** | Actual Malice | Same - famous people, celebrities |
| **Limited-Purpose Public Figure** | Actual Malice | Same - thrust themselves into specific controversy |
| **Private Figure** | Negligence | Failure to exercise reasonable care |

**Key**: Public figures face a much higher burden. Correctly classifying subjects is critical.

### Protected Categories

These are generally NOT defamatory:

| Category | Example | Why Protected |
|----------|---------|---------------|
| **Opinion** | "I think he's corrupt" | Not a statement of fact |
| **Hyperbole** | "The worst CEO in history" | Rhetorical exaggeration |
| **Fair Comment** | Criticism of public conduct | Public interest privilege |
| **Truth** | Accurate reporting of facts | Truth is absolute defense |
| **Privilege** | Reporting court filings | Fair report privilege |
| **Public Records** | Quoting government documents | Official records privilege |

### Danger Zones

These claims carry HIGH defamation risk:

| Claim Type | Risk Level | Why |
|------------|------------|-----|
| Criminal conduct allegations | **HIGHEST** | Per se defamatory |
| Professional incompetence | **HIGHEST** | Per se defamatory |
| Sexual misconduct | **HIGHEST** | Per se defamatory |
| Financial fraud | **HIGH** | Affects business reputation |
| Unethical behavior | **HIGH** | Subjective, hard to prove |
| Mental health claims | **HIGH** | Private medical information |
| Drug/alcohol abuse | **HIGH** | Private, stigmatizing |

---

## EVIDENCE STRENGTH CLASSIFICATION

### Tier 1: STRONG (Publishable with confidence)

- Primary source documents (contracts, emails, filings)
- On-record statements from direct participants
- Court findings/judgments
- Official government records
- Multiple independent corroborating sources
- Photographic/video evidence with clear provenance

### Tier 2: MEDIUM (Publishable with appropriate hedging)

- Two independent sources (not corroborating each other)
- On-record statements from credible secondhand witnesses
- Documents of unclear provenance but internally consistent
- Expert analysis of primary documents
- Pattern evidence (multiple similar incidents)

### Tier 3: WEAK (Requires additional verification)

- Single source (even if credible)
- Off-record/anonymous sources only
- Secondhand or thirdhand accounts
- Documents with questionable authenticity
- Circumstantial evidence without direct proof
- Sources with potential bias or motive

### Tier 4: INSUFFICIENT (Do not publish without more)

- Speculation or inference without evidence
- Sources with clear axe to grind (and no corroboration)
- Unverified tips
- Social media posts without confirmation
- Claims contradicted by documentary evidence

---

## STEP 1: LOAD CASE FILES

```python
# Load all case files for review
read(summary.md)
read(sources.md)
read(fact-check.md)
read(people.md)
read(positions.md)
read(evidence.md)
```

---

## STEP 2: EXTRACT ALL CLAIMS

For each factual claim in summary.md:

```
CLAIM: [The specific claim]
SUBJECT: [Person/entity the claim is about]
SUBJECT_TYPE: [Public Official | Public Figure | Limited Public Figure | Private Figure]
CLAIM_TYPE: [Criminal | Professional | Financial | Personal | Other]
SOURCES: [List of source IDs supporting this claim]
```

---

## STEP 3: ASSESS EACH CLAIM

For each claim, evaluate:

### A. Subject Classification

| Factor | Public Figure Indicator | Private Figure Indicator |
|--------|------------------------|-------------------------|
| Media presence | Frequent, voluntary | Rare, involuntary |
| Public role | Government, celebrity, executive | Private citizen |
| Controversy involvement | Injected themselves | Dragged in by others |
| Name recognition | Widely known | Unknown to general public |

### B. Claim Type Risk

| Type | Base Risk | Notes |
|------|-----------|-------|
| Criminal allegation | **HIGHEST** | Per se defamatory - extreme caution |
| Professional misconduct | **HIGH** | Affects livelihood |
| Financial wrongdoing | **HIGH** | Affects business reputation |
| Personal conduct | **MEDIUM** | Context-dependent |
| Opinion/analysis | **LOW** | Protected if framed as opinion |

### C. Evidence Strength

For each source supporting the claim:

```
[S-XXX]:
  - Type: [Document | On-record | Off-record | Public Record | etc.]
  - Independence: [Primary | Corroborating | Circular]
  - Credibility: [HIGH | MEDIUM | LOW]
  - Potential Bias: [None | Some | Significant]
```

### D. Corroboration Assessment

| Corroboration Level | Description | Strength |
|--------------------|-------------|----------|
| **Multiple primary sources** | 2+ independent documents/witnesses | STRONG |
| **Document + source** | Documentary evidence + human source | STRONG |
| **Multiple secondhand** | 2+ sources who heard from principals | MEDIUM |
| **Single credible source** | One source with direct knowledge | WEAK |
| **Anonymous only** | No on-record corroboration | INSUFFICIENT |

---

## STEP 4: RISK CLASSIFICATION

### Overall Claim Risk Matrix

```
                    EVIDENCE STRENGTH
                    Strong    Medium    Weak
SUBJECT     Public    LOW      LOW      MEDIUM
TYPE        Limited   LOW      MEDIUM   HIGH
            Private   MEDIUM   HIGH     HIGHEST

                    EVIDENCE STRENGTH
                    Strong    Medium    Weak
CLAIM       Minor     LOW      LOW      MEDIUM
SEVERITY    Moderate  LOW      MEDIUM   HIGH
            Severe    MEDIUM   HIGH     HIGHEST
```

### Risk Levels

| Level | Publication Guidance |
|-------|---------------------|
| **LOW** | Publishable as written |
| **MEDIUM** | Publishable with hedging language |
| **HIGH** | Needs additional verification before publication |
| **HIGHEST** | Do not publish without substantial additional evidence |

---

## STEP 5: GENERATE LEGAL REVIEW

### Output Format

```markdown
# Legal Risk Assessment: [Investigation Title]

**Case**: [case-id]
**Review Date**: [datetime]
**Reviewer**: Claude Legal Analysis
**Overall Risk**: [LOW | MEDIUM | HIGH | HIGHEST]

---

## Executive Summary

[2-3 paragraphs summarizing:
- Number of claims assessed
- Overall risk profile
- Key concerns
- Publication readiness recommendation]

---

## Subject Classifications

| Subject | Classification | Rationale |
|---------|---------------|-----------|
| [Name] | [Public/Private/Limited] | [Brief explanation] |

---

## Claim-by-Claim Analysis

### CLAIM 1: [Claim text]

| Factor | Assessment |
|--------|------------|
| **Subject** | [Name] |
| **Subject Type** | [Classification] |
| **Claim Type** | [Criminal/Professional/Financial/Personal] |
| **Evidence Tier** | [1-4] |
| **Risk Level** | [LOW/MEDIUM/HIGH/HIGHEST] |

**Supporting Evidence**:
- [S-XXX]: [Type, strength, credibility assessment]
- [S-XXX]: [Type, strength, credibility assessment]

**Corroboration**: [Strong/Medium/Weak/Insufficient]

**Legal Analysis**:
[Specific legal concerns for this claim]

**Recommendation**:
- [ ] Publish as written
- [ ] Publish with hedging (suggested language below)
- [ ] Needs additional verification
- [ ] Do not publish without more evidence

**Suggested Hedging** (if applicable):
> [Alternative language that reduces risk]

---

### CLAIM 2: [Claim text]
[Same structure...]

---

## High-Risk Claims Summary

| Claim | Subject | Risk | Issue | Recommendation |
|-------|---------|------|-------|----------------|
| [Brief] | [Name] | HIGH | [Key issue] | [Action needed] |

---

## Evidence Gaps

### Critical Gaps (Must address before publication)
1. [Gap description and what's needed]

### Important Gaps (Should address if possible)
1. [Gap description and what's needed]

### Minor Gaps (Nice to have)
1. [Gap description]

---

## Recommended Hedging Language

For claims where hedging can reduce risk:

| Original | Suggested Revision | Why |
|----------|-------------------|-----|
| "[Claim]" | "[Hedged version]" | [Explanation] |

### Common Hedging Patterns

| Instead of | Use | Why |
|------------|-----|-----|
| "X committed fraud" | "X is accused of fraud" or "Documents suggest X may have..." | Removes assertion of fact |
| "X knew about..." | "Evidence indicates X was informed of..." | Attributes to evidence |
| "X is corrupt" | "Critics allege X engaged in..." | Attributes to sources |
| "X lied" | "X's statement contradicts..." | Factual comparison |

---

## Fair Report Privilege Checklist

If relying on fair report privilege (reporting on official proceedings):

- [ ] Source is official proceeding (court, legislative, government)
- [ ] Report is fair and accurate summary
- [ ] Report is attributed to official source
- [ ] No additional allegations beyond the record
- [ ] No adoption of allegations as our own

---

## Pre-Publication Checklist

### Legal
- [ ] All subjects properly classified (public/private)
- [ ] All high-risk claims have Tier 1-2 evidence
- [ ] Hedging language applied where appropriate
- [ ] No claims based solely on anonymous sources
- [ ] Fair report privilege properly invoked where applicable
- [ ] Opinion clearly distinguished from fact

### Editorial
- [ ] All claims sourced with [SXXX] IDs
- [ ] Response sought from all subjects of criticism
- [ ] Responses fairly represented
- [ ] Context provided for all allegations
- [ ] No misleading juxtaposition or implication

### Documentation
- [ ] All source documents preserved
- [ ] Interview notes/recordings retained
- [ ] Chain of custody documented for sensitive documents
- [ ] Publication decision documented

---

## Response/Comment Status

| Subject | Contacted | Response | Included |
|---------|-----------|----------|----------|
| [Name] | [Date/Method] | [Yes/No/Declined] | [Yes/No] |

**Note**: Failure to seek comment can be evidence of actual malice.

---

## Final Recommendation

**Publication Readiness**: [READY | READY WITH CHANGES | NOT READY]

**Required Actions Before Publication**:
1. [Action item]
2. [Action item]

**Suggested Actions** (not required but reduce risk):
1. [Action item]
2. [Action item]

---

## Disclaimer

This analysis is generated by AI and does not constitute legal advice.
All publication decisions should be reviewed by qualified legal counsel.
```

---

## PARALLEL ANALYSIS CALLS

**Launch ALL of these simultaneously:**

### Call 1: Subject Classification Analysis (Gemini)
```
mcp__mcp-gemini__generate_text:
  thinking_level: "high"
  system_prompt: |
    You are a media law expert specializing in defamation law.
    Classify each subject as Public Official, All-Purpose Public Figure,
    Limited-Purpose Public Figure, or Private Figure.
    Provide specific legal reasoning for each classification.
  prompt: |
    SUBJECTS FROM INVESTIGATION:
    [people.md content]

    For each person, classify and explain why.
```

### Call 2: Claim Risk Assessment (Gemini)
```
mcp__mcp-gemini__generate_text:
  thinking_level: "high"
  system_prompt: |
    You are a media lawyer reviewing claims for defamation risk.
    For each claim, assess: claim type, severity, evidence strength,
    and overall defamation risk.
  prompt: |
    CLAIMS TO ASSESS:
    [Extract claims from summary.md]

    EVIDENCE:
    [fact-check.md and sources.md summary]

    Assess each claim's legal risk.
```

### Call 3: Evidence Gap Analysis (Gemini)
```
mcp__mcp-gemini__generate_text:
  thinking_level: "high"
  system_prompt: |
    You are an investigative editor reviewing evidence sufficiency.
    Identify gaps where claims lack adequate support for publication.
  prompt: |
    CLAIMS AND EVIDENCE:
    [summary.md with sources]

    What evidence gaps exist? What additional verification is needed?
```

### Call 4: Case Law Research (OpenAI)
```
mcp__mcp-openai__deep_research:
  query: |
    Defamation case law for claims involving:
    [Key claim types from investigation]

    What precedents apply? What have courts required for similar claims?
```

---

## SAVE TO CASE

Save legal review to case directory:

```
cases/[case-id]/legal-review-[datetime].md
```

---

## THE MEDIA LAWYER'S MINDSET

1. **"Can we prove it's true?"** - Truth is the ultimate defense
2. **"Who is the subject?"** - Public vs. private changes everything
3. **"What's our evidence?"** - Documents > sources > inference
4. **"Is this fact or opinion?"** - Frame opinions as opinions
5. **"Did we seek comment?"** - Always give subjects a chance to respond
6. **"What's the worst case?"** - Assume the subject will sue
7. **"Can we source it?"** - If you can't attribute it, reconsider it
8. **"Is it fair?"** - Would a reasonable person see this as balanced?
9. **"What are we implying?"** - Juxtaposition can be defamatory
10. **"Is it worth the risk?"** - Some claims aren't worth the exposure

---

## COMMON MISTAKES TO AVOID

| Mistake | Why It's Dangerous | Solution |
|---------|-------------------|----------|
| Treating all subjects as public figures | Private figures have lower burden | Carefully classify each subject |
| Over-relying on anonymous sources | Hard to defend if challenged | Seek on-record corroboration |
| Stating opinion as fact | Loses opinion defense | Use hedging language |
| Not seeking comment | Evidence of actual malice | Always reach out, document attempts |
| Assuming documents speak for themselves | Context matters legally | Explain significance carefully |
| Circular sourcing | One source, not multiple | Verify sources are independent |
| Republishing defamation | No immunity for repeating | Verify before republishing |

---

## REMEMBER

> "It's not enough to believe it's true. You need to be able to prove it's true."

Publication decisions balance public interest against legal risk. This review helps make that decision informed.
