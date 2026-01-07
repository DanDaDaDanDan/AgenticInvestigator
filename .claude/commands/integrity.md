# Journalistic Integrity & Neutrality Check

You are running the **journalistic integrity assessment** - a pre-publication review to ensure bipartisan, balanced, and ethically sound reporting.

This command evaluates the investigation for neutrality, fairness, and adherence to professional journalism standards.

---

## USAGE

```
/integrity              # Review active case
/integrity [case-id]    # Review specific case
```

---

## JOURNALISM ETHICS FRAMEWORK

### Core Principles (SPJ Code of Ethics)

| Principle | What It Means | How to Check |
|-----------|---------------|--------------|
| **Seek Truth** | Accurate, fair, thorough reporting | Verify all claims; multiple sources |
| **Minimize Harm** | Balance public need vs. private harm | Consider impact on individuals |
| **Act Independently** | Avoid conflicts of interest | Disclose any potential biases |
| **Be Accountable** | Acknowledge mistakes; explain decisions | Transparent methodology |

### Neutrality Standards

| Standard | Definition | Red Flags |
|----------|------------|-----------|
| **Balance** | All significant viewpoints represented | One-sided sourcing; missing perspectives |
| **Fairness** | Each side gets proportional coverage | Asymmetric scrutiny; unequal space |
| **Objectivity** | Facts separated from opinion | Editorializing in news sections |
| **Impartiality** | No favoritism toward any party | Loaded language; selective facts |

---

## THE INTEGRITY CHECKLIST

### 1. Source Balance Audit

For each position/stakeholder in the investigation:

| Position | # of Sources | % of Total | Assessment |
|----------|--------------|------------|------------|
| Position 1 | [count] | [%] | [BALANCED/UNDERREPRESENTED/OVERREPRESENTED] |
| Position 2 | [count] | [%] | [BALANCED/UNDERREPRESENTED/OVERREPRESENTED] |
| ... | | | |

**Red Flags**:
- Any position with <15% of sources
- Any position with >50% of sources
- Missing major stakeholder perspectives

### 2. Language Neutrality Scan

Check for loaded/biased language:

| Type | Examples to Flag | Neutral Alternative |
|------|------------------|---------------------|
| **Pejorative terms** | "greenwashing," "fraud," "lies" | "disputed claims," "alleged misrepresentation" |
| **Assumptive language** | "obviously," "clearly," "of course" | State evidence; let reader conclude |
| **Emotional appeals** | "shocking," "disturbing," "outrageous" | Describe factually without editorializing |
| **One-sided framing** | "admitted," "claimed" (asymmetric use) | Use same verb construction for all parties |
| **Implicit judgments** | "merely," "only," "just" | Remove minimizing language |

### 3. Scrutiny Symmetry Check

Ensure equal investigative rigor applied to ALL parties:

