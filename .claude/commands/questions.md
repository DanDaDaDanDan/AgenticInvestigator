# Investigation Questions Generator

You are running the **questions engine** - the heart of investigative curiosity. This command embodies the principle that **there are always more questions**.

An investigative journalist's superpower is asking the questions others don't think to ask. This command generates those questions.

---

## USAGE

```
/questions              # Generate questions for active case
/questions [case-id]    # Generate questions for specific case
```

---

## PHILOSOPHY

**Investigative journalism is the art of asking uncomfortable questions.**

The best investigators ask questions that:
- Others forgot to ask
- Others were afraid to ask
- Others didn't think to ask
- Reveal what's missing, not just what's there

This command approaches your investigation with fresh eyes and relentless curiosity.

---

## THE QUESTION FRAMEWORKS

Use these lenses to generate questions. Each reveals different blind spots:

### 1. FOLLOW THE MONEY
- Who benefits financially from this?
- Who loses financially?
- Who funded this person/organization/effort?
- Where did the money come from? Where did it go?
- Who stands to gain from each outcome?
- What are the financial incentives?
- Are there undisclosed financial relationships?

### 2. FOLLOW THE SILENCE
- Who is conspicuously NOT talking?
- What topics are being avoided?
- Who hasn't been asked to comment?
- What questions have been deflected?
- What's the dog that didn't bark?
- Who would know but hasn't been asked?
- What records should exist but don't?

### 3. FOLLOW THE TIMELINE
- What happened right before the key event?
- What happened right after?
- When did people first know?
- Who told whom, in what order?
- What's the gap between knowing and acting?
- Are there timeline contradictions?
- What's the earliest documented instance?

### 4. FOLLOW THE RELATIONSHIPS
- Who knows whom?
- Who introduced whom?
- Who worked together before?
- Who has shared business interests?
- Who has personal connections?
- Who went to school together?
- Who serves on the same boards?
- Who has overlapping social circles?

### 5. FOLLOW THE CONTRADICTIONS
- Who changed their story?
- What statements don't match documents?
- What doesn't add up?
- Where does the official narrative strain credibility?
- What explanations have shifted over time?
- Who said different things to different audiences?

### 6. FOLLOW THE DOCUMENTS
- What documents should exist?
- What documents are missing?
- What was deleted or destroyed?
- What's in the footnotes?
- What's in the metadata?
- What's been FOIA'd but not released?
- What court filings exist?
- What financial disclosures exist?

### 7. FOLLOW THE PATTERNS
- Has this happened before?
- Are there similar cases?
- Are the same players involved elsewhere?
- Is this part of a larger pattern?
- What's the precedent?
- Who else has made similar claims?
- Are there parallel investigations?

### 8. COUNTERFACTUAL THINKING
- What would prove this wrong?
- What's the alternative explanation?
- What would we expect to see if the opposite were true?
- What's the strongest version of the other side?
- What evidence would change your mind?
- What's the null hypothesis?

### 9. THE UNCOMFORTABLE QUESTIONS
- What question would make people defensive?
- What question would they refuse to answer?
- What question has never been asked publicly?
- What question would a hostile critic ask?
- What would a lawyer advise them not to answer?

### 10. THE META QUESTIONS
- Why is this story being told now?
- Who benefits from this framing?
- What's the narrative being sold?
- Who are the sources and why are they talking?
- What's being left out of the coverage?
- Why do we know what we know?

### 11. THE 5 WHYS (ROOT CAUSE ANALYSIS)

For each major finding, drill down to the root cause:

```
Finding: [X happened]
  → Why? [Because Y]
    → Why? [Because Z]
      → Why? [Because A]
        → Why? [Because B]
          → Why? [ROOT CAUSE]
```

- Why did this happen? (symptom level)
- Why did THAT happen? (process level)
- Why did THAT happen? (system level)
- Why did THAT happen? (organizational level)
- Why did THAT happen? (root cause / incentive level)

**The goal**: Get past symptoms to systemic causes. Most investigations stop at "who did it" - the 5 Whys asks "why was it possible?"

Key questions:
- What systemic failure enabled this?
- What incentives created this behavior?
- What oversight was missing?
- What would prevent this from happening again?
- Is this a one-off or a symptom of deeper problems?

### 12. FRAMING, CONTEXT & SENSE-MAKING

Every finding needs to be understood and contextualized. These questions help make sense of what you've found:

