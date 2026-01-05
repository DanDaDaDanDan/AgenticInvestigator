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
1. **Complete** - All threads explored, both sides covered
2. **Honest** - Not deceiving ourselves about coverage
3. **Balanced** - Prosecution AND defense arguments fact-checked
4. **Thorough** - Conspiracy theories addressed, not ignored

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
    - Biases in sourcing (too much from one side)
    - What would DISPROVE the current conclusions
    - What evidence is suspiciously ABSENT
    - Unexplored accusations from EITHER side
    - Conspiracy theories that haven't been addressed
    - Defense arguments that haven't been steelmanned
    - Prosecution arguments that haven't been built
    - People mentioned but not investigated
    - Claims asserted but not verified
    - Contradictions identified but not resolved

    Be specific. Name names. Cite missing evidence.

  prompt: |
    CRITICALLY REVIEW THIS INVESTIGATION:

    [Full summary.md content]

    Also review the detail file summaries:
    - prosecution.md summary
    - defense.md summary
    - theories.md summary
    - fact-check.md summary

    PROVIDE:

    1. COMPLETENESS SCORE (0-100)
       Be harsh. Most investigations score 40-70 on first pass.

    2. SPECIFIC GAPS (list each one)
       - What specific claims are unverified?
       - What specific people weren't investigated?
       - What specific accusations weren't fact-checked?

    3. UNEXPLORED PROSECUTION ACCUSATIONS
       What criticisms/accusations exist that weren't examined?

    4. UNEXPLORED DEFENSE ARGUMENTS
       What rebuttals/context exists that wasn't examined?

    5. CONSPIRACY THEORIES NOT ADDRESSED
       What fringe claims are circulating that should be debunked?

    6. BIAS ASSESSMENT
       Is the investigation balanced? What side is overrepresented?

    7. VERDICT
       PASS (score >= 90, no major gaps) or FAIL (continue investigating)
```

---

## STEP 3: ACCUSATION AUDIT

### 3A: List All Prosecution Claims

Search for all criticisms/accusations from:
- Opposition party sources
- Critical media outlets
- Whistleblowers
- Congressional investigations
- Fringe/conspiracy sources

```
mcp__mcp-xai__research:
  prompt: |
    Find ALL accusations and criticisms about [TOPIC].
    Include mainstream AND fringe claims.
    Include claims from ALL sides of the political spectrum.
    Include conspiracy theories.
  sources: ["x", "web", "news"]
```

For each accusation found, check if it's addressed in fact-check.md:
- VERIFIED - claim investigated and found true
- DEBUNKED - claim investigated and found false
- PARTIAL - claim partially true
- UNEXAMINED - claim not addressed (GAP!)

### 3B: List All Defense Arguments

Search for all rebuttals/defenses from:
- Subject's own statements
- Supportive media outlets
- Official responses
- Fact-checkers

```
mcp__mcp-xai__research:
  prompt: |
    Find ALL defenses and rebuttals regarding [TOPIC].
    Include official statements, fact-checks, and context arguments.
  sources: ["x", "web", "news"]
```

For each defense, check if it's addressed in fact-check.md:
- VERIFIED - defense investigated and found valid
- DEBUNKED - defense investigated and found invalid
- PARTIAL - defense partially valid
- UNEXAMINED - defense not addressed (GAP!)

### 3C: List All Conspiracy Theories

Search for fringe theories:

```
mcp__mcp-xai__x_search:
  query: "[TOPIC] conspiracy theory"
  prompt: "Find all conspiracy theories and fringe claims about this topic"
```

For each theory, check if addressed:
- DEBUNKED - theory investigated and found baseless
- UNPROVEN - theory investigated, no evidence supports it
- PARTIAL - some element has truth
- UNEXAMINED - theory not addressed (GAP!)

---

## STEP 4: CALCULATE VERIFICATION SCORE

```python
score = 0

# Core completeness (40 points)
if all_people_investigated:           score += 10
if all_claims_categorized:            score += 10
if timeline_complete:                 score += 10
if source_provenance_traced:          score += 10

# Both-sides coverage (30 points)
if prosecution_case_built:            score += 10
if defense_case_steelmanned:          score += 10
if conspiracy_theories_addressed:     score += 10

# Verification quality (30 points)
if cross_model_critique_passed:       score += 10
if all_accusations_fact_checked:      score += 10
if no_unexamined_major_claims:        score += 10
```

### Scoring Rubric

| Category | Full Points | Partial | Zero |
|----------|-------------|---------|------|
| People investigated | All named people researched | Most (>80%) | Many gaps |
| Claims categorized | All have VERIFIED/CONTESTED/etc | Most (>80%) | Many untagged |
| Timeline complete | No gaps, all major events | Minor gaps | Major gaps |
| Sources traced | Primary sources for key claims | Most traced | Many untraced |
| Prosecution case | All major accusations addressed | Most addressed | Many missing |
| Defense case | All major defenses addressed | Most addressed | Many missing |
| Conspiracy theories | All debunked or addressed | Most addressed | Many ignored |
| Cross-model critique | Critique found no major gaps | Minor gaps | Major gaps |
| Accusations fact-checked | Both sides fully checked | Mostly checked | Many unchecked |
| No unexamined claims | Nothing major left | Few minor items | Major items remain |

---

## STEP 5: GENERATE GAP LIST

If score < 90, list SPECIFIC gaps:

```markdown
## Verification Gaps

