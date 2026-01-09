# Investigation Verification (Orchestrator Mode)

You are the **orchestrator**. You dispatch verification agents — you do NOT run verification directly.

**See `framework/rules.md` for verification rules and termination signals.**

---

## Usage

```
/verify              # Verify active case
/verify [case-id]    # Verify specific case
```

---

## Purpose

Verification ensures investigations are:
1. **Complete** — All threads explored, all positions covered
2. **Honest** — Not deceiving ourselves about coverage
3. **Balanced** — Claims from ALL positions fact-checked
4. **Evidence-backed** — Claims verified against captured evidence

---

## Orchestrator Flow

```
1. READ: _state.json
2. DISPATCH: Verification agents (parallel)
3. WAIT: Agents write to iterations.md, update _state.json
4. READ: _state.json for verification_passed and gaps
5. REPORT: PASS/FAIL with gap list
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
    ITERATION: [N]

    Be RUTHLESS. Find ALL gaps.

    [For anti-hallucination]:
    Run: node scripts/verify-claims.js cases/[case-id]
    CONTRADICTED → urgent gap
    NOT_FOUND → must fix

    [For cross-model critique]:
    Run mcp__mcp-gemini__generate_text (thinking_level: high)
    Find: missing evidence, unexplored claims, bias, statement gaps

    [For position audit]:
    Compare found claims to fact-check.md
    Check all positions have claims verified

    [For gap analysis]:
    Evaluate core checklist (6 items from framework/rules.md)

    Update iterations.md, _state.json (gaps, verification_passed)

    RETURN: PASS/FAIL, issue count
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
