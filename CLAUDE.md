# AgenticInvestigator - Claude Instructions

Behavioral rules for Claude Code operating in this project.

---

## Core Principle

**The orchestrator knows nothing about content.**

- Orchestrator reads ONLY `state.json`
- All research, analysis, and writing done by sub-agents via `/action` router
- Git history IS the ledger (no separate ledger file)
- **Each case = separate git repository** (created during BOOTSTRAP)

---

## Workflow

```
/investigate [topic]
      │
      ▼
┌─────────────────┐
│ BOOTSTRAP       │  /action research
│                 │  Capture sources, draft summary.md
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ QUESTION        │  /action question (5 batches)
│                 │  Answer all 35 frameworks
│                 │  Generate leads in leads.json
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ FOLLOW          │  /action follow (per lead)
│                 │  Pursue each lead to conclusion
│     ◄───────────┤  /action curiosity → NOT SATISFIED
└────────┬────────┘
         │ /action curiosity → SATISFIED
         ▼
┌─────────────────┐
│ WRITE           │  /action article
│                 │  Generate short.md and full.md
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ VERIFY          │  /action verify (6 gates)
│                 │  /action integrity, /action legal-review
│     ◄───────────┤  Fails → back to FOLLOW
└────────┬────────┘
         │ All pass
         ▼
     COMPLETE
```

---

## The 6 Gates

