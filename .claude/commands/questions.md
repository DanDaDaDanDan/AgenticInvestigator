# Investigation Questions Generator (Orchestrator Mode)

You are the **orchestrator** running the questions engine. You dispatch question generation agents - you do NOT generate questions directly.

---

## CRITICAL: ORCHESTRATOR-ONLY

**You do NOT:**
- Call MCP tools directly
- Read full file contents
- Process question results
- Write to files directly

**You ONLY:**
- Read _state.json for current status
- Dispatch question generation agents (parallel)
- Wait for completion
- Read brief status from agents

---

## USAGE

```
/questions              # Generate questions for active case
/questions [case-id]    # Generate questions for specific case
```

---

## QUICK REFERENCE: 20 FRAMEWORKS

| # | Framework | Category | Key Question | When to Use |
|---|-----------|----------|--------------|-------------|
| 1 | Follow the Money | Core | Who benefits financially? | Always |
| 2 | Follow the Silence | Core | Who's NOT talking? | Always |
| 3 | Follow the Timeline | Core | What happened before/after? | Always |
| 4 | Follow the Documents | Core | What paper trail exists? | Always |
| 5 | Follow the Relationships | People | Who knows whom? | Always |
| 6 | Follow the Contradictions | Core | Who changed their story? | Always |
| 7 | Stakeholder Mapping | People | Who has power/interests? | Early |
| 8 | Network Analysis | People | Who connects the players? | Mid |
| 9 | Means/Motive/Opportunity | People | Who could have done it? | Mid |
| 10 | ACH (Competing Hypotheses) | Analysis | Which theory fits evidence? | Mid |
| 11 | Key Assumptions Check | Analysis | What are we assuming? | Mid |
| 12 | Follow the Patterns | Analysis | Has this happened before? | Mid |
| 13 | Counterfactual Thinking | Adversarial | What would prove this wrong? | Late |
| 14 | Pre-Mortem Analysis | Adversarial | If we're wrong, why? | Late |
| 15 | Cognitive Bias Check | Adversarial | Where are our blind spots? | Late |
| 16 | Uncomfortable Questions | Adversarial | What would they refuse to answer? | Always |
| 17 | Second-Order Effects | Context | What happens after the consequence? | Late |
| 18 | Meta Questions | Context | Why is this story being told now? | Mid |
| 19 | 5 Whys (Root Cause) | Root Cause | Why was this possible? | Mid/Late |
| 20 | Framing & Sense-Making | Context | What does this actually mean? | Always |

---

## SELECTION GUIDE: WHICH FRAMEWORKS WHEN

### Early Investigation (Gathering Facts)
**Use these 8 frameworks:**
- Follow the Money, Silence, Timeline, Documents, Contradictions (Core)
- Follow the Relationships, Stakeholder Mapping (People)
- Framing & Sense-Making (Context)

### Mid Investigation (Building Understanding)
**Add these 6 frameworks:**
- Network Analysis, Means/Motive/Opportunity (People)
- ACH, Key Assumptions Check, Follow the Patterns (Analysis)
- Meta Questions, 5 Whys (Context/Root Cause)

### Late Investigation (Stress Testing)
**Add these 4 frameworks:**
- Counterfactual Thinking, Pre-Mortem, Cognitive Bias Check (Adversarial)
- Second-Order Effects (Context)

### When Stuck
**Focus on:**
- Pre-Mortem Analysis ("If this investigation is wrong, why?")
- Cognitive Bias Check ("What are we missing?")
- Uncomfortable Questions ("What would they refuse to answer?")

---

## CATEGORY 1: CORE INVESTIGATION

These six frameworks should be used in EVERY investigation:

### 1. FOLLOW THE MONEY
- Who benefits financially from this?
- Who loses financially?
- Who funded this person/organization/effort?
- Where did the money come from? Where did it go?
- Who stands to gain from each outcome?
- What are the financial incentives?
- Are there undisclosed financial relationships?
- What's the compensation structure and how does it drive behavior?

