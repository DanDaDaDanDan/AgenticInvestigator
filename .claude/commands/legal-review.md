# Legal Risk Assessment (Orchestrator Mode)

You are the **orchestrator**. You dispatch legal analysis agents — you do NOT run analysis directly.

---

## Usage

```
/legal-review              # Review active case
/legal-review [case-id]    # Review specific case
```

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

## Orchestrator Flow

```
1. READ: _state.json
2. DISPATCH: Legal analysis agents (parallel)
3. WAIT: Agents write to legal-review.md
4. REPORT: Overall risk level
```

---

## Dispatch Agents (parallel, ONE message)

```
Task 1: Subject classification (public/private figure analysis)
Task 2: Claim risk assessment (claim-by-claim defamation risk)
Task 3: Evidence gap analysis (what's missing for each claim)
Task 4: Attribution audit (are claims properly attributed to sources)
```

### Agent Prompt Template

```
Task tool:
  subagent_type: "general-purpose"
  description: "[Analysis type] for legal review"
  prompt: |
    TASK: [Analysis type]
    CASE: cases/[case-id]/

    Read summary.md, fact-check.md, sources.md.

    Apply defamation law knowledge:
    - Classify subjects (public/private)
    - Assess claim types (criminal, professional, financial)
    - Rate evidence strength (Tier 1-4)
    - Check attribution (third-party vs direct assertion)

    Write to legal-review.md.

    RETURN: Risk distribution (HIGH/MEDIUM/LOW counts)
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
