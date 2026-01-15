# /integrity - Journalistic Integrity Check

Two-stage review: context-free detection, then contextual evaluation.

## Usage

```
/integrity              # Check active case
/integrity [case-id]    # Check specific case
```

---

## Stage 1: Context-Free Scan

**CRITICAL: Read ONLY `articles/full.md` first. Do NOT read summary.md, questions/*, or evidence files until Stage 2.**

You are a reader with NO knowledge of this case. Scan for journalistic integrity issues.

### Patterns to Flag

**Balance Issues**
- Only one side quoted/cited on a contested issue
- Criticism without subject's response
- Asymmetric language (harsh for one side, soft for another)

**Fairness Issues**
- Accused persons described with guilt-presuming language
- Missing "declined to comment" when subject not quoted
- Loaded adjectives without attribution

**Accuracy Concerns**
- Claims without citations
- Vague sourcing ("sources say", "experts believe")
- Statistics without context or source

**Transparency Gaps**
- Methodology not explained
- Limitations not acknowledged
- Conflicts of interest not disclosed

### Stage 1 Output Format

```
FLAG-001:
  Quote: "[exact text]"
  Location: [paragraph/section]
  Issue: [integrity concern]
  To clear: [what would resolve this]
```

**List ALL flags before proceeding to Stage 2.**

---

## Stage 2: Contextual Evaluation

Now read full case materials:
- `questions/*.md` — For perspective coverage
- `sources.json` — Source registry
- `summary.md` — Investigation findings
- `evidence/S###/` — As needed

For EACH flag, determine resolution:

### Resolution: CLEARED

The article meets integrity standards. **Must provide:**
1. Evidence showing the concern is addressed
2. Where in sources/investigation this is covered

```
FLAG-001: CLEARED
  Evidence: [what proves this is okay]
  Source: S### or questions/XX-framework.md
```

### Resolution: FIX REQUIRED

Integrity gap confirmed. **Must provide:**
1. What's missing
2. Where it should be added
3. Suggested fix

```
FLAG-001: FIX REQUIRED
  Gap: [what's missing]
  Fix: [specific change needed]
```

### Resolution: ESCALATE

Judgment call needed.

```
FLAG-001: ESCALATE
  Reason: [why ambiguous]
  Options: [possible resolutions]
```

---

## Stage 3: Output

Write `integrity-review.md` containing:

### 1. Scan Summary
```
Flags identified: X
```

### 2. Resolution Table

| Flag | Issue | Resolution | Notes |
|------|-------|------------|-------|
| 001 | One-sided sourcing | CLEARED | Defense quoted in para 7 |
| 002 | Missing response | FIX | Add "X declined to comment" |

### 3. Required Changes

```
1. Para 4: Add defendant's response or "declined to comment"
2. Para 9: Add source citation for statistic
```

### 4. Status

- **READY**: All flags cleared
- **READY WITH CHANGES**: Fixes needed (list above)
- **NOT READY**: Major integrity issues

Update `gates.integrity` in state.json.

---

## Common Flags Reference

| Pattern | Issue | Typical Resolution |
|---------|-------|-------------------|
| "X killed Y" (no conviction) | Presumption of innocence | "charged with killing" |
| No response from criticized party | Right of reply | Add response or "declined" |
| "Sources say..." | Vague attribution | Name source or add [S###] |
| One-sided quotes | Balance | Add opposing perspective |
| "The corrupt official" | Loaded language | Remove or attribute |
| Statistic without source | Accuracy | Add [S###] citation |

---

## Example

### Stage 1 (article only)
```
FLAG-001:
  Quote: "The program has been a complete failure"
  Location: Para 5
  Issue: Strong claim without source
  To clear: Citation for this assessment

FLAG-002:
  Quote: Article criticizes Mayor Johnson extensively
  Location: Throughout
  Issue: No response from Mayor Johnson included
  To clear: Johnson's response or "declined to comment"

FLAG-003:
  Quote: "67% of residents oppose the project"
  Location: Para 8
  Issue: Statistic without source
  To clear: Citation for poll/survey
```

### Stage 2 (with context)
```
FLAG-001: CLEARED
  Evidence: S012 is government audit calling program "failed to meet objectives"
  Fix: Add citation → "a complete failure, according to the state audit [S012]"

FLAG-002: FIX REQUIRED
  Searched: All sources for Johnson response
  Gap: No source contains Johnson's response; no evidence of contact attempt
  Fix: Add "Mayor Johnson did not respond to requests for comment"

FLAG-003: CLEARED
  Evidence: S008 is Pew poll with this exact figure
  Fix: Add citation → "67% of residents oppose the project [S008]"
```

---

*Journalistic standards, not legal advice.*
