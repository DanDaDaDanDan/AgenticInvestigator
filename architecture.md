# AgenticInvestigator Architecture

Technical design documentation for the multi-agent investigation framework.

**See `rules.md` for canonical rules (sources, evidence, verification, state ownership).**

---

## System Overview

AgenticInvestigator is an orchestrated multi-agent system that investigates contested narratives through:

1. **Triple deep research** across Gemini, OpenAI, and XAI engines
2. **Insatiable curiosity looping** until exhaustion
3. **Inner loops on all points** found in each iteration
4. **Built-in verification checkpoints**
5. **Cross-model critique** for validation
6. **All-sides fact-checking** (every position)
7. **Alternative theory handling** (investigate, don't ignore)
8. **Modular file output** with self-contained summary.md deliverable

### Core Principles

- **Insatiable curiosity**: Every finding triggers more questions
- **Loop until exhausted**: No artificial iteration limits
- **Verification checkpoints**: Periodic audits to catch gaps
- **Loop on all points**: Process everything, never cherry-pick
- **Triple deep research**: Gemini + OpenAI + XAI for triangulation
- **Source attribution is sacred**: Every claim traces to a source ID

---

## Looping Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INVESTIGATION LOOP                                 │
│                                                                              │
│  PHASE 1: RESEARCH                                                           │
│    Run deep research (Gemini, OpenAI, XAI in parallel)                       │
│    Save to research-leads/                                                   │
│                                                                              │
│  PHASE 2: EXTRACTION                                                         │
│    Parse research-leads/ → _extraction.json                                  │
│    Extract: people, entities, claims, events, statements, contradictions    │
│                                                                              │
│  PHASE 2.5: QUESTIONS (conditional)                                          │
│    Run /questions when triggered (see conditions below)                      │
│    Generates new investigation angles via 20 frameworks                      │
│                                                                              │
│  PHASE 3: INVESTIGATION                                                      │
│    For each person/entity/claim → investigate in parallel                    │
│    Capture evidence, verify claims, update detail files                      │
│                                                                              │
│  PHASE 4: VERIFICATION                                                       │
│    Anti-hallucination check (verify claims in evidence)                      │
│    Cross-model critique (Gemini critiques Claude)                            │
│    Gap analysis → update _state.json                                         │
│                                                                              │
│  PHASE 5: SYNTHESIS                                                          │
│    Rewrite summary.md (complete, not append)                                 │
│    Git commit                                                                │
│                                                                              │
│  TERMINATION CHECK                                                           │
│    verification_passed && gaps.length == 0 → FINALE LOOP                     │
│    else → CONTINUE                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### /questions Trigger Conditions

Run `/questions` when ANY of these are true:

| Condition | Frameworks to Apply |
|-----------|---------------------|
| `iteration == 1` | Early: Core (1-6), Stakeholder, Relationships, Sense-Making |
| `iteration % 4 == 0` | Mid: Add ACH, Assumptions, Patterns, Meta, 5 Whys |
| `verification_passed == false && gaps lack clear paths` | Stuck: Pre-Mortem, Bias Check, Uncomfortable Questions |
| Claiming saturation/completion | Late: Counterfactual, Pre-Mortem, Cognitive Bias, Second-Order |

**Purpose**: Prevent tunnel vision, surface blind spots, ensure systematic framework coverage.

---

## Orchestrator Pattern

**The main Claude Code instance ONLY orchestrates.** All work is done by sub-agents via Task tool.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR (Main Loop)                             │
│                                                                              │
│  NEVER:                              ONLY:                                   │
│  ✗ Call MCP tools directly           ✓ Read _state.json                     │
│  ✗ Read full file contents           ✓ Dispatch sub-agents (Task tool)      │
│  ✗ Write large content               ✓ Wait for completion                  │
│  ✗ Accumulate findings in memory     ✓ Track iteration/termination          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │                │                │                │
         ▼                ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ Research │    │Extraction│    │Investigat│    │ Synthesis│
   │  Agent   │    │  Agent   │    │  Agent   │    │  Agent   │
   └──────────┘    └──────────┘    └──────────┘    └──────────┘
         │                │                │                │
         ▼                ▼                ▼                ▼
    research-       _extraction.      people.md        summary.md
    leads/*.md           .json       timeline.md       sources.md
                                    fact-check.md
```

### Sub-Agent Contract

Every sub-agent MUST:
1. Receive clear task (file paths, what to investigate, where to write)
2. Do the work (use MCP tools, read files, analyze)
3. Write ALL findings to files (never return large content)
4. Return brief status ("Completed [task], wrote N items")

---

## Case Structure

**Each case has its own git repository. Commit after every iteration.**

```
cases/[topic-slug]/
├── _state.json               # Orchestrator state (machine-readable)
├── _extraction.json          # Current extraction (claims, people, entities)
├── .git/                     # Version control
├── evidence/                 # Captured sources
│   ├── web/SXXX/            # Screenshots, PDFs, HTML per source
│   ├── documents/           # Downloaded PDFs
│   └── api/, media/         # Other evidence types
├── research-leads/           # AI research outputs (NOT citable)
├── summary.md                # THE DELIVERABLE (self-contained)
├── sources.md                # Source registry with evidence paths
├── timeline.md               # Chronological events
├── people.md                 # Person profiles with role timelines
├── organizations.md          # Entity profiles (corporations, agencies)
├── positions.md              # All positions with arguments
├── fact-check.md             # Claim verdicts
├── theories.md               # Alternative theory analysis
├── statements.md             # Statement vs evidence analysis
├── iterations.md             # Progress log + checkpoints
├── integrity-check.md        # Journalistic integrity assessment
├── legal-review.md           # Legal risk assessment
└── articles.md               # Publication-ready articles
```

### _state.json Schema

```json
{
  "case_id": "topic-slug",
  "topic": "Original investigation topic",
  "status": "IN_PROGRESS",
  "current_iteration": 5,
  "current_phase": "VERIFICATION",
  "next_source_id": "S048",
  "people_count": 12,
  "entities_count": 8,
  "sources_count": 47,
  "gaps": ["gap1", "gap2"],
  "verification_passed": false,
  "last_verification": "2026-01-08T10:30:00Z",
  "created_at": "2026-01-07T09:00:00Z",
  "updated_at": "2026-01-08T10:30:00Z"
}
```

**Status values:** `IN_PROGRESS`, `COMPLETE`, `PAUSED`, `ERROR`
**Phase values:** `SETUP`, `RESEARCH`, `EXTRACTION`, `QUESTIONS`, `INVESTIGATION`, `VERIFICATION`, `SYNTHESIS`, `FINALE`, `COMPLETE`

### _extraction.json Schema

```json
{
  "iteration": 5,
  "people": [{"name": "...", "role": "...", "needs_investigation": true}],
  "entities": [{"name": "...", "type": "corporation", "jurisdiction": "..."}],
  "claims": [{"text": "...", "position": "Critics", "needs_verification": true}],
  "events": [{"date": "...", "event": "...", "entities_involved": [...]}],
  "statements": [{"speaker": "...", "date": "...", "venue": "...", "summary": "..."}],
  "contradictions": [{"description": "...", "sources": [...]}],
  "sources_to_capture": [{"url": "...", "type": "news", "priority": "HIGH"}]
}
```

---

## Phase State Machine

```
SETUP → RESEARCH → EXTRACTION → QUESTIONS? → INVESTIGATION → VERIFICATION
                                    │                             ↓
                                    │          ↑←←← gaps > 0 ←←←←←|
                    (conditional:   │          ↑                   ↓
                     iter==1,       │  RESEARCH ←← (!passed)       |
                     iter%4==0,     │                              ↓
                     stuck)         │      SYNTHESIS ←←←←←←←←←←←←←| (passed && gaps==0)
                                    │          ↓
                                    │          → RESEARCH (new iteration)
                                    │          → FINALE (if passed && no gaps)
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  FINALE LOOP                                                                 │
│                                                                              │
│  QUESTIONS (late) → VERIFY → INTEGRITY → LEGAL-REVIEW → COMPLETE            │
│       ↓                ↓          ↓            ↓                             │
│   critical?         fails?     MAJOR?       HIGH?                            │
│       ↓                ↓          ↓            ↓                             │
│   → back to        → back to   address     address                           │
│     RESEARCH         RESEARCH  → VERIFY    → VERIFY                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Evidence Capture

### Purpose

**Hallucination-proof source verification.** Every source has local evidence that proves:
1. The source existed at research time
2. The content actually contained the cited claims
3. Content can be verified even if original URL disappears

### Workflow

```
Source Found → IMMEDIATE CAPTURE → Verify Claim → Register Source
                     ↓
              ./scripts/capture SXXX URL
                     ↓
              evidence/web/SXXX/
              ├── capture.png
              ├── capture.pdf
              ├── capture.html
              └── metadata.json
```

### AI Research Handling

**AI research outputs are NOT sources.**

| What | Where | Citable? |
|------|-------|----------|
| Gemini/OpenAI deep research | `research-leads/*.md` | **NO** |
| Primary source found via AI | `evidence/web/SXXX/` | **YES** |

Find the primary source URL, capture it, then cite that.

---

## MCP Server Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Claude Code                                     │
└─────────────────────────────────────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   mcp-gemini    │ │   mcp-openai    │ │    mcp-xai      │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ deep_research   │ │ deep_research   │ │ x_search        │
│ check_research  │ │ check_research  │ │ web_search      │
│ generate_text   │ │ generate_text   │ │ news_search     │
└─────────────────┘ │ web_search      │ │ research        │
                    └─────────────────┘ └─────────────────┘
```

### Tool Selection

| Task | Server | Tool | Notes |
|------|--------|------|-------|
| Deep research (fast) | gemini | `deep_research` | 5-30 min |
| Deep research (max depth) | openai | `deep_research` | 10-60 min |
| Real-time multi-source | xai | `research` | sources: ["x","web","news"] |
| Cross-model critique | gemini | `generate_text` | thinking_level: high |
| Check/resume timeout | gemini/openai | `check_research` | Use ID from error |

### Deep Research Error Handling

| Error Prefix | Recovery |
|-------------|----------|
| `TIMEOUT:` | Use `check_research` with ID |
| `AUTH_ERROR:` | Check credentials |
| `RATE_LIMIT:` | Wait and retry |
| `NOT_FOUND:` | Start new research |

---

## Verification System

### When Checkpoints Run

| Trigger | Condition |
|---------|-----------|
| Periodic | Every 3-5 iterations |
| Saturation claim | When claiming "no more threads" |
| Completion claim | Before marking COMPLETE |
| User request | When user says "wrap up" |

### Core Checklist (all must be YES)

1. All major people investigated
2. All major claims fact-checked (ALL positions)
3. All positions steelmanned
4. Alternative theories addressed with evidence
5. All sources have captured evidence
6. No CONTRADICTED claims (from verify-claims.js)

### Anti-Hallucination Check

```bash
node scripts/verify-claims.js cases/[case-id]
```

| Verdict | Action |
|---------|--------|
| VERIFIED | None |
| NOT_FOUND | Find evidence or revise claim |
| CONTRADICTED | Urgent fix required |
| NO_EVIDENCE | Capture the source |

---

## Termination

**All conditions must be true:**
- `verification_passed == true`
- `gaps.length == 0`

### Termination Signals

**You ARE likely done when:**
- Same sources appear across all research engines
- New iterations yield <10% novel information
- Cross-model critique finds only minor gaps
- Remaining gaps are genuinely unanswerable

**You are NOT done because:**
- You've completed many iterations
- It "feels" complete
- Most checklist items are green

---

## summary.md Standards

**summary.md is THE DELIVERABLE — a polished final product.**

| Is | Is Not |
|----|----|
| Self-contained final report | Log of iterative discoveries |
| Written as if in one sitting | Ledger with "additionally found..." |
| Ready to share with anyone | Working document with artifacts |
| Publishable quality | Internal scratchpad |

**Rewrite, don't append.** Each update is a complete rewrite.

**Forbidden phrases:**
- ❌ "We also found...", "Additionally...", "Further investigation revealed..."
- ✅ Just state findings directly

**The test:** Could you hand this to a journalist or executive right now?

---

## Investigation Loop Finale

**The finale is itself a loop.** Addressing issues may introduce new problems that require re-verification.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FINALE LOOP                                     │
│                                                                              │
│  ENTRY: verification_passed && gaps.length == 0                              │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  STEP 1: /questions (late stage - adversarial frameworks)              │  │
│  │    Apply: Counterfactual, Pre-Mortem, Cognitive Bias, Uncomfortable    │  │
│  │    Purpose: Final blind spot check before publication                   │  │
│  │    If new critical questions → return to INVESTIGATION LOOP             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                    ↓                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  STEP 2: /verify                                                       │  │
│  │    Full verification checkpoint                                         │  │
│  │    If FAILS → return to INVESTIGATION LOOP                              │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                    ↓                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  STEP 3: /integrity                                                    │  │
│  │    Journalistic integrity check                                         │  │
│  │    If MAJOR issues → address them → go to STEP 2                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                    ↓                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  STEP 4: /legal-review                                                 │  │
│  │    Legal risk assessment                                                │  │
│  │    If HIGH risks → address them → go to STEP 2                          │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                    ↓                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  STEP 5: ALL CLEAR                                                     │  │
│  │    - verification_passed == true                                        │  │
│  │    - integrity issues: none or minor only                               │  │
│  │    - legal risks: acceptable                                            │  │
│  │    → /article (generate publication-ready articles)                     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Finale Loop Rules

| After... | If... | Then... |
|----------|-------|---------|
| /questions | Critical new questions found | Exit to INVESTIGATION LOOP |
| /verify | Fails | Exit to INVESTIGATION LOOP |
| /integrity | MAJOR issues | Address → re-run /verify |
| /legal-review | HIGH risks | Address → re-run /verify |
| /legal-review | All clear | Proceed to /article |

**Why loop?** Addressing legal issues may change claims. Fixing integrity issues may introduce new unverified statements. Every change requires re-verification.

---

## Parallel Dispatch

**Launch independent sub-agents in ONE message.**

### Research Phase Example

```
Task 1: Gemini deep research on [topic]
Task 2: OpenAI deep research on [critical claims]
Task 3: XAI multi-source search
Task 4: X/Twitter discourse
Task 5: Official records search
Task 6: Alternative theories search
```

All write to `research-leads/`. Orchestrator waits for all to complete.

### Investigation Phase Example

```
Task 1: Investigate Person A
Task 2: Investigate Person B
Task 3: Verify Claim X
Task 4: Investigate Entity Y
```

All write to respective detail files.

---

## Capture Scripts

| Script | Purpose |
|--------|---------|
| `scripts/capture` | Main capture wrapper |
| `scripts/capture-url.js` | Playwright capture |
| `scripts/firecrawl-capture.js` | Bot-bypass capture |
| `scripts/verify-sources.js` | Verify evidence integrity |
| `scripts/verify-claims.js` | Anti-hallucination check |
| `scripts/find-failed-captures.js` | Audit capture quality |

---

## Deep-Web Data Sources

These sources are NOT indexed by Google — must query directly:

| Type | Sources |
|------|---------|
| Government spending | USAspending.gov, state checkbooks |
| Corporate entities | OpenCorporates, SEC EDGAR, state SOS |
| Nonprofits | ProPublica Nonprofit Explorer, IRS 990 |
| Court cases | PACER, RECAP/CourtListener |
| Campaign finance | OpenSecrets, FEC database |
| Shell companies | ICIJ Offshore Leaks, OpenSanctions |
| Deleted content | Wayback Machine, Archive.today |

Full reference: `docs/investigative_data_sources.md`