### 2. FOLLOW THE SILENCE
- Who is conspicuously NOT talking?
- What topics are being avoided?
- Who hasn't been asked to comment?
- What questions have been deflected?
- What's the dog that didn't bark?
- Who would know but hasn't been asked?
- What records should exist but don't?
- Who has lawyered up?

### 3. FOLLOW THE TIMELINE
- What happened right before the key event?
- What happened right after?
- When did people first know?
- Who told whom, in what order?
- What's the gap between knowing and acting?
- Are there timeline contradictions?
- What's the earliest documented instance?
- What decisions were made at each point?

### 4. FOLLOW THE DOCUMENTS
- What documents should exist?
- What documents are missing?
- What was deleted or destroyed?
- What's in the footnotes?
- What's in the metadata?
- What's been FOIA'd but not released?
- What court filings exist?
- What financial disclosures exist?
- What emails/texts/messages exist?

### 5. FOLLOW THE CONTRADICTIONS
- Who changed their story?
- What statements don't match documents?
- What doesn't add up?
- Where does the official narrative strain credibility?
- What explanations have shifted over time?
- Who said different things to different audiences?
- What's the gap between public statements and private actions?

### 6. UNCOMFORTABLE QUESTIONS
- What question would make people defensive?
- What question would they refuse to answer?
- What question has never been asked publicly?
- What question would a hostile critic ask?
- What would a lawyer advise them not to answer?
- What question do insiders whisper about but won't say on record?

---

## CATEGORY 2: PEOPLE & NETWORKS

Map the human landscape systematically:

### 7. STAKEHOLDER MAPPING
- Who are ALL the stakeholders in this situation?
- What are each stakeholder's interests?
- What is each stakeholder's power/influence?
- Who has formal authority vs. informal influence?
- What coalitions exist?
- Who is aligned with whom?
- Whose interests conflict?
- Who has the most to lose? Most to gain?

### 8. NETWORK ANALYSIS
- Who is the connector between different groups?
- What's the shortest path between key players?
- Who bridges different worlds (business/politics/media)?
- Who are the gatekeepers?
- What nodes would break the network if removed?
- Who has access that others don't?
- What's the information flow path?
- Who introduced whom to whom?

### 9. MEANS, MOTIVE, OPPORTUNITY
- Who had the MEANS to do this? (capability, resources, access)
- Who had the MOTIVE? (benefit, grudge, ideology, pressure)
- Who had the OPPORTUNITY? (access, timing, position)
- Where do all three overlap?
- Who had means but not motive?
- Who had motive but not opportunity?
- What does the intersection tell us?

### 10. FOLLOW THE RELATIONSHIPS
- Who knows whom personally?
- Who introduced whom?
- Who worked together before?
- Who has shared business interests?
- Who has personal connections (family, romance, friendship)?
- Who went to school together?
- Who serves on the same boards?
- Who has overlapping social circles?
- What's the history between key players?

---

## CATEGORY 3: HYPOTHESIS & ANALYSIS

Systematically evaluate competing explanations:

### 11. ACH (ANALYSIS OF COMPETING HYPOTHESES)

For each major question, list ALL plausible hypotheses and evaluate:

```
Hypothesis A: [Theory 1]
Hypothesis B: [Theory 2]
Hypothesis C: [Theory 3]

For each piece of evidence:
- Does it support, contradict, or is it neutral to each hypothesis?
- Which hypothesis is LEAST contradicted by the evidence?
- What's the DIAGNOSTIC evidence (supports one, contradicts others)?
```

Key questions:
- What are ALL plausible explanations?
- What evidence distinguishes between hypotheses?
- Which hypothesis requires the fewest assumptions?
- What evidence would we expect if each hypothesis were true?
- What evidence is conspicuously absent for each?

### 12. KEY ASSUMPTIONS CHECK
- What are we assuming to be true without evidence?
- What if that assumption is wrong?
- Which assumptions are "load-bearing" (whole theory collapses if wrong)?
- What assumptions are we making about:
  - People's motivations?
  - Timeline accuracy?
  - Document authenticity?
  - Source reliability?
  - Cause and effect relationships?
