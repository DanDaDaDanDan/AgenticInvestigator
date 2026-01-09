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
  "last_verification": "...",
  "created_at": "...",
  "updated_at": "..."
}
```

**Status values:** `IN_PROGRESS`, `COMPLETE`, `PAUSED`, `ERROR`
**Phase values:** `SETUP`, `RESEARCH`, `EXTRACTION`, `QUESTIONS`, `INVESTIGATION`, `FINANCIAL`, `VERIFICATION`, `SYNTHESIS`, `FINALE`, `COMPLETE`

---

## Phase State Machine

```
SETUP → RESEARCH → EXTRACTION → QUESTIONS? → INVESTIGATION → FINANCIAL? → VERIFICATION
                                    │                            │              ↓
                                    │                            │   ↑←← gaps > 0 ←←|
                    (conditional:   │      (conditional:         │   ↑              ↓
                     iter==1,       │       financial entities)  │   RESEARCH ←← (!passed)
                     iter%4==0,     │                            │              ↓
                     stuck)         │                            │   SYNTHESIS ←←| (passed && gaps==0)
                                    │                            │       ↓
                                    ↓                            ↓       → FINALE (if passed && no gaps)

FINALE LOOP: /questions (late) → /verify → /integrity → /legal-review → /article
             (any failure returns to RESEARCH or re-runs /verify)
```

### /questions Triggers
- `iteration == 1` (early mapping)
- `iteration % 4 == 0` (periodic fresh perspective)
- Verification fails with unclear gaps (stuck)
- Entering finale (adversarial check)

### /financial Triggers
- _extraction.json contains entities with type: `corporation`, `nonprofit`, `PAC`, `foundation`
- Claims involve: money, funding, contracts, fraud, spending, compensation
- Questions generated include financial frameworks (Follow the Money)

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

    Follow framework/rules.md for source attribution and evidence capture.
    Consult framework/data-sources.md for OSINT databases.

    Research: background, career, role in story, all statements.

    OSINT SOURCES (deep web - not Google-indexed):
    - OpenCorporates: Business connections, officer/director positions
    - State SOS registries: Corporate roles, registered agent
    - SEC EDGAR: Insider transactions, beneficial ownership (if public co)
    - OpenSanctions: PEP status, sanctions, watchlists
    - ICIJ Offshore Leaks: Offshore connections
    - CourtListener/PACER: Federal lawsuits (plaintiff/defendant)
    - State court portals: State-level litigation
    - OpenSecrets/FEC: Political donations, PAC affiliations
    - County assessor: Property ownership (if jurisdiction known)
    - Professional license DBs: Disciplinary actions (lawyers, doctors, etc.)
    - LinkedIn/professional associations: Career timeline verification

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

    RETURN: Brief status (sources added, contradictions found, OSINT hits)
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
    TYPE: [corporation/nonprofit/agency/PAC/foundation/etc.]

    Follow framework/rules.md for source attribution and evidence capture.
    Consult framework/data-sources.md for OSINT databases.

    Research: corporate structure, ownership, subsidiaries, relationships.

    OSINT SOURCES BY ENTITY TYPE:

    FOR CORPORATIONS:
    - SEC EDGAR: 10-K, 10-Q, 8-K, proxy statements, insider transactions
    - State SOS: Incorporation docs, officers, registered agent, amendments
    - OpenCorporates: Cross-jurisdictional presence, officer networks
    - ICIJ Offshore Leaks: Offshore subsidiaries, hidden structures
    - OpenSanctions: Sanctions, PEP connections
    - USAspending.gov: Federal contracts and grants received
    - CourtListener/PACER: Litigation history
    - GLEIF: Legal Entity Identifier, ownership chain

    FOR NONPROFITS:
    - ProPublica Nonprofit Explorer: 990 filings (revenue, compensation, grants)
    - Candid/GuideStar: Ratings, financials, board
    - IRS Tax Exempt Search: EIN verification, status
    - State charity registration: Compliance status
    - Schedule J (990): Executive compensation details
    - Related party transactions in 990

    FOR GOVERNMENT AGENCIES:
    - Agency websites: Leadership, org charts, budgets
    - USAspending.gov: Spending data
    - GAO/OIG reports: Audits, investigations
    - FOIA libraries: Released documents
    - Federal Register: Regulatory actions

    FOR PACs/POLITICAL:
    - FEC database: Contributions, expenditures
    - OpenSecrets: Donor analysis, spending patterns
    - State campaign finance portals

    Map: parent company, subsidiaries, beneficial owners, key relationships.
    Document timeline: founded, acquisitions, leadership changes, events.
    Flag red flags: multiple holding layers, secrecy jurisdictions, nominee directors.

    Update: organizations.md, sources.md, _state.json

    RETURN: Brief status (structure mapped, sources added, red flags found)
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
    CLAIM_TYPE: [financial/legal/factual/statement/statistical]

    Follow framework/rules.md for source attribution and evidence capture.
    Consult framework/data-sources.md for OSINT databases.

    Search for supporting AND contradicting evidence.
    Check for circular reporting (outlets citing same original = 1 source).

    SOURCE SUGGESTIONS BY CLAIM TYPE:

    FINANCIAL CLAIMS (money amounts, contracts, spending):
    - USAspending.gov: Federal contract/grant verification
    - SEC EDGAR: Financial disclosures, revenue figures
    - ProPublica 990s: Nonprofit financials
    - OpenSecrets: Political spending verification

    LEGAL CLAIMS (lawsuits, charges, verdicts):
    - CourtListener/PACER: Federal case verification
    - State court portals: State case verification
    - Google Scholar Case Law: Appellate opinions

    STATEMENT CLAIMS (someone said X):
    - Original source: Find the actual transcript/video/document
    - Wayback Machine: If original deleted
    - Compare across multiple independent reports

    STATISTICAL CLAIMS (numbers, percentages, studies):
    - Original study/report: Find primary source
    - Government statistics: BLS, Census, agency data
    - Academic databases: Google Scholar, JSTOR

    CORPORATE CLAIMS (company did X):
    - SEC filings: Official disclosures
    - Press releases: Company statements
    - Court records: Legal proceedings

    Capture evidence, verify claim exists in captured file.

    Verdict: VERIFIED | DEBUNKED | PARTIAL | UNVERIFIED | CONTESTED
    Confidence: range [low, high]
    Evidence quality: PRIMARY (original source) | SECONDARY (reporting) | TERTIARY (aggregated)

    Update: fact-check.md, sources.md, _state.json

    RETURN: Verdict, source count, confidence range, evidence quality
```

