# AgenticInvestigator Architecture

Technical design documentation for the multi-agent investigation framework.

**See `framework/rules.md` for canonical rules (sources, evidence, verification, state ownership).**

---

## System Overview

AgenticInvestigator is an orchestrated multi-agent system that investigates contested narratives through:

1. **Dynamic task generation** — case-specific investigation tasks generated on-the-fly
2. **Triple deep research** across Gemini, OpenAI, and XAI engines
3. **Required perspective coverage** — enforced rigor through 10 core perspectives
4. **Adversarial review** — systematic blind spot detection
5. **20-framework rigor checkpoint** — termination gate validation
6. **Coverage metrics** — quantitative tracking of investigation completeness
7. **9 termination gates** — mechanically verified, cannot complete without all passing
8. **State-filesystem consistency** — verification scripts compare claims vs reality

### Core Principles

- **Insatiable curiosity**: Every finding triggers more questions (curiosity tasks required each cycle)
- **Dynamic, not hardcoded**: Tasks generated based on case specifics, not generic templates
- **Structural rigor**: Coverage thresholds and framework validation enforce thoroughness
- **Source attribution is sacred**: Every claim traces to a source ID
- **The LLM knows domain knowledge**: We don't spell out SEC/OSINT sources—generate what's relevant

---

## Dynamic Task Generation (Core Innovation)

Instead of fixed phases with hardcoded triggers, the system:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DYNAMIC INVESTIGATION LOOP                            │
│                                                                              │
│  1. INITIAL RESEARCH (multi-engine, parallel)                               │
│     → Save to research-leads/                                                │
│                                                                              │
│  2. EXTRACTION                                                               │
│     → Parse findings into _extraction.json                                   │
│                                                                              │
│  3. SOURCE DISCOVERY (dynamic)                                               │
│     → Use deep research to find case-specific data sources                   │
│     → Merge baseline (data-sources.md) + discovered sources                  │
│     → Write to _sources.json                                                 │
│                                                                              │
│  4. TASK GENERATION (core innovation)                                        │
│     Generate tasks with REQUIRED PERSPECTIVES:                               │
│     □ Money/Financial    □ Silence           □ Documents                     │
│     □ Timeline           □ Contradictions    □ Relationships                 │
│     □ Hypotheses         □ Assumptions       □ Counterfactual                │
│     □ Blind Spots        + CURIOSITY CHECK (2+ tasks required)               │
│     → Use sources from _sources.json                                         │
│     → Write to _tasks.json                                                   │
│                                                                              │
│  5. ADVERSARIAL PASS                                                         │
│     For each task: What would DISPROVE it?                                   │
│     Generate counter-tasks for blind spots                                   │
│     → Append to _tasks.json under adversarial_tasks                          │
│                                                                              │
│  6. EXECUTE TASKS (parallel where independent)                               │
│     Investigation agents work on tasks                                       │
│     → Use sources from _sources.json                                         │
│     → Update detail files, mark tasks complete                               │
│                                                                              │
│  7. UPDATE COVERAGE                                                          │
│     Calculate metrics: people, entities, claims, sources                     │
│     Track perspective coverage                                               │
│     → Write _coverage.json                                                   │
│                                                                              │
│  8. VERIFICATION                                                             │
│     Anti-hallucination, cross-model critique, core checklist                 │
│     → Update verification_passed                                             │
│                                                                              │
│  9. TERMINATION GATE CHECK                                                   │
│     All 9 gates must pass → SYNTHESIS + ARTICLE                              │
│     Any gate fails → Regenerate tasks → LOOP                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Dynamic?

**The LLM discovers case-specific knowledge.** Instead of relying on static reference files, the system uses deep research to find data sources tailored to THIS investigation. A pharma fraud case gets FDA databases; a hedge fund case gets FINRA sources. The baseline (data-sources.md) seeds the discovery, but case-specific sources are found dynamically.

---

## Three-Layer Rigor System

Rigor is enforced structurally, not through prompting alone.

### Layer 1: Required Perspectives in Task Generation

Every task generation cycle MUST address 10 perspectives (or explain why N/A):

