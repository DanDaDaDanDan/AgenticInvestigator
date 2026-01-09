# AgenticInvestigator

**Investigative journalism framework for Claude Code.** Produces rigorous, balanced reporting on contested topics using parallel multi-model research, cross-model critique, built-in verification, and transparent evidence-based analysis.

This is not a debunking tool. It's a **reporting framework** that traces chains of knowledge, builds cases for ALL sides, fact-checks claims from ALL perspectives, and lets readers draw their own conclusions.

## Core Philosophy: INSATIABLE CURIOSITY

Every finding triggers more questions. Every person mentioned gets investigated. Every source gets traced. Every contradiction gets explored. **Every claim from ALL sides gets fact-checked.**

## Quick Start

```bash
# Start new investigation
/investigate --new "Corporate fraud at Acme Corp"

# Resume specific case
/investigate corporate-fraud-acme-corp

# Run verification checkpoint
/verify
```

## Output

Each case creates `cases/[topic-slug]/` with:

| File | Purpose |
|------|---------|
| `summary.md` | **THE DELIVERABLE** - self-contained, shareable |
| `_state.json` | Orchestrator state |
| `_sources.json` | Dynamically discovered data sources |
| `_tasks.json` | Dynamic task queue |
| `evidence/` | Captured screenshots, PDFs, HTML |
| `people.md`, `organizations.md` | Entity profiles |
| `positions.md`, `fact-check.md` | All sides, verified claims |
| `timeline.md`, `theories.md` | Events and alternative theories |

**Source attribution is sacred** - Every claim has `[S001]` citation. No exceptions.

## How It Works

```
RESEARCH → EXTRACTION → SOURCE DISCOVERY → TASK GENERATION
    ↓
ADVERSARIAL PASS → EXECUTE TASKS → UPDATE COVERAGE
    ↓
VERIFICATION → TERMINATION CHECK (9 gates)
    ↓
All pass? → SYNTHESIS + ARTICLE
Any fail? → Loop back to TASK GENERATION
```

**Key innovations:**
- **Dynamic Source Discovery** - Finds case-specific databases (FDA for pharma, FINRA for finance)
- **Three-Layer Rigor** - Required perspectives, adversarial pass, 20-framework checkpoint
- **9 Termination Gates** - Mechanically verified, cannot complete until all pass

See `framework/architecture.md` for detailed workflow and schemas.

## Commands

| Command | Purpose |
|---------|---------|
| `/investigate --new [topic]` | Start new investigation |
| `/investigate [case-id]` | Resume case |
| `/verify` | Run verification checkpoint |
| `/integrity` | Journalistic integrity check |
| `/legal-review` | Legal risk assessment |
| `/article` | Generate publication-ready articles |

## Evidence Capture

Every source gets captured locally (hallucination-proof):

```bash
./scripts/capture S001 https://example.com/article
```

Creates `evidence/web/S001/` with screenshot, PDF, HTML, and metadata.

**AI research outputs are NOT sources.** Save to `research-leads/`, then find and capture primary sources.

## MCP Servers

| Server | Purpose |
|--------|---------|
| `mcp-gemini` | Deep research (fast), cross-model critique |
| `mcp-openai` | Deep research (max depth) |
| `mcp-xai` | Real-time search (X, web, news) |

## Documentation

| File | Contents |
|------|----------|
| `framework/rules.md` | **Canonical rules** - sources, evidence, verification, termination gates |
| `framework/architecture.md` | **Technical design** - schemas, workflow, data structures |
| `framework/data-sources.md` | Baseline OSINT sources (seeds dynamic discovery) |
| `CLAUDE.md` | AI behavioral instructions |
| `.claude/commands/*.md` | Command procedures |

## Philosophy

**Investigative Journalism Principles:**
1. Follow the paper trail - Documents over opinions
2. Trace the chain - Who knew what, when?
3. Build ALL cases - Strongest arguments for EVERY position
4. Call out contradictions - Compare statements to evidence
5. Let readers decide - Present evidence, don't dictate conclusions

**Verification Principles:**
1. Fact-check ALL sides
2. Address alternative theories with evidence
3. Cross-model critique
4. No premature stopping

## License

MIT
