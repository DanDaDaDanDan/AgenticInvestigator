# AgenticInvestigator Architecture

Technical design documentation for the AgenticInvestigator multi-agent investigation framework.

---

## System Overview

AgenticInvestigator is an orchestrated multi-agent system that investigates contested narratives through:

1. **Triple deep research** across Gemini, OpenAI, and XAI engines
2. **Insatiable curiosity looping** until exhaustion
3. **Inner loops on all points** found in each iteration
4. **Built-in verification checkpoints**
5. **Cross-model critique** for validation
6. **All-sides fact-checking** (every position)
7. **Alternative theory handling** (investigate, don't ignore)
8. **Modular file output** with self-contained summary.md deliverable

### Core Principles

- **Insatiable curiosity**: Every finding triggers more questions
- **Loop until exhausted**: No artificial iteration limits
- **Verification checkpoints**: Periodic audits to catch gaps
- **Loop on all points**: Process everything, never cherry-pick
- **Triple deep research**: Gemini + OpenAI + XAI for triangulation
- **Cross-model validation**: Different AI models check each other
- **All-sides coverage**: Claims from ALL positions fact-checked
- **Alternative theory handling**: All theories addressed with verdicts
- **Source attribution is sacred**: Every claim traces to a source ID
- **Modular but self-contained**: summary.md stands alone with all sources embedded

---

## Looping Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           INVESTIGATION LOOP                                     │
│                                                                                  │
│  while not exhausted:                                                           │
│                                                                                  │
│    ┌──────────────────────────────────────────────────────────────────────────┐ │
│    │ PHASE 1: RESEARCH                                                         │ │
│    │   for each research_engine in [Gemini, OpenAI, XAI]:                     │ │
│    │     run_deep_research(engine, query)                                     │ │
│    │   for each finding in all_findings:                                      │ │
│    │     extract_claims()                                                     │ │
│    │     extract_people()                                                     │ │
│    │     extract_dates()                                                      │ │
│    │     extract_contradictions()                                             │ │
│    └──────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                             │
│    ┌──────────────────────────────────────────────────────────────────────────┐ │
│    │ PHASE 2: EXTRACTION                                                       │ │
│    │   categorize_claims_by_position()                                        │ │
│    │   flag_for_verification(partisan_claims)                                 │ │
│    │   flag_for_verification(reputation_claims)                               │ │
│    │   flag_for_verification(alternative_theories)                            │ │
│    └──────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                             │
│    ┌──────────────────────────────────────────────────────────────────────────┐ │
│    │ PHASE 3: INVESTIGATION                                                    │ │
│    │   for each person in people_found:        # ALL of them                  │ │
│    │     investigate_person(person)                                           │ │
│    │     collect_all_statements(person)        # Proactively seek statements  │ │
│    │     document_role_timeline(person)        # Track role changes over time │ │
│    │   for each claim in claims_found:         # ALL of them                  │ │
│    │     trace_provenance(claim)                                              │ │
│    │   for each date in dates_found:           # ALL of them                  │ │
│    │     verify_timeline(date)                                                │ │
│    │   for each contradiction in contradictions: # ALL of them                │ │
│    │     explore_contradiction(contradiction)                                 │ │
│    │   compare_statements_over_time()          # Same person, different dates │ │
│    │   compare_statements_across_venues()      # Public vs testimony vs intrnl│ │
│    └──────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                             │
│    ┌──────────────────────────────────────────────────────────────────────────┐ │
│    │ PHASE 4: VERIFICATION CHECKPOINT (periodic)                               │ │
│    │                                                                            │ │
│    │   cross_model_critique(summary_md)     # Gemini critiques Claude         │ │
│    │   search_unexplored_claims()           # From ALL positions              │ │
│    │   search_alternative_theories()                                          │ │
│    │   gaps = identify_gaps()                                                 │ │
│    │                                                                            │ │
│    │   if gaps.exist():                                                       │ │
│    │     CONTINUE = True                                                      │ │
│    │   else:                                                                   │ │
│    │     CONTINUE = False                                                     │ │
│    └──────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                             │
│    ┌──────────────────────────────────────────────────────────────────────────┐ │
│    │ PHASE 5: SYNTHESIS                                                        │ │
│    │   register_new_sources(sources_md)     # Add sources with unique IDs     │ │
│    │   update_detail_files()                # timeline, people, positions     │ │
│    │   update_summary_md()                  # Key findings + embedded sources │ │
│    │   log_iteration(iterations_md)         # Progress tracking               │ │
│    │   add_verification_results() if checkpoint_ran                           │ │
│    └──────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                             │
│    ┌──────────────────────────────────────────────────────────────────────────┐ │
│    │ TERMINATION CHECK                                                         │ │
│    │                                                                            │ │
│    │   ALL conditions must be TRUE:                                           │ │
│    │   ✓ no_unexplored_threads()              # All threads exhausted         │ │
│    │   ✓ all_positions_documented()           # Every side represented        │ │
│    │   ✓ alternative_theories_addressed()     # Theories have verdicts        │ │
│    │   ✓ all_major_claims_fact_checked()      # All sides verified            │ │
│    │   ✓ statement_histories_complete()       # Key persons have statements   │ │
│    │   ✓ statement_evolution_analyzed()       # Compared across time/venues   │ │
│    │   ✓ verification_checklist_passed()      # All checklist items TRUE      │ │
│    │                                                                            │ │
│    │   if ALL true: COMPLETE                                                  │ │
│    │   else: CONTINUE                                                         │ │
│    └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Verification Checkpoint System

### When Checkpoints Run

| Trigger | Condition |
|---------|-----------|
| Periodic | During investigation as needed |
| Saturation claim | When claiming "no more threads" |
| Completion claim | Before marking investigation COMPLETE |
| User request | When user says "wrap up" |

### Anti-Hallucination Check (Step 1 of Verification)

**CRITICAL**: Before cross-model critique, verify that every claim attributed to a source actually exists in the captured evidence.

```bash
node scripts/verify-claims.js cases/[topic-slug]
```

| Verdict | Meaning | Action Required |
|---------|---------|-----------------|
| VERIFIED | Claim found in evidence | None |
| NOT_FOUND | Claim NOT in evidence (hallucination risk) | Find evidence or revise claim |
| PARTIAL | Claim partially supported | Review and clarify |
| CONTRADICTED | Evidence says opposite | Urgent: fix the claim |
| NO_EVIDENCE | No captured evidence for source | Capture the source |

**Do NOT proceed with verification if CONTRADICTED claims exist.**

### Verification Checklist

```
All must be TRUE to complete:

# Evidence & Anti-Hallucination
□ All sources have captured evidence
□ Anti-hallucination check passed (no CONTRADICTED claims)
□ All NOT_FOUND claims addressed or removed

# Core Investigation
□ All people investigated
□ All claims categorized by position
□ Timeline complete
□ Source provenance traced
□ All positions documented
□ Alternative theories addressed
□ Cross-model critique passed
□ All major claims fact-checked (all sides)
□ No unexamined major claims

# Statement & Temporal Coverage
□ Key persons have statement history documented
□ Role timelines documented for key figures
□ Statement evolution analyzed (same person, different times)
□ Statement venue comparison done (public vs. testimony vs. internal)
□ All statement contradictions flagged and investigated
```

### Anti-Gaming Rules

| Do NOT | Why |
|--------|-----|
| Skip verification | Self-deception risk |
| Claim saturation early | Avoids thorough investigation |
| Cherry-pick claims | Biased coverage |
| Ignore alternative theories | They spread if not investigated |
| Assume only two sides | Real disputes have N parties |

---

## Question Generation System (/questions)

The `/questions` command generates investigative questions using **20 frameworks** organized into **6 categories**.

### Framework Categories

| Category | Frameworks | Purpose |
|----------|------------|---------|
| **Core Investigation** | 1. Money, 2. Silence, 3. Timeline, 4. Documents, 5. Contradictions, 6. Uncomfortable | Foundation of any investigation |
| **People & Networks** | 7. Stakeholder Mapping, 8. Network Analysis, 9. Means/Motive/Opportunity, 10. Relationships | Map the human landscape |
| **Hypothesis & Analysis** | 11. ACH (Competing Hypotheses), 12. Key Assumptions, 13. Patterns | Evaluate competing explanations |
| **Adversarial** | 14. Counterfactual, 15. Pre-Mortem, 16. Cognitive Bias Check | Stress test conclusions |
| **Context & Framing** | 17. Second-Order Effects, 18. Meta Questions, 19. Sense-Making | Understand significance |
| **Root Cause** | 20. 5 Whys | Drill to systemic causes |

### Stage-Based Framework Selection

```
EARLY INVESTIGATION (Gathering Facts)
└── Use: Core (1-6) + Stakeholder (7) + Relationships (10) + Sense-Making (19)
    = 8 frameworks

MID INVESTIGATION (Building Understanding)
└── Add: Network (8) + Means/Motive (9) + ACH (11) + Assumptions (12)
        + Patterns (13) + Meta (18) + 5 Whys (20)
    = 14 frameworks

LATE INVESTIGATION (Stress Testing)
└── Add: Counterfactual (14) + Pre-Mortem (15) + Bias Check (16)
        + Second-Order (17)
    = 18 frameworks (all but duplicates)

WHEN STUCK
└── Focus: Pre-Mortem (15) + Bias Check (16) + Uncomfortable (6)
```

### Parallel Question Generation

The command launches 6 parallel MCP calls:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    /questions PARALLEL EXECUTION                     │
│                                                                     │
│  Call 1: Core Investigation Questions (Gemini)                      │
│    → Money, Silence, Timeline, Documents, Contradictions            │
│                                                                     │
│  Call 2: Hypothesis & Analysis Questions (Gemini)                   │
│    → ACH, Key Assumptions, Patterns, Means/Motive/Opportunity       │
│                                                                     │
│  Call 3: Adversarial Questions (Gemini)                             │
│    → Counterfactual, Pre-Mortem, Cognitive Bias, Uncomfortable      │
│                                                                     │
│  Call 4: Context & Root Cause Questions (Gemini)                    │
│    → Second-Order Effects, Meta, Sense-Making, 5 Whys               │
│                                                                     │
│  Call 5: Real-Time Questions (XAI)                                  │
│    → What are people asking now? Unanswered questions?              │
│                                                                     │
│  Call 6: Pattern Research (OpenAI)                                  │
│    → Similar cases, precedents, historical patterns                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Financial Investigation System (/financial)

Specialized toolkit for following the money.

### Capabilities

| Capability | Purpose | Data Sources |
|------------|---------|--------------|
| **Corporate Structure Mapping** | Trace ownership chains | SEC EDGAR, OpenCorporates, State SOS |
| **Beneficial Ownership Tracing** | Find real owners behind shells | ICIJ Offshore Leaks, OpenOwnership |
| **Transaction Pattern Analysis** | Identify financial red flags | Court records, regulatory filings |
| **Money Flow Mapping** | Track source → destination | Bank records, wire transfers, contracts |
| **Political Money** | Campaign contributions, lobbying | FEC, OpenSecrets, lobbying disclosures |

### Red Flag Detection

```
CORPORATE RED FLAGS
├── Multiple layers of holding companies
├── Secrecy jurisdiction incorporation (BVI, Cayman, etc.)
├── Nominee directors with many directorships
├── Complex cross-ownership structures
└── Missing beneficial ownership information

TRANSACTION RED FLAGS
├── Related-party transactions not at arm's length
├── Round-trip or circular transactions
├── Payments just under reporting thresholds
├── Unusual consulting/management fees
└── Loans to related parties never repaid
```

### Parallel Financial Research

```
┌─────────────────────────────────────────────────────────────────────┐
│                    /financial PARALLEL EXECUTION                     │
│                                                                     │
│  Call 1: Corporate Structure (Gemini)                               │
│    → Ownership chains, subsidiaries, directors                      │
│                                                                     │
│  Call 2: SEC/Regulatory Filings (OpenAI)                           │
│    → 10-K, proxy statements, enforcement actions                    │
│                                                                     │
│  Call 3: Offshore/Shell Company Search (XAI)                        │
│    → Panama Papers, Paradise Papers, ICIJ leaks                     │
│                                                                     │
│  Call 4: Political Money (XAI)                                      │
│    → Campaign contributions, lobbying, government contracts         │
│                                                                     │
│  Call 5: Litigation & Enforcement (Gemini)                          │
│    → Lawsuits, bankruptcies, regulatory actions                     │
│                                                                     │
│  Call 6: Real-Time Financial News (XAI)                             │
│    → Recent investigations, accounting issues                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Legal Risk Assessment System (/legal-review)

Pre-publication defamation and commercial disparagement risk analysis.

### Subject Classification

| Type | Standard | Plaintiff Burden |
|------|----------|------------------|
| **Public Official** | Actual Malice | Must prove knowledge of falsity or reckless disregard |
| **Public Figure** | Actual Malice | Same - celebrities, prominent executives |
| **Limited Public Figure** | Actual Malice | Same - injected into specific controversy |
| **Private Figure** | Negligence | Only needs to prove lack of reasonable care |
| **Product/Brand** | Trade Libel | False statement + pecuniary harm + fault |

### Evidence Strength Tiers

```
TIER 1: STRONG (Publishable with confidence)
├── Primary source documents
├── On-record statements from direct participants
├── Court findings/judgments
├── Official government records
└── Multiple independent corroborating sources

TIER 2: MEDIUM (Publishable with hedging)
├── Two independent sources
├── Documents + human source corroboration
├── Expert analysis of primary documents
└── Pattern evidence

TIER 3: WEAK (Requires additional verification)
├── Single source only
├── Off-record/anonymous sources
├── Secondhand accounts
└── Circumstantial evidence

TIER 4: INSUFFICIENT (Do not publish)
├── Speculation without evidence
├── Sources with clear bias (uncorroborated)
├── Unverified tips
└── Claims contradicted by documents
```

### Risk Matrix

```
                        EVIDENCE STRENGTH
                    Strong   Medium   Weak
SUBJECT    Public     LOW     LOW    MEDIUM
TYPE       Limited    LOW    MEDIUM   HIGH
           Private  MEDIUM    HIGH   HIGHEST
```

### New Assessment Components (2026-01)

| Component | Purpose |
|-----------|---------|
| **Dispute Acknowledgment Audit** | Verify each allegation includes subject's dispute |
| **Advocacy Source Disclosure** | Ensure source limitations disclosed ("snapshot in time") |
| **Claim Specificity Audit** | Flag vague "linked to" language; require specifics |
| **Attribution Audit** | Verify criticism attributed to third parties |
| **Framing Analysis** | Flag "the reality is..." language presenting allegations as fact |
| **Commercial Disparagement Check** | Separate analysis for product/brand criticism |

### Output Components

| Component | Purpose |
|-----------|---------|
| **Subject Classifications** | Public/private determination for each person |
| **Claim-by-Claim Analysis** | Risk level, evidence tier, sources for each claim |
| **Dispute Acknowledgment Status** | Whether subjects' disputes are acknowledged |
| **Advocacy Source Disclosure Audit** | Whether source limitations are disclosed |
| **Claim Specificity Audit** | Vague language flagged with fixes |
| **Attribution Audit** | Direct assertions flagged for conversion |
| **Framing Analysis** | Problematic framing flagged with revisions |
| **Evidence Gaps** | What additional verification is needed |
| **Hedging Suggestions** | Alternative language to reduce risk |
| **Pre-Publication Checklist** | Expanded with 7 new categories |

### Key Principles (The Media Lawyer's Mindset)

```
1.  "Can we prove it's true?"              - Truth is the ultimate defense
2.  "Who is the subject?"                  - Public vs. private changes everything
3.  "What's our evidence?"                 - Documents > sources > inference
4.  "Did we acknowledge their dispute?"    - Subjects rarely agree; acknowledge it
5.  "Is criticism attributed?"             - Third-party attribution is your shield
6.  "How specific is our claim?"           - "Linked to" invites challenge
7.  "Are we framing allegations as fact?"  - "The reality is..." can be fatal
8.  "Did we disclose source limitations?"  - Transparency paradoxically protects
```

---

## Journalistic Integrity System (/integrity)

Automated neutrality and balance assessment for investigation findings.

### Assessment Categories

| Category | What It Evaluates |
|----------|-------------------|
| **Balance Audit** | Are all perspectives given fair representation? |
| **Framing Analysis** | Do word choices subtly favor one side? |
| **Source Diversity** | Are sources appropriately varied and credible? |
| **Omission Check** | Are key counterarguments or context missing? |
| **Emotional Language** | Is language neutral and professional? |
| **Attribution Standards** | Are claims properly attributed to sources? |

### Severity Ratings

```
CRITICAL  → Must fix before publication (clear bias, major omissions)
HIGH      → Should fix (significant framing issues, weak balance)
MEDIUM    → Consider fixing (subtle issues, minor gaps)
LOW       → Optional (stylistic suggestions)
```

### Output Format

```markdown
# Integrity Check: [Case ID]

## Executive Summary
Overall integrity score and key issues.

## Issues Found

### Issue 1: [Category] - [Severity]
- **Location**: [file:section or quote]
- **Problem**: [what's wrong]
- **Impact**: [how it affects neutrality]
- **Recommendation**: [specific fix]

## Issue Summary Table
| # | Category | Severity | Location | Status |
|---|----------|----------|----------|--------|

## Recommendations by Priority
1. Critical fixes
2. High priority
3. Medium priority
```

---

## Article Generation System (/article)

Transform investigation findings into publication-ready journalism.

### Article Types

| Type | Length | Purpose | Audience |
|------|--------|---------|----------|
| **Short Overview** | 400-800 words | Quick-read summary | Time-pressed readers |
| **Full Article** | 2,000-4,000 words | Complete investigation | In-depth readers |

### Article 1: Short Overview Structure

```
1. LEDE (1-2 sentences)
   └── Hook with most newsworthy finding

2. NUT GRAF (1-2 sentences)
   └── Why this matters, what's at stake

3. KEY FINDINGS (3-5 paragraphs)
   └── Essential facts in order of importance

4. CONTEXT (1-2 paragraphs)
   └── Background needed to understand story

5. BOTTOM LINE (1 paragraph)
   └── What readers should take away
```

### Article 2: Full Article Structure

```
1. HEADLINE + DECK
   └── Clear, accurate, compelling (no clickbait)

2. LEDE (1-2 paragraphs)
   └── Draw reader in with compelling aspect

3. NUT GRAF (1 paragraph)
   └── Thesis - why this story matters now

4. SUPPORTING EVIDENCE (multiple sections)
   └── Organized by theme, not chronology

5. COUNTERARGUMENTS/ALTERNATIVE VIEWS
   └── Present opposing perspectives fairly

6. CONTEXT AND BACKGROUND
   └── Historical and industry context

7. IMPLICATIONS
   └── What this means going forward

8. METHODOLOGY NOTE
   └── Brief explanation of investigation process
```

### Journalistic Standards

| Do | Don't |
|----|-------|
| "According to [source]..." | "It's obvious that..." |
| "The investigation found..." | "We discovered..." |
| "Critics argue..." / "Proponents say..." | "The truth is..." |
| "Records show..." | "Clearly..." |
| "Appears to show..." (unverified) | Absolute claims without evidence |
| Use specific attribution | Vague attribution ("sources say") |

### Generation Process

```
1. LOAD SOURCE MATERIAL
   ├── summary.md (PRIMARY - all content comes from here)
   ├── sources.md (for source verification)
   └── fact-check.md (for accuracy verification)

2. EXTRACT KEY ELEMENTS
   ├── Central finding/thesis
   ├── Key verified facts
   ├── Stakes (who affected, how)
   ├── Context (background needed)
   ├── Multiple perspectives
   ├── Limitations (unknowns, contested)
   └── All [SXXX] source citations

3. GENERATE ARTICLES (Gemini gemini-3-pro, thinking_level: high)
   ├── Article 1: Short Overview
   └── Article 2: Full Professional Article

4. QUALITY CHECK
   ├── No new facts beyond summary.md
   ├── All source citations [SXXX] preserved
   ├── Contested claims presented as contested
   ├── Multiple perspectives represented
   ├── No editorializing
   └── Appropriate hedging language
```

---

## Investigation Loop Finale

**After completing all research iterations, run these steps in order:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INVESTIGATION LOOP FINALE                         │
│                                                                     │
│  Step 1: /verify                                                    │
│    └── Verification checkpoint (completeness, all threads explored) │
│                                                                     │
│  Step 2: /integrity                                                 │
│    └── Journalistic integrity check (balance, neutrality, framing)  │
│                                                                     │
│  Step 3: Address integrity issues                                   │
│    └── Update case files based on integrity findings                │
│                                                                     │
│  Step 4: /legal-review                                              │
│    └── Pre-publication legal risk assessment (defamation, evidence) │
│                                                                     │
│  Step 5: Address legal issues                                       │
│    └── Update case files based on legal findings                    │
│                                                                     │
│  Step 6: Final publication decision                                 │
│    └── Review all assessments, decide publish/hold/revise           │
│                                                                     │
│  Step 7: /article                                                   │
│    └── Generate publication-ready articles (short + long-form)      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Finale Output Files

| Step | Command | Output File |
|------|---------|-------------|
| 1 | `/verify` | Updates `iterations.md` with verification checkpoint |
| 2 | `/integrity` | `integrity-check.md` |
| 3 | Manual | Updates to case files based on integrity findings |
| 4 | `/legal-review` | `legal-review.md` |
| 5 | Manual | Updates to case files based on legal findings |
| 7 | `/article` | `articles.md` |

---

## Agent Orchestration Model (Sub-Agent Architecture)

**CRITICAL DESIGN PRINCIPLE**: The main Claude Code instance ONLY orchestrates. All actual work is done by sub-agents via the Task tool. This prevents context bloat in the main loop and ensures all findings are persisted to files.

### The Orchestrator Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MAIN LOOP (Orchestrator Only)                        │
│                                                                              │
│  The orchestrator NEVER:                                                     │
│    ✗ Does direct research (no MCP calls except status checks)               │
│    ✗ Accumulates research content in conversation                           │
│    ✗ Writes large content to files directly                                 │
│    ✗ Reads and processes full research results                              │
│                                                                              │
│  The orchestrator ONLY:                                                      │
│    ✓ Reads state from files (brief headers, status fields)                  │
│    ✓ Decides which phase/step to execute next                               │
│    ✓ Dispatches sub-agents with clear task descriptions                     │
│    ✓ Tracks sub-agent completion                                            │
│    ✓ Reads brief status from files to decide next steps                     │
│    ✓ Manages iteration count and termination conditions                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │                    │                    │                    │
         ▼                    ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Research   │      │ Extraction  │      │Investigation│      │  Synthesis  │
│   Agent     │      │   Agent     │      │   Agent     │      │   Agent     │
│ (Task tool) │      │ (Task tool) │      │ (Task tool) │      │ (Task tool) │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
         │                    │                    │                    │
         ▼                    ▼                    ▼                    ▼
    research-leads/      extraction.json      people.md           summary.md
                                              fact-check.md       sources.md
                                              timeline.md
```

### Sub-Agent Types and Responsibilities

| Agent Type | Task tool subagent_type | Responsibilities | Writes To |
|------------|-------------------------|------------------|-----------|
| **Research Agent** | `general-purpose` | Execute MCP research (Gemini/OpenAI/XAI), save raw output | `research-leads/` |
| **Extraction Agent** | `general-purpose` | Parse research-leads/, extract claims/people/dates | `_extraction.json` |
| **Investigation Agent** | `general-purpose` | Investigate specific people/claims, verify facts | `people.md`, `fact-check.md`, `timeline.md` |
| **Evidence Agent** | `Bash` | Run capture scripts, verify evidence | `evidence/`, `sources.md` |
| **Verification Agent** | `general-purpose` | Run verification checkpoint, cross-model critique | `iterations.md` (append checkpoint) |
| **Synthesis Agent** | `general-purpose` | Synthesize all detail files into summary.md | `summary.md` |
| **Financial Agent** | `general-purpose` | Financial investigation research and analysis | `financial-*.md` |
| **Questions Agent** | `general-purpose` | Generate investigative questions using frameworks | `questions.md` or stdout |
| **Integrity Agent** | `general-purpose` | Journalistic integrity assessment | `integrity-check.md` |
| **Legal Agent** | `general-purpose` | Pre-publication legal risk assessment | `legal-review.md` |
| **Article Agent** | `general-purpose` | Generate publication-ready articles | `articles.md` |

### Sub-Agent Contract

**Every sub-agent MUST:**

1. **Receive clear task**: Specific file paths, what to investigate, where to write
2. **Do the work**: Use MCP tools, read files, perform analysis
3. **Write ALL findings to files**: Never return large content bodies
4. **Return brief status**: "Completed [task], wrote N items to [file]"

**Example sub-agent dispatch:**

```
Task tool call:
  subagent_type: "general-purpose"
  description: "Research Boeing 737 MAX"
  prompt: |
    TASK: Deep research on Boeing 737 MAX investigation

    CASE: cases/boeing-737-max/

    ACTIONS:
    1. Run Gemini deep_research on "Boeing 737 MAX crashes investigation timeline"
    2. Run XAI research on recent news and X/Twitter discourse
    3. Save ALL raw output to research-leads/iteration-003-research.md
    4. Do NOT return the research content - it's in the file

    OUTPUT: Write to research-leads/iteration-003-research.md
    RETURN: Brief status - what you found, how many sources, any errors
```

**Sub-agent response (what gets returned to orchestrator):**

```
Completed research for iteration 3.
- Gemini: 15 potential sources identified
- XAI: 8 recent news articles, 12 X/Twitter discussions
- Written to: research-leads/iteration-003-research.md
- Key finding flags: 2 new people, 3 timeline discrepancies
```

### Orchestrator Flow (Main Loop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR MAIN LOOP                               │
│                                                                              │
│  STEP 1: READ STATE                                                          │
│    - Read cases/.active for current case                                     │
│    - Read summary.md header (status, iteration count)                        │
│    - Read iterations.md last entry (gaps, next steps)                        │
│    - Read sources.md header (next source ID)                                 │
│                                                                              │
│  STEP 2: DECIDE PHASE                                                        │
│    - If iteration 0: Phase 1 (initial research)                              │
│    - If gaps exist: Address gaps (targeted research)                         │
│    - If no gaps: Run verification checkpoint                                 │
│    - If verification passes: Complete                                        │
│                                                                              │
│  STEP 3: DISPATCH SUB-AGENTS (in parallel where possible)                   │
│    - Launch appropriate agents for current phase                             │
│    - Agents write to files, return brief status                              │
│    - Wait for completion                                                     │
│                                                                              │
│  STEP 4: CHECK RESULTS                                                       │
│    - Read brief status from file headers/summaries                           │
│    - Do NOT read full file contents into main context                        │
│    - Update iteration count                                                  │
│                                                                              │
│  STEP 5: LOOP OR TERMINATE                                                   │
│    - If termination conditions met: Mark complete                            │
│    - Else: Loop to STEP 1                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### File Headers for State Reading

Each key file should have a machine-readable header that the orchestrator can quickly read:

**summary.md header:**
```markdown
# Investigation: Boeing 737 MAX

**Status**: IN_PROGRESS | COMPLETE
**Iteration**: 5
**Last Updated**: 2026-01-08T10:30:00Z
**Sources**: 47
**People**: 12
**Open Gaps**: 3
```

**iterations.md last entry:**
```markdown
## Iteration 5 - 2026-01-08T10:30:00Z

**Phase**: VERIFICATION
**Gaps Found**: 3
**Next Steps**:
1. Investigate regulatory oversight claims
2. Fact-check whistleblower testimony
3. Address coverup theory
```

**sources.md header:**
```markdown
# Source Registry

**Case**: boeing-737-max
**Total Sources**: 47
**Next ID**: S048
```

### Parallel Sub-Agent Dispatch

**CRITICAL**: Launch independent sub-agents in ONE message for parallel execution.

```
PHASE 1 - RESEARCH (dispatch in ONE message):

Task 1: Research Agent - Gemini deep research
Task 2: Research Agent - OpenAI deep research (critical claims)
Task 3: Research Agent - XAI real-time search
Task 4: Research Agent - X/Twitter discourse
Task 5: Research Agent - Official records

All write to research-leads/, orchestrator waits for all to complete.
```

```
PHASE 3 - INVESTIGATION (dispatch in ONE message):

Task 1: Investigation Agent - Person A background
Task 2: Investigation Agent - Person B background
Task 3: Investigation Agent - Verify claim X
Task 4: Investigation Agent - Verify claim Y

All write to respective detail files.
```

### Context Management Rules

| What | Orchestrator Does | Orchestrator Does NOT |
|------|-------------------|----------------------|
| File headers | Reads (20-30 lines) | Read full file contents |
| Research results | Gets brief status from agent | Read into main context |
| Sub-agent output | Gets completion confirmation | Accumulate in conversation |
| State tracking | Reads from files | Track in memory |
| Findings | Knows they're in files | Process or analyze |

### State Files (Machine-Readable)

Create these auxiliary files for orchestrator state tracking:

**_state.json** (case root):
```json
{
  "case_id": "boeing-737-max",
  "topic": "Boeing 737 MAX crashes investigation",
  "status": "IN_PROGRESS",
  "current_iteration": 5,
  "current_phase": "VERIFICATION",
  "next_source_id": "S048",
  "people_count": 12,
  "sources_count": 47,
  "gaps": [
    "Regulatory oversight claims",
    "Whistleblower testimony",
    "Coverup theory"
  ],
  "last_verification": "2026-01-08T10:30:00Z",
  "verification_passed": false,
  "created_at": "2026-01-07T09:00:00Z",
  "updated_at": "2026-01-08T10:30:00Z"
}
```

This file is updated by sub-agents after each phase and read by orchestrator.

### Sub-Agent Prompt Templates

**Research Agent Prompt Template:**
```
TASK: Deep research on [TOPIC]
CASE: cases/[case-id]/
ITERATION: [N]

ACTIONS:
1. Run [MCP tool] with query: "[query]"
2. Save raw output to research-leads/iteration-[N]-[source].md
3. Extract key items: [people found], [sources found], [dates found]
4. Update _state.json with extraction summary

OUTPUT FILE: research-leads/iteration-[N]-[source].md
RETURN: Brief status only (counts, key findings, errors)
```

**Investigation Agent Prompt Template:**
```
TASK: Investigate [PERSON/CLAIM]
CASE: cases/[case-id]/
ITERATION: [N]

CONTEXT: Read from [relevant files]

ACTIONS:
1. Research [specific investigation tasks]
2. Update [target files] with findings
3. Register any new sources in sources.md with next ID from _state.json
4. Update _state.json with changes

OUTPUT FILES: [list of files to update]
RETURN: Brief status only (what found, files updated, new gaps identified)
```

**Synthesis Agent Prompt Template:**
```
TASK: Synthesize findings into summary.md
CASE: cases/[case-id]/
ITERATION: [N]

ACTIONS:
1. Read all detail files (timeline.md, people.md, positions.md, etc.)
2. Read sources.md for complete source list
3. Completely rewrite summary.md as polished final document
4. Embed full source list in summary.md
5. Update _state.json with new status

OUTPUT FILE: summary.md (complete rewrite)
RETURN: Brief status (summary length, source count, key sections updated)
```

### Deep Research Engines

| Engine | Server | Tool | Strength |
|--------|--------|------|----------|
| **Gemini** | [`mcp-gemini`](https://github.com/DanDaDaDanDan/mcp-gemini) | `deep_research` | Fast, broad coverage (5-30 min) |
| **OpenAI** | [`mcp-openai`](https://github.com/DanDaDaDanDan/mcp-openai) | `deep_research` | Maximum depth, complex reasoning (10-60 min) |
| **XAI** | [`mcp-xai`](https://github.com/DanDaDaDanDan/mcp-xai) | `research` | Real-time, social media, breaking news |
| **Gemini (critique)** | [`mcp-gemini`](https://github.com/DanDaDaDanDan/mcp-gemini) | `generate_text` | Cross-model verification |

**Default timeout: 60 minutes.** If research times out, use `check_research` with the returned ID to retrieve results.

### When to Use Which

| Situation | Primary Engine |
|-----------|----------------|
| Initial broad research | Gemini (fast) |
| Critical claims needing verification | OpenAI (max depth) |
| Recent events, social media reaction | XAI (real-time) |
| Cross-model critique | Gemini critiques Claude's work |
| Verification checkpoint | Gemini with thinking_level: high |

---

## MCP Server Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Claude Code                                     │
└─────────────────────────────────────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   mcp-gemini    │ │   mcp-openai    │ │    mcp-xai      │
│   (Google AI)   │ │   (OpenAI)      │ │   (xAI/Grok)    │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ deep_research   │ │ deep_research   │ │ x_search        │
│ check_research  │ │ check_research  │ │ web_search      │
│ generate_text   │ │ generate_text   │ │ news_search     │
│ list_models     │ │ web_search      │ │ research        │
└─────────────────┘ │ list_models     │ │ generate_text   │
                    └─────────────────┘ └─────────────────┘
```

### Tool Selection Matrix

| Task | Server | Tool | Key Parameters |
|------|--------|------|----------------|
| Deep research (fast) | gemini | `deep_research` | `query`, `timeout_minutes: 60` |
| Deep research (max depth) | openai | `deep_research` | `query`, `model: o3-deep-research`, `timeout_minutes: 60` |
| Check/resume research | gemini | `check_research` | `interaction_id` (from timeout error) |
| Check/resume research | openai | `check_research` | `response_id` (from timeout error) |
| Cross-model critique | gemini | `generate_text` | `thinking_level: high` |
| Verification checkpoint | gemini | `generate_text` | `thinking_level: high`, ruthless prompt |
| Real-time multi-source | xai | `research` | `sources: ["x","web","news"]` |
| X/Twitter search | xai | `x_search` | `query`, `from_date` |
| Web search | xai | `web_search` | `query`, `allowed_domains` |
| News search | xai | `news_search` | `query`, `from_date` |

### Deep Research Error Handling

| Error Prefix | Meaning | Recovery |
|-------------|---------|----------|
| `TIMEOUT:` | Research still running | Use `check_research` with ID in error |
| `AUTH_ERROR:` | Invalid API key | Check MCP server credentials |
| `RATE_LIMIT:` | API rate limit hit | Wait and retry |
| `API_ERROR:` | API failure | Check logs, retry |
| `RESEARCH_FAILED:` | Research task failed | Try different query |
| `NOT_FOUND:` | ID not found/expired | Start new research |

---

## Case Directory Structure

**Each case has its own git repository for version control. Commit after every iteration.**

**Case naming**: Folder name is a slug derived from the investigation topic:
- `"Boeing 737 MAX crashes"` → `boeing-737-max-crashes`
- `"FTX collapse"` → `ftx-collapse`
- `"Corporate fraud at Acme Corp"` → `corporate-fraud-acme-corp`

```
cases/
├── .active                           # Current case slug (plain text)
└── [topic-slug]/
    │
    │  # ORCHESTRATOR STATE (machine-readable)
    ├── _state.json                   # Case status, iteration, gaps, verification
    ├── _extraction.json              # Current extraction results (claims, people, dates)
    │
    │  # VERSION CONTROL
    ├── .git/                         # Case-specific git repository
    │
    │  # EVIDENCE ARCHIVE (hallucination-proof source verification)
    ├── evidence/
    │   ├── web/                      # Web page captures
    │   │   └── S001/                 # Per-source evidence folder
    │   │       ├── capture.png       # Full-page screenshot
    │   │       ├── capture.pdf       # PDF rendering
    │   │       ├── capture.html      # Raw HTML source
    │   │       └── metadata.json     # URL, timestamp, SHA-256 hashes
    │   ├── documents/                # Downloaded documents (PDFs, filings)
    │   │   └── S015_sec_10k.pdf      # Named with source ID prefix
    │   ├── api/                      # API response captures (JSON)
    │   └── media/                    # Videos, images, transcripts
    │
    │  # RESEARCH LEADS (AI research outputs - NOT citable)
    ├── research-leads/               # Gemini/OpenAI deep research outputs
    │   └── *.md                      # Used to find primary sources only
    │
    │  # DELIVERABLE (self-contained, shareable)
    ├── summary.md                    # Executive summary + key findings + ALL sources embedded
    │
    │  # SOURCE REGISTRY (authoritative, append-only, with evidence paths)
    ├── sources.md                    # Master source list with URLs, evidence paths, hashes
    │
    │  # DETAIL FILES (use source IDs for citations)
    ├── timeline.md                   # Full chronological timeline
    ├── people.md                     # All person profiles
    ├── positions.md                  # ALL positions/sides with arguments and evidence
    ├── fact-check.md                 # Claim verdicts (all positions)
    ├── theories.md                   # Alternative/fringe theories analysis
    ├── statements.md                 # Statement vs evidence, chain of knowledge
    │
    │  # METADATA
    ├── iterations.md                 # Progress log + verification checkpoints
    │
    │  # GENERATED OUTPUTS (created by finalization commands)
    ├── integrity-check.md            # Journalistic integrity assessment (/integrity)
    ├── legal-review.md               # Pre-publication legal risk assessment (/legal-review)
    └── articles.md                   # Publication-ready articles (/article)
```

### File Responsibilities

| File | Purpose | Size Target | Self-Contained? |
|------|---------|-------------|-----------------|
| `_state.json` | **ORCHESTRATOR STATE** - case status, iteration, gaps | ~30 lines | Machine-readable |
| `_extraction.json` | Current extraction results (claims, people, dates) | ~200 lines | Machine-readable |
| `summary.md` | **THE DELIVERABLE** - shareable report | < 1000 lines | **YES** (has all sources) |
| `sources.md` | Source registry with URLs, evidence paths, hashes | Unlimited | Reference only |
| `evidence/` | **Captured evidence files** (screenshots, PDFs, HTML) | ~50MB/source | Binary archive |
| `research-leads/` | AI research outputs (NOT citable) | Unlimited | Internal only |
| `timeline.md` | Chronological events | Unlimited | No (uses source IDs) |
| `people.md` | Person profiles | Unlimited | No (uses source IDs) |
| `positions.md` | All positions with arguments | Unlimited | No (uses source IDs) |
| `fact-check.md` | Claim verdicts (all positions) | Unlimited | No (uses source IDs) |
| `theories.md` | Alternative theory analysis | Unlimited | No (uses source IDs) |
| `statements.md` | Statement vs evidence analysis | Unlimited | No (uses source IDs) |
| `iterations.md` | Progress tracking | Unlimited | No |
| `integrity-check.md` | Journalistic integrity assessment | < 500 lines | No |
| `legal-review.md` | Pre-publication legal risk assessment | < 500 lines | No |
| `articles.md` | Publication-ready articles (short + long) | < 2000 lines | **YES** (includes source key) |

---

## Evidence Capture System

### Purpose

**Hallucination-proof source verification.** Every source has local evidence that proves:
1. The source existed at research time
2. The content actually contained the cited claims
3. Content can be verified even if original URL disappears

### Capture Workflow

```
Source Found (URL) → IMMEDIATE CAPTURE → Verify Claim → Register Source
                           ↓
              ┌────────────┴────────────┐
              ↓                         ↓
         Web Page                   Document
              ↓                         ↓
    ┌─────────┼─────────┐         Download PDF
    ↓         ↓         ↓               ↓
Screenshot  PDF      HTML          Store with
(full page)          source        source ID
    ↓         ↓         ↓               ↓
    └─────────┼─────────┘               │
              ↓                         │
         metadata.json ←────────────────┘
         (URL, timestamp, SHA-256 hashes)
              ↓
    Submit to Wayback Machine
              ↓
    Register in sources.md with evidence path
```

### Capture Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/capture` | Main capture wrapper | `./scripts/capture S001 https://url` |
| `scripts/capture-url.js` | Playwright capture (core) | Called by capture script |
| `scripts/firecrawl-capture.js` | Bot-bypass capture (Firecrawl API) | `node scripts/firecrawl-capture.js --batch urls.txt case_dir` |
| `scripts/capture-evidence.js` | Combined workflow (Firecrawl + PDF) | `node scripts/capture-evidence.js urls.txt case_dir` |
| `scripts/verify-sources.js` | Verify evidence integrity | `node scripts/verify-sources.js case_dir` |
| `scripts/verify-claims.js` | Anti-hallucination claim verification | `node scripts/verify-claims.js case_dir` |
| `scripts/find-failed-captures.js` | Audit capture quality | `node scripts/find-failed-captures.js case_dir` |
| `scripts/find-wayback-url.js` | Find Wayback Machine URLs | `node scripts/find-wayback-url.js URL` |
| `scripts/archivebox-backup.js` | WARC forensic backups | `node scripts/archivebox-backup.js urls.txt archive_dir` |

### Evidence Types

| Type | Location | Contents |
|------|----------|----------|
| Web pages | `evidence/web/SXXX/` | capture.png, capture.pdf, capture.html, metadata.json |
| Documents | `evidence/documents/` | SXXX_filename.pdf, SXXX_filename.pdf.meta.json |
| API responses | `evidence/api/` | SXXX_response.json |
| Media | `evidence/media/` | SXXX_video.mp4, SXXX_transcript.txt |

### metadata.json Schema

```json
{
  "source_id": "S001",
  "url": "https://example.com/article",
  "title": "Page Title",
  "captured_at": "2026-01-07T14:23:00Z",
  "method": "playwright",
  "http_status": 200,
  "files": {
    "png": { "path": "capture.png", "hash": "sha256:...", "size": 1234567 },
    "pdf": { "path": "capture.pdf", "hash": "sha256:...", "size": 234567 },
    "html": { "path": "capture.html", "hash": "sha256:...", "size": 34567 }
  },
  "wayback": {
    "submitted": true,
    "archiveUrl": "https://web.archive.org/web/..."
  }
}
```

### AI Research Handling

**AI research outputs (Gemini/OpenAI deep research) are NOT sources.**

| What | Where | Citable? |
|------|-------|----------|
| Gemini deep research output | `research-leads/gemini-001.md` | **NO** |
| OpenAI deep research output | `research-leads/openai-001.md` | **NO** |
| Primary source found via AI | `evidence/web/SXXX/` | **YES** |

**Workflow:**
1. AI research returns claim: "Company X did Y [from industry source]"
2. Save AI output to `research-leads/` (for reference only)
3. Search for primary source (actual URL)
4. Capture primary source with `./scripts/capture`
5. Register primary source in sources.md with evidence path
6. Cite primary source [SXXX], never cite AI research

---

## Source Attribution System

### The Golden Rule

**Every claim must have a source ID. No exceptions.**

### Source ID Format

Sources are assigned sequential IDs: `[S001]`, `[S002]`, `[S003]`, etc.

- IDs are **append-only** - never renumber, never delete
- Format: `[SXXX]` where XXX is zero-padded 3-digit number
- When a source is found invalid, mark it `[DEPRECATED]` but keep the ID

### sources.md Structure

```markdown
# Source Registry

**Case**: [topic-slug]
**Total Sources**: [N]
**Last Updated**: [datetime]

---

## Quick Reference

| ID | Type | Short Title | Credibility |
|----|------|-------------|-------------|
| [S001] | Court Filing | Smith v. Jones Complaint | Primary |
| [S002] | News Article | NYT: "The Investigation" | Secondary |
| [S003] | Social Media | @journalist thread | Tertiary |
| [S004] | [DEPRECATED] | Broken link | - |

---

## Full Source Entries

### [S001] Smith v. Jones Complaint
- **Type**: Court Filing
- **Title**: Complaint for Damages, Smith v. Jones Corp
- **URL**: https://courtlistener.com/docket/12345/
- **Retrieved**: 2026-01-05
- **Credibility**: Primary (official court record)
- **Archive**: https://web.archive.org/web/...
- **Key Claims Supported**: Timeline of events, damages amount
- **Notes**: Filed in SDNY, Case No. 1:26-cv-00123

### [S002] NYT Investigation
- **Type**: News Article
- **Title**: "Inside the Corporate Fraud"
- **Author**: Jane Reporter
- **Publication**: New York Times
- **URL**: https://nytimes.com/2026/01/...
- **Retrieved**: 2026-01-05
- **Credibility**: Secondary (journalism, named sources)
- **Archive**: https://archive.today/...
- **Key Claims Supported**: Executive knowledge, internal emails
- **Notes**: Cites 3 anonymous sources + documents

### [S003] @journalist Thread
- **Type**: Social Media
- **Platform**: X/Twitter
- **Author**: @investigative_journo
- **URL**: https://x.com/investigative_journo/status/...
- **Retrieved**: 2026-01-05
- **Credibility**: Tertiary (unverified, but from credible reporter)
- **Archive**: https://archive.today/...
- **Notes**: Breaking news, needs verification

### [S004] [DEPRECATED]
- **Status**: Link no longer valid
- **Original URL**: https://...
- **Reason**: Page removed, no archive found
- **Deprecated**: 2026-01-06
```

### Inline Citation Format

In all detail files, cite sources inline:

```markdown
The defendant was aware of the fraud by January 2025 [S001] [S002].

According to internal emails [S002], the CFO raised concerns in December 2024,
though this contradicts public statements made at the time [S005].

The conspiracy theory claims a coverup [S010], but court records show
the investigation began before the alleged coverup period [S001].
```

### Circular Reporting Detection

When multiple sources cite each other, note it:

```markdown
### [S015] Daily News Article
...
- **Notes**: CIRCULAR - Cites [S002] as primary source. Not independent verification.

### [S016] Blog Post
...
- **Notes**: CIRCULAR - Aggregates [S002] and [S015]. No original reporting.
```

---

## summary.md Structure

**The deliverable. Self-contained. Shareable. Has ALL sources embedded.**

### Quality Standards: Final Product, Not Ledger

**summary.md must read as a polished investigative report, not a working document.**

| summary.md IS | summary.md is NOT |
|---------------|-------------------|
| A self-contained final report | A log of iterative discoveries |
| Written as if composed in one sitting | A ledger showing additions over time |
| Smooth narrative with no seams | A changelog with "additionally found..." |
| Ready to share with anyone | A working document with revision artifacts |
| Publishable quality | An internal scratchpad |

**Rewrite, Don't Append**: Each time summary.md is updated, completely rewrite it as a fresh, polished document. Remove all artifacts of the iterative process. No language that reveals multiple passes.

**Forbidden phrases**:
- ❌ "We also found..."
- ❌ "Additionally..."
- ❌ "In a subsequent search..."
- ❌ "Further investigation revealed..."
- ✅ Just state findings directly

**The Test**: Could you hand this to a journalist or executive right now and have them understand the full investigation without explanation? If yes, it's a proper summary.md.

### Structure Template

```markdown
# Investigation: [Topic]

**Case ID**: [topic-slug]
**Status**: [IN PROGRESS | COMPLETE]
**Last Updated**: [datetime]

> **Quick Links**: [Timeline](timeline.md) | [People](people.md) |
> [Positions](positions.md) | [Fact-Check](fact-check.md) | [Theories](theories.md)

---

## Executive Summary

[2-3 paragraphs summarizing the investigation. What happened, who was involved,
what we found, what remains uncertain. No source IDs here - this is prose.]

---

## Key Findings

### Proven (High Confidence)
- Finding 1 [S001] [S002]
- Finding 2 [S003]

### Probable (Medium Confidence)
- Finding 3 [S004] [S005]

### Contested
- Claim X: Evidence supports [S006], but contradicted by [S007]

### Unverified
- Claim Y: Asserted by [S008], no corroboration found

---

## The Verdict

### What's Proven
- [Specific proven facts with source IDs]

### What's Not Proven
- [Claims that lack sufficient evidence]

### What's Contested
- [Areas where evidence conflicts]

### Open Questions
- [Genuinely unanswerable questions]

---

## Key People Summary

| Person | Role | Culpability | Details |
|--------|------|-------------|---------|
| [Name] | [Title] | [Assessment] | [See people.md] |

---

## Alternative Theories: Quick Verdicts

| Theory | Verdict | Key Evidence |
|--------|---------|--------------|
| [Theory 1] | DEBUNKED | [S010] contradicts core claim |
| [Theory 2] | UNPROVEN | No supporting evidence found |
| [Theory 3] | PARTIALLY TRUE | [S011] confirms X, but not Y |

---

## Investigation Metadata

| Metric | Value |
|--------|-------|
| Iterations completed | [N] |
| Verification checkpoints | [N] |
| Total sources | [N] |
| Primary sources | [N] |
| Positions documented | [N] |
| People investigated | [N] |
| Claims fact-checked | [N] |

---

## Complete Source List

[This section is auto-generated from sources.md - embeds the FULL source list
so summary.md is completely self-contained and shareable]

### Source Index

| ID | Type | Title | URL |
|----|------|-------|-----|
| [S001] | Court Filing | Smith v. Jones Complaint | [link] |
| [S002] | News Article | NYT: "The Investigation" | [link] |
| ... | ... | ... | ... |

### Full Source Details

[S001] **Smith v. Jones Complaint**
- Type: Court Filing
- URL: https://courtlistener.com/docket/12345/
- Retrieved: 2026-01-05
- Credibility: Primary

[S002] **NYT: "Inside the Corporate Fraud"**
- Type: News Article
- Author: Jane Reporter
- URL: https://nytimes.com/2026/01/...
- Retrieved: 2026-01-05
- Credibility: Secondary

[... all sources ...]
```

---

## Detail File Structures

### timeline.md

```markdown
# Timeline: [Topic]

**Case**: [topic-slug]
**Events**: [N]

---

## Chronological Events

| Date | Event | Sources | Confidence |
|------|-------|---------|------------|
| 2024-01-15 | Initial complaint filed | [S001] | High |
| 2024-02-20 | Board meeting discussing issue | [S002] [S003] | Medium |
| 2024-03-01 | Public statement issued | [S004] | High |

---

## Detailed Timeline

### 2024-01-15: Initial Complaint Filed

The complaint was filed in SDNY [S001], alleging...

[Detailed narrative with inline citations]

### 2024-02-20: Board Meeting

According to meeting minutes obtained by NYT [S002], the board...

[... continues ...]
```

### people.md

```markdown
# Key People: [Topic]

**Case**: [topic-slug]
**People Profiled**: [N]

---

## Person Index

| Name | Role | Culpability Assessment |
|------|------|------------------------|
| John Smith | CEO | Central figure |
| Jane Doe | CFO | Raised concerns early |
| Bob Wilson | Board Chair | Oversight failure |

---

## Profiles

### John Smith (CEO)

**Current Role**: Chief Executive Officer (resigned June 2024)

**Role Timeline**:
| Period | Role | Organization | Notes |
|--------|------|--------------|-------|
| 2010-2015 | VP Finance | Previous Corp | [S015] |
| 2015-2018 | CFO | Acme Corp | Recruited by founder [S016] |
| 2018-2020 | COO | Acme Corp | Promoted during expansion |
| 2020-2024 | CEO | Acme Corp | Appointed after predecessor left |

**Background**:
- Education, early career [S015]
- Known associates [S016]

**What They Knew**:
- Aware of issue by Jan 2024 [S001] [S002]
- Received internal report Feb 2024 [S003]

**What They Did**:
- Authorized investigation [S004]
- Made public statement denying knowledge [S005]

**Statement History** (chronological):
| Date | Venue | Topic | Statement Summary | Source |
|------|-------|-------|-------------------|--------|
| 2024-01-20 | Internal (board meeting) | Issue awareness | Present at discussion, no recorded statement | [S003] |
| 2024-03-15 | Press release | Issue awareness | "I first learned of this in March" | [S005] |
| 2024-04-10 | Earnings call | Company response | "We acted swiftly once aware" | [S025] |
| 2024-05-20 | Congressional testimony | Timeline | "I cannot recall exact dates" | [S030] |
| 2024-06-01 | Resignation letter | Departure | "Leaving to pursue other opportunities" | [S020] |

**Statement Evolution Analysis**:
- **Initial position** (Mar 2024): Claimed first awareness in March
- **Shift** (May 2024): Moved to "cannot recall" under oath
- **Pattern**: Increasingly hedged as documentary evidence emerged

**Statement vs. Evidence**:
| Statement | Evidence | Gap |
|-----------|----------|-----|
| "I learned in March" [S005] | Email shows Jan awareness [S002] | 2 month discrepancy |
| "Acted swiftly" [S025] | 60-day gap documented [S003] | Definition of "swift" |
| "Cannot recall" [S030] | Calendar shows 3 meetings [S031] | Selective memory |

**Current Status**:
- Resigned June 2024 [S020]
- Under investigation [S021]

---

### Jane Doe (CFO)

[... similar structure with Role Timeline and Statement History ...]
```

### positions.md

```markdown
# Positions: [Topic]

**Case**: [topic-slug]
**Positions Documented**: [N]

---

## Position Index

| Position | Proponents | Strength | Summary |
|----------|------------|----------|---------|
| Company acted wrongfully | Regulators, plaintiffs, whistleblowers | [0.6, 0.8] | See Position 1 |
| Company acted reasonably | Company, industry groups | [0.3, 0.5] | See Position 2 |
| Regulatory failure | Industry critics | [0.4, 0.6] | See Position 3 |

---

## Position 1: Company Acted Wrongfully

**Proponents**: Regulators, plaintiffs, whistleblowers

### Summary
The case for culpability rests on:
1. Knowledge (they knew)
2. Inaction (they didn't act)
3. Coverup (they hid it)

### Key Arguments

#### Argument 1.1: They Knew
**Evidence**:
- Internal email dated Jan 15, 2024 [S002]
- Testimony of whistleblower [S007]
- Board minutes [S003]

**Strength**: HIGH
Multiple independent sources confirm awareness.

#### Argument 1.2: They Didn't Act
**Evidence**:
- 60-day gap between knowledge and action [S001] [S002]
- Similar issues at competitor led to immediate response [S030]

**Strength**: MEDIUM
Timeline established, but "reasonable response time" is debatable.

#### Argument 1.3: They Hid It
**Evidence**:
- Public statement contradicts internal docs [S005] vs [S002]
- Deleted emails referenced in discovery [S008]

**Strength**: MEDIUM
Gap exists, but "coverup" vs "mistake" is interpretive.

### Overall Position Strength: [0.6, 0.8]

---

## Position 2: Company Acted Reasonably

**Proponents**: Company, defense counsel, industry associations

### Summary
The case for innocence/mitigation:
1. Industry standard (everyone does it)
2. Good faith effort (they tried)
3. Hindsight bias (not foreseeable)

### Key Arguments

#### Argument 2.1: Industry Standard
**Evidence**:
- Industry report showing common practice [S040]
- Competitor behavior [S041]

**Strength**: MEDIUM
Establishes context, but "everyone does it" isn't exculpatory.

#### Argument 2.2: Good Faith Effort
**Evidence**:
- Internal investigation launched [S004]
- Outside counsel retained [S042]
- Remediation plan [S043]

**Strength**: HIGH
Documented efforts to address once aware.

### Overall Position Strength: [0.3, 0.5]

---

## Position 3: Regulatory Failure

**Proponents**: Industry critics, some defendants, policy analysts

### Summary
The case that regulators bear responsibility:
1. Failed oversight
2. Unclear guidance
3. Selective enforcement

### Key Arguments

#### Argument 3.1: Failed Oversight
**Evidence**:
- Regulator missed warning signs [S060]
- Understaffed department [S061]

**Strength**: MEDIUM
Documented gaps, but doesn't eliminate company responsibility.

### Overall Position Strength: [0.4, 0.6]

---

## Adding New Positions

When new perspectives emerge during investigation:
1. Create new ## Position N section
2. Document proponents
3. Build strongest arguments with evidence
4. Assess overall strength
5. Update Position Index table
```

### fact-check.md

```markdown
# Fact-Check: [Topic]

**Case**: [topic-slug]
**Claims Checked**: [N]
**Positions Covered**: [N]

---

## Claim Summary

| # | Claim | Position | Claimant | Verdict | Evidence |
|---|-------|----------|----------|---------|----------|
| C1 | CEO knew by January | Position 1 | NYT [S002] | TRUE | Confirmed by [S001] [S003] |
| C2 | Board was warned | Position 1 | Whistleblower [S007] | PARTIALLY TRUE | Minutes show discussion, "warning" disputed |
| C3 | Response was timely | Position 2 | Company [S050] | DISPUTED | Industry comparison mixed |
| C4 | Regulator delayed intentionally | Position 3 | Critics [S060] | DEBUNKED | Delay within normal range |

---

## Detailed Fact-Checks

### C1: CEO Knew by January
- **Claim**: CEO was aware of the issue by January 2024
- **Position**: Position 1 (Company acted wrongfully)
- **Source**: NYT article [S002]
- **Verdict**: TRUE
- **Supporting Evidence**:
  - Internal email [S001] dated Jan 15 with CEO on distribution
  - Board minutes [S003] show CEO present at Jan 20 discussion
- **Contradicting Evidence**: None found

### C2: Board Was Warned
- **Claim**: Board received explicit warning about risks
- **Position**: Position 1 (Company acted wrongfully)
- **Source**: Whistleblower testimony [S007]
- **Verdict**: PARTIALLY TRUE
- **Supporting Evidence**:
  - Board minutes [S003] show agenda item "Risk Discussion"
- **Contradicting Evidence**:
  - Minutes characterize as "routine review" not "warning"
  - Board member statement [S044] disputes characterization
- **Assessment**: Issue was discussed, but "warning" characterization is disputed

### C3: Response Was Timely
- **Claim**: Company responded within reasonable timeframe
- **Position**: Position 2 (Company acted reasonably)
- **Source**: Company statement [S050]
- **Verdict**: DISPUTED
- **Supporting Evidence**:
  - Industry report shows similar response times [S040]
- **Contradicting Evidence**:
  - Competitor responded faster to similar issue [S030]
- **Assessment**: Depends on what counts as "timely" in this context

### C4: Regulator Delayed Intentionally
- **Claim**: Government regulators intentionally delayed investigation
- **Position**: Position 3 (Regulatory failure)
- **Source**: Industry critics [S060]
- **Verdict**: DEBUNKED
- **Supporting Evidence**:
  - Regulator did delay 6 months [S063]
- **Contradicting Evidence**:
  - Delay consistent with normal backlog [S065]
  - Similar delays in unrelated cases [S066]
- **Assessment**: Delay documented but intent unproven; pattern matches normal operations

[... continues ...]
```

### theories.md

```markdown
# Alternative Theories: [Topic]

**Case**: [topic-slug]
**Theories Analyzed**: [N]

---

## Theory Index

| Theory | Prevalence | Verdict |
|--------|------------|---------|
| Government coverup | High (social media) | DEBUNKED |
| Insider trading ring | Medium | UNPROVEN |
| Whistleblower retaliation | Low | PARTIALLY TRUE |

---

## Theory 1: Government Coverup

### The Claim
Proponents claim [S060] that government regulators intentionally delayed
investigation to protect political donors.

### Prevalence
- Viral on X/Twitter [S061]
- Picked up by partisan outlets [S062]
- ~50K engagements

### Investigation

**Evidence For**:
- Regulator did delay 6 months [S063]
- Donations from company PAC to officials [S064]

**Evidence Against**:
- Delay consistent with normal backlog [S065]
- Similar delays in unrelated cases [S066]
- Donations were industry-wide, not targeted [S067]

### Verdict: DEBUNKED

While superficially plausible, the evidence shows:
1. Delay was within normal range
2. No unusual treatment compared to similar cases
3. Donation patterns don't support targeted protection

The theory requires ignoring the baseline rate of regulatory delays
and selectively interpreting common political donations as evidence
of specific quid pro quo.

---

## Theory 2: Insider Trading Ring

[... continues ...]
```

### statements.md

```markdown
# Evidence Analysis: [Topic]

**Case**: [topic-slug]

---

## Statement vs. Evidence

| Who | What They Said | When | What Documents Show | Gap |
|-----|----------------|------|---------------------|-----|
| CEO | "Learned in March" [S005] | Mar 2024 | Email shows Jan [S002] | 2 months |
| CFO | "Raised concerns immediately" [S070] | Jun 2024 | 30-day delay documented [S003] | Timing |
| Board | "Acted decisively" [S071] | Jul 2024 | 60-day deliberation [S003] | Characterization |

### Analysis: CEO Timeline Gap

The CEO's public statement [S005] claimed first awareness in March 2024.
However, documentary evidence [S002] shows:
- Jan 15: Email with CEO on distribution
- Jan 20: Board meeting attended by CEO
- Feb 10: CEO signs off on internal report

**Assessment**: 2-month discrepancy between claimed and documented awareness.
This could indicate:
1. Intentional misrepresentation
2. Distinction between "aware" and "fully understood"
3. Legal advice to limit liability

---

## Chain of Knowledge

```
                    [S001] Complaint Filed
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         [S002]       [S003]       [S007]
         Email        Minutes      Whistleblower
              │            │            │
              └─────┬──────┘            │
                    ▼                   │
              CEO Awareness ◄───────────┘
              (Jan 2024)
                    │
                    ▼
              [S004] Investigation
              (Feb 2024)
                    │
                    ▼
              [S005] Public Statement
              (Mar 2024) ← CONTRADICTION
```

### Knowledge Flow Analysis

1. **Origin**: Issue first documented in complaint [S001]
2. **Internal Spread**: Email [S002] distributed to leadership
3. **Formal Recognition**: Board minutes [S003] show discussion
4. **External Disclosure**: Whistleblower [S007] contacts regulators
5. **Public Response**: Company statement [S005] after media inquiry

---

## Documentary Evidence Inventory

| Document | Source ID | Type | Key Content |
|----------|-----------|------|-------------|
| Complaint | [S001] | Court Filing | Factual allegations, damages |
| Internal Email | [S002] | Discovery | Leadership awareness |
| Board Minutes | [S003] | Discovery | Decision timeline |
| Investigation Report | [S004] | Company | Remediation steps |
| Press Release | [S005] | Public | Official narrative |
```

### iterations.md

```markdown
# Iteration Log: [Topic]

**Case**: [topic-slug]
**Current Iteration**: [N]

---

## Progress Summary

| Iteration | Date | Focus | New Sources | Key Findings |
|-----------|------|-------|-------------|--------------|
| 1 | 2026-01-05 | Initial research | 15 | Basic narrative |
| 2 | 2026-01-05 | People investigation | 8 | CEO timeline |
| 3 | 2026-01-05 | Position 2 arguments | 12 | Mitigating factors |
| ... | ... | ... | ... | ... |

---

## Iteration 1 - 2026-01-05 10:00

### Research Conducted
- Gemini deep research: "Topic overview"
- XAI news search: Recent coverage
- XAI X search: Social media discourse

### Sources Added
- [S001] through [S015]

### Key Findings
- Basic timeline established
- 5 key people identified
- 3 alternative theories noted for investigation

### New Threads Identified
1. CEO's prior company history
2. Whistleblower credibility
3. Regulator response timeline

---

## Iteration 2 - 2026-01-05 11:30

[... continues ...]

---

## Verification Checkpoint - Iteration 5

### Cross-Model Critique (Gemini)

> "The investigation has solid coverage of Position 1 arguments but
> Position 2 is underdeveloped. Specific gaps:
> 1. No analysis of industry standard practices
> 2. Whistleblower credibility not assessed
> 3. Alternative theory 'Government coverup' not addressed"

### Verification Checklist

| Category | Status | Notes |
|----------|--------|-------|
| All people investigated | YES | All key figures covered |
| Claims categorized by position | PARTIAL | Some Position 1 claims unchecked |
| Timeline complete | YES | Good |
| Source provenance traced | PARTIAL | Some circular reporting |
| All positions documented | NO | Position 2 underdeveloped |
| Alternative theories addressed | NO | Government coverup not addressed |
| Cross-model critique passed | NO | Gaps found |
| All major claims fact-checked | PARTIAL | Several remain |

### Gaps to Address
1. Build out Position 2 with industry context
2. Assess whistleblower credibility
3. Address "Government coverup" theory
4. Fact-check remaining claims from all positions

### Verdict: CONTINUE
Checklist has NO/PARTIAL items. Must address gaps before completion.

---

## Verification Checkpoint - Iteration 10

[... continues ...]
```

---

## Termination Conditions

### ALL Must Be True

```python
def can_terminate():
    return (
        no_unexplored_threads() and            # All threads exhausted
        all_positions_documented() and         # Every side represented
        alternative_theories_addressed() and   # Theories have verdicts
        all_major_claims_fact_checked() and    # All sides verified
        verification_checklist_passed()        # No gaps in checklist
    )
```

### What Counts as an Unexplored Thread?

- Person mentioned but not investigated
- Claim asserted but provenance not traced
- Contradiction identified but not explored
- Date referenced but timeline not verified
- Source cited but not cross-checked
- Position argument not steelmanned
- **Claim not fact-checked** (any position)
- **Alternative theory without verdict**

---

## Commit Strategy

### Checkpoints

| After | Commit Message |
|-------|----------------|
| Case creation | `case [id]: Initial setup` |
| Periodic checkpoint | `case [id]: Iterations [N-M] + verification` |
| Verification pass | `case [id]: Verification checklist passed` |
| Investigation complete | `case [id]: Investigation complete` |

---

## Research Angles

### Investigation Angles (MUST cover all)

| Angle | What to Look For |
|-------|------------------|
| **Mainstream** | Consensus narrative, major outlet coverage |
| **Official** | Court filings, government documents, FOIA |
| **Critical** | Evidence of wrongdoing, accusations, criticisms |
| **Supportive** | Rebuttals, context, exculpatory evidence |
| **All Positions** | Arguments from every party/stakeholder |
| **Alternative Theories** | Fringe theories to investigate with evidence |
| **Social** | X/Twitter sentiment, viral claims |
| **Timeline** | Chronological reconstruction |
| **People** | Individual backgrounds, motivations |
| **Money** | Financial flows, incentives |

---

## Deep-Web Data Sources

These sources are NOT indexed by Google - must query directly:

| Investigation Type | Primary Sources |
|--------------------|-----------------|
| Government spending | USAspending.gov, state checkbooks |
| Corporate entities | OpenCorporates, SEC EDGAR, state SOS |
| Nonprofits | ProPublica Nonprofit Explorer, IRS 990 |
| Court cases | PACER, RECAP/CourtListener |
| Campaign finance | OpenSecrets, FEC database |
| Shell companies | ICIJ Offshore Leaks, OpenSanctions |
| Deleted content | Wayback Machine, Archive.today |

Full reference: `docs/investigative_data_sources.md`
