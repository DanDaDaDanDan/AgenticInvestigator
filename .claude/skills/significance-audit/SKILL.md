---
name: significance-audit
description: Quality Gate 10 - Verify clear takeaway and novel findings identification
context: fork
agent: general-purpose
user-invocable: false
argument-hint: [case-id]
---

# /significance-audit - Quality Gate 10

Verify the article has a clear takeaway, identifies novel findings, and passes the "so what?" test.

## Usage

```
/significance-audit              # Audit active case
/significance-audit [case-id]    # Audit specific case
```

## Gate 10 Criteria

This gate passes when:
1. The main takeaway can be stated in one clear sentence
2. Novel findings are explicitly identified
3. The "so what?" question is answered - reader understands why this matters

## Audit Process

### Step 1: Takeaway Clarity

Read `articles/full.md` and extract:

1. What is the ONE main point the reader should take away?
2. Is this stated clearly in the article (introduction and/or conclusion)?
3. Can you summarize it in one sentence?

**Failure mode**: Article presents many facts but no clear synthesis or conclusion.

### Step 2: Novel Findings Identification

Identify what this investigation reveals that:
- Was not previously public knowledge
- Contradicts common assumptions
- Provides new data or analysis
- Synthesizes disparate information into new insight

Ask: "After reading this, what does the reader know that they couldn't have known before?"

If the answer is "nothing new" - that's a failure.

### Step 3: "So What?" Test

Answer these questions:
- Why should anyone care about these findings?
- Who is affected and how?
- What decisions might change based on this information?
- What actions could be taken as a result?

**Failure mode**: The article presents interesting facts but doesn't explain their significance.

## Output

### If PASS

```
Significance Audit: PASS

Takeaway:
"[One sentence summary of main point]"
Location in article: [introduction/conclusion reference]

Novel Findings:
1. [Finding 1] - Previously [unknown/assumed otherwise]
2. [Finding 2] - New synthesis of [X and Y]
3. [Finding 3] - Data showing [Z]

Significance ("So What?"):
- Affects: [who/what]
- Implications: [what changes]
- Action items: [what can be done]
```

Update `state.json`:
```json
"gates": {
  ...
  "significance": true
}
```

### If FAIL

```
Significance Audit: FAIL

FAIL_TAKEAWAY:
- No clear main point identified
- Multiple competing conclusions without synthesis
- Article trails off without conclusion

FAIL_NOVELTY:
- All findings are already public knowledge
- No new analysis or synthesis provided
- Investigation confirms known information without adding value

FAIL_SIGNIFICANCE:
- "So what?" not answered
- Implications not explained
- Reader left without understanding why this matters
```

Do NOT update gate. Return specific issues to fix.

## Required Actions on Failure

| Failure Type | Required Fix |
|--------------|--------------|
| FAIL_TAKEAWAY | Add clear thesis statement; write synthesis conclusion |
| FAIL_NOVELTY | Highlight what's new; add "What This Investigation Found" section |
| FAIL_SIGNIFICANCE | Add "Why This Matters" section; explain implications |

After fixes, re-run `/action significance-audit`.

## Distinguishing Levels of Novelty

**High novelty** (strongest):
- Primary source documents never before public
- Original data analysis producing new findings
- Contradicting widely-held beliefs with evidence

**Medium novelty** (acceptable):
- Synthesis of scattered information into coherent picture
- Applying known framework to new domain
- Quantifying what was previously qualitative

**Low novelty** (requires justification):
- Confirming conventional wisdom
- Summarizing existing reporting
- Restating official positions

Low novelty isn't automatic failure but requires the "so what?" to be especially clear.

## The "Grandmother Test"

If you explained this investigation to someone outside the field:
- Could they understand why it matters?
- Would they remember the key finding?
- Would they tell someone else about it?

If no to all three, the significance section needs work.
