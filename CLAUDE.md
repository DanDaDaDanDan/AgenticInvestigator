# AgenticInvestigator - Claude Instructions

Behavioral rules for Claude Code operating in this project.

---

## Task Coordination

Claude Code uses **Tasks** (stored in `~/.claude/tasks`) for tracking work across sessions and subagents. Tasks replace the older TodoWrite tool.

**Key features:**
- Tasks can have dependencies on each other
- Multiple sessions can collaborate on the same Task List
- Updates broadcast to all sessions working on the same list

**To share a Task List across sessions:**
```bash
CLAUDE_CODE_TASK_LIST_ID=investigation-123 claude
```

Use Tasks for:
- Planning multi-step work within a phase
- Coordinating parallel subagents (e.g., follow-batch)
- Tracking progress across context windows
- Managing dependencies between investigation steps

---

## Repository Architecture

This project uses **two independent git repositories**.

```
D:/Personal/AgenticInvestigator/           ← CODE REPOSITORY (.git here)
├── .git/                                  # Tracks: scripts, skills, reference, docs
├── CLAUDE.md                              # This file - CODE REPO
├── scripts/                               # CODE REPO
├── reference/                             # CODE REPO
├── .claude/skills/                        # CODE REPO - skill definitions with SKILL.md
│
└── cases/                                 ← DATA REPOSITORY (.git here, gitignored by parent)
    ├── .git/                              # Tracks: ALL investigation case data
    ├── .active                            # DATA REPO
    └── [case-slug]/                       # DATA REPO - each case folder
        ├── state.json
        ├── findings/              # Decomposed findings (replaces summary.md)
        ├── evidence/
        └── ...
```

### Commit Routing Rules

| What Changed | Which Repository | Command |
|--------------|------------------|---------|
| Code, scripts, docs, skills | **CODE** (root `.git`) | `git add . && git commit` from root |
| Case data (anything in `cases/`) | **DATA** (`cases/.git`) | `git -C cases add . && git commit` from root, OR `git add . && git commit` from `cases/` |

### Why Two Repositories?

1. **Separation of concerns** - Code changes vs investigation data changes
2. **Different lifecycles** - Code is versioned; case data accumulates
3. **Privacy** - Cases may contain sensitive research; code is shareable
4. **Size** - Case data (evidence, PDFs) can be large; code stays small

---

## Core Principle

**The orchestrator knows nothing about content.**

- Orchestrator reads ONLY `state.json`
- All research, analysis, and writing done by sub-agents via `/action` router
- Git history IS the ledger (no separate ledger file)
- **Code and cases are in SEPARATE git repositories** (see Repository Architecture above)

---

## Workflow

Only `--new` creates a new case. All other `/investigate` calls operate on existing cases.

```
/investigate --new [topic]     # Creates new case
/investigate [case-id]         # Resumes existing case
/investigate                   # Resumes active case
```

```
/investigate --new [topic]
      │
      ▼
┌─────────────────┐
│ CREATE CASE     │  Requires --new flag
│                 │  node scripts/init-case.js "[topic]"
│                 │  Creates cases/[topic-slug]/ folder
│                 │  Commits to DATA REPO (cases/.git)
│                 │  All subsequent work happens in the case folder
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PLAN            │  /action plan-investigation (3 steps via sub-agents)
│                 │  1. Prompt refinement - what are we REALLY asking?
│                 │  2. Strategic research - landscape understanding
│                 │  3. Investigation design (GPT 5.2 Pro xhigh)
│                 │  Output (in case folder): refined_prompt.md,
│                 │          strategic_context.md, investigation_plan.md,
│                 │          custom_questions.md
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ BOOTSTRAP       │  /action research (guided by investigation_plan.md)
│                 │  Capture sources, create initial findings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ QUESTION        │  /action question (5 batches + custom_questions.md)
│                 │  Answer all 35 frameworks + custom questions
│                 │  Generate leads in leads.json
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ FOLLOW          │  /action follow (per lead)
│                 │  Pursue each lead to conclusion
│     ◄───────────┤  /action curiosity → NOT SATISFIED
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RECONCILE       │  /action reconcile
│                 │  Update findings with lead results
│                 │  Caveat unverified claims
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CURIOSITY       │  /action curiosity
│                 │  Check ALL leads resolved
│     ◄───────────┤  NOT SATISFIED → back to FOLLOW
└────────┬────────┘
         │ SATISFIED
         ▼
┌─────────────────┐
│ WRITE           │  /action article
│                 │  Generate short/medium/full.md
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ VERIFY          │  /action verify (8 gates)
│                 │  /action integrity, /action legal-review
│     ◄───────────┤  Fails → back to FOLLOW or RECONCILE
└────────┬────────┘
         │ All pass
         ▼
┌─────────────────┐
│ AI SELF-REVIEW  │  First iteration only
│                 │  Review article as critical editor
│                 │  Generate feedback if needed
└────────┬────────┘
         │
         ├─── Has feedback ──► /case-feedback (auto) ──► REVISION ──┐
         │                                                      │
         ▼ No feedback or already reviewed                      │
     COMPLETE ◄─────────────────────────────────────────────────┘
         │
         ▼ /case-feedback "..." (user)
┌─────────────────┐
│ REVISION        │  Analyze feedback, create revision plan
│                 │  Add new leads, re-investigate
│                 │  Reconcile, rewrite articles
│                 │  Re-verify all gates
└─────────────────┘
```

