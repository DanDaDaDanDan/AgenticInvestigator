# AgenticInvestigator Architecture

Technical design documentation for the AgenticInvestigator multi-agent investigation framework.

---

## System Overview

AgenticInvestigator is an orchestrated multi-agent system that investigates contested narratives through:

1. **Triple deep research** across Gemini, OpenAI, and XAI engines
2. **Insatiable curiosity looping** with 10+ iteration minimum
3. **Inner loops on all points** found in each iteration
4. **Built-in verification checkpoints** every 5 iterations
5. **Cross-model critique** for validation
6. **Both-sides fact-checking** (prosecution AND defense)
7. **Conspiracy theory handling** (debunk, don't ignore)
8. **Modular file output** with self-contained summary.md deliverable

### Core Principles

- **Insatiable curiosity**: Every finding triggers more questions
- **10+ iterations minimum**: Explicit loop counter, no early stopping
- **Verification checkpoints**: Every 5 iterations, score >= 90 to complete
- **Loop on all points**: Process everything, never cherry-pick
- **Triple deep research**: Gemini + OpenAI + XAI for triangulation
- **Cross-model validation**: Different AI models check each other
- **Both-sides coverage**: Prosecution AND defense claims fact-checked
- **Conspiracy handling**: All theories addressed with verdicts
- **Source attribution is sacred**: Every claim traces to a source ID
- **Modular but self-contained**: summary.md stands alone with all sources embedded

---

## Verified Looping Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    OUTER LOOP (MINIMUM 10 ITERATIONS)                            │
│                                                                                  │
│  for iteration = 1 to ∞:                                                        │
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
│    │   categorize_claims(prosecution, defense, conspiracy)                    │ │
│    │   flag_for_verification(partisan_claims)                                 │ │
│    │   flag_for_verification(reputation_claims)                               │ │
│    │   flag_for_verification(conspiracy_theories)                             │ │
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
│    │ PHASE 4: VERIFICATION CHECKPOINT (every 5 iterations)                     │ │
│    │                                                                            │ │
│    │   if iteration % 5 == 0 OR claiming_saturation:                          │ │
│    │     cross_model_critique(summary_md)   # Gemini critiques Claude         │ │
│    │     search_unexplored_accusations(prosecution_side)                      │ │
│    │     search_unexplored_accusations(defense_side)                          │ │
│    │     search_conspiracy_theories()                                         │ │
│    │     score = calculate_completeness()  # 0-100                            │ │
│    │     gaps = identify_gaps()                                               │ │
│    │                                                                            │ │
│    │     if score < 90 OR gaps.exist():                                       │ │
│    │       FORCE_CONTINUE = True  # Address gaps in next iteration            │ │
│    │     else:                                                                 │ │
│    │       FORCE_CONTINUE = False                                             │ │
│    └──────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                             │
│    ┌──────────────────────────────────────────────────────────────────────────┐ │
│    │ PHASE 5: SYNTHESIS                                                        │ │
│    │   register_new_sources(sources_md)     # Add sources with unique IDs     │ │
│    │   update_detail_files()                # timeline, people, cases, etc.   │ │
│    │   update_summary_md()                  # Key findings + embedded sources │ │
│    │   log_iteration(iterations_md)         # Progress tracking               │ │
│    │   add_verification_results() if checkpoint_ran                           │ │
│    └──────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                             │
│    ┌──────────────────────────────────────────────────────────────────────────┐ │
│    │ TERMINATION CHECK                                                         │ │
│    │                                                                            │ │
│    │   ALL conditions must be TRUE:                                           │ │
│    │   ✓ iteration >= 10                          # Hard minimum              │ │
│    │   ✓ verification_score >= 90                 # Quality gate              │ │
│    │   ✓ no_unexplored_threads()                  # All threads exhausted     │ │
│    │   ✓ prosecution_case_complete()              # Accusations addressed     │ │
│    │   ✓ defense_case_complete()                  # Defenses addressed        │ │
│    │   ✓ conspiracy_theories_addressed()          # Theories have verdicts    │ │
│    │   ✓ all_accusations_fact_checked()           # Both sides verified       │ │
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
| Regular interval | Every 5 iterations (5, 10, 15, 20...) |
| Saturation claim | When claiming "no more threads" |
| Completion claim | Before marking investigation COMPLETE |
| User request | When user says "wrap up" |

### Verification Score Calculation

```python
score = 0

# Core completeness (40 points)
if all_people_investigated:           score += 10
if all_claims_categorized:            score += 10
if timeline_complete:                 score += 10
if source_provenance_traced:          score += 10

# Both-sides coverage (30 points)
if prosecution_case_built:            score += 10
if defense_case_steelmanned:          score += 10
if conspiracy_theories_addressed:     score += 10

# Verification quality (30 points)
if cross_model_critique_passed:       score += 10
if all_accusations_fact_checked:      score += 10
if no_unexamined_major_claims:        score += 10

# Total: 100 points possible
# Threshold: >= 90 to complete
```

### Anti-Gaming Rules

| Do NOT | Why |
|--------|-----|
| Skip verification | Self-deception risk |
| Claim saturation early | Avoids thorough investigation |
| Cherry-pick accusations | Biased coverage |
| Ignore conspiracy theories | They spread if not debunked |
| Round up scores | False completion signal |

---

## Agent Orchestration Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLAUDE (Orchestrator)                          │
│  - Runs the outer loop (10+ iterations)                                     │
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
| **Gemini** | `mcp-gemini` | `deep_research` | Fast, broad coverage (5-15 min) |
| **OpenAI** | `mcp-openai` | `deep_research` | Maximum depth, complex reasoning (10-30 min) |
| **XAI** | `mcp-xai` | `research` | Real-time, social media, breaking news |
| **Gemini (critique)** | `mcp-gemini` | `generate_text` | Cross-model verification |

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
    ├── prosecution.md                # Full prosecution case
    ├── defense.md                    # Full defense case
    ├── fact-check.md                 # Claim verdicts (both sides)
    ├── theories.md                   # Conspiracy theories analysis
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
| `prosecution.md` | Case against | Unlimited | No (uses source IDs) |
| `defense.md` | Case for | Unlimited | No (uses source IDs) |
| `fact-check.md` | Claim verdicts | Unlimited | No (uses source IDs) |
| `theories.md` | Conspiracy analysis | Unlimited | No (uses source IDs) |
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

```markdown
# Investigation: [Topic]

**Case ID**: inv-YYYYMMDD-HHMMSS
**Status**: [IN PROGRESS | COMPLETE]
**Verification Score**: [X]/100
**Last Updated**: [datetime]

> **Quick Links**: [Timeline](timeline.md) | [People](people.md) |
> [Prosecution](prosecution.md) | [Defense](defense.md) |
> [Fact-Check](fact-check.md) | [Theories](theories.md)

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

## Conspiracy Theories: Quick Verdicts

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
| Final verification score | [X]/100 |
| Total sources | [N] |
| Primary sources | [N] |
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

### prosecution.md

```markdown
# The Prosecution Case: [Topic]

**Case**: inv-YYYYMMDD-HHMMSS

---

## Summary

The strongest case for culpability rests on three pillars:
1. Knowledge (they knew)
2. Inaction (they didn't act)
3. Coverup (they hid it)

---

## Argument 1: They Knew

### Evidence
- Internal email dated Jan 15, 2024 [S002]
- Testimony of whistleblower [S007]
- Board minutes [S003]

### Strength: HIGH
Multiple independent sources confirm awareness.

---

## Argument 2: They Didn't Act

### Evidence
- 60-day gap between knowledge and action [S001] [S002]
- Similar issues at competitor led to immediate response [S030]

### Strength: MEDIUM
Timeline established, but "reasonable response time" is debatable.

---

## Argument 3: They Hid It

### Evidence
- Public statement contradicts internal docs [S005] vs [S002]
- Deleted emails referenced in discovery [S008]

### Strength: MEDIUM
Gap exists, but "coverup" vs "mistake" is interpretive.

---

## Overall Prosecution Strength: [0.6, 0.8]
```

### defense.md

```markdown
# The Defense Case: [Topic]

**Case**: inv-YYYYMMDD-HHMMSS

---

## Summary

The strongest case for innocence/mitigation:
1. Industry standard (everyone does it)
2. Good faith effort (they tried)
3. Hindsight bias (not foreseeable)

---

## Argument 1: Industry Standard

### Evidence
- Industry report showing common practice [S040]
- Competitor behavior [S041]

### Strength: MEDIUM
Establishes context, but "everyone does it" isn't exculpatory.

---

## Argument 2: Good Faith Effort

### Evidence
- Internal investigation launched [S004]
- Outside counsel retained [S042]
- Remediation plan [S043]

### Strength: HIGH
Documented efforts to address once aware.

---

[... continues ...]
```

### fact-check.md

```markdown
# Fact-Check: [Topic]

**Case**: inv-YYYYMMDD-HHMMSS
**Claims Checked**: [N]

---

## Prosecution Claims

| # | Claim | Claimant | Verdict | Evidence |
|---|-------|----------|---------|----------|
| P1 | CEO knew by January | NYT [S002] | TRUE | Confirmed by [S001] [S003] |
| P2 | Board was warned | Whistleblower [S007] | PARTIALLY TRUE | Minutes show discussion [S003], but "warning" language disputed |
| P3 | Coverup occurred | Lawsuit [S001] | UNPROVEN | Gap exists but intent unclear |

### P1: CEO Knew by January
- **Claim**: CEO was aware of the issue by January 2024
- **Source**: NYT article [S002]
- **Verdict**: TRUE
- **Supporting Evidence**:
  - Internal email [S001] dated Jan 15 with CEO on distribution
  - Board minutes [S003] show CEO present at Jan 20 discussion
- **Contradicting Evidence**: None found

### P2: Board Was Warned
- **Claim**: Board received explicit warning about risks
- **Source**: Whistleblower testimony [S007]
- **Verdict**: PARTIALLY TRUE
- **Supporting Evidence**:
  - Board minutes [S003] show agenda item "Risk Discussion"
- **Contradicting Evidence**:
  - Minutes characterize as "routine review" not "warning"
  - Board member statement [S044] disputes characterization
- **Assessment**: Issue was discussed, but "warning" characterization is disputed

[... continues ...]

---

## Defense Claims

| # | Claim | Claimant | Verdict | Evidence |
|---|-------|----------|---------|----------|
| D1 | Response was timely | Company statement [S050] | DISPUTED | Industry comparison mixed |
| D2 | No intent to deceive | Legal filing [S051] | UNPROVEN | Circumstantial either way |

[... continues ...]
```

### theories.md

```markdown
# Conspiracy Theories: [Topic]

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
**Verification Score**: [X]/100

---

## Progress Summary

| Iteration | Date | Focus | New Sources | Key Findings |
|-----------|------|-------|-------------|--------------|
| 1 | 2026-01-05 | Initial research | 15 | Basic narrative |
| 2 | 2026-01-05 | People investigation | 8 | CEO timeline |
| 3 | 2026-01-05 | Defense case | 12 | Mitigating factors |
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
- 3 conspiracy theories noted for investigation

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

> "The investigation has solid coverage of prosecution arguments but
> defense case is underdeveloped. Specific gaps:
> 1. No analysis of industry standard practices
> 2. Whistleblower credibility not assessed
> 3. 'Coverup' theory asserted but 'Government coverup' conspiracy not addressed"

### Completeness Score: 68/100

| Category | Points | Notes |
|----------|--------|-------|
| People investigated | 10/10 | All key figures covered |
| Claims categorized | 8/10 | Some prosecution claims unchecked |
| Timeline complete | 10/10 | Good |
| Sources traced | 8/10 | Some circular reporting |
| Prosecution case | 10/10 | Strong |
| Defense case | 4/10 | **Underdeveloped** |
| Conspiracy theories | 2/10 | **Not addressed** |
| Cross-model critique | 6/10 | Done, gaps found |
| Accusations fact-checked | 6/10 | Partial |
| No unexamined claims | 4/10 | Several remain |

### Gaps to Address
1. Build out defense case with industry context
2. Assess whistleblower credibility
3. Address "Government coverup" theory
4. Fact-check remaining prosecution claims

### Verdict: CONTINUE
Score 68 < 90 threshold. Must address gaps.

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
        iteration >= 10 and                    # Hard minimum
        verification_score >= 90 and           # Quality gate
        no_unexplored_threads() and            # All threads exhausted
        prosecution_case_complete() and        # Accusations addressed
        defense_case_complete() and            # Defenses addressed
        conspiracy_theories_addressed() and    # Theories have verdicts
        all_accusations_fact_checked()         # Both sides verified
    )
```

### What Counts as an Unexplored Thread?

- Person mentioned but not investigated
- Claim asserted but provenance not traced
- Contradiction identified but not explored
- Date referenced but timeline not verified
- Source cited but not cross-checked
- Defense argument not steelmanned
- Prosecution argument not built
- **Accusation not fact-checked** (either side)
- **Conspiracy theory without verdict**

---

## Commit Strategy

### Checkpoints

| After | Commit Message |
|-------|----------------|
| Case creation | `case [id]: Initial setup` |
| Every 5 iterations | `case [id]: Iterations [N-M] + verification` |
| Verification pass | `case [id]: Verification passed ([X]/100)` |
| Investigation complete | `case [id]: Investigation complete` |

---

## Research Angles

### Investigation Angles (MUST cover all)

| Angle | What to Look For |
|-------|------------------|
| **Mainstream** | Consensus narrative, major outlet coverage |
| **Official** | Court filings, government documents, FOIA |
| **Prosecution** | Evidence of wrongdoing, accusations, criticisms |
| **Defense** | Rebuttals, context, exculpatory evidence |
| **Fringe/Conspiracy** | Alternative theories to debunk |
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
