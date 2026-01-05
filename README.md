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
│                                                                  │
│  PHASE 2: EXTRACTION                                             │
│    - Extract claims, people, dates, contradictions               │
│    - Categorize by position/perspective                          │
│                                                                  │
│  PHASE 3: INVESTIGATION                                          │
│    - For EVERY person → investigate background                   │
│    - For EVERY claim → verify with multiple sources              │
│    - For EVERY contradiction → investigate discrepancy           │
│                                                                  │
│  PHASE 4: VERIFICATION CHECKPOINT (every 5 iterations)           │
│    - Cross-model critique (Gemini critiques Claude)              │
│    - Identify unexplored claims from ALL positions               │
│    - Identify alternative theories to address                    │
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
│    ✓ minimum iterations complete                                 │
│    ✓ no unexplored threads                                       │
│    ✓ all positions documented                                    │
│    ✓ alternative theories addressed                              │
│    ✓ all major claims fact-checked                               │
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
| `/status` | Show case progress |
| `/status --list` | List all cases |
| `/osint` | OSINT database lookup (where to find records) |

## Key Features

### Investigative Journalism
- **Chain of knowledge**: Traces who knew what, when, and what they did about it
- **All positions built**: Documents ALL sides with their strongest arguments
- **Statement vs. evidence**: Compares public claims to documentary evidence
- **Finds the hook**: Identifies the single detail that captures the whole story
- **Lets readers decide**: Presents evidence, doesn't dictate conclusions

### Built-In Verification
- **Verification checkpoints**: Catches self-deception through regular audits
- **Cross-model critique**: Gemini critiques Claude's work
- **All-sides fact-checking**: Claims from ALL positions verified
- **Alternative theory handling**: All major theories get verdicts, not ignored

### Technical
- **Triple deep research**: Gemini (fast) + OpenAI (max depth) + XAI (real-time)
- **Looping architecture**: 10+ iterations minimum, inner loops on all points
- **Probability ranges**: `[0.6, 0.8]` not false precision like `0.7`
- **Provenance tracking**: Source chains traced, circular reporting detected
- **Deep-web sources**: OSINT databases not indexed by Google
- **Modular file structure**: Scalable output, summary.md stays small
- **Source IDs**: Every claim cites `[S001]`, append-only registry

## MCP Servers

| Server | Purpose |
|--------|---------|
| `mcp-gemini` | Deep research (fast), cross-model critique |
| `mcp-openai` | Deep research (max depth), cross-model critique |
| `mcp-xai` | Real-time search (X, web, news), multi-source research |

## Documentation

| File | Contents |
|------|----------|
| `CLAUDE.md` | AI behavioral instructions |
| `architecture.md` | Technical design, data formats |
| `.claude/commands/investigate.md` | Full AgenticInvestigator procedure with verification |
| `.claude/commands/verify.md` | Verification checkpoint procedure |
| `.claude/commands/osint.md` | OSINT database sources |
| `docs/investigative_data_sources.md` | 100+ OSINT sources |

## Philosophy

### Investigative Journalism Principles
1. **Follow the paper trail** - Documents over opinions. Emails, court records, FOIA, testimony.
2. **Trace the chain** - Who knew what, when? Who did they tell? What happened next?
3. **Build ALL cases** - Strongest arguments for EVERY position, not just two.
4. **Call out contradictions** - Compare statements to evidence. Note the gaps explicitly.
5. **Find the hook** - The single most compelling detail that captures the whole story.
6. **Let readers decide** - Present evidence, acknowledge uncertainty, don't dictate conclusions.

### Verification Principles
1. **Fact-check ALL sides** - Claims from every position get verified
2. **Address alternative theories** - Don't ignore them; investigate with evidence
3. **Cross-model critique** - Different models check each other's work
4. **No premature stopping** - Cannot claim saturation until genuinely exhausted

### Technical Principles
1. **Insatiable curiosity** - Never stop until all avenues exhausted
2. **Loop on all points** - Process everything, never cherry-pick
3. **Probability ranges** - `[0.6, 0.8]` not `0.7`. Explicit uncertainty is valuable.

## License

MIT
