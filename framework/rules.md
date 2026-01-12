# Canonical Rules

**This is the single source of truth. All other files reference these rules.**

---

## Core Invariant

**The orchestrator believes only two things:**

1. The filesystem (captured evidence, task files, findings files)
2. The verifier outputs (`control/gaps.json`)

Nothing else. No self-reported completion. No "feels done."

---

## The Loop: VERIFY -> PLAN -> EXECUTE

```
+-----------------------------+
| 0) VERIFY (all verifiers)   |
|    - sources exist          |
|    - content match          |
|    - corroboration          |
|    - integrity              |
|    - legal                  |
+--------------+--------------+
               | produces
               v
+-----------------------------+
| control/gaps.json          |
| (actionable failures)       |
+--------------+--------------+
               | drives
               v
+-----------------------------+
| 1) PLAN                     |
| - convert gaps -> R tasks    |
| - add adversarial -> A tasks |
| - add curiosity -> T tasks   |
+--------------+--------------+
               |
               v
+-----------------------------+
| 2) EXECUTE                  |
| - find URLs                 |
| - CAPTURE evidence          |
| - update claims evidence    |
| - write findings files      |
+--------------+--------------+
               | loops
               v
       (back to VERIFY)
```

**Termination:** When `control/gaps.json` has zero blocking gaps and `verify-all-gates.js` exits 0.

---

## Source Attribution

| Rule | Details |
|------|---------|
| Format | `[S001]`, `[S002]`, `[S003]`... |
| Append-only | Never renumber, never delete source IDs |
| Inline citation | `"The CEO knew by January [S001] [S002]."` |
| AI research | Goes to `research-leads/` - LEADS only, not citable |
| Primary sources | Find the actual URL, capture evidence, then cite |

---

## Citation Density: EVERY FACT NEEDS A SOURCE

### The Rule

**Every factual statement in `summary.md` MUST have at least one `[SXXX]` citation.**

A "factual statement" is any claim about:
- Specific dates, times, or amounts
- Actions taken by people or organizations
- Events that occurred
- Quotes or statements attributed to someone
- Statistics, percentages, or measurements

### Examples

**WRONG (no citations):**
```markdown
Ryan Camacho was released on December 4, 2025 after being found incapable of proceeding.
He had approximately 24 prior arrests dating back to 2005.
The DA's request for involuntary commitment was denied by Judge Meyer.
```

**CORRECT (every fact cited):**
```markdown
Ryan Camacho was released on December 4, 2025 after being found incapable of proceeding [S001] [S003].
He had approximately 24 prior arrests dating back to 2005 [S001] [S004].
The DA's request for involuntary commitment was denied by Judge Louis B. Meyer III [S002] [S006].
```

### Verification

| Check | Tool | Threshold |
|-------|------|-----------|
| Citation density | `verify-citation-density.js` | 100% of factual lines |
| Zero citations | `verify-all-gates.js` | Automatic FAIL |
| Content match | `verify-source-content.js` | Claim exists in evidence |

### Anti-Hallucination Chain

```
1. Synthesis agent writes fact -> MUST include [SXXX]
2. Citation references source -> evidence/web/SXXX/ MUST exist
3. Evidence contains claim -> verify-source-content.js confirms
4. Gate check -> verify-all-gates.js validates entire chain
```

**If ANY link breaks -> Investigation cannot terminate.**

---

## Evidence Capture: CAPTURE BEFORE CITE

### 5-Layer Enforcement Protocol

**Layer 1: Capture-First Workflow**

| Rule | Enforcement |
|------|-------------|
| Capture BEFORE cite | No `[SXXX]` in any file until `evidence/web/SXXX/` exists |
| Verify capture success | Check exit code of capture script (0 = success) |
| Record in sources.json | Only after evidence folder verified |
| Audit trail | Every capture logged to `ledger.json` |

**Layer 2: Script Usage**

| Command | Purpose |
|---------|---------|
| `node scripts/capture.js S001 https://example.com [case-id|case_dir]` | Web page capture (cross-platform) |
| `node scripts/capture.js --document S015 https://sec.gov/filing.pdf [filename] [case-id|case_dir]` | Document download (cross-platform) |
| `node scripts/verify-sources.js <case_dir>` | Verify evidence files exist |
| `node scripts/verify-source-content.js <case_dir> --summary` | Verify claims in evidence (stats-only) |

Note: `scripts/capture` is a bash wrapper (WSL/Git Bash). On Windows, prefer `node scripts/capture.js`.

