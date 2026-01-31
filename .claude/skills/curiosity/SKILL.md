---
name: curiosity
description: Evaluate lead exhaustion using external model verification
context: fork
agent: general-purpose
user-invocable: false
---

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

Before external verification, perform SEVEN checks. Checks 1a-1e must pass; 1f-1g are informational.

### 1a. Check for pending HIGH priority leads (HARD BLOCK)

```
Any lead with priority: "HIGH" AND status: "pending" → NOT SATISFIED
```

HIGH priority leads MUST be resolved. Return NOT SATISFIED immediately with the list of pending HIGH leads.

### 1b. Check for pending verification leads (HARD BLOCK)

```
Any lead where "verify" or "Verify" appears in lead text AND status: "pending" → NOT SATISFIED
```

Verification leads (e.g., "Verify specific dollar amount", "Verify statistic claim") are critical for accuracy. These MUST be resolved before completion.

### 1c. Check overall pending percentage

```
Count pending leads / Total leads > 40% → NOT SATISFIED
```

If more than 40% of leads are pending, the investigation is insufficiently thorough. Return the percentage and list of pending leads by priority.

### 1d. Check for pending leads (ALL)

```
Any lead with status: "pending" → NOT SATISFIED
```

Rule #9 requires ALL leads resolved. If any pending leads exist after checks 1a-1c, return NOT SATISFIED with the full list.

### 1e. Check for untracked lead markers

Scan all `questions/*.md` files for `<!-- LEAD:` markers and verify each has a corresponding entry in `leads.json`:

```bash
grep -r "<!-- LEAD:" questions/*.md
```

For each marker found, check that leads.json contains a lead with matching description. If any markers are untracked, return NOT SATISFIED with the list of missing leads.

### 1f. Check lead results have sources

For each lead with status "investigated":
```
If result contains specific numbers/statistics AND sources: [] is empty → FLAG
```

If any investigated leads have detailed results but no source captures, flag this for the external model evaluation (it should factor into SATISFIED/NOT determination).

### 1g. Check planning_todos completion

If `state.json.planning_todos` exists and is non-empty:
```
For each todo in planning_todos:
  If todo.status !== "completed" → FLAG for external model evaluation
```

Planning todos represent investigation priorities identified during the planning phase. Incomplete planning todos indicate the investigation strategy wasn't fully executed.

Do not proceed to external verification until checks 1a-1e pass. Checks 1f and 1g are informational for external models.

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

### 2c. Read all findings
```
Read each findings/F###.md file
Store the complete content of each
Or use: node scripts/findings.js assemble cases/<case-id>
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

    === FINDINGS (findings/*.md) ===
    [PASTE ALL FINDING FILES CONTENT]

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

    === FINDINGS (findings/*.md) ===
    [PASTE ALL FINDING FILES CONTENT]

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

- **Any HIGH priority leads with status "pending"** (HARD BLOCK)
- **Any verification leads ("Verify X") with status "pending"** (HARD BLOCK)
- **More than 40% of leads pending** (HARD BLOCK)
- Any leads with status "pending" (after above checks)
- Any LOW confidence answers not acknowledged as known limitations
- Any `<!-- LEAD:` markers in question files without corresponding leads.json entry
- Investigated leads with specific claims but empty `sources[]`
- Incomplete planning_todos (if planning phase was used)
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
