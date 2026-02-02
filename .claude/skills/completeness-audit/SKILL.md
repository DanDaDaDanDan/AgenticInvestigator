---
name: completeness-audit
description: Quality Gate 9 - Verify framework coverage and detect missing angles
context: fork
agent: general-purpose
user-invocable: false
argument-hint: [case-id]
---

# /completeness-audit - Quality Gate 9

Verify framework insights are reflected in article and no obvious angles are missing.

## Usage

```
/completeness-audit              # Audit active case
/completeness-audit [case-id]    # Audit specific case
```

## Gate 9 Criteria

This gate passes when:
1. Key insights from framework questions are reflected in the article
2. No obvious angles or perspectives are missing
3. Investigated leads are appropriately represented

## Audit Process

### Step 0: Refined Prompt Alignment (Must Pass)

Read `refined_prompt.md` and extract the explicit deliverables (the questions the user actually asked, required comparisons, requested outputs).

Then verify `articles/full.md` clearly addresses each deliverable. If the article drifts into tangents that crowd out the deliverables, fail:

```
FAIL_ALIGNMENT:
- Deliverable not addressed: <what refined_prompt asked>
- Article over-focuses on: <tangent> (crowds out required coverage)
```

### Step 1: Framework Coverage Check

For each `questions/*.md` file with Status: investigated:

1. Extract the key findings/insights documented
2. Check if these insights appear in `articles/full.md`
3. Flag frameworks where significant insights are missing from the article

**Not every framework insight must appear verbatim**, but key findings that would materially affect reader understanding should be represented.

### Step 2: Gap Detection

Read the article's topic and main findings. Then ask:

"Given this topic, what would a knowledgeable reader expect to see covered that is NOT addressed?"

Consider:
- Historical context
- Comparative analysis
- Key statistics or data points
- Affected parties not discussed
- Obvious follow-up questions left unanswered

### Step 3: Dropped Thread Detection

Review `leads.json` for leads with `status: investigated`.

For each investigated lead with non-trivial findings:
- Is the result reflected in the article?
- If not, should it be?

**Dropped threads** are investigated leads that produced significant findings but are not mentioned.

## Output

### If PASS

Write `completeness-audit.md` containing:

```markdown
# Completeness Audit

## Refined Prompt Alignment
[PASS notes: each refined_prompt deliverable addressed]

## Framework Coverage
Framework Coverage: [X]/35 frameworks → article
[Notes]

## Gap Detection
[Notes]

## Dropped Threads
[None / list]

## Status

**PASS**
```

Update `state.json`:
```json
"gates": {
  ...
  "completeness": true
}
```

### If FAIL

Write `completeness-audit.md` containing:

```markdown
# Completeness Audit

## FAIL_ALIGNMENT
- Deliverable not addressed: <what refined_prompt asked>
- Article over-focuses on: <tangent> (crowds out required coverage)

## FAIL_FRAMEWORK
- Framework 07 (Stakeholder Mapping): Key insight about [X] not in article
- Framework 23 (Marketing vs Reality): Finding about [Y] missing

## FAIL_GAP
- Expected coverage of [topic aspect] not found
- Reader would expect [X] to be addressed

## FAIL_DROPPED
- Lead L023 found [significant finding] but article doesn't mention it
- Lead L041 result contradicts article claim but not addressed

## Status

**FAIL**
```

Do NOT update gate. Return specific issues to fix.

## Required Actions on Failure

| Failure Type | Required Fix |
|--------------|--------------|
| FAIL_FRAMEWORK | Add the missing insight to relevant article section |
| FAIL_GAP | Research the missing angle and add coverage |
| FAIL_DROPPED | Incorporate lead findings into article or explain omission |

After fixes, re-run `/action completeness-audit`.

## Framework Priority

Not all frameworks are equally important for every topic. Focus on:

1. Frameworks with HIGH-confidence findings
2. Frameworks that generated multiple leads
3. Frameworks where the insight directly addresses the main question
4. Frameworks with unique perspectives not covered elsewhere

## Distinguishing Trivial from Significant Gaps

**Significant gaps** (must fix):
- Missing perspective that materially changes conclusion
- Data that would contradict or qualify main claims
- Stakeholder voice essential to fairness

**Trivial gaps** (acceptable to skip):
- Tangential historical context
- Related but distinct topics
- Deep technical details beyond scope
