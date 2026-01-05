# AgenticInvestigator Investigation

You are initiating a **deep investigative journalism research project**. This framework produces exhaustive, rigorous reporting on contested topics through **relentless iteration with built-in verification**.

---

## CORE PHILOSOPHY: INSATIABLE CURIOSITY + VERIFICATION HONESTY

**The key to AgenticInvestigator is to be INSATIABLY CURIOUS and RUTHLESSLY HONEST.**

Every finding triggers more questions. Every person mentioned gets investigated. Every source gets traced. Every contradiction gets explored. Every gap gets filled. Every claim from BOTH sides gets fact-checked.

### The Verified Looping Principle

```
DO NOT STOP EARLY. DO NOT DECEIVE YOURSELF.

MINIMUM 10 outer loop iterations.
VERIFICATION CHECKPOINT every 5 iterations.
FINAL VERIFICATION before claiming complete.

Only stop when ALL conditions are true:
  1. You have completed at least 10 iterations
  2. Verification score >= 90%
  3. There are genuinely no unexplored avenues remaining
  4. Both prosecution AND defense cases are complete
  5. All conspiracy theories have been addressed
  6. All major accusations from both sides fact-checked
```

---

## USAGE

```
/investigate                    # Continue active/last case (or create new if none exists)
/investigate [topic]            # Continue current case with new research on [topic]
/investigate --new              # Explicitly start new investigation
/investigate --new [topic]      # Start new investigation on specific topic
/investigate [case-id]          # Resume specific case by ID
```

