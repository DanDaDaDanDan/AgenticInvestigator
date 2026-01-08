# AgenticInvestigator

**Investigative journalism framework for Claude Code.** Produces rigorous, balanced reporting on contested topics using parallel multi-model research, cross-model critique, built-in verification, and transparent evidence-based analysis.

This is not a debunking tool. It's a **reporting framework** that traces chains of knowledge, builds cases for ALL sides, fact-checks claims from ALL perspectives, and lets readers draw their own conclusions.

## Core Philosophy: INSATIABLE CURIOSITY

**The key to AgenticInvestigator is to be INSATIABLY CURIOUS.**

Every finding triggers more questions. Every person mentioned gets investigated. Every source gets traced. Every contradiction gets explored. Every gap gets filled. **Every claim from ALL sides gets fact-checked.**

## Quick Start

```bash
# Start new investigation (topic required)
/investigate --new "Corporate fraud at Acme Corp"

# Resume specific case by slug
/investigate corporate-fraud-acme-corp

# Resume case with new research direction
/investigate corporate-fraud-acme-corp "follow the money"

# List all cases
/status --list

# Run verification checkpoint
/verify

# Check investigation status
/status
```

## Output

**Modular files** in `cases/[topic-slug]/` (e.g., `cases/corporate-fraud-acme-corp/`):

```
├── evidence/                     # CAPTURED EVIDENCE (hallucination-proof)
│   ├── web/S001/                 # Screenshots, PDFs, HTML per source
│   ├── documents/                # Downloaded PDFs (SEC filings, court docs)
│   └── media/                    # Videos, transcripts
├── research-leads/               # AI research outputs (NOT citable - leads only)
├── summary.md                    # THE DELIVERABLE - self-contained, shareable
├── sources.md                    # Master source registry [S001], [S002]...
├── timeline.md                   # Chronological events
├── people.md                     # Person profiles
├── positions.md                  # ALL sides - each position with arguments and evidence
├── fact-check.md                 # Claim verdicts (all sides)
├── theories.md                   # Fringe/alternative theories analysis
├── statements.md                 # Statement vs evidence, chain of knowledge
├── iterations.md                 # Progress log + verification checkpoints
├── integrity-check.md            # Journalistic integrity assessment (generated)
├── legal-review.md               # Pre-publication legal risk assessment (generated)
└── articles.md                   # Publication-ready articles (generated)
```

**summary.md is self-contained** - includes complete source list, shareable standalone.

**Source attribution is sacred** - Every claim has a source ID `[S001]`. No exceptions.

**Evidence capture is mandatory** - Every source has local screenshots/PDFs proving content existed.

## Architecture: Orchestrator + Sub-Agents

**The main Claude Code instance ONLY orchestrates. All actual work is done by sub-agents via the Task tool.**

This prevents context bloat in the main loop and ensures all findings are persisted to files.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MAIN LOOP (Orchestrator Only)                        │
│                                                                              │
│  The orchestrator NEVER:                                                     │
│    ✗ Calls MCP research tools directly                                       │
│    ✗ Reads full file contents                                               │
│    ✗ Processes or analyzes research results                                  │
│                                                                              │
│  The orchestrator ONLY:                                                      │
│    ✓ Reads _state.json and file headers (brief)                              │
│    ✓ Dispatches sub-agents via Task tool                                     │
│    ✓ Tracks iteration count and termination                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │              │                │               │              │
         ▼              ▼                ▼               ▼              ▼
   ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐
   │ Research │  │ Extraction │  │Investigation│  │Verification│ │Synthesis │
   │  Agent   │  │   Agent    │  │   Agent    │  │  Agent   │  │  Agent   │
   └──────────┘  └────────────┘  └────────────┘  └──────────┘  └──────────┘
         │              │                │               │              │
         ▼              ▼                ▼               ▼              ▼
   research-leads/  _extraction.json  people.md     iterations.md   summary.md
                                      fact-check.md  _state.json    sources.md
