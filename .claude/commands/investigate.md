# AgenticInvestigator Investigation (Orchestrator Mode)

You are the **orchestrator**. You dispatch sub-agents and track state. You NEVER do research or analysis directly.

**See `framework/rules.md` for all canonical rules (sources, evidence, verification).**

---

## Usage

```
/investigate --new [topic]      # Start new investigation
/investigate [case-id]          # Resume specific case
/investigate [case-id] [topic]  # Resume with new research direction
```

---

## Core Philosophy: Dynamic Task Generation

Instead of fixed phases with hardcoded triggers, this system:
1. **Generates investigation tasks dynamically** based on what the case needs
2. **Enforces rigor through required perspectives** in every task generation cycle
3. **Runs adversarial review** to catch blind spots and biases
4. **Validates coverage metrics** before allowing termination
5. **Uses 20-framework checkpoint** as termination gate

**The LLM knows domain knowledge** (SEC filings, 990s, OSINT sources, investigative frameworks). We don't hardcode investigation angles—we generate them based on the specific case.

---

## Case Structure

See `framework/architecture.md` for full case structure and JSON schemas (`_state.json`, `_tasks.json`, `_coverage.json`, `_sources.json`, `_extraction.json`).

---

## Main Loop: Dynamic Task Generation

```
1. READ: _state.json, _tasks.json, _coverage.json, _sources.json
2. IF initial research not done:
     → RESEARCH phase (multi-engine)
     → EXTRACTION phase (parse findings)
     → SOURCE DISCOVERY phase (find case-specific data sources)
3. GENERATE TASKS: Using _sources.json + required perspectives + curiosity check
4. RUN ADVERSARIAL PASS: Generate counter-tasks
5. EXECUTE TASKS: Parallel where independent
6. UPDATE COVERAGE: Track metrics
7. CHECK TERMINATION GATES:
     - Coverage thresholds met?
     - No HIGH priority tasks pending?
     - Adversarial complete?
     - Rigor checkpoint passed?
     - Verification passed?
     - Quality checks passed?
8. IF not terminating:
     - Re-generate tasks based on new findings
     - LOOP
9. IF terminating:
     - SYNTHESIS
     - ARTICLE generation
     - Set status: COMPLETE
```

---

## Phase 1: RESEARCH (Initial)

Dispatch ALL in ONE message (parallel):

```
Task 1: Gemini deep research on [topic]
Task 2: OpenAI deep research on [topic critical claims]
Task 3: XAI multi-source search (x, web, news)
Task 4: X/Twitter discourse analysis
Task 5: Official records search (court, regulatory)
Task 6: Alternative theories search
```

Each saves to `research-leads/iteration-[N]-[engine].md`

---

## Phase 2: EXTRACTION

Single agent parses research-leads/, populates _extraction.json:

```json
{
  "people": [{"name", "role", "source_file", "needs_investigation", "affiliated_entities"}],
  "entities": [{"name", "type", "jurisdiction", "parent", "subsidiaries"}],
  "claims": [{"text", "position", "needs_verification", "subject_entity"}],
  "events": [{"date", "event", "entities_involved"}],
  "statements": [{"speaker", "role", "date", "venue", "summary"}],
  "contradictions": [{"description", "sources", "entities_involved"}],
  "sources_to_capture": [{"url", "type", "priority"}]
}
```

---

## Phase 2.5: SOURCE DISCOVERY

**Dynamically discover case-specific data sources.** Instead of relying on static reference files, use deep research to find sources tailored to THIS investigation.

```
Task tool:
  subagent_type: "general-purpose"
  description: "Discover case-specific data sources"
  prompt: |
    TASK: Discover investigative data sources for this case
    CASE: cases/[case-id]/

    Read _extraction.json for:
    - Entity types (corporation, nonprofit, person, government)
    - Industry/domain (infer from topic and entities)
    - Claim types (fraud, misconduct, corruption, safety, etc.)
    - Jurisdictions involved

    BASELINE SOURCES:
    Review framework/data-sources.md for commonly-used investigative sources.
    Select sources relevant to the entity types in this case.

    DISCOVERY:
    Use mcp__mcp-xai__research to find CASE-SPECIFIC sources:

    Query: "What specialized investigative databases, public records,
    regulatory filings, and archives are relevant for investigating
    [TOPIC] involving [ENTITY TYPES] in [INDUSTRY/DOMAIN]?

    Focus on:
    - Regulatory bodies specific to this industry and their public databases
    - Industry-specific registries and mandatory disclosure systems
    - Specialized archives that domain experts would know
    - Jurisdiction-specific public records
    - Deep-web databases NOT indexed by search engines
    - Niche sources for this specific type of investigation

    For each source: name, URL, what it contains, why relevant to THIS case."

    MERGE baseline + discovered sources.

    Write to _sources.json:
    {
      "baseline": [
        {"name": "...", "url": "...", "contains": "...", "category": "..."}
      ],
      "discovered": [
        {"name": "...", "url": "...", "contains": "...", "category": "...",
         "relevance": "Why this matters for THIS specific case"}
      ],
      "case_notes": "Brief explanation of source selection strategy"
    }

    RETURN: Source count (baseline + discovered), key discoveries
```

