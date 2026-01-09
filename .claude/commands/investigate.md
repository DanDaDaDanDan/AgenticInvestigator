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

```
cases/[topic-slug]/
├── _state.json           # Orchestrator state
├── _extraction.json      # Extracted entities, claims, people
├── _tasks.json           # Dynamic task queue (NEW)
├── _coverage.json        # Coverage metrics (NEW)
├── .git/                 # Version control
├── evidence/             # Captured sources
├── research-leads/       # AI research (NOT citable)
├── summary.md            # THE DELIVERABLE
├── sources.md            # Source registry
├── timeline.md, people.md, organizations.md
├── positions.md, fact-check.md, theories.md, statements.md
└── iterations.md         # Progress log
```

### _state.json

```json
{
  "case_id": "topic-slug",
  "topic": "Original topic",
  "status": "IN_PROGRESS",
  "current_iteration": 5,
  "current_phase": "INVESTIGATION",
  "next_source_id": "S048",
  "verification_passed": false,
  "adversarial_complete": false,
  "rigor_checkpoint_passed": false,
  "quality_checks_passed": false,
  "created_at": "...",
  "updated_at": "..."
}
```

### _tasks.json

```json
{
  "tasks": [
    {
      "id": "T001",
      "description": "Investigate FDA approval history for [drug]",
      "perspective": "Documents",
      "entity": "PharmaCorp",
      "priority": "HIGH",
      "status": "pending",
      "rationale": "Central to efficacy claims",
      "approach": "FDA database, ClinicalTrials.gov, SEC 10-K disclosures",
      "success_criteria": "Timeline of approval with key decision points",
      "generated_at": "iteration_2",
      "completed_at": null,
      "findings_file": null
    }
  ],
  "adversarial_tasks": [],
  "rigor_gap_tasks": []
}
```

### _coverage.json

```json
{
  "people": { "mentioned": 15, "investigated": 13 },
  "entities": { "mentioned": 8, "investigated": 7 },
  "claims": { "total": 24, "verified": 18 },
  "sources": { "cited": 47, "captured": 47 },
  "positions": { "identified": 4, "documented": 4 },
  "contradictions": { "identified": 6, "explored": 6 },
  "perspectives_covered": {
    "Money": true,
    "Timeline": true,
    "Silence": false,
    "Documents": true,
    "Contradictions": true,
    "Relationships": true,
    "Hypotheses": true,
    "Assumptions": false,
    "Counterfactual": true,
    "BlindSpots": true
  },
  "frameworks_validated": 16,
  "depth_metrics": {
    "primary_sources": 28,
    "secondary_sources": 19,
    "direct_evidence": 22,
    "circumstantial": 12
  }
}
```

---

## Main Loop: Dynamic Task Generation

