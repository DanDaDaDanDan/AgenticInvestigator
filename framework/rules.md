# Canonical Rules

**This is the single source of truth. All other files reference these rules. Do not duplicate.**

---

## Source Attribution

| Rule | Details |
|------|---------|
| Format | `[S001]`, `[S002]`, `[S003]`... |
| Append-only | Never renumber, never delete source IDs |
| Inline citation | `"The CEO knew by January [S001] [S002]."` |
| AI research | Goes to `research-leads/` — these are LEADS, not citable sources |
| Primary sources | Find the actual URL, capture evidence, then cite |

---

## Evidence Capture

### 5-Layer Enforcement Protocol

**Layer 1: Capture-First Workflow**

| Rule | Enforcement |
|------|-------------|
| Capture BEFORE cite | No `[SXXX]` in any file until `evidence/web/SXXX/` exists |
| Verify capture success | Check exit code of capture script (0 = success) |
| Record in _sources.json | Only after evidence folder verified |
| Audit trail | Every capture logged with timestamp |

**Layer 2: Script Usage**

| Command | Purpose |
|---------|---------|
| `./scripts/capture S001 https://example.com` | Web page capture |
| `./scripts/capture --document S015 https://sec.gov/filing.pdf` | Document download |
| `node scripts/verify-sources.js <case_dir>` | Verify evidence files exist |
| `node scripts/verify-source-content.js <case_dir>` | Verify claims in evidence |

**Layer 3: Mechanical Verification**

Before citing any source, run:
```bash
# Check evidence folder exists with required files
ls evidence/web/SXXX/  # Must contain metadata.json + (html|pdf|png)
```

**Layer 4: Content Verification**

The `verify-source-content.js` script extracts text from evidence and verifies claims:
- HTML: Parses and extracts text content
- PDF: Uses pdf-parse for text extraction
- Markdown: Strips formatting, keeps text
- Stores extracted text in `evidence/web/SXXX/extracted_text.txt`

**Layer 5: State File Integrity**

`_sources.json` must track verified status:
```json
{
  "S001": {
    "url": "https://...",
    "captured_at": "2026-01-09T14:30:00Z",
    "evidence_path": "evidence/web/S001/",
    "files": ["metadata.json", "capture.html", "capture.png"],
    "verified": true
  }
}
```

### Anti-Hallucination Rule

**Do NOT write "Captured: [date]" without running the capture script.**

The orchestrator will verify:
1. Evidence folder exists for every cited source
2. Claims can be found in evidence content
3. State files match filesystem reality

---

## State Update Ownership

Only one agent updates each field to prevent race conditions:

| Field | Updated By |
|-------|------------|
| `current_phase` | Each agent sets at phase start |
| `current_iteration` | Synthesis Agent only |
| `next_source_id` | Investigation Agent (read-increment-write atomically) |
| `verification_passed` | Verification Agent only |
| `adversarial_complete` | Adversarial Agent only |
| `rigor_checkpoint_passed` | Rigor Checkpoint Agent only |
| `quality_checks_passed` | Quality Check Agent only |

---

## File Ownership

| File | Written By |
|------|------------|
| `research-leads/*.md` | Research Agents |
| `_extraction.json` | Extraction Agent (overwrites each iteration) |
| `_sources.json` | Source Discovery Agent (created once, may be extended) |
| `_tasks.json` | Task Generation Agent, Adversarial Agent, Rigor Checkpoint Agent |
| `_coverage.json` | Coverage Agent (overwrites after each task batch) |
| `people.md`, `timeline.md`, `organizations.md` | Investigation Agents |
| `fact-check.md`, `statements.md`, `theories.md` | Investigation Agents |
| `positions.md` | Investigation Agents |
| `sources.md` | Investigation Agents (append new sources) |
| `summary.md` | Synthesis Agent (complete rewrite each time) |
| `iterations.md` | All agents (append checkpoints/logs) |
| `_audit.json` | All agents (append via audit-append.js) |
| `_state.json` | Per field ownership above |

---

## Audit Trail Rules

**All agent actions must be logged for debugging and progress tracking.**

### Required Files

| File | Purpose | Update Method |
|------|---------|---------------|
| `_audit.json` | Machine-readable action log | `node scripts/audit-append.js` |
| `iterations.md` | Human-readable progress log | Direct append at iteration end |

### Actions That Must Be Logged

| Action | Actor | When | Log Command |
|--------|-------|------|-------------|
| `phase_start` | orchestrator | Beginning of phase | `audit-append.js <case> orchestrator phase_start --target PHASE_NAME` |
| `phase_complete` | orchestrator | End of phase | `audit-append.js <case> orchestrator phase_complete --target PHASE_NAME` |
| `task_start` | task-agent | Before starting task | `audit-append.js <case> task-agent task_start --target T###` |
| `task_complete` | task-agent | After completing task | `audit-append.js <case> task-agent task_complete --target T### --output '{...}'` |
| `capture_source` | capture-agent | After capture | `audit-append.js <case> capture-agent capture_source --target S### --input '{...}'` |
| `verification_run` | verify-agent | After verification | `audit-append.js <case> verify-agent verification_run --output '{...}'` |
| `gate_check` | orchestrator | After gate check | `audit-append.js <case> orchestrator gate_check --output '{...}'` |

### iterations.md Format

Update at each iteration boundary with:
- Phase summary table
- Tasks completed this iteration
- Coverage snapshot
- Gate status
- Next iteration focus

See `framework/architecture.md` for full template.

### Verification

```bash
node scripts/verify-audit-trail.js cases/[case-id]
```

Checks:
- `_audit.json` exists and has entries
- `iterations.md` exists and has content
- Completed tasks are logged in audit
- Source captures are logged

---

## Task File Rules