---

## The 11 Gates

### Process Gates (0-7)

| # | Gate | Check | Pass Criteria |
|---|------|-------|---------------|
| 0 | Planning | `/plan-investigation` complete | refined_prompt.md, strategic_context.md, investigation_plan.md, custom_questions.md exist |
| 1 | Questions | All `questions/*.md` | Status: investigated (includes custom_questions.md) |
| 2 | Curiosity | `/curiosity` judgment | ALL leads resolved + HIGH priority complete + planning_todos addressed |
| 3 | Reconciliation | `/reconcile` | Lead results reconciled with findings, stale findings updated, contradictions resolved |
| 4 | Article | `articles/*.md` + PDFs | short/medium/full.md exist with [S###] citations + PDFs + Sources Consulted section |
| 5 | Sources | **Two-part verification** | Semantic (LLM) + Computational (Python) verification both pass |
| 6 | Integrity | `/integrity` review | Status: READY (with **multi-agent debate**) |
| 7 | Legal | `/legal-review` | Status: READY (with **multi-agent debate**) |

### Quality Gates (8-10) — NEW

| # | Gate | Check | Pass Criteria |
|---|------|-------|---------------|
| 8 | Balance | `/balance-audit` | All stakeholders represented; strongest counterarguments addressed; no one-sided framing |
| 9 | Completeness | `/completeness-audit` | Framework questions reflected in article; "what's missing" review passes |
| 10 | Significance | `/significance-audit` | Clear takeaway articulated; novel findings identified; "so what?" test passes |

**Termination:** All 11 gates pass + AI self-review complete (or no feedback generated).

### Gate 2 (Curiosity) Hard Blocks

The curiosity gate has automatic failures that cannot be overridden:
- **Any HIGH priority leads pending** - Must be resolved
- **Any verification leads pending** - Leads with "Verify" in description must be resolved
- **More than 40% of leads pending** - Insufficient investigation coverage

### Gate 5 (Sources) - Two-Part Verification

Gate 5 now has **two verification steps** for maximum robustness:

#### Step 5A: Semantic Claim Verification

```bash
node scripts/claims/verify-article.js cases/<case-id>/ --generate-batches
# Process batches with LLM
node scripts/claims/verify-article.js cases/<case-id>/ --merge-batches N
```

| Status | Meaning | Action |
|--------|---------|--------|
| VERIFIED | Claim matched source content | None |
| UNVERIFIED | Source doesn't support claim | Find source or caveat |
| SOURCE_MISSING | Evidence file missing | Re-capture or remove |

#### Step 5B: Computational Fact-Checking (NEW)

```bash
node scripts/claims/compute-verify.js cases/<case-id>/ --generate-prompts
# Process prompts with LLM + code execution
node scripts/claims/compute-verify.js cases/<case-id>/ --responses <file>
```

Verifies numerical claims computationally:
- Percentages and percentage changes
- Dollar amounts and financial figures
- Ratios and rankings
- Growth multiples (doubled, tripled)
- Counts (employees, cases, etc.)

| Status | Meaning | Action |
|--------|---------|--------|
| VERIFIED | Computed value matches claim (within 5%) | None |
| DISCREPANCY | Computed value differs significantly | Investigate and correct |
| DATA_NOT_FOUND | Source lacks verifiable numbers | Flag for manual review |

**Gate 5 passes when BOTH steps pass.**

**Outputs:**
- `claim-verification.json` - Semantic verification results
- `claim-verification-report.md` - Human-readable semantic report
- `compute-verification.json` - Computational verification results

### Quality Gates (8-10)

Quality gates assess output quality, not just process compliance.

#### Gate 8: Balance Audit

```bash
/action balance-audit
```

Checks:
- **Stakeholder representation:** List all mentioned stakeholders → verify each has voice
- **Steelman test:** Is the strongest counterargument to main thesis addressed?
- **Framing audit:** Check for loaded language, one-sided presentation

| Result | Meaning |
|--------|---------|
| PASS | All perspectives represented fairly |
| FAIL_STAKEHOLDER | Stakeholder X not represented |
| FAIL_STEELMAN | Counterargument not addressed |
| FAIL_FRAMING | One-sided framing detected |

#### Gate 9: Completeness Audit

```bash
/action completeness-audit
```

Checks:
- **Framework coverage:** For each of 35 framework questions marked "investigated", is insight reflected in article?
- **Gap detection:** External model asks "what's missing?" given the topic
- **Dropped thread detection:** Leads investigated but not mentioned

| Result | Meaning |
|--------|---------|
| PASS | Comprehensive coverage |
| FAIL_FRAMEWORK | Framework X answered but not in article |
| FAIL_GAP | Obvious angle X not addressed |
| FAIL_DROPPED | Lead L### investigated but findings not used |

#### Gate 10: Significance Audit

```bash
/action significance-audit
```

Checks:
- **Takeaway clarity:** Can the main point be stated in one sentence?
- **Novel findings:** What does this investigation reveal that wasn't known?
- **"So what?" test:** Why should anyone care?

| Result | Meaning |
|--------|---------|
| PASS | Clear significance established |
| FAIL_TAKEAWAY | No clear main point |
| FAIL_NOVELTY | No novel findings identified |
| FAIL_SIGNIFICANCE | "So what?" not answered |

---

## Skills

Skills are defined in `.claude/skills/*/SKILL.md` with YAML frontmatter controlling behavior.

### Skill Configuration Options

| Option | Purpose |
|--------|---------|
| `context: fork` | Run in isolated sub-agent (automatic context isolation) |
| `user-invocable: false` | Hide from `/` menu (internal skills only) |
| `disable-model-invocation: true` | Prevent Claude from auto-invoking (user entry points) |

### Skill Reference

| Skill | Purpose | Invoked By | Isolation |
|-------|---------|------------|-----------|
| `/investigate` | Start or resume investigation | User | None |
| `/case-feedback` | Revise completed investigation | User | None |
| `/action` | Router (git + dispatch) | Orchestrator | None |
| `/plan-investigation` | Design investigation strategy | Orchestrator | `context: fork` |
| `/research` | Broad topic research | Orchestrator | `context: fork` |
| `/question` | Answer framework batch | Orchestrator | None |
| `/follow` | Pursue single lead | Orchestrator | None |
| `/reconcile` | Sync lead results with findings | Orchestrator | `context: fork` |
| `/curiosity` | Check lead exhaustion | Orchestrator | `context: fork` |
| `/capture-source` | Capture evidence | Any agent | None |
| `/verify` | Check 8 gates | Orchestrator | `context: fork` |
| `/article` | Write publication | Orchestrator | `context: fork` |
| `/integrity` | Journalistic check (**with debate**) | Orchestrator | `context: fork` |
| `/legal-review` | Legal risk check (**with debate**) | Orchestrator | `context: fork` |
| `/parallel-review` | Integrity + Legal in parallel | Orchestrator | `context: fork` |
| `/debate` | **Multi-agent flag resolution** | `/integrity`, `/legal-review` | `context: fork` |
| `/merge-cases` | Combine multiple investigations | Orchestrator | `context: fork` |

---

## Parallel Processing

Three phases support parallel execution for faster investigation:

### QUESTION Phase (~5x speedup)

```bash
# Sequential (default)
/action question 1
/action question 2
...

# Parallel
/action question-parallel
```

Runs all 5 framework batches concurrently. Uses pre-allocated source/lead ID ranges.

### FOLLOW Phase (~4x speedup)

```bash
# Sequential (default)
/action follow L001
/action follow L002
...

# Parallel (batch of 4)
/action follow-batch L001 L002 L003 L004
```

Get batch recommendations:
```bash
node scripts/check-continue.js cases/<case-id>/ --batch --batch-size 4
```

### VERIFY Phase (~2x speedup for Gates 6+7)

```bash
# Sequential (default)
/action integrity
/action legal-review

# Parallel (when Gate 5 passes, Gates 6+7 both fail)
/action parallel-review
```

Uses three-phase pattern: parallel context-free scans → parallel contextual evaluation → sequential fix application.

### Supporting Scripts

| Script | Purpose |
|--------|---------|
| `scripts/leads-lock.js` | Optimistic locking for parallel lead processing |
| `scripts/allocate-sources.js` | Pre-allocate source ID ranges |
| `scripts/merge-batch-results.js` | Merge parallel follow results |
| `scripts/merge-question-batches.js` | Merge parallel question results |
| **`scripts/claims/verify-article.js`** | **Semantic claim verification (Gate 5A)** |
| **`scripts/claims/compute-verify.js`** | **Computational fact-checking (Gate 5B)** |
| `scripts/claims/cross-check.js` | Cross-check against authoritative sources |
| `scripts/osint-save.js` | Save osint_get output as evidence |
| `scripts/verify-source.js` | Hash verification for source integrity |

### Estimated Time Savings

| Phase | Sequential | Parallel | Savings |
|-------|------------|----------|---------|
| QUESTION (35 frameworks) | ~25 min | ~5 min | 20 min |
| FOLLOW (20 leads) | ~40 min | ~10 min | 30 min |
| VERIFY (Gates 6-7) | ~20 min | ~12 min | 8 min |
| **Total** | ~85 min | ~27 min | **~58 min (68%)** |

---

## Orchestrator Pattern

**Main instance ONLY orchestrates. Sub-agents do all work.**

### Orchestrator CAN Read

- `state.json` - Minimal state (phase, iteration, gates)

### Orchestrator CANNOT Read

- `findings/*.md` - Content files
- `questions/*.md` - Content files
- `evidence/` - Raw content
- Any content files

### Orchestrator Responsibilities

1. Read `state.json` to determine current phase
2. Dispatch appropriate `/action` command
3. Track progress via TodoWrite
4. Loop until all 8 gates pass

### Orchestrator MUST NOT

- Call MCP tools directly
- Reason about investigation completeness
- Make substantive claims about findings
- Read content files

---

## Context Isolation Pattern

Skills that read large amounts of data use `context: fork` to automatically run in isolated sub-agents. This is configured in each skill's SKILL.md frontmatter.

| Skill | Reads | Isolation |
|-------|-------|-----------|
| `/plan-investigation` | deep_research + 35 frameworks (~15KB for Step 3) | `context: fork` (auto) |
| `/research` | deep_research results + captured sources (~100-200KB) | `context: fork` (auto) |
| `/reconcile` | summary + leads + sources (~50KB) | `context: fork` (auto) |
| `/curiosity` | 35 files + leads + summary + sources (~200KB) | `context: fork` (auto) |
| `/article` | summary + 35 question files (~166KB) | `context: fork` (auto) |
| `/verify` | article + all cited evidence (~100KB+) | `context: fork` (auto) |
| `/integrity` | article + summary + 35 questions + sources (~200KB) | `context: fork` (auto) |
| `/legal-review` | article + sources + evidence (~100KB) | `context: fork` (auto) |
| `/question` | 1 framework file (~4KB) | None (lightweight) |
| `/follow` | 1 lead context (~5KB) | None (lightweight) |

**Why:** Reading 200KB into the main context makes subsequent turns expensive. Skills with `context: fork` automatically run in sub-agents and return only structured results (verdicts, gaps), keeping main context clean.

**Implementation:** The skill system handles isolation automatically when `context: fork` is specified in SKILL.md frontmatter. No manual Task tool dispatch needed.

---

## Two-Stage Review Pattern with Multi-Agent Debate

`/legal-review` and `/integrity` use a two-stage pattern with adversarial debate:

**Stage 1: Context-Free Scan**
- Read ONLY the article
- Flag potential issues as a reader with no case knowledge
- Output structured flags with "what would clear this"

**Stage 2: Multi-Agent Debate (NEW)**

For each flag, three agents debate the resolution:

```
┌─────────────────────────────────────────────────────────────┐
│  CRITIC        DEBATE         DEFENDER                      │
│  (finds        (rounds)       (finds                        │
│   issues)  ←──────────────→   evidence)                     │
│                   │                                         │
│                   ▼                                         │
│              ARBITER                                        │
│              (decides)                                      │
│                   │                                         │
│                   ▼                                         │
│  Resolution: CLEARED / FIX_REQUIRED / ESCALATE             │
└─────────────────────────────────────────────────────────────┘
```

| Agent | Role | Must Provide |
|-------|------|--------------|
| **CRITIC** | Argues why flag indicates real problem | Specific concerns, evidence gaps |
| **DEFENDER** | Argues why flag can be cleared | S### citations with verbatim quotes |
| **ARBITER** | Decides final resolution | Reasoning based on debate |

**Fast-Path (skip debate):**
- Defender finds S### with exact quote → CLEARED
- Critic finds no source exists → FIX_REQUIRED
- Both agree in initial positions → Use agreed resolution

**Why debate matters:**
1. **Adversarial testing** - Critic actively looks for problems
2. **Evidence citation** - Defender must provide specific S### quotes
3. **Neutral arbitration** - Arbiter weighs arguments objectively

**Output:** Resolution table with debate summaries, required changes, final status.

**Skip debate:** Use `--no-debate` for faster single-pass review (less robust).

---

## Claim Verification Architecture

Claims are verified at **article time** by checking each citation against its source content.

### Flow

```
Article Writing → Extract cited claims → Load source content → LLM verification
                                                                    ↓
                                              VERIFIED / UNVERIFIED / SOURCE_MISSING
```

### Two-Part Verification

| Step | What | How |
|------|------|-----|
| **5A: Semantic** | Does source support claim? | LLM reads source, checks if claim is supported |
| **5B: Computational** | Are numbers correct? | Python code verifies calculations |

### Claim Modules (`scripts/claims/`)

| Module | Purpose |
|--------|---------|
| `verify-article.js` | Extract claims from article, verify against source content |
| `cross-check.js` | Cross-check claims against authoritative sources |
| `compute-verify.js` | Computational verification for numerical claims |
| `index.js` | Module exports |

### Verification Process

1. **Extract claims from article** - Find sentences with [S###] citations
2. **Load source content** - Read the cited evidence file
3. **LLM verification** - Ask: "Does this source support this claim?"
4. **Report results** - VERIFIED / UNVERIFIED / SOURCE_MISSING

### Usage

```bash
# Generate verification batches
node scripts/claims/verify-article.js cases/<case-id>/ --generate-batches

# Process LLM responses
node scripts/claims/verify-article.js cases/<case-id>/ --merge-batches N

# Computational verification
node scripts/claims/compute-verify.js cases/<case-id>/ --generate-prompts
```

### Key Principle

**Claims are verified against source content at article time.** Each cited claim is checked by loading the source and asking an LLM if the source supports the claim.

---

## Case Structure

Cases are folders within the **DATA repository** at `cases/[topic-slug]/`.

Note: `cases/` has its own `.git` - all case commits go there, not to the root repo.

```
cases/                           ← DATA REPOSITORY ROOT
├── .git/                        # Data repo - tracks all case data
├── .active                      # Points to current case slug
│
└── [topic-slug]/                # One folder per investigation
    ├── state.json               # Minimal (phase, iteration, gates)
    ├── leads.json               # Leads with depth tracking (max_depth: 3)
    ├── sources.json             # Source registry
    ├── removed-points.md        # Auto-removed points (human review)
    ├── future_research.md       # Leads beyond max_depth
    ├── claim-verification.json  # Article verification results
    ├── claim-verification-report.md  # Human-readable verification report
    │
    ├── findings/                # DECOMPOSED FINDINGS (replaces summary.md)
    │   ├── manifest.json        # Assembly order, metadata
    │   ├── F001-background.md   # Individual findings with lifecycle
    │   ├── F002-key-players.md
    │   └── ... (each finding is independent)
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
    │       └── raw.html         # Original content for verification
    │
    ├── articles/
    │   ├── short.md             # 500-900 words
    │   ├── short.pdf            # PDF with Kindle-style typography
    │   ├── medium.md            # 2,200-3,800 words
    │   ├── medium.pdf           # Balanced coverage PDF
    │   ├── full.md              # No length limit - comprehensive
    │   └── full.pdf             # Primary deliverable - all findings and conclusions
    │
    └── feedback/                # Revision history (created by /case-feedback)
        ├── revision1.md         # First revision feedback + plan
        └── revision2.md         # Second revision feedback + plan
```

### Findings Architecture (replaces monolithic summary.md)

Each finding is an independent file with lifecycle metadata:

```markdown
---
id: F001
status: verified | draft | stale | superseded
created: 2026-01-24
updated: 2026-01-25
sources: [S001, S015, S023]
supersedes: null           # ID of finding this replaces
superseded_by: null        # ID of finding that replaced this
confidence: high | medium | low
related_leads: [L001, L015]
---

# Finding: Background Context

[content with [S###] citations]
```

**manifest.json** tracks assembly order:
```json
{
  "version": 1,
  "assembly_order": ["F001", "F002", "F003"],
  "sections": {
    "background": ["F001"],
    "key_players": ["F002", "F007"],
    "analysis": ["F003", "F004", "F005"]
  }
}
```

**Benefits:**
- **Independent lifecycle:** Update/archive findings without touching others
- **Staleness detection:** Compare `updated` vs lead resolution times
- **Clear provenance:** Each finding tracks sources and leads
- **Easy pruning:** `status: stale` findings excluded from articles
- **Parallelization:** Multiple agents can update different findings

**Always Updating Principle:**
Findings must ALWAYS reflect the latest evidence. Never let findings become stale:
- When a lead resolves, immediately update affected findings
- When new evidence contradicts a finding, mark it `status: stale` and create superseding finding
- When a source is invalidated, mark dependent findings for re-verification
- The `updated` timestamp must change whenever content changes
- Articles are generated from findings, so stale findings = stale articles

**RECONCILE behavior:**
1. For each lead result, identify affected findings
2. Update finding content OR mark `status: stale` if contradicted
3. Create new findings for novel information
4. Update manifest assembly order

### Case Creation (requires --new)

Only create a case when `--new` is specified. Without it, return an error if no existing case is found.

Run `node scripts/init-case.js "[topic]"` which:
1. Creates `cases/[topic-slug]/` directory
2. Creates initial files: state.json (`phase: PLAN`), sources.json, leads.json, future_research.md, 35 question files
3. **Commits to the DATA repository** (`cases/.git`)

All `/action` commits go to the **DATA repository** (`cases/.git`), NOT the code repository.

---

## state.json

```json
{
  "case": "topic-slug",
  "topic": "Full topic description",
  "phase": "QUESTION",
  "iteration": 2,
  "next_source": 48,
  "planning": {
    "step": 3,
    "refined_prompt": true,
    "strategic_context": true,
    "investigation_plan": true
  },
  "planning_todos": [
    {
      "id": "P001",
      "task": "Check specific data source X",
      "rationale": "Critical for domain",
      "phase": "RESEARCH",
      "priority": "HIGH",
      "status": "completed"
    }
  ],
  "gates": {
    "planning": true,
    "questions": false,
    "curiosity": false,
    "reconciliation": false,
    "article": false,
    "sources": false,
    "integrity": false,
    "legal": false
  },
  "source_allocations": {
    "batch_1705612345": {
      "start": 48,
      "end": 60,
      "allocated_at": "2026-01-19T10:00:00Z",
      "status": "active"
    }
  },
  "parallel_review": {
    "integrity_complete": false,
    "legal_complete": false,
    "last_error": null
  },
  "revision": {
    "number": 1,
    "feedback_file": "feedback/revision1.md",
    "started_at": "2026-01-19T12:00:00Z"
  },
  "ai_review_complete": false
}
```

**Parallel processing fields:**
- `source_allocations` - Tracks pre-allocated source ID ranges for parallel agents
- `parallel_review` - Tracks state of parallel integrity/legal review

**Revision fields (present during feedback cycle):**
- `revision.number` - Current revision number (1, 2, 3...)
- `revision.feedback_file` - Path to feedback/plan file
- `revision.started_at` - When revision cycle began

**Quality assurance:**
- `ai_review_complete` - Whether AI self-review has run (triggers once after first successful verification)

---

## leads.json

```json
{
  "version": 47,
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
      "status": "pending",
      "claimed_by": "pid_12345_1705612345000",
      "claimed_at": "2026-01-19T10:00:00Z"
    }
  ]
}
```

**Parallel processing fields:**
- `version` - Increments on each write (optimistic locking)
- `claimed_by` - Agent ID that claimed this lead for processing
- `claimed_at` - Timestamp of claim (stale after 30 minutes)

**Depth tracking:**
- `depth: 0` - Original leads from research/questions
- `depth: 1+` - Generated while investigating parent lead
- `parent` - ID of lead that spawned this one (null for depth 0)
- Leads beyond `max_depth` go to `future_research.md` instead

---

## Core Rules

1. **CAPTURE BEFORE CITE** - No `[S###]` without `evidence/S###/` AND `captured: true`
2. **EVERY FACT NEEDS A SOURCE** - Every factual statement needs citation
3. **CITATION FORMAT** - Use `[S###](url)` markdown links, e.g., `[S001](https://example.com/article)`
4. **Git commits per action** - Every `/action` auto-commits to the **DATA repo** (`cases/.git`)
5. **Steelman ALL positions** - Strongest version of EVERY side
6. **Document uncertainty** - "We don't know" is valid
7. **Detect circular reporting** - Multiple outlets citing same source = 1 source
8. **TWO REPOS** - Code changes → root `.git`; Case data → `cases/.git`
9. **ALL LEADS RESOLVED** - Every lead must be `investigated` or `dead_end`. No `pending` at completion.
10. **CITATION MUST SUPPORT CLAIM** - The cited source must actually contain the claimed fact (no citation laundering)
11. **LEAD RESULTS NEED SOURCES** - If a lead result contains specific numbers/statistics, `sources[]` must be populated
12. **RECONCILE BEFORE COMPLETE** - Lead results that contradict summary claims must update the summary
13. **TEMPORAL CONTEXT** - Dated evidence must include dates: `[S###, Month Year]` for statistics/polls
14. **TWO-SOURCE RULE FOR STATISTICS** - High-salience quantitative claims (agent counts, dollar amounts, percentages) require either:
    a. A primary source (government data, official records, academic studies), OR
    b. Two independent secondary sources that report the same figure

    If only one secondary source (news report) is available, caveat with "according to [outlet]" or "reportedly"

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
3. If none found → mark finding as stale or remove claim
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

**CRITICAL: Never use Bash to invoke MCP tools.** MCP tools (mcp__mcp-osint__*, mcp__mcp-gemini__*, etc.) must be called directly as tool invocations, never via shell commands. Bash timeouts (max 10 minutes) are shorter than MCP operation timeouts (up to 60 minutes for deep_research), causing premature failures.

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
- Do NOT cite a source for a claim it doesn't contain (citation laundering)
- Do NOT leave HIGH priority leads pending and claim curiosity satisfied
- Do NOT skip reconciliation when lead results contradict summary
- Do NOT store lead results with statistics but empty sources[]
- Do NOT omit temporal context for dated evidence
- Do NOT skip claim extraction when capturing sources
- Do NOT write articles using claims not in the registry
- Do NOT skip article verification (`scripts/claims/verify-article.js`)
- Do NOT assume a citation supports a claim without verifying the source contains the fact
- Do NOT generate articles before Gates 0-3 pass (planning, questions, curiosity, reconciliation)
- Do NOT set `phase: WRITE` until curiosity and reconciliation gates are TRUE
- Do NOT use Bash to invoke MCP tools (causes timeout issues)

---

## Autonomous Continuation

The `/action` command self-loops until all 8 gates pass or an error occurs.

Start the loop with `/action <command>`. It continues automatically - intervene only on errors (API failures, contradictions, scope expansion, legal concerns).
