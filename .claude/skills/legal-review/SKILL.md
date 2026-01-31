---
name: legal-review
description: Legal risk assessment with two-stage review and multi-agent debate
context: fork
agent: general-purpose
user-invocable: false
argument-hint: [case-id] [--stage-1-only] [--stage-2-only --flags <json>] [--no-debate]
---

# /legal-review - Legal Risk Assessment

Two-stage review with multi-agent debate: context-free detection, then adversarial deliberation for flag resolution.

## Usage

```
/legal-review              # Full review (Stage 1 + Stage 2 with debate)
/legal-review [case-id]    # Full review for specific case
/legal-review --stage-1-only [case-id]   # Context-free scan only (for parallel execution)
/legal-review --stage-2-only [case-id] --flags <json>  # Contextual evaluation with debate
/legal-review --no-debate [case-id]      # Skip debate, single-pass Stage 2 (faster but less robust)
```

## Split-Phase Modes (for Parallel Execution)

### `--stage-1-only`

Read ONLY `articles/full.md`. Return JSON with `flags[]` array.
Each flag: `{id, quote, location, issue, to_clear}`

### `--stage-2-only --flags <json>`

Run multi-agent debate for each flag, then return resolutions:
- `CLEARED` - with evidence (S###) and quote
- `FIX_REQUIRED` - with specific fix text
- `ESCALATE` - with reason

Used by `/parallel-review` for concurrent execution.

---

## Stage 1: Context-Free Scan

**CRITICAL: Read ONLY `articles/full.md` first. Do NOT read findings/, sources.json, or evidence files until Stage 2.**

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

## Stage 2: Multi-Agent Debate

For each flag, run adversarial debate to determine resolution.

### Debate Participants

1. **CRITIC** - Argues why the flag indicates real legal risk
2. **DEFENDER** - Argues why the flag can be cleared with evidence
3. **ARBITER** - Decides final resolution based on debate

### Debate Process

**Round 1: Initial Positions**

Read the full case materials:
- `sources.json` — Source registry
- `evidence/S###/metadata.json` — Source details
- `evidence/S###/content.md` — Source content (as needed)

**CRITIC argues for FIX:**
```
This flag indicates legal risk because:
- [Specific defamation/privacy/accuracy concern]
- [Evidence gap that exposes liability]
- [Legal standard violated]
```

**DEFENDER argues for CLEAR:**
```
This flag should be cleared because:
- Evidence: S### contains "[exact quote]"
- Legal basis: [why statement is defensible]
- Precedent: [similar acceptable statements]
```

**Round 2: Rebuttals** (if positions differ)

Each agent responds to the other's arguments with counter-evidence or concessions.

**Round 3: Arbiter Decision**

ARBITER evaluates both positions and decides:
- Which agent provided stronger legal evidence?
- Is the statement privileged, attributed, or verifiable?
- What is the actual legal risk level?

### Fast-Path (Skip Debate)

Skip full debate when clear-cut:
- **CLEARED fast-path**: Defender finds conviction record, official statement, or direct attribution
- **FIX fast-path**: Critic finds pre-conviction guilt assertion with no attribution anywhere
- **Agreement fast-path**: Critic and Defender agree in initial positions

### What CANNOT Clear a Flag

- Asserting "it's fine" without citing evidence
- Pointing to findings (may contain same error)
- General knowledge ("everyone knows he did it")
- Your memory of the case

**Only captured sources (S###) with specific quotes can clear flags.**

### Debate Output Per Flag

```
FLAG-001:
  Debate:
    Critic: "Article states 'the man who killed her' - guilt as fact pre-conviction."
    Defender: "S015 (DA press conference): 'he killed her' - official statement."
    Critic Rebuttal: "DA quote is allegation, not fact. Article lacks attribution."
    Defender Rebuttal: "Concede. Can add attribution to make defensible."
    Convergence: Round 2 (Both agree on FIX with attribution)

  Resolution: FIX_REQUIRED
  Fix: "The man who killed her" → "The man who prosecutors say killed her [S015]"
  Arbiter note: "Evidence exists but article states as fact. Adding attribution resolves."
```

---

## Stage 3: Output

Write `legal-review.md` containing:

### 1. Scan Summary
```
Flags identified: X
Debate rounds: Y (total across all flags)
```

### 2. Resolution Table

| Flag | Quote | Resolution | Debate | Evidence/Fix |
|------|-------|------------|--------|--------------|
| 001 | "the man who killed her" | FIX | 2 rounds | → "who prosecutors say killed" |
| 002 | "fled to avoid prosecution" | CLEARED | 1 round | S015: prosecutor statement |
| 003 | "disgraced former teacher" | FIX | Fast-path | → "former teacher" |

### 3. Debate Summaries (for non-fast-path flags)

```
FLAG-001 Debate:
  Critic: Guilt stated as fact. "Killed" without "allegedly" or attribution. Defamation risk.
  Defender: S015 has DA quote: "he killed her." S012 shows charges filed.
  Critic Rebuttal: Charges ≠ conviction. DA quote is allegation needing attribution.
  Defender Rebuttal: Agree - add attribution to make legally defensible.
  Arbiter: FIX_REQUIRED. Add "[S015]" attribution after statement.
```

### 4. Required Changes

List each text change needed:
```
1. Para 3: "The man who killed her, Ryan Camacho" → "Ryan Camacho, who prosecutors say killed her [S015]"
2. Para 7: Add "[S015]" attribution after "to avoid prosecution"
3. Para 1: "disgraced former principal" → "former principal"
```

### 5. Status

- **READY**: All flags cleared with evidence
- **READY WITH CHANGES**: Fixes needed (list above), then ready
- **NOT READY**: Major issues requiring re-investigation or escalated flags

Update `gates.legal` in state.json.

---

## Legal Risk Categories

| Risk Level | Description | Debate Outcome |
|------------|-------------|----------------|
| **HIGH** | Defamation, privacy violation, contempt | FIX or ESCALATE |
| **MEDIUM** | Unattributed damaging claim | FIX (add attribution) |
| **LOW** | Loaded language, minor editorial | FIX (remove/soften) or CLEARED |

---

## Example Walkthrough with Debate

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

### Stage 2 (with debate)

**FLAG-001 Debate:**
```
CRITIC: Pre-conviction guilt assertion. "Killed" states fact, not allegation.
        S012 shows charges filed, not conviction. High defamation risk.

DEFENDER: S015 (DA press conference transcript) includes: "Ryan Camacho killed
         Sophia Martinez." Can add attribution to make defensible.

CRITIC REBUTTAL: Concede evidence exists. But article states without attribution.
                Must add "prosecutors allege" or cite S015.

DEFENDER REBUTTAL: Agree. Propose: "who prosecutors say killed her [S015]"

CONVERGENCE: Round 2. Both agree FIX with attribution.

ARBITER: FIX_REQUIRED. Evidence exists but needs attribution.
```
Fix: "The man who killed her" → "The man who prosecutors say killed her [S015]"

**FLAG-002 Debate:**
```
CRITIC: Motive assertion without attribution. "To avoid prosecution" implies
        knowledge of guilt. Without source, this is speculation stated as fact.

DEFENDER: S015 (DA press conference) includes: "The defendant fled to Mexico
         specifically to avoid facing these charges, according to our investigation."
         Direct official statement.

CRITIC REBUTTAL: Accept. S015 provides attribution. Article should cite it.

CONVERGENCE: Round 1. Critic accepts evidence.

ARBITER: CLEARED. Add attribution for safety.
```
Resolution: Add "[S015]" → "fled to Mexico to avoid prosecution, prosecutors said [S015]"

**FLAG-003 (Fast-Path):**
```
DEFENDER: Searched S001-S024 for "disgraced."
         NOT FOUND: No source uses this term.

FAST-PATH: FIX_REQUIRED. No clearing evidence exists.
```
Fix: "the disgraced former principal" → "the former principal"

### Final Output
```
## Legal Review

Flags identified: 3
Debate rounds: 4 (FLAG-001: 2, FLAG-002: 1, FLAG-003: fast-path)

| Flag | Issue | Resolution | Debate |
|------|-------|------------|--------|
| 001 | Guilt as fact | FIX | 2 rounds (attribution needed) |
| 002 | Unattributed motive | CLEARED | 1 round (S015 provides source) |
| 003 | Editorial language | FIX | Fast-path (no source found) |

### Required Changes
1. Para 3: "The man who killed her, Ryan Camacho" → "Ryan Camacho, who prosecutors say killed her [S015]"
2. Para 7: Add "[S015]" attribution after "to avoid prosecution"
3. Para 1: "disgraced former principal" → "former principal"

### Status: READY WITH CHANGES
Apply the 3 changes above before publication.
```

---

## Why Debate Matters for Legal Review

Legal issues require adversarial analysis because:

1. **False negatives are costly**: Missing a defamation issue has real consequences
2. **Context matters**: A statement may be defensible with proper attribution
3. **Evidence quality**: Critic ensures Defender doesn't accept weak evidence
4. **Risk calibration**: Arbiter weighs actual legal exposure vs. theoretical risk

The debate pattern mirrors how legal teams actually work:
- One lawyer looks for problems (Critic)
- Another argues defensibility (Defender)
- Senior partner decides (Arbiter)

---

*This is AI-generated analysis, not legal advice.*
