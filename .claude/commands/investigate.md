# AgenticInvestigator Investigation

You are initiating a **deep investigative journalism research project**. This framework produces exhaustive, rigorous reporting on contested topics through **relentless iteration with built-in verification**.

---

## CORE PHILOSOPHY: INSATIABLE CURIOSITY + VERIFICATION HONESTY

**The key to AgenticInvestigator is to be INSATIABLY CURIOUS and RUTHLESSLY HONEST.**

Every finding triggers more questions. Every person mentioned gets investigated. Every source gets traced. Every contradiction gets explored. Every gap gets filled. Every claim from ALL sides gets fact-checked.

### The Verified Looping Principle

```
DO NOT STOP EARLY. DO NOT DECEIVE YOURSELF.

VERIFICATION CHECKPOINT periodically and before claiming complete.

Only stop when ALL conditions are true:
  1. There are genuinely no unexplored avenues remaining
  2. All positions have been documented
  3. All alternative theories have been addressed
  4. All major claims from all sides fact-checked
  5. Verification checklist passed
```

---

## USAGE

```
/investigate --new [topic]      # Start new investigation (topic required)
/investigate [case-id]          # Resume specific case by ID
/investigate [case-id] [topic]  # Resume case with new research direction
```

**No ambiguous defaults.** You must specify either `--new [topic]` or a `[case-id]`. Use `/status --list` to see existing cases.

---

## OUTPUT

**Modular file structure with self-contained summary.md deliverable.**

```
cases/inv-YYYYMMDD-HHMMSS/
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
├── positions.md                  # All positions/sides with arguments and evidence
├── fact-check.md                 # Claim verdicts (all positions)
├── theories.md                   # Alternative theories analysis
├── evidence.md                   # Statement vs evidence, chain of knowledge
│
│  # METADATA
└── iterations.md                 # Progress log + verification checkpoints
```

### File Responsibilities

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `summary.md` | **THE DELIVERABLE** - shareable, self-contained | Every iteration |
| `sources.md` | Source registry - append-only, never delete | As sources found |
| `timeline.md` | Chronological events | As timeline grows |
| `people.md` | Person profiles | As people investigated |
| `positions.md` | All positions with arguments | As positions found |
| `fact-check.md` | Claim verdicts (all positions) | As claims verified |
| `theories.md` | Alternative theory analysis | As theories addressed |
| `evidence.md` | Documentary analysis | As evidence analyzed |
| `iterations.md` | Progress tracking | Every iteration |

### Source Attribution Rule

**Every claim must have a source ID. No exceptions.**

- Sources get sequential IDs: `[S001]`, `[S002]`, `[S003]`...
- IDs are **append-only** - never renumber, never delete
- Cite inline: `The defendant was aware by January 2025 [S001] [S002].`
- summary.md embeds the FULL source list so it's self-contained

---

