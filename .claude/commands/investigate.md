# AgenticInvestigator Investigation (Orchestrator Mode)

You are the **orchestrator**. You dispatch sub-agents and track state. You NEVER do research or analysis directly.

**See `rules.md` for all canonical rules (sources, evidence, verification).**

---

## Usage

```
/investigate --new [topic]      # Start new investigation
/investigate [case-id]          # Resume specific case
/investigate [case-id] [topic]  # Resume with new research direction
```

---

## Case Structure

```
cases/[topic-slug]/
├── _state.json           # Orchestrator state
├── _extraction.json      # Current iteration's extracted items
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
  "current_phase": "VERIFICATION",
  "next_source_id": "S048",
  "people_count": 12,
  "entities_count": 8,
  "sources_count": 47,
  "gaps": ["gap1", "gap2"],
  "verification_passed": false,
  "created_at": "...",
  "updated_at": "..."
}
```

**Status values:** `IN_PROGRESS`, `COMPLETE`, `PAUSED`, `ERROR`
**Phase values:** `SETUP`, `RESEARCH`, `EXTRACTION`, `INVESTIGATION`, `VERIFICATION`, `SYNTHESIS`, `COMPLETE`

---

## Phase State Machine

```
SETUP → RESEARCH → EXTRACTION → INVESTIGATION → VERIFICATION
                                                    ↓
                    ↑←←← gaps.length > 0 ←←←←←←←←←←←|
                    ↑                                ↓
RESEARCH ←←←←←←←←←←←| (!passed && gaps.length == 0) |
                                                    ↓
                    SYNTHESIS ←←←←←←←←←←←←←←←←←←←←←←| (passed)
                        ↓
                        → RESEARCH (new iteration)
                        → COMPLETE (if passed && no gaps)
```

---

## Orchestrator Loop

```
1. READ STATE: _state.json (small file, read directly)
2. DECIDE: Next phase based on state machine
3. DISPATCH: Sub-agents via Task tool (parallel when independent)
4. WAIT: Agents write to files, return brief status
5. CHECK: Re-read _state.json
6. LOOP OR TERMINATE
```

---

## Phase 1: RESEARCH

Dispatch ALL in ONE message (parallel):

### Research Agent (template)

```
Task tool:
  subagent_type: "general-purpose"
  description: "[Engine] research on [topic]"
  prompt: |
    TASK: [Engine] deep research
    CASE: cases/[case-id]/
    ITERATION: [N]

    Run mcp__mcp-[engine]__[tool] with query: "[topic] [specific angle]"
    Save to research-leads/iteration-[N]-[engine].md

    At end of file, list:
    - People mentioned (names)
    - Primary source URLs found
    - Key dates
    - Contradictions noted
    - Circular reporting detected

    Update _state.json: phase → RESEARCH

    RETURN: Brief status (people count, URL count, key findings)
```

### Dispatch Example (4-6 agents parallel)

```
Task 1: Gemini deep research on [topic]
Task 2: OpenAI deep research on [topic critical claims]
Task 3: XAI multi-source search (x, web, news)
Task 4: X/Twitter discourse analysis
Task 5: Official records search (court, regulatory)
Task 6: Alternative theories search
```

---

## Phase 2: EXTRACTION

Single agent parses research-leads/, populates _extraction.json:

```
Task tool:
  subagent_type: "general-purpose"
  description: "Extract findings from research"
  prompt: |
    TASK: Extract and categorize findings
    CASE: cases/[case-id]/
    ITERATION: [N]

    Read all research-leads/iteration-[N]-*.md

    Write _extraction.json with:
    - people: [{name, role, source_file, needs_investigation, affiliated_entities}]
    - entities: [{name, type, jurisdiction, parent, subsidiaries, relationships}]
    - claims: [{text, position, needs_verification, subject_entity}]
    - events: [{date, event, entities_involved}]
    - statements: [{speaker, role, date, venue, summary}]
    - contradictions: [{description, sources, entities_involved}]
    - sources_to_capture: [{url, type, priority, circular_reporting_note}]

    Update _state.json: phase → EXTRACTION, update counts

    RETURN: Counts only (N people, N entities, N claims, N statements)
```

---

## Phase 3: INVESTIGATION

Dispatch parallel agents for each person/entity/claim:

### Person Investigation Agent

