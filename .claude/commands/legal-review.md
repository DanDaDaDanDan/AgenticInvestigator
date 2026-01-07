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

### Commercial Disparagement (Trade Libel)

Beyond personal defamation, criticism of **products or brands** can trigger trade libel claims.

| Element | What Plaintiff Must Prove |
|---------|---------------------------|
| **False statement** | Statement of fact about the product (not opinion) |
| **Publication** | Statement communicated to third parties |
| **Disparagement** | Statement discredits the product's quality |
| **Pecuniary harm** | Actual economic loss resulted |
| **Fault** | At minimum, negligence in making the statement |

**Safe Harbors for Product Criticism**:
- Attribution to official sources (FDA recalls, USDA findings, EPA reports)
- Attribution to third-party ratings (industry watchdogs, Consumer Reports)
- Attribution to litigation filings
- Clear opinion framing ("Critics argue...")
- Verifiable facts (documented recalls, inspection reports)

**Danger Zone**: Direct assertions of product deficiency without attribution
- ❌ "The products are not actually [claimed quality]"
- ✅ "Consumer lawsuits allege the products are not actually [claimed quality]"
- ✅ "The FDA recall listed [Brand] among affected products"

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

## ADVOCACY SOURCE DISCLOSURE REQUIREMENTS

Sources from advocacy organizations require special handling to maintain credibility and reduce legal exposure.

### Identifying Advocacy Sources

| Source Type | Examples | Disclosure Required |
|-------------|----------|---------------------|
| Animal rights groups | PETA, Mercy for Animals, Direct Action Everywhere | Mission + methodology limits |
| Environmental groups | Greenpeace, Sierra Club, EWG | Mission + methodology limits |
| Industry trade groups | Trade associations, industry-funded research | Financial interest |
| Political organizations | Partisan think tanks, advocacy PACs | Political orientation |
| Plaintiff attorneys | Class action firms, litigation PR | Financial interest in outcome |
| Watchdog organizations | Industry rating organizations, Consumer Reports | Mission + methodology notes |

### Required Disclosures

For ANY claim based primarily on advocacy source material:

**1. Source Identity Disclosure**

The article MUST identify the organization with context:
- ❌ "Investigators documented..."
- ✅ "[Organization Name], an [animal rights/environmental/industry] group, documented..."
- ❌ "A watchdog group rates..."
- ✅ "[Rating Organization], an [industry type] advocacy organization, rates..."

**2. Methodology Limitations Disclosure**

The article MUST acknowledge investigation limitations:
- "Investigation conducted without access to internal company records"
- "Represents observations at a specific point in time"
- "Not a comprehensive audit of ongoing operations"
- "Footage has not been independently authenticated" (if applicable)

**3. Dispute Acknowledgment**

Even without direct contact for THIS article, if the subject is known to dispute allegations:
- ✅ "[Company] has disputed the interpretation of the footage and maintains its operations comply with [relevant] standards"
- ✅ "The company denies the allegations" (if known from other sources)
- ✅ "[Subject] was not contacted for comment" (if not contacted)
- ✅ "[Subject] did not respond to requests for comment" (if contacted but no response)

**4. Rating System Caveats**

For third-party ratings, note methodology limitations:
- ✅ "[Rating Organization], whose methodology may weight against [certain factors], rates..."
- ✅ "According to [rating system], which evaluates [criteria]..."

### Verification Context

| What Advocacy Source Provides | What Article Must Note |
|-------------------------------|------------------------|
| Footage/photos | Whether independently authenticated |
| Facility identification | Whether confirmed via other sources (state records, satellite) |
| Timing claims | Whether corroborated by dated records |
| Legal interpretation | That it represents the source's interpretation |
| Causal connections | Whether supply chain definitively established |

### The "Snapshot" Disclosure

Advocacy investigations are inherently limited. The article SHOULD include language such as:

> "[Organization]'s investigations are conducted without access to internal company records and represent observations at specific points in time rather than comprehensive audits of ongoing operations."