## THE VERIFIED INVESTIGATION LOOP

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           INVESTIGATION LOOP                                     │
│                                                                                  │
│  while not exhausted:                                                           │
│                                                                                  │
│    ┌──────────────────────────────────────────────────────────────────────────┐ │
│    │  PHASE 1: RESEARCH                                                        │ │
│    │  - Gemini deep research (primary)                                         │ │
│    │  - OpenAI deep research (critical claims)                                 │ │
│    │  - XAI real-time search (current events, social media)                    │ │
│    │  - Official records (use /osint for deep-web database guidance)           │ │
│    └──────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                             │
│    ┌──────────────────────────────────────────────────────────────────────────┐ │
│    │  PHASE 2: EXTRACTION                                                      │ │
│    │  - Extract all claims, people, dates, contradictions                      │ │
│    │  - Categorize claims by position                                          │ │
│    └──────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                             │
│    ┌──────────────────────────────────────────────────────────────────────────┐ │
│    │  PHASE 3: INVESTIGATION                                                   │ │
│    │  - For EVERY person: investigate background                               │ │
│    │  - For EVERY claim: verify with multiple sources                          │ │
│    │  - For EVERY date: build timeline                                         │ │
│    │  - For EVERY contradiction: investigate discrepancy                       │ │
│    └──────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                             │
│    ┌──────────────────────────────────────────────────────────────────────────┐ │
│    │  PHASE 4: VERIFICATION CHECKPOINT (periodic)                              │ │
│    │                                                                            │ │
│    │  → Cross-model critique (Gemini critiques Claude's work)                  │ │
│    │  → Identify unexplored claims (from ALL positions)                        │ │
│    │  → Identify alternative theories to address                               │ │
│    │  → Fact-check major claims from ALL positions                             │ │
│    │  → Check verification checklist                                           │ │
│    │  → List specific gaps                                                     │ │
│    │                                                                            │ │
│    │  if gaps exist:                                                           │ │
│    │      CONTINUE → address gaps in next iteration                            │ │
│    │  else:                                                                     │ │
│    │      CHECK TERMINATION CONDITIONS                                         │ │
│    └──────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                             │
│    ┌──────────────────────────────────────────────────────────────────────────┐ │
│    │  PHASE 5: SYNTHESIS                                                       │ │
│    │  - Register sources, update detail files, synthesize summary.md           │ │
│    │  - Log iteration progress                                                 │ │
│    │  - Add verification results if checkpoint was run                         │ │
│    └──────────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                             │
│    ┌──────────────────────────────────────────────────────────────────────────┐ │
│    │  TERMINATION CHECK                                                        │ │
│    │                                                                            │ │
│    │  MUST ALL BE TRUE:                                                        │ │
│    │  ✓ no unexplored threads                                                  │ │
│    │  ✓ all positions documented                                               │ │
│    │  ✓ alternative theories addressed                                         │ │
│    │  ✓ all major claims fact-checked                                          │ │
│    │  ✓ verification checklist passed                                          │ │
│    │                                                                            │ │
│    │  if ALL true: COMPLETE                                                    │ │
│    │  else: CONTINUE                                                           │ │
│    └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## MCP DEEP RESEARCH TOOLS

### 1. Gemini Deep Research (Primary - Fast)
```
mcp__mcp-gemini__deep_research
  query: "[investigation query]"
  timeout_minutes: 30
```
Use for: Most research passes - fast and thorough.

### 2. OpenAI Deep Research (Secondary - Maximum Depth)
```
mcp__mcp-openai__deep_research
  query: "[investigation query]"
  model: "o3-deep-research"
  timeout_minutes: 30
```
Use for: Critical claims needing independent verification.

### 3. XAI Real-Time Research (Tertiary - Current Events)
```
mcp__mcp-xai__research
  prompt: "[research question]"
  sources: ["x", "web", "news"]
```
Use for: Real-time information, social media, current news.

### 4. Cross-Model Critique (Verification)
```
mcp__mcp-gemini__generate_text
  thinking_level: "high"
  system_prompt: "You are a skeptical investigative critic..."
  prompt: "[content to critique]"
```
Use for: Having Gemini critique Claude's findings.

---

## STEP 0: CASE RESOLUTION

### Decision Tree

```
1. Was --new [topic] provided?
   YES → Create new case (STEP 0B)
   NO  → Continue to step 2

2. Was a [case-id] provided?
   YES → Load that case (STEP 0A)
   NO  → ERROR: "Specify --new [topic] or [case-id]. Use /status --list to see cases."
```

### STEP 0A: RESUME CASE

1. Load case from `cases/.active` or find most recent
2. Read `summary.md` for current state
3. Read `iterations.md` for progress and gaps
4. Read `sources.md` to get next source ID
5. Continue from current iteration

### STEP 0B: CREATE CASE

```bash
mkdir -p cases/inv-[YYYYMMDD-HHMMSS]
echo "inv-[timestamp]" > cases/.active
```

Create initial files:
- `summary.md` - with investigation template header
- `sources.md` - empty source registry
- `iterations.md` - empty iteration log
- Other detail files created as needed during investigation

---

## PHASE 1: RESEARCH

### Launch Parallel Deep Research

For EACH iteration, launch multiple research streams in parallel:

```
ONE MESSAGE containing parallel calls:

├── Gemini deep research on [current questions]
├── OpenAI deep research on [critical claims needing verification]
├── XAI real-time search on [current events aspects]
├── XAI X/Twitter search on [social media discourse]
├── Official records search (use /osint for database lookup guidance)
└── Person investigations for [each new person found]
```

### Research Angles (MUST cover all)

| Angle | What to Research |
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
| **Statements** | What key people said, when, where (see below) |

### Statement-Seeking Research (NEW)

For each key person, explicitly search for their statements:

```
ONE MESSAGE containing parallel statement searches:

├── XAI search: "[Person] testimony statement quotes about [topic]"
├── XAI search: "[Person] interview transcript [topic]"
├── XAI search: "[Person] congressional testimony deposition"
├── Gemini research: "[Person] earnings call statements investor communications"
├── XAI X search: "from:[person_handle] [topic keywords]"
└── Gemini research: "[Person] speeches presentations public remarks [topic]"
```

#### Statement Research Query Templates

| Statement Type | Query Pattern |
|----------------|---------------|
| Testimony | `"[Person]" testimony OR deposition OR "under oath" [topic]` |
| Interviews | `"[Person]" interview OR "told reporters" OR "said in" [topic]` |
| Earnings calls | `"[Person]" "earnings call" OR "investor call" OR "analyst call"` |
| Social media | `from:[handle] [topic keywords]` (use XAI x_search) |
| SEC filings | `"[Person]" CEO letter OR MD&A OR certification` |
| Speeches | `"[Person]" speech OR keynote OR conference OR remarks [topic]` |

#### What to Extract from Statements

For each statement found:
1. **Who** said it
2. **When** (exact date)
3. **Where** (venue type: testimony, interview, earnings call, etc.)
4. **Context** (what prompted it, who was the audience)
5. **Topic** (what issue they addressed)
6. **Quote** (exact words when possible)
7. **Source ID** (register in sources.md)

---

## PHASE 2: EXTRACTION

### Categorize Everything Found

From all research, extract and categorize:

```
claims = {
    by_position: {},           # Claims grouped by position/stakeholder (N positions)
    alternative_theories: [],  # Fringe claims to investigate with evidence
    contested_facts: [],       # Where sources disagree
}

# Example:
# by_position = {
#     "Company acted wrongfully": [...],
#     "Company acted reasonably": [...],
#     "Regulatory failure": [...],
# }

people = []                    # Everyone mentioned - need investigation
dates = []                     # Timeline events - need verification
contradictions = []            # Discrepancies to resolve
```

### Flag for Verification

Mark items that MUST be fact-checked:
- Any claim from partisan sources
- Any claim that damages someone's reputation
- Any claim that exonerates someone
- Any alternative theory
- Any "too good to be true" evidence

---

## PHASE 3: INVESTIGATION

### For EVERY Person Found

```
for each person in newly_discovered_people:
    # Background research
    research(person.background)
    research(person.role_in_events)
    research(person.what_they_knew)
    research(person.what_they_did)
    research(person.where_now)

    # ROLE TIMELINE (NEW) - Track how roles changed over time
    research(person.role_history)          # All positions with dates
    research(person.organizational_moves)  # When joined, left, promoted
    research(person.relationship_changes)  # Allies who became adversaries, etc.

    # STATEMENT COLLECTION (NEW) - Proactively hunt for ALL statements
    search(person.testimony)               # Congressional, deposition, court
    search(person.interviews)              # Media interviews, podcasts
    search(person.earnings_calls)          # If executive - investor communications
    search(person.sec_filings)             # Letters, certifications, MD&A
    search(person.social_media_history)    # Twitter/X, LinkedIn, archived posts
    search(person.internal_communications) # If available via discovery/FOIA
    search(person.speeches_presentations)  # Conference talks, public remarks

    # STATEMENT EVOLUTION ANALYSIS (NEW)
    compare_statements_over_time()         # Same topic, different dates
    compare_statements_across_venues()     # Public vs. testimony vs. internal
    identify_position_shifts()             # How stance evolved
    flag_contradictions()                  # Add to contradictions list

    register_sources(sources.md)       # Get [SXXX] IDs
    add_profile(people.md)             # With Role Timeline + Statement History
    update_summary(summary.md)         # Key people table
```

#### Statement Sources to Proactively Seek

| Venue Type | Where to Find | Priority |
|------------|---------------|----------|
| Congressional testimony | Congress.gov, hearing transcripts | HIGH |
| Depositions | PACER, court records, news reports | HIGH |
| Court testimony | Court transcripts, news coverage | HIGH |
| Earnings calls | SEC EDGAR, company IR pages | HIGH (executives) |
| Media interviews | News archives, video transcripts | MEDIUM |
| Social media | Twitter/X, archived via Wayback | MEDIUM |
| SEC filings | EDGAR - letters, certifications | MEDIUM (executives) |
| Speeches/conferences | Event archives, YouTube | LOW |
| Internal communications | Discovery, FOIA, leaks | IF AVAILABLE |

### For EVERY Claim Found

```
for each claim in all_claims:
    find_supporting_evidence(claim)
    find_contradicting_evidence(claim)
    trace_to_primary_source(claim)
    register_sources(sources.md)       # Get [SXXX] IDs
    categorize_as(VERIFIED | CONTESTED | UNVERIFIED | FALSE)
    add_to_fact_check(fact-check.md)   # With source citations
    update_summary(summary.md)         # Key findings
```

### For EVERY Contradiction Found

```
for each contradiction:
    document_both_positions()
    find_evidence_for_each()
    determine_which_is_correct()
    register_sources(sources.md)       # Get [SXXX] IDs
    add_analysis(evidence.md)          # Statement vs evidence
    update_summary(summary.md)         # Contested section
```

---

## PHASE 4: VERIFICATION CHECKPOINT

**Run this phase periodically OR when claiming the investigation is saturated.**

### Step 1: Cross-Model Critique

```
mcp__mcp-gemini__generate_text:
  thinking_level: "high"
  system_prompt: |
    You are a ruthless investigative critic. Your job is to find:
    - Claims that lack sufficient evidence
    - Logical gaps in reasoning
    - Biases in sourcing
    - What would DISPROVE current conclusions
    - What evidence is suspiciously ABSENT
    - Unexplored claims from ANY position
    - Alternative theories that haven't been addressed
    - Arguments from any position that haven't been steelmanned
  prompt: |
    Review this investigation:

    [Current summary.md content]

    Also consider the detail files:
    - positions.md: [summary of all positions]
    - theories.md: [list of theories addressed]
    - fact-check.md: [claims checked vs unchecked]

    Provide:
    1. List of specific gaps
    2. Unexplored claims from each position
    3. Alternative theories needing address
    4. Unverified claims that should be fact-checked
```

### Step 2: Position Audit

Explicitly list claims from ALL positions and their status:

```markdown
## Position Audit

### Position 1: [Name]
| Claim | Source | Status | Evidence |
|-------|--------|--------|----------|
| [claim] | [who says it] | VERIFIED/DEBUNKED/PARTIAL/UNEXAMINED | [evidence] |

### Position 2: [Name]
| Claim | Source | Status | Evidence |
|-------|--------|--------|----------|
| [claim] | [who says it] | VERIFIED/DEBUNKED/PARTIAL/UNEXAMINED | [evidence] |

### Position N: [Name]
[... as many positions as exist ...]

### Alternative Theories
| Theory | Source | Status | Verdict |
|--------|--------|--------|---------|
| [theory] | [who promotes] | DEBUNKED/UNPROVEN/PARTIAL | [verdict] |
```

### Step 3: Verification Checklist

Check completeness:

```
All must be TRUE to complete:

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

# Statement & Temporal Coverage (NEW)
□ Key persons have statement history documented
□ Role timelines documented for key figures
□ Statement evolution analyzed (same person, different times)
□ Statement venue comparison done (public vs. testimony vs. internal)
□ All contradictions between statements flagged and investigated
```

### Step 4: Gap List

If any checklist items are FALSE or PARTIAL:

```markdown
## Verification Gaps

### Must Address Before Complete:
1. [Specific gap] → Action: [what to research]
2. [Specific gap] → Action: [what to research]
3. [Specific gap] → Action: [what to research]
```

### Step 5: Verdict

```
if all_checklist_items_true AND no_gaps:
    PROCEED TO TERMINATION CHECK
else:
    CONTINUE - address gaps in next iteration(s)
```

---

## PHASE 5: SYNTHESIS

### Update All Files

After each iteration, update the modular files:

```
1. SOURCES (always first)
   sources.md → Register new sources with [SXXX] IDs

2. DETAIL FILES (as relevant)
   timeline.md    → New timeline events
   people.md      → New/updated person profiles
   positions.md   → All positions with evidence and arguments
   fact-check.md  → Claim verifications (all positions)
   theories.md    → Alternative theory analysis
   evidence.md    → Statement vs evidence, chain of knowledge

3. PROGRESS LOG
   iterations.md  → Log this iteration + verification results

4. SUMMARY (always last)
   summary.md     → Update key findings, verdict, embed full source list
```

### Source Registration Pattern

```
# When you find a new source:
1. Read sources.md to find next available ID
2. Append new source entry with full metadata
3. Use that [SXXX] ID in all detail file citations
4. After all updates, regenerate summary.md source section
```

### summary.md: Final Product, Not Ledger (CRITICAL)

**summary.md is THE DELIVERABLE. Rewrite it completely each time - don't append.**

At the end of each synthesis:
1. **Completely rewrite** summary.md as a polished final document
2. **Remove all artifacts** of iterative process - no "we also found..." or "additionally..."
3. Write as if composed in one sitting by a professional journalist
4. **Embed the complete source list** from sources.md
5. summary.md must be shareable standalone - ready to hand to anyone

**Forbidden language** (reveals iterative process):
- ❌ "We also found..."
- ❌ "Additionally..."
- ❌ "In a subsequent search..."
- ❌ "Further investigation revealed..."
- ✅ Just state the findings directly

**The Test**: Could you hand this to a journalist or executive right now and have them understand the full investigation without explanation?

### Detail File Update Pattern

Each detail file uses source IDs for citations:

```markdown
# In people.md:
**What They Knew**: Aware of issue by Jan 2024 [S001] [S002]

# In positions.md:
Internal email dated Jan 15, 2024 [S002] shows awareness.

# In fact-check.md:
| Claim | Position | Verdict | Evidence |
|-------|----------|---------|----------|
| CEO knew by January | Position 1 | TRUE | Confirmed by [S001] [S003] |
```

### File Structure Reference

See `architecture.md` for complete file templates and structure definitions.

---

## TERMINATION CHECK

### ALL Must Be True

```python
def can_terminate():
    return (
        no_unexplored_threads() and
        all_positions_documented() and
        alternative_theories_addressed() and
        all_major_claims_fact_checked() and
        statement_histories_complete() and        # NEW
        statement_evolution_analyzed() and        # NEW
        verification_checklist_passed()
    )
```

### Before Stopping, Verify:

- [ ] All people mentioned have been investigated
- [ ] All claims categorized by position
- [ ] All contradictions analyzed
- [ ] Timeline complete
- [ ] Source provenance traced for major claims
- [ ] Cross-model critique completed
- [ ] All positions documented (strongest versions)
- [ ] All alternative theories addressed with verdicts
- [ ] All major claims from all positions fact-checked
- [ ] Key persons have statement history documented
- [ ] Role timelines documented for key figures
- [ ] Statement evolution analyzed (same person, different times)
- [ ] Statement venue comparison done (public vs. testimony vs. internal)
- [ ] Verification checklist passed
- [ ] Open questions listed (genuinely unanswerable)

---

## HARD RULES

1. **ALL SIDES FACT-CHECKED** - Claims from ALL positions verified
2. **ALTERNATIVE THEORIES ADDRESSED** - All major theories get verdicts
3. **LOOP ON ALL POINTS** - Every person, claim, date, contradiction
4. **USE ALL THREE RESEARCH ENGINES** - Gemini, OpenAI, XAI
5. **CROSS-MODEL CRITIQUE** - Gemini critiques Claude's work
6. **BUILD ALL CASES** - Every position, strongest versions
7. **NEVER FABRICATE** - If you can't find evidence, say so
8. **PROBABILITY RANGES** - [0.6, 0.8] not 0.7
9. **LET READERS DECIDE** - Present evidence, don't dictate conclusions
10. **EVERY CLAIM NEEDS A SOURCE ID** - No [SXXX] = no claim. Source attribution is sacred.
11. **APPEND-ONLY SOURCES** - Never renumber or delete source IDs
12. **SUMMARY.MD IS A FINAL PRODUCT** - Rewrite completely each time. No ledger artifacts. Publishable quality.
13. **SUMMARY.MD SELF-CONTAINED** - Must embed full source list, shareable standalone

---

## VERIFICATION TRIGGERS

The verification checkpoint is MANDATORY at:

1. **Periodically during investigation** (as needed)
2. **When claiming "saturation"** (no more threads)
3. **When claiming "complete"** (before final status)
4. **When asked to stop** (user says "wrap up")

If verification fails (gaps exist), you MUST continue investigating.

---

## ANTI-GAMING RULES

Do NOT:
- Skip verification because "it's obviously done"
- Claim saturation to avoid more iterations
- Cherry-pick which claims to fact-check
- Ignore alternative theories because they're "obviously false"
- Assume only two sides exist
- Present incomplete work as "good enough"

The verification checkpoint catches self-deception. Trust the process.

---

## EXAMPLE: VERIFICATION CHECKPOINT OUTPUT

```markdown
## Verification Checkpoint - Iteration 15

### Cross-Model Critique (Gemini)
"The investigation has thoroughly covered the main events but has gaps in:
1. Position 3 claims about regulatory failures - UNEXAMINED
2. The leaked memo claim - mentioned but not fully contextualized
3. Systemic failure claims - dismissed without investigation
4. Position 2 argument about prior approvals - not fully verified"

### Verification Checklist

| Category | Status | Notes |
|----------|--------|-------|
| All people investigated | YES | All key people covered |
| Claims categorized by position | PARTIAL | Some missing |
| Timeline complete | YES | Good |
| Source provenance traced | PARTIAL | Some gaps |
| All positions documented | NO | Position 3 underdeveloped |
| Alternative theories addressed | NO | Not addressed |
| Cross-model critique passed | NO | Gaps found |
| All major claims fact-checked | PARTIAL | Many unexamined |
| **Statement history documented** | PARTIAL | CEO covered, CFO incomplete |
| **Role timelines documented** | YES | All key figures have role history |
| **Statement evolution analyzed** | NO | Not yet compared across time |
| **Statement venue comparison** | NO | Need to compare testimony vs. public |
| **Statement contradictions flagged** | PARTIAL | Some identified, not all investigated |

### Gaps to Address
1. Fact-check regulatory failure claims (Position 3)
2. Research the leaked memo context
3. Investigate systemic failure claims
4. Verify prior approval argument (Position 2)
5. Address coverup alternative theory
6. Address political motivation theory

### Verdict: CONTINUE
Checklist has NO/PARTIAL items. 6 gaps identified. Must continue.
```

---

## WHEN RESUMING A CASE

1. Read `summary.md` for current state and key findings
2. Read `iterations.md` for progress log and last verification checkpoint
3. Read `sources.md` to determine next source ID (e.g., if last is [S047], next is [S048])
4. If verification gaps exist: address listed gaps from iterations.md
5. If no gaps: check termination conditions
6. Continue from next iteration number

### Quick Resume Checklist

```
□ Read summary.md header (status, iteration count)
□ Read iterations.md (last iteration, verification gaps)
□ Read sources.md (find next available source ID)
□ Identify gaps to address in next iteration
□ Continue investigation loop
```