```
□ Money/Financial — who benefits, funding sources
□ Timeline/Sequence — causation chains, key dates
□ Silence — who's NOT talking
□ Documents — paper trails that must exist
□ Contradictions — conflicting accounts
□ Relationships — connections, conflicts
□ Alternative Hypotheses — other explanations
□ Assumptions — what we're taking for granted
□ Counterfactual — what would prove us wrong
□ Blind Spots — what might we be missing

+ CURIOSITY CHECK (REQUIRED):
  Generate at least 2 tasks from:
  - What would a MORE curious investigator ask?
  - What's the most important thing we DON'T know?
  - What would SURPRISE us if true?
```

### Layer 2: Adversarial Pass

After task generation, explicit adversarial review:

1. For each major claim: What would DISPROVE it?
2. Strongest argument for unexplored positions?
3. What assumptions are EMBEDDED in these tasks?
4. What evidence would CHANGE our conclusions?
5. What would the SUBJECT refuse to answer?
6. Who BENEFITS from us not investigating something?

### Layer 3: Rigor Checkpoint (Termination Gate)

Before termination, validate against ALL 20 frameworks:

1. Follow the Money
2. Follow the Silence
3. Follow the Timeline
4. Follow the Documents
5. Follow the Contradictions
6. Follow the Relationships
7. Stakeholder Mapping
8. Network Analysis
9. Means/Motive/Opportunity
10. Competing Hypotheses
11. Assumptions Check
12. Pattern Analysis
13. Counterfactual
14. Pre-Mortem
15. Cognitive Bias Check
16. Uncomfortable Questions
17. Second-Order Effects
18. Meta Questions
19. 5 Whys (Root Cause)
20. Sense-Making

Each framework must be: ✓ Addressed (cite task/finding) | N/A (explain why) | ✗ Gap (generate task)

**Cannot terminate with unexplained gaps.**

---

## Orchestrator Pattern

**The main Claude Code instance ONLY orchestrates.** All work is done by sub-agents via Task tool.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR (Main Loop)                             │
│                                                                              │
│  NEVER:                              ONLY:                                   │
│  ✗ Call MCP tools directly           ✓ Read _state.json, _tasks.json        │
│  ✗ Read full file contents           ✓ Dispatch sub-agents (Task tool)      │
│  ✗ Write large content               ✓ Wait for completion                  │
│  ✗ Accumulate findings in memory     ✓ Track termination gates              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │                │                │                │
         ▼                ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ Task Gen │    │Execute   │    │ Coverage │    │ Rigor    │
   │  Agent   │    │ Agents   │    │  Agent   │    │ Checkpoint│
   └──────────┘    └──────────┘    └──────────┘    └──────────┘
         │                │                │                │
         ▼                ▼                ▼                ▼
    _tasks.json     people.md        _coverage.json   Pass/Fail
                    fact-check.md
