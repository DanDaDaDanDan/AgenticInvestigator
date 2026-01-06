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

# Resume specific case by ID
/investigate inv-20260103-143022

# Resume case with new research direction
/investigate inv-20260103-143022 "follow the money"

# List all cases
/status --list

# Run verification checkpoint
/verify

# Check investigation status
/status
```

## Output

**Modular files** in `cases/inv-YYYYMMDD-HHMMSS/`:

```
├── summary.md        # THE DELIVERABLE - self-contained, shareable
├── sources.md        # Master source registry [S001], [S002]...
├── timeline.md       # Chronological events
├── people.md         # Person profiles
├── positions.md      # ALL sides - each position with arguments and evidence
├── fact-check.md     # Claim verdicts (all sides)
├── theories.md       # Fringe/alternative theories analysis
├── evidence.md       # Statement vs evidence, chain of knowledge
└── iterations.md     # Progress log + verification checkpoints
```

**summary.md is self-contained** - includes complete source list, shareable standalone.

**Source attribution is sacred** - Every claim has a source ID `[S001]`. No exceptions.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                 THE VERIFIED INVESTIGATION LOOP                  │
│                                                                  │
│  PHASE 1: RESEARCH                                               │
│    - Gemini deep research (fast, broad)                          │
│    - OpenAI deep research (max depth, critical claims)           │
│    - XAI real-time search (X/Twitter, web, news)                 │
│    - Statement searches (testimony, interviews, earnings calls)  │
│                                                                  │
│  PHASE 2: EXTRACTION                                             │
│    - Extract claims, people, dates, contradictions               │
│    - Categorize by position/perspective                          │
│                                                                  │
│  PHASE 3: INVESTIGATION                                          │
│    - For EVERY person → investigate background                   │
│    - For EVERY person → collect ALL statements (proactive)       │
│    - For EVERY person → document role timeline                   │
│    - For EVERY claim → verify with multiple sources              │
│    - For EVERY contradiction → investigate discrepancy           │
│    - Compare statements across time and venues                   │
│                                                                  │
│  PHASE 4: VERIFICATION CHECKPOINT (periodic)                      │
│    - Cross-model critique (Gemini critiques Claude)              │
│    - Identify unexplored claims from ALL positions               │
│    - Identify alternative theories to address                    │
│    - Check statement coverage and contradictions                 │
│    - Identify gaps and continue until exhausted                  │
│                                                                  │
│  PHASE 5: SYNTHESIS                                              │
│    - Register sources in sources.md (append-only)                │
│    - Update detail files (timeline, people, cases, etc.)         │
│    - Update summary.md with embedded source list                 │
│    - Log iteration in iterations.md                              │
│                                                                  │
│  TERMINATION CHECK                                               │
│    ALL must be true:                                             │
│    ✓ no unexplored threads                                       │
│    ✓ all positions documented                                    │
│    ✓ alternative theories addressed                              │
│    ✓ all major claims fact-checked                               │
│    ✓ statement histories complete                                │
│    ✓ statement evolution analyzed                                │
│    ✓ verification checklist passed                               │
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
