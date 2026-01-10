# AgenticInvestigator - Deep Dive Suggestions (Claude Code Orchestrator)

This is a repo review focused on **Claude Code as the orchestrator** (custom commands in `.claude/commands/`) and the **Node-based capture/verification toolchain** (`scripts/`). It calls out concrete flaws/bugs and proposes improvements to outcome quality, rigor, and operational reliability.

Last reviewed: 2026-01-10

---

## 1) Highest-impact issues (break stated guarantees)

### 1.1 `generate-gaps.js` is not a faithful "single input of truth"

The documentation repeatedly frames `control/gaps.json` as *the* driver for work, but the current implementation misses multiple gate-level failures.

Key problems:
- **External verifiers are effectively ignored.** `scripts/generate-gaps.js` runs "external verifiers" via `runVerifier()`, but it only consumes a `gaps` array from their JSON output. `scripts/verify-source-content.js` and `scripts/verify-state-consistency.js` do not output `gaps`, so `generate-gaps.js` silently drops their results.
  - Outcome: "content mismatch"/state consistency failures never become actionable gaps.
- **No citation-density gaps.** `generate-gaps.js` declares `UNCITED_ASSERTION` in `GAP_TYPES`, but there is no implementation that actually inspects `summary.md` citations (contrast with `scripts/verify-citation-density.js` and the coverage gate in `scripts/verify-all-gates.js`).
  - Outcome: the system can show `blocking=[]` while `summary.md` has *zero citations*.
- **Severity mapping is inconsistent/unreliable.** `generate-gaps.js` defines `GAP_TYPES` (type -> severity) but then hard-codes severities in each produced gap. Example: `INSUFFICIENT_CORROBORATION` is declared as `BLOCKER`, but missing-primary cases are emitted as `HIGH`.
  - Outcome: `blocking=[]` can be true while the system is clearly not termination-ready.

Concrete reproduction (local):
- `node scripts/verify-all-gates.js cases/old-raleigh-murder` fails multiple gates (coverage/citations, content, claims, rigor, legal).
- `node scripts/generate-gaps.js cases/old-raleigh-murder --json` reports **`blocking: []`** even though termination gates fail.

Suggested fixes:
- Decide on a **single canonical "gap contract"**:
  - Either (A) every verifier emits `{ gaps: [...] }` in `--json` mode (recommended), or
  - (B) `generate-gaps.js` adapts verifier-specific JSON into gaps (more brittle).
