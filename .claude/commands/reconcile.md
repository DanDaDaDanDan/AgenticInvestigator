# /reconcile - Reconcile Lead Results with Summary

Ensure lead investigation results are reflected in summary.md.

## Usage

```
/reconcile              # Reconcile active case
/reconcile [case-id]    # Reconcile specific case
```

## Task

After leads are investigated, summary.md may contain claims that:
1. Were contradicted by lead investigation
2. Could not be verified despite attempts
3. Need caveats based on what was found

This command ensures summary.md reflects the actual evidence state.

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
- `summary.md` - Current summary claims
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

**Check if lead result contradicts summary.md:**

```
Lead L016: "Pull FEC filings for Leading the Future and Public First Super PACs"
Result: "These specific PAC names do not exist in FEC records"
Status: dead_end

Summary.md claims: "Leading the Future Super PAC with initial war chest of over $100 million"

→ CONTRADICTION: Summary states PAC as fact, lead couldn't verify
```

**Check if verification leads failed:**

```
Lead L037: "Verify $380B AI infrastructure investment claim"
Result: "Could not find primary source for this figure"
Status: dead_end

Summary.md claims: "$380 billion in AI infrastructure in 2025"

→ UNVERIFIED: Claim needs caveat or removal
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

### Step 4: Update Summary.md

**Writing style:**
- Write updates as **standalone facts**, not corrections
- NEVER use: "CORRECTION:", "UPDATE:", "REVISION:", "Initial finding was wrong"
- Simply replace incorrect information with correct information
- Articles must be self-contained - readers shouldn't see editorial process

**Citation requirements when updating summary.md:**
- Every new claim added to summary.md MUST have a citation [S###]
- The citation MUST actually support the claim (no citation laundering)
- If adding a statistic, verify the exact number appears in the cited source
- If no source supports a claim, add explicit caveats ("unverified reports suggest...")

For each issue:

**Example A (Direct Contradiction):**

Before:
```markdown
"Leading the Future" Super PAC with initial war chest of **over $100 million**
```

After:
```markdown
Initial research referenced AI-focused Super PACs including "Leading the Future" and "Public First," but FEC records searches did not confirm these specific entities. Verified AI-related political spending flows through tech industry lobbying and broader PACs rather than dedicated AI Super PACs.
```

**Example B (Unable to Verify):**

Before:
```markdown
Corporations invested $380 billion in AI infrastructure in 2025
```

After:
```markdown
Corporations invested an estimated $380 billion in AI infrastructure in 2025 (figure from industry research; not independently verified against company filings)
```

**Example C (Partial Verification):**

Before:
```markdown
**72% of workers** are concerned about AI reducing jobs [S003]
```

After:
```markdown
**52% of Americans** feel more concerned than excited about increased AI use [S003], with job security being a significant component of that concern.
```

### Step 5: Document Changes

Write to `reconciliation-log.md`:

```markdown
# Reconciliation Log

**Date:** 2026-01-15
**Phase:** Post-FOLLOW reconciliation

## Changes Made

### 1. Super PAC Claims (Lines 53-58)
- **Issue:** L016 found PAC names don't exist in FEC records
- **Category:** Unable to Verify
- **Change:** Added caveat about verification status

### 2. $380B Investment Figure (Line 28)
- **Issue:** L037 could not find primary source
- **Category:** Unable to Verify
- **Change:** Added "estimated" and verification note

### 3. 72% Worker Concern (Line 30)
- **Issue:** S003 contains 52%, not 72%
- **Category:** Direct Contradiction
- **Change:** Corrected to match source

## Unchanged Claims

Claims that were verified or don't require changes:
- Lobbying figures [S002, S005] - Verified
- California ballot initiatives [S004, S008, S009] - Verified
- Federal legislation [S006, S007] - Verified
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
- Dead_end lead for a summary claim, but claim unchanged
- Source cited but `captured: false` in sources.json
- Statistic in summary doesn't match captured source
- Verification lead pending (should have been caught by curiosity pre-check)

---

## Output

- Updated `summary.md` with caveats and corrections
- New `reconciliation-log.md` documenting all changes
- Updated `state.json` with `gates.reconciliation: true`

---

## Next Step

After reconciliation, orchestrator invokes `/curiosity`.
