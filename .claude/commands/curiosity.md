# /curiosity - Evaluate Lead Exhaustion

Determine if the investigation has been pursued thoroughly using external model verification.

## Usage

```
/curiosity
```

## Task

Feed the full investigation context to external models for genuine evaluation of completeness.

---

## Step 1: Pre-Check (Automatic NOT SATISFIED)

Before external verification, check leads.json:

```
Any lead with status: "pending" → NOT SATISFIED
```

Rule #8 requires ALL leads resolved. If any pending leads exist, return NOT SATISFIED immediately with the list of pending leads. Do not proceed to external verification.

---

## Step 2: Gather Full Context

**YOU MUST ACTUALLY READ EVERY FILE.** Do not summarize or skip.

### 2a. Read leads.json
```
Read leads.json in full
Store the complete JSON
```

### 2b. Read ALL 35 question files
```
For each file in questions/*.md:
  Read the ENTIRE file
  Store the FULL content
```

Count across all files:
- Questions with HIGH confidence answers
- Questions with MEDIUM confidence answers
- Questions with LOW confidence answers
- Questions marked not-applicable

### 2c. Read summary.md
```
Read summary.md in full
Store the complete content
```

### 2d. Read sources.json
```
Read sources.json in full
Count total sources captured
```

---

## Step 3: Construct Prompts

### Gemini 3 Pro (Full Context)

Gemini handles massive input. Include EVERYTHING:

```
mcp__mcp-gemini__generate_text
  model: "gemini-3-pro"
  thinking_level: "high"
  prompt: |
    You are reviewing an investigation for completeness. Here is the full context:

    === LEADS (leads.json) ===
    [PASTE THE ENTIRE leads.json CONTENT HERE]

    === QUESTION FRAMEWORKS (35 files) ===

    --- 01-follow-the-money.md ---
    [PASTE ENTIRE FILE CONTENT]

    --- 02-follow-the-silence.md ---
    [PASTE ENTIRE FILE CONTENT]

    [... CONTINUE FOR ALL 35 FILES ...]

    === SUMMARY (summary.md) ===
    [PASTE ENTIRE FILE CONTENT]

    === SOURCES (sources.json) ===
    [PASTE ENTIRE FILE CONTENT]

    EVALUATE:
    1. Are all leads resolved (investigated or dead_end)?
    2. Are there LOW/MEDIUM confidence answers that need more research?
    3. What obvious questions would a reader ask that aren't answered?
    4. Are there leads mentioned in question files but not in leads.json?
    5. Overall verdict: SATISFIED or NOT SATISFIED with specific gaps listed.
```

### GPT 5.2 Pro (Extended Thinking)

Feed a structured summary for deep reasoning:

```
mcp__mcp-openai__generate_text
  model: "gpt-5.2-pro"
  reasoning_effort: "high"
  prompt: |
    Review this investigation for completeness:

    LEAD STATUS:
    - Total leads: [count]
    - Investigated: [count]
    - Dead end: [count]
    - Pending: [count] (should be 0)

    CONFIDENCE LEVELS ACROSS 35 FRAMEWORKS:
    - HIGH confidence: [count]
    - MEDIUM confidence: [count]
    - LOW confidence: [count]
    - Not applicable: [count]

    LOW CONFIDENCE ANSWERS (list each):
    [For each LOW confidence answer, include the question and answer text]

    MEDIUM CONFIDENCE ANSWERS (list each):
    [For each MEDIUM confidence answer, include the question and answer text]

    SOURCES CAPTURED: [count]

    Is this investigation thorough? What gaps remain?
    Verdict: SATISFIED or NOT SATISFIED with reasoning.
```

---

## Step 4: Evaluate Results

Both models must agree on SATISFIED, or the investigation continues.

If either model identifies gaps:
- List specific questions needing higher confidence
- List any missing leads
- Return NOT SATISFIED

---

## Red Flags (Automatic NOT SATISFIED)

- Any leads with status "pending"
- Any LOW confidence answers not acknowledged as known limitations
- Leads mentioned in question files but not in leads.json
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
- Pre-check result (pending leads count)
- Gemini verdict and key points
- GPT verdict and key points
- Specific gaps if NOT SATISFIED

---

## Next Step

- If SATISFIED: Orchestrator invokes `/article`
- If NOT SATISFIED: Orchestrator invokes `/follow` for identified gaps
