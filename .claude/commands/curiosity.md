# /curiosity - Evaluate Lead Exhaustion

Determine if all promising leads have been sufficiently explored.

## Usage

```
/curiosity
```

## Task

Make a judgment call: Have we followed all interesting threads to conclusion?

This is NOT a checklist. It requires genuine evaluation of investigation completeness.

## Evaluation Criteria

Answer these questions honestly:

### 1. Lead Coverage

- Have all HIGH priority leads been pursued to conclusion?
- Have all MEDIUM priority leads been either:
  - Pursued to conclusion, OR
  - Documented as not worth pursuing (with rationale)?
- Are there any leads marked "pending" that should have been investigated?

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

## Red Flags (Automatic NOT SATISFIED)

- Any HIGH priority lead still "pending"
- Lead marked "dead_end" without genuine investigation attempt
- Contradiction identified but not explored
- Expert disagrees with conclusion but we didn't investigate why
- "Low confidence" answers without attempt to improve

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
```

## Next Step

- If SATISFIED: Orchestrator invokes `/article`
- If NOT SATISFIED: Orchestrator invokes `/follow` for outstanding leads