- Add citation-density scanning to `generate-gaps.js` and emit `UNCITED_ASSERTION` gaps (or reuse `verify-citation-density.js` in a summary mode).
- Make `generate-gaps.js` derive severity from `GAP_TYPES` (don't hand-roll severities per site) so type semantics are consistent everywhere.
- Promote any "would fail a termination gate" condition to `BLOCKER` severity in gaps.

---

### 1.2 Case-file schemas drift across docs vs scripts vs example case

There are several competing "schemas" for core state files. This is currently the #1 source of verifier brittleness.

#### `state.json`
- Documented schema: `framework/architecture.md` ("Minimal orchestrator state"), includes `next_source_id`, `next_claim_id`, etc.
- Script expectations: `scripts/verify-state-consistency.js` expects flags like `verification_passed`, `adversarial_complete`, `quality_checks_passed`.
- Example case: `cases/old-raleigh-murder/state.json` uses `status`, `gates_passed`, `rigor_checkpoint_passed`, etc, and does not match either set of expectations.

Recommendation:
- Pick **one** state schema and enforce it mechanically:
  - Update docs + scripts to match.
  - Add a strict validator script (e.g., `scripts/validate-schema.js`) and run it from `verify-all-gates.js` / `generate-gaps.js`.

#### `sources.json`
At least two incompatible meanings exist:
- "Captured source registry" (ID->metadata mapping), e.g. `cases/old-raleigh-murder/sources.json`.
- "Source discovery baseline/discovered lists" (arrays), which `scripts/verify-state-consistency.js` tries to interpret via `baseline`/`discovered` keys.

Recommendation:
- Rename files to remove ambiguity:
  - `sources.json` -> `captured-sources.json` (ID->metadata), and
  - `data-sources.json` (baseline/discovered registries), or `sources-discovery.json`.
- Update every script to use the renamed, single-purpose files.

#### Corroboration / "primary source" classification

Several scripts check for `category: "primary"` in captured sources, while the sample case uses fields like `source_type` (e.g., `primary_legal`, `official_database`, `regional_news`). `scripts/generate-gaps.js` also checks a `claim.primary_source` field that is not in the documented claim schema. This makes `requires_primary` enforcement unreliable (false positives and/or impossible-to-satisfy rules).

Recommendation:
- Add a single source classification field to the captured source registry (e.g., `category: primary|government|news|social`) and derive it deterministically from `source_type` if needed.
- Update `verify-corroboration.js` and `generate-gaps.js` to use the same classification + independence logic (avoid divergent re-implementations).

#### `tasks/*.json`
The ecosystem currently accepts multiple status/field variants:
- Status: `pending`, `in_progress`, `completed` (docs), but the sample uses `complete` as well (e.g., `tasks/T005.json`).
- Output field: `findings_file`, `output_file`, `output` are all used.

This creates real bugs:
- `scripts/verify-all-gates.js` Gate 2 (`verifyTasks`) only treats `status === "pending"` as incomplete; it ignores `in_progress` and any "unknown" statuses, so high-priority work can slip through.
- It also only checks findings existence for tasks with `status === "completed"`, so tasks marked `complete` are not checked at all.

Recommendation:
- Normalize task status and output fields:
  - Define an enum: `pending | in_progress | completed`.
  - Standardize one output pointer: `findings_file`.
  - Add a migrator script for legacy tasks (and/or make verifiers tolerate legacy for a short transition period).
- Update gates to treat "not completed" as incomplete (not only "pending").

Also: the "required perspectives" check in `scripts/generate-gaps.js` uses exact string matching (e.g., `Money`, `Timeline`), while tasks/prompt templates often use names like `Money/Financial` or `Timeline/Sequence`. This can produce false `PERSPECTIVE_MISSING` gaps.

Recommendation:
- Canonicalize perspectives (enum + alias map) and normalize them at write time and verify time.

---

### 1.3 Evidence capture format is inconsistent with verifiers

The repository promises "capture before cite" and anti-hallucination verification, but capture outputs are not standardized.

Observed formats:
- `scripts/capture-url.js` and `scripts/firecrawl-capture.js` write `capture.html`, `capture.pdf`, `capture.png`, `capture.md` and `metadata.json` with `files.{...hash...}`.
- The example case evidence folders include `content.md` and sometimes `capture.json` + lightweight `metadata.json` without hashes (e.g., `cases/old-raleigh-murder/evidence/web/S016/`), which `verify-source-content.js` does not read.

Consequences:
- `scripts/verify-source-content.js` reports `no_evidence` for everything, because it only recognizes `capture.md`, `capture.html`, `capture.pdf`, etc (not `content.md`).
- `scripts/verify-sources.js` can incorrectly mark evidence as "valid" even when `metadata.files` is missing (no hashes validated).
- Evidence integrity is not actually enforced unless the capture pipeline always produces the "hashed files" format.

Recommendation:
- Define a single **Evidence Folder Contract**, e.g.:
  - Required: `metadata.json` with `files` hashes OR `metadata.json` + `content.md` + `content_hash` (but make it explicit).
  - Allowed capture payload files: `{capture.html, capture.pdf, capture.png, capture.md, content.md, extracted_text.txt}`, but verifiers must be updated to load all allowed forms.
  - Require the folder name to match `metadata.source_id`.
- Update `verify-source-content.js` and `verify-sources.js` to support the full contract and fail hard when the contract is not met.

---

### 1.4 `verify-all-gates.js` contains correctness bugs (false passes / poor diagnostics)

Gate 2 (Tasks) / Gate 3 (Adversarial):
- Treat only `status === "pending"` as unfinished. Tasks in `in_progress` (or any unknown status) won't fail the gate.
- Only checks findings existence for `status === "completed"`.

Ledger audit:
- `scripts/verify-all-gates.js`'s `verifyLedger()` extracts captured sources from `entry.details?.source`, but `scripts/ledger-append.js` writes `source_id`.
  - Result: `sources_captured` can incorrectly show `0`, undermining audit usefulness.

Content gate invocation robustness:
- `verifyContent()` runs `verify-source-content.js --json` via `spawnSync` and expects to parse stdout as JSON.
- `verify-source-content.js --json` can emit very large JSON (e.g., listing every unmatched claim), which risks exceeding Node's `spawnSync` `maxBuffer` and collapsing to the unhelpful error "Content verification failed".

Claims gate execution:
- `scripts/verify-claims.js` requires `GEMINI_API_KEY` and exits early if it's missing; several docs imply `.env` support, but `verify-claims.js` does not load dotenv the way `firecrawl-capture.js` / `capture-evidence.js` do.

Recommendation:
- Enforce strict task status semantics in gates: "anything not `completed` is unfinished".
- Fix ledger field access (`source_id`, `sources_added`, etc) to match `ledger-append.js`.
- Add a "summary JSON" mode to `verify-source-content.js` (stats only), and have `verify-all-gates.js` use that, or increase `spawnSync` buffer + check `proc.error` explicitly.

---

## 2) Documentation mismatches and command-layer sharp edges

### 2.1 Conflicting thresholds (50% vs 80% vs "100%")

Conflicts currently present:
- `framework/rules.md` sets citation density >= 80%.
- `scripts/verify-citation-density.js` enforces 80%.
- `scripts/verify-all-gates.js` uses a "quick check" threshold of 50% for coverage gate.
- `scripts/verify-capture-ready.js` defaults to 80% capture threshold despite the "CAPTURE BEFORE CITE" invariant implying 100%.
- Several docs assert "All thresholds are 100%" while simultaneously defining <100 thresholds.

Recommendation:
- Decide the canonical thresholds and encode them once:
  - Prefer a single `scripts/config.json` (or `framework/config.md`) and import it in scripts.
  - Make `verify-all-gates.js` call `verify-citation-density.js --json` (or share a library) rather than maintaining a divergent "quick check".

### 2.2 Scripts referenced in docs but missing in `scripts/`

`framework/rules.md` references:
- `verify-legal.js`
- `verify-integrity.js`
- `verify-tasks.js`

These do not exist, which makes the "verifiers run every iteration" narrative misleading.

Recommendation:
- Either implement them, or remove references and point to the actual mechanisms (e.g., `checkLegal()` inside `generate-gaps.js`, `verify-all-gates.js`).

### 2.3 Command examples sometimes omit `scripts/`

Some docs/command templates show `node generate-gaps.js` rather than `node scripts/generate-gaps.js`.

Recommendation:
- Make every command snippet copy-paste correct from repo root.

### 2.4 Encoding artifacts reduce readability

Multiple markdown files show garbled characters (e.g., "[garbled glyphs]"). This makes the repo harder to use and review and can pollute verification heuristics that rely on string matching.

Recommendation:
- Normalize all markdown and JS files to UTF-8.
- Avoid non-ASCII glyphs in "protocol" strings that are later parsed by scripts (prefer ASCII markers).

---

## 3) Claude Code orchestration layer (`.claude/commands/`) - improvements

### 3.1 Make "active case" a first-class concept

Right now, "active case" exists (`cases/.active`) and is used by `scripts/capture` (bash), but the Claude commands primarily take `[case-id]` and don't specify a canonical resolution order.

Recommendation:
- Define a single resolution order for commands:
  1) explicit arg `[case-id]`
  2) `cases/.active`
  3) error with hint
