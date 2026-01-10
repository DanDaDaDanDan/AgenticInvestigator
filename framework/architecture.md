# AgenticInvestigator Architecture

Technical design for the verification-first multi-agent investigation framework.

**See `framework/rules.md` for canonical rules.**

---

## System Overview

AgenticInvestigator uses a verification-driven loop:

```
VERIFY -> PLAN -> EXECUTE -> VERIFY
```

Everything that matters produces **structured failures** (gaps). Tasks are generated **only** to close those gaps + required curiosity/adversarial coverage.

### Core Principles

1. **Orchestrator believes only:** filesystem + verifier outputs
2. **Verification-first:** Run verifiers every iteration, not just near termination
3. **Gap-driven:** Tasks come from failures, not generic topic exploration
4. **Question-shaped:** Tasks are questions with evidence requirements
5. **Corroboration as data:** Claims have explicit evidence bundles
6. **Continuous legal/integrity:** Not final checkboxes, but gap-emitting verifiers

---

## The Verification-First Loop

### Step 0: VERIFY (Generate Gaps)

Run all verifiers every iteration:

```bash
node scripts/generate-gaps.js cases/[case-id]
```

This runs:
- `validate-schema.js` - Core file schema sanity
- `verify-sources.js` - Evidence folder for every [SXXX]
- `verify-sources-dedup.js` - Detect duplicate URLs under multiple S###
- `verify-citation-density.js` - Enforce 100% citation density in summary.md
- `verify-source-content.js` - Cited claims exist in evidence
- `verify-corroboration.js` - Claims meet min_sources threshold
- `verify-circular-reporting.js` - Detect shared-origin "corroboration" (wire/syndication)
- `verify-state-consistency.js` - State matches filesystem
- `verify-tasks.js` - Completed tasks have findings
- `verify-legal.js` - Legal risks, PII, attribution
- `verify-integrity.js` - File ownership, ledger consistency

**Output:** `control/gaps.json`

### Step 1: PLAN (Gaps -> Tasks)

Task generation is deterministic from gaps:

**Input:**
- `control/gaps.json` - What failed
- `extraction.json` - Entities/claims/contradictions
- `sources.json` - Available data sources
- Required perspectives + curiosity requirement

**Output:**
- `tasks/R###.json` - Rigor gap tasks (from gaps)
- `tasks/T###.json` - Investigation tasks
- `tasks/A###.json` - Adversarial tasks

### Step 2: EXECUTE (Tasks -> Evidence)

Each task must produce:
1. Findings file (`findings/T###-findings.md`)
2. Updated claim records (`claims/C####.json`)
3. Captured evidence (`evidence/web/S###/`)

**Rule:** Task cannot complete without evidence accounting.

### Step 3: VERIFY Again

Re-run verifiers. Regenerate gaps. Repeat.

**Termination:** `control/gaps.json.blocking` is empty AND `verify-all-gates.js` exits 0.

---

## Case Directory Structure

```
cases/[topic-slug]/
+-- state.json              # Minimal orchestrator state (10 lines)
+-- ledger.json             # Append-only action log
+-- extraction.json         # Extracted entities, claims, people
+-- sources.json            # Captured source registry
+-- control/                 # Verifier outputs
|   +-- gaps.json           # Current iteration gaps
|   +-- digest.json         # Iteration summary
|   +-- gate_results.json   # Gate verification results
+-- claims/                  # Claim evidence bundles
|   +-- index.json          # Claim rollup for orchestrator
|   +-- C0001.json
|   +-- ...
+-- tasks/                   # One file per task
|   +-- T001.json
|   +-- A001.json
|   +-- R001.json
|   +-- ...
+-- evidence/                # Captured sources
|   +-- web/S001/
|   |   +-- metadata.json
|   |   +-- capture.html
|   |   +-- capture.png
|   |   +-- extracted_text.txt
|   +-- documents/
+-- research-leads/          # AI research (NOT citable)
+-- findings/                # Task outputs
|   +-- T001-findings.md
+-- legal/                   # Legal review iterations
|   +-- iteration-1/         # First legal review pass
|   |   +-- subject-classifications.md
|   |   +-- claim-risk.md
|   |   +-- evidence-gaps.md
|   |   +-- attribution-audit.md
|   +-- iteration-2/         # Subsequent passes
|   |   +-- ...
|   +-- legal-review.md      # Consolidated latest review
+-- integrity/               # Integrity review iterations
|   +-- iteration-1/         # First integrity pass
|   |   +-- balance-analysis.md
|   |   +-- language-audit.md
|   |   +-- adversarial-review.md
|   |   +-- steelman-check.md
|   +-- iteration-2/
|   |   +-- ...
|   +-- integrity-review.md  # Consolidated latest review
+-- summary.md               # Investigation record (source of truth)
+-- sources.md               # Source registry (human-readable)
+-- timeline.md
+-- people.md
+-- organizations.md
+-- positions.md
+-- fact-check.md
+-- theories.md
+-- iterations.md            # Progress log
+-- articles/                # PUBLICATION DELIVERABLES
    +-- article-short.md     # Quick-read (400-800 words)
    +-- article-full.md      # Full professional (2,000-4,000 words)
```