**Default behavior**: Continue the current case. Only creates new case if `--new` flag is used OR no case exists.

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

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `summary.md` | **THE DELIVERABLE** - shareable, self-contained | Every iteration |
| `sources.md` | Source registry - append-only, never delete | As sources found |
| `timeline.md` | Chronological events | As timeline grows |
| `people.md` | Person profiles | As people investigated |
| `prosecution.md` | Case against | As evidence found |
| `defense.md` | Case for | As evidence found |
| `fact-check.md` | Claim verdicts | As claims verified |
| `theories.md` | Conspiracy analysis | As theories addressed |
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
│                    OUTER LOOP (MINIMUM 10 ITERATIONS)                            │
│                                                                                  │
│  for iteration = 1 to ∞:                                                        │
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
│    │  - Categorize: prosecution claims, defense claims, conspiracy theories    │ │
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
│    │  PHASE 4: VERIFICATION CHECKPOINT                                         │ │
│    │  (Run every 5 iterations OR when claiming saturation)                     │ │
│    │                                                                            │ │
│    │  → Cross-model critique (Gemini critiques Claude's work)                  │ │
│    │  → Identify ALL unexplored accusations (both sides)                       │ │
│    │  → Identify ALL conspiracy theories to address                            │ │
│    │  → Fact-check ALL major claims from prosecution AND defense               │ │
│    │  → Score completeness (0-100)                                             │ │
│    │  → List specific gaps                                                     │ │
│    │                                                                            │ │
│    │  if verification_score < 90 OR gaps exist:                                │ │
│    │      FORCE CONTINUE → address gaps in next iteration                      │ │
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
│    │  ✓ iteration >= 10                                                        │ │
│    │  ✓ verification_score >= 90                                               │ │
│    │  ✓ no unexplored threads                                                  │ │
│    │  ✓ prosecution case complete                                              │ │
│    │  ✓ defense case complete                                                  │ │
│    │  ✓ conspiracy theories addressed                                          │ │
│    │  ✓ all major accusations fact-checked                                     │ │
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
1. Was --new flag provided?
   YES → Create new case (STEP 0B)
   NO  → Continue to step 2

2. Was a specific case-id provided?
   YES → Load that case (STEP 0A)
   NO  → Continue to step 3

3. Does cases/.active exist?
   YES → Read active case-id (STEP 0A)
   NO  → Continue to step 4

4. Are there any case folders in cases/?
   YES → Use most recent by timestamp (STEP 0A)
   NO  → Create new case (STEP 0B)
```

### STEP 0A: CONTINUE CASE

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
| **Prosecution** | Evidence of wrongdoing, accusations, criticisms |
| **Defense** | Rebuttals, context, exculpatory evidence |
| **Fringe/Conspiracy** | Alternative theories, debunkable claims |
| **Social** | X/Twitter sentiment, viral claims |
| **Timeline** | Chronological reconstruction |
| **People** | Individual backgrounds, motivations |
| **Money** | Financial flows, incentives |

---

## PHASE 2: EXTRACTION

### Categorize Everything Found

From all research, extract and categorize:

```
claims = {
    prosecution_claims: [],    # Accusations, criticisms, evidence of wrongdoing
    defense_claims: [],        # Rebuttals, context, exculpatory evidence
    conspiracy_theories: [],   # Fringe claims to investigate/debunk
    contested_facts: [],       # Where sources disagree
}

people = []                    # Everyone mentioned - need investigation
dates = []                     # Timeline events - need verification
contradictions = []            # Discrepancies to resolve
```

### Flag for Verification

Mark items that MUST be fact-checked:
- Any claim from partisan sources
- Any claim that damages someone's reputation
- Any claim that exonerates someone
- Any conspiracy theory
- Any "too good to be true" evidence

---

## PHASE 3: INVESTIGATION

### For EVERY Person Found

```
for each person in newly_discovered_people:
    research(person.background)
    research(person.role_in_events)
    research(person.what_they_knew)
    research(person.what_they_did)
    research(person.where_now)
    register_sources(sources.md)       # Get [SXXX] IDs
    add_profile(people.md)             # With source citations
    update_summary(summary.md)         # Key people table
```

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

**Run this phase every 5 iterations OR when claiming the investigation is saturated.**

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
    - Unexplored accusations from EITHER side
    - Conspiracy theories that haven't been addressed
    - Defense arguments that haven't been steelmanned
    - Prosecution arguments that haven't been built
  prompt: |
    Review this investigation:

    [Current summary.md content]

    Also consider the detail files:
    - prosecution.md: [summary of prosecution case]
    - defense.md: [summary of defense case]
    - theories.md: [list of theories addressed]
    - fact-check.md: [claims checked vs unchecked]

    Provide:
    1. Completeness score (0-100)
    2. List of specific gaps
    3. Unexplored accusations (prosecution side)
    4. Unexplored accusations (defense side)
    5. Conspiracy theories needing address
    6. Unverified claims that should be fact-checked
```

### Step 2: Accusation Audit

Explicitly list ALL accusations from both sides and their status:

```markdown
## Accusation Audit

### Prosecution/Critical Accusations
| Accusation | Source | Status | Evidence |
|------------|--------|--------|----------|
| [accusation] | [who says it] | VERIFIED/DEBUNKED/PARTIAL/UNEXAMINED | [evidence] |

### Defense Arguments
| Defense | Source | Status | Evidence |
|---------|--------|--------|----------|
| [defense] | [who says it] | VERIFIED/DEBUNKED/PARTIAL/UNEXAMINED | [evidence] |

### Conspiracy Theories
| Theory | Source | Status | Verdict |
|--------|--------|--------|---------|
| [theory] | [who promotes] | DEBUNKED/UNPROVEN/PARTIAL | [verdict] |
```

### Step 3: Verification Score

Calculate completeness:

```
score = 0

# Core completeness (40 points)
if all_people_investigated: score += 10
if all_claims_categorized: score += 10
if timeline_complete: score += 10
if source_provenance_traced: score += 10

# Both-sides coverage (30 points)
if prosecution_case_built: score += 10
if defense_case_steelmanned: score += 10
if conspiracy_theories_addressed: score += 10

# Verification quality (30 points)
if cross_model_critique_done: score += 10
if all_accusations_fact_checked: score += 10
if no_unexamined_major_claims: score += 10
```

### Step 4: Gap List

If score < 90, list SPECIFIC gaps:

```markdown
## Verification Gaps (Score: [X]/100)

### Must Address Before Complete:
1. [Specific gap] → Action: [what to research]
2. [Specific gap] → Action: [what to research]
3. [Specific gap] → Action: [what to research]
```

### Step 5: Verdict

```
if score >= 90 AND no_gaps:
    PROCEED TO TERMINATION CHECK
else:
    FORCE CONTINUE - address gaps in next iteration(s)
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
   prosecution.md → Prosecution evidence and arguments
   defense.md     → Defense evidence and arguments
   fact-check.md  → Claim verifications
   theories.md    → Conspiracy theory analysis
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

### summary.md Must Be Self-Contained

At the end of each synthesis:
1. Update executive summary, key findings, verdict
2. **Embed the complete source list** from sources.md
3. summary.md should be shareable standalone with full attribution

### Detail File Update Pattern

Each detail file uses source IDs for citations:

```markdown
# In people.md:
**What They Knew**: Aware of issue by Jan 2024 [S001] [S002]

# In prosecution.md:
Internal email dated Jan 15, 2024 [S002] shows awareness.

# In fact-check.md:
| Claim | Verdict | Evidence |
|-------|---------|----------|
| CEO knew by January | TRUE | Confirmed by [S001] [S003] |
```

### File Structure Reference

See `architecture.md` for complete file templates and structure definitions.

---

## TERMINATION CHECK

### ALL Must Be True

```python
def can_terminate():
    return (
        iteration >= 10 and
        verification_score >= 90 and
        no_unexplored_threads() and
        prosecution_case_complete() and
        defense_case_complete() and
        conspiracy_theories_addressed() and
        all_major_accusations_fact_checked()
    )
```

### Before Stopping, Verify:

- [ ] All people mentioned have been investigated
- [ ] All claims categorized (verified/contested/unverified/false)
- [ ] All contradictions analyzed
- [ ] Timeline complete
- [ ] Source provenance traced for major claims
- [ ] Cross-model critique completed
- [ ] Prosecution case built (strongest version)
- [ ] Defense case built (strongest version)
- [ ] All conspiracy theories addressed with verdicts
- [ ] All major accusations from both sides fact-checked
- [ ] Verification score >= 90
- [ ] Open questions listed (genuinely unanswerable)

---

## HARD RULES

1. **MINIMUM 10 ITERATIONS** - Do not stop before iteration 10
2. **VERIFICATION CHECKPOINT EVERY 5 ITERATIONS** - Cannot skip
3. **VERIFICATION SCORE >= 90 TO COMPLETE** - Cannot finish below 90
4. **BOTH SIDES FACT-CHECKED** - Prosecution AND defense claims verified
5. **CONSPIRACY THEORIES ADDRESSED** - All major theories get verdicts
6. **LOOP ON ALL POINTS** - Every person, claim, date, contradiction
7. **USE ALL THREE RESEARCH ENGINES** - Gemini, OpenAI, XAI
8. **CROSS-MODEL CRITIQUE** - Gemini critiques Claude's work
9. **BUILD BOTH CASES** - Prosecution AND defense, strongest versions
10. **NEVER FABRICATE** - If you can't find evidence, say so
11. **PROBABILITY RANGES** - [0.6, 0.8] not 0.7
12. **LET READERS DECIDE** - Present evidence, don't dictate conclusions
13. **EVERY CLAIM NEEDS A SOURCE ID** - No [SXXX] = no claim. Source attribution is sacred.
14. **APPEND-ONLY SOURCES** - Never renumber or delete source IDs
15. **SUMMARY.MD SELF-CONTAINED** - Must embed full source list, shareable standalone

---

## VERIFICATION TRIGGERS

The verification checkpoint is MANDATORY at:

1. **Iteration 5, 10, 15, 20...** (every 5 iterations)
2. **When claiming "saturation"** (no more threads)
3. **When claiming "complete"** (before final status)
4. **When asked to stop** (user says "wrap up")

If verification fails (score < 90 or gaps exist), you MUST continue investigating.

---

## ANTI-GAMING RULES

Do NOT:
- Skip verification because "it's obviously done"
- Claim saturation to avoid more iterations
- Cherry-pick which accusations to fact-check
- Ignore conspiracy theories because they're "obviously false"
- Stop at iteration 10 if verification score < 90
- Present incomplete work as "good enough"

The verification checkpoint catches self-deception. Trust the process.

---

## EXAMPLE: VERIFICATION CHECKPOINT OUTPUT

```markdown
## Verification Checkpoint - Iteration 15

### Cross-Model Critique (Gemini)
"The investigation has thoroughly covered the main events but has gaps in:
1. Opposition claims about regulatory failures - UNEXAMINED
2. The leaked memo claim - mentioned but not fully contextualized
3. Systemic failure claims - dismissed without investigation
4. Defense argument about prior approvals - not fully verified"

### Completeness Score: 72/100

| Category | Points | Notes |
|----------|--------|-------|
| People investigated | 10/10 | All key people covered |
| Claims categorized | 8/10 | Some missing |
| Timeline complete | 10/10 | Good |
| Sources traced | 8/10 | Some gaps |
| Prosecution case | 10/10 | Strong |
| Defense case | 6/10 | Needs work |
| Conspiracy theories | 4/10 | Not addressed |
| Cross-model critique | 6/10 | Done but gaps found |
| Accusations fact-checked | 5/10 | Many unexamined |
| No unexamined claims | 5/10 | Several remain |

### Gaps to Address
1. Fact-check regulatory failure claims
2. Research the leaked memo context
3. Investigate systemic failure claims
4. Verify prior approval defense argument
5. Address coverup conspiracy theory
6. Address political motivation theory

### Verdict: CONTINUE
Score 72 < 90 threshold. 6 gaps identified. Must continue.
```

---

## WHEN RESUMING A CASE

1. Read `summary.md` for current state and key findings
2. Read `iterations.md` for progress log and last verification checkpoint
3. Read `sources.md` to determine next source ID (e.g., if last is [S047], next is [S048])
4. If verification_score < 90: address listed gaps from iterations.md
5. If verification_score >= 90: check termination conditions
6. Continue from next iteration number

### Quick Resume Checklist

```
□ Read summary.md header (status, verification score, iteration count)
□ Read iterations.md (last iteration, verification gaps)
□ Read sources.md (find next available source ID)
□ Identify gaps to address in next iteration
□ Continue investigation loop
```