This disclosure:
- Acknowledges limitations honestly
- Reduces legal exposure
- Paradoxically INCREASES credibility by showing transparency

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

### E. Claim Specificity Audit

Broad characterizations are legally weaker than precise claims. Vague language invites challenge.

**FLAG these vague connectors**:

| Phrase | Problem | Required Fix |
|--------|---------|--------------|
| "linked to" | Implies connection without proving it | Specify the documented link |
| "associated with" | Vague association | Name specific, proven association |
| "connected to" | Undefined connection | Define the connection with evidence |
| "tied to" | Ambiguous relationship | Clarify relationship with sources |
| "implicated in" | Suggests wrongdoing without proof | State what's actually documented |

**Specificity Requirements**:

For EACH allegation, verify:
- [ ] Specific facility/location named (not just company name)
- [ ] Specific date or time period stated
- [ ] Specific practice documented (not general characterization)
- [ ] Supply chain connection established with evidence (if claiming brand sources from facility)

**Example Transformations**:

| Vague (Higher Risk) | Specific (Lower Risk) |
|---------------------|----------------------|
| "suppliers linked to [violation] allegations" | "suppliers, such as [Company], where investigators documented [specific practice] at a [Location] facility in [Date]" |
| "company associated with safety issues" | "company whose [Date] [incident type] resulted in an FDA recall of [X units] [S0XX]" |
| "facility connected to [concern] concerns" | "facility where [Organization] documented [specific observation] during a [Date] investigation [S0XX]" |
| "brand tied to industrial practices" | "brand sourcing from [Company], the [Nth]-largest [industry] producer with [scale metric] [S0XX]" |

**Supply Chain Verification**:

If claiming products from Facility X are sold under Brand Y:
- [ ] Documentary evidence of supply relationship exists
- [ ] OR qualified with "suppliers for" rather than definitive sourcing claim
- [ ] OR noted as alleged/claimed rather than established fact

### F. Attribution Audit

Third-party attribution provides legal safe harbor. Direct assertions of wrongdoing do not.

**For EACH negative claim, classify**:

| Attribution Type | Risk Level | Example |
|-----------------|------------|---------|
| Official government finding | **LOWEST** | "FDA listed [Brand] in the recall" |
| Court filing/judgment | **LOWEST** | "The lawsuit alleges deceptive marketing" |
| Third-party rating | **LOW** | "[Rating organization] rates them [X] out of [Y]" |
| Named source quote | **MEDIUM** | "Former employee [Name] stated..." |
| Investigator documentation | **MEDIUM** | "[Organization] footage appeared to show..." |
| Secondhand report | **HIGH** | "Sources familiar with the matter say..." |
| Direct assertion | **HIGHEST** | "The company deceives customers" |

**Required Transformations**:

| Direct Assertion (AVOID) | Attributed Version (USE) |
|-------------------------|--------------------------|
| "The marketing is deceptive" | "Consumer lawsuits allege the marketing is deceptive" |
| "The [practice] violates [standard]" | "Investigators documented [practice] at the facility" |
| "The company knew and did nothing" | "Documents suggest the company was aware; critics argue the response was inadequate" |
| "This is false advertising" | "Plaintiffs in class-action litigation claim this constitutes false advertising" |
| "The products aren't really [claimed quality]" | "Industry watchdogs rate the sourcing [X] out of [Y], citing concerns about [specific issue]" |

**Attribution Checklist**:

For each critical/negative claim:
- [ ] Claim is attributed to a specific, named source
- [ ] Source is identified with appropriate context (organization type, potential bias)
- [ ] "According to," "alleges," "documented," "claims," or similar framing used
- [ ] NOT stated as direct assertion of fact by the publication
- [ ] Subject's dispute acknowledged (if known)

### G. Framing Analysis

Language that presents contested claims as established fact increases legal exposure and undermines credibility.

**FLAG these definitiveness markers**:

