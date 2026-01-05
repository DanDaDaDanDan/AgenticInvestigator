# Investigation Verification

You are running a **verification checkpoint** on an investigation. This can be called:
- **Automatically** by /investigate every 5 iterations
- **Manually** to re-verify an existing case
- **Before completion** to ensure the investigation meets quality standards

---

## USAGE

```
/verify              # Verify active case
/verify [case-id]    # Verify specific case
```

---

## PURPOSE

The verification checkpoint ensures investigations are:
1. **Complete** - All threads explored, all positions covered
2. **Honest** - Not deceiving ourselves about coverage
3. **Balanced** - Claims from ALL positions fact-checked
4. **Thorough** - Alternative theories addressed, not ignored

---

## STEP 1: LOAD CASE

```python
if case_id provided:
    load(cases/[case-id]/summary.md)
    load(cases/[case-id]/iterations.md)
    load(cases/[case-id]/sources.md)
else:
    case_id = read(cases/.active)
    load(cases/[case_id]/summary.md)
    load(cases/[case_id]/iterations.md)
    load(cases/[case_id]/sources.md)
```

---

## STEP 2: CROSS-MODEL CRITIQUE

Use Gemini to critique the investigation with high thinking:

```
mcp__mcp-gemini__generate_text:
  thinking_level: "high"
  system_prompt: |
    You are a RUTHLESS investigative critic. Your job is to find EVERYTHING
    that's wrong, missing, or incomplete in this investigation.

    You are NOT here to praise. You are here to find gaps.

    Look for:
    - Claims that lack sufficient evidence
    - Logical gaps in reasoning
    - Biases in sourcing (too much from one position)
    - What would DISPROVE the current conclusions
    - What evidence is suspiciously ABSENT
    - Unexplored claims from ANY position
    - Alternative theories that haven't been addressed
    - Arguments from any position that haven't been steelmanned
    - People mentioned but not investigated
    - Claims asserted but not verified
    - Contradictions identified but not resolved

    Be specific. Name names. Cite missing evidence.

  prompt: |
    CRITICALLY REVIEW THIS INVESTIGATION:

    [Full summary.md content]

    Also review the detail file summaries:
    - positions.md summary (all positions)
    - theories.md summary
    - fact-check.md summary

    PROVIDE:

    1. SPECIFIC GAPS (list each one)
       - What specific claims are unverified?
       - What specific people weren't investigated?
       - What specific claims weren't fact-checked?

    2. UNEXPLORED CLAIMS BY POSITION
       For each position, what claims exist that weren't examined?

    3. ALTERNATIVE THEORIES NOT ADDRESSED
       What fringe claims are circulating that should be investigated?

    4. BIAS ASSESSMENT
       Is the investigation balanced? What position is overrepresented?

    5. VERDICT
       PASS (checklist complete, no major gaps) or FAIL (continue investigating)
```

---

## STEP 3: POSITION AUDIT

### 3A: List All Claims By Position

Search for claims from ALL positions/stakeholders:

```
mcp__mcp-xai__research:
  prompt: |
    Find ALL claims and arguments about [TOPIC].
    Include mainstream AND fringe claims.
    Include claims from ALL parties and stakeholders.
    Group by position/perspective.
  sources: ["x", "web", "news"]
```

For each claim found, check if it's addressed in fact-check.md:
- VERIFIED - claim investigated and found true
- DEBUNKED - claim investigated and found false
- PARTIAL - claim partially true
- UNEXAMINED - claim not addressed (GAP!)

### 3B: Check Each Position's Coverage

For each identified position, verify:
- Arguments documented in positions.md
- Key claims fact-checked
- Strongest version built (steelmanned)

```
For each position:
  - Is it documented? YES/NO
  - Are key claims fact-checked? YES/PARTIAL/NO
  - Is it steelmanned? YES/NO
```

### 3C: List All Alternative Theories

Search for fringe theories:

```
mcp__mcp-xai__x_search:
  query: "[TOPIC] theory OR conspiracy OR alternative explanation"
  prompt: "Find all alternative theories and fringe claims about this topic"
```

For each theory, check if addressed:
- DEBUNKED - theory investigated and found baseless
- UNPROVEN - theory investigated, no evidence supports it
- PARTIAL - some element has truth
- UNEXAMINED - theory not addressed (GAP!)

---

## STEP 4: VERIFICATION CHECKLIST

```
All must be TRUE to pass:

□ All people investigated
□ All claims categorized by position
□ Timeline complete
□ Source provenance traced
□ All positions documented (not just two)
□ Alternative theories addressed
□ Cross-model critique passed
□ All major claims fact-checked (all sides)
□ No unexamined major claims
```

### Checklist Evaluation

| Category | YES | PARTIAL | NO |
|----------|-----|---------|-----|
| People investigated | All named people researched | Most (>80%) | Many gaps |
| Claims categorized | All have position + verdict | Most (>80%) | Many untagged |
| Timeline complete | No gaps, all major events | Minor gaps | Major gaps |
| Sources traced | Primary sources for key claims | Most traced | Many untraced |
| All positions documented | Every perspective covered | Most covered | Major positions missing |
| Alternative theories addressed | All investigated with verdicts | Most addressed | Many ignored |
| Cross-model critique | Critique found no major gaps | Minor gaps | Major gaps |
| Claims fact-checked | All positions' claims verified | Mostly checked | Many unchecked |
| No unexamined claims | Nothing major left | Few minor items | Major items remain |

---

## STEP 5: GENERATE GAP LIST

If any checklist items are FALSE or PARTIAL:

```markdown
## Verification Gaps

### Checklist Status
[List which items are YES/PARTIAL/NO]

### Critical Gaps (Must Address):
1. [Specific gap]
   - What's missing: [detail]
   - Action needed: [research to do]
   - Why it matters: [importance]

2. [Specific gap]
   - What's missing: [detail]
   - Action needed: [research to do]
   - Why it matters: [importance]

### Unexamined Claims By Position:
| Position | Claim | Source | Priority |
|----------|-------|--------|----------|
| Position 1 | [claim] | [who says it] | HIGH/MEDIUM/LOW |
| Position 2 | [claim] | [who says it] | HIGH/MEDIUM/LOW |

### Unaddressed Alternative Theories:
| Theory | Source | Priority |
|--------|--------|----------|
| [theory] | [where circulating] | HIGH/MEDIUM/LOW |
```

---

## STEP 6: VERDICT

### If PASS (all checklist items YES AND no critical gaps):

```markdown
## Verification Result: PASS ✓

**Checklist**: All items YES
**Cross-Model Critique**: Passed
**Gaps**: None critical

The investigation meets completeness standards:
- ✓ All people investigated
- ✓ All claims categorized by position
- ✓ Timeline complete
- ✓ All positions documented
- ✓ Alternative theories addressed
- ✓ All major claims fact-checked (all sides)

**Recommendation**: Investigation may be marked COMPLETE.
```

### If FAIL (any checklist items PARTIAL/NO OR critical gaps exist):

```markdown
## Verification Result: FAIL ✗

**Checklist**: [N] items PARTIAL/NO
**Cross-Model Critique**: Found [N] gaps
**Gaps**: [N] critical items remain

The investigation does NOT meet completeness standards.

### Must Address Before Completion:
1. [Gap with specific action]
2. [Gap with specific action]
3. [Gap with specific action]

**Recommendation**: Continue investigating. Address gaps above. Re-verify when complete.
```

---

## STEP 7: UPDATE CASE

### Add Verification Log Entry

Append to iterations.md:

```markdown
---

## Verification Checkpoint - [datetime]

**Triggered by**: [/verify command | Periodic checkpoint | Saturation claim]

### Cross-Model Critique Summary
[Key findings from Gemini critique]

### Verification Checklist

| Category | Status | Notes |
|----------|--------|-------|
| All people investigated | YES/PARTIAL/NO | [note] |
| Claims categorized by position | YES/PARTIAL/NO | [note] |
| Timeline complete | YES/PARTIAL/NO | [note] |
| Source provenance traced | YES/PARTIAL/NO | [note] |
| All positions documented | YES/PARTIAL/NO | [note] |
| Alternative theories addressed | YES/PARTIAL/NO | [note] |
| Cross-model critique passed | YES/PARTIAL/NO | [note] |
| All major claims fact-checked | YES/PARTIAL/NO | [note] |
| No unexamined major claims | YES/PARTIAL/NO | [note] |

### Verdict: [PASS/FAIL]

### Gaps Identified (if FAIL):
1. [Gap]
2. [Gap]

### Next Steps:
[What to research next if FAIL, or "Complete" if PASS]
```

---

## ANTI-GAMING RULES

Do NOT:
- Give benefit of the doubt on gaps
- Mark PARTIAL as YES
- Skip the cross-model critique
- Cherry-pick which claims to check
- Ignore alternative theories because they seem "obviously false"
- Assume only two positions exist
- Mark PASS when gaps clearly exist

The verification checkpoint exists to catch self-deception. Be ruthless.

---

## WHEN TO USE /verify

| Situation | Action |
|-----------|--------|
| Periodically during /investigate | Checkpoint |
| Claiming investigation is "saturated" | Must verify before stopping |
| Resuming a case | Check last verification status |
| User requests status | Run verification to get current status |
| Before marking COMPLETE | Final verification required |

---

## EXAMPLE OUTPUT

```markdown
## Verification Checkpoint - 2026-01-05 14:30

**Triggered by**: Manual /verify command

### Cross-Model Critique Summary (Gemini)
"The investigation thoroughly covers the main events and timeline. However, several gaps remain:
1. Position 3 claims about regulatory oversight failures - UNEXAMINED
2. The leaked internal memo - mentioned but context incomplete
3. Systemic failure claims - dismissed without investigation
4. Coverup alternative theory - mentioned but not fully investigated
5. Position 2 argument about prior approvals - claimed but not verified"

### Verification Checklist

| Category | Status | Notes |
|----------|--------|-------|
| All people investigated | YES | All key people researched |
| Claims categorized by position | PARTIAL | 2 minor claims untagged |
| Timeline complete | YES | Full period mapped |
| Source provenance traced | PARTIAL | Some secondary sources untraced |
| All positions documented | NO | Position 3 underdeveloped |
| Alternative theories addressed | NO | 4 theories unaddressed |
| Cross-model critique passed | NO | Found 5 significant gaps |
| All major claims fact-checked | PARTIAL | Many claims unchecked |
| No unexamined major claims | NO | Several major items remain |

### Verdict: FAIL

### Gaps Identified:
1. Regulatory oversight claims (Position 3) - fact-check needed
2. Leaked memo context - get full timeline
3. Systemic failure claims - investigate with evidence
4. Coverup alternative theory - investigate with evidence
5. Political motivation theory - investigate with facts
6. Prior approval argument (Position 2) - verify with documentation
7. Performance metrics comparison - verify with data

### Next Steps:
Address all 7 gaps. Re-verify when complete.
```