**Meaning & Interpretation**:
- What does this actually mean?
- How should we interpret this finding?
- What are the possible interpretations?
- Which interpretation is best supported by evidence?
- What are we missing to fully understand this?
- Does this confirm or contradict our working theory?

**Synthesis & Coherence**:
- How does this fit with everything else we know?
- Does this change the overall picture?
- What story do all the facts tell together?
- Are there contradictions we need to resolve?
- What's the simplest explanation that fits all the facts?
- What remains unexplained?

**Significance & Weight**:
- How important is this finding?
- Is this a smoking gun or circumstantial?
- What would change if this weren't true?
- Is this central to the investigation or peripheral?
- Should this change our priorities?

**Historical Context**:
- When did this pattern first emerge?
- What historical precedent exists?
- How does this compare to similar past events?
- What lessons from history apply?

**Industry/Sector Context**:
- Is this common in this industry?
- What's the industry standard?
- How do peers/competitors handle this?
- What regulatory context applies?

**Broader Significance**:
- What's the "so what?" - why does this matter?
- Who should care about this and why?
- What are the implications if this is true?
- What are the implications if this is false?
- What precedent does this set?

**Narrative Framing**:
- What's the simplest way to explain this?
- What's the most accurate frame?
- What frames are being pushed by each side?
- What frame would a neutral observer use?
- What's the one-sentence version?

**Audience Considerations**:
- How would different audiences interpret this?
- What context does a layperson need?
- What context does an expert need?
- What would be misleading without proper context?

**Future Implications**:
- What does this mean going forward?
- What should change as a result?
- Who needs to know about this?
- What decisions does this inform?

---

## STEP 1: LOAD CASE

```python
if case_id provided:
    load(cases/[case-id]/)
else:
    case_id = read(cases/.active)
    load(cases/[case_id]/)

# Read ALL files to understand current state
read(summary.md)
read(sources.md)
read(timeline.md)
read(people.md)
read(positions.md)
read(fact-check.md)
read(theories.md)
read(evidence.md)
read(iterations.md)
```

---

## STEP 2: PARALLEL QUESTION GENERATION

**Launch ALL of these simultaneously in ONE message to maximize parallel execution:**

### 2A: Deep Analytical Questions (Gemini - High Thinking)

```
mcp__mcp-gemini__generate_text:
  thinking_level: "high"
  system_prompt: |
    You are an elite investigative journalist with 30 years of experience
    breaking major stories. You've investigated corporate fraud, government
    corruption, and complex conspiracies.

    Your superpower: asking the questions others miss.

    Use these frameworks:
    - Follow the money
    - Follow the silence
    - Follow the relationships
    - Follow the contradictions
    - Follow the documents
    - Counterfactual thinking

    Generate questions that:
    - Reveal what's missing, not just what's there
    - Make powerful people uncomfortable
    - Challenge assumptions in the current investigation
    - Identify blind spots
    - Suggest new research directions

  prompt: |
    INVESTIGATION SUMMARY:
    [summary.md content]

    KEY PEOPLE:
    [people.md summary]

    POSITIONS DOCUMENTED:
    [positions.md summary]

    TIMELINE GAPS:
    [timeline.md gaps]

    Generate 15-25 NEW questions this investigation should be asking.
    Be specific. Name names. Suggest specific documents or sources.
    Group by framework (money, silence, relationships, etc.)
```

### 2B: Real-Time Questions (XAI - What's Being Asked Now)

```
mcp__mcp-xai__research:
  prompt: |
    For [TOPIC], find:
    1. What questions are people asking on social media?
    2. What questions are journalists asking?
    3. What questions are critics asking?
    4. What questions are supporters asking?
    5. What questions remain unanswered in public discourse?
    6. What new information has emerged that raises new questions?

    Focus on questions that reveal gaps in current coverage.
  sources: ["x", "web", "news"]
```

### 2C: X/Twitter Questions (XAI - Social Media Discourse)

```
mcp__mcp-xai__x_search:
  query: "[TOPIC] question OR unanswered OR why OR how"
  prompt: |
    Find the most interesting questions being asked about this topic.
    Focus on:
    - Questions from journalists and investigators
    - Questions from critics
    - Questions from affected parties
    - Questions that haven't been answered
```

### 2D: Adversarial Questions (Gemini - Devil's Advocate)