### Score: [X]/100

### Critical Gaps (Must Address):
1. [Specific gap]
   - What's missing: [detail]
   - Action needed: [research to do]
   - Why it matters: [importance]

2. [Specific gap]
   - What's missing: [detail]
   - Action needed: [research to do]
   - Why it matters: [importance]

### Unexamined Accusations:
| Accusation | Source | Priority |
|------------|--------|----------|
| [claim] | [who says it] | HIGH/MEDIUM/LOW |

### Unexamined Defenses:
| Defense | Source | Priority |
|---------|--------|----------|
| [claim] | [who says it] | HIGH/MEDIUM/LOW |

### Unaddressed Conspiracy Theories:
| Theory | Source | Priority |
|--------|--------|----------|
| [theory] | [where circulating] | HIGH/MEDIUM/LOW |
```

---

## STEP 6: VERDICT

### If PASS (score >= 90 AND no critical gaps):

```markdown
## Verification Result: PASS ✓

**Score**: [X]/100
**Cross-Model Critique**: Passed
**Gaps**: None critical

The investigation meets completeness standards:
- ✓ All people investigated
- ✓ All claims categorized
- ✓ Timeline complete
- ✓ Both prosecution and defense cases built
- ✓ Conspiracy theories addressed
- ✓ All major accusations fact-checked

**Recommendation**: Investigation may be marked COMPLETE.
```

### If FAIL (score < 90 OR critical gaps exist):

```markdown
## Verification Result: FAIL ✗

**Score**: [X]/100
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

Append to iterations.md and update summary.md verification score:

```markdown
---

## Verification Checkpoint - [datetime]

**Triggered by**: [/verify command | Iteration N checkpoint | Saturation claim]

### Cross-Model Critique Summary
[Key findings from Gemini critique]

### Score: [X]/100

| Category | Points | Notes |
|----------|--------|-------|
| People investigated | X/10 | [note] |
| Claims categorized | X/10 | [note] |
| Timeline complete | X/10 | [note] |
| Sources traced | X/10 | [note] |
| Prosecution case | X/10 | [note] |
| Defense case | X/10 | [note] |
| Conspiracy theories | X/10 | [note] |
| Cross-model critique | X/10 | [note] |
| Accusations fact-checked | X/10 | [note] |
| No unexamined claims | X/10 | [note] |

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
- Round up scores
- Skip the cross-model critique
- Cherry-pick which accusations to check
- Ignore conspiracy theories because they seem "obviously false"
- Mark PASS when gaps clearly exist

The verification checkpoint exists to catch self-deception. Be ruthless.

---

## WHEN TO USE /verify

| Situation | Action |
|-----------|--------|
| Every 5 iterations in /investigate | Automatic checkpoint |
| Claiming investigation is "saturated" | Must verify before stopping |
| Resuming a case | Check last verification score |
| User requests status | Run verification to get current score |
| Before marking COMPLETE | Final verification required |

---

## EXAMPLE OUTPUT

```markdown
## Verification Checkpoint - 2026-01-05 14:30

**Triggered by**: Manual /verify command

### Cross-Model Critique Summary (Gemini)
"The investigation thoroughly covers the main events and timeline. However, several gaps remain:
1. Opposition accusation about regulatory oversight failures - UNEXAMINED
2. The leaked internal memo - mentioned but context incomplete
3. Systemic failure claims - dismissed without investigation
4. Coverup conspiracy theory - mentioned but not fully debunked
5. Defense argument about prior approvals - claimed but not verified"

### Score: 68/100

| Category | Points | Notes |
|----------|--------|-------|
| People investigated | 10/10 | All key people researched |
| Claims categorized | 9/10 | 2 minor claims untagged |
| Timeline complete | 10/10 | Full period mapped |
| Sources traced | 8/10 | Some secondary sources untraced |
| Prosecution case | 10/10 | Strong case built |
| Defense case | 5/10 | Missing approval verification |
| Conspiracy theories | 3/10 | 4 theories unaddressed |
| Cross-model critique | 5/10 | Found 5 significant gaps |
| Accusations fact-checked | 4/10 | Many opposition claims unchecked |
| No unexamined claims | 4/10 | Several major items remain |

### Verdict: FAIL

### Gaps Identified:
1. Regulatory oversight claims - fact-check needed
2. Leaked memo context - get full timeline
3. Systemic failure claims - investigate or debunk
4. Coverup conspiracy theory - fully debunk with evidence
5. Political motivation theory - debunk with facts
6. Prior approval defense - verify with documentation
7. Performance metrics comparison - verify with data

### Next Steps:
Address all 7 gaps. Re-verify when complete.
```