### Why Dynamic Discovery?

| Static Reference | Dynamic Discovery |
|------------------|-------------------|
| Generic sources for entity type | Sources specific to THIS case |
| May be stale | Always current |
| Misses novel investigation types | Adapts to any topic |
| One-size-fits-all | Tailored recommendations |

**Example**: For a pharmaceutical company investigation:
- Static: SEC EDGAR, OpenCorporates (generic corporate)
- Dynamic: FDA MAUDE, ClinicalTrials.gov adverse events, FDA warning letters, state pharmacy boards (case-specific)

### Feedback Loop

When investigation completes, valuable discovered sources can be added to `framework/data-sources.md` as baseline for future investigations. The system self-improves over time.

---

## Phase 3: TASK GENERATION (Core Innovation)

**This replaces hardcoded `/questions`, `/financial`, and fixed investigation phases.**

### Task Generation Prompt

```
Task tool:
  subagent_type: "general-purpose"
  description: "Generate investigation tasks"
  prompt: |
    TASK: Generate investigation tasks for this case
    CASE: cases/[case-id]/
    ITERATION: [N]

    Read _extraction.json, _sources.json, and current findings.

    CONTEXT:
    - Topic: [topic]
    - People identified: [list from _extraction.json]
    - Entities identified: [list with types]
    - Claims to verify: [list]
    - Open contradictions: [list]
    - Previous findings: [summary from summary.md]
    - Current coverage gaps: [from _coverage.json]

    AVAILABLE DATA SOURCES (from _sources.json):
    [List baseline and discovered sources with their URLs and what they contain]

    GENERATE TASKS WITH REQUIRED PERSPECTIVES.
    Use the discovered sources in _sources.json to inform your approach.

    For EACH perspective, generate at least one specific task IF APPLICABLE:

    □ MONEY/FINANCIAL — who benefits, funding sources, transactions, contracts
      Use relevant sources from _sources.json (financial, regulatory categories)

    □ TIMELINE/SEQUENCE — what happened when, causation chains, key dates
      Use relevant sources from _sources.json (court, regulatory, news categories)

    □ SILENCE — who's NOT talking, missing voices, declined comment
      Consider: Who should have statements but doesn't? Why?

    □ DOCUMENTS — paper trails, filings, records that should exist
      Use relevant sources from _sources.json - what records MUST exist?

    □ CONTRADICTIONS — conflicting accounts, changed stories
      Cross-reference statements using sources in _sources.json

    □ RELATIONSHIPS — connections, affiliations, conflicts of interest
      Use relevant sources from _sources.json (corporate, ownership categories)

    □ ALTERNATIVE HYPOTHESES — other explanations, competing theories
      Consider: What else could explain the facts? Steelman opposing view.

    □ ASSUMPTIONS — what are we taking for granted
      Consider: What would we need to be true that we haven't verified?

    □ COUNTERFACTUAL — what would prove us wrong
      Consider: What evidence would change our conclusions?

    □ BLIND SPOTS — what might we be missing
      Consider: What hasn't been investigated that should be?

    CURIOSITY CHECK (REQUIRED - generate at least 2 tasks):
    1. What would a MORE curious investigator ask?
    2. What's the most important thing we DON'T know?
    3. What would SURPRISE us if true?
    4. Who ELSE should we be talking to/about?
    5. What CONNECTIONS haven't we explored?

    For each task output JSON:
    {
      "id": "T[NNN]",
      "description": "Specific, actionable task",
      "perspective": "Money|Timeline|Silence|...|Curiosity",
      "entity": "Who/what this is about",
      "priority": "HIGH|MEDIUM|LOW",
      "rationale": "Why this matters to the case",
      "approach": "How to investigate (specific sources, tools)",
      "success_criteria": "What would constitute a finding"
    }

    FLAG any perspective with no applicable task (explain why N/A).

    Write to _tasks.json (append to existing tasks).
    Update _coverage.json with perspectives_covered.

    RETURN: Task count, perspectives covered, gaps flagged
```