| Entity | Claims Investigated | Claims Verified | Claims Challenged | Scrutiny Level |
|--------|--------------------|-----------------|--------------------|----------------|
| [Entity 1] | [#] | [#] | [#] | [HIGH/MEDIUM/LOW] |
| [Entity 2] | [#] | [#] | [#] | [HIGH/MEDIUM/LOW] |

**Red Flags**:
- Investigating one party's claims while accepting another's at face value
- Challenging one side's evidence while not challenging the other's
- Different standards of proof for different parties

### 4. Fact vs. Opinion Separation

Audit each major assertion:

| Statement | Type | Proper Handling |
|-----------|------|-----------------|
| [Statement] | FACT / OPINION / ANALYSIS | [CORRECT / NEEDS LABEL] |

**Rules**:
- Facts: Verifiable, attributed to sources
- Analysis: Clearly labeled as interpretation
- Opinion: Only in designated opinion sections (if any)

### 5. Context & Completeness

| Factor | Status | Notes |
|--------|--------|-------|
| Historical context provided | YES/NO/PARTIAL | |
| Alternative explanations explored | YES/NO/PARTIAL | |
| Exculpatory evidence included | YES/NO/PARTIAL | |
| Mitigating factors acknowledged | YES/NO/PARTIAL | |
| Uncertainty acknowledged where appropriate | YES/NO/PARTIAL | |

### 6. Attribution Audit

| Claim Type | Attribution Standard | Status |
|------------|---------------------|--------|
| Factual claims | Specific source cited | [MET/NOT MET] |
| Statistical claims | Primary source + methodology | [MET/NOT MET] |
| Characterizations | Attributed to speaker or labeled as analysis | [MET/NOT MET] |
| Allegations | Attributed; response sought | [MET/NOT MET] |

### 7. Steelmanning Check

For each position, verify the strongest version is presented:

| Position | Strongest Arguments Included | Weakest Arguments of Opposition Avoided |
|----------|-----------------------------|-----------------------------------------|
| [Position 1] | YES/NO | YES/NO |
| [Position 2] | YES/NO | YES/NO |

**Steelmanning Requirements**:
- Present each side's BEST arguments, not strawmen
- Acknowledge where opposing views have merit
- Don't cherry-pick weak arguments to attack

---

## PARALLEL ANALYSIS CALLS

Launch ALL of these simultaneously:

### Call 1: Balance Analysis (Gemini)
```
mcp__mcp-gemini__generate_text:
  thinking_level: "high"
  system_prompt: |
    You are a journalism ethics professor reviewing an investigation for balance and fairness.
    Analyze:
    1. Source distribution across positions
    2. Proportionality of coverage
    3. Whether any perspective is underrepresented
    4. Whether scrutiny is applied equally
  prompt: |
    INVESTIGATION TO REVIEW:
    [summary.md content]

    POSITIONS DOCUMENTED:
    [positions.md content]

    SOURCES:
    [sources.md summary]

    Provide detailed balance analysis.
```

### Call 2: Language Neutrality (Gemini)
```
mcp__mcp-gemini__generate_text:
  thinking_level: "high"
  system_prompt: |
    You are an editor checking for loaded language and bias.
    Flag any:
    - Pejorative or emotionally charged terms
    - Assumptive language
    - Asymmetric treatment of parties
    - Implicit judgments
    - Editorializing in factual sections
  prompt: |
    TEXT TO REVIEW:
    [summary.md content]

    Identify ALL instances of potentially biased language and suggest neutral alternatives.
```

### Call 3: Adversarial Review (Gemini)
```
mcp__mcp-gemini__generate_text:
  thinking_level: "high"
  system_prompt: |
    You are a hostile reader from EACH criticized party.
    For each entity criticized in this investigation:
    1. What would they say is unfair?
    2. What context is missing?
    3. What exculpatory evidence was omitted?
    4. Where is the scrutiny asymmetric?
  prompt: |
    INVESTIGATION:
    [summary.md content]

    ENTITIES CRITICIZED:
    [list from summary]

    Provide the strongest objections each entity would raise about fairness.
```

### Call 4: Steelmanning Verification (Gemini)
```
mcp__mcp-gemini__generate_text:
  thinking_level: "high"
  system_prompt: |
    You are a debate coach ensuring all arguments are steelmanned.
    For each position in this investigation:
    1. Is the STRONGEST version of this argument presented?
    2. Are weak strawman versions being attacked instead?
    3. What stronger arguments exist that weren't included?
  prompt: |
    POSITIONS ANALYSIS:
    [positions.md content]

    SUMMARY TREATMENT:
    [relevant sections of summary.md]

    Evaluate steelmanning quality for each position.
```

---

## OUTPUT FORMAT

Generate comprehensive integrity report:

```markdown
# Journalistic Integrity Assessment: [Investigation Title]

**Case**: [case-id]
**Review Date**: [datetime]
**Reviewer**: Claude Integrity Analysis
**Overall Rating**: [EXEMPLARY / GOOD / ADEQUATE / NEEDS IMPROVEMENT / BIASED]

---

## Executive Summary

[2-3 paragraphs summarizing:
- Overall balance assessment
- Key concerns identified
- Strengths of the reporting
- Recommended improvements]

---

## 1. Source Balance Analysis

### Distribution by Position

| Position | Sources | % | Assessment |
|----------|---------|---|------------|
| [Position] | [#] | [%] | [Rating] |

### Balance Verdict: [BALANCED / TILTED / UNBALANCED]

[Analysis of source distribution]

---

## 2. Language Neutrality Audit

### Flagged Language

| Location | Original Text | Issue | Suggested Revision |
|----------|---------------|-------|-------------------|
| [Section] | "[text]" | [bias type] | "[neutral version]" |

### Neutrality Verdict: [NEUTRAL / MOSTLY NEUTRAL / BIASED]

[Analysis of language patterns]

---

## 3. Scrutiny Symmetry

### Scrutiny by Entity

| Entity | Scrutiny Level | Evidence |
|--------|----------------|----------|
| [Entity] | [HIGH/MEDIUM/LOW] | [explanation] |

### Symmetry Verdict: [SYMMETRIC / ASYMMETRIC]

[Analysis of investigative rigor distribution]

---

## 4. Fact vs. Opinion Separation

### Mixed Content Identified

| Statement | Current Treatment | Recommended Treatment |
|-----------|-------------------|----------------------|
| "[text]" | Presented as fact | Label as analysis |

### Separation Verdict: [CLEAR / MOSTLY CLEAR / BLURRED]

---

## 5. Context & Completeness

| Factor | Rating | Notes |
|--------|--------|-------|
| Historical context | [1-5] | |
| Alternative explanations | [1-5] | |
| Exculpatory evidence | [1-5] | |
| Mitigating factors | [1-5] | |
| Uncertainty acknowledgment | [1-5] | |

### Completeness Verdict: [COMPLETE / MOSTLY COMPLETE / INCOMPLETE]

---

## 6. Steelmanning Assessment

### Position Strength Analysis

| Position | Strongest Arguments Present | Strawmanning Avoided |
|----------|----------------------------|---------------------|
| [Position] | YES/PARTIAL/NO | YES/NO |

### Steelmanning Verdict: [EXCELLENT / GOOD / NEEDS WORK]

---

## 7. Adversarial Review

### Anticipated Objections by Entity

#### [Entity 1]
- **Likely Objection**: [what they'd say]
- **Merit**: [VALID / PARTIALLY VALID / INVALID]
- **Response**: [how investigation addresses or should address]

#### [Entity 2]
[Same structure...]

---

## Required Corrections

### Must Fix Before Publication
1. [Specific correction with location]
2. [Specific correction with location]

### Recommended Improvements
1. [Improvement suggestion]
2. [Improvement suggestion]

---

## Integrity Checklist

- [ ] All major positions represented proportionally
- [ ] Language is neutral throughout
- [ ] Scrutiny applied equally to all parties
- [ ] Facts clearly separated from analysis
- [ ] Context and nuance provided
- [ ] Strongest version of each argument presented
- [ ] Exculpatory evidence included
- [ ] Uncertainty acknowledged where appropriate
- [ ] Attribution standards met throughout

---

## Final Assessment

**Publication Readiness (Integrity)**: [READY / READY WITH CHANGES / NOT READY]

**Bias Risk**: [LOW / MEDIUM / HIGH]

**Recommended Actions**:
1. [Action]
2. [Action]

---

## Disclaimer

This analysis evaluates journalistic standards and does not assess legal risk.
See legal-review for defamation and liability assessment.
```

---

## INTEGRATION WITH INVESTIGATION LOOP

This command should be run:

1. **At the end of every investigation** before final synthesis
2. **Before legal review** to ensure content is journalistically sound
3. **After any significant additions** to verify balance is maintained

### Recommended Investigation Loop Finale:

```
1. Complete all research iterations
2. Run verification checkpoint (/verify)
3. Run integrity check (/integrity) ← THIS COMMAND
4. Address integrity issues
5. Run legal review (/legal-review)
6. Address legal issues
7. Final publication decision
```

---

## COMMON BIAS PATTERNS TO CATCH

| Pattern | Description | Fix |
|---------|-------------|-----|
| **Confirmation bias** | Seeking evidence that confirms initial hypothesis | Actively seek disconfirming evidence |
| **Selection bias** | Cherry-picking sources/facts | Systematic source collection |
| **Framing bias** | Presenting facts in loaded context | Neutral framing; multiple frames |
| **Omission bias** | Leaving out inconvenient facts | Comprehensive fact inclusion |
| **Attribution bias** | "Critics say" vs. "Experts confirm" | Consistent attribution language |
| **Proximity bias** | Giving more weight to recent events | Historical context |
| **Authority bias** | Accepting claims based on source status | Verify regardless of source |

---

## SAVE TO CASE

Save integrity report to case directory:

```
cases/[case-id]/integrity-check-[datetime].md
```
