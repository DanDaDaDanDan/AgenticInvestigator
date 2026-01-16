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

Before external verification, perform two checks:

### 1a. Check for pending leads

```
Any lead with status: "pending" → NOT SATISFIED
```

Rule #8 requires ALL leads resolved. If any pending leads exist, return NOT SATISFIED immediately with the list of pending leads.

### 1b. Check for untracked lead markers

Scan all `questions/*.md` files for `<!-- LEAD:` markers and verify each has a corresponding entry in `leads.json`:

```bash
grep -r "<!-- LEAD:" questions/*.md
```

For each marker found, check that leads.json contains a lead with matching description. If any markers are untracked, return NOT SATISFIED with the list of missing leads.

Do not proceed to external verification until both checks pass.

---

## Step 2: Gather Full Context

Read every file. Store content for prompt construction.

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

### 2c. Read summary.md
```
Read summary.md in full
Store the complete content
```

### 2d. Read sources.json
```
Read sources.json in full
Store the complete content
```

---

## Step 3: External Model Verification (Parallel)

Call BOTH models with identical full context. They evaluate independently.

### Gemini 3 Pro

```
mcp__mcp-gemini__generate_text
  model: "gemini-3-pro"
  thinking_level: "high"
  prompt: |
    You are reviewing an investigation for completeness. Here is the full context:

    === LEADS (leads.json) ===
    [PASTE THE ENTIRE leads.json CONTENT]

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
    4. Search for `<!-- LEAD:` markers in question files - each MUST have a corresponding entry in leads.json
    5. Overall verdict: SATISFIED or NOT SATISFIED with specific gaps listed.
```

### GPT 5.2 Pro

Both models receive IDENTICAL full context for independent verification:

```
mcp__mcp-openai__generate_text
  model: "gpt-5.2-pro"
  reasoning_effort: "high"
  prompt: |
    You are reviewing an investigation for completeness. Here is the full context:

    === LEADS (leads.json) ===
    [PASTE THE ENTIRE leads.json CONTENT]

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
    4. Search for `<!-- LEAD:` markers in question files - each MUST have a corresponding entry in leads.json
    5. Overall verdict: SATISFIED or NOT SATISFIED with specific gaps listed.
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
- Any `<!-- LEAD:` markers in question files without corresponding leads.json entry
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

**Return to orchestrator** (sub-agent output):
- Verdict: SATISFIED or NOT SATISFIED
- If NOT SATISFIED: List of specific gaps

---

## Next Step

- If SATISFIED: Orchestrator invokes `/article`
- If NOT SATISFIED: Orchestrator invokes `/follow` for identified gaps