---

## Phase 4: ADVERSARIAL PASS

**Runs after initial task generation. Forces uncomfortable questions.**

```
Task tool:
  subagent_type: "general-purpose"
  description: "Adversarial review of investigation"
  prompt: |
    TASK: Adversarial review - find blind spots and biases
    CASE: cases/[case-id]/

    Read _tasks.json (current tasks) and summary.md (current findings).

    ADVERSARIAL QUESTIONS:

    1. For each major claim being investigated:
       → What would DISPROVE it?
       → Generate task if not already covered.

    2. What's the STRONGEST argument for positions we haven't explored?
       → Steelman the opposing view.
       → Generate task to investigate that view.

    3. What assumptions are EMBEDDED in these tasks?
       → What are we taking for granted?
       → Generate task to test assumptions.

    4. What evidence would completely CHANGE our conclusions?
       → What's the "smoking gun" we should look for?
       → Generate task to search for it.

    5. What questions would the SUBJECT refuse to answer?
       → What's uncomfortable?
       → Generate task to investigate anyway.

    6. Who BENEFITS from us not investigating something?
       → What's being hidden?
       → Generate task to uncover it.

    Output adversarial tasks in same JSON format.
    Write to _tasks.json under "adversarial_tasks" array.
    Update _state.json: adversarial_complete → true

    RETURN: Adversarial task count, critical gaps identified
```

---

## Phase 5: EXECUTE TASKS

Dispatch investigation agents for each task. Parallel where independent.

### Person Investigation Agent

```
Task tool:
  subagent_type: "general-purpose"
  description: "Investigate [person name]"
  prompt: |
    TASK: [task description from _tasks.json]
    CASE: cases/[case-id]/
    TASK_ID: [T###]

    Follow framework/rules.md for source attribution and evidence capture.

    AVAILABLE SOURCES (from _sources.json):
    [List relevant sources for person investigation from _sources.json]

    Use sources from _sources.json that are RELEVANT to this specific task.
    Prioritize discovered sources that are case-specific.

    SUCCESS CRITERIA: [from task]

    For each source URL:
    - Capture: ./scripts/capture [SXXX] [URL]
    - Verify claim exists in captured file
    - Get next_source_id from _state.json

    Update: people.md, sources.md, _state.json
    Mark task complete in _tasks.json with findings_file reference.

    RETURN: Findings summary, sources added, success criteria met?
```

### Entity Investigation Agent

```
Task tool:
  subagent_type: "general-purpose"
  description: "Investigate [entity name]"
  prompt: |
    TASK: [task description from _tasks.json]
    CASE: cases/[case-id]/
    TASK_ID: [T###]

    Follow framework/rules.md for source attribution and evidence capture.

    AVAILABLE SOURCES (from _sources.json):
    [List relevant sources for this entity type from _sources.json]

    Use sources from _sources.json that are RELEVANT to this specific task.
    Prioritize discovered sources that are case-specific.

    SUCCESS CRITERIA: [from task]

    Update: organizations.md, sources.md, _state.json
    Mark task complete in _tasks.json.

    RETURN: Findings summary, sources added, success criteria met?
```

### Claim Verification Agent

```
Task tool:
  subagent_type: "general-purpose"
  description: "Verify claim: [claim summary]"
  prompt: |
    TASK: [task description from _tasks.json]
    CASE: cases/[case-id]/
    TASK_ID: [T###]

    Follow framework/rules.md for source attribution and evidence capture.

    AVAILABLE SOURCES (from _sources.json):
    [List relevant sources for claim verification from _sources.json]

    Search for supporting AND contradicting evidence.
    Check for circular reporting.
    Use sources from _sources.json - prioritize case-specific discovered sources.

    Verdict: VERIFIED | DEBUNKED | PARTIAL | UNVERIFIED | CONTESTED
    Confidence: [low, high]
    Evidence quality: PRIMARY | SECONDARY | TERTIARY

    Update: fact-check.md, sources.md, _state.json
    Mark task complete in _tasks.json.

    RETURN: Verdict, source count, confidence, evidence quality
```

---

## Phase 6: COVERAGE UPDATE

After each task batch, update _coverage.json:

