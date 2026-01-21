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
CREATE CASE → PLAN → BOOTSTRAP → QUESTION → FOLLOW → WRITE → VERIFY → COMPLETE
```

1. **CREATE CASE**: Initialize case folder and git repository
2. **PLAN**: Design investigation strategy with custom questions (GPT 5.2 Pro)
3. **BOOTSTRAP**: Initial research, capture sources, draft summary
4. **QUESTION**: Apply 35 analytical frameworks + custom questions
5. **FOLLOW**: Pursue all leads → reconcile with summary → check curiosity
6. **WRITE**: Generate publication articles (short/medium/full + PDFs)
7. **VERIFY**: Check all 8 gates before completion

## The 8 Gates

| # | Gate | Pass Criteria |
|---|------|---------------|
| 0 | Planning | Investigation strategy designed |
| 1 | Questions | All 35 frameworks + custom questions investigated |
| 2 | Curiosity | All leads pursued to conclusion |
| 3 | Reconciliation | Lead results sync with summary |
| 4 | Article | Publication-ready article exists |
| 5 | Sources | All citations verified against claim registry |
| 6 | Integrity | Journalistic standards met |
| 7 | Legal | Legal risk assessment passed |

## Output

Each case creates `cases/[topic-slug]/` with:

| File | Purpose |
|------|---------|
| `summary.md` | Investigation record with all findings |
| `articles/short.md` + `short.pdf` | Quick read (500-900 words) |
| `articles/medium.md` + `medium.pdf` | Balanced coverage (2,200-3,800 words) |
| `articles/full.md` + `full.pdf` | Comprehensive (no limit) - primary deliverable |
| `questions/` | 35 framework Q&A documents + custom questions |
| `evidence/S###/` | Captured sources with metadata, content, raw HTML |
| `leads.json` | Lead tracking with depth and parent relationships |
| `sources.json` | Source registry with capture status |
| `claims.json` | Verified claims registry (extracted from sources) |
| `removed-points.md` | Auto-removed unverifiable claims (for review) |
| `future_research.md` | Leads beyond max depth (for future work) |

Planning phase creates (directly in case folder):
- `refined_prompt.md` - Clarified investigation question
- `strategic_context.md` - Landscape understanding
- `investigation_plan.md` - Strategy and approach
- `custom_questions.md` - Topic-specific questions beyond 35 frameworks

## Skills

Skills are defined in `.claude/skills/*/SKILL.md` with YAML frontmatter for configuration.

| Skill | Purpose | Isolation |
|-------|---------|-----------|
| `/investigate` | Start/resume investigation | User entry point |
| `/case-feedback` | Revise completed investigation | User entry point |
| `/action` | Router for all operations (auto git commits) | - |
| `/plan-investigation` | Design investigation strategy (3-step) | `context: fork` |
| `/research` | Broad topic research | `context: fork` |
| `/question` | Answer framework questions | - |
| `/follow` | Pursue a lead | - |
| `/reconcile` | Sync lead results with summary | `context: fork` |
| `/curiosity` | Check if leads exhausted | `context: fork` |
| `/capture-source` | Capture web evidence | - |
| `/article` | Generate articles | `context: fork` |
| `/verify` | Check 8 gates | `context: fork` |
| `/integrity` | Journalistic standards check | `context: fork` |
| `/legal-review` | Legal risk assessment | `context: fork` |
| `/parallel-review` | Integrity + Legal in parallel | `context: fork` |
| `/merge-cases` | Combine multiple investigations | `context: fork` |

Skills with `context: fork` automatically run in isolated sub-agents for context management.

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
| `.claude/skills/*/SKILL.md` | Skill definitions with frontmatter |
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