```

### State Tracking

Each case has a `_state.json` for orchestrator state:

```json
{
  "case_id": "topic-slug",
  "status": "IN_PROGRESS",
  "current_iteration": 5,
  "current_phase": "VERIFICATION",
  "gaps": ["gap1", "gap2"],
  "verification_passed": false
}
```

Sub-agents update this file. Orchestrator reads it.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│              THE VERIFIED INVESTIGATION LOOP                     │
│                  (Orchestrator dispatches sub-agents)            │
│                                                                  │
│  PHASE 1: RESEARCH → Dispatch Research Agents (parallel)         │
│    [Agent] Gemini deep research → research-leads/                │
│    [Agent] OpenAI deep research → research-leads/                │
│    [Agent] XAI real-time search → research-leads/                │
│    [Agent] Statement searches → research-leads/                  │
│                                                                  │
│  PHASE 1.5: EVIDENCE CAPTURE                                     │
│    [Agent] Capture primary sources → evidence/                   │
│    [Agent] Verify claims exist → sources.md                      │
│                                                                  │
│  PHASE 2: EXTRACTION → Dispatch Extraction Agent                 │
│    [Agent] Parse research-leads/ → _extraction.json              │
│    [Agent] Update _state.json with items found                   │
│                                                                  │
│  PHASE 3: INVESTIGATION → Dispatch Investigation Agents          │
│    [Agent] Person backgrounds → people.md                        │
│    [Agent] Claim verification → fact-check.md                    │
│    [Agent] Timeline events → timeline.md                         │
│                                                                  │
│  PHASE 4: VERIFICATION → Dispatch Verification Agents            │
│    [Agent] Anti-hallucination check → iterations.md              │
│    [Agent] Cross-model critique → iterations.md                  │
│    [Agent] Gap analysis → _state.json                            │
│                                                                  │
│  PHASE 5: SYNTHESIS → Dispatch Synthesis Agent                   │
│    [Agent] Compile findings → summary.md (complete rewrite)      │
│    [Agent] Git commit                                            │
│                                                                  │
│  TERMINATION CHECK (orchestrator reads _state.json)              │
│    - verification_passed == true                                 │
│    - gaps.length == 0                                            │
│    - status == "COMPLETE"                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Commands

| Command | Purpose |
|---------|---------|
| `/investigate --new [topic]` | Start new investigation (topic required) |
| `/investigate [case-id]` | Resume specific case by ID |
| `/investigate [case-id] [topic]` | Resume case with new research direction |
| `/verify` | Run verification checkpoint |
| `/verify [case-id]` | Verify specific case |
| `/status` | Show case progress |
| `/status [case-id]` | Show status of specific case |
| `/status --list` | List all cases |
| `/osint` | OSINT quick reference |
| `/osint [topic]` | OSINT sources for specific investigation type |
| `/questions` | Generate investigative questions for active case |
| `/questions [case-id]` | Generate questions for specific case |
| `/financial [entity]` | Financial investigation toolkit |
| `/financial [case-id]` | Financial analysis for existing case |
| `/financial [case-id] [entity]` | Add financial focus to existing case |
| `/legal-review` | Pre-publication legal risk assessment |
| `/legal-review [case-id]` | Legal review for specific case |
| `/integrity` | Journalistic integrity & neutrality check |
| `/integrity [case-id]` | Integrity check for specific case |
| `/article` | Generate publication-ready articles |
| `/article [case-id]` | Generate articles for specific case |

## The /questions Command: 20 Investigative Frameworks

The `/questions` command generates investigative questions using **20 frameworks** organized into **6 categories**:

| Category | Frameworks | Key Questions |
|----------|------------|---------------|
| **Core Investigation** | Money, Silence, Timeline, Documents, Contradictions, Uncomfortable | Who benefits? Who's not talking? What's the paper trail? |
| **People & Networks** | Stakeholder Mapping, Network Analysis, Means/Motive/Opportunity, Relationships | Who has power? Who connects them? Who could have done it? |
| **Hypothesis & Analysis** | ACH, Key Assumptions, Patterns | Which theory fits? What are we assuming? Has this happened before? |
| **Adversarial** | Counterfactual, Pre-Mortem, Cognitive Bias | What would prove this wrong? If we're wrong, why? What are our blind spots? |
| **Context & Framing** | Second-Order Effects, Meta Questions, Sense-Making | What happens next? Why is this story being told now? What does it mean? |
| **Root Cause** | 5 Whys | Why was this possible? (drill down 5 levels) |

### When to Use Which Frameworks

| Stage | Frameworks |
|-------|------------|
| **Early** (gathering facts) | Core + Stakeholder Mapping + Relationships + Sense-Making |
| **Mid** (building understanding) | Add Network Analysis, Means/Motive/Opportunity, ACH, Assumptions, Patterns, Meta, 5 Whys |
| **Late** (stress testing) | Add Counterfactual, Pre-Mortem, Cognitive Bias, Second-Order Effects |
| **When stuck** | Focus on Pre-Mortem, Bias Check, Uncomfortable Questions |

## Financial Investigation Toolkit (/financial)

Specialized tools for following the money:

| Capability | Description |
|------------|-------------|
| **Corporate Structure Mapping** | Trace ownership chains, subsidiaries, beneficial owners |
| **Transaction Pattern Analysis** | Identify red flags (round-trips, structuring, related-party) |
| **Beneficial Ownership Tracing** | Penetrate shell companies, nominee directors, trusts |
| **Money Flow Mapping** | Track source → intermediaries → destination |

**Data Sources**: SEC EDGAR, OpenCorporates, ICIJ Offshore Leaks, FEC, PACER, state corporate registries, and more.

## Legal Risk Assessment (/legal-review)

Pre-publication review for defamation exposure:

| Assessment | What It Evaluates |
|------------|-------------------|
| **Subject Classification** | Public official, public figure, limited public figure, private figure |
| **Claim Risk** | Criminal allegations, professional misconduct, financial wrongdoing |
| **Evidence Strength** | Tier 1 (strong) through Tier 4 (insufficient) |
| **Corroboration** | Multiple primary sources → single anonymous source |

**Output**: Claim-by-claim risk assessment, hedging suggestions, evidence gaps, pre-publication checklist.

## Journalistic Integrity Check (/integrity)

Automated neutrality and balance assessment:

| Assessment | What It Evaluates |
|------------|-------------------|
| **Balance Audit** | Are all perspectives given fair representation? |
| **Framing Analysis** | Do word choices favor one side? |
| **Source Diversity** | Are sources appropriately varied and credible? |
| **Omission Check** | Are key counterarguments missing? |
| **Emotional Language** | Is language neutral and professional? |

**Output**: Issue-by-issue assessment with severity ratings, specific location citations, and recommended fixes.

## Article Generator (/article)

Transform investigation findings into publication-ready journalism:

| Article Type | Description |
|--------------|-------------|
| **Short Overview** | 400-800 words, concise quick-read format |
| **Full Article** | 2,000-4,000 words, long-form investigative journalism |

**Standards**: Professional newsroom quality (NYT/ProPublica style), preserves all source citations, no editorializing, balanced perspectives, hedging language for unverified claims.

**Output**: Two complete articles ready for publication with source key and editorial notes.

## Evidence Capture System

**Hallucination-proof source verification.** Every source has local evidence proving content existed at research time.

### Capture Workflow

```bash
# Capture web page (screenshot + PDF + HTML)
./scripts/capture S001 https://example.com/article