- What would we do differently if each assumption were false?

### 13. FOLLOW THE PATTERNS
- Has this happened before?
- Are there similar cases?
- Are the same players involved elsewhere?
- Is this part of a larger pattern?
- What's the precedent?
- Who else has made similar claims?
- Are there parallel investigations?
- What do similar cases reveal about likely outcomes?
- Is this an isolated incident or symptom of something systemic?

---

## CATEGORY 4: ADVERSARIAL & STRESS TESTING

Challenge your own conclusions ruthlessly:

### 14. COUNTERFACTUAL THINKING
- What would prove this wrong?
- What's the alternative explanation?
- What would we expect to see if the opposite were true?
- What's the strongest version of the other side?
- What evidence would change your mind?
- What's the null hypothesis?
- What if the most incriminating evidence has an innocent explanation?

### 15. PRE-MORTEM ANALYSIS

Imagine the investigation is completely wrong. Work backwards:

```
"It's 6 months from now. This investigation was wrong.
What happened? What did we miss?"
```

- What's our biggest blind spot?
- What information could emerge that would invalidate our findings?
- What are we most confident about that could be wrong?
- Who might have deceived us and how?
- What documents might be forged or misleading?
- What sources might have ulterior motives?
- What would a successful coverup look like?

### 16. COGNITIVE BIAS CHECK

Audit your own thinking for common biases:

| Bias | Check Question |
|------|----------------|
| Confirmation | Are we seeking info that confirms what we already believe? |
| Anchoring | Are we over-weighting the first information we received? |
| Availability | Are we over-weighting vivid or recent information? |
| Authority | Are we believing sources because of who they are, not what they say? |
| Groupthink | Are we agreeing with consensus without independent analysis? |
| Sunk cost | Are we sticking with a theory because we've invested in it? |
| Hindsight | Are we assuming the outcome was predictable when it wasn't? |

- What evidence have we dismissed too quickly?
- What sources have we trusted too easily?
- What alternative explanations have we not fully explored?
- Are we falling in love with a narrative?

---

## CATEGORY 5: CONTEXT & FRAMING

Understand significance and implications:

### 17. SECOND-ORDER EFFECTS

Think beyond immediate consequences:

```
Event → First-order effect → Second-order effect → Third-order effect
```

- What happens after the first consequence?
- What feedback loops exist?
- What unintended consequences might occur?
- How might different actors respond to the initial event?
- What precedent does this set?
- What becomes possible (or impossible) because of this?
- What are the downstream effects on related systems?

### 18. META QUESTIONS
- Why is this story being told now?
- Who benefits from this framing?
- What's the narrative being sold?
- Who are the sources and why are they talking?
- What's being left out of the coverage?
- Why do we know what we know?
- What agenda might be driving the information flow?
- Who controls the narrative?

### 19. FRAMING, CONTEXT & SENSE-MAKING

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
- What's the "so what?" - why does this matter?

**Context**:
- Historical: What precedent exists?
- Industry: Is this common in this sector?
- Regulatory: What rules apply?
- Comparative: How does this compare to similar cases?

---

## CATEGORY 6: ROOT CAUSE

Get past symptoms to systemic causes:

### 20. THE 5 WHYS (ROOT CAUSE ANALYSIS)

For each major finding, drill down:

```
Finding: [X happened]
  → Why? [Because Y]
    → Why? [Because Z]
      → Why? [Because A]
        → Why? [Because B]
          → Why? [ROOT CAUSE]
```

Levels:
1. Symptom level - What happened?
2. Process level - What process failed?
3. System level - What system allowed this?
4. Organizational level - What organizational factors contributed?
5. Incentive level - What incentives drove this behavior?

Key questions:
- What systemic failure enabled this?
- What incentives created this behavior?
- What oversight was missing?
- What would prevent this from happening again?
- Is this a one-off or a symptom of deeper problems?
- What's the root cause vs. the proximate cause?

---

