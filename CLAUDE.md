# AgenticInvestigator - Claude Instructions

Behavioral rules and quick reference for Claude Code operating in this project.

---

## Document Sync Requirements

**CRITICAL**: When modifying system behavior, keep these files in sync:

| File | Update When... |
|------|----------------|
| `README.md` | Commands change, features change, workflow changes |
| `architecture.md` | Data formats change, parallelization changes, case structure changes |
| `CLAUDE.md` | Behavioral rules change, MCP tools change |

After any structural change, verify all three files are consistent.

---

## Philosophy

1. **Fail fast** - Surface problems immediately. Don't paper over issues.
2. **Be curious** - Explore, question assumptions, dig deeper.
3. **Don't guess, research** - Investigate first. If still uncertain, ask.
4. **No mock code** - Write real, functional code or don't write it.
5. **No silent rollbacks** - Don't revert on failure. Surface it and wait.
6. **Finish the job** - Verify completion. Never stop mid-task silently.
7. **Commit early, commit often** - Git is our safety net. Be bold.

---

## Commands

| Command | Purpose | Detailed Docs |
|---------|---------|---------------|
| `/investigate --new [topic]` | Start new investigation (topic required) | `.claude/commands/investigate.md` |
| `/investigate [case-id]` | Resume specific case | `.claude/commands/investigate.md` |
| `/verify` | Run verification checkpoint on investigation | `.claude/commands/verify.md` |
| `/status` | Show case progress | `.claude/commands/status.md` |
| `/osint` | OSINT database lookup (where to find records) | `.claude/commands/osint.md` |

---

## Core Philosophy: INSATIABLE CURIOSITY + VERIFICATION HONESTY

**The key to AgenticInvestigator is to be INSATIABLY CURIOUS and RUTHLESSLY HONEST.**

Every finding triggers more questions. Every person gets investigated. Every source gets traced. Every contradiction gets explored. Every gap gets filled. **Every claim from BOTH sides gets fact-checked.**

### The Verified Looping Principle

```
DO NOT STOP EARLY. DO NOT DECEIVE YOURSELF.

MINIMUM 10 outer loop iterations.
VERIFICATION CHECKPOINT every 5 iterations.
FINAL VERIFICATION before claiming complete.

Only stop when ALL conditions are true:
  1. At least 10 iterations complete
  2. Verification score >= 90%
  3. No unexplored avenues remaining
  4. Both prosecution AND defense cases complete
  5. All conspiracy theories addressed
  6. All major accusations from both sides fact-checked
```

---

## The Verified Investigation Loop

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OUTER LOOP (MINIMUM 10 ITERATIONS)               │
│                                                                     │
│  PHASE 1: RESEARCH                                                  │
│    - Gemini deep research (primary)                                 │
│    - OpenAI deep research (critical claims)                         │
│    - XAI real-time search (current events, social media)            │
│                                                                     │
│  PHASE 2: EXTRACTION                                                │
│    - Extract all claims, people, dates, contradictions              │
│    - Categorize: prosecution claims, defense claims, conspiracies   │
│                                                                     │
│  PHASE 3: INVESTIGATION                                             │
│    - For EVERY person: investigate background                       │
│    - For EVERY claim: verify with multiple sources                  │
│    - For EVERY contradiction: investigate discrepancy               │
│                                                                     │
│  PHASE 4: VERIFICATION CHECKPOINT (every 5 iterations)              │
│    → Cross-model critique (Gemini critiques Claude)                 │
│    → Identify unexplored accusations (both sides)                   │
│    → Identify conspiracy theories to address                        │
│    → Fact-check all major claims                                    │
│    → Score completeness (0-100)                                     │
│    → List specific gaps                                             │
│    → If score < 90 OR gaps exist: FORCE CONTINUE                    │
│                                                                     │
│  PHASE 5: SYNTHESIS                                                 │
│    - Register sources in sources.md (append-only, [SXXX] IDs)       │
│    - Update detail files (timeline, people, prosecution, defense)   │
│    - Update summary.md (embed full source list)                     │
│    - Log iteration in iterations.md                                 │
│                                                                     │
│  TERMINATION CHECK                                                  │
│    - iteration >= 10 AND verification_score >= 90                   │
│    - AND no_unexplored_threads AND both_cases_complete              │
│    - AND conspiracy_theories_addressed                              │
│    - AND all_accusations_fact_checked                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Parallelization Rules

**Always maximize parallel execution.** Use multiple Task tool calls in a single message when agents are independent.

### AgenticInvestigator Parallel Phases

**Phase 1 - Research (parallel)**:
```
Launch ALL of these simultaneously in ONE message:
- Gemini deep research
- XAI multi-source research
- X/Twitter analysis
- Mainstream angle
- Official records
- Opposition/defense views
- Fringe theories
```

