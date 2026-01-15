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
├── leads.json               # Leads with depth tracking (max_depth: 3)
├── sources.json             # Source registry
├── removed-points.md        # Auto-removed points (human review)
├── future_research.md       # Leads beyond max_depth
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

During BOOTSTRAP phase:
1. Run `node scripts/init-case.js "[topic]"` which:
   - Creates `cases/[topic-slug]/` directory
   - Creates initial files (state.json, sources.json, leads.json, future_research.md, 35 question files)
   - Runs `git init` inside the case directory
   - Makes initial commit: "Initialize investigation: [topic]"
2. Then dispatch `/action research` to begin research

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
  "max_depth": 3,
  "leads": [
    {
      "id": "L001",
      "lead": "SEC filings for company X",
      "from": "01-follow-the-money",
      "priority": "HIGH",
      "depth": 0,
      "parent": null,
      "status": "investigated",
      "result": "Found in S045",
      "sources": ["S045"]
    },
    {
      "id": "L002",
      "lead": "CDC data by housing type",
      "from": "L001",
      "priority": "MEDIUM",
      "depth": 1,
      "parent": "L001",
      "status": "dead_end",
      "result": "Data not disaggregated"
    }
  ]
}
```

**Depth tracking:**
- `depth: 0` - Original leads from research/questions
- `depth: 1+` - Generated while investigating parent lead
- `parent` - ID of lead that spawned this one (null for depth 0)
- Leads beyond `max_depth` go to `future_research.md` instead

---

## Core Rules

1. **CAPTURE BEFORE CITE** - No `[S###]` without `evidence/S###/`
2. **EVERY FACT NEEDS A SOURCE** - Every factual statement needs `[S###]` citation
3. **Git commits per action** - Every `/action` auto-commits (within the case repo)
4. **Steelman ALL positions** - Strongest version of EVERY side
5. **Document uncertainty** - "We don't know" is valid
6. **Detect circular reporting** - Multiple outlets citing same source = 1 source
7. **One case = one repo** - Never mix case data across repositories
8. **ALL LEADS RESOLVED** - Every lead must be `investigated` or `dead_end`. No `pending` at completion.

---

## Source Integrity

### One Source = One URL

A source is a **single, specific URL** that was actually fetched. Never:

- Create "research compilation" sources synthesizing multiple URLs
- Point to homepages instead of specific articles
- Write content.md manually instead of capturing

### Verifiable Evidence Structure

Every source MUST have:
```
evidence/S###/
├── content.md       # Markdown for reading
├── raw.html         # Original HTML (for web pages) - REQUIRED for verification
├── metadata.json    # With verification block and capture signature
```

**metadata.json must contain:**
```json
{
  "source_id": "S###",
  "url": "https://...",
  "captured_at": "2026-01-14T22:34:56.789Z",
  "files": { ... },
  "verification": {
    "raw_file": "raw.html",
    "computed_hash": "sha256:...",
    "osint_reported_hash": "sha256:..."
  },
  "_capture_signature": "sig_v2_..."
}
```

### Hash Verification

During `/verify`, each cited source is verified:
1. Hash the raw file (raw.html or PDF)
2. Compare to `verification.computed_hash`
3. Check against `verification.osint_reported_hash`
4. Mismatch = source is invalid or tampered

**Run verification:**
```bash
node scripts/verify-source.js --check-article cases/[case-id]
```

### Red Flags (Auto-detected)

- No metadata.json → source invalid
- No `_capture_signature` → may be manually created
- Hash mismatch → content tampered
- Round timestamp (`T20:00:00.000Z`) → suspicious
- Homepage URL → should be specific article
- content.md starts with "Research compilation..." → fabricated

### Capture Workflow

When MCP search tools return results:

1. **Extract specific URLs** from the response
2. **Capture using osint_get:**
   - Web pages: `osint_get target=<url>` → save FULL response (including raw_html)
   - PDFs: `osint_get target=<url> output_path=evidence/S###/paper.pdf`
3. **Save with osint-save.js:** Preserves raw_html and creates verification block
4. **Verify immediately:** Check that verification.verified = true
5. **Only then cite** with [S###]

### PDF Handling

For PDFs: `osint_get target=<url> output_path=evidence/S###/document.pdf`

Returns SHA256 hash. Then use Gemini to extract content to content.md.
The PDF binary IS the raw file for verification.

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
| **Find sources** | mcp-osint | `osint_search` |
| **Get content** | mcp-osint | `osint_get` (URLs, PDFs, resource_ids) |
| Semantic verification | mcp-gemini | `generate_text` (gemini-3-pro) |
| Deep research (fast) | mcp-gemini | `deep_research` |
| Deep research (max) | mcp-openai | `deep_research` |
| Real-time search | mcp-xai | `research`, `x_search`, `web_search` |

### OSINT Data Sources

| Source | Data Type |
|--------|-----------|
| `courtlistener` | Court cases, legal opinions |
| `legiscan` | State/federal legislation |
| `sec_edgar` | SEC filings, financials |
| `openalex` | Academic research |
| `pubmed` | Medical/health research |
| `data_gov` | Federal government data |
| `census` | Demographics |
| `fred` | Economic data |
| `gdelt` | Global news events |

### Capture Workflow (Unified)

**osint_get handles everything:**

| Target | What happens | Returns |
|--------|--------------|---------|
| Web URL | Firecrawl → markdown | `format: "markdown"`, `content`, `raw_html`, `links`, `sha256` |
| PDF URL | Download binary | `format: "pdf"`, `output_path`, `sha256` |
| resource_id | Connector extract | `format: "json"/"text"`, `content`, `sha256` (supports filters, columns, limit) |

**Example:**
```
osint_get target="https://example.com/paper.pdf" output_path="evidence/S001/paper.pdf"
→ { format: "pdf", output_path: "...", metadata: { sha256: "abc123..." } }
```

**Then for PDFs:** Use Gemini to extract content to content.md

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