---

## Iteration Folder Structure

Legal and Integrity reviews support multiple iterations. Each iteration creates a subfolder, with a consolidated review file updated after each pass.

### Legal Review Iterations

```
legal/
+-- iteration-1/
|   +-- subject-classifications.md  # Public/private figure analysis
|   +-- claim-risk.md               # Per-claim defamation risk
|   +-- evidence-gaps.md            # Missing evidence for legal safety
|   +-- attribution-audit.md        # Hedging and attribution check
+-- iteration-2/
|   +-- ...                         # Same files, updated analysis
+-- legal-review.md                 # CONSOLIDATED latest review
```

**Workflow:**
1. Create `iteration-N/` folder
2. Dispatch 4 parallel agents (one per analysis file)
3. Wait for completion
4. Read all iteration files, consolidate into `legal-review.md`
5. If NOT READY, loop to iteration N+1

**Iteration History:** The consolidated `legal-review.md` includes a table tracking:
- Each iteration date
- Rating per iteration
- Issues found
- Resolution status

### Integrity Review Iterations

```
integrity/
+-- iteration-1/
|   +-- balance-analysis.md         # Source distribution by position
|   +-- language-audit.md           # Neutrality scan, loaded language
|   +-- adversarial-review.md       # Anticipated subject objections
|   +-- steelman-check.md           # Strongest version of each position
+-- iteration-2/
|   +-- ...
+-- integrity-review.md             # CONSOLIDATED latest review
```

**Same workflow as legal review.** Issues found become gaps in next `generate-gaps.js` run.

### Publication Readiness Status

Both reviews must output one of:
- **READY** - Can publish
- **READY WITH CHANGES** - Can publish after specific changes
- **NOT READY** - Blocking issues remain, must iterate

Gate verification checks the actual status text, not just file existence.

---

## Schema: `control/gaps.json`

**The single orchestrator input for "what to do next".**

```json
{
  "iteration": 4,
  "generated_at": "2026-01-10T14:30:00Z",
  "blocking": [
    {
      "gap_id": "G0123",
      "type": "INSUFFICIENT_CORROBORATION",
      "object": {"claim_id": "C0042"},
      "severity": "BLOCKER",
      "message": "Claim C0042 has 1 source; requires >=2 independent",
      "suggested_actions": [
        "find_independent_source",
        "capture",
        "update_claim_record"
      ]
    },
    {
      "gap_id": "G0125",
      "type": "MISSING_EVIDENCE",
      "object": {"source_id": "S047"},
      "severity": "BLOCKER",
      "message": "S047 cited but evidence/web/S047/ does not exist",
      "suggested_actions": ["capture_source", "remove_citation"]
    }
  ],
  "non_blocking": [
    {
      "gap_id": "G0124",
      "type": "LEGAL_WORDING_RISK",
      "object": {"file": "summary.md", "claim_id": "C0047"},
      "severity": "HIGH",
      "message": "Wording states guilt as fact; should attribute",
      "suggested_actions": [
        "revise_summary_language",
        "add_attribution"
      ]
    },
    {
      "gap_id": "G0126",
      "type": "PERSPECTIVE_MISSING",
      "object": {"perspective": "Follow the Silence"},
      "severity": "MEDIUM",
      "message": "No task addresses 'who is not talking'",
      "suggested_actions": ["create_silence_task"]
    }
  ],
  "stats": {
    "total_gaps": 4,
    "blocking_count": 2,
    "high_count": 1,
    "medium_count": 1
  }
}
```

### Gap Types

