# /curiosity - Evaluate Lead Exhaustion

Determine if all leads have been pursued to conclusion.

## Usage

```
/curiosity
```

## Task

Verify that ALL leads have been pursued to a terminal state, then evaluate if the investigation is truly complete.

## Mandatory Lead Check (No Discretion)

**BEFORE any judgment calls, verify:**

```
For EVERY lead in leads.json:
  status MUST be "investigated" OR "dead_end"

  If ANY lead has status "pending" → AUTOMATIC FAIL
```

**There is NO discretion here.** Every lead must be pursued. You cannot skip leads because:
- They seem low value
- They're difficult to research
- They're tangential
- Similar leads were already investigated
- Time/effort concerns

If a lead exists, it must be investigated or proven to be a genuine dead end.

## This Requires Genuine Judgment (After Lead Check)

Once all leads are terminal, use **extended thinking** for completeness evaluation:

- `mcp__mcp-openai__generate_text` (GPT 5.2 Pro) for deep reasoning

## Evaluation Criteria

### 1. Lead Coverage (Mandatory - No Exceptions)

- Are ALL leads in a terminal state? (investigated or dead_end)
- If ANY lead is "pending" → AUTOMATIC FAIL, stop evaluation
- Were dead_end determinations genuine? (multiple search attempts, documented failure)

### 2. Thread Completion

For each interesting discovery:
- Did we follow it until we hit a dead end? OR
- Did we find the answer? OR
- Did we document why we stopped?

### 3. Reader Questions

- What questions would a curious reader ask that we haven't addressed?
- Are there obvious "nagging questions" left unanswered?
- Is there anything we're avoiding because it's hard to research?

### 4. Counterfactual Search

- Did we look for what we DIDN'T want to find?
- Did we seek out contradicting evidence?
- Did we steelman opposing viewpoints?

### 5. Expert Perspective

- Would a domain expert consider our research thorough?
- Are there obvious expert-level questions we missed?
- Did we consult scientific/academic sources?

### 6. Novel Angles

- Did we discover case-specific questions beyond the 35 frameworks?
- Did we pursue those novel questions?
- Are there unique aspects of this topic we haven't explored?

## Red Flags (Automatic NOT SATISFIED)

- **ANY lead still "pending"** (not just HIGH priority - ALL leads)
- Lead marked "dead_end" without genuine investigation attempt
- Contradiction identified but not explored
- Expert disagrees with conclusion but we didn't investigate why
- "Low confidence" answers without attempt to improve
- Novel question identified but not pursued
- MEDIUM priority leads skipped with "judgment call" rationale

## Output

Update `state.json` with curiosity verdict:

```json
{
  "gates": {
    "curiosity": true  // or false
  }
}
```

If NOT SATISFIED, also document:
- Which leads need more work
- What questions remain unanswered
- What the orchestrator should do next

## Verdicts

### SATISFIED

All criteria met. No significant unexplored threads.
Return: "Gate 2 (Curiosity): PASS"

### NOT SATISFIED

Outstanding issues remain.
Return: "Gate 2 (Curiosity): FAIL - [specific issues]"

Example:
```
Gate 2 (Curiosity): FAIL
- L012 (HIGH) still pending: "What do ethologists say about stress indicators?"
- Framework 24 (Subject Experience) has low-confidence answers
- No scientific sources for welfare claims
- Novel question about regulatory enforcement not pursued
```

## Next Step

- If SATISFIED: Orchestrator invokes `/article`
- If NOT SATISFIED: Orchestrator invokes `/follow` for outstanding leads
