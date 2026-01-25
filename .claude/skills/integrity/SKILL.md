---
name: integrity
description: Journalistic integrity check with two-stage review and multi-agent debate
context: fork
agent: general-purpose
user-invocable: false
argument-hint: [case-id] [--stage-1-only] [--stage-2-only --flags <json>] [--no-debate]
---

# /integrity - Journalistic Integrity Check

Two-stage review with multi-agent debate: context-free detection, then adversarial deliberation for flag resolution.

## Usage

```
/integrity              # Full review (Stage 1 + Stage 2 with debate)
/integrity [case-id]    # Full review for specific case
/integrity --stage-1-only [case-id]   # Context-free scan only (for parallel execution)
/integrity --stage-2-only [case-id] --flags <json>  # Contextual evaluation with debate
/integrity --no-debate [case-id]      # Skip debate, single-pass Stage 2 (faster but less robust)
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

**CRITICAL: Epistemic Over-Reach (Verdict Language)**
- "CONFIRMED", "VALIDATED", "RESOLVED", "REFUTED", "PROVEN" for probabilistic evidence
- Courtroom-style conclusions for scientific/statistical findings
- Treating observational studies as if they established causation
- Presenting contested findings as settled

**CRITICAL: Level-of-Analysis Conflation**
- Sliding between individual/catalog/market/creator levels without explicit transition
- Using one level's evidence to support claims about another level
- Mixing income concentration with consumption concentration without distinction
- Conflating "exposure" effects with "belief" effects

**CRITICAL: Advocacy Framing**
- Article reads like "persuasive advocacy dressed as scholarship"
- Evidence selectively presented to support predetermined conclusion
- Counterevidence minimized or dismissed without engagement
- Rhetorical structure designed to win argument rather than inform

**CRITICAL: Regulatory/Legal Accuracy**
- Statute/article citations that don't match what the law actually says
- Legal claims that would be obvious to domain experts as wrong
- Colloquial interpretation stated as legal fact
- Missing effective dates or jurisdictional limits

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

## Stage 2: Multi-Agent Debate

For each flag, run adversarial debate to determine resolution.

### Debate Participants

1. **CRITIC** - Argues why the flag indicates a real integrity problem
2. **DEFENDER** - Argues why the flag can be cleared with evidence
3. **ARBITER** - Decides final resolution based on debate

### Debate Process

**Round 1: Initial Positions**

Read full case materials:
- `questions/*.md` — For perspective coverage
- `sources.json` — Source registry
- `summary.md` — Investigation findings
- `evidence/S###/` — As needed

**CRITIC argues for FIX:**
```
This flag indicates a real problem because:
- [Specific concern]
- [Evidence gap identified]
- [Standard violated]
```

**DEFENDER argues for CLEAR:**
```
This flag should be cleared because:
- Evidence: S### contains [quote]
- Standard met: [how]
- Context: [why acceptable]
```

**Round 2: Rebuttals** (if positions differ)

Each agent responds to the other's arguments with counter-evidence or concessions.

**Round 3: Arbiter Decision**

ARBITER evaluates both positions and decides:
- Which agent provided stronger evidence?
- Is the evidence directly relevant to the flag?
- Does the resolution meet journalistic standards?

### Fast-Path (Skip Debate)

Skip full debate when clear-cut:
- **CLEARED fast-path**: Defender finds S### with exact quote that directly addresses flag
- **FIX fast-path**: Critic finds no relevant source exists in entire evidence set
- **Agreement fast-path**: Critic and Defender agree in initial positions

### Debate Output Per Flag

```
FLAG-001:
  Debate:
    Critic: "Article has one-sided sourcing. Only pro-project sources quoted."
    Defender: "S007 quotes opponent: '[exact quote]'. Defense cited in para 7."
    Convergence: Round 1 (Critic concedes after seeing evidence)

  Resolution: CLEARED
  Evidence: S007
  Quote: "[opponent's exact quote from source]"
  Arbiter note: "Defender showed opposing view is represented. Critic's concern addressed."
```

---

## Stage 3: Output

Write `integrity-review.md` containing:

### 1. Scan Summary
```
Flags identified: X
Debate rounds: Y (total across all flags)
```

### 2. Resolution Table

| Flag | Issue | Resolution | Debate | Notes |
|------|-------|------------|--------|-------|
| 001 | One-sided sourcing | CLEARED | Fast-path | Defense quoted in para 7 |
| 002 | Missing response | FIX | 2 rounds | Add "X declined to comment" |
| 003 | Vague attribution | CLEARED | 1 round | S012 provides specific source |

### 3. Debate Summaries (for non-fast-path flags)

```
FLAG-002 Debate:
  Critic: No response from Mayor Johnson in article. Right of reply violated.
  Defender: Searched all sources. No evidence of contact attempt or response.
  Arbiter: Critic is correct. No response found. Standard requires "declined to comment".
  Decision: FIX_REQUIRED (add decline statement or attempt contact)
```

### 4. Required Changes

```
1. Para 4: Add defendant's response or "declined to comment"
2. Para 9: Add source citation for statistic
```

### 5. Status

- **READY**: All flags cleared or fixed
- **READY WITH CHANGES**: Fixes needed (list above)
- **NOT READY**: Major integrity issues or escalated flags

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
| **"CONFIRMED by studies"** | Verdict language | "supported by multiple studies" |
| **"VALIDATED/RESOLVED"** | Over-certainty | "consistent with evidence" / "strongest evidence suggests" |
| **Mixing individual/market claims** | Level conflation | Add explicit "at the [X] level" qualifier |
| **"Article 50 requires X"** | Regulatory accuracy | Verify against official text; correct if wrong |
| **Evidence → strong conclusion** | Advocacy framing | Add "this suggests" / limitations caveat |
| **Causal claim from correlation** | Epistemic over-reach | "associated with" not "causes" |

---

## Example with Debate

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
```

### Stage 2 (with debate)

**FLAG-001 Debate:**
```
CRITIC: Strong evaluative claim stated as fact. No citation. Reader can't verify.

DEFENDER: S012 is government audit stating "program failed to meet 7 of 9 objectives."
         This supports "failure" characterization. Recommend add citation.

CONVERGENCE: Round 1. Both agree citation needed. Not substantive change.

ARBITER: CLEARED with minor fix. Evidence exists, just needs citation.
```
Resolution: Add citation → "a complete failure, according to the state audit [S012]"

**FLAG-002 Debate:**
```
CRITIC: Right of reply fundamental. Johnson criticized but never quoted or given
        opportunity to respond. Searched all sources - no Johnson statement.

DEFENDER: Searched S001-S024. No response from Johnson found. No evidence of
         contact attempt. Cannot provide clearing evidence.

CONVERGENCE: Round 1. Both agree evidence doesn't exist.

ARBITER: FIX_REQUIRED. Standard requires response or "declined to comment."
```
Resolution: Add "Mayor Johnson did not respond to requests for comment"

---

## Why Debate Matters

Single-pass evaluation can miss issues due to:
1. **Confirmation bias**: Reviewer who "knows" the case may not notice gaps
2. **Authority bias**: Accepting claims because source seems authoritative
3. **Completeness illusion**: Missing that evidence doesn't actually support claim

Multi-agent debate forces:
1. **Adversarial testing**: Critic actively looks for problems
2. **Evidence citation**: Defender must provide specific S### quotes
3. **Neutral arbitration**: Arbiter weighs arguments objectively

---

*Journalistic standards enforced through adversarial review.*
