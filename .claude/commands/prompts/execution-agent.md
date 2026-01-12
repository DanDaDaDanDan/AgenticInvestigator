# Task Execution Agent Prompt Template

## Context

- **Case:** {{case_id}}
- **Task:** {{task_id}}
- **Case Directory:** {{case_dir}}

## Task

Execute investigation task {{task_id}}.

## Instructions

1. **Read task file:** `tasks/{{task_id}}.json`
   - Get question, approach, success_criteria
   - Note `gap_id` if present (for R### tasks)
   - Note `evidence_requirements` for corroboration rules
   - Note available sources from `sources.json`

2. **Update task status:**
   - Set `status: "in_progress"` in task file
   - Set `assigned_at: "ISO-8601"`

3. **Read relevant claims (for R### tasks):**
   If the task has a `gap_id` referencing a claim:
   - Read `claims/C####.json` to understand corroboration needs
   - Note current `supporting_sources` count
   - Note `corroboration.independence_rule`

4. **CAPTURE BEFORE CITE (MANDATORY - ENFORCED):**

   ⚠️ **ENFORCEMENT:** `ledger-append.js source_capture` will FAIL if:
   - `--path` argument is missing
   - Evidence directory does not exist
   - `metadata.json` is not present (proof of actual capture)

   For EVERY source you want to cite, you MUST:
   ```bash
   # 1. Assign a new source ID (check state.json for next_source_id)
   # 2. Run capture script (this creates evidence/web/S###/)
   node scripts/capture.js S### "URL" {{case_dir}}

   # 3. Verify capture succeeded - MUST see metadata.json
   ls {{case_dir}}/evidence/web/S###/
   # Expected: metadata.json, content.md (or .html/.pdf)

   # 4. Log capture - THIS WILL FAIL if evidence doesn't exist
   node scripts/ledger-append.js {{case_dir}} source_capture --source S### --url "URL" --path evidence/web/S###/
   ```

   **You CANNOT cite [S###] without completing ALL 4 steps above.**

   ❌ **DO NOT:**
   - Use MCP tools to research and then cite without capturing
   - Create sources.json entries without actual evidence
   - Write [S###] citations in findings before capture completes
   - Mark claims as "verified" before evidence is captured

5. **Investigate the task:**
   - Use sources from `sources.json`
   - Apply the approach specified in task file
   - Verify claims against evidence
   - Check independence rules when seeking corroboration:
     - `different_domain` - Sources must be from different website domains
     - `primary_plus_secondary` - Need one primary doc + one secondary source
     - `different_domain_or_primary` - Either different domains OR a primary source

6. **Update claim records:**
   After capturing corroborating sources, update the claim file:

   ```json
   // In claims/C####.json, add to supporting_sources:
   {
     "supporting_sources": ["S014", "S015", "S###"],  // Add new source ID
     "status": "verified"  // If corroboration requirements now met
   }
   ```

   Log the claim update:
   ```bash
   node scripts/ledger-append.js {{case_dir}} claim_update --claim C#### --sources S### --status verified
   ```

7. **Write findings:** `findings/{{task_id}}-findings.md`

   Format:
   ```markdown
   # {{task_id}} Findings

   **Question:** [Copy from task file]

   ## Summary
   [1-2 sentence answer to the question]

   ## Evidence Found
   - [Finding 1] [S###]
   - [Finding 2] [S###]

   ## Claims Updated
   - C####: Added S### (now has X/Y required sources)

   ## Gaps Remaining
   - [Any unresolved aspects]

   ## Sources Captured
   | ID | URL | Category |
   |----|-----|----------|
   | S### | ... | primary/secondary |
   ```

8. **PRE-COMPLETION VERIFICATION (MANDATORY):**

   Before marking task complete, you MUST run citation verification:
   ```bash
   # Verify ALL citations in your findings file have captured evidence
   node scripts/verify-citations.js {{case_dir}}
   ```

   **If verify-citations.js fails:**
   - DO NOT mark task complete
   - Capture missing evidence using steps in section 4
   - Re-run verify-citations.js until it passes

9. **Complete task:**
   - Update task file: `status: "completed"`, `completed_at`, `findings_file`, `sources_added`
   - Log completion:
   ```bash
   node scripts/ledger-append.js {{case_dir}} task_complete --task {{task_id}} --output findings/{{task_id}}-findings.md --sources S001,S002
   ```

## Critical Rules (ENFORCED)

- **NO citations without evidence** — `ledger-append.js` will REJECT source_capture without valid evidence path
- **VERIFY before complete** — `verify-citations.js` must pass before task completion
- **One findings file per task** — Write to `findings/{{task_id}}-findings.md`
- **Log everything** — Use ledger-append.js for captures, claims, and completion
- **Answer the question** — Tasks are question-shaped; findings must answer them
- **Update claims** — If task relates to a claim (R### tasks), update the claim file

### What Happens If You Skip Capture

If you try to:
1. **Log source without evidence:** `ledger-append.js source_capture` exits with error
2. **Complete task with uncaptured citations:** `verify-citations.js` fails, blocking completion
3. **Mark claim verified without sources:** Gap will reappear in next `generate-gaps.js` run

**The system enforces these rules. You cannot bypass them.**

## Evidence Requirements Check

Before marking task complete, verify evidence_requirements are met:

```json
"evidence_requirements": {
  "min_supporting_sources": 2,        // Must have >= 2 sources
  "independence_rule": "different_domain",  // Sources from different domains
  "allow_single_primary": true,       // Primary doc alone can suffice
  "requires_capture": true            // All sources must be captured
}
```

If requirements cannot be met, document what's missing in findings file.

## Output

- `findings/{{task_id}}-findings.md` with investigation results
- Updated `tasks/{{task_id}}.json` with status=completed
- Updated `claims/C####.json` if task addressed a claim gap
- All sources captured in `evidence/web/`
