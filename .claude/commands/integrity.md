# Journalistic Integrity Check (Orchestrator Mode)

You are the **orchestrator**. You dispatch integrity analysis agents - you do NOT run analysis directly.

---

## Usage

```
/integrity              # Review active case
/integrity [case-id]    # Review specific case
```

Case resolution order:
1. Explicit `[case-id]`
2. `cases/.active` (set via `node scripts/active-case.js set <case-id>`)
3. Error with hint

---

## Core Standards

The model knows journalism ethics (SPJ Code). Key checks:

| Standard | Definition | Red Flags |
|----------|------------|-----------|
| Balance | All significant viewpoints represented | One-sided sourcing |
| Fairness | Proportional coverage | Asymmetric scrutiny |
| Objectivity | Facts separated from opinion | Editorializing |
| Impartiality | No favoritism | Loaded language |

---

## Folder Structure (Iteration Support)

```
cases/[case-id]/
+-- integrity/
    +-- iteration-1/
    |   +-- balance-analysis.md
    |   +-- language-audit.md
    |   +-- adversarial-review.md
    |   +-- steelman-check.md
    |   +-- integrity-summary.md
    +-- iteration-2/
    |   +-- ...
    +-- integrity-review.md     # Latest consolidated review
```

Each iteration creates a new folder. The consolidated `integrity-review.md` is updated after each iteration.

---

## Orchestrator Flow

**Log integrity check start:**
```bash
node scripts/ledger-append.js cases/[case-id] phase_start --phase INTEGRITY --iteration N
```

**1. Create iteration folder:**
```bash
mkdir -p cases/[case-id]/integrity/iteration-N
```

**2. UPDATE TodoWrite with integrity tasks:**
```
Integrity Check: Iteration N
+-- [ ] Balance analysis (source distribution)
+-- [ ] Language audit (neutrality scan)
+-- [ ] Adversarial review (objection anticipation)
+-- [ ] Steelman check (strongest arguments)
+-- [ ] Consolidate integrity-review.md
```

**3. DISPATCH parallel agents (ONE message):**
- Agent 1 -> `integrity/iteration-N/balance-analysis.md`
- Agent 2 -> `integrity/iteration-N/language-audit.md`
- Agent 3 -> `integrity/iteration-N/adversarial-review.md`
- Agent 4 -> `integrity/iteration-N/steelman-check.md`

**4. WAIT for completion, then consolidate:**
- Read all iteration files
- Write consolidated `integrity/integrity-review.md`

**5. Log completion:**
```bash
node scripts/ledger-append.js cases/[case-id] phase_complete --phase INTEGRITY --iteration N
```

If issues found, they become gaps in next `generate-gaps.js` run.

---

## Dispatch Agents (parallel, ONE message)

### Agent 1: Balance Analysis

```
Task tool:
  subagent_type: "general-purpose"
  description: "Balance analysis for integrity"
  prompt: |
    TASK: Balance/Source Distribution Analysis
    CASE: cases/[case-id]/
    OUTPUT: integrity/iteration-N/balance-analysis.md

    Read summary.md, positions.md, sources.md.

    Analyze source distribution by position:
    - Count sources supporting each viewpoint
    - Calculate percentage distribution
    - Identify underrepresented perspectives

    Write detailed analysis to OUTPUT file.

    RETURN: Source distribution percentages, balance rating
```

### Agent 2: Language Audit

```
Task tool:
  subagent_type: "general-purpose"
  description: "Language neutrality audit"
  prompt: |
    TASK: Language Neutrality Scan
    CASE: cases/[case-id]/
    OUTPUT: integrity/iteration-N/language-audit.md

    Read summary.md and all findings/*.md files.

    Scan for loaded/biased language:
    - Pejorative terms
    - Unattributed characterizations
    - Opinion presented as fact
    - Asymmetric adjectives

    Write detailed audit with specific examples and suggested revisions.

    RETURN: Issue count, severity distribution
```

### Agent 3: Adversarial Review

```
Task tool:
  subagent_type: "general-purpose"
  description: "Adversarial objection review"
  prompt: |
    TASK: Anticipate Subject Objections
    CASE: cases/[case-id]/
    OUTPUT: integrity/iteration-N/adversarial-review.md

    Read summary.md, claims/*.json, legal/*.md.

    For each criticized party:
    - What would they object to?
    - What claims would they dispute?
    - What context would they add?
    - What legal arguments would they make?

    Write detailed objection analysis.

    RETURN: Objection count by subject, risk areas
```

### Agent 4: Steelman Check

```
Task tool:
  subagent_type: "general-purpose"
  description: "Steelman verification"
  prompt: |
    TASK: Steelmanning Verification
    CASE: cases/[case-id]/
    OUTPUT: integrity/iteration-N/steelman-check.md

    Read positions.md, summary.md.

    For each position identified:
    - Is the STRONGEST version presented?
    - Are counterarguments acknowledged?
    - Is exculpatory evidence included?

    Write detailed assessment with specific improvements needed.

    RETURN: Positions assessed, steelman score
```

---

## Output Format: Consolidated integrity-review.md

```markdown
# Journalistic Integrity Assessment: [Title]

**Case**: [case-id]
**Iteration**: N
**Date**: YYYY-MM-DD
**Overall Rating**: [EXEMPLARY | GOOD | ADEQUATE | NEEDS IMPROVEMENT | BIASED]

## Executive Summary
[2-3 paragraphs: Balance assessment, key concerns, strengths, improvements needed]

## Iteration History
| Iteration | Date | Rating | Key Issues | Resolution |
|-----------|------|--------|------------|------------|
| 1 | YYYY-MM-DD | Rating | Issues found | How addressed |
| 2 | YYYY-MM-DD | Rating | Remaining issues | Progress |

## Source Balance (from iteration-N/balance-analysis.md)
| Position | Sources | % | Assessment |
|----------|---------|---|------------|

**Balance Rating**: [EXEMPLARY | GOOD | ADEQUATE | POOR]

## Language Audit (from iteration-N/language-audit.md)
| Location | Original | Issue | Suggested Revision | Status |
|----------|----------|-------|-------------------|--------|

**Language Issues**: X found, Y resolved

## Scrutiny Symmetry
| Entity | Scrutiny Level | Evidence | Balance Assessment |
|--------|----------------|----------|-------------------|

## Steelmanning (from iteration-N/steelman-check.md)
| Position | Strongest Arguments Present? | Exculpatory Included? | Score |
|----------|------------------------------|----------------------|-------|

**Steelman Score**: X/10

## Required Corrections
### Must Fix (Blocking)
1. [Issue] - [Required action]

### Recommended (Non-blocking)
1. [Issue] - [Suggested action]

## Integrity Checklist
- [ ] All positions represented proportionally
- [ ] Language neutral throughout
- [ ] Scrutiny applied equally
- [ ] Facts separated from analysis
- [ ] Strongest version of each argument presented
- [ ] Exculpatory evidence included
- [ ] Subject responses sought/documented

## Final Assessment

**Publication Readiness (Integrity)**: [READY | READY WITH CHANGES | NOT READY]

**Blocking Issues**: X remaining
**Iteration Required**: [YES/NO]

---
*Integrity Review Iteration N completed: YYYY-MM-DD*
*Previous iterations: integrity/iteration-1/, integrity/iteration-2/, ...*
```