```

---

## Case Structure

**Each case has its own git repository. Commit after every iteration.**

```
cases/[topic-slug]/
├── _state.json               # Orchestrator state
├── _extraction.json          # Extracted entities, claims, people
├── _sources.json             # Case-specific data sources (dynamically discovered)
├── _tasks.json               # Dynamic task queue
├── _coverage.json            # Coverage metrics
├── .git/                     # Version control
├── evidence/                 # Captured sources
│   ├── web/SXXX/            # Screenshots, PDFs, HTML per source
│   └── documents/           # Downloaded PDFs
├── research-leads/           # AI research outputs (NOT citable)
├── summary.md                # THE DELIVERABLE (self-contained)
├── sources.md                # Source registry with evidence paths
├── timeline.md               # Chronological events
├── people.md                 # Person profiles
├── organizations.md          # Entity profiles
├── positions.md              # All positions with arguments
├── fact-check.md             # Claim verdicts
├── theories.md               # Alternative theory analysis
├── statements.md             # Statement vs evidence analysis
├── iterations.md             # Progress log
├── articles.md               # Publication-ready articles
└── (quality check files generated dynamically)
```

### State Files

State files enable agent coordination. Only required fields are specified—the LLM structures the rest naturally.

**_state.json** — Orchestrator state

| Required Field | Purpose |
|----------------|---------|
| `case_id`, `topic` | Case identification |
| `status` | `IN_PROGRESS` &#124; `COMPLETE` &#124; `PAUSED` &#124; `ERROR` |
| `current_phase` | Workflow phase for orchestrator decisions |
| `current_iteration` | Iteration counter (updated by Synthesis Agent) |
| `next_source_id` | Next available source ID (e.g., "S048") |
| `verification_passed` | Termination gate flag |
| `adversarial_complete` | Termination gate flag |
| `rigor_checkpoint_passed` | Termination gate flag |
| `quality_checks_passed` | Termination gate flag |

**_tasks.json** — Dynamic task queue

Three arrays: `tasks`, `adversarial_tasks`, `rigor_gap_tasks`

Each task requires: `id` (T### format), `status` (pending/in_progress/completed), `priority` (HIGH/MEDIUM/LOW)

Tasks naturally include description, perspective, rationale, approach, success_criteria, etc.

**_coverage.json** — Coverage metrics for termination gates

| Required Category | Fields | Threshold |
|-------------------|--------|-----------|
| `people` | mentioned, investigated | ≥ 90% |
| `entities` | mentioned, investigated | ≥ 90% |
| `claims` | total, verified | ≥ 80% |
| `sources` | cited, captured | = 100% |
| `positions` | identified, documented | = 100% |
| `contradictions` | identified, explored | = 100% |

**_sources.json** — Case-specific data sources

Two arrays: `baseline` (from `framework/data-sources.md`), `discovered` (found via deep research for this case)

Each source naturally includes name, url, what it contains, category, relevance.

**_extraction.json** — Extracted entities from research

Internal to extraction agent. Typically includes people, entities, claims, events, contradictions, sources_to_capture.

**State update ownership**: See `framework/rules.md` for which agent updates each field.

---

## Termination

**9 gates must pass to terminate.** See `framework/rules.md` for complete gate definitions.

### Mechanical Verification Required

```bash
# MUST run before termination
node scripts/verify-all-gates.js cases/[case-id]