### _tasks.json Structure

```json
{
  "tasks": [...],           // Main investigation tasks
  "adversarial_tasks": [...], // Counter-tasks from adversarial pass
  "rigor_gap_tasks": [...]   // Tasks generated by rigor checkpoint
}
```

### Task States

| State | Meaning |
|-------|---------|
| `pending` | Not yet started |
| `in_progress` | Agent working on it |
| `completed` | Done, findings in `findings_file` |

### Task Generation Rules

1. Every cycle MUST address 10 required perspectives (or explain N/A)
2. Every cycle MUST generate at least 2 curiosity tasks
3. Tasks must have: id, description, perspective, priority, rationale, approach, success_criteria
4. Flag any perspective with no applicable task

---

## Coverage Metrics Rules

### Required Thresholds (for termination)

| Metric | Threshold |
|--------|-----------|
| People: investigated/mentioned | ≥ 90% |
| Entities: investigated/mentioned | ≥ 90% |
| Claims: verified/total | ≥ 80% |
| Sources: captured/cited | = 100% |
| Positions: documented/identified | = 100% |
| Contradictions: explored/identified | = 100% |

### Coverage Agent Updates _coverage.json After:

- Every task batch completion
- Before termination gate check

---

## Verification Rules

**Core checklist (all must be YES):**
1. All major people investigated
2. All major claims fact-checked (from ALL positions)
3. All positions steelmanned
4. Alternative theories addressed with evidence
5. All sources have captured evidence
6. No contradicted claims in evidence check

**Anti-Hallucination Check:**
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

## Termination Gates (9 Required)

**ALL must be mechanically verified to terminate.**

Run: `node scripts/verify-all-gates.js <case_dir>`

| Gate | Script | Verification |
|------|--------|--------------|
| 1. Coverage | `verify-all-gates.js` | Files exist, thresholds met |
| 2. Tasks | `verify-all-gates.js` | All tasks completed, outputs exist |
| 3. Adversarial | `verify-all-gates.js` | adversarial_complete=true, findings files exist |
| 4. Sources | `verify-sources.js` | Evidence folder for every [SXXX] |
| 5. Content | `verify-source-content.js` | Claims found in evidence text |
| 6. Claims | `verify-claims.js` | AI verification passes |
| 7. Contradictions | `verify-all-gates.js` | All contradictions explored |
| 8. Rigor | `verify-all-gates.js` | rigor_checkpoint_passed=true |
| 9. Legal | `verify-all-gates.js` | Legal review file exists |

**Mechanical Enforcement:**

```bash
# Run before marking investigation COMPLETE
node scripts/verify-all-gates.js cases/[case-id]

# Exit code 0 = all gates pass → can terminate
# Exit code 1 = gates failed → continue investigation
```

Results saved to: `cases/[case-id]/_gate_results.json`

**If ANY gate fails → generate tasks to address → loop.**

**Do NOT self-report gate passage.** Only the verification scripts can mark gates as passed.

---

## Rigor Checkpoint Rules

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

**Cannot pass rigor checkpoint with unexplained gaps.**

---

## Adversarial Pass Rules

After initial task generation, run adversarial review:

1. For each major claim: What would DISPROVE it?
2. Strongest argument for unexplored positions?
3. What assumptions are EMBEDDED in these tasks?
4. What evidence would CHANGE our conclusions?
5. What would the SUBJECT refuse to answer?
6. Who BENEFITS from us not investigating something?

Generate counter-tasks for each gap identified.

---

## Curiosity Requirements

Every task generation cycle MUST include curiosity check:

```
1. What would a MORE curious investigator ask?
2. What's the most important thing we DON'T know?
3. What would SURPRISE us if true?
4. Who ELSE should we be talking to/about?
5. What CONNECTIONS haven't we explored?
```

**Generate at least 2 curiosity tasks per cycle.**

---

## Dynamic Source Discovery

**Sources are discovered dynamically for each case, not hardcoded.**

1. SOURCE DISCOVERY phase runs after extraction
2. Baseline sources selected from `framework/data-sources.md` based on entity types
3. Deep research finds case-specific sources (e.g., FDA for pharma, FINRA for finance)
4. Combined sources saved to `_sources.json`
5. Task generation and investigation agents use `_sources.json`

Full baseline reference: `framework/data-sources.md`

**The baseline seeds discovery. Case-specific sources emerge dynamically.**

---

## Termination Signals

**You ARE likely done when:**
- Same sources appear across all research engines
- New task generation yields mostly duplicates
- Rigor checkpoint finds all frameworks ✓ or N/A
- Coverage metrics at thresholds
- All 9 termination gates pass

**You are NOT done because:**
- You've completed many iterations
- It "feels" complete
- Most gates are passing

**When uncertain:** Run one more task generation cycle. If no new tasks emerge, you're done.

---

## summary.md Standards

**summary.md is THE DELIVERABLE — a polished final product.**

| Do | Don't |
|----|-------|
| Rewrite completely each update | Append incrementally |
| Smooth narrative flow | "Additionally found...", "We also discovered..." |
| Self-contained with all sources | Require external context |
| Professional journalism quality | Working document artifacts |

**The test:** Could you hand this to a journalist or executive right now?

---

## Anti-Gaming Rules

- Do NOT skip verification because "it's obviously done"
- Do NOT claim saturation to avoid more iterations
- Do NOT cherry-pick which claims to fact-check
- Do NOT ignore alternative theories because they're "obviously false"
- Do NOT give benefit of the doubt on gaps — if it's PARTIAL, it's not YES
- Do NOT skip adversarial pass because tasks "seem comprehensive"
- Do NOT bypass rigor checkpoint because "we've covered everything"
- Do NOT lower coverage thresholds because "90% is close enough"
