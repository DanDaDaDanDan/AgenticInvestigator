---
name: debate
description: Multi-agent debate for resolving review flags
context: fork
agent: general-purpose
user-invocable: false
argument-hint: [case-id] --flags <json> --review-type <integrity|legal>
---

# /debate - Multi-Agent Deliberation for Flag Resolution

Transform single-pass flag evaluation into adversarial debate between Critic, Defender, and Arbiter agents.

## Purpose

The two-stage review pattern (context-free scan → contextual evaluation) catches issues a biased reviewer might miss. But Stage 2 still uses a single perspective. This skill adds **multi-perspective deliberation** to ensure robust flag resolution.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  BEFORE: Single perspective decides flag resolution             │
│                                                                 │
│  Flag → Agent reads evidence → CLEARED / FIX_REQUIRED / ESCALATE│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  AFTER: Three perspectives debate, then resolve                 │
│                                                                 │
│  Flag → Critic (finds reasons to FIX)                          │
│       → Defender (finds reasons to CLEAR)                       │
│       → Debate rounds until convergence                         │
│       → Arbiter decides final resolution                        │
└─────────────────────────────────────────────────────────────────┘
```

## Usage

```
/debate [case-id] --flags <json> --review-type integrity
/debate [case-id] --flags <json> --review-type legal
```

Called by `/integrity` and `/legal-review` during Stage 2.

## Input Format

```json
{
  "flags": [
    {
      "id": "FLAG-001",
      "quote": "The man who killed her",
      "location": "Para 3",
      "issue": "Guilt stated as fact",
      "to_clear": "Conviction record or qualified language"
    }
  ],
  "review_type": "legal"
}
```

## Debate Process

### Phase 1: Initial Positions

For EACH flag, generate initial positions:

**CRITIC Agent** (seeks to find problems)
```
Role: You are a rigorous fact-checker who believes this flag indicates a real problem.
Task: Argue why this flag should be marked FIX_REQUIRED.
Evidence: Search sources for reasons the statement is problematic.
Output: Your strongest argument for why this needs fixing, with evidence gaps.
```

**DEFENDER Agent** (seeks to justify the article)
```
Role: You are an article defender who believes this flag can be cleared.
Task: Argue why this flag should be marked CLEARED.
Evidence: Search sources for evidence that supports/justifies the statement.
Output: Your strongest argument for clearing, with specific S### citations and quotes.
```

### Phase 2: Rebuttal Round

Each agent responds to the other's argument:

**CRITIC Rebuttal:**
- Counter Defender's evidence (insufficient, misquoted, doesn't actually support)
- Identify gaps Defender couldn't fill
- Maintain or strengthen FIX position

**DEFENDER Rebuttal:**
- Counter Critic's concerns (addressed elsewhere, overly strict, industry standard)
- Provide additional evidence if available
- Maintain or strengthen CLEAR position

### Phase 3: Arbiter Decision

**ARBITER Agent** (neutral decision maker)
```
Role: You are a neutral arbiter who decides the final resolution.
Input:
- Original flag
- Critic's arguments and rebuttals
- Defender's arguments and rebuttals

Decision criteria:
1. Evidence quality: Did Defender cite specific S### with verbatim quotes?
2. Completeness: Did Critic identify real gaps Defender couldn't fill?
3. Standards: Does the resolution meet journalistic/legal standards?
4. Proportionality: Is the proposed fix proportionate to the issue?

Output: Final resolution with reasoning.
```

## Output Format

For each flag:

```json
{
  "flag_id": "FLAG-001",
  "debate_summary": {
    "critic_position": "Article asserts guilt pre-conviction. S012 shows charges, not conviction.",
    "defender_position": "Common phrasing in crime reporting. S015 quotes DA saying 'he killed her'.",
    "critic_rebuttal": "DA quote is allegation, not fact. Article states as fact without attribution.",
    "defender_rebuttal": "Can add attribution to satisfy concern without major rewrite.",
    "rounds": 2
  },
  "arbiter_decision": {
    "resolution": "FIX_REQUIRED",
    "reasoning": "Defender's evidence shows quote exists but is allegation. Critic correctly identifies that article states as fact. Compromise: add attribution.",
    "confidence": 0.85
  },
  "final_resolution": {
    "status": "FIX_REQUIRED",
    "fix": "Change 'The man who killed her' → 'The man who prosecutors say killed her [S015]'",
    "evidence_considered": ["S012", "S015"],
    "dissent": "Defender argued common phrasing acceptable; Arbiter ruled attribution required for legal safety."
  }
}
```

## Convergence Rules

Debate continues until:
1. **Agreement**: Critic and Defender reach same position (max 2 rounds)
2. **Impasse**: Positions unchanged after rebuttals → Arbiter decides
3. **Max rounds**: 3 rounds reached → Arbiter decides

## Fast-Path Optimization

Skip full debate for clear-cut cases:

| Condition | Fast-Path |
|-----------|-----------|
| Defender finds S### with exact quote | CLEARED (no debate) |
| Critic finds no source exists at all | FIX_REQUIRED (no debate) |
| Both agree in initial positions | Use agreed resolution |

## Escalation Criteria

Flag is ESCALATED (not decided by debate) when:
- Arbiter confidence < 0.6
- Critic and Defender have equally strong evidence for opposite positions
- Issue involves potential legal liability
- Resolution requires domain expertise beyond article scope

## Integration with Reviews

### In `/integrity`:
```
Stage 1: Context-free scan → flags[]
Stage 2: /debate --flags <json> --review-type integrity
Stage 3: Apply resolutions, write integrity-review.md
```

### In `/legal-review`:
```
Stage 1: Context-free scan → flags[]
Stage 2: /debate --flags <json> --review-type legal
Stage 3: Apply resolutions, write legal-review.md
```

### In `/parallel-review`:
```
Phase 1: Parallel Stage 1 scans
Phase 2: Parallel /debate calls (one for integrity, one for legal)
Phase 3: Merge and apply
```

## Example Debate

**Flag:**
```
FLAG-002:
  Quote: "fled to Mexico to avoid prosecution"
  Issue: Motive assertion without attribution
  To clear: Source attributing this motive
```

**Critic Initial:**
> The article states motive as fact. "To avoid prosecution" is mind-reading.
> Searched S001-S024. Found no direct quote attributing this motive to any official.
> This is a defamation risk - asserting criminal intent without evidence.

**Defender Initial:**
> S015 (DA press conference) contains: "The defendant fled to Mexico specifically
> to avoid facing these charges, according to our investigation."
> This is an official statement attributing motive. Can cite to clear flag.

**Critic Rebuttal:**
> Concede: S015 does contain attribution. However, article doesn't cite it.
> Modified position: FIX by adding citation, not full rewrite.

**Defender Rebuttal:**
> Agree with modified position. Article should add "[S015]" after the phrase.
> This is a minor citation addition, not a substantive change.

**Arbiter Decision:**
> CONVERGENCE REACHED. Both agents agree on resolution.
> Resolution: FIX_REQUIRED (minor)
> Fix: Add "[S015]" after "to avoid prosecution"
> Reasoning: Evidence exists but needs attribution in article.

## Anti-Gaming Rules

- Critic MUST cite specific gaps, not just "seems problematic"
- Defender MUST cite S### with verbatim quotes, not paraphrase
- Arbiter CANNOT invent evidence not presented by either agent
- Fast-path CANNOT be used if Critic identifies any substantive concern
- ESCALATE is not a way to avoid hard decisions - requires genuine ambiguity

---

*Multi-perspective deliberation ensures robust flag resolution.*