```
Task tool:
  subagent_type: "general-purpose"
  description: "Investigate [person name]"
  prompt: |
    TASK: Investigate person
    CASE: cases/[case-id]/
    PERSON: [name]
    ITERATION: [N]

    Follow rules.md for source attribution and evidence capture.

    Research: background, career, role in story, all statements.

    Statement searches:
    - "[name] testimony Congress hearing deposition"
    - "[name] interview transcript earnings call"
    - "[name] statement press conference"
    - "[name] internal email memo"

    For each source URL:
    - Capture: ./scripts/capture [SXXX] [URL]
    - Verify claim exists in captured file
    - Get next_source_id from _state.json

    Compare statements across time and venues. Flag contradictions.
    Document role timeline (joined, left, promoted).

    Update: people.md, sources.md, _state.json (people_count, next_source_id)

    RETURN: Brief status (sources added, contradictions found)
```

### Entity Investigation Agent

```
Task tool:
  subagent_type: "general-purpose"
  description: "Investigate [entity name]"
  prompt: |
    TASK: Investigate entity
    CASE: cases/[case-id]/
    ENTITY: [name]
    TYPE: [corporation/agency/ngo/etc.]

    Follow rules.md for source attribution and evidence capture.

    Research: corporate structure, ownership, subsidiaries, relationships.

    Searches:
    - SEC EDGAR filings
    - State Secretary of State
    - OpenCorporates, ICIJ Offshore Leaks
    - Court records, regulatory actions

    Map: parent company, subsidiaries, beneficial owners, key relationships.
    Document timeline: founded, acquisitions, leadership changes, events.

    Update: organizations.md, sources.md, _state.json

    RETURN: Brief status (structure mapped, sources added, red flags)
```

### Claim Verification Agent

```
Task tool:
  subagent_type: "general-purpose"
  description: "Verify claim: [claim summary]"
  prompt: |
    TASK: Verify claim
    CASE: cases/[case-id]/
    CLAIM: [claim text]
    POSITION: [which position this supports]

    Follow rules.md for source attribution and evidence capture.

    Search for supporting and contradicting evidence.
    Check for circular reporting (outlets citing same original = 1 source).
    Capture evidence, verify claim exists in captured file.

    Verdict: VERIFIED | DEBUNKED | PARTIAL | UNVERIFIED | CONTESTED
    Confidence: range [low, high]

    Update: fact-check.md, sources.md, _state.json

    RETURN: Verdict, source count, confidence range
```

---

## Phase 4: VERIFICATION

Single agent runs checkpoint:

```
Task tool:
  subagent_type: "general-purpose"
  description: "Verification checkpoint"
  prompt: |
    TASK: Run verification checkpoint
    CASE: cases/[case-id]/
    ITERATION: [N]

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
       Find: missing evidence, unexplored claims, unaddressed theories,
       statement gaps, bias in sourcing

    4. Core checklist (all must be YES):
       □ All major people investigated
       □ All major claims fact-checked (ALL positions)
       □ All positions steelmanned
       □ Alternative theories addressed with evidence
       □ All sources have captured evidence
       □ No CONTRADICTED claims

    Update _state.json:
    - gaps: [list of specific gaps]
    - verification_passed: true only if ALL checklist items YES
    - last_verification: timestamp

    Update iterations.md with checkpoint entry.

    RETURN: PASS/FAIL, gap count, critical issues
```

---

## Phase 5: SYNTHESIS

Single agent rewrites summary.md:

```
Task tool:
  subagent_type: "general-purpose"
  description: "Synthesize iteration [N]"
  prompt: |
    TASK: Synthesize findings
    CASE: cases/[case-id]/
    ITERATION: [N]

    Follow rules.md for summary.md standards.

    Read all detail files (timeline, people, organizations, positions,
    fact-check, theories, statements, sources).

    COMPLETELY REWRITE summary.md:
    - Fresh, polished document (no iteration artifacts)
    - Every claim has [SXXX] citation
    - All positions represented fairly
    - Embed complete source list at end (self-contained)
    - Professional journalism quality

    Update iterations.md with iteration log.

    Update _state.json:
    - current_iteration: N+1
    - current_phase: SYNTHESIS
    - sources_count, people_count (from file counts)

    Git commit: "Iteration [N]: [brief description]"

    RETURN: Summary length, source count, iteration logged
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
    5. Create empty template files
    6. Update cases/.active
    7. Git commit: "Initialize case: [topic]"

    RETURN: Case ID (slug)
```

---

## Termination

**All conditions must be true:**
- `verification_passed == true`
- `gaps.length == 0`

**Termination signals (see rules.md):**
- Same sources across all engines
- New iterations yield <10% novel information
- Cross-model critique finds only minor gaps

When complete, set `status: "COMPLETE"`, `current_phase: "COMPLETE"`, commit.

---

## Orchestrator Rules

1. NEVER call MCP tools directly — dispatch sub-agents
2. NEVER read full research content — only _state.json and file headers
3. NEVER write large content — sub-agents do all writing
4. ALWAYS dispatch parallel agents in ONE message
5. ALWAYS check _state.json between phases
6. See `rules.md` for state update ownership
