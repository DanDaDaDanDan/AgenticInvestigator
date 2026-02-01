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

```
Completeness Audit: PASS

Framework Coverage: [X]/35 frameworks → article
Key insights from all investigated frameworks are represented.

Gap Detection: No obvious missing angles
- Topic sufficiently covered
- Expected perspectives included

Dropped Threads: None
All significant lead results are represented in the article.
```

Update `state.json`:
```json
"gates": {
  ...
  "completeness": true
}
```

### If FAIL

```
Completeness Audit: FAIL

FAIL_FRAMEWORK:
- Framework 07 (Stakeholder Mapping): Key insight about [X] not in article
- Framework 23 (Marketing vs Reality): Finding about [Y] missing

FAIL_GAP:
- Expected coverage of [topic aspect] not found
- Reader would expect [X] to be addressed

FAIL_DROPPED:
- Lead L023 found [significant finding] but article doesn't mention it
- Lead L041 result contradicts article claim but not addressed
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
