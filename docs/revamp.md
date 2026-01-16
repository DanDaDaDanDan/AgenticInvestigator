# Investigation System Revamp: Planning-First Architecture

**Date:** 2026-01-16
**Author:** Claude Opus 4.5
**Status:** PROPOSAL - Pending Review

---

## Executive Summary

This document analyzes four approaches to restructuring the AgenticInvestigator system from a prescriptive pipeline to a planning-first architecture. After detailed analysis, **Option D (Adaptive Phases with Task-List Execution)** is recommended as the best balance of flexibility, rigor, and implementation feasibility.

---

## Table of Contents

1. [Motivation: What We Want to Solve](#motivation-what-we-want-to-solve)
2. [Option A: Light Touch](#option-a-light-touch)
3. [Option B: Medium Touch](#option-b-medium-touch)
4. [Option C: Full Redesign](#option-c-full-redesign)
5. [Option D: Hybrid Adaptive Phases](#option-d-hybrid-adaptive-phases)
6. [Comparative Analysis](#comparative-analysis)
7. [Recommendation](#recommendation)
8. [Implementation Roadmap](#implementation-roadmap)

---

## Motivation: What We Want to Solve

### Current System Design

The current system follows a rigid assembly line:

```
BOOTSTRAP → RESEARCH → QUESTION (35 frameworks) → FOLLOW (all leads) →
RECONCILE → CURIOSITY → ARTICLE → VERIFY
```

### Problems Identified

#### 1. Blind Research Execution

**Problem:** `deep_research` runs immediately without understanding what we're looking for.

**Evidence:** AI case received synthesized claims about "Leading the Future" and "Public First" Super PACs that don't exist in FEC records. We spent effort citing and then trying to verify phantom entities.

**Root cause:** No strategic planning before research execution.

#### 2. Framework Bloat

**Problem:** All 35 frameworks applied to every investigation regardless of relevance.

**Evidence:** AI case applied frameworks like "First Principles Scientific Reality" (#21) and "Methodology Audit" (#29) to a political analysis topic where they add minimal value.

**Root cause:** One-size-fits-all design assumes all frameworks are equally relevant.

#### 3. Lead Explosion

**Problem:** Framework application generates excessive leads, many tangential to the core question.

**Evidence:** AI case generated 42 leads, with 28 (67%) still pending at "completion." Many were tangential (e.g., L020 "Survey anonymous AI worker sentiment platforms").

**Root cause:** No prioritization mechanism; all leads treated equally.

#### 4. Domain Agnosticism

**Problem:** System doesn't adapt tool selection or source prioritization to topic type.

**Evidence:** A financial investigation (SEC filings crucial) gets identical treatment to a political investigation (FEC/ballot data crucial) or scientific investigation (PubMed/OpenAlex crucial).

**Root cause:** No domain classification or tool mapping.

#### 5. Verification Failures

**Problem:** Synthesized claims from deep_research propagate through the system without verification.

**Evidence:** AI case summary contained:
- Uncaptured source S001 cited multiple times
- 72% statistic attributed to source containing 52%
- 10 lead results with specific statistics but no source captures

**Root cause:** Synthesis happens before source capture; verification is a late-stage gate rather than early requirement.

#### 6. Prescriptive Rigidity

**Problem:** Fixed phase sequence doesn't allow adaptation based on findings.

**Evidence:** The system can't say "this topic only needs 10 frameworks" or "this lead is more important than that one" or "we should verify this claim before building on it."

**Root cause:** Assembly-line architecture optimized for predictability over adaptability.

### What Success Looks Like

A revamped system should:

1. **Plan before executing** - Understand the topic before researching it
2. **Select relevant frameworks** - Apply 8-15 frameworks, not 35
3. **Prioritize leads** - Focus on high-value leads first
4. **Adapt to domain** - Use appropriate tools for the topic type
5. **Verify early** - Capture authoritative sources before synthesis
6. **Remain auditable** - Human-reviewable execution path
7. **Preserve rigor** - Maintain quality gates and verification

---

## Option A: Light Touch

### Description

Add a `/plan` command that runs before `/research`. The plan outputs a research strategy and task list, but the rest of the system remains unchanged.

### Architecture

```
/investigate [topic]
      │
      ▼
┌─────────────────┐
│ PLAN            │  NEW - Creates strategy
│                 │  Output: research_plan.md, task_list
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RESEARCH        │  UNCHANGED
└────────┬────────┘
         │
         ▼
    (rest of pipeline unchanged)
```

### Implementation

- Create `.claude/commands/plan.md`
- Modify `/investigate` to call `/action plan` first
- Store output in `research_plan.md`
- Orchestrator continues with existing phases

### Pros

| # | Pro | Explanation |
|---|-----|-------------|
| 1 | **Minimal code changes** | Only adds one new command |
| 2 | **Low risk** | Existing system unchanged; can't break what works |
| 3 | **Backwards compatible** | Old cases remain valid |
| 4 | **Optional** | Can skip /plan for simple investigations |
| 5 | **Quick to implement** | Days, not weeks |
| 6 | **Easy to test** | Can A/B test with and without planning |

### Cons

| # | Con | Explanation | Severity |
|---|-----|-------------|----------|
| 1 | **Doesn't address framework bloat** | Still runs all 35 frameworks | High |
| 2 | **Plan may be ignored** | Rigid phases don't adapt to plan output | High |
| 3 | **Task list disconnected** | Two orchestration mechanisms (phases + tasks) | Medium |
| 4 | **Deep_research-first persists** | Still synthesizes before verifying | High |
| 5 | **Lead explosion unchanged** | Still generates 40+ leads | Medium |
| 6 | **Minimal verification improvement** | Captures authoritative sources but doesn't prioritize | Medium |

### Risk Assessment

- **Implementation risk:** Low
- **Operational risk:** Low (existing system unchanged)
- **Benefit risk:** High (may not achieve goals)

### Verdict

**Too little change.** Adds planning but doesn't integrate it into execution. The plan becomes a document that's generated but not followed.

---

## Option B: Medium Touch

### Description

Make the task list the execution driver. Phases become task categories rather than a rigid sequence. Existing commands become tools for task completion.

### Architecture

```
/investigate [topic]
      │
      ▼
┌─────────────────┐
│ PLAN            │  Creates task list organized by category
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ EXECUTE (Task-List Driven)                          │
│                                                     │
│  Task List:                                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ Research Tasks:                              │   │
│  │   [x] FEC search for AI PACs                │   │
│  │   [x] Ballotpedia 2026 ballot measures      │   │
│  │   [ ] Deep research for candidate positions │   │
│  │                                              │   │
│  │ Framework Tasks:                             │   │
│  │   [ ] Apply framework 1 (Follow the Money)  │   │
│  │   [ ] Apply framework 7 (Stakeholder Map)   │   │
│  │                                              │   │
│  │ Lead Tasks:                                  │   │
│  │   [ ] Follow L001: Super PAC spending       │   │
│  │   [ ] Follow L002: CA ballot initiative     │   │
│  │                                              │   │
│  │ Verification Tasks:                          │   │
│  │   [ ] Verify all [S###] citations           │   │
│  │   [ ] Reconcile lead results with summary   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Orchestrator works through task list, using       │
│  existing /action commands as needed               │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ FINALIZE        │  Article, integrity, legal review
└─────────────────┘
```

### Implementation

- Rewrite `/investigate` orchestrator to be task-driven
- Modify all commands to report completion to task list
- Create task categories (Research, Framework, Lead, Verification)
- Phase boundaries become soft (categories) rather than hard (gates)
- Gates remain but operate on task categories

### Pros

| # | Pro | Explanation |
|---|-----|-------------|
| 1 | **Significant adaptability** | Execution order based on task priority |
| 2 | **Keeps existing commands** | /follow, /question, etc. still work |
| 3 | **Natural fit with TodoWrite** | Uses Claude's native task tracking |
| 4 | **Visible progress** | Task list shows exactly what's been done |
| 5 | **Flexible execution order** | Can interleave research and verification |
| 6 | **Reduces framework bloat** | Only selected frameworks become tasks |
| 7 | **Prioritized leads** | Leads can be ordered by importance |

### Cons

| # | Con | Explanation | Severity |
|---|-----|-------------|----------|
| 1 | **Complex orchestration** | Task-driven is harder than phase-driven | Medium |
| 2 | **Orchestrator redesign** | Significant rewrite of /investigate | High |
| 3 | **Migration unclear** | Existing cases may not transfer cleanly | Medium |
| 4 | **Infinite loop risk** | Without phase boundaries, execution may not terminate | High |
| 5 | **Harder "done" determination** | When is the task list complete? | Medium |
| 6 | **More agent judgment** | Risk of gaming/shortcuts increases | Medium |
| 7 | **Testing complexity** | Harder to verify correct behavior | Medium |

### Risk Assessment

- **Implementation risk:** Medium-High
- **Operational risk:** Medium (new orchestration logic)
- **Benefit risk:** Low (addresses most problems)

### Verdict

**Good direction, but risky execution.** The task-list-driven approach is sound, but removing phase boundaries creates new problems (termination, auditability, gaming).

---

## Option C: Full Redesign

### Description

Remove the phase concept entirely. Everything is a task on the task list. The agent generates tasks, executes tasks, and generates more tasks until verification tasks pass.

### Architecture

```
/investigate [topic]
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ PURE TASK EXECUTION                                          │
│                                                              │
│  Initial Tasks (generated by planning):                      │
│    - Understand topic                                        │
│    - Identify sources                                        │
│    - Research X, Y, Z                                        │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │   Execute task → Generate new tasks → Execute →     │◄───┤
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Verification tasks (always present):                        │
│    - All claims have captured sources?                       │
│    - All sources semantically verified?                      │
│    - Article complete and reviewed?                          │
│                                                              │
│  Termination: All verification tasks pass                    │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

- Remove phase concept from CLAUDE.md
- Remove phase tracking from state.json
- Make task list the only state
- Verification becomes tasks, not gates
- Frameworks are optional task generators (not required)
- Commands become pure task executors

### Pros

| # | Pro | Explanation |
|---|-----|-------------|
| 1 | **Maximum flexibility** | Any execution order possible |
| 2 | **True agentic behavior** | Agent decides what to do next |
| 3 | **Handles any investigation type** | No assumptions about structure |
| 4 | **No wasted effort** | Only relevant tasks executed |
| 5 | **Natural adaptation** | Findings drive next actions |
| 6 | **Matches human investigators** | How skilled researchers actually work |
| 7 | **Simplest mental model** | Just tasks, nothing else |

### Cons

| # | Con | Explanation | Severity |
|---|-----|-------------|----------|
| 1 | **High implementation effort** | Complete rewrite | Critical |
| 2 | **Breaks all existing cases** | No migration path | Critical |
| 3 | **Auditability loss** | No phases = harder to review | High |
| 4 | **Unbounded execution risk** | May never terminate | Critical |
| 5 | **Gaming vulnerability** | Agent can shortcut verification | High |
| 6 | **Unpredictable behavior** | Same topic may execute differently | Medium |
| 7 | **Debugging difficulty** | No clear execution phases to inspect | High |
| 8 | **Rigor loss** | May skip important checks without phases | High |
| 9 | **Quality variance** | Heavily depends on initial planning | High |

### Risk Assessment

- **Implementation risk:** Critical
- **Operational risk:** High (unpredictable behavior)
- **Benefit risk:** Medium (high ceiling but high variance)

### Verdict

**Too much change, too much risk.** While theoretically elegant, removing all structure creates more problems than it solves. The existing phase structure provides valuable guardrails.

---

## Option D: Hybrid Adaptive Phases

### Description

Keep phases for structure, but make them **adaptive** based on planning. The task list operates **within** phases, not as a replacement. This preserves the rigor of phases while enabling the flexibility of task-driven execution.

### Architecture

```
/investigate [topic]
      │
      ▼
┌─────────────────┐
│ PLAN            │  NEW PHASE
│                 │  - Classify domain (financial, political, scientific, etc.)
│                 │  - Identify authoritative sources for domain
│                 │  - Select relevant frameworks (subset of 35)
│                 │  - Prioritize research questions
│                 │  - Create initial task list
│                 │  - Output: research_plan.md
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RESEARCH        │  MODIFIED PHASE
│                 │  - Task list drives execution within phase
│                 │  - Authoritative sources FIRST (from plan)
│                 │  - Deep research SECOND (for gaps only)
│                 │  - Verify-as-you-go for key claims
│                 │  - Update task list dynamically
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ QUESTION        │  MODIFIED PHASE
│                 │  - Apply ONLY frameworks from plan (8-15, not 35)
│                 │  - Task list tracks framework completion
│                 │  - Generate focused, prioritized leads
│                 │  - Skip not-applicable frameworks
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ FOLLOW          │  MODIFIED PHASE
│                 │  - Leads prioritized by plan
│                 │  - HIGH priority leads first
│                 │  - Task list tracks lead completion
│                 │  - Can add leads dynamically (bounded by max_depth)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RECONCILE       │  EXISTING PHASE (unchanged)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CURIOSITY       │  MODIFIED PHASE
│                 │  - Checks against PLAN, not generic completeness
│                 │  - "Did we answer the plan's key questions?"
│                 │  - "Did we check the plan's authoritative sources?"
└────────┬────────┘
         │
         ▼
    (ARTICLE → VERIFY - existing phases)
```

### Key Design Decisions

#### 1. Domain Classification

The PLAN phase classifies the investigation into a domain taxonomy:

```
Domains:
├── Financial
│   ├── Corporate (SEC EDGAR, earnings, 10-K)
│   ├── Campaign Finance (FEC, OpenSecrets)
│   └── Economic (FRED, BLS)
├── Political
│   ├── Elections (Ballotpedia, state SOS)
│   ├── Legislation (Congress.gov, LegiScan)
│   └── Lobbying (OpenSecrets, LDA)
├── Legal
│   ├── Court Cases (CourtListener, PACER)
│   ├── Regulatory (Federal Register)
│   └── Enforcement (DOJ, SEC)
├── Scientific
│   ├── Medical (PubMed, clinical trials)
│   ├── Academic (OpenAlex, Semantic Scholar)
│   └── Technical (patents, standards)
└── Social
    ├── Public Opinion (Pew, Gallup)
    ├── Demographics (Census)
    └── Media (GDELT, news archives)
```

Domain classification determines:
- Which MCP tools to prioritize
- Which frameworks are most relevant
- What counts as an "authoritative source"

#### 2. Framework Selection

Instead of running all 35 frameworks, PLAN selects 8-15 based on domain relevance:

| Domain | Highly Relevant Frameworks |
|--------|---------------------------|
| Financial | 1 (Money), 4 (Documents), 5 (Contradictions), 6 (Relationships), 26 (Quantification), 30 (Incentives) |
| Political | 1 (Money), 3 (Timeline), 7 (Stakeholders), 10 (Hypotheses), 12 (Patterns), 13 (Counterfactual) |
| Legal | 4 (Documents), 9 (Means/Motive), 27 (Causation), 28 (Definitions), 33 (Regulatory Capture) |
| Scientific | 21 (First Principles), 23 (Marketing vs Reality), 25 (Contrarian), 27 (Causation), 29 (Methodology) |

Non-selected frameworks are marked "not-applicable" rather than skipped entirely—they can still be invoked if findings warrant.

#### 3. Source Prioritization

The key insight: **authoritative sources before synthesis**.

```
Priority 1: Authoritative Sources (verifiable)
  - Government databases (FEC, SEC, Congress.gov)
  - Official records (court filings, ballot initiatives)
  - Peer-reviewed research (PubMed, OpenAlex)
  - Primary sources (interviews, statements, filings)

Priority 2: Reputable Analysis (trusted)
  - Major news organizations
  - Research institutions (Pew, Brookings)
  - Industry reports (with methodology)

Priority 3: Synthesis (use cautiously)
  - Deep research (for context, not facts)
  - AI summaries (for overview, not citations)
  - Aggregated reports (verify underlying sources)
```

The RESEARCH phase must capture Priority 1 sources **before** using Priority 3 synthesis.

#### 4. Task List Within Phases

The task list operates within the phase structure:

```markdown
## Current Phase: RESEARCH

### Phase Tasks
- [x] Search FEC.gov for AI-related PAC filings (Priority 1)
- [x] Search Ballotpedia for 2026 AI ballot measures (Priority 1)
- [x] Capture Pew AI polling data (Priority 1)
- [ ] Search OpenSecrets for tech lobbying (Priority 1)
- [ ] Deep research for political context (Priority 3)

### Phase Completion Criteria
- [ ] All Priority 1 sources captured
- [ ] At least 5 authoritative sources for core claims
- [ ] Key statistics have captured sources

### Phase Exit
When all Priority 1 tasks complete AND completion criteria met → advance to QUESTION
```

This gives flexibility within phases while maintaining phase boundaries.

#### 5. research_plan.md

The PLAN phase outputs a human-reviewable document:

```markdown
# Research Plan: [Topic]

## Investigation Question
[Clear statement of what we're trying to learn]

## Domain Classification
Primary: Political/Elections
Secondary: Campaign Finance, Public Opinion

## Authoritative Sources (Priority 1)
| Source | Why Authoritative | MCP Tool | Expected Data |
|--------|-------------------|----------|---------------|
| FEC.gov | Official campaign finance records | osint_search | PAC filings, donations |
| Ballotpedia | Comprehensive ballot measure database | osint_get | Initiative status |
| Pew Research | Rigorous polling methodology | osint_get | AI opinion data |
| Congress.gov | Official legislative records | osint_search | Bill status |

## Frameworks to Apply (12 of 35)
| # | Framework | Relevance to Topic |
|---|-----------|-------------------|
| 1 | Follow the Money | Core question involves political spending |
| 3 | Follow the Timeline | Policy evolution is key |
| 7 | Stakeholder Mapping | Multiple political actors |
| 10 | Competing Hypotheses | Multiple outcome scenarios |
| 13 | Counterfactual | "What if AI isn't an issue?" |
| 26 | Quantification | Need base rates for predictions |

NOT applying (with rationale):
- #21 First Principles Scientific: Not a scientific topic
- #29 Methodology Audit: No studies to audit
- #22 Domain Expert Blind Spots: No specific domain expertise needed

## Key Questions (Prioritized)
1. Is there measurable AI-related political spending? (verify via FEC)
2. Are there AI ballot initiatives likely to qualify? (verify via state data)
3. What's baseline voter sentiment on AI? (verify via polls)
4. What's the legislative activity level? (verify via Congress.gov)
5. What positions have candidates taken? (harder to verify)

## Initial Task List
[See task_list.md]

## Success Criteria
Investigation answers: "[Core question]"
Minimum evidence required:
- Verified political spending data
- Verified ballot initiative status
- Polling data with temporal context
- Legislative activity summary

## Risks and Mitigations
| Risk | Mitigation |
|------|------------|
| Phantom entities (like fake PACs) | Verify in authoritative source before citing |
| Outdated polling data | Always include temporal context |
| Synthesized statistics | Trace to primary source |
```

### Pros

| # | Pro | Explanation |
|---|-----|-------------|
| 1 | **Preserves phase structure** | Predictable, auditable execution path |
| 2 | **Adds meaningful planning** | Strategy before execution |
| 3 | **Task list within phases** | Flexibility without chaos |
| 4 | **Framework selection** | 8-15 relevant frameworks, not 35 |
| 5 | **Source prioritization** | Authoritative sources before synthesis |
| 6 | **Domain adaptation** | Tool selection matches topic type |
| 7 | **Existing infrastructure preserved** | Commands, gates, verification still work |
| 8 | **Human-reviewable plan** | research_plan.md can be inspected |
| 9 | **Verification improvement** | Verify-early prevents phantom claims |
| 10 | **Bounded execution** | Phases provide termination guarantees |
| 11 | **Backwards compatible** | Can run old cases through new system |
| 12 | **Incremental implementation** | Can add planning without full rewrite |

### Cons

| # | Con | Explanation | Severity |
|---|-----|-------------|----------|
| 1 | **More complex than A** | Adds PLAN phase and modifies others | Medium |
| 2 | **Less flexible than C** | Still has phase boundaries | Low (feature, not bug) |
| 3 | **Plan quality matters** | Bad plan → bad investigation | Medium |
| 4 | **Framework selection is judgment** | May miss relevant framework | Medium |
| 5 | **Domain taxonomy needs maintenance** | New domains require updates | Low |
| 6 | **Orchestrator modifications** | Need to update /investigate | Medium |
| 7 | **Migration complexity** | Existing cases need plan retrofit | Medium |

### Risk Assessment

- **Implementation risk:** Medium
- **Operational risk:** Low-Medium (phases provide guardrails)
- **Benefit risk:** Low (addresses core problems while maintaining rigor)

### Verdict

**Best balance of flexibility and rigor.** Addresses the core problems (blind research, framework bloat, lead explosion, domain agnosticism) while preserving the valuable structure of phases and gates.

---

## Comparative Analysis

### Summary Table

| Aspect | Option A | Option B | Option C | Option D |
|--------|----------|----------|----------|----------|
| **Implementation Effort** | Low | High | Critical | Medium |
| **Risk Level** | Low | Medium | High | Medium |
| **Flexibility Gain** | Minimal | High | Maximum | Moderate-High |
| **Structure Preserved** | Full | Partial | None | Full |
| **Framework Bloat** | Unchanged | Reduced | Eliminated | Reduced |
| **Verification Improvement** | Minimal | Moderate | Depends | High |
| **Auditability** | Full | Reduced | Poor | Full |
| **Backwards Compatible** | Yes | Partial | No | Yes |
| **Addresses Core Problems** | 1 of 6 | 4 of 6 | 5 of 6 | 6 of 6 |

### Problem-Solution Matrix

| Problem | A | B | C | D |
|---------|---|---|---|---|
| Blind research | ⚠️ Plan created but not enforced | ✅ Task-driven | ✅ Task-driven | ✅ Authoritative sources first |
| Framework bloat | ❌ All 35 still run | ✅ Selective | ✅ Optional | ✅ Plan selects subset |
| Lead explosion | ❌ Unchanged | ⚠️ Prioritized but still many | ✅ Only needed leads | ✅ Prioritized, bounded |
| Domain agnosticism | ⚠️ Plan identifies but doesn't use | ✅ Tool selection adapts | ✅ Full adaptation | ✅ Domain-driven tools |
| Verification failures | ⚠️ Minimal improvement | ⚠️ Better but risks remain | ⚠️ Depends on tasks | ✅ Verify-early, prioritized sources |
| Prescriptive rigidity | ❌ Phases unchanged | ✅ Tasks replace phases | ✅ No phases | ⚠️ Phases adaptive but present |

Legend: ✅ Solved | ⚠️ Partially addressed | ❌ Not addressed

### Risk-Benefit Quadrant

```
                    HIGH BENEFIT
                         │
              Option C   │   Option D
            (high risk,  │  (moderate risk,
             high reward)│   high reward)
                         │
   LOW RISK ─────────────┼───────────────── HIGH RISK
                         │
              Option A   │   Option B
            (low risk,   │  (moderate risk,
             low reward) │   moderate reward)
                         │
                    LOW BENEFIT
```

**Optimal position:** Upper-left quadrant (high benefit, low risk)
**Option D** is closest to optimal.

---

## Recommendation

### Primary Recommendation: Option D

**Implement Adaptive Phases with Task-List Execution.**

#### Rationale

1. **Addresses all six core problems** while preserving valuable existing infrastructure
2. **Maintains phase structure** for predictability and auditability
3. **Adds meaningful planning** that actually affects execution
4. **Enables framework selection** to reduce bloat
5. **Prioritizes authoritative sources** to prevent verification failures
6. **Task list provides flexibility** within phase boundaries
7. **Human-reviewable plan** enables oversight
8. **Incremental implementation** reduces risk

#### Key Principles

1. **Plan before executing** - PLAN phase is mandatory
2. **Verify before synthesizing** - Priority 1 sources before deep_research
3. **Select, don't skip** - Choose relevant frameworks, don't abandon rigor
4. **Adapt within structure** - Task list flexibility within phase boundaries
5. **Preserve infrastructure** - Commands, gates, verification remain valuable

### Alternative Recommendation

If Option D proves too complex to implement:

**Fall back to Option A with modifications:**
- Add /plan command
- Make framework selection part of plan (even if system still runs all 35)
- Add source prioritization guidance to /research
- Add plan-awareness to /curiosity

This provides 60% of the benefit with 20% of the effort.

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

1. **Create domain taxonomy** (`reference/domains.md`)
   - Define domain categories and subcategories
   - Map MCP tools to domains
   - Map frameworks to domains

2. **Create /plan command** (`.claude/commands/plan.md`)
   - Domain classification logic
   - Framework selection algorithm
   - Task list generation
   - research_plan.md template

3. **Update state.json schema**
   - Add `plan` phase
   - Add `selected_frameworks` array
   - Add `domain` classification

### Phase 2: Research Modification (Week 2-3)

4. **Modify /research command**
   - Read research_plan.md
   - Execute Priority 1 sources first
   - Use deep_research only for gaps
   - Verify-as-you-go for key claims

5. **Create source prioritization logic**
   - Priority 1/2/3 classification
   - Enforce Priority 1 before Priority 3

### Phase 3: Framework Adaptation (Week 3-4)

6. **Modify /question command**
   - Read selected_frameworks from plan
   - Skip non-selected frameworks (mark not-applicable)
   - Generate focused leads

7. **Modify /follow command**
   - Read lead priorities from plan
   - Process HIGH priority first

### Phase 4: Curiosity Enhancement (Week 4)

8. **Modify /curiosity command**
   - Check against plan's success criteria
   - Verify plan's key questions answered
   - Verify authoritative sources captured

### Phase 5: Integration (Week 4-5)

9. **Update /investigate orchestrator**
   - Add PLAN phase to flow
   - Pass plan context through phases
   - Task list integration

10. **Update CLAUDE.md**
    - Document new workflow
    - Update gates for plan-awareness
    - Add domain taxonomy reference

### Phase 6: Validation (Week 5-6)

11. **Test with new investigation**
    - Run full investigation with new system
    - Compare to AI case metrics (lead count, framework relevance, verification success)

12. **Retrofit existing case (optional)**
    - Generate plan for AI case
    - Compare what plan would have recommended vs what actually happened

---

## Appendix: research_plan.md Template

```markdown
# Research Plan: [Topic]

**Generated:** [timestamp]
**Domain:** [primary domain] / [secondary domains]
**Estimated Complexity:** [low/medium/high]

---

## Investigation Question

[Clear, specific statement of what we're trying to learn]

---

## Domain Classification

**Primary Domain:** [e.g., Political/Elections]
**Secondary Domains:** [e.g., Campaign Finance, Public Opinion]
**Rationale:** [Why this classification]

---

## Authoritative Sources (Priority 1)

These sources MUST be captured before using synthesis/deep_research.

| Source | Type | MCP Tool | Expected Data | Verification Method |
|--------|------|----------|---------------|---------------------|
| [name] | [type] | [tool] | [what we expect] | [how to verify] |

---

## Framework Selection

### Selected Frameworks (N of 35)

| # | Framework | Relevance | Key Questions |
|---|-----------|-----------|---------------|
| [#] | [name] | [why relevant] | [specific questions for this topic] |

### Not Applicable Frameworks

| # | Framework | Reason |
|---|-----------|--------|
| [#] | [name] | [why not relevant] |

---

## Key Questions (Prioritized)

1. [Most important question] - Verify via: [source]
2. [Second question] - Verify via: [source]
...

---

## Task List

### Research Tasks (Priority 1)
- [ ] [task with specific source and expected outcome]

### Research Tasks (Priority 2)
- [ ] [task]

### Framework Tasks
- [ ] Apply framework [#]: [name]

### Verification Tasks
- [ ] Verify [claim] against [source]

---

## Success Criteria

Investigation is complete when:
- [ ] [criterion 1]
- [ ] [criterion 2]
- [ ] All Priority 1 sources captured
- [ ] Key questions answered with citations

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [risk] | [H/M/L] | [H/M/L] | [mitigation] |
```

---

*Document complete. Ready for review and implementation decision.*
