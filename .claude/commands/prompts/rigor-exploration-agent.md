# Rigor Exploration Agent Prompt Template

## Context

- **Case:** {{case_id}}
- **Iteration:** {{iteration}}
- **Case Directory:** {{case_dir}}

## Task

Run comprehensive 35-Framework rigor exploration using GPT-5.2 Pro Extended Thinking.

**This agent uses `mcp__mcp-openai__generate_text` with `reasoning_effort: xhigh`.**

**CRITICAL: This agent MUST perform exhaustive exploration, not checkbox completion.**

---

## Instructions

1. **Read investigation state:**
   - `summary.md` — Current findings summary
   - `claims/index.json` — All registered claims
   - `findings/*.md` — Task findings (for context)
   - `positions.md` — Documented stakeholder positions
   - `_sources.json` — Captured evidence registry

2. **Run 35-Framework Analysis:**

   **Read `_frameworks.md` for the complete framework definitions.**

   For EACH of the 35 frameworks, perform DEEP analysis:
   - Minimum 200 words per framework
   - Not a checklist — actual exploration
   - Document specific gaps and uncertainties
   - Generate R### tasks for anything that needs follow-up

3. **CRITICAL: Create task files for ALL gaps identified**

   **You MUST create actual files, not just write about them.**

   For EVERY gap identified:

   **Step 3a: Create the task file**
   ```
   Write to tasks/R###.json with this schema:
   {
     "id": "R001",
     "status": "pending",
     "priority": "HIGH",
     "type": "rigor",
     "framework": "follow_the_money",
     "question": "What financial relationships exist between X and Y?",
     "evidence_requirements": {
       "min_supporting_sources": 2,
       "independence_rule": "true_independent",
       "requires_capture": true
     },
     "approach": "Search for SEC filings, financial disclosures",
     "success_criteria": "Document all financial connections with evidence",
     "created_at": "ISO-8601"
   }
   ```

   **Step 3b: Log to ledger**
   ```
   node scripts/ledger-append.js {{case_dir}} task_create --task R001 --priority HIGH --perspective Rigor
   ```

   **Step 3c: Then reference in checkpoint**
   ```
   **Tasks Generated:** R001, R002  (files MUST exist)
   ```

4. **Verification before completing:**

   Before writing rigor-checkpoint.md, verify task files exist:
   ```
   ls {{case_dir}}/tasks/R*.json
   ```

---

## Model Configuration

Use `mcp__mcp-openai__generate_text` with:

| Mode | Model | Reasoning Effort |
|------|-------|------------------|
| Normal (default) | `gpt-5.2-pro` | `xhigh` |
| Fast (`--fast`) | `gpt-5.2` | `none` |

**The prompts and output requirements remain identical regardless of mode.**

---

## Mandatory Domain-Specific Source Requirements

**Before publication, verify these source types are present:**

| Topic Domain | Required Source Types |
|--------------|----------------------|
| Animal welfare | Veterinary journals, ethology studies, animal behavior research |
| Health/nutrition | Peer-reviewed medical journals, clinical trials, systematic reviews |
| Environmental | Ecological studies, environmental science journals, emissions data |
| Financial | SEC filings, audited financials, court documents |
| Technical/engineering | Technical specifications, engineering studies, failure analyses |
| Legal/regulatory | Statutes, regulations, court rulings, enforcement actions |

**If required source types are MISSING, that is a BLOCKER for publication.**

---

## Output Requirements

### findings/rigor-checkpoint.md