## ORCHESTRATOR FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      QUESTIONS GENERATOR ORCHESTRATOR                        │
│                                                                              │
│  STEP 1: READ STATE                                                          │
│    - Read _state.json (small file, OK to read fully)                         │
│                                                                              │
│  STEP 2: DISPATCH QUESTION AGENTS (parallel, ONE message)                    │
│    - Agent 1: Core investigation questions                                   │
│    - Agent 2: Hypothesis & analysis questions                                │
│    - Agent 3: Adversarial questions                                          │
│    - Agent 4: Context & root cause questions                                 │
│    - Agent 5: Real-time questions                                            │
│    - Agent 6: Pattern research questions                                     │
│                                                                              │
│  STEP 3: WAIT FOR COMPLETION                                                 │
│    - All agents write to questions.md                                        │
│    - All agents return brief status                                          │
│                                                                              │
│  STEP 4: READ RESULTS                                                        │
│    - Report question count and priorities to user                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## DISPATCH QUESTION AGENTS

**Dispatch ALL in ONE message for parallel execution:**

### Agent 1: Core Investigation Questions

```
Task tool:
  subagent_type: "general-purpose"
  description: "Core investigation questions"
  prompt: |
    TASK: Generate core investigation questions

    CASE: cases/[case-id]/

    ACTIONS:
    1. Read summary.md and people.md

    2. Generate questions:
       mcp__mcp-gemini__generate_text
         thinking_level: "high"
         system_prompt: "You are an elite investigative journalist..."
         prompt: "[content] - Generate 20 questions using Money, Silence, Timeline, Documents, Contradictions, Relationships frameworks"

    3. Write to questions.md (Core Investigation section)

    OUTPUT FILE: questions.md
    RETURN: Question count, high-priority count
```

### Agent 2: Hypothesis & Analysis Questions

```
Task tool:
  subagent_type: "general-purpose"
  description: "Hypothesis & analysis questions"
  prompt: |
    TASK: Generate analytical questions

    CASE: cases/[case-id]/

    ACTIONS:
    1. Read summary.md and fact-check.md

    2. Generate questions:
       mcp__mcp-gemini__generate_text
         thinking_level: "high"
         system_prompt: "You are an intelligence analyst..."
         prompt: "[content] - Generate 15 questions using ACH, Assumptions, Patterns, Means/Motive/Opportunity"

    3. Append to questions.md (Hypothesis & Analysis section)

    OUTPUT FILE: questions.md
    RETURN: Question count
```

### Agent 3: Adversarial Questions

```
Task tool:
  subagent_type: "general-purpose"
  description: "Adversarial questions"
  prompt: |
    TASK: Generate adversarial questions

    CASE: cases/[case-id]/

    ACTIONS:
    1. Read summary.md

    2. Generate questions:
       mcp__mcp-gemini__generate_text
         thinking_level: "high"
         system_prompt: "You are hostile opposing counsel AND a cognitive bias auditor..."
         prompt: "[content] - Generate 15 adversarial questions"

    3. Append to questions.md (Adversarial section)

    OUTPUT FILE: questions.md
    RETURN: Weakness count identified
```

### Agent 4: Context & Root Cause Questions

```
Task tool:
  subagent_type: "general-purpose"
  description: "Context & root cause questions"
  prompt: |
    TASK: Generate context and root cause questions

    CASE: cases/[case-id]/

    ACTIONS:
    1. Read summary.md

    2. Generate questions:
       mcp__mcp-gemini__generate_text
         thinking_level: "high"
         system_prompt: "You are a systems thinker..."
         prompt: "[content] - Generate 15 questions using Second-Order, Meta, 5 Whys"

    3. Append to questions.md (Context & Root Cause section)

    OUTPUT FILE: questions.md
    RETURN: Question count
```

### Agent 5: Real-Time Questions

```
Task tool:
  subagent_type: "general-purpose"
  description: "Real-time questions from discourse"
  prompt: |
    TASK: Find questions from public discourse

    CASE: cases/[case-id]/
    TOPIC: [topic from _state.json]

    ACTIONS:
    1. Search current discourse:
       mcp__mcp-xai__research
         prompt: "What questions are people asking about [topic]?"
         sources: ["x", "web", "news"]

    2. Extract unanswered questions

    3. Append to questions.md (Real-Time section)

    OUTPUT FILE: questions.md
    RETURN: New question count from discourse
```

