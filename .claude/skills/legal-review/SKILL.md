---
name: legal-review
description: Legal risk assessment with two-stage review
context: fork
agent: general-purpose
user-invocable: false
argument-hint: [case-id] [--stage-1-only] [--stage-2-only --flags <json>]
---

# /legal-review - Legal Risk Assessment

Two-stage review: context-free detection, then contextual evaluation with evidence.

## Usage

```
/legal-review              # Full review (Stage 1 + Stage 2)
/legal-review [case-id]    # Full review for specific case
/legal-review --stage-1-only [case-id]   # Context-free scan only (for parallel execution)
/legal-review --stage-2-only [case-id] --flags <json>  # Contextual evaluation only
```

## Split-Phase Modes (for Parallel Execution)

### `--stage-1-only`

Read ONLY `articles/full.md`. Return JSON with `flags[]` array.
Each flag: `{id, quote, location, issue, to_clear}`

### `--stage-2-only --flags <json>`

Read full context. For each flag, return resolution:
- `CLEARED` - with evidence (S###) and quote
- `FIX_REQUIRED` - with specific fix text
- `ESCALATE` - with reason

Used by `/parallel-review` for concurrent execution.

---

## Stage 1: Context-Free Scan

**CRITICAL: Read ONLY `articles/full.md` first. Do NOT read summary.md, sources.json, or evidence files until Stage 2.**

You are a reader with NO knowledge of this case. Scan the article for potential legal issues.

### Patterns to Flag

**Guilt Assertions (Pre-Conviction)**
- `[Name] + [crime verb]` — "Ryan killed", "John murdered", "she stole"
- `the + [criminal noun]` — "the killer", "the murderer", "the rapist"
- `who + [crime verb]` — "who killed", "who assaulted", "who defrauded"
- Definite guilt descriptions — "the man who killed her"

**Unattributed Damaging Claims**
- Criminal conduct without "alleged/charged/accused"
- Professional incompetence stated as fact
- Sexual misconduct without attribution
- Financial fraud without source

**Editorial/Loaded Language**
- Adjectives: "disgraced", "corrupt", "failed", "notorious", "controversial"
- Motive assertions: "to avoid prosecution", "to cover up", "to hide"
- Mind-reading: "knew it was wrong", "intended to deceive"

**Privacy Red Flags**
- Medical information
- Minor's identity
- Sealed/expunged records
- Private financial details

### Stage 1 Output Format

For each potential issue:

```
FLAG-001:
  Quote: "[exact text from article]"
  Location: [paragraph/section]
  Issue: [legal concern]
  To clear: [what evidence would make this acceptable]
```

**List ALL flags before proceeding to Stage 2.**

---

## Stage 2: Contextual Evaluation

Now read the full case materials:
- `sources.json` — Source registry
- `evidence/S###/metadata.json` — Source details
- `evidence/S###/content.md` — Source content (as needed)

For EACH flag, determine resolution:

### Resolution: CLEARED

The statement is legally defensible. **Must provide:**
1. Source ID (S###)
2. What the source proves
3. Direct quote from source

```
FLAG-001: CLEARED
  Evidence: S###
  Shows: [what it proves]
  Quote: "[relevant text from source]"
```

### Resolution: FIX REQUIRED

No clearing evidence exists. **Must provide:**
1. What you searched for
2. Why it wasn't found
3. Specific replacement text

```
FLAG-001: FIX REQUIRED
  Searched: [what you looked for, which sources]
  Not found: [what's missing]
  Fix: Change "[original]" → "[replacement]"
```

### Resolution: ESCALATE

Genuinely ambiguous, needs human judgment.

```
FLAG-001: ESCALATE
  Reason: [why ambiguous]
  Options: [possible resolutions]
```

### What CANNOT Clear a Flag

- Asserting "it's fine" without citing evidence
- Pointing to summary.md (may contain same error)
- General knowledge ("everyone knows he did it")
- Your memory of the case

**Only captured sources (S###) with specific quotes can clear flags.**

---

## Stage 3: Output

Write `legal-review.md` containing:

### 1. Scan Summary
```
Flags identified: X
```

### 2. Resolution Table

| Flag | Quote | Resolution | Evidence/Fix |
|------|-------|------------|--------------|
| 001 | "the man who killed her" | FIX REQUIRED | → "charged with killing" |
| 002 | "fled to avoid prosecution" | CLEARED | S015: prosecutor statement |

### 3. Required Changes

List each text change needed:
```
1. Para 3: "the man who killed her" → "who has been charged with killing"
2. Para 1: "disgraced former teacher" → "former teacher"
```

### 4. Status

- **READY**: All flags cleared with evidence
- **READY WITH CHANGES**: Fixes needed (list above), then ready
- **NOT READY**: Major issues requiring re-investigation

Update `gates.legal` in state.json.

---

## Example Walkthrough

### Stage 1 (article only)
```
FLAG-001:
  Quote: "The man who killed her, Ryan Camacho, was arrested three days later."
  Location: Paragraph 3
  Issue: "killed" states guilt as fact
  To clear: Source showing conviction for this crime

FLAG-002:
  Quote: "fled to Mexico to avoid prosecution"
  Location: Paragraph 7
  Issue: Motive ("to avoid prosecution") asserted without attribution
  To clear: Source attributing this motive to official/prosecutor

FLAG-003:
  Quote: "the disgraced former principal"
  Location: Paragraph 1
  Issue: "disgraced" is editorial judgment
  To clear: Source using this term
```

### Stage 2 (with sources)
```
FLAG-001: FIX REQUIRED
  Searched: S001-S024 for conviction records
  Not found: S012 shows charges filed; no conviction source exists
  Fix: "The man who killed her" → "Ryan Camacho, who has been charged with her murder,"

FLAG-002: CLEARED
  Evidence: S015 (DA press conference transcript)
  Shows: Prosecutor stated motive
  Quote: "The defendant fled to Mexico specifically to avoid facing these charges"
  Note: Add attribution in article → "fled to Mexico to avoid prosecution, prosecutors said [S015]"

FLAG-003: FIX REQUIRED
  Searched: All sources for "disgraced"
  Not found: No source uses this term
  Fix: "the disgraced former principal" → "the former principal"
```

### Stage 3 Output
```
## Legal Review

Flags identified: 3

| Flag | Issue | Resolution |
|------|-------|------------|
| 001 | Guilt as fact | FIX: "charged with her murder" |
| 002 | Unattributed motive | CLEARED: Add attribution to S015 |
| 003 | Editorial language | FIX: Remove "disgraced" |

### Required Changes
1. Para 3: "The man who killed her, Ryan Camacho" → "Ryan Camacho, who has been charged with her murder"
2. Para 7: Add "[S015]" attribution after "to avoid prosecution"
3. Para 1: "disgraced former principal" → "former principal"

### Status: READY WITH CHANGES
Apply the 3 changes above before publication.
```

---

*This is AI-generated analysis, not legal advice.*
