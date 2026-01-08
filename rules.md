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

| Rule | Details |
|------|---------|
| Capture immediately | When you find a source URL, capture it before moving on |
| Script usage | `./scripts/capture S001 https://example.com` |
| Document download | `./scripts/capture --document S015 https://sec.gov/filing.pdf` |
| Verify in evidence | Before citing, confirm claim exists in captured HTML/PDF |
| No source without evidence | Every `[SXXX]` must have files in `evidence/` |

---

## State Update Ownership

Only one agent updates each field to prevent race conditions:

| Field | Updated By |
|-------|------------|
| `current_phase` | Each agent sets at phase start |
| `current_iteration` | Synthesis Agent only |
| `gaps` | Verification Agent only |
| `verification_passed` | Verification Agent only |
| `last_verification` | Verification Agent only |
| `next_source_id` | Investigation Agent (read-increment-write atomically) |
| `*_count` fields | Synthesis Agent (computed from file counts) |

---

## File Ownership

| File | Written By |
|------|------------|
| `research-leads/*.md` | Research Agents |
| `_extraction.json` | Extraction Agent (overwrites each iteration) |
| `people.md`, `timeline.md`, `organizations.md` | Investigation Agents |
| `fact-check.md`, `statements.md`, `theories.md` | Investigation Agents |
| `positions.md` | Investigation Agents |
| `sources.md` | Investigation Agents (append new sources) |
| `summary.md` | Synthesis Agent (complete rewrite each time) |
| `iterations.md` | All agents (append checkpoints/logs) |
| `_state.json` | Per field ownership above |

---

## Verification Rules

**Run verification checkpoint:**
- After every 3-5 iterations
- When claiming "saturation" or "complete"
- When user says "wrap up"

**Core checklist (all must be YES):**
1. All major people investigated
2. All major claims fact-checked (from ALL positions)
3. All positions steelmanned
4. Alternative theories addressed with evidence
5. All sources have captured evidence
6. No contradicted claims in evidence check

**If verification fails:** Continue investigating. Address gaps. Re-verify.

---

## Termination Signals

**You ARE likely done when:**
- Same sources appear across all research engines
- New iterations yield <10% novel information
- Cross-model critique finds only minor/stylistic gaps
- Remaining gaps are genuinely unanswerable with public sources

**You are NOT done because:**
- You've completed many iterations
- It "feels" complete
- Most checklist items are green

**When uncertain:** Run one more verification. If it passes, you're done.

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