| Type | Severity | Description |
|------|----------|-------------|
| `MISSING_EVIDENCE` | BLOCKER | Citation without evidence folder |
| `INSUFFICIENT_CORROBORATION` | BLOCKER | Claim below min_sources |
| `CONTENT_MISMATCH` | BLOCKER | Cited claim not in evidence text |
| `CONTRADICTED_CLAIM` | BLOCKER | Evidence contradicts claim |
| `LEGAL_WORDING_RISK` | HIGH | Statement needs qualification |
| `PRIVACY_RISK` | HIGH | PII detected |
| `UNCITED_ASSERTION` | HIGH | Damaging claim without source |
| `PERSPECTIVE_MISSING` | MEDIUM | Required perspective not addressed |
| `ADVERSARIAL_INCOMPLETE` | MEDIUM | A### tasks not complete |
| `CURIOSITY_DEFICIT` | LOW | <2 curiosity tasks this cycle |

---

## Schema: `claims/C####.json`

**Evidence bundles for corroboration tracking.**

```json
{
  "id": "C0042",
  "claim": "Company X received $5M from Agency Z on 2024-03-15.",
  "type": "factual",
  "status": "pending",
  "risk_level": "HIGH",
  "file_locations": [
    {"file": "summary.md", "line": 47},
    {"file": "findings/T003-findings.md", "line": 23}
  ],
  "supporting_sources": ["S014"],
  "counter_sources": [],
  "primary_source": null,
  "corroboration": {
    "min_sources": 2,
    "independence_rule": "different_domain_or_primary",
    "requires_primary": true,
    "notes": "Government funding claim - prefer official docs"
  },
  "verification": {
    "last_checked": "2026-01-10T14:00:00Z",
    "result": "insufficient",
    "details": "1 source found, need 2"
  },
  "created_at": "2026-01-10T10:00:00Z",
  "updated_at": "2026-01-10T14:00:00Z"
}
```

### Claim Index: `claims/index.json`

Small rollup for orchestrator/verifiers:

```json
{
  "total": 45,
  "by_status": {
    "verified": 32,
    "pending": 8,
    "insufficient": 4,
    "contradicted": 1
  },
  "by_risk": {
    "HIGH": 12,
    "MEDIUM": 20,
    "LOW": 13
  },
  "claims": [
    {"id": "C0001", "status": "verified", "sources": 3},
    {"id": "C0042", "status": "insufficient", "sources": 1}
  ]
}
```

---

## Schema: `tasks/*.json`

**Question-shaped tasks with evidence requirements.**

```json
{
  "id": "R014",
  "status": "pending",
  "priority": "HIGH",
  "type": "rigor_gap",
  "perspective": "Contradictions",
  "question": "What independent source corroborates claim C0042?",
  "evidence_requirements": {
    "min_supporting_sources": 2,
    "independence_rule": "different_domain",
    "allow_single_primary": true
  },
  "approach": "Search for primary docs; then independent reporting",
  "success_criteria": "Add >=1 corroborating source to C0042",
  "gap_id": "G0123",
  "created_at": "2026-01-10T14:30:00Z",
  "assigned_at": null,
  "completed_at": null,
  "findings_file": null,
  "sources_added": [],
  "claims_updated": []
}
```

### Task Types

| Prefix | Type | Generated From |
|--------|------|----------------|
| `T###` | Investigation | Task generation, perspectives |
| `A###` | Adversarial | Adversarial pass |
| `R###` | Rigor gap | `control/gaps.json` |

### Task States

| State | Meaning |
|-------|---------|
| `pending` | Not started |
| `in_progress` | Agent working |
| `completed` | Done, findings file exists, claims updated |

---

## Schema: `state.json`

**Minimal orchestrator state (10 lines max).**

```json
{
  "case_id": "topic-slug",
  "topic": "Investigation topic",
  "status": "IN_PROGRESS",
  "iteration": 3,
  "next_source_id": 48,
  "next_claim_id": 46,
  "created": "2026-01-10T10:00:00Z"
}
```

Notes:
- `next_source_id` and `next_claim_id` are optional convenience counters; verifiers only require the minimal fields.
- `created_at` is accepted as a synonym for `created`.

**FORBIDDEN in state.json:**
- Gap lists
- Coverage metrics
- Detailed analysis
- Any content > 1 line per field

---

## Schema: `control/digest.json`

**Tiny iteration summary for orchestrator.**

