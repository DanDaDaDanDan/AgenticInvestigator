# Investigation Verification (Orchestrator Mode)

You are the **orchestrator**. You perform verification in two phases:
1. **Structural verification** - Run scripts for deterministic checks
2. **Semantic verification** - Use Gemini 3 Pro via MCP for judgment-based checks

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

## Two-Phase Verification Architecture

### Phase 1: Structural Verification (Scripts)

Run deterministic checks via scripts:

```bash
# Run all structural gates
node scripts/verify-all-gates.js cases/[case-id]

# Or run gap generation for detailed report
node scripts/generate-gaps.js cases/[case-id]
```

Structural checks include:
- File existence (summary.md, legal-review.md, etc.)
- Citation presence (does summary have [SXXX] references?)
- Evidence folder existence for cited sources
- Task completion status
- Legal review status (READY vs NOT READY)

### Phase 2: Semantic Verification (Gemini 3 Pro MCP)

After structural checks pass, use Gemini 3 Pro for semantic verification:

```
mcp__mcp-gemini__generate_text
  model: "gemini-3-pro"
  prompt: [See semantic verification prompts below]
```

**Why Gemini 3 Pro?**
- Cross-model verification prevents Claude's blind spots from self-validating
- LLM understands context (e.g., "SSN: [REDACTED]" is not a PII leak)
- Judgment-based checks (legal risk, factual claims) require understanding, not regex

---

## Semantic Verification Criteria

When calling Gemini 3 Pro, verify the following:

### 1. Citation Coverage Check

Ask Gemini to verify that every factual claim has a citation:

> Analyze this summary for citation coverage. A factual claim is any statement about:
> - Specific dates, times, amounts, or statistics
> - Actions taken by people or organizations
> - Events that occurred
> - Quotes or statements attributed to someone
>
> For each factual claim, verify it has a [SXXX] citation.
> Report any factual claims without citations.

### 2. Legal Risk Assessment

Ask Gemini to identify legal risks:

> Review this text for potential legal risks:
> - Statements of criminal conduct without "alleged" or attribution
> - Defamatory claims stated as fact rather than attributed
> - Per se defamatory content (criminal accusations, professional incompetence)
> - Opinion presented as fact
>
> For each risk found, identify the specific text and suggest hedging language.

### 3. PII Detection

Ask Gemini to find PII with context understanding:

> Scan this text for unprotected personally identifiable information:
> - Social Security Numbers (not if redacted)
> - Phone numbers (if linked to private individuals)
> - Home addresses (if for private individuals)
> - Financial account numbers
>
> Note: Properly attributed business contacts and public records are acceptable.
> Report only genuinely sensitive PII that should be removed.

### 4. Balance and Fairness

Ask Gemini to assess journalistic balance:

> Evaluate this investigation for balance:
> - Are all major viewpoints represented?
> - Is scrutiny applied equally to all parties?
> - Are counterarguments and exculpatory evidence included?
> - Is language neutral (no loaded terms)?
>
> Report any imbalances that should be addressed.

---

## Orchestrator Flow

```
1. RUN: node scripts/generate-gaps.js cases/[case-id]
2. READ: control/gaps.json (check blocking gaps)
3. IF structural blocking gaps exist:
   -> DISPATCH: agents to address gaps
   -> Loop back to step 1
4. IF no structural blocking gaps:
   -> RUN: Gemini 3 Pro semantic verification via MCP
   -> Create gaps for any semantic issues found
5. IF semantic issues found:
   -> Add to control/gaps.json
   -> DISPATCH: agents to fix
   -> Loop back to step 1
6. IF all clear:
   -> RUN: node scripts/verify-all-gates.js
   -> REPORT: PASS/FAIL
```

**Log verification:**
```bash
node scripts/ledger-append.js cases/[case-id] gate_check --gate verification --passed true/false
```

---

## Gemini 3 Pro MCP Call Example

```
Use: mcp__mcp-gemini__generate_text

Parameters:
  model: "gemini-3-pro"
  thinking_level: "high"
  prompt: |
    You are a verification agent for an investigative report.

    ## Content to Verify
    [Insert summary.md content here]

    ## Verification Tasks
    1. CITATION COVERAGE: List any factual claims without [SXXX] citations
    2. LEGAL RISK: Identify statements that could be defamatory or libelous
    3. PII CHECK: Find any unprotected personal information
    4. BALANCE: Assess whether all viewpoints are fairly represented

    ## Output Format
    For each issue found:
    - Type: [CITATION_GAP | LEGAL_RISK | PII_RISK | BALANCE_ISSUE]
    - Location: [line or section]
    - Issue: [description]
    - Suggested Fix: [how to address]

    If no issues found for a category, state "PASS: [category]"
```

---

## Core Checklist

All must be YES for verification to pass:

**Structural (Scripts)**
- [ ] All required files exist
- [ ] Summary has citations (non-zero)
- [ ] All cited sources have evidence folders
- [ ] All HIGH priority tasks completed
- [ ] Legal review present and not "NOT READY"

**Semantic (Gemini 3 Pro)**
- [ ] Every factual claim has citation
- [ ] No unmitigated legal risks
- [ ] No unprotected PII
- [ ] Coverage is balanced and fair

---

## Anti-Gaming Rules

- Do NOT skip Gemini 3 Pro verification
- Do NOT give benefit of the doubt on semantic issues
- Do NOT mark PARTIAL as YES
- Do NOT cherry-pick which claims to check
- Do NOT ignore alternative theories
- If semantic verification fails: Fix issues. Re-verify.
