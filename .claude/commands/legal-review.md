# Legal Risk Assessment (Orchestrator Mode)

You are the **orchestrator**. You dispatch legal analysis agents - you do NOT run analysis directly.

---

## Usage

```
/legal-review              # Review active case
/legal-review [case-id]    # Review specific case
```

Case resolution order:
1. Explicit `[case-id]`
2. `cases/.active` (set via `node scripts/active-case.js set <case-id>`)
3. Error with hint

---

## Core Legal Framework

The model knows defamation law. Key reminders:

| Subject Type | Standard | Burden |
|--------------|----------|--------|
| Public Official/Figure | Actual Malice | Knowledge of falsity OR reckless disregard |
| Private Figure | Negligence | Failure to exercise reasonable care |

### Evidence Tiers

| Tier | Strength | Examples |
|------|----------|----------|
| 1 STRONG | Publish confidently | Primary docs, on-record statements, court findings, official records |
| 2 MEDIUM | Publish with hedging | Two independent sources, expert analysis, pattern evidence |
| 3 WEAK | Needs more | Single source, anonymous only, unclear provenance |
| 4 INSUFFICIENT | Don't publish | Speculation, biased source without corroboration |

### High-Risk Claims

- Criminal conduct allegations (per se defamatory)
- Professional incompetence (per se defamatory)
- Sexual misconduct, financial fraud, mental health claims

---

## Folder Structure (Iteration Support)

```
cases/[case-id]/
+-- legal/
    +-- iteration-1/
    |   +-- subject-classifications.md
    |   +-- claim-risk.md
    |   +-- evidence-gaps.md
    |   +-- attribution-audit.md
    +-- iteration-2/
    |   +-- ...
    +-- legal-review.md     # Latest consolidated review
```

Each iteration creates a new folder. The consolidated `legal-review.md` is updated after each iteration.

---

## Orchestrator Flow

**Log legal review start:**
```bash
node scripts/ledger-append.js cases/[case-id] phase_start --phase LEGAL --iteration N
```

**1. Create iteration folder:**
```bash
mkdir -p cases/[case-id]/legal/iteration-N
```

**2. UPDATE TodoWrite with legal review tasks:**
```
Legal Review: Iteration N
+-- [ ] Subject classification (public/private figure)
+-- [ ] Claim risk assessment (claim-by-claim)
+-- [ ] Evidence gap analysis (what's missing)
+-- [ ] Attribution audit (proper hedging)
+-- [ ] Consolidate legal-review.md
```

**3. DISPATCH parallel agents (ONE message):**
- Agent 1 -> `legal/iteration-N/subject-classifications.md`
- Agent 2 -> `legal/iteration-N/claim-risk.md`
- Agent 3 -> `legal/iteration-N/evidence-gaps.md`
- Agent 4 -> `legal/iteration-N/attribution-audit.md`

**4. WAIT for completion, then consolidate:**
- Read all iteration files
- Write consolidated `legal/legal-review.md`
- Update Publication Readiness status

**5. Log completion:**
```bash
node scripts/ledger-append.js cases/[case-id] phase_complete --phase LEGAL --iteration N
```

Legal issues emit gaps (LEGAL_WORDING_RISK, PRIVACY_RISK) that drive task generation.

---

## Dispatch Agents (parallel, ONE message)

### Agent 1: Subject Classification

```
Task tool:
  subagent_type: "general-purpose"
  description: "Subject classification for legal"
  prompt: |
    TASK: Subject Classification (Public/Private Figure Analysis)
    CASE: cases/[case-id]/
    OUTPUT: legal/iteration-N/subject-classifications.md

    Read summary.md, people.md, sources.md.

    For each person mentioned:
    - Classify as Public Official, Limited Public Figure, or Private Figure
    - Document rationale for classification
    - Note applicable defamation standard (Actual Malice vs Negligence)

    Write detailed classification to OUTPUT file.

    RETURN: Classification counts by category
```

### Agent 2: Claim Risk Assessment

```
Task tool:
  subagent_type: "general-purpose"
  description: "Claim risk assessment"
  prompt: |
    TASK: Claim-by-Claim Defamation Risk Analysis
    CASE: cases/[case-id]/
    OUTPUT: legal/iteration-N/claim-risk.md

    Read claims/*.json, summary.md, fact-check.md.

    For each claim:
    - Assess risk level (HIGH/MEDIUM/LOW)
    - Identify if per se defamatory (criminal, professional, etc.)
    - Note current evidence tier (1-4)
    - Flag mitigation status

    Write detailed risk table to OUTPUT file.

    RETURN: Risk distribution (HIGH: X, MEDIUM: Y, LOW: Z)
```

### Agent 3: Evidence Gap Analysis

```
Task tool:
  subagent_type: "general-purpose"
  description: "Evidence gap analysis"
  prompt: |
    TASK: Evidence Gap Identification
    CASE: cases/[case-id]/
    OUTPUT: legal/iteration-N/evidence-gaps.md

    Read claims/*.json, sources.json, legal/previous iterations if exist.

    Identify evidence gaps:
    - Critical: Must address before publication
    - Important: Should address
    - Document specific actions needed

    Write detailed gap analysis to OUTPUT file.

    RETURN: Gap counts by severity
```

### Agent 4: Attribution Audit

```
Task tool:
  subagent_type: "general-purpose"
  description: "Attribution audit"
  prompt: |
    TASK: Attribution and Hedging Audit
    CASE: cases/[case-id]/
    OUTPUT: legal/iteration-N/attribution-audit.md

    Read summary.md, findings/*.md.

    Scan for claims requiring hedging:
    - Criminal allegations without "alleged"
    - Direct assertions without attribution
    - Opinion stated as fact

    Write detailed audit with suggested revisions to OUTPUT file.

    RETURN: Issues count, suggested fixes
```

---

## Pre-Publication Checklist

The model knows these standards. Verify:

**Legal**
- [ ] All subjects properly classified
- [ ] High-risk claims have Tier 1-2 evidence
- [ ] Hedging language applied where needed
- [ ] No claims based solely on anonymous sources
- [ ] Opinion clearly distinguished from fact

**Attribution**
- [ ] Critical claims attributed to third parties (not direct assertions)
- [ ] Subject's response/dispute acknowledged
- [ ] Advocacy source limitations disclosed
- [ ] No vague "linked to" / "associated with" language

**Framing**
- [ ] No "the reality is..." framing of contested claims
- [ ] Headlines don't state allegations as fact
- [ ] Contested claims presented as contested

---

## Output Format

```markdown
# Legal Risk Assessment: [Investigation Title]

**Case**: [case-id]
**Overall Risk**: [LOW | MEDIUM | HIGH | HIGHEST]

## Executive Summary
[2-3 paragraphs: claims assessed, risk profile, concerns, recommendation]

## Subject Classifications
| Subject | Classification | Rationale |
|---------|---------------|-----------|

## High-Risk Claims
| Claim | Subject | Risk | Issue | Recommendation |
|-------|---------|------|-------|----------------|

## Evidence Gaps
### Critical (must address)
### Important (should address)

## Required Hedging
| Original | Suggested Revision | Why |
|----------|-------------------|-----|

## Pre-Publication Checklist
[Checklist status]

## Final Recommendation
**Publication Readiness**: [READY | READY WITH CHANGES | NOT READY]
**Required Actions**: [list]

---
*This is AI-generated analysis, not legal advice.*
```