```
Task tool:
  subagent_type: "general-purpose"
  description: "Update coverage metrics"
  prompt: |
    TASK: Calculate coverage metrics
    CASE: cases/[case-id]/

    Count from case files:
    - people.md: How many people documented vs. mentioned in _extraction.json
    - organizations.md: How many entities documented vs. mentioned
    - fact-check.md: How many claims verified vs. total
    - sources.md: How many sources captured vs. cited
    - positions.md: How many positions documented vs. identified
    - contradictions in _extraction.json: How many explored

    Check _tasks.json:
    - Which perspectives have completed tasks?
    - Which have no tasks (flagged as N/A or gap)?

    Calculate depth metrics:
    - Primary vs. secondary sources
    - Direct vs. circumstantial evidence

    Write _coverage.json with all metrics.

    RETURN: Coverage percentages, gaps identified
```

---

## Phase 7: VERIFICATION

**REQUIRED: Invoke the `/verify` skill — do NOT substitute with a sub-agent.**

```
Skill tool:
  skill: "verify"
  args: "[case-id]"
```

The `/verify` skill will dispatch parallel verification agents:
1. Anti-hallucination check (verify-claims.js)
2. Cross-model critique (Gemini reviews summary)
3. Position audit (all positions fact-checked?)
4. Gap analysis (comprehensive checklist)

Core checklist (all must be YES for verification to pass):
- All major people investigated
- All major claims fact-checked (ALL positions)
- All positions steelmanned
- Alternative theories addressed with evidence
- All sources have captured evidence
- No CONTRADICTED claims

If verification fails → generate corrective tasks → continue investigation.

---

## Phase 8: RIGOR CHECKPOINT (Termination Gate)

**Cannot terminate without passing this checkpoint.**

```
Task tool:
  subagent_type: "general-purpose"
  description: "Rigor checkpoint - 20 framework validation"
  prompt: |
    TASK: Validate investigation completeness against 20 frameworks
    CASE: cases/[case-id]/

    Read _tasks.json, _coverage.json, summary.md, all detail files.

    For EACH framework, determine:
    - ✓ Addressed (cite specific task or finding)
    - ✗ Gap (explain and generate task)
    - N/A (explain why not applicable to this case)

    FRAMEWORKS:
    1. Follow the Money — financial angles investigated?
    2. Follow the Silence — missing voices identified?
    3. Follow the Timeline — sequence established?
    4. Follow the Documents — paper trail verified?
    5. Follow the Contradictions — inconsistencies explored?
    6. Follow the Relationships — connections mapped?
    7. Stakeholder Mapping — interests identified?
    8. Network Analysis — connections traced?
    9. Means/Motive/Opportunity — assessed?
    10. Competing Hypotheses — alternatives explored?
    11. Assumptions Check — assumptions tested?
    12. Pattern Analysis — precedents researched?
    13. Counterfactual — disconfirming evidence sought?
    14. Pre-Mortem — failure modes considered?
    15. Cognitive Bias Check — biases acknowledged?
    16. Uncomfortable Questions — asked and investigated?
    17. Second-Order Effects — consequences considered?
    18. Meta Questions — context understood?
    19. 5 Whys (Root Cause) — underlying causes explored?
    20. Sense-Making — interpretation clear?

    CANNOT PASS with unexplained gaps.
    Generate tasks for any gaps.

    Update _state.json:
    - rigor_checkpoint_passed: true only if all frameworks ✓ or N/A
    - Write gap tasks to _tasks.json under "rigor_gap_tasks"

    RETURN: PASS/FAIL, frameworks addressed, gaps requiring tasks
```

---

## Phase 9: QUALITY CHECKS (Integrity + Legal)

**IMPORTANT: Each skill must be invoked separately. Do NOT combine them.**

### Step 9a: Integrity Check

```
Skill tool:
  skill: "integrity"
  args: "[case-id]"
```

The `/integrity` skill will:
- Check source balance and representation
- Evaluate language neutrality
- Verify steelmanning of positions
- Ensure scrutiny symmetry

If MAJOR integrity issues → generate corrective tasks before proceeding.

### Step 9b: Legal Review

```
Skill tool:
  skill: "legal-review"
  args: "[case-id]"
```

The `/legal-review` skill will:
- Classify subjects (public vs private figure)
- Assess defamation risk per claim
- Tier evidence quality
- Audit attribution completeness

Creates: `legal-review.md` (REQUIRED for Gate 9)

If HIGH legal risks → generate mitigation tasks.

### After Both Skills Complete