**Layer 3: Mechanical Verification**

```bash
# Evidence Folder Contract (CAPTURE BEFORE CITE)
ls evidence/web/SXXX/  # Must contain metadata.json + at least one payload file
# metadata.json must include hashes for payload files under `.files` (sha256:...)

# Backfill hashes into legacy evidence folders (optional):
node scripts/verify-sources.js <case_dir> --fix
```

**Layer 4: Content Verification**

`verify-source-content.js` extracts text from evidence and verifies claims:
- HTML: Parses and extracts text content
- PDF: Uses pdf-parse for text extraction
- Markdown: Strips formatting, keeps text
- Stores extracted text in `evidence/web/SXXX/extracted_text.txt`

**Layer 5: State File Integrity**

`sources.json` tracks verified status:
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

Verifiers will check:
1. Evidence folder exists for every cited source
2. Claims can be found in evidence content
3. State files match filesystem reality

### Claim Verification: Semantic, Not Verbatim

**Claims are verified for SEMANTIC support, not verbatim matching.**

A claim `"X happened [S042]"` means: "Source S042 says X happened." The verification checks if S042 actually contains X.

| Verdict | Meaning | Gate Status |
|---------|---------|-------------|
| `VERIFIED` | Source directly states or closely paraphrases the claim | PASS |
| `SYNTHESIS` | Source contains all facts the claim summarizes (no new info added) | PASS |
| `PARTIAL` | Source supports some specifics but not others | PASS (review) |
| `NOT_FOUND` | Source does not contain the claimed information | FAIL |
| `CONTRADICTED` | Source states the opposite | FAIL |

**What counts as support:**
- Paraphrasing: "lost $1.2 million" → "lost $1.2M" ✓ (same meaning)
- Format differences: "five million" → "$5M" ✓
- Summarizing stated facts: "lost $5M, laid off 200" → "major cutbacks" ✓

