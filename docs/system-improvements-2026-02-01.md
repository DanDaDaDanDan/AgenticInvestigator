# System Improvements (2026-02-01)

This document captures observed failure modes from the active case and the concrete hardening changes made to reduce recurrence.

## Observed Failure Modes (Active Case: `solo-free-climbing-deaths-and-risk-factors`)

1. **Fabricated / synthesized “sources”**
   - `sources.json` contained non-URL placeholders like `research-synthesis` / `research_synthesis`.
   - Evidence folders existed that were clearly handcrafted (e.g., a toy `raw.html`).
   - These artifacts were still cited in findings and articles.

2. **Citation laundering**
   - Articles attached `[S###]` markers to claims that did not appear in the cited source content.
   - Some “verification” responses marked claims as supported with no supporting quote.

3. **Numeric over-precision without audit trail**
   - Articles contained many precise-looking numbers without line-level citations or a published counting method.
   - “Internal analysis” sources were used as a stand-in rather than publishing the underlying inputs and arithmetic.

4. **Focus drift**
   - The final article over-weighted narratively compelling tangents (classification disputes, one weather story) vs the reader’s core question (how dangerous, how deaths happen, age correlation, what to expect).

5. **Gate self-reporting**
   - `state.json.gates.*` could be set to `true` even when deterministic checks would fail.

## Changes Implemented

### 1) Deterministic gate derivation (anti-self-report)

- New module: `scripts/gates.js`
  - Derives gates from files + deterministic checks (Gate 5 preflight, audit artifacts, etc.).
  - Gate 5 requires:
    - deterministic preflight checks
    - `semantic-verification.json`
    - `compute-verification.json`

- New CLI: `scripts/update-gates.js`
  - `--write` updates `state.json.gates` from derived results.
  - Receipt enforcement is optional; it is enabled via `--strict` or automatically when `EVIDENCE_RECEIPT_KEY` is configured.

- Updated: `scripts/check-continue.js`
  - Uses **derived gates** for decisions and completion status (prevents “COMPLETE” on self-reported gates).

### 2) Semantic verification output made durable

- Updated: `scripts/claims/verify-article.js`
  - When processing LLM responses, now writes `semantic-verification.json` to the case folder.
  - This enables deterministic gate derivation for Gate 5.

### 3) Quality gate artifacts (auditable outputs)

- Updated skills:
  - `.claude/skills/balance-audit/SKILL.md` → writes `balance-audit.md` with `## Status` → `**PASS**|**FAIL**`
  - `.claude/skills/completeness-audit/SKILL.md` → writes `completeness-audit.md` with `## Status` → `**PASS**|**FAIL**`
  - `.claude/skills/significance-audit/SKILL.md` → writes `significance-audit.md` with `## Status` → `**PASS**|**FAIL**`

### 4) Revision feedback ingestion (file-based)

- New CLI: `scripts/ingest-feedback.js`
  - Creates `feedback/revisionN.md` from one or more feedback files (verbatim).
  - Updates `state.json` to start a revision cycle and resets gates 2–10.

- Updated: `.claude/skills/case-feedback/SKILL.md`
  - Documents using `scripts/ingest-feedback.js` when feedback already exists in files.

### 5) Article generation hardening (focus + micromorts)

- Updated: `.claude/skills/article/SKILL.md`
  - Step 0 now uses `scripts/update-gates.js --json` so it doesn’t trust self-reported booleans for Gates 0–3.
  - If publishing any risk rate (“1 in X”, “Y%”, “Z×”), the article must include:
    - micromort conversion
    - explicit, fully sourced calculation inputs (or remove the number).
    - benchmark comparisons are encouraged when they clarify scale (but should not be forced).

### 6) “Synthesis is not a source” made explicit + supported

- Updated: `scripts/init-case.js`
  - New cases now include `analysis/` for working memos/syntheses.

- Updated: `README.md`
  - Documents `analysis/` as non-source working space.

- Updated: `CLAUDE.md`
  - Explicit rule: syntheses go in `analysis/` and must cite underlying `S###` sources with direct quotes; never registered as sources.

### 7) Revision cycle flow now supported end-to-end

- Updated: `scripts/check-continue.js`
  - Adds explicit `REVISION` phase handling (pursue new leads → reconcile → curiosity → rewrite → verify).
- Case feedback ingestion now produces actionable revision artifacts:
  - `scripts/ingest-feedback.js` writes `feedback/revisionN.md`
  - Revision file includes an `## Article Changes` section used as a binding contract for `/article` during revisions.

### 8) Lead hygiene (prevents “unsourced lead results” from leaking downstream)

- New: `scripts/audit-leads.js`
  - For `status: investigated` leads: if `result` contains digits, `sources[]` must be populated and reference valid `http(s)` sources in `sources.json`.
- Updated: `scripts/gates.js`
  - Gate 3 (Reconciliation) now fails if lead hygiene fails (in addition to reconciliation-log freshness).

### 9) Article focus + risk framing enforcement (prevents tangent domination + missing micromorts)

- New: `scripts/audit-article-outline.js`
  - Enforces `articles/outline.md` with Deliverables + Quant Claims Plan + Tangent Budget (scope control).
- New: `scripts/audit-risk-micromort.js`
  - If the article publishes risk rates (“1 in X”, “Y%”, “Z×”) in risk/mortality context, it must include a micromort conversion.
- Updated: `scripts/gates.js`
  - Gate 4 (Article) now requires both outline + micromort audit passing (conditional on risk-rate detection).
- Updated: `.claude/skills/article/SKILL.md`
  - Adds explicit validation commands for outline + micromort requirement.

### 10) Stronger publication-mode evidence integrity checks

- Updated: `scripts/verify-source.js`
  - Adds **publication mode** (default for sources cited in `articles/full.md`):
    - Requires a provenance signal (receipt/provenance/method/capture_method)
    - Treats “human-readable” capture signatures as errors for publication (not just warnings)
  - This reduces the chance that handcrafted/fabricated evidence can pass verification unnoticed.

### 11) Planning prompt now preserves the reader contract

- Updated: `.claude/skills/plan-investigation/SKILL.md`
  - Adds `## Original Ask (Verbatim)` + `## Deliverables Checklist` to prevent “interesting reframes” that drop the user’s actual deliverables.

## Remaining Recommendations (Not Yet Implemented)

1. **Trusted capture receipts**
   - Current cryptographic receipts help detect some tampering but do not fully prevent a model from fabricating an “internally consistent” capture payload.
   - The strongest fix is signing at capture-time inside the MCP server/tooling boundary.

2. **Domain-specific capture playbooks**
   - Some sites (e.g., AAC Publications) can return mismatched page content via HTML scraping.
   - Prefer PDFs or alternate endpoints when available; encode this as domain rules in capture workflow.

3. **Lead-result discipline (tighten beyond digits heuristic)**
   - The new lead audit blocks missing/invalid sources for numeric lead results, but does not yet enforce:
     - quote-first lead results (results should be mostly verbatim quotes + citations)
     - tighter rules for non-numeric factual assertions
     - stronger “homepage discouraged” rule at lead time

4. **Numeric ledger automation**
   - Full articles should include a structured “Numerical Claims Ledger” that can be checked mechanically.
   - Add a generator/checker to enforce the ledger is complete.