- Add a small helper script (Node) to set/get active case, and have commands call it.

### 3.2 Make the orchestrator's "read allowlist" enforceable

Docs say orchestrator must not read large files like `findings/*.md`, but this is currently guidance-only.

Recommendation (optional, if you want hard guarantees):
- Add a "strict orchestrator mode" wrapper command that:
  - runs verifiers,
  - prints only summaries (counts + file paths),
  - and avoids showing large artifacts unless explicitly requested.

### 3.3 Align prompt templates with actual tool surfaces

Prompt templates reference tool names like `mcp__mcp-openai__generate_text`. Ensure these match your real MCP server tool identifiers, or provide a mapping section in one canonical place.

Recommendation:
- Add a `.claude/commands/prompts/_tooling.md` (or similar) that defines the exact MCP tool names and required env vars.

---

## 4) Outcome quality & rigor improvements (beyond bug fixes)

These aren't "bugs", but they materially improve investigative quality and reduce self-deception.

### 4.1 Make claim verification less line-based and more claim-record-based

Current verification (`verify-source-content.js`, `verify-claims.js`) extracts "claims" from markdown lines that happen to have `[SXXX]`. This is fragile:
- tables/list formatting produces weird "claims"
- citations in `sources.md` are not "claims"
- large chunks become untraceable