| Phrase | Problem | Alternative |
|--------|---------|-------------|
| "the reality is..." | Presents allegation as established fact | "investigators have documented..." |
| "the truth is..." | Assumes conclusion is settled | "evidence suggests..." |
| "in reality..." | Dismisses subject's position as false | "according to [source]..." |
| "clearly..." | Assumes obviousness without proof | "the evidence indicates..." |
| "obviously..." | Prejudges conclusion | "records show..." |
| "undeniably..." | Forecloses legitimate dispute | "multiple sources confirm..." |
| "proves that..." | Overstates evidentiary weight | "supports the claim that..." |
| "exposed..." | Implies wrongdoing as fact | "documented..." or "revealed..." |

**Check All Summary Elements**:

- [ ] **Headline**: Does it state allegations as established fact?
- [ ] **Deck/Subhead**: Does it frame contested claims as "the reality"?
- [ ] **Lede**: Does it present one side's characterization as truth?
- [ ] **Nut graf**: Does it assume conclusions rather than present questions?
- [ ] **Conclusion**: Does it render verdict beyond what evidence supports?

**Framing Fixes**:

| Problematic Framing | Improved Framing |
|---------------------|------------------|
| "The reality of the [industry] is [negative characterization]" | "An examination reveals a complex landscape where [factors], contested claims, and [documented issues] raise questions about the industry" |
| "[Brand] products come from [negative practice]" | "Investigators have documented [practice] at facilities that supply [Brand], though the company disputes these characterizations" |
| "The investigation exposed deceptive marketing" | "The investigation documented discrepancies between marketing claims and observed practices; consumer lawsuits allege the marketing is deceptive" |

**The Contested-Claim Test**:

For any claim where the subject disagrees, ask:
> "Does our language acknowledge this is contested, or does it present our conclusion as settled fact?"

If the latter, revise to include dispute acknowledgment.

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

## Dispute Acknowledgment Status

| Subject | Allegation | Dispute Known? | Acknowledged in Article? | Action Needed |
|---------|------------|----------------|--------------------------|---------------|
| [Name/Entity] | [Brief claim] | [Yes/No/Unknown] | [Yes/No] | [Add acknowledgment / OK] |

**Subjects Not Contacted**:
- [ ] [Name] - "X was not contacted for comment" disclosure needed

**Subjects Who Did Not Respond**:
- [ ] [Name] - "X did not respond to requests for comment" disclosure needed

**Known Disputes from Other Sources**:
- [ ] [Name] disputes [allegation] per [source] - acknowledgment needed in article

---

## Advocacy Source Disclosure Audit

| Source | Type | Identity Disclosed? | Limitations Disclosed? | Action Needed |
|--------|------|---------------------|------------------------|---------------|
| [Organization] | [Animal rights/Environmental/Industry/etc.] | [Yes/No] | [Yes/No] | [Add disclosure / OK] |

**Required Disclosures**:

| Source | Required Language | Present in Article? |
|--------|-------------------|---------------------|
| [Source] | "[Organization type] context" | [Yes/No] |
| [Source] | "Snapshot in time" limitation | [Yes/No] |
| [Source] | "No internal access" limitation | [Yes/No] |
| [Source] | Rating methodology caveat | [Yes/No] |

---

## Claim Specificity Audit

| Vague Language Found | Location | Recommended Fix |
|---------------------|----------|-----------------|
| "[linked to / associated with / etc.]" | [Section/paragraph] | "[Specific replacement]" |

**Supply Chain Verification**:

| Claimed Connection | Evidence Level | Recommendation |
|-------------------|----------------|----------------|
| [Brand] sources from [Facility] | [Documented/Alleged/Unclear] | [OK / Qualify with "suppliers for" / Remove] |

---

## Attribution Audit

| Claim | Current Attribution | Risk Level | Recommended Attribution |
|-------|---------------------|------------|------------------------|
| [Negative claim] | [Direct assertion / Third-party] | [HIGH/MEDIUM/LOW] | [Keep / Revise to "..."] |

**Direct Assertions Requiring Conversion**:

| Direct Assertion | Recommended Attributed Version |
|------------------|-------------------------------|
| "[Current language]" | "[Attributed version]" |

---

## Framing Analysis

