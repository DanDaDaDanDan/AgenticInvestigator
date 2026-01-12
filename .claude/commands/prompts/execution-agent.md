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

4. **CAPTURE BEFORE CITE (MANDATORY - CRYPTOGRAPHICALLY ENFORCED):**

   ╔════════════════════════════════════════════════════════════════════════════╗
   ║  ⚠️  ANTI-HALLUCINATION ENFORCEMENT                                        ║
   ║                                                                            ║
   ║  Evidence capture uses CRYPTOGRAPHIC SIGNATURES that LLMs CANNOT fake.    ║
   ║  The capture script generates `_capture_signature` based on file hashes,  ║
   ║  timestamps, and a secret salt. Any attempt to manually write evidence    ║
   ║  directories will be DETECTED and REJECTED.                               ║
   ╚════════════════════════════════════════════════════════════════════════════╝

   **ENFORCEMENT:** `ledger-append.js source_capture` will FAIL if:
   - `--path` argument is missing
   - Evidence directory does not exist
   - `metadata.json` is not present
   - **`_capture_signature` is missing or invalid (cryptographic check)**
   - **LLM-written fields detected (summary, key_facts, key_claims, etc.)**

   For EVERY source you want to cite, you MUST:
   ```bash
   # 1. Assign a new source ID (check state.json for next_source_id)
   # 2. Run capture script - THIS IS THE ONLY WAY TO CREATE VALID EVIDENCE
   node scripts/firecrawl-capture.js S### "URL" {{case_dir}}/evidence/web/S###

   # 3. Verify capture succeeded - MUST see metadata.json WITH signature
   ls {{case_dir}}/evidence/web/S###/
   # Expected: metadata.json (with _capture_signature), capture.html, capture.md, capture.png

   # 4. Log capture - THIS WILL REJECT HALLUCINATED EVIDENCE
   node scripts/ledger-append.js {{case_dir}} source_capture --source S### --url "URL" --path evidence/web/S###/
   ```

   **You CANNOT cite [S###] without completing ALL 4 steps above.**

   ❌ **ABSOLUTELY PROHIBITED (WILL BE DETECTED):**
   - **Creating evidence directories with Write tool** — No valid signature
   - **Writing metadata.json manually** — LLM fields detected, signature invalid
   - Use MCP tools to research and then cite without capturing
   - Create sources.json entries without actual evidence
   - Write [S###] citations in findings before capture completes
   - Mark claims as "verified" before evidence is captured

   ✅ **THE ONLY VALID APPROACH:**
   - Run `node scripts/firecrawl-capture.js` for EVERY URL you need as evidence
   - Wait for capture to complete
   - Verify metadata.json has `_capture_signature` field
   - Then and ONLY then cite the source

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

### What Happens If You Try to Bypass Capture

**THE SYSTEM CRYPTOGRAPHICALLY ENFORCES EVIDENCE INTEGRITY:**

| Bypass Attempt | Detection Method | Result |
|----------------|------------------|--------|
| Create evidence folder with Write tool | Missing `_capture_signature` | `ledger-append.js` REJECTS |
| Write metadata.json manually | Invalid signature + LLM field detection | `ledger-append.js` REJECTS |
| Copy/forge signature from another capture | Signature includes source_id, url, hashes | Cryptographic mismatch, REJECTED |
| Log source without evidence | Directory/file existence check | `ledger-append.js` exits with error |
| Complete task with uncaptured citations | verify-citations.js validation | Task completion BLOCKED |
| Mark claim verified without sources | generate-gaps.js detects | Gap reappears next iteration |

**Why You Cannot Fake Evidence:**
- `_capture_signature` = SHA256(version + source_id + url + captured_at + file_hashes + secret_salt)
- The salt is hardcoded in the capture script, not in prompts
- File hashes are computed from actual file content
- Any change to any field invalidates the signature

**The system enforces these rules cryptographically. There is no bypass.**

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
