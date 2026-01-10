# Synthesis Agent Prompt Template

## Context

- **Case:** {{case_id}}
- **Iteration:** {{iteration}}
- **Case Directory:** {{case_dir}}

## PREREQUISITE CHECK

**This agent should ONLY run after verify-all-gates.js exits 0.**

Before proceeding, confirm:
```bash
node scripts/verify-all-gates.js {{case_dir}}
# Must exit 0
```

If gates have not passed, DO NOT proceed with synthesis. Return to orchestrator with list of failing gates.

---

## Task

Synthesize all findings into a polished final report.

## Instructions

**EXCEPTION:** This agent reads ALL content files (unlike other agents).

1. **Read everything:**
   - `state.json`, `extraction.json`, `sources.json`
   - `control/gate_results.json` — Verify all gates passed
   - `claims/index.json` and all `claims/C####.json` files
   - All `tasks/*.json` files
   - All `findings/*.md` files
   - `legal/legal-review.md` — Legal clearance
   - Previous `summary.md` (if exists)
   - **`sources.md`** — Build source ID to fact mapping

2. **Verify claim corroboration:**
   - Every claim used in summary must have status: "verified"
   - Check `supporting_sources` arrays are populated
   - Confirm independence rules were met

3. **CRITICAL: Citation Enforcement**

   **EVERY factual statement MUST have `[SXXX]` citations.**

   Before writing ANY fact, ask: "Which source ID proves this?"

   | Statement Type | Citation Required |
   |----------------|-------------------|
   | Dates/times | YES - `"Released December 4 [S001]"` |
   | Names | YES - `"Ryan Camacho [S001]"` (first mention) |
   | Actions | YES - `"was arrested [S003]"` |
   | Quotes | YES - `"said 'X' [S002]"` |
   | Statistics | YES - `"24 arrests [S001] [S004]"` |
   | Events | YES - `"broke window with brick [S002]"` |
   | Background context | YES if specific |

   **Zero-citation paragraphs are FORBIDDEN.**

   When synthesizing, follow this process:
   ```
   For each fact:
     1. Find supporting source in findings/*.md or claims/*.json
     2. Get the [SXXX] ID from that source
     3. Write the fact with [SXXX] inline
     4. If no source exists → DO NOT include the fact
   ```

5. **Structure (with citation examples):**
   ```markdown
   # [Topic] Investigation Summary

   ## Executive Summary
   [1-2 paragraph overview with key citations]

   ## Key Findings
   - Finding 1: specific fact [S001] [S003]
   - Finding 2: another fact with date [S002]
   - Finding 3: quoted statement [S004]

   ## Background
   [Context with citations for every specific claim]
   Person X was employed at Company Y from 2006 [S005].
   The organization was founded in 1998 [S006].

   ## Key People
   | Person | Role | Key Facts |
   |--------|------|-----------|
   | Name A | Title | Fact [S001], Fact [S002] |
   | Name B | Title | Fact [S003] |

   ## Timeline
   | Date | Event | Source |
   |------|-------|--------|
   | Jan 3, 2026 | Event description | [S001] |
   | Dec 4, 2025 | Another event | [S002] [S003] |

   ## Positions & Analysis
   - Position A: [strongest version] [S004] [S005]
   - Position B: [strongest version] [S006]
   - Position C: [strongest version] [S007]

   ## Evidence Assessment
   - Well-supported: claim [S001] [S002]
   - Less certain: claim (single source [S003])

   ## Contradictions & Uncertainties
   - Contradiction: Source A says X [S001], Source B says Y [S002]
   - Unknown: [what we couldn't verify]

   ## Conclusions
   [Evidence-based conclusions with citations]

   ## Sources
   | ID | Description | Evidence |
   |----|-------------|----------|
   | S001 | Source title | evidence/web/S001/ |
   | S002 | Source title | evidence/web/S002/ |

   ---
   *Investigation ID: {{case_id}}*
   *Iterations: {{iteration}}*
   *Claims verified: X/Y*
   *Sources captured: Z*
   *Citation density: X%*
   ```

6. **Quality standards:**
   - Could you hand this to a journalist right now?
   - **EVERY claim has a citation** (verify before completing)
   - Every citation has captured evidence
   - No "Additionally found..." or "We also discovered..."
   - Smooth narrative flow
   - Hedged language where evidence is weak

7. **Citation format:**
   - Use `[S###]` for source citations
   - Include claim IDs for major assertions: `[C0042: verified by S014, S015]`
   - Link to evidence: `See evidence/web/S###/`

8. **POST-SYNTHESIS VERIFICATION (MANDATORY)**

   After writing summary.md, run:
   ```bash
   node scripts/verify-citation-density.js {{case_dir}}
   ```

   **If this fails, rewrite summary.md with proper citations.**

   The gate will reject any summary with:
   - Zero citations
   - Citation density below 100%
   - Uncited factual sections

9. **Log completion:**
   ```bash
   node scripts/ledger-append.js {{case_dir}} synthesis_complete --iteration {{iteration}} --output summary.md
   ```

## Output

- Complete rewrite of `summary.md` with **inline citations throughout**
- All claims cited with their verification status
- Updated `state.json` with new iteration
- Citation density 100%