| Problematic Framing | Location | Recommended Revision |
|--------------------|----------|---------------------|
| "[the reality is... / the truth is... / etc.]" | [Headline/Deck/Lede/etc.] | "[Improved framing]" |

**Headline/Deck Check**:
- [ ] Headline states allegations as fact: [Yes/No]
- [ ] Deck frames contested claims as "reality": [Yes/No]
- [ ] Lede presents one side as truth: [Yes/No]

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

### Dispute & Attribution (NEW)
- [ ] Each major allegation includes subject's dispute/response acknowledgment
- [ ] If subject not contacted: "X was not contacted for comment" stated
- [ ] If no response received: "X did not respond to requests for comment" stated
- [ ] If dispute known from other sources: dispute acknowledged in article
- [ ] All critical claims attributed to third parties (not direct assertions)
- [ ] No unattributed "linked to" / "associated with" / "connected to" language
- [ ] Litigation status noted where applicable ("litigation remains ongoing")

### Advocacy Sources (NEW)
- [ ] All advocacy sources identified with organizational context (e.g., "[type] organization")
- [ ] Methodology limitations disclosed ("snapshot in time," "no internal access")
- [ ] Known disputes acknowledged even without direct contact for this article
- [ ] Rating system caveats noted where applicable (e.g., methodology limitations)

### Framing (NEW)
- [ ] No "the reality is" / "the truth is" framing of contested claims
- [ ] Headlines and decks don't state allegations as established fact
- [ ] Contested claims presented as contested throughout article
- [ ] Subject's position acknowledged, not dismissed

### Commercial Disparagement (if products/brands criticized) (NEW)
- [ ] Product criticism attributed to official sources, ratings, or litigation
- [ ] No direct assertions of product deficiency without attribution
- [ ] Verifiable facts (recalls, inspections) distinguished from allegations
- [ ] Brand/product subjects' disputes acknowledged

### Claim Specificity (NEW)
- [ ] Allegations reference specific facilities, dates, and documented practices
- [ ] Supply chain connections established with evidence or qualified appropriately
- [ ] Vague characterizations replaced with documented specifics

### Editorial
- [ ] All claims sourced with [SXXX] IDs
- [ ] Response sought from all subjects of criticism
- [ ] Responses fairly represented
- [ ] Context provided for all allegations
- [ ] No misleading juxtaposition or implication

### Methodology Disclosure (NEW)
- [ ] Article includes methodology section
- [ ] Advocacy source limitations disclosed in methodology
- [ ] Subject contact status disclosed ("not contacted" / "did not respond")
- [ ] Rating system methodology caveats noted (if applicable)
- [ ] Scope limitations acknowledged ("snapshot," "not comprehensive audit")

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
cases/[case-id]/legal-review.md
```

Git tracks version history, so no timestamp needed in filename.

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
11. **"Did we acknowledge their dispute?"** - Subjects rarely agree; acknowledge it
12. **"Is criticism attributed?"** - Third-party attribution is your legal shield
13. **"How specific is our claim?"** - "Linked to" invites challenge; specifics defend
14. **"Are we framing allegations as fact?"** - "The reality is..." can be fatal
15. **"Did we disclose source limitations?"** - Transparency paradoxically protects

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
| Not acknowledging known disputes | Appears one-sided, loses credibility | Include dispute even without direct contact |
| Direct assertions without attribution | No safe harbor protection | Attribute to lawsuits, ratings, sources |
| Vague "linked to" characterizations | Implies more than you can prove | Use specific facilities, dates, practices |
| Framing allegations as "the reality" | Presents contested claims as settled | Use "investigators documented," "evidence suggests" |
| Not disclosing advocacy source limits | Hides bias, reduces credibility | Note "snapshot in time," "no internal access" |
| Treating products like people | Trade libel has different elements | Check commercial disparagement standards |
| Omitting methodology limitations | Appears to hide weaknesses | Disclose source limitations in methodology |

---

## REMEMBER

> "It's not enough to believe it's true. You need to be able to prove it's true."

Publication decisions balance public interest against legal risk. This review helps make that decision informed.