```markdown
# Rigor Checkpoint: [Case ID]

**Iteration:** N
**Date:** YYYY-MM-DD
**Analysis Type:** 35-Framework Deep Exploration

## Executive Summary
[3-5 paragraphs summarizing the rigor analysis results]

## Framework Analysis

### Part A: Core Investigation (1-20)

### 1. Follow the Money
[Detailed analysis - minimum 200 words]
**Gaps Identified:** [List specific gaps]
**Tasks Generated:** R001, R002

[Continue for all 20 core frameworks...]

### Part B: Domain Expertise (21-25)

### 21. First Principles / Scientific Reality
[What does science actually say? Peer-reviewed sources required]
**Scientific Sources Consulted:** [List journals/studies]
**Tasks Generated:** R###

[Continue for frameworks 22-25...]

### Part C: Analytical Rigor (26-30)

### 26. Quantification & Base Rates
[Are claims properly quantified with context?]
**Tasks Generated:** R###

[Continue for frameworks 27-30...]

### Part D: Structural Analysis (31-35)

### 31. Information Asymmetry
[Who knows what others don't?]
**Tasks Generated:** R###

[Continue for frameworks 32-35...]

## Investigation Gaps Summary

### Critical (blocks publication)
| Gap | Framework | Required Action | Task ID |
|-----|-----------|-----------------|---------|

### Important (should address)
| Gap | Framework | Required Action | Task ID |
|-----|-----------|-----------------|---------|

### Minor (nice to have)
| Gap | Framework | Suggestion | Task ID |
|-----|-----------|------------|---------|

## Framework Checklist

[Use checklist template from _frameworks.md]

**Frameworks Completed:** X/35

## Domain-Specific Source Audit

| Required Source Type | Present? | Sources |
|---------------------|----------|---------|
| Peer-reviewed journals | YES/NO | [List] |
| Domain expert sources | YES/NO | [List] |
| Primary documents | YES/NO | [List] |

**BLOCKER if required domain sources are missing.**

## Publication Status

Based on rigorous 35-framework analysis:

**Status:** [READY | READY WITH CAVEATS | NOT READY]

**Blocking Issues:** [List if any]
**Recommended Actions:** [List]
```

---

## Rigor Self-Audit Checklist

Before completing, verify:

**Process Rigor:**
- [ ] All 35 frameworks analyzed (not just checked)
- [ ] Each framework has minimum 200 words of analysis
- [ ] Gaps are specific, not vague
- [ ] Tasks are question-shaped, not topic-shaped
- [ ] Counterfactual evidence was sought
- [ ] Uncomfortable questions were asked
- [ ] Alternative explanations were considered
- [ ] Assumptions were explicitly documented

**Domain Expertise (21-25):**
- [ ] First principles scientific analysis completed
- [ ] Peer-reviewed academic sources consulted
- [ ] Domain expert perspective explicitly considered
- [ ] Marketing claims tested against scientific evidence
- [ ] Subject experience/ground truth verified
- [ ] Contrarian expert opinions sought

**Analytical Rigor (26-30):**
- [ ] Claims quantified with base rates and denominators
- [ ] Causation vs correlation distinguished
- [ ] Key terms defined, definitional manipulation identified
- [ ] Evidence methodology audited for limitations
- [ ] Incentive structures mapped

**Structural Analysis (31-35):**
- [ ] Information asymmetries identified
- [ ] Comparative benchmarking performed
- [ ] Regulatory/institutional capture checked
- [ ] Data provenance traced to primary sources
- [ ] Causal mechanisms explicitly traced

**Final Check:**
- [ ] Would a domain expert find obvious gaps?
- [ ] Have we challenged feel-good narratives with evidence?
- [ ] Are all quantitative claims properly contextualized?
- [ ] Have we traced all claims to primary sources?
- [ ] All R### task files actually exist on disk

---

## Bad vs Good Analysis Examples

**BAD (checkbox mentality):**
```
### 1. Follow the Money
Checked financial aspects. No issues found.
```

**GOOD (deep exploration):**
```
### 1. Follow the Money
We have documented that Company X received funding from Investor Y, but we have NOT verified:
- The exact amount (sources conflict: $5M vs $10M)
- The timing relative to the regulatory decision
- Whether there were other undisclosed investors
- What Company X's financial state was before investment

The SEC filings we captured (S023, S024) are annual reports, but we need quarterly reports from Q2 2024 to establish precise timing. We also haven't searched state-level corporate filings which might reveal additional investors.

CRITICAL GAP: No primary documentation of the alleged $5M payment exists in our evidence. This is cited in news reports but traces back to a single anonymous source.

**Gaps Identified:**
1. Quarterly SEC filings for Q2 2024
2. State corporate filings for LLC structure
3. Primary documentation of $5M figure

**Tasks Generated:** R001 (quarterly filings), R002 (state filings)
```

---

## Return Value

After completing analysis, return:

```
RIGOR CHECKPOINT COMPLETE

Frameworks Analyzed: 35/35
Gaps Identified: [number]
Tasks Generated: [list of R### IDs]
Publication Status: [READY|NOT READY]
Blocking Issues: [count]

Output written to: findings/rigor-checkpoint.md
```
