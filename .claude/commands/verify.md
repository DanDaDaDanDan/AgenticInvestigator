# Investigation Verification (Orchestrator Mode)

You are the **orchestrator**. You dispatch verification agents - you do NOT run verification directly.

**See `framework/rules.md` for verification rules and termination signals.**

---

## Usage

```
/verify              # Verify active case
/verify [case-id]    # Verify specific case
```

Case resolution order:
1. Explicit `[case-id]`
2. `cases/.active` (set via `node scripts/active-case.js set <case-id>`)
3. Error with hint

---

## Purpose

Verification ensures investigations are:
1. **Complete** - All threads explored, all positions covered
2. **Honest** - Not deceiving ourselves about coverage
3. **Balanced** - Claims from ALL positions fact-checked
4. **Evidence-backed** - Claims verified against captured evidence

---

## Orchestrator Flow

**FIRST: Run gap generation**
```bash
node scripts/generate-gaps.js cases/[case-id]
```

For strict/summary-only output (recommended for orchestrators):
```bash
node scripts/orchestrator-verify.js cases/[case-id]
```

```
1. RUN: node scripts/generate-gaps.js -> control/gaps.json
2. READ: control/gaps.json (blocking vs non-blocking)
3. IF blocking gaps exist:
   -> DISPATCH: agents to address gaps
   -> Loop back to step 1
4. IF no blocking gaps:
   -> RUN: node scripts/verify-all-gates.js
   -> IF exit 0: PASS
   -> IF exit 1: address failing gates
5. REPORT: PASS/FAIL with blocking gap list
```

**Log verification:**
```bash
node scripts/ledger-append.js cases/[case-id] gate_check --gate verification --passed true/false
```

---

## Dispatch Agents (parallel, ONE message)

```
Task 1: Anti-hallucination check (verify claims exist in evidence)
Task 2: Cross-model critique (Gemini reviews summary)
Task 3: Position audit (all positions fact-checked?)
Task 4: Gap analysis (comprehensive checklist)
```

### Agent Prompt Template

```
Task tool:
  subagent_type: "general-purpose"
  description: "[Check type] verification"
  prompt: |
    TASK: [Check type]
    CASE: cases/[case-id]/

    Be RUTHLESS. Find ALL gaps.

    [For anti-hallucination]:
    Run: node scripts/verify-claims.js cases/[case-id]
    Check claims/C####.json for corroboration status
    CONTRADICTED -> urgent gap
    NOT_FOUND -> must fix
    Requires: GEMINI_API_KEY (via env or .env)

    [For cross-model critique]:
    Run your configured critique tool (see prompts/_tooling.md)
    Find: missing evidence, unexplored claims, bias, statement gaps

    [For position audit]:
    Compare found claims to fact-check.md
    Check all positions have claims verified

    [For gap analysis]:
    Read control/gaps.json
    Evaluate blocking vs non-blocking gaps

    RETURN: PASS/FAIL, blocking gap count
```

---

## Core Checklist

All must be YES for verification to pass:

1. All major people investigated
2. All major claims fact-checked (ALL positions)
3. All positions steelmanned
4. Alternative theories addressed with evidence
5. All sources have captured evidence
6. No CONTRADICTED claims

---

## Anti-Gaming Rules

- Do NOT give benefit of the doubt on gaps
- Do NOT mark PARTIAL as YES
- Do NOT skip cross-model critique
- Do NOT cherry-pick which claims to check
- Do NOT ignore alternative theories

If verification fails: Continue investigating. Address gaps. Re-verify.