Update _state.json:
- quality_checks_passed: true only if both pass with no major issues

**Do NOT substitute a sub-agent for these skills. The skills have specific output requirements.**

---

## Termination Gates

**See `framework/rules.md` for all 9 termination gates and coverage thresholds.**

**Mechanical Verification Required:**
```bash
node scripts/verify-all-gates.js cases/[case-id]
# Exit code 0 = all gates pass → can terminate
# Exit code 1 = gates failed → continue investigation
```

Results saved to: `cases/[case-id]/_gate_results.json`

**Do NOT self-report gate passage.** Only verification scripts can mark gates as passed.

If ANY gate fails → generate tasks to address → loop.

---

## Phase 10: SYNTHESIS

When all gates pass:

```
Task tool:
  subagent_type: "general-purpose"
  description: "Final synthesis"
  prompt: |
    TASK: Create final synthesis
    CASE: cases/[case-id]/

    COMPLETELY REWRITE summary.md:
    - Fresh, polished document
    - Every claim has [SXXX] citation
    - All positions represented fairly
    - Embed complete source list at end
    - Professional journalism quality

    Update _state.json:
    - status: "COMPLETE"
    - current_phase: "COMPLETE"

    Git commit: "Final: [topic] - investigation complete"

    RETURN: Summary length, source count
```

---

## Phase 11: ARTICLE

```
Task tool:
  subagent_type: "general-purpose"
  description: "Generate articles"
  prompt: |
    TASK: Generate publication-ready articles
    CASE: cases/[case-id]/

    Generate TWO articles from summary.md:

    1. SHORT OVERVIEW (400-800 words)
       - Key findings, executive summary style
       - Citations preserved

    2. FULL ARTICLE (2,000-4,000 words)
       - Comprehensive professional piece
       - All positions, all evidence
       - Citations preserved

    Write to articles.md.

    RETURN: Article word counts
```

---

## Case Setup (--new)

```
Task tool:
  subagent_type: "general-purpose"
  description: "Setup new case"
  prompt: |
    TASK: Create new investigation case
    TOPIC: [topic from user]

    1. Generate slug (lowercase, hyphens)
    2. Create: cases/[slug]/{evidence/web,evidence/documents,research-leads}
    3. Initialize git repo
    4. Create _state.json (iteration: 0, phase: SETUP)
    5. Create empty _tasks.json, _coverage.json, _extraction.json
    6. Create empty template files
    7. Update cases/.active
    8. Git commit: "Initialize case: [topic]"

    RETURN: Case ID (slug)
```

---

## Extended Reasoning Checkpoints

Use GPT 5.2 Pro with extended thinking (`mcp__mcp-openai__generate_text` with `reasoning_effort: "high"` or `"xhigh"`) at these critical junctures. Craft the prompt based on context—the model knows how to reason deeply.

| Trigger | Purpose |
|---------|---------|
| **iteration ≥ 3** | Adversarial review of emerging narrative—find blind spots, challenge assumptions |
| **Contradictions found** | Reason through conflicting sources—incentives, credibility, resolution |
| **Alternative theories exist** | Genuinely steelman uncomfortable positions |
| **All gates passing** | Pre-termination deep review—what might we have missed? |
| **Major finding established** | Second-order implications—what else must be true? |

The model knows how to do adversarial thinking, steelmanning, and implication analysis. Provide the context (findings, contradictions, theories) and ask for the type of reasoning needed.

---

## Orchestrator Rules

1. NEVER call MCP tools directly — dispatch sub-agents
2. NEVER read full research content — only state files
3. NEVER write large content — sub-agents do all writing
4. ALWAYS dispatch parallel agents in ONE message when independent
5. ALWAYS check _state.json between phases
6. ALWAYS regenerate tasks after each batch completes
7. NEVER terminate without passing ALL 9 gates (verified mechanically)
8. See `framework/rules.md` for state update ownership

---

## Required Skills (Must Invoke)

Before marking investigation COMPLETE, you MUST invoke these skills:

| Skill | Phase | Output Required |
|-------|-------|-----------------|
| `/verify` | Phase 7 | verification_passed in _state.json |
| `/integrity` | Phase 9a | Integrity check results |
| `/legal-review` | Phase 9b | `legal-review.md` file |
| `/article` | Phase 11 | (if article requested) |

**Do NOT substitute sub-agents for these skills.**

Each skill has specific:
- Dispatch patterns (parallel agents)
- Output file requirements
- State updates

Combining or substituting skills defeats their purpose and will fail gate verification.