| # | Gate | Check | Pass Criteria |
|---|------|-------|---------------|
| 1 | Questions | All `questions/*.md` | Status: investigated |
| 2 | Curiosity | `/curiosity` judgment | Verdict: SATISFIED |
| 3 | Article | `articles/full.md` | Exists with [S###] citations |
| 4 | Sources | Evidence verification | All [S###] verified or auto-removed |
| 5 | Integrity | `/integrity` review | Status: READY |
| 6 | Legal | `/legal-review` | Status: READY |

**Termination:** All 6 gates pass.

---

## Commands

| Command | Purpose | Invoked By |
|---------|---------|------------|
| `/investigate` | Start/resume investigation | User |
| `/action` | Router (git + dispatch) | Orchestrator |
| `/research` | Broad topic research | Orchestrator |
| `/question` | Answer framework batch | Orchestrator |
| `/follow` | Pursue single lead | Orchestrator |
| `/curiosity` | Check lead exhaustion | Orchestrator |
| `/capture-source` | Capture evidence | Any agent |
| `/verify` | Check 6 gates | Orchestrator |
| `/article` | Write publication | Orchestrator |
| `/integrity` | Journalistic check | Orchestrator |
| `/legal-review` | Legal risk check | Orchestrator |

---

## Orchestrator Pattern

**Main instance ONLY orchestrates. Sub-agents do all work.**

### Orchestrator CAN Read

- `state.json` - Minimal state (phase, iteration, gates)

### Orchestrator CANNOT Read

- `summary.md` - Content file
- `questions/*.md` - Content files
- `evidence/` - Raw content
- Any content files

### Orchestrator Responsibilities

1. Read `state.json` to determine current phase
2. Dispatch appropriate `/action` command
3. Track progress via TodoWrite
4. Loop until all 6 gates pass

### Orchestrator MUST NOT

- Call MCP tools directly
- Reason about investigation completeness
- Make substantive claims about findings
- Read content files

---

## Case Structure

**Each case is its own git repository**, created during BOOTSTRAP at `cases/[topic-slug]/`.

```
cases/[topic-slug]/           # ← Standalone git repo (git init here)
├── .git/                    # Case-specific git history
├── state.json               # Minimal (phase, iteration, gates)
├── summary.md               # Living document, always current
├── leads.json               # Leads: pending, investigated, dead_end
├── sources.json             # Source registry
├── removed-points.md        # Auto-removed points (human review)
│
├── questions/               # 35 framework documents
│   ├── 01-follow-the-money.md
│   ├── 02-follow-the-silence.md
│   └── ... (35 total)
│
├── evidence/                # Captured sources
│   └── S###/
│       ├── metadata.json
│       ├── content.md
│       └── screenshot.png
│
└── articles/
    ├── short.md             # 400-800 words
    └── full.md              # 2000-4000 words
```

### Bootstrap Creates Repository

During BOOTSTRAP phase, `/action research` must:
1. Create `cases/[topic-slug]/` directory
2. Run `git init` inside the case directory
3. Create initial files (state.json, sources.json, leads.json)
4. Make initial commit: "Initialize [topic] investigation"

All subsequent `/action` commits happen within the case repository.

---

## state.json

```json
{
  "case": "topic-slug",
  "topic": "Full topic description",
  "phase": "QUESTION",
  "iteration": 2,
  "next_source": 48,
  "gates": {
    "questions": false,
    "curiosity": false,
    "article": false,
    "sources": false,
    "integrity": false,
    "legal": false
  }
}
```

---

## leads.json

```json
{
  "leads": [
    {
      "id": "L001",
      "lead": "SEC filings for company X",
      "from": "01-follow-the-money",
      "priority": "HIGH",
      "status": "investigated",
      "result": "Found in S045",
      "sources": ["S045"]
    },
    {
      "id": "L002",
      "lead": "CDC data by housing type",
      "from": "27-causation-correlation",
      "priority": "MEDIUM",
      "status": "dead_end",
      "result": "Data not disaggregated"
    }
  ]
}
```

---

## Core Rules

1. **CAPTURE BEFORE CITE** - No `[S###]` without `evidence/S###/`
2. **EVERY FACT NEEDS A SOURCE** - Every factual statement needs `[S###]` citation
3. **Git commits per action** - Every `/action` auto-commits (within the case repo)
4. **Steelman ALL positions** - Strongest version of EVERY side
5. **Document uncertainty** - "We don't know" is valid
6. **Detect circular reporting** - Multiple outlets citing same source = 1 source
7. **One case = one repo** - Never mix case data across repositories

---

## Source Integrity

### One Source = One URL

A source is a **single, specific URL** that was actually fetched. Never:

- Create "research compilation" sources synthesizing multiple URLs
- Point to homepages instead of specific articles
- Write content.md manually instead of capturing

### Verification Required

Every source MUST have:
```
evidence/S###/
├── content.md       # Written by capture script, NOT manually
├── metadata.json    # REQUIRED - proves capture happened
```

**If metadata.json doesn't exist, the source is invalid.**

### Red Flags for Fabricated Sources

- No metadata.json in evidence folder
- content.md starts with "Research compilation..."
- Timestamp is round number like `T20:00:00.000Z`
- URL is a homepage, not specific article
- Title includes "Compilation" or "Summary"

### MCP Search → URL Extraction → Capture

When MCP search tools return results:

1. **Extract specific URLs** from the response (look for markdown links, citation blocks)
2. **Capture each URL** with `node scripts/capture.js`
3. **Verify metadata.json exists**
4. **Only then cite** with [S###]

### PDF Handling

For PDFs: `node scripts/capture.js --document S### <url>`

If PDF capture fails, note the URL but do NOT synthesize content.

---

## Source Auto-Removal

When `/verify` finds unverifiable source:
1. Try re-capture
2. Search for alternate
3. If none found → auto-remove from summary.md
4. Log to `removed-points.md`:

```markdown
## Removed: "Company X spent $50M on ads"
- **Source:** [S089]
- **Reason:** 404, no archive
- **Section:** Industry Response
- **Date:** 2026-01-13
```

---

## 35 Frameworks

See `reference/frameworks.md` for the full list and guiding questions.

---

## MCP Quick Reference

| Need | Server | Tool |
|------|--------|------|
| Semantic verification | mcp-gemini | `generate_text` (gemini-3-pro) |
| Deep research (fast) | mcp-gemini | `deep_research` |
| Deep research (max) | mcp-openai | `deep_research` |
| Real-time search | mcp-xai | `research`, `x_search`, `web_search` |

---

## Anti-Gaming Rules

- Do NOT skip verification
- Do NOT claim saturation to avoid iterations
- Do NOT cherry-pick claims to check
- Do NOT ignore alternative theories
- Do NOT give benefit of the doubt on gaps
- Do NOT "document gaps" instead of fixing them
- Do NOT cite without captured evidence
- Do NOT self-report gate passage

---

## Autonomous Continuation

**Continue until ALL 6 gates pass.**

### Continuation Signal

After every `/action`, the router outputs an **ORCHESTRATOR SIGNAL**:

```
═══════════════════════════════════════════════════════
ORCHESTRATOR SIGNAL
═══════════════════════════════════════════════════════
Status: → CONTINUE
Next: /action question
DO NOT STOP. Execute the next action immediately.
═══════════════════════════════════════════════════════
```

**React to the signal:**

| Signal | Action |
|--------|--------|
| `Status: → CONTINUE` | Execute the next `/action` immediately |
| `Status: ✓ COMPLETE` | Report completion to user |

### Do NOT Ask

- "Would you like me to continue?"
- "Should I fix this?"
- "5/6 gates passing, what next?"

### Do

- Read the ORCHESTRATOR SIGNAL after each `/action`
- Execute the suggested next action
- Loop until signal says COMPLETE

**Only pause for:**
- External API failures
- Irreconcilable contradictions needing human judgment
- Scope expansion requiring approval
- Legal/ethical concerns