```
mcp__mcp-gemini__generate_text:
  thinking_level: "high"
  system_prompt: |
    You are a hostile opposing counsel preparing for cross-examination.
    Your job is to find EVERY weakness in this investigation.

    You want to:
    - Destroy the credibility of key claims
    - Find alternative explanations
    - Identify assumptions that weren't tested
    - Find what would exonerate the accused
    - Challenge the chain of evidence

  prompt: |
    INVESTIGATION SUMMARY:
    [summary.md content]

    KEY CLAIMS:
    [fact-check.md summary]

    Generate 10-15 ADVERSARIAL questions that:
    - Challenge the strongest claims
    - Propose alternative explanations
    - Identify untested assumptions
    - Point out missing exculpatory evidence
    - Question source credibility
```

### 2E: Pattern Recognition Questions (OpenAI Deep Research)

```
mcp__mcp-openai__deep_research:
  query: |
    Find similar cases, precedents, and patterns related to [TOPIC].
    - Has this happened before?
    - Are the same players involved in other cases?
    - What's the historical context?
    - Are there parallel investigations?
    - What patterns emerge across similar cases?
```

---

## STEP 3: SYNTHESIZE QUESTIONS

Collect all questions from parallel research and:

### 3A: Deduplicate
Remove questions that are essentially the same

### 3B: Categorize
Group questions by framework:
- Money questions
- Silence questions
- Timeline questions
- Relationship questions
- Contradiction questions
- Document questions
- Pattern questions
- Counterfactual questions
- Uncomfortable questions
- Meta questions
- 5 Whys / Root Cause questions
- Framing, Context & Sense-Making questions

### 3C: Prioritize
Rank by:
- **HIGH**: Could fundamentally change the investigation
- **MEDIUM**: Would fill important gaps
- **LOW**: Useful but not critical

### 3D: Actionability
For each question, note:
- What research would answer it?
- What sources should be checked?
- What MCP tools to use?

---

## STEP 4: OUTPUT

Generate a structured question report:

```markdown
# Investigation Questions: [Topic]

**Case**: [case-id]
**Generated**: [datetime]
**Questions Generated**: [N]

---

## Executive Summary

The investigation currently focuses on [X]. This question analysis reveals
blind spots in [Y areas] and suggests new research directions for [Z].

---

## Priority Questions

### HIGH PRIORITY (Investigation-Changing)

#### Q1: [Question]
- **Framework**: [Money/Silence/Timeline/etc.]
- **Why it matters**: [explanation]
- **How to answer**: [research approach]
- **Sources to check**: [specific sources]

#### Q2: [Question]
...

### MEDIUM PRIORITY (Gap-Filling)

#### Q5: [Question]
...

### LOW PRIORITY (Nice-to-Have)

#### Q10: [Question]
...

---

## Questions by Framework

### Follow the Money
1. [Question]
2. [Question]

### Follow the Silence
1. [Question]
2. [Question]

### Follow the Relationships
1. [Question]
2. [Question]

### Follow the Timeline
1. [Question]
2. [Question]

### Follow the Contradictions
1. [Question]
2. [Question]

### Follow the Documents
1. [Question]
2. [Question]

### Follow the Patterns
1. [Question]
2. [Question]

### Counterfactual Questions
1. [Question]
2. [Question]

### Uncomfortable Questions
1. [Question]
2. [Question]

### Meta Questions
1. [Question]
2. [Question]

### 5 Whys / Root Cause Analysis
1. [Question with 5-level drill-down]
2. [Question with 5-level drill-down]

### Framing, Context & Sense-Making Questions
1. [Question]
2. [Question]

---

## Unanswered Questions from Public Discourse

[Questions being asked on social media and in journalism that the
investigation hasn't addressed]

---

## Suggested Research Actions

| # | Question | Action | Tool | Priority |
|---|----------|--------|------|----------|
| 1 | [Q] | [Research approach] | [MCP tool] | HIGH |
| 2 | [Q] | [Research approach] | [MCP tool] | HIGH |
| ... |

---

## Next Steps

To incorporate these questions into the investigation:
1. Use `/investigate [case-id]` to resume
2. Focus on HIGH priority questions first
3. Each question suggests specific research approaches
```

---

## STEP 5: SAVE TO CASE

Save questions to case directory:

```
cases/[case-id]/questions-[datetime].md
```

This preserves the question generation for reference and prevents
re-asking the same questions.

---

## EXAMPLE OUTPUT