# Outputs _gate_results.json with pass/fail for each gate
# Exit code 0 = all pass, can terminate
# Exit code 1 = failures, must continue
```

### Gate Summary

| Gate | Verification |
|------|--------------|
| 1. Coverage | Thresholds met, required files exist |
| 2. Tasks | All completed, outputs exist |
| 3. Adversarial | Complete, findings files exist |
| 4. Sources | Evidence folders for all [SXXX] |
| 5. Content | Claims found in evidence text |
| 6. Claims | AI verification passes |
| 7. Contradictions | All explored |
| 8. Rigor | 20 frameworks validated |
| 9. Legal | Legal review file exists |

**If ANY gate fails → generate tasks to address → loop.**

**Do NOT self-report completion.** The verification scripts are the only authority.

**You ARE likely done when:** `verify-all-gates.js` returns exit code 0.

**You are NOT done because:** Many iterations completed, it "feels" done, most gates passing.

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
| Extended reasoning | openai | `generate_text` | reasoning_effort: high/xhigh |
| Check/resume timeout | gemini/openai | `check_research` | Use ID from error |

### Extended Reasoning Checkpoints

GPT 5.2 Pro with extended thinking (`reasoning_effort: high/xhigh`) at critical junctures:

- **iteration ≥ 3**: Adversarial review of emerging narrative
- **Contradictions found**: Reason through conflicting sources
- **Alternative theories**: Genuinely steelman uncomfortable positions
- **All gates passing**: Pre-termination deep review
- **Major finding**: Second-order implications

Provide context, ask for the type of reasoning needed. The model knows how to think deeply.

---

## Verification System

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

## summary.md Standards

**summary.md is THE DELIVERABLE — a polished final product.**

| Is | Is Not |
|----|----|
| Self-contained final report | Log of iterative discoveries |
| Written as if in one sitting | Ledger with "additionally found..." |
| Ready to share with anyone | Working document with artifacts |
| Publishable quality | Internal scratchpad |

**Rewrite, don't append.** Each update is a complete rewrite.

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

Full reference: `framework/data-sources.md`

---

## Capture Scripts

| Script | Purpose |
|--------|---------|
| `scripts/capture` | Main capture wrapper |
| `scripts/capture-url.js` | Playwright capture |
| `scripts/firecrawl-capture.js` | Bot-bypass capture |
| `scripts/verify-sources.js` | Verify evidence files exist (Layer 3) |
| `scripts/verify-source-content.js` | Verify claims in evidence text (Layer 4) |
| `scripts/verify-claims.js` | AI-based claim verification (Layer 5) |
| `scripts/verify-all-gates.js` | Master termination gate checker |
| `scripts/verify-state-consistency.js` | State vs filesystem validation |
| `scripts/find-failed-captures.js` | Audit capture quality |

---

## New State Files (Per Case)

### _gate_results.json

Generated by `verify-all-gates.js`. Contains mechanical verification results.

```json
{
  "timestamp": "2026-01-09T15:00:00Z",
  "gates": {
    "coverage": {"passed": true},
    "tasks": {"passed": true},
    "adversarial": {"passed": true},
    "sources": {"passed": false, "reason": "5 sources missing evidence"},
    "content": {"passed": false, "reason": "3 claims not found"},
    "claims": {"passed": true},
    "contradictions": {"passed": true},
    "rigor": {"passed": true},
    "legal": {"passed": true}
  },
  "overall": false,
  "blocking_gates": ["sources", "content"]
}
```

### _audit.json (Required)

**Append-only action log. Every agent action must be logged.**

Initialize with `node scripts/audit-append.js <case_dir> --init`

Append entries with `node scripts/audit-append.js <case_dir> <actor> <action> [--target X] [--input JSON] [--output JSON]`

```json
{
  "log": [
    {
      "id": "A001",
      "timestamp": "2026-01-09T14:30:00Z",
      "actor": "capture-agent",
      "action": "capture_source",
      "target": "S001",
      "input": {"url": "https://..."},
      "output": {"path": "evidence/web/S001/", "files": 3},
      "verification": {"method": "fs_check", "passed": true}
    },
    {
      "id": "A002",
      "timestamp": "2026-01-09T14:35:00Z",
      "actor": "task-agent",
      "action": "complete_task",
      "target": "T001",
      "input": {"task": "Investigate financial connections"},
      "output": {"findings_file": "findings/T001-financial.md", "sources_added": 3}
    }
  ]
}
```

**Required Actions to Log:**
| Action | Actor | When |
|--------|-------|------|
| `phase_start` | orchestrator | Beginning of each phase |
| `phase_complete` | orchestrator | End of each phase |
| `task_start` | task-agent | Before starting a task |
| `task_complete` | task-agent | After completing a task |
| `capture_source` | capture-agent | After capturing evidence |
| `verification_run` | verify-agent | After running verification |
| `gate_check` | orchestrator | After checking termination gates |

### iterations.md (Required)

**Human-readable progress log. Updated at each iteration boundary.**

```markdown
# Investigation Progress Log

## Iteration 1 — 2026-01-09T14:00:00Z

### Phase Summary
| Phase | Status | Duration | Key Actions |
|-------|--------|----------|-------------|
| RESEARCH | Complete | 5m | 6 research agents dispatched |
| EXTRACTION | Complete | 2m | 45 entities, 30 claims extracted |
| SOURCE_DISCOVERY | Complete | 3m | 12 baseline + 8 discovered sources |
| TASK_GENERATION | Complete | 2m | 15 tasks generated |

### Tasks Completed This Iteration
| Task ID | Description | Result | Sources |
|---------|-------------|--------|---------|
| T001 | Investigate CEO background | Found 3 prior lawsuits | S001, S002 |
| T002 | Verify revenue claims | Partially verified | S003 |

### Coverage Snapshot
- People: 12/15 (80%)
- Entities: 8/10 (80%)
- Claims: 20/30 (67%)
- Sources: 5/5 (100%)

### Gate Status
| Gate | Status | Notes |
|------|--------|-------|
| Coverage | ❌ | Below 90% threshold |
| Tasks | ✅ | All iteration tasks complete |
| Sources | ✅ | All captured |

### Next Iteration Focus
- Investigate remaining 3 people
- Verify 10 pending claims
- Run adversarial pass

---

## Iteration 2 — 2026-01-09T15:00:00Z
...
```