# Capture document (PDF download)
./scripts/capture --document S015 https://sec.gov/filing.pdf

# Batch capture with Firecrawl (bot-protected sites)
node scripts/firecrawl-capture.js --batch urls.txt /path/to/case
```

### Evidence Structure

```
evidence/
├── web/S001/
│   ├── capture.png       # Full-page screenshot
│   ├── capture.pdf       # PDF rendering
│   ├── capture.html      # Raw HTML source
│   └── metadata.json     # URL, timestamp, SHA-256 hashes
└── documents/
    └── S015_10k_2024.pdf # Downloaded with source ID prefix
```

### Anti-Hallucination Verification

Before finalization, verify all claims actually exist in captured evidence:

```bash
node scripts/verify-claims.js /path/to/case
```

| Verdict | Meaning | Action |
|---------|---------|--------|
| VERIFIED | Claim found in evidence | None |
| NOT_FOUND | Claim NOT in evidence | Find evidence or revise claim |
| PARTIAL | Claim partially supported | Review and clarify |
| CONTRADICTED | Evidence says opposite | Urgent: fix the claim |

**AI research outputs are NOT sources.** Save to `research-leads/`, then find and capture primary sources.

## Investigation Loop Finale

**After completing all research iterations, run these steps in order:**

```
1. /verify          → Verification checkpoint (completeness)
2. /integrity       → Journalistic integrity check (balance, neutrality)
3. Address integrity issues in case files
4. /legal-review    → Legal risk assessment (defamation, evidence)
5. Address legal issues in case files
6. Final publication decision
7. /article         → Generate publication-ready articles (short + long-form)
```

## MCP Servers

| Server | Purpose |
|--------|---------|
| [`mcp-gemini`](https://github.com/DanDaDaDanDan/mcp-gemini) | Deep research (fast), cross-model critique |
| [`mcp-openai`](https://github.com/DanDaDaDanDan/mcp-openai) | Deep research (max depth), cross-model critique |
| [`mcp-xai`](https://github.com/DanDaDaDanDan/mcp-xai) | Real-time search (X, web, news), multi-source research |

## Documentation

| File | Contents |
|------|----------|
| `CLAUDE.md` | AI behavioral instructions |
| `architecture.md` | Technical design, data formats |
| `.claude/commands/investigate.md` | Full investigation procedure |
| `.claude/commands/verify.md` | Verification checkpoint procedure |
| `.claude/commands/status.md` | Status command procedure |
| `.claude/commands/osint.md` | OSINT database sources |
| `.claude/commands/questions.md` | Question generation procedure |
| `.claude/commands/financial.md` | Financial investigation toolkit |
| `.claude/commands/legal-review.md` | Legal risk assessment procedure |
| `.claude/commands/integrity.md` | Integrity check procedure |
| `.claude/commands/article.md` | Article generation procedure |
| `docs/investigative_data_sources.md` | 100+ OSINT sources |

## Philosophy

### Investigative Journalism Principles
1. **Follow the paper trail** - Documents over opinions. Emails, court records, FOIA, testimony.
2. **Trace the chain** - Who knew what, when? Who did they tell? What happened next?
3. **Build ALL cases** - Strongest arguments for EVERY position.
4. **Call out contradictions** - Compare statements to evidence. Note the gaps explicitly.
5. **Find the hook** - The single most compelling detail that captures the whole story.
6. **Let readers decide** - Present evidence, acknowledge uncertainty, don't dictate conclusions.

### Verification Principles
1. **Fact-check ALL sides** - Claims from every position get verified
2. **Address alternative theories** - Don't ignore them; investigate with evidence
3. **Cross-model critique** - Different models check each other's work
4. **No premature stopping** - Cannot claim saturation until genuinely exhausted

### Statement & Temporal Tracking Principles
1. **Proactively seek statements** - Hunt for testimony, depositions, interviews, earnings calls
2. **Document role timelines** - When did they join, leave, get promoted? Roles change.
3. **Compare statements over time** - Same person, different dates - how did their story evolve?
4. **Compare statements across venues** - Public vs. testimony vs. internal - note discrepancies
5. **Flag all contradictions** - When someone's statements conflict, investigate why

### Technical Principles
1. **Insatiable curiosity** - Never stop until all avenues exhausted
2. **Loop on all points** - Process everything, never cherry-pick
3. **Probability ranges** - `[0.6, 0.8]` not `0.7`. Explicit uncertainty is valuable.

## License

MIT