```
1. READ: _state.json, _tasks.json, _coverage.json
2. IF initial research not done:
     → RESEARCH phase (multi-engine)
     → EXTRACTION phase (parse findings)
3. GENERATE TASKS: With required perspectives + curiosity check
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

    Read _extraction.json and current findings.

    CONTEXT:
    - Topic: [topic]
    - People identified: [list from _extraction.json]
    - Entities identified: [list with types]
    - Claims to verify: [list]
    - Open contradictions: [list]
    - Previous findings: [summary from summary.md]
    - Current coverage gaps: [from _coverage.json]

    GENERATE TASKS WITH REQUIRED PERSPECTIVES.

    For EACH perspective, generate at least one specific task IF APPLICABLE:

    □ MONEY/FINANCIAL — who benefits, funding sources, transactions, contracts
      Consider: SEC filings, 990s, FEC, USAspending, OpenCorporates, ICIJ

    □ TIMELINE/SEQUENCE — what happened when, causation chains, key dates
      Consider: Court records, press releases, SEC filings, news archives

    □ SILENCE — who's NOT talking, missing voices, declined comment
      Consider: Who should have statements but doesn't? Why?

    □ DOCUMENTS — paper trails, filings, records that should exist
      Consider: What documents MUST exist for these claims to be true?

    □ CONTRADICTIONS — conflicting accounts, changed stories
      Consider: Cross-reference statements across time and venues

    □ RELATIONSHIPS — connections, affiliations, conflicts of interest
      Consider: Corporate relationships, personal ties, shared entities

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

    The LLM KNOWS relevant OSINT sources for person investigation:
    - OpenCorporates, State SOS, SEC EDGAR, OpenSanctions, ICIJ
    - CourtListener/PACER, state courts, OpenSecrets/FEC
    - County assessor, professional license DBs, LinkedIn

    Use the sources RELEVANT to this specific task.
    Don't run all sources—run the ones that matter for this task.

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

    The LLM KNOWS relevant OSINT sources by entity type:
    - Corporation: SEC EDGAR, State SOS, OpenCorporates, USAspending, GLEIF
    - Nonprofit: ProPublica 990s, Candid, IRS Tax Exempt, state charity
    - PAC: FEC database, OpenSecrets
    - Government: USAspending, GAO/OIG, FOIA, Federal Register

    Use the sources RELEVANT to this specific task.

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

    Search for supporting AND contradicting evidence.
    Check for circular reporting.

    The LLM KNOWS source types by claim type:
    - Financial: USAspending, SEC EDGAR, 990s, OpenSecrets
    - Legal: CourtListener/PACER, state courts, Google Scholar Case Law
    - Statement: Original transcript/video, Wayback Machine
    - Statistical: Original study, government statistics

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

```
Task tool:
  subagent_type: "general-purpose"
  description: "Verification checkpoint"
  prompt: |
    TASK: Run verification checkpoint
    CASE: cases/[case-id]/

    Be RUTHLESS. Find ALL gaps.

    1. Run anti-hallucination check:
       node scripts/verify-claims.js cases/[case-id]
       CONTRADICTED → urgent gap
       NOT_FOUND → must fix or revise

    2. Run evidence check:
       node scripts/verify-sources.js cases/[case-id]
       Sources without evidence → gap

    3. Cross-model critique:
       mcp__mcp-gemini__generate_text (thinking_level: high)
       Find: missing evidence, unexplored claims, unaddressed theories

    4. Core checklist (all must be YES):
       □ All major people investigated
       □ All major claims fact-checked (ALL positions)
       □ All positions steelmanned
       □ Alternative theories addressed with evidence
       □ All sources have captured evidence
       □ No CONTRADICTED claims

    Update _state.json:
    - verification_passed: true only if ALL checklist items YES

    RETURN: PASS/FAIL, gap count, critical issues
```

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

```
Task tool:
  subagent_type: "general-purpose"
  description: "Quality checks - integrity and legal"
  prompt: |
    TASK: Run integrity and legal review
    CASE: cases/[case-id]/

    INTEGRITY CHECK:
    - Source balance: Are all positions fairly represented?
    - Language neutrality: Any loaded terms or editorializing?
    - Steelmanning: Is each position shown at its strongest?
    - Scrutiny symmetry: Same rigor applied to all sides?

    If MAJOR integrity issues → generate corrective tasks.

    LEGAL CHECK:
    - Subject classification: Public or private figure?
    - Per claim: Defamation risk assessment
    - Evidence tier: Tier 1 (official) to Tier 4 (anonymous)
    - Attribution audit: Every claim properly attributed?

    If HIGH legal risks → generate mitigation tasks.

    Update _state.json:
    - quality_checks_passed: true only if no major issues

    RETURN: PASS/FAIL, issues found, corrective tasks generated
```

---

## Termination Gates

**ALL must be true to terminate:**

```
1. Coverage thresholds met:
   □ People: investigated/mentioned ≥ 90%
   □ Entities: investigated/mentioned ≥ 90%
   □ Claims: verified/total ≥ 80%
   □ Sources: captured/cited = 100%
   □ Positions: documented/identified = 100%
   □ Contradictions: explored/identified = 100%

2. No HIGH priority tasks pending

3. adversarial_complete == true

4. rigor_checkpoint_passed == true

5. verification_passed == true

6. quality_checks_passed == true

7. All positions steelmanned

8. No unexplored contradictions
```

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

## Orchestrator Rules

1. NEVER call MCP tools directly — dispatch sub-agents
2. NEVER read full research content — only state files
3. NEVER write large content — sub-agents do all writing
4. ALWAYS dispatch parallel agents in ONE message when independent
5. ALWAYS check _state.json between phases
6. ALWAYS regenerate tasks after each batch completes
7. NEVER terminate without passing ALL 8 gates
8. See `framework/rules.md` for state update ownership
