---
name: parallel-review
description: Run integrity and legal reviews in parallel with multi-agent debate
context: fork
agent: general-purpose
user-invocable: false
argument-hint: [case-id] [--no-debate]
---

# /parallel-review - Parallel Integrity and Legal Review

Run integrity and legal reviews in parallel, each with multi-agent debate for robust flag resolution.

## Usage

```
/parallel-review              # Review active case (with debate)
/parallel-review [case-id]    # Review specific case (with debate)
/parallel-review --no-debate  # Skip debate, faster but less robust
```

## Prerequisites

Gate 5 (Sources) must pass before running.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  PARALLEL REVIEW FLOW                                                │
│                                                                      │
│  Phase 1: Parallel Context-Free Scans                               │
│  ┌─────────────────────┐     ┌─────────────────────┐                │
│  │ /integrity          │     │ /legal-review       │                │
│  │ --stage-1-only      │     │ --stage-1-only      │                │
│  │ (reads ONLY article)│     │ (reads ONLY article)│                │
│  └──────────┬──────────┘     └──────────┬──────────┘                │
│             │                           │                            │
│             ▼                           ▼                            │
│        integrity_flags[]           legal_flags[]                    │
│                                                                      │
│  Phase 2: Parallel Multi-Agent Debates                              │
│  ┌─────────────────────┐     ┌─────────────────────┐                │
│  │ /integrity          │     │ /legal-review       │                │
│  │ --stage-2-only      │     │ --stage-2-only      │                │
│  │ (Critic/Defender/   │     │ (Critic/Defender/   │                │
│  │  Arbiter debate)    │     │  Arbiter debate)    │                │
│  └──────────┬──────────┘     └──────────┬──────────┘                │
│             │                           │                            │
│             ▼                           ▼                            │
│      integrity_resolutions[]     legal_resolutions[]                │
│                                                                      │
│  Phase 3: Merge, Resolve Conflicts, Apply                           │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ Orchestrator                                                │     │
│  │ 1. Collect all resolutions                                  │     │
│  │ 2. Detect text overlaps / conflicts                         │     │
│  │ 3. Apply non-conflicting fixes                              │     │
│  │ 4. ESCALATE conflicting fixes                               │     │
│  │ 5. Write review files                                       │     │
│  │ 6. Update state.json gates                                  │     │
│  └────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

## Three-Phase Pattern

### Phase 1: Parallel Context-Free Scans

Spawn two parallel sub-agents:

```
Task: "/integrity --stage-1-only [case-path]"
      Read ONLY articles/full.md. Return flags JSON.

Task: "/legal-review --stage-1-only [case-path]"
      Read ONLY articles/full.md. Return flags JSON.
```

Both run concurrently. Wait for both to complete.

### Phase 2: Parallel Multi-Agent Debates

With flags from Phase 1, run debates in parallel:

```
Task: "/integrity --stage-2-only [case-path] --flags [integrity-flags-json]"
      For each integrity flag:
      - CRITIC argues for FIX
      - DEFENDER argues for CLEAR
      - ARBITER decides resolution
      Return resolutions JSON.

Task: "/legal-review --stage-2-only [case-path] --flags [legal-flags-json]"
      For each legal flag:
      - CRITIC argues for FIX
      - DEFENDER argues for CLEAR
      - ARBITER decides resolution
      Return resolutions JSON.
```

### Phase 3: Merge and Apply

In main orchestrator:

1. **Collect** resolutions from both agents
2. **Detect conflicts** - overlapping text fixes between integrity and legal
3. **Resolve overlaps**:
   - Identical fix → Apply once
   - Complementary → Merge (e.g., add citation + rephrase)
   - Incompatible → ESCALATE for human review
4. **Apply** non-conflicting fixes to `articles/full.md`
5. **Write** `integrity-review.md` and `legal-review.md`
6. **Update** `state.json` gates (6 and 7)

## Conflict Types and Resolution

| Type | Example | Resolution |
|------|---------|------------|
| **Identical** | Both want "killed" → "charged with killing" | Apply once |
| **Complementary** | Integrity: add [S015]; Legal: add "prosecutors say" | Merge: "prosecutors say [S015]" |
| **Incompatible** | Integrity: remove sentence; Legal: add attribution | ESCALATE |
| **Non-overlapping** | Different sentences/paragraphs | Apply both |

## Debate Statistics in Output

Both review files should include debate statistics:

```markdown
## Review Summary

Flags identified: 5
Debate rounds: 8 (across all flags)
- Fast-path: 2 flags
- 1 round: 2 flags
- 2 rounds: 1 flag

Resolutions:
- CLEARED: 3 (with evidence)
- FIX_REQUIRED: 2
- ESCALATED: 0
```

## Error Recovery

If one review fails:
- Save successful result to `state.json.parallel_review`
- Retry only failed review
- Continue Phase 3 when both complete

```json
{
  "parallel_review": {
    "integrity_complete": true,
    "integrity_result": {...},
    "legal_complete": false,
    "legal_error": "...",
    "last_attempt": "2026-01-24T10:00:00Z"
  }
}
```

## Output

- `integrity-review.md` - Integrity review with debate summaries
- `legal-review.md` - Legal review with debate summaries
- `articles/full.md` - With fixes applied
- `state.json` - Gates 6+7 updated

## Example Merged Output

When both reviews flag the same text:

**Integrity FLAG-003:** "The corrupt mayor refused to comment"
- Issue: Loaded language ("corrupt")
- Debate: Fast-path FIX (no source for "corrupt")
- Fix: Remove "corrupt"

**Legal FLAG-002:** "The corrupt mayor refused to comment"
- Issue: Defamatory adjective without attribution
- Debate: 1 round (Defender found no source, Critic confirmed)
- Fix: Remove "corrupt" or add source

**Merged Resolution:**
- Type: Identical
- Applied: "The mayor refused to comment"
- Notes: Both reviews agree on removing "corrupt"

## --no-debate Mode

When `--no-debate` is specified:
- Phase 2 uses single-pass evaluation instead of Critic/Defender/Arbiter debate
- Faster but less robust
- Recommended only for time-sensitive reviews or after debate has been run previously

## Performance

| Mode | Estimated Time | Robustness |
|------|----------------|------------|
| With debate | ~15-20 min | High (adversarial testing) |
| No debate | ~8-12 min | Medium (single perspective) |

The parallel architecture reduces total time vs. sequential, while debate increases quality.

---

*Parallel execution with adversarial review for maximum robustness.*