Recommendation:
- Treat `claims/C####.json` as the canonical claim list.
- Require each claim record to include:
  - `supporting_sources: [...]`
  - optionally `evidence_quotes` / `evidence_locator` (snippet + file reference)
- Verify summary.md by checking that each factual statement maps to a `C####` (or that every paragraph cites claims), instead of scraping random cited lines.

### 4.2 Implement circular reporting detection mechanically

Rules mention circular reporting, but there's no mechanical verifier for it.

Recommendation:
- Add a verifier that clusters sources by:
  - shared primary origin (AP/Reuters/court filing) and
  - cross-citation patterns / syndication markers
- Enforce corroboration independence on *origin*, not only domain.

### 4.3 Add deduplication for sources and IDs

The sample case contains duplicated URLs under different IDs. This weakens independence and can inflate "corroboration".

Recommendation:
- Add `verify-sources-dedup.js`:
  - fail if multiple `S###` map to same canonicalized URL unless explicitly allowed with a reason.

---

## 5) Repo hygiene & developer experience

### 5.1 Remove/rename the root file `nul`

The repo contains a file named `nul`, which breaks tooling on Windows (e.g., `rg` errors with "Incorrect function"). This directly impairs developer workflows.

Recommendation:
- Delete it (or rename to something non-reserved).

### 5.2 Fix license metadata mismatch

`README.md` says MIT but `package.json` says ISC.

Recommendation:
- Make them consistent and include a `LICENSE` file if MIT is intended.

### 5.3 Add a minimal test harness for verifiers

Because most logic is in scripts, regressions are easy.

Recommendation:
- Add fixture cases under `fixtures/` (not `cases/`) and snapshot expected verifier outputs.
- Add `npm test` that runs:
  - `node scripts/verify-citation-density.js fixtures/... --json`
  - `node scripts/verify-all-gates.js fixtures/... --json`
  - `node scripts/generate-gaps.js fixtures/... --json`

### 5.4 Cross-platform support

The `scripts/capture` wrapper is bash and uses `curl`, `shasum`, `stat`, which won't work in vanilla Windows environments.

Recommendation:
- Provide a Node wrapper (`node scripts/capture.js`) or a PowerShell equivalent, or explicitly document the requirement for WSL/Git Bash.
- `scripts/capture-evidence.js` generates PDFs by navigating to `file://...` paths; use a Windows-safe URL conversion (e.g., Node's `pathToFileURL`) to avoid `file://C:\...` breakage.

---

## 6) Suggested roadmap (pragmatic order)

### Phase 1 - correctness (make guarantees real)
1) Standardize schemas: `state.json`, `tasks/*.json`, `claims/*.json`, `captured sources` file(s)
2) Standardize evidence folder contract and update verifiers to match it
3) Fix gate logic bugs (task statuses, ledger parsing, verifier buffer handling)
4) Make `generate-gaps.js` produce blocking gaps that correspond to gate failures

### Phase 2 - rigor (make verification harder to game)
1) Unify citation-density enforcement (single threshold, single implementation)
2) Verify corroboration using true independence (origin-aware) + dedup
3) Make summary traceability explicit (paragraph->claim IDs or claim bundles)

### Phase 3 - usability
1) Case scaffolding + "active case" helper
2) Cross-platform capture wrapper
3) Minimal tests/fixtures to prevent regressions

---

## Appendix: Key entry points (Claude Code)

Commands:
- `.claude/commands/investigate.md` - orchestrator loop and bootstrap
- `.claude/commands/verify.md` - verification procedure
- `.claude/commands/capture-source.md` - capture agent procedure
- `.claude/commands/integrity.md` - integrity review procedure
- `.claude/commands/legal-review.md` - legal review procedure
- `.claude/commands/article.md` - article generation procedure

Prompt templates:
- `.claude/commands/prompts/*.md` - agent prompt scaffolds (research/extraction/task-gen/execution/adversarial/synthesis/rigor/deep-thinking)

Core scripts:
- `scripts/generate-gaps.js` - gap generation (needs to reflect real gate failures)
- `scripts/verify-all-gates.js` - termination gates (needs robustness fixes)
- `scripts/capture-url.js` / `scripts/firecrawl-capture.js` - evidence capture (needs a single evidence contract)
- `scripts/verify-source-content.js` / `scripts/verify-claims.js` - anti-hallucination verification