```json
{
  "iteration": 4,
  "timestamp": "2026-01-10T15:00:00Z",
  "sources_captured": ["S104", "S105"],
  "claims_verified": ["C0042", "C0043"],
  "claims_contradicted": [],
  "tasks_completed": ["T018", "R003"],
  "gaps_closed": 3,
  "gaps_remaining": 2,
  "blocking_gaps": 0
}
```

---

## Schema: `ledger.json`

**Append-only action log.**

```json
{
  "case_id": "topic-slug",
  "created_at": "2026-01-10T10:00:00Z",
  "entries": [
    {
      "id": "L001",
      "ts": "2026-01-10T10:00:00Z",
      "type": "iteration_start",
      "iteration": 1
    },
    {
      "id": "L002",
      "ts": "2026-01-10T10:05:00Z",
      "type": "gap_generated",
      "gap_id": "G0001",
      "gap_type": "MISSING_EVIDENCE"
    },
    {
      "id": "L003",
      "ts": "2026-01-10T10:10:00Z",
      "type": "task_create",
      "task_id": "R001",
      "from_gap": "G0001"
    },
    {
      "id": "L004",
      "ts": "2026-01-10T10:30:00Z",
      "type": "source_capture",
      "source_id": "S001",
      "url": "https://...",
      "evidence_path": "evidence/web/S001/"
    },
    {
      "id": "L005",
      "ts": "2026-01-10T10:35:00Z",
      "type": "claim_update",
      "claim_id": "C0001",
      "added_sources": ["S001"],
      "new_status": "verified"
    },
    {
      "id": "L006",
      "ts": "2026-01-10T10:40:00Z",
      "type": "task_complete",
      "task_id": "R001",
      "findings_file": "findings/R001-findings.md"
    }
  ]
}
```

### Entry Types

| Type | Required Fields |
|------|-----------------|
| `iteration_start` | iteration |
| `iteration_complete` | iteration, gaps_closed, gaps_remaining |
| `gap_generated` | gap_id, gap_type |
| `task_create` | task_id, from_gap (optional) |
| `task_complete` | task_id, findings_file |
| `source_capture` | source_id, url, evidence_path |
| `claim_update` | claim_id, added_sources/removed_sources, new_status |
| `gate_check` | gate, passed, reason |

---

## Orchestrator Pattern

**Main Claude Code instance ONLY orchestrates.**

### Orchestrator CAN Read

- `state.json` - Always (10 lines)
- `control/gaps.json` - Current gaps
- `control/digest.json` - Iteration summary
- `control/gate_results.json` - Gate status
- `claims/index.json` - Claim rollup
- `tasks/*.json` - Status fields

### Orchestrator CANNOT Read

- `findings/*.md` - Too large
- `research-leads/*.md` - Not citable
- `evidence/` - Raw content
- `summary.md` - Except existence check
- `claims/C####.json` - Full claim details

### Orchestrator Responsibilities

1. Read `gaps.json`, determine next actions
2. Dispatch sub-agents with prompts from `.claude/commands/prompts/`
3. Track iteration progress via TodoWrite
4. Log all actions via `ledger-append.js`
5. Run `verify-all-gates.js` to check termination

### Orchestrator MUST NOT

- Call MCP tools directly
- Reason about investigation completeness
- Make substantive claims about findings
- Skip skills by "combining" them
- Self-report gate passage

---

## Sub-Agent Context Rules

**Prevent context explosion.**

### Sub-Agents (EXCEPT Synthesis) Read ONLY:

- `state.json` - Current iteration (10 lines)
- `tasks/[assigned].json` - Their task file
- `claims/[relevant].json` - Claims they're updating
- `extraction.json` - Entities/claims list
- `control/gaps.json` - To understand what's needed

### Sub-Agents MUST NOT Read:

- `findings/*.md` - Other task outputs
- `research-leads/*.md` - Raw research
- Full `summary.md` - Too large

**Exception:** Synthesis agent reads everything to produce integrated output.

---

## Verifier Scripts

### `generate-gaps.js`

Master script that runs all verifiers and outputs `control/gaps.json`:

```bash
node scripts/generate-gaps.js cases/[case-id]
```

### Individual Verifiers

