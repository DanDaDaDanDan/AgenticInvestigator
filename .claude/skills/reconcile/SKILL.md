---
name: reconcile
description: Ensure lead investigation results are reflected in findings
context: fork
agent: general-purpose
user-invocable: false
argument-hint: [case-id]
---

# /reconcile - Reconcile Lead Results with Findings

Ensure lead investigation results are reflected in the findings.

## Usage

```
/reconcile              # Reconcile active case
/reconcile [case-id]    # Reconcile specific case
```

## Task

After leads are investigated, findings may contain claims that:
1. Were contradicted by lead investigation
2. Could not be verified despite attempts
3. Need caveats based on what was found

This command ensures findings reflect the actual evidence state.

---

## When to Run

Run AFTER the FOLLOW phase completes (all leads investigated) and BEFORE the CURIOSITY check.

```
QUESTION → FOLLOW → RECONCILE → CURIOSITY → ARTICLE
```

---

## Instructions

### Step 1: Load Context

Read:
- `findings/*.md` - All current findings (use `node scripts/findings.js list cases/<case-id>`)
- `leads.json` - All lead investigation results
- `sources.json` - Source capture status

### Step 1.5: Validate Lead Sources (BLOCKING)

**Before reconciling**, validate that lead results with specific claims have sources:

For each lead with status `investigated`:

1. **If result contains statistics/numbers:**
   - The `sources[]` array MUST be populated
   - Each source ID in `sources[]` must have `captured: true` in sources.json
   - The evidence content must actually contain the claimed statistic
   - **FAIL reconciliation if sources[] is empty for statistical claims**

2. **If result makes factual claims:**
   - At least one source should be referenced
   - Source must be captured (evidence/S###/ exists)
   - **WARN if factual claim has no source** (may proceed with caveat)

**Example of invalid lead result (DO NOT RECONCILE):**
```json
{
  "id": "L015",
  "status": "investigated",
  "result": "Found 3,000 agents deployed with $2.5M equipment budget",
  "sources": []  // INVALID - specific numbers without sources
}
```

**Example of valid lead result:**
```json
{
  "id": "L015",
  "status": "investigated",
  "result": "Found 3,000 agents deployed with $2.5M equipment budget",
  "sources": ["S045", "S046"]  // VALID - sources provided
}
```

If invalid leads are found, return them for follow-up investigation before reconciliation.

### Step 2: Identify Contradictions

For each lead with status `investigated` or `dead_end`:

**Check if lead result contradicts any finding:**

```
Lead L016: "Verify claim about organization's funding"
Result: "Organization not found in relevant registry"
Status: dead_end

Finding F003 claims: "Organization received substantial initial funding"

→ CONTRADICTION: Finding states organization as fact, lead couldn't verify
```

**Check if verification leads failed:**

```
Lead L037: "Verify specific dollar amount in finding"
Result: "Could not find primary source for this figure"
Status: dead_end

Finding F005 claims: "Significant investment amount"

→ UNSOURCED: Claim needs caveat or removal
```

### Step 3: Categorize Issues

For each issue found:

**Category A: Direct Contradiction**
- Lead found evidence that claim is false
- Action: Remove claim or replace with correct information

**Category B: Unable to Verify**
- Lead tried but couldn't find supporting evidence
- Action: Add caveat: "According to initial research..." or "Unverified reports suggest..."

**Category C: Partial Verification**
- Lead found related but different information
- Action: Update claim to reflect what was actually found

**Category D: Additional Context**
- Lead found information that adds nuance
- Action: Expand claim with additional context

### Step 4: Update Findings

**Writing style:**
- Write updates as **standalone facts**, not corrections
- NEVER use: "CORRECTION:", "UPDATE:", "REVISION:", "Initial finding was wrong"
- Simply replace incorrect information with correct information

**Citation requirements when updating findings:**
- Every claim MUST have a citation [S###]
- The citation MUST actually support the claim (no citation laundering)
- If adding a statistic, verify the exact number appears in the cited source
- If no source supports a claim, add explicit caveats ("unverified reports suggest...")

**Finding status updates:**
- `sourced` - Evidence supports the finding
- `draft` - Still being developed
- `stale` - Evidence no longer supports; needs update or removal

For each issue, update the relevant finding file (`findings/F###.md`):

**Example A (Direct Contradiction):**

Update finding with corrected information and change status if needed.

**Example B (Unable to Verify):**

Add caveat language: "estimated", "according to industry reports", "unverified"

**Example C (Partial Verification):**

Correct the claim to match what the source actually says.

### Step 5: Document Changes

Write to `reconciliation-log.md`:

```markdown
# Reconciliation Log

**Date:** [date]
**Phase:** Post-FOLLOW reconciliation

## Changes Made

### 1. Finding F003 - [Title]
- **Issue:** L016 result contradicted claim
- **Category:** Unable to Verify
- **Change:** Added caveat about verification status
- **Status:** Changed to stale / updated content

### 2. Finding F005 - [Title]
- **Issue:** L037 could not find primary source
- **Category:** Unable to Verify
- **Change:** Added "estimated" qualifier

## Unchanged Findings

Findings that are source-supported or don't require changes:
- F001 [S002, S005] - Source-supported
- F002 [S004, S008, S009] - Source-supported
```

### Step 6: Update state.json

```json
{
  "gates": {
    "reconciliation": true
  }
}
```

---

## Red Flags

**FAIL reconciliation if:**
- Dead_end lead for a finding claim, but claim unchanged
- Source cited but `captured: false` in sources.json
- Statistic in finding doesn't match captured source
- Verification lead pending (should have been caught by curiosity pre-check)

---

## Output

- Updated `findings/F###.md` files with caveats and corrections
- Updated finding statuses (sourced/draft/stale) in frontmatter
- New `reconciliation-log.md` documenting all changes
- Updated `state.json` with `gates.reconciliation: true`

---

## Next Step

After reconciliation, orchestrator invokes `/curiosity`.
