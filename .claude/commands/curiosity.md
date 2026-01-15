# /curiosity - Evaluate Lead Exhaustion

Determine if the investigation has been pursued thoroughly using external model verification.

## Usage

```
/curiosity
```

## Task

Feed the full investigation context to external models for genuine evaluation of completeness.

---

## Step 1: Gather Context

Read and compile into a single context document:

1. **leads.json** - Note pending vs investigated, especially MEDIUM+ priority pending
2. **All 35 question files** (`questions/*.md`) - Note confidence levels (LOW/MEDIUM need attention)
3. **summary.md** - Current state of findings
4. **sources.json** - What sources were captured

Count:
- Pending leads by priority (HIGH/MEDIUM/LOW)
- Confidence levels across all question answers
- Sources captured

---

## Step 2: External Model Verification

### Gemini 3 Pro (Full Context)

Feed the entire context to Gemini 3 Pro which handles massive input:

```
mcp__mcp-gemini__generate_text
  model: "gemini-3-pro"
  thinking_level: "high"
  prompt: |
    You are reviewing an investigation for completeness. Here is the full context:

    [LEADS]
    {leads.json content}

    [QUESTION FRAMEWORKS - All 35]
    {all question file contents}

    [SUMMARY]
    {summary.md content}

    [SOURCES]
    {sources.json content}

    EVALUATE:
    1. Are there MEDIUM+ priority leads still pending that should be investigated?
    2. Are there LOW/MEDIUM confidence answers that need more research?
    3. What obvious questions would a reader ask that aren't answered?
    4. Are there leads generated in the question files that weren't added to leads.json?
    5. Overall verdict: SATISFIED or NOT SATISFIED with specific gaps listed.
```

### GPT 5.2 Pro (Extended Thinking)

Feed a summary to GPT 5.2 Pro for deep reasoning:

```
mcp__mcp-openai__generate_text
  model: "gpt-5.2-pro"
  reasoning_effort: "high"
  prompt: |
    Review this investigation summary for completeness:

    LEAD STATUS:
    - HIGH pending: [count]
    - MEDIUM pending: [count]
    - LOW pending: [count]
    - Investigated: [count]
    - Dead end: [count]

    CONFIDENCE LEVELS ACROSS 35 FRAMEWORKS:
    - HIGH confidence: [count]
    - MEDIUM confidence: [count]
    - LOW confidence: [count]

    TOP 10 PENDING MEDIUM+ LEADS:
    [list them]

    LOW CONFIDENCE ANSWERS:
    [list the questions with LOW confidence]

    Is this investigation thorough? What gaps remain?
    Verdict: SATISFIED or NOT SATISFIED with reasoning.
```

---

## Step 3: Evaluate Results

Both models must agree on SATISFIED, or the investigation continues.

If either model identifies gaps:
- List specific leads to pursue
- List specific questions needing higher confidence
- Return NOT SATISFIED

---

## Red Flags (Automatic NOT SATISFIED)

- Any HIGH priority leads pending
- More than 10 MEDIUM priority leads pending
- Any LOW confidence answers not acknowledged as limitations
- Leads generated in question files but never added to leads.json
- Either external model returns NOT SATISFIED

---

## Output

Update `state.json`:

```json
{
  "gates": {
    "curiosity": true  // only if BOTH models agree
  }
}
```

Document the evaluation:
- Gemini verdict and key points
- GPT verdict and key points
- Specific gaps if NOT SATISFIED

---

## Next Step

- If SATISFIED: Orchestrator invokes `/article`
- If NOT SATISFIED: Orchestrator invokes `/follow` for identified gaps
