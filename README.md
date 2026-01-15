# AgenticInvestigator

**Investigative journalism framework for Claude Code.** Produces rigorous, balanced reporting on contested topics using multi-model research, cross-model critique, and transparent evidence-based analysis.

This is not a debunking tool. It's a **reporting framework** that traces chains of knowledge, builds cases for ALL sides, fact-checks claims from ALL perspectives, and lets readers draw their own conclusions.

## Quick Start

```bash
# Start new investigation
/investigate --new "topic description"

# Resume investigation
/investigate [case-id]
```

## How It Works

```
BOOTSTRAP → QUESTION → FOLLOW → WRITE → VERIFY → COMPLETE
```

1. **BOOTSTRAP**: Initial research, capture sources, draft summary
2. **QUESTION**: Apply 35 analytical frameworks via structured Q&A
3. **FOLLOW**: Pursue all leads generated from questions
4. **WRITE**: Generate publication articles
5. **VERIFY**: Check all 6 gates before completion

## The 6 Gates

| Gate | Pass Criteria |
|------|---------------|
| Questions | All 35 frameworks investigated |
| Curiosity | All leads pursued to conclusion |
| Article | Publication-ready article exists |
| Sources | All citations have captured evidence |
| Integrity | Journalistic standards met |
| Legal | Legal risk assessment passed |

## Output

Each case creates `cases/[topic-slug]/` with:

| File | Purpose |
|------|---------|
| `summary.md` | Investigation record with all findings |
| `articles/short.md` | Quick read (400-800 words) |
| `articles/full.md` | Full publication (2,000-4,000 words) |
| `questions/` | 35 framework Q&A documents |
| `evidence/` | Captured screenshots, PDFs, HTML |
| `leads.json` | Lead tracking |
| `sources.json` | Source registry |

## Commands

| Command | Purpose |
|---------|---------|
| `/investigate` | Start/resume investigation |
| `/action` | Router for all operations (auto git commits) |
| `/research` | Broad topic research |
| `/question` | Answer framework questions |
| `/follow` | Pursue a lead |
| `/curiosity` | Check if leads exhausted |
| `/capture-source` | Capture web evidence |
| `/article` | Generate articles |
| `/verify` | Check 6 gates |
| `/integrity` | Journalistic standards check |
| `/legal-review` | Legal risk assessment |

## Evidence Capture

**CAPTURE BEFORE CITE** - No `[S###]` citation without captured evidence.

```bash
node scripts/capture.js S001 "https://example.com/article" cases/[case-id]
```

Creates `evidence/S001/` with markdown content, links, and metadata.

## The 35 Frameworks

Investigation rigor ensured through 35 analytical frameworks:

- **Core Investigation (1-20)**: Follow the Money, Silence, Timeline, Documents, Contradictions, Relationships; Stakeholder Mapping; Network Analysis; Means/Motive/Opportunity; Competing Hypotheses; and more
- **Domain Expertise (21-25)**: First Principles, Domain Expert Blind Spots, Marketing vs Reality, Subject Experience, Contrarian Expert Search
- **Analytical Rigor (26-30)**: Quantification, Causation vs Correlation, Definitional Analysis, Methodology Audit, Incentive Mapping
- **Structural Analysis (31-35)**: Information Asymmetry, Comparative Benchmarking, Regulatory Capture, Data Provenance, Mechanism Tracing

See `reference/frameworks.md` for full details.

## Prerequisites

### MCP Server Installation

AgenticInvestigator requires four MCP servers to be installed and configured in Claude Code. All servers are available at:

**https://github.com/DanDaDaDanDan/mcp-***

Install each server:

```bash
# Clone and install each MCP server
git clone https://github.com/DanDaDaDanDan/mcp-osint
git clone https://github.com/DanDaDaDanDan/mcp-gemini
git clone https://github.com/DanDaDaDanDan/mcp-openai
git clone https://github.com/DanDaDaDanDan/mcp-xai

# Follow installation instructions in each repository's README
```

Configure each server in your Claude Code MCP settings (`.claude/settings.json` or global settings).

### Required API Keys

Each MCP server requires its respective API key:
- `mcp-osint`: Various (see repo for supported sources)
- `mcp-gemini`: Google AI API key
- `mcp-openai`: OpenAI API key
- `mcp-xai`: xAI API key

## MCP Servers

| Server | Purpose |
|--------|---------|
| `mcp-osint` | OSINT data sources, web capture, evidence collection |
| `mcp-gemini` | Deep research, semantic verification |
| `mcp-openai` | Deep research (max depth) |
| `mcp-xai` | Real-time search (X, web, news) |

## Documentation

| File | Contents |
|------|----------|
| `CLAUDE.md` | Behavioral rules, workflow, schemas |
| `.claude/commands/*.md` | Command procedures |
| `reference/frameworks.md` | 35 analytical frameworks |
| `scripts/README.md` | Script documentation |

## Philosophy

**Investigative Journalism Principles:**
1. Follow the paper trail - Documents over opinions
2. Trace the chain - Who knew what, when?
3. Build ALL cases - Strongest arguments for EVERY position
4. Call out contradictions - Compare statements to evidence
5. Let readers decide - Present evidence, don't dictate conclusions

**Core Rules:**
- Capture before cite
- Every fact needs a source
- Steelman all positions
- Document uncertainty
- Detect circular reporting

## License

MIT