| Script | Checks | Emits |
|--------|--------|-------|
| `verify-sources.js` | Evidence folders exist | MISSING_EVIDENCE |
| `verify-source-content.js` | Claims in evidence text | CONTENT_MISMATCH |
| `verify-corroboration.js` | Claims meet min_sources | INSUFFICIENT_CORROBORATION |
| `verify-claims.js` | AI verification | CONTRADICTED_CLAIM |
| `verify-legal.js` | Legal risks | LEGAL_*, PRIVACY_* |
| `verify-integrity.js` | File/ledger consistency | Various |
| `verify-tasks.js` | Task completion | TASK_INCOMPLETE |
| `verify-state-consistency.js` | State vs filesystem | STATE_* |

### `verify-all-gates.js`

Master termination checker:

```bash
node scripts/verify-all-gates.js cases/[case-id]
# Exit 0 = all 9 gates pass
# Exit 1 = blocking gates remain
```

Outputs `control/gate_results.json`.

---

## 9 Termination Gates

| Gate | Verification | Script |
|------|--------------|--------|
| 1. Coverage | Required files exist | Built-in |
| 2. Tasks | All HIGH priority completed | `verify-tasks.js` |
| 3. Adversarial | A### tasks complete | `verify-tasks.js` |
| 4. Sources | Evidence for all [SXXX] | `verify-sources.js` |
| 5. Content | Claims in evidence | `verify-source-content.js` |
| 6. Corroboration | Claims meet thresholds | `verify-corroboration.js` |
| 7. Contradictions | All explored | Built-in |
| 8. Rigor | 20 frameworks addressed | Built-in |
| 9. Legal | No blocking legal gaps | `verify-legal.js` |

**All thresholds = 100%. No exceptions.**

---

## MCP Server Usage

| Task | Server | Tool | Config |
|------|--------|------|--------|
| Deep research (fast) | mcp-gemini | `deep_research` | - |
| Deep research (thorough) | mcp-openai | `deep_research` | - |
| Real-time multi-source | mcp-xai | `research`, `x_search` | - |
| Cross-model critique | mcp-gemini | `generate_text` | - |
| Extended reasoning | mcp-openai | `generate_text` | `reasoning_effort: xhigh` |
| **20-Framework Rigor** | mcp-openai | `generate_text` | `model: gpt-5.2-pro`, `reasoning_effort: xhigh` |
| **Deep Adversarial** | mcp-openai | `generate_text` | `model: gpt-5.2-pro`, `reasoning_effort: xhigh` |

### Extended Thinking (GPT-5.2 Pro)

For deep exploration tasks requiring exhaustive analysis, use GPT-5.2 Pro with extended thinking:

```
mcp__mcp-openai__generate_text:
  model: "gpt-5.2-pro"
  reasoning_effort: "xhigh"
  max_output_tokens: 16384
```

**When to Use Extended Thinking:**

| Task Type | Use Extended Thinking? | Why |
|-----------|------------------------|-----|
| 20-Framework Rigor | **YES** | Need exhaustive exploration of all angles |
| Adversarial Analysis | **YES** | Finding non-obvious counter-arguments |
| Curiosity Question Gen | **YES** | Creative depth for novel questions |
| Hypothesis Testing | **YES** | Must consider all competing explanations |
| Simple Task Execution | No | Overkill for routine work |
| Evidence Capture | No | Mechanical task |

**Agent Templates:**
- `prompts/deep-thinking-agent.md` - Master template for extended thinking
- `prompts/rigor-exploration-agent.md` - 20-framework analysis
- `prompts/adversarial-agent.md` - Counter-hypothesis generation

### Fast Mode (`--fast`)

For development/testing, use `--fast` flag to skip extended thinking:

| Mode | Model | Reasoning Effort |
|------|-------|------------------|
| Normal (default) | `gpt-5.2-pro` | `xhigh` |
| Fast (`--fast`) | `gpt-5.2` | `none` |

**Same prompts, same expectations - just different model.** All analysis depth, output requirements, and verification gates remain identical.

---

## Evidence Capture

### Workflow

```
Source Found -> IMMEDIATE CAPTURE -> Verify Content -> Register Source -> Update Claims
                    v
             node scripts/capture.js S### URL [case-id|case_dir]
                    v
             evidence/web/S###/
             +-- capture.png
             +-- capture.pdf
             +-- capture.html
             +-- metadata.json
             +-- extracted_text.txt
```

### AI Research Handling

| What | Where | Citable? |
|------|-------|----------|
| Gemini/OpenAI deep research | `research-leads/*.md` | **NO** |
| Primary source found via AI | `evidence/web/S###/` | **YES** |