**Phase 4 - Verification (parallel)**:
```
Launch ALL of these simultaneously in ONE message:
- Cross-model critique (Gemini)
- Accusation search (prosecution side)
- Defense search
- Conspiracy theory search
```

---

## Case File Structure

```
cases/inv-YYYYMMDD-HHMMSS/
├── summary.md        # THE DELIVERABLE - self-contained, shareable, has ALL sources
├── sources.md        # Master source registry [S001], [S002]... (append-only)
├── timeline.md       # Chronological events
├── people.md         # Person profiles
├── prosecution.md    # Case against
├── defense.md        # Case for
├── fact-check.md     # Claim verdicts
├── theories.md       # Conspiracy analysis
├── evidence.md       # Statement vs evidence
└── iterations.md     # Progress log + verification checkpoints
```

### Source Attribution (CRITICAL)

**Every claim must have a source ID. No exceptions.**

```
Source format: [S001], [S002], [S003]...
- Append-only: Never renumber, never delete
- Cite inline: "The CEO knew by January [S001] [S002]."
- summary.md embeds complete source list → shareable standalone
```

---

## MCP Quick Reference

### When to Use Which Server

| Need | Server | Tool |
|------|--------|------|
| Deep research (fast) | `mcp-gemini` | `deep_research` |
| Deep research (max depth) | `mcp-openai` | `deep_research` |
| Cross-model critique | `mcp-gemini` | `generate_text` (thinking_level: high) |
| Real-time X/Twitter | `mcp-xai` | `x_search` |
| Real-time web search | `mcp-xai` | `web_search` |
| Real-time news | `mcp-xai` | `news_search` |
| Multi-source research | `mcp-xai` | `research` |

### Common Patterns

**Deep research (background)**:
```
mcp__mcp-gemini__deep_research
  query: "[topic] investigation"
  timeout_minutes: 30
```

**Cross-model critique (verification)**:
```
mcp__mcp-gemini__generate_text
  thinking_level: "high"
  system_prompt: "You are a ruthless investigative critic..."
  prompt: "[content to critique]"
```

**Multi-source search**:
```
mcp__mcp-xai__research
  prompt: "[research question]"
  sources: ["x", "web", "news"]
```

---

## Core Rules

1. **Version everything** - Create v1, v2, v3... Never overwrite.
2. **Verify before done** - Run verification checkpoint before claiming completion.
3. **Commit at checkpoints** - After each major phase completes.
4. **Track provenance** - Every claim needs attribution.
5. **Probability ranges** - `[0.6, 0.8]` not `0.7`. No false precision.
6. **Cross-model critique** - Use Gemini to critique Claude's work.

---

## AgenticInvestigator-Specific Rules

1. **Never fabricate sources** - If you can't find evidence, say so.
2. **Steelman before attacking** - Build strongest version first.
3. **Separate fact from inference** - Be explicit about what's proven vs. concluded.
4. **Document uncertainty** - "We don't know" is a valid finding.
5. **Detect circular reporting** - Multiple outlets citing each other is one source.
6. **Fact-check BOTH sides** - Prosecution claims AND defense claims.
7. **Address conspiracy theories** - Don't ignore them; debunk with evidence.
8. **Verification score >= 90** - Cannot claim complete below this threshold.
9. **Every claim needs [SXXX]** - Source attribution is sacred. No ID = no claim.
10. **Append-only sources** - Never renumber or delete source IDs.
11. **summary.md is self-contained** - Must embed full source list, shareable standalone.

---

## Verification Checkpoint Rules

**Run verification checkpoint at:**
- Iteration 5, 10, 15, 20... (every 5 iterations)
- When claiming "saturation" (no more threads)
- When claiming "complete" (before final status)
- When user says "wrap up"

**If verification fails (score < 90 OR gaps exist):**
- MUST continue investigating
- Address listed gaps in next iteration(s)
- Re-verify when gaps addressed

**Anti-gaming rules:**
- Do NOT skip verification because "it's obviously done"
- Do NOT claim saturation to avoid more iterations
- Do NOT cherry-pick which accusations to fact-check
- Do NOT ignore conspiracy theories because they're "obviously false"

---

## Detailed Documentation

| Topic | File |
|-------|------|
| System architecture | `architecture.md` |
| Case structure | `architecture.md` → Case Directory Structure |
| Full investigation procedure | `.claude/commands/investigate.md` |
| Verification procedure | `.claude/commands/verify.md` |
| Status command | `.claude/commands/status.md` |
| OSINT command | `.claude/commands/osint.md` |
| Deep-web data sources | `docs/investigative_data_sources.md` |