```markdown
# Investigation Questions: Acme Corp Fraud Case

**Case**: inv-20260105-143022
**Generated**: 2026-01-06 10:30
**Questions Generated**: 47

---

## Executive Summary

The investigation has thoroughly documented the fraud timeline and key players.
However, this analysis reveals significant blind spots in financial flows,
board member relationships, and regulatory interactions. The adversarial
analysis suggests the defense will focus on timeline ambiguity around
January 15th awareness.

---

## Priority Questions

### HIGH PRIORITY (Investigation-Changing)

#### Q1: What was discussed in the January 12th board dinner?
- **Framework**: Timeline / Silence
- **Why it matters**: This informal gathering occurred 3 days before the
  documented "first awareness" email. If the issue was discussed here,
  the entire timeline shifts.
- **How to answer**: Interview attendees, check expense reports, review
  calendar entries
- **Sources to check**: Board member calendars, restaurant reservations,
  expense reports

#### Q2: Where did the $2.3M from the Q4 adjustment actually go?
- **Framework**: Follow the Money
- **Why it matters**: This amount was written off as "operational adjustment"
  but no documentation supports this. If it went to individuals, that's
  material fraud.
- **How to answer**: Trace bank records, review wire transfers, check
  vendor payments in that period
- **Sources to check**: Bank records (subpoena), wire transfer logs,
  vendor contracts

#### Q3: Why has General Counsel Sarah Miller not been interviewed?
- **Framework**: Follow the Silence
- **Why it matters**: As GC, she would have been informed of any legal
  exposure. Her absence from all coverage is conspicuous.
- **How to answer**: Reach out directly, check for any statements,
  review court filings for her involvement
- **Sources to check**: Court documents, LinkedIn, bar association records

### MEDIUM PRIORITY (Gap-Filling)

#### Q5: Did the auditor raise concerns before the public disclosure?
- **Framework**: Follow the Documents
- **Why it matters**: Auditor communications are key to establishing
  corporate knowledge
- **How to answer**: FOIA audit working papers, check SEC filings
- **Sources to check**: SEC EDGAR, audit firm records

[...continues...]

---

## Questions by Framework

### Follow the Money
1. What was the total compensation change for executives after the restructuring?
2. Who held short positions before the announcement?
3. Were there any unusual related-party transactions in Q3-Q4?
4. What was the insurance payout and who received it?

### Follow the Silence
1. Why hasn't the CFO made any public statements since resignation?
2. What happened to the internal auditor who filed the initial report?
3. Why are no board members commenting on the timeline questions?

### 5 Whys / Root Cause Analysis
1. Why did the fraud go undetected for 18 months?
   → Why? Internal audit was understaffed
   → Why? Budget cuts in 2023
   → Why? Board prioritized growth over compliance
   → Why? Compensation tied to stock price
   → ROOT CAUSE: Incentive misalignment

2. Why did the CFO not escalate the concerns?
   → Why? Feared retaliation
   → Why? Previous whistleblower was fired
   → Why? No protected channels existed
   → Why? Legal never established them
   → ROOT CAUSE: Missing institutional safeguards

### Framing, Context & Sense-Making Questions
1. What does the 2-month awareness gap actually mean? Is it damning or explainable?
2. How does the $2.3M figure compare to industry norms for similar adjustments?
3. What's the simplest explanation that fits all the facts we have so far?
4. What regulatory precedent exists for this type of disclosure delay?
5. What's the one-sentence summary a general audience would understand?
6. What historical parallels (Enron, WorldCom, etc.) apply or don't apply?

[...continues...]
```

---

## WHEN TO USE /questions

| Situation | Use /questions? |
|-----------|-----------------|
| Starting a new investigation | YES - generate initial questions |
| Feeling stuck in an investigation | YES - find new angles |
| After verification finds gaps | YES - generate targeted questions |
| Before claiming completion | YES - ensure nothing missed |
| Resuming a stale case | YES - fresh perspective |

---

## THE INVESTIGATOR'S MINDSET

When generating questions, channel these principles:

1. **"What are they hiding?"** - Assume something is being concealed
2. **"Who benefits?"** - Every situation has winners
3. **"What's the simplest explanation?"** - Then test it
4. **"What would change my mind?"** - Stay open to being wrong
5. **"Who else knows?"** - Information spreads
6. **"Where's the paper trail?"** - Documents don't lie
7. **"What happened before/after?"** - Context matters
8. **"Who introduced whom?"** - Relationships explain behavior
9. **"Why now?"** - Timing is never accidental
10. **"What's not being said?"** - Silence speaks volumes
11. **"Why was this possible?"** - Get past symptoms to root causes
12. **"So what?"** - Every finding needs significance and context

---

## REMEMBER

> "The questions you don't ask are the stories you never get."

There are ALWAYS more questions. This command helps you find them.
