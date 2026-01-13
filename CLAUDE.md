# AgenticInvestigator - Claude Instructions

Behavioral rules for Claude Code operating in this project.

---

## Core Principle

**The orchestrator knows nothing about content.**

- Orchestrator reads ONLY `state.json`
- All research, analysis, and writing done by sub-agents via `/action` router
- Git history IS the ledger (no separate ledger file)

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

```
cases/[topic-slug]/
├── state.json           # Minimal (phase, iteration, gates)
├── summary.md           # Living document, always current
├── leads.json           # Leads: pending, investigated, dead_end
├── sources.json         # Source registry
├── removed-points.md    # Auto-removed points (human review)
│
├── questions/           # 35 framework documents
│   ├── 01-follow-the-money.md
│   ├── 02-follow-the-silence.md
│   └── ... (35 total)
│
├── evidence/            # Captured sources
│   └── S###/
│       ├── metadata.json
│       ├── content.md
│       └── screenshot.png
│
└── articles/
    ├── short.md         # 400-800 words
    └── full.md          # 2000-4000 words
```

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
3. **Git commits per action** - Every `/action` auto-commits
4. **Steelman ALL positions** - Strongest version of EVERY side
5. **Document uncertainty** - "We don't know" is valid
6. **Detect circular reporting** - Multiple outlets citing same source = 1 source

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

See `.claude/commands/_frameworks.md` for the full list and guiding questions.

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

Do NOT ask the user:
- "Would you like me to continue?"
- "Should I fix this?"
- "5/6 gates passing, what next?"

DO:
- Read state.json
- Dispatch appropriate `/action` command
- Loop until complete

**Only pause for:**
- External API failures
- Irreconcilable contradictions needing human judgment
- Scope expansion requiring approval
- Legal/ethical concerns