**What does NOT count as support:**
- Inferences beyond source: "CEO resigned" → "leadership crisis" ✗ (source doesn't say "crisis")
- Adding specifics: "lost money" → "lost $5M" ✗ (source doesn't specify amount)
- Adding context: claim adds info not in source ✗
- Different specifics: "January 15" → "January 20" ✗ (different date)

**When claims fail with NOT_FOUND:**
1. Wrong source attribution? Find the correct source that contains it
2. Evidence truncated? Re-capture with full content
3. Inference beyond source? Revise claim to match what source actually says
4. Truly unsupported? Remove the claim or find supporting evidence

---

## Claim Registry: Corroboration as First-Class

### Every Claim Gets an Evidence Bundle

Claims are explicit objects in `claims/*.json`:

```json
{
  "id": "C0042",
  "claim": "Company X received $Y from Agency Z on DATE.",
  "type": "factual",
  "status": "pending",
  "risk_level": "HIGH",
  "supporting_sources": ["S014"],
  "counter_sources": [],
  "corroboration": {
    "min_sources": 2,
    "independence_rule": "different_domain_or_primary",
    "requires_primary": true
  }
}
```

### Corroboration Rules

| Rule | Definition |
|------|------------|
| `different_domain` | Sources from different root domains |
| `primary_plus_secondary` | 1 primary doc + 1 independent report |
| `different_domain_or_primary` | Either different domain OR includes primary |

### Claim Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Not yet verified |
| `verified` | Meets corroboration requirements |
| `contradicted` | Evidence conflicts exist |
| `insufficient` | Below required corroboration threshold |

---

## Gap-Driven Task Generation

### Gap Types and Severity

| Type | Severity | Description |
|------|----------|-------------|
| `MISSING_EVIDENCE` | BLOCKER | Citation without captured evidence |
| `INSUFFICIENT_CORROBORATION` | BLOCKER | Claim below min_sources threshold |
| `CONTENT_MISMATCH` | BLOCKER | Cited claim not found in evidence |
| `LEGAL_WORDING_RISK` | HIGH | Statement needs attribution/qualification |
| `PRIVACY_RISK` | HIGH | PII detected |
| `UNCITED_ASSERTION` | HIGH | Damaging claim without source |
| `PERSPECTIVE_MISSING` | MEDIUM | Required perspective not addressed |
| `ADVERSARIAL_INCOMPLETE` | MEDIUM | Adversarial tasks not complete |
| `CURIOSITY_DEFICIT` | LOW | Fewer than 2 curiosity tasks |

### Blockers Must Be Zero

`gaps.json.blocking` must be empty to terminate. No exceptions.

---

## Question-Shaped Tasks

Tasks must be questions, not topics.

**BAD (topic-shaped):**
- "Investigate company finances"
- "Research CEO background"

**GOOD (question-shaped):**
- "What primary document confirms revenue was $X in Q3?"
- "What independent source corroborates the CEO's prior employment at Company Y?"
- "What evidence would disprove the timeline claim?"

### Task Schema

```json
{
  "id": "R014",
  "status": "pending",
  "priority": "HIGH",
  "type": "rigor_gap",
  "perspective": "Contradictions",
  "question": "Can we find independent corroboration for claim C0042?",
  "evidence_requirements": {
    "min_supporting_sources": 2,
    "independence_rule": "different_domain",
    "allow_single_primary": false
  },
  "approach": "Search for primary docs; then independent reporting",
  "success_criteria": "Add >=1 corroborating source and update claim record",
  "gap_id": "G0123",
  "created_at": "ISO-8601"
}
```

### Task Types

| Prefix | Type | Source |
|--------|------|--------|
| `T###` | Investigation | Task generation |
| `A###` | Adversarial | Adversarial pass |
| `R###` | Rigor gap | Generated from gaps |

---

## File Ownership

| File | Written By | Notes |
|------|------------|-------|
| `ledger.json` | All agents | Append via `ledger-append.js` |
| `state.json` | Orchestrator only | Minimal fields only |
| `control/gaps.json` | Verifier scripts | Generated each iteration |
| `control/digest.json` | Verifier scripts | Iteration summary |
| `tasks/*.json` | Task Gen, Adversarial, Gap-to-Task | One file per task |
| `claims/*.json` | Execution agents | Update evidence bundles |
| `findings/*.md` | Execution agents | One file per task output |
| `research-leads/*.md` | Research agents | NOT citable |
| `extraction.json` | Extraction agent | Overwrites each iteration |
| `sources.json` | Source capture | Created once, extends |
| `evidence/web/SXXX/` | Capture scripts | Capture before cite |
| `articles/*.md` | Article agent | Separate file per article |
| `summary.md` | Synthesis agent | Complete rewrite each time |
| `legal/legal-review.md` | Legal verifier | Updated each iteration |

### Parallel Agent Safety

**Each file has exactly ONE writer.** Parallel agents write to DIFFERENT files.

```
CORRECT (parallel OK):
+-- Agent 1 -> findings/T001-findings.md
+-- Agent 2 -> findings/T002-findings.md
+-- Agent 3 -> findings/T003-findings.md

WRONG (race condition):
+-- Agent 1 -> summary.md  NO
+-- Agent 2 -> summary.md  NO
```

---

## Ledger Rules

**All actions logged to `ledger.json` via `ledger-append.js`.**

| Entry Type | When |
|------------|------|
| `iteration_start` | Beginning of iteration |
| `iteration_complete` | End of iteration |
| `gap_generated` | Verifier found a gap |
| `task_create` | New task created from gap |
| `task_complete` | Task finished |
| `source_capture` | Evidence captured |
| `claim_update` | Claim evidence bundle changed |
| `gate_check` | Gate verified |

---

## Verifiers (Continuous, Not Final)

### All Verifiers Run Every Iteration

| Verifier | Script | Emits |
|----------|--------|-------|
| Schema | `validate-schema.js` | `SCHEMA_INVALID` gaps |
| Sources exist | `verify-sources.js` | `MISSING_EVIDENCE` gaps |
| Source dedup | `verify-sources-dedup.js` | `DUPLICATE_SOURCE_URL` gaps |
| Circular reporting | `verify-circular-reporting.js` | `CIRCULAR_REPORTING_RISK` gaps |
| Citation density | `verify-citation-density.js` | `UNCITED_ASSERTION` gaps |
| Content match | `verify-source-content.js` | `CONTENT_MISMATCH` gaps |
| Corroboration | `verify-corroboration.js` | `INSUFFICIENT_CORROBORATION` gaps |
| State consistency | `verify-state-consistency.js` | `STATE_INCONSISTENT` gaps |
| Legal review | `verify-legal.js` | `LEGAL_WORDING_RISK`, `PRIVACY_RISK` gaps |
| Integrity | `verify-integrity.js` | Various integrity gaps |
| Tasks integrity | `verify-tasks.js` | `TASK_INCOMPLETE` gaps |

### Master Verification

```bash
node scripts/generate-gaps.js cases/[case-id]
# Outputs: control/gaps.json
```

Then:
```bash
node scripts/verify-all-gates.js cases/[case-id]
# Exit 0 = can terminate
# Exit 1 = must continue
```

---

## 9 Termination Gates

**ALL must pass mechanically.**

| Gate | Verification |
|------|--------------|
| 1. Coverage | Files exist, thresholds met |
| 2. Tasks | All HIGH priority completed |
| 3. Adversarial | A### tasks exist and completed |
| 4. Sources | Evidence for every [SXXX] |
| 5. Content | Claims found in evidence |
| 6. Corroboration | All claims meet min_sources |
| 7. Contradictions | All explored |
| 8. Rigor | 35 frameworks validated |
| 9. Legal | No blocking legal gaps |

**If ANY gate fails -> gaps -> tasks -> execute -> loop.**

---

## Required Perspectives

Every task generation cycle MUST address 10 perspectives:

```
[ ] Money/Financial    [ ] Silence           [ ] Documents
[ ] Timeline           [ ] Contradictions    [ ] Relationships
[ ] Hypotheses         [ ] Assumptions       [ ] Counterfactual
[ ] Blind Spots
```

Plus: **2+ curiosity tasks per cycle** (mandatory)

---

## Adversarial Pass

For each major claim:
1. What would DISPROVE it?
2. Strongest argument for unexplored positions?
3. What assumptions are EMBEDDED?
4. What evidence would CHANGE conclusions?
5. What would the SUBJECT refuse to answer?
6. Who BENEFITS from us not investigating?

Generate A### tasks for each gap identified.

---

## 35-Framework Rigor Checkpoint

**Core Investigation (1-20):**
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

**Domain Expertise (21-25):**
21. First Principles / Scientific Reality
22. Domain Expert Blind Spots
23. Marketing vs Scientific Reality
24. Subject Experience / Ground Truth
25. Contrarian Expert Search

**Analytical Rigor (26-30):**
26. Quantification & Base Rates
27. Causation vs Correlation
28. Definitional Analysis
29. Methodology Audit
30. Incentive Mapping

**Structural Analysis (31-35):**
31. Information Asymmetry
32. Comparative Benchmarking
33. Regulatory & Institutional Capture
34. Data Provenance & Chain of Custody
35. Mechanism Tracing

Each: OK Addressed | N/A (explain) | NO Gap (generate task)

---

## Legal Verification (Continuous)

Legal is a verifier that emits gaps, not a final checkbox.

### Mechanical Checks

- HIGH-risk claims require: primary source OR attribution language
- No uncited damaging assertions
- Clear fact/allegation/analysis distinction
- No disallowed PII (addresses, phone numbers)

### Gap Examples

```json
{
  "gap_id": "G0124",
  "type": "LEGAL_WORDING_RISK",
  "object": {"file": "summary.md", "claim_id": "C0047"},
  "severity": "HIGH",
  "message": "Wording states guilt as fact; should attribute or qualify.",
  "suggested_actions": ["revise_language", "add_attribution", "add_counterpoint"]
}
```

These gaps generate tasks -> execute -> verify again.

---

## Anti-Gaming Rules

- Do NOT skip verification because "obviously done"
- Do NOT claim saturation to avoid iterations
- Do NOT cherry-pick claims to fact-check
- Do NOT ignore alternative theories
- Do NOT give benefit of the doubt on gaps
- Do NOT bypass rigor checkpoint
- Do NOT accept ANY metric below 100%
- Do NOT "document gaps" instead of fixing them
- Do NOT cite without captured evidence
- Do NOT self-report gate passage

---

## Deliverables

### summary.md - Investigation Record

**The comprehensive source of truth** containing all findings, all sources, all positions, all contradictions. This is the canonical record from which articles are derived.

| Do | Don't |
|----|-------|
| Rewrite completely each update | Append incrementally |
| Smooth narrative flow | "Additionally found..." |
| Self-contained with all sources | Require external context |
| Professional journalism quality | Working document artifacts |

**Test:** Does this contain everything discovered?

### articles/ - Publication Outputs

Generated via `/article` command from `summary.md`.

| File | Purpose |
|------|---------|
| `articles/article-short.md` | Quick-read overview (400-800 words) |
| `articles/article-full.md` | Full professional article (2,000-4,000 words) |

**Test:** Could you hand these to a journalist right now?
