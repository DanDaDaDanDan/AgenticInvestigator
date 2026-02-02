---
name: balance-audit
description: Quality Gate 8 - Verify stakeholder representation and counterargument coverage
context: fork
agent: general-purpose
user-invocable: false
argument-hint: [case-id]
---

# /balance-audit - Quality Gate 8

Verify all stakeholders are represented and strongest counterarguments are addressed.

## Usage

```
/balance-audit              # Audit active case
/balance-audit [case-id]    # Audit specific case
```

## Gate 8 Criteria

This gate passes when:
1. All stakeholders mentioned in the investigation have a voice
2. The strongest counterargument to the main thesis is addressed
3. No one-sided framing is detected

## Audit Process

### Step 1: Stakeholder Inventory

Read `articles/full.md` and identify all stakeholders mentioned:
- Organizations, companies, agencies
- Named individuals
- Groups/populations affected
- Industry sectors
- Regulatory bodies

For each stakeholder, answer:
- Is their perspective represented?
- Are they quoted or cited directly, or only described?
- If criticized, is their response included?

### Step 2: Steelman Test

Identify the main thesis/conclusion of the article.

Ask: "What is the STRONGEST argument AGAINST this thesis?"

Then verify:
- Is this counterargument addressed in the article?
- Is it addressed fairly (not strawmanned)?
- Are there sources supporting the counterargument?

### Step 3: Framing Audit

Scan for:
- Loaded language (adjectives that presume guilt/innocence)
- Asymmetric treatment (harsh language for one side, soft for another)
- Selective emphasis that favors one interpretation
- Missing "declined to comment" where subject not quoted

## Output

### If PASS

Write `balance-audit.md` containing:

```markdown
# Balance Audit

## Stakeholders Represented
Stakeholders represented: [count]
- [stakeholder 1]: quoted/cited
- [stakeholder 2]: perspective included
...

## Steelman Test
Main thesis: "[thesis]"
Strongest counterargument: "[counterargument]"
Addressed in: [section reference]

## Framing
[BALANCED / notes]

## Status

**PASS**
```

Update `state.json`:
```json
"gates": {
  ...
  "balance": true
}
```

### If FAIL

Write `balance-audit.md` containing:

```markdown
# Balance Audit

## FAIL_STAKEHOLDER
- [stakeholder X] mentioned but not represented
- Missing perspective on [topic]

## FAIL_STEELMAN
- Main thesis: "[thesis]"
- Unaddressed counterargument: "[counterargument]"

## FAIL_FRAMING
- "[quoted text]" uses loaded language
- Asymmetric treatment of [parties]

## Status

**FAIL**
```

Do NOT update gate. Return specific issues to fix.

## Required Actions on Failure

| Failure Type | Required Fix |
|--------------|--------------|
| FAIL_STAKEHOLDER | Add stakeholder perspective, attempt contact, or note "X declined to comment" |
| FAIL_STEELMAN | Add section addressing the counterargument with sources |
| FAIL_FRAMING | Revise language to be neutral; add balancing perspectives |

After fixes, re-run `/action balance-audit`.

## Common Failure Patterns

1. **Silent subject** - Article criticizes organization but never quotes them
2. **Missing opposition** - Policy article without opposing viewpoint
3. **One-sided experts** - All quoted experts support same position
4. **Asymmetric skepticism** - Challenging one side's claims but accepting another's
5. **Verdict language** - Using conclusory terms for contested claims