---

## Phase 3.5: FINANCIAL (conditional)

**Auto-invoke /financial when trigger conditions met.**

Check _extraction.json for triggers:
- Entities with type: `corporation`, `nonprofit`, `PAC`, `foundation`
- Claims containing keywords: money, funding, contracts, fraud, spending, compensation, revenue, profit
- Any "Follow the Money" questions generated

```
IF financial_triggers_present:
  Invoke /financial skill for each financial entity

  The /financial skill dispatches parallel agents for:
  - Corporate structure (ownership, subsidiaries, directors)
  - SEC/regulatory filings (10-K, 10-Q, proxy, enforcement)
  - Offshore/shell company search (ICIJ leaks, OpenSanctions)
  - Political money (FEC, lobbying, government contracts)
  - Litigation & enforcement (lawsuits, SEC actions, bankruptcies)
  - Real-time financial news

  Results written to: research-leads/financial-[entity]-*.md
  Synthesis written to: financial-[entity].md

  Update _state.json: phase → FINANCIAL
```

**Why auto-invoke?** "Follow the Money" is framework #1. Financial investigations are critical but easy to skip. Auto-invocation ensures financial angles are always explored when relevant.

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

    Follow framework/rules.md for summary.md standards.

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

**Termination signals (see framework/rules.md):**
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
6. See `framework/rules.md` for state update ownership