### Agent 6: Pattern Research Questions

```
Task tool:
  subagent_type: "general-purpose"
  description: "Pattern and precedent research"
  prompt: |
    TASK: Research patterns and precedents

    CASE: cases/[case-id]/
    TOPIC: [topic from _state.json]

    ACTIONS:
    1. Run pattern research:
       mcp__mcp-openai__deep_research
         query: "Similar cases and patterns for [topic]"

    2. Extract pattern-based questions

    3. Append to questions.md (Patterns section)

    OUTPUT FILE: questions.md
    RETURN: Precedent count, pattern questions generated
```

---

## PARALLEL DISPATCH EXAMPLE

```
ONE MESSAGE with these Task tool calls:

Task 1: Core investigation questions agent
Task 2: Hypothesis & analysis questions agent
Task 3: Adversarial questions agent
Task 4: Context & root cause questions agent
Task 5: Real-time questions agent
Task 6: Pattern research questions agent

All agents write to questions.md.
Orchestrator waits for all to complete.
```

---

## SYNTHESIS & OUTPUT

### Categorize by Framework
Group all generated questions into the 20 frameworks.

### Prioritize
- **HIGH**: Could fundamentally change the investigation
- **MEDIUM**: Would fill important gaps
- **LOW**: Useful but not critical

### Output Format

```markdown
# Investigation Questions: [Topic]

**Case**: [case-id]
**Frameworks Applied**: [N of 20]
**Questions Generated**: [N]

---

## Executive Summary

Investigation stage: [Early/Mid/Late]
Primary gaps identified: [list]
Recommended focus: [frameworks]

---

## HIGH PRIORITY QUESTIONS

### Q1: [Question]
- **Framework**: [Name]
- **Why it matters**: [explanation]
- **How to answer**: [approach]

[...continues...]

---

## Questions by Category

### Core Investigation
[Questions from frameworks 1-6]

### People & Networks
[Questions from frameworks 7-10]

### Hypothesis & Analysis
[Questions from frameworks 11-13]

### Adversarial
[Questions from frameworks 14-16]

### Context & Framing
[Questions from frameworks 17-19]

### Root Cause
[Questions from framework 20]

---

## Suggested Research Actions

| Priority | Question | Framework | Tool | Action |
|----------|----------|-----------|------|--------|
| HIGH | [Q] | [F] | [MCP] | [Action] |
```

---

## THE INVESTIGATOR'S MINDSET

Channel these 20 principles:

1. **"What are they hiding?"** - Assume concealment
2. **"Who benefits?"** - Follow the incentives
3. **"What's the paper trail?"** - Documents don't lie
4. **"Who's NOT talking?"** - Silence speaks
5. **"What happened before/after?"** - Context matters
6. **"Who knows whom?"** - Relationships explain behavior
7. **"Who has power here?"** - Map the stakeholders
8. **"Who connects these people?"** - Find the network nodes
9. **"Who had means, motive, opportunity?"** - Classic forensics
10. **"Which theory fits the evidence?"** - Test hypotheses
11. **"What are we assuming?"** - Challenge assumptions
12. **"Has this happened before?"** - Find patterns
13. **"What would prove this wrong?"** - Steel-man the opposition
14. **"If we're wrong, why?"** - Pre-mortem thinking
15. **"What are our blind spots?"** - Audit for bias
16. **"What would they refuse to answer?"** - Ask the uncomfortable
17. **"What happens next?"** - Think second-order
18. **"Why is this story being told now?"** - Question the narrative
19. **"Why was this possible?"** - Find root causes
20. **"So what?"** - Every finding needs significance

---

## REMEMBER

> "The questions you don't ask are the stories you never get."

There are ALWAYS more questions. 20 frameworks. Zero excuses for missing angles.
