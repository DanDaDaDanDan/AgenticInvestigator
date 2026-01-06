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
│    │   for each claim in claims_found:         # ALL of them                  │ │
│    │     trace_provenance(claim)                                              │ │
│    │   for each date in dates_found:           # ALL of them                  │ │
│    │     verify_timeline(date)                                                │ │
│    │   for each contradiction in contradictions: # ALL of them                │ │
│    │     explore_contradiction(contradiction)                                 │ │
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

### Verification Checklist

```
All must be TRUE to complete:

□ All people investigated
□ All claims categorized by position
□ Timeline complete
□ Source provenance traced
□ All positions documented
□ Alternative theories addressed
□ Cross-model critique passed
□ All major claims fact-checked (all sides)
□ No unexamined major claims
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

Pre-publication defamation risk analysis.

### Subject Classification

| Type | Standard | Plaintiff Burden |
|------|----------|------------------|
| **Public Official** | Actual Malice | Must prove knowledge of falsity or reckless disregard |
| **Public Figure** | Actual Malice | Same - celebrities, prominent executives |
| **Limited Public Figure** | Actual Malice | Same - injected into specific controversy |
| **Private Figure** | Negligence | Only needs to prove lack of reasonable care |

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

### Output Components

| Component | Purpose |
|-----------|---------|
| **Subject Classifications** | Public/private determination for each person |
| **Claim-by-Claim Analysis** | Risk level, evidence tier, sources for each claim |
| **Evidence Gaps** | What additional verification is needed |
| **Hedging Suggestions** | Alternative language to reduce risk |
| **Pre-Publication Checklist** | Final review before publishing |

---

## Agent Orchestration Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLAUDE (Orchestrator)                          │
│  - Runs the investigation loop until exhausted                              │
│  - Dispatches to deep research engines                                      │
│  - Runs inner loops on all points found                                     │
│  - Runs verification checkpoints                                            │
│  - Maintains sources.md (append-only source registry)                       │
│  - Updates modular detail files after each iteration                        │
│  - Synthesizes summary.md with embedded sources                             │
│  - Tracks progress in iterations.md                                         │
└─────────────────────────────────────────────────────────────────────────────┘
         │                    │                    │                    │
         ▼                    ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Gemini    │      │   OpenAI    │      │     XAI     │      │   Gemini    │
│ Deep Rsrch  │      │ Deep Rsrch  │      │  Research   │      │  Critique   │
│  (MCP)      │      │   (MCP)     │      │   (MCP)     │      │  (MCP)      │
│  Primary    │      │  Max Depth  │      │  Real-Time  │      │ Verification│
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
```

### Deep Research Engines

| Engine | Server | Tool | Strength |
|--------|--------|------|----------|
| **Gemini** | [`mcp-gemini`](https://github.com/DanDaDaDanDan/mcp-gemini) | `deep_research` | Fast, broad coverage (5-15 min) |
| **OpenAI** | [`mcp-openai`](https://github.com/DanDaDaDanDan/mcp-openai) | `deep_research` | Maximum depth, complex reasoning (10-30 min) |
| **XAI** | [`mcp-xai`](https://github.com/DanDaDaDanDan/mcp-xai) | `research` | Real-time, social media, breaking news |
| **Gemini (critique)** | [`mcp-gemini`](https://github.com/DanDaDaDanDan/mcp-gemini) | `generate_text` | Cross-model verification |

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
│ generate_text   │ │ generate_text   │ │ web_search      │
│ list_models     │ │ web_search      │ │ news_search     │
└─────────────────┘ │ list_models     │ │ research        │
                    └─────────────────┘ │ generate_text   │
                                        └─────────────────┘
```

### Tool Selection Matrix

| Task | Server | Tool | Key Parameters |
|------|--------|------|----------------|
| Deep research (fast) | gemini | `deep_research` | `query`, `timeout_minutes` |
| Deep research (max depth) | openai | `deep_research` | `query`, `model: o3-deep-research` |
| Cross-model critique | gemini | `generate_text` | `thinking_level: high` |
| Verification checkpoint | gemini | `generate_text` | `thinking_level: high`, ruthless prompt |
| Real-time multi-source | xai | `research` | `sources: ["x","web","news"]` |
| X/Twitter search | xai | `x_search` | `query`, `from_date` |
| Web search | xai | `web_search` | `query`, `allowed_domains` |
| News search | xai | `news_search` | `query`, `from_date` |

---

## Case Directory Structure

```
cases/
├── .active                           # Current case ID (plain text)
└── inv-YYYYMMDD-HHMMSS/
    │
    │  # DELIVERABLE (self-contained, shareable)
    ├── summary.md                    # Executive summary + key findings + ALL sources embedded
    │
    │  # SOURCE REGISTRY (authoritative, append-only)
    ├── sources.md                    # Master source list with unique IDs [S001], [S002]...
    │
    │  # DETAIL FILES (use source IDs for citations)
    ├── timeline.md                   # Full chronological timeline
    ├── people.md                     # All person profiles
    ├── positions.md                  # ALL positions/sides with arguments and evidence
    ├── fact-check.md                 # Claim verdicts (all positions)
    ├── theories.md                   # Alternative/fringe theories analysis
    ├── evidence.md                   # Statement vs evidence, chain of knowledge
    │
    │  # METADATA
    └── iterations.md                 # Progress log + verification checkpoints
```

### File Responsibilities

| File | Purpose | Size Target | Self-Contained? |
|------|---------|-------------|-----------------|
| `summary.md` | **THE DELIVERABLE** - shareable report | < 1000 lines | **YES** (has all sources) |
| `sources.md` | Source registry - every URL, every citation | Unlimited | Reference only |
| `timeline.md` | Chronological events | Unlimited | No (uses source IDs) |
| `people.md` | Person profiles | Unlimited | No (uses source IDs) |
| `positions.md` | All positions with arguments | Unlimited | No (uses source IDs) |
| `fact-check.md` | Claim verdicts (all positions) | Unlimited | No (uses source IDs) |
| `theories.md` | Alternative theory analysis | Unlimited | No (uses source IDs) |
| `evidence.md` | Documentary analysis | Unlimited | No (uses source IDs) |
| `iterations.md` | Progress tracking | Unlimited | No |

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

**Case**: inv-YYYYMMDD-HHMMSS
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

**Case ID**: inv-YYYYMMDD-HHMMSS
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

**Case**: inv-YYYYMMDD-HHMMSS
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

**Case**: inv-YYYYMMDD-HHMMSS
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

**Role**: Chief Executive Officer, 2020-present

**Background**:
- Previous positions [S015]
- Known associates [S016]

**What They Knew**:
- Aware of issue by Jan 2024 [S001] [S002]
- Received internal report Feb 2024 [S003]

**What They Did**:
- Authorized investigation [S004]
- Made public statement denying knowledge [S005]

**Statement vs. Evidence**:
| Statement | Evidence | Gap |
|-----------|----------|-----|
| "I learned in March" [S005] | Email shows Jan awareness [S002] | 2 month discrepancy |

**Current Status**:
- Resigned June 2024 [S020]
- Under investigation [S021]

---

### Jane Doe (CFO)

[... similar structure ...]
```

### positions.md

```markdown
# Positions: [Topic]

**Case**: inv-YYYYMMDD-HHMMSS
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

**Case**: inv-YYYYMMDD-HHMMSS
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

**Case**: inv-YYYYMMDD-HHMMSS
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

### evidence.md

```markdown
# Evidence Analysis: [Topic]

**Case**: inv-YYYYMMDD-HHMMSS

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

**Case**: inv-YYYYMMDD-HHMMSS
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
