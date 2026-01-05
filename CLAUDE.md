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
| `/investigate [case-id] [topic]` | Resume case with new research direction | `.claude/commands/investigate.md` |
| `/verify` | Run verification checkpoint | `.claude/commands/verify.md` |
| `/verify [case-id]` | Verify specific case | `.claude/commands/verify.md` |
| `/status` | Show case progress | `.claude/commands/status.md` |
| `/status [case-id]` | Show status of specific case | `.claude/commands/status.md` |
| `/status --list` | List all cases | `.claude/commands/status.md` |
| `/osint` | OSINT quick reference | `.claude/commands/osint.md` |
| `/osint [topic]` | OSINT sources for specific investigation type | `.claude/commands/osint.md` |

---

## Core Philosophy: INSATIABLE CURIOSITY

**The key to AgenticInvestigator is to be INSATIABLY CURIOUS.**

Every finding triggers more questions. Every person gets investigated. Every source gets traced. Every contradiction gets explored. Every gap gets filled. **Every claim from ALL sides gets fact-checked.**

### The Looping Principle

```
DO NOT STOP EARLY.

Only stop when ALL conditions are true:
  1. No unexplored avenues remaining
  2. All positions documented
  3. All alternative theories addressed
  4. All major claims from ALL sides fact-checked
  5. Verification checklist passed
```

---

## The Investigation Loop

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INVESTIGATION LOOP                          │
│                                                                     │
│  PHASE 1: RESEARCH                                                  │
│    - Gemini deep research (primary)                                 │
│    - OpenAI deep research (critical claims)                         │
│    - XAI real-time search (current events, social media)            │
│                                                                     │
│  PHASE 2: EXTRACTION                                                │
│    - Extract all claims, people, dates, contradictions              │
│    - Categorize by position/perspective                             │
│                                                                     │
│  PHASE 3: INVESTIGATION                                             │
│    - For EVERY person: investigate background                       │
│    - For EVERY claim: verify with multiple sources                  │
│    - For EVERY contradiction: investigate discrepancy               │
│                                                                     │
│  PHASE 4: VERIFICATION CHECKPOINT (periodic)                        │
│    → Cross-model critique (Gemini critiques Claude)                 │
│    → Identify unexplored claims from ALL positions                  │
│    → Identify alternative theories to address                       │
│    → Fact-check all major claims                                    │
│    → List specific gaps                                             │
│    → If gaps exist: CONTINUE                                        │
│                                                                     │
│  PHASE 5: SYNTHESIS                                                 │
│    - Register sources in sources.md (append-only, [SXXX] IDs)       │
│    - Update detail files (timeline, people, positions, etc.)        │
│    - Update summary.md (embed full source list)                     │
│    - Log iteration in iterations.md                                 │
│                                                                     │
│  TERMINATION CHECK                                                  │
│    - no_unexplored_threads                                          │
│    - all_positions_documented                                       │
│    - alternative_theories_addressed                                 │
│    - all_major_claims_fact_checked                                  │
│    - verification_checklist_passed                                  │
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
- All major positions/perspectives
- Alternative theories
```

**Phase 4 - Verification (parallel)**:
```
Launch ALL of these simultaneously in ONE message:
- Cross-model critique (Gemini)
- Unexplored claims search (all positions)
- Alternative theory search
```

---

## Case File Structure

```
cases/inv-YYYYMMDD-HHMMSS/
├── summary.md        # THE DELIVERABLE - self-contained, shareable, has ALL sources
├── sources.md        # Master source registry [S001], [S002]... (append-only)
├── timeline.md       # Chronological events
├── people.md         # Person profiles
├── positions.md      # ALL positions with arguments and evidence
├── fact-check.md     # Claim verdicts (all positions)
├── theories.md       # Alternative/fringe theories
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
2. **Steelman ALL positions** - Build strongest version of EVERY side.
3. **Separate fact from inference** - Be explicit about what's proven vs. concluded.
4. **Document uncertainty** - "We don't know" is a valid finding.
5. **Detect circular reporting** - Multiple outlets citing each other is one source.
6. **Fact-check ALL sides** - Claims from every position get verified.
7. **Address alternative theories** - Don't ignore them; investigate with evidence.
8. **Every claim needs [SXXX]** - Source attribution is sacred. No ID = no claim.
9. **Append-only sources** - Never renumber or delete source IDs.
10. **summary.md is self-contained** - Must embed full source list, shareable standalone.

---

## Verification Checkpoint Rules

**Run verification checkpoint:**
- Periodically during investigation
- When claiming "saturation" (no more threads)
- When claiming "complete" (before final status)
- When user says "wrap up"

**If gaps exist:**
- MUST continue investigating
- Address listed gaps in next iteration(s)
- Re-verify when gaps addressed

**Anti-gaming rules:**
- Do NOT skip verification because "it's obviously done"
- Do NOT claim saturation to avoid more iterations
- Do NOT cherry-pick which claims to fact-check
- Do NOT ignore alternative theories because they're "obviously false"

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