Find the primary URL, capture it, then cite that.

---

## Corroboration Model

### Independence Rules

| Rule | Definition |
|------|------------|
| `different_domain` | Sources from different root domains |
| `primary_plus_secondary` | 1 primary doc + 1 independent report |
| `different_domain_or_primary` | Different domain OR includes primary |
| `outlet_ownership` | Different parent companies (for news) |

### Source Categories

| Category | Examples | Trust Level |
|----------|----------|-------------|
| Primary | Court filings, SEC filings, official records | Highest |
| Government | Agency databases, .gov sites | High |
| News (Tier 1) | Major outlets with editorial standards | Medium-High |
| News (Tier 2) | Regional, specialized outlets | Medium |
| Social | Twitter/X, blogs, forums | Low (corroboration required) |

### Claim Risk Levels

| Risk | Corroboration Required |
|------|------------------------|
| HIGH | 2+ sources, prefer primary |
| MEDIUM | 2+ sources |
| LOW | 1 source acceptable |

---

## Legal Verification

### Continuous Checks

Legal verification runs every iteration, emitting gaps:

```json
{
  "gap_id": "G0124",
  "type": "LEGAL_WORDING_RISK",
  "object": {"file": "summary.md", "line": 47, "claim_id": "C0047"},
  "severity": "HIGH",
  "message": "States 'CEO committed fraud' as fact without conviction",
  "suggested_actions": [
    "change_to_alleged",
    "add_attribution",
    "add_legal_proceeding_status"
  ]
}
```

### Legal Gap Types

| Type | Severity | Action |
|------|----------|--------|
| `LEGAL_DEFAMATION_RISK` | BLOCKER | Revise or add proof |
| `LEGAL_WORDING_RISK` | HIGH | Add attribution/qualification |
| `PRIVACY_RISK` | HIGH | Remove or anonymize |
| `LEGAL_ATTRIBUTION_MISSING` | MEDIUM | Add source attribution |

---

## iterations.md Format

Human-readable progress log:

```markdown
# Investigation Progress

## Iteration 4 - 2026-01-10T15:00:00Z

### Gaps
- Blocking: 0 (was 3)
- High: 2
- Closed this iteration: 5

### Tasks Completed
| Task | Question | Result | Sources |
|------|----------|--------|---------|
| R003 | Corroboration for C0042? | Found S105 | S105 |
| T018 | Timeline of payments? | Documented 3 events | S047, S048 |

### Claims Updated
| Claim | Status | Sources |
|-------|--------|---------|
| C0042 | verified (was insufficient) | S014, S105 |

### Gate Status
| Gate | Status |
|------|--------|
| Sources | PASS |
| Corroboration | PASS |
| Legal | PASS |

### Next Focus
- Execute remaining T### tasks
- Run synthesis if no new gaps

---
```

---

## Parallel Agent Safety

### Rules

1. **Exclusive ownership:** One writer per file
2. **Task parallelism:** Different tasks = different files
3. **Sequential merges:** Shared outputs written sequentially

### Lock Protocol

```json
{"type": "file_lock", "file": "findings/T001-findings.md", "agent": "exec-1"}
```

### Safe Parallel Execution

```
PARALLEL OK:
+-- Agent 1 -> findings/T001-findings.md, claims/C0042.json
+-- Agent 2 -> findings/T002-findings.md, claims/C0043.json
+-- Agent 3 -> findings/T003-findings.md, claims/C0044.json

NOT PARALLEL (sequential):
+-- Synthesis -> summary.md (after all tasks complete)
```

---

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `generate-gaps.js` | Run all verifiers, output `gaps.json` |
| `verify-all-gates.js` | Check all 9 gates, output `gate_results.json` |
| `verify-sources.js` | Check evidence folders exist |
| `verify-source-content.js` | Check claims in evidence text |
| `verify-corroboration.js` | Check claim evidence bundles |
| `verify-claims.js` | AI claim verification |
| `verify-legal.js` | Legal risk checking |
| `verify-integrity.js` | File/ledger consistency |
| `verify-tasks.js` | Task completion checking |
| `verify-state-consistency.js` | State vs filesystem |
| `ledger-append.js` | Append to `ledger.json` |
| `capture-url.js` | Capture web page evidence |
| `firecrawl-capture.js` | Bot-bypass capture |
