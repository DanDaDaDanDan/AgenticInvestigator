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

### Deliverables

| File | Purpose |
|------|---------|
| `summary.md` | **Investigation Record** - comprehensive findings, source of truth |
| `articles/article-short.md` | **For Publication** - quick-read overview (400-800 words) |
| `articles/article-full.md` | **For Publication** - full professional article (2,000-4,000 words) |

Articles are derived from `summary.md` via `/article`. The summary is the canonical record containing all findings; articles are polished outputs formatted for publication.

### Supporting Files

| File | Purpose |
|------|---------|
| `state.json` | Minimal orchestrator state (10 lines) |
| `ledger.json` | Append-only audit log for debugging |
| `sources.json` | Captured source registry |
| `control/` | Verifier outputs (`gaps.json`, `gate_results.json`) |
| `claims/` | Claim registry (`C####.json` with evidence bundles) |
| `tasks/` | Task files (`T###.json`, `A###.json`, `R###.json`) |
| `findings/` | Task output files (`T001-findings.md`) |
| `evidence/` | Captured screenshots, PDFs, HTML |

**Source attribution is sacred** - Every claim has `[S001]` citation. No exceptions.

## CAPTURE BEFORE CITE

**You cannot cite what you haven't captured.**

```
CORRECT: capture -> verify -> cite
FORBIDDEN: cite -> maybe capture later
```

If `evidence/web/S001/` doesn't exist, you CANNOT write `[S001]` anywhere.

## How It Works

```
+---------------------------------+
|  0) VERIFY (run every cycle)    |
|     node scripts/generate-gaps.js |
|     -> control/gaps.json          |
+-------------+-------------------+
              | drives all work
              v
+---------------------------------+
|  1) PLAN                        |
|     gaps -> R### tasks           |
|     + A### adversarial          |
|     + T### investigation        |
+-------------+-------------------+
              |
              v
+---------------------------------+
|  2) EXECUTE                     |
|     capture evidence            |
|     update claims/C####.json    |
|     write findings/             |
+-------------+-------------------+
              |
              v
         (back to VERIFY)

TERMINATE: blocking gaps = 0 AND `node scripts/verify-all-gates.js` exits 0
```

**Key innovations:**
- **Verification-First Loop** - VERIFY -> PLAN -> EXECUTE every iteration
- **Gap-Driven Tasks** - `control/gaps.json` drives all work, not exploration
- **Claim Registry** - `claims/C####.json` with explicit corroboration requirements
- **Question-Shaped Tasks** - "What evidence corroborates X?" not "Investigate X"
- **9 Termination Gates** - Mechanically verified, 100% thresholds, cannot complete until all pass
- **Filesystem as Truth** - Gates verify file existence, not self-reported flags

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
node scripts/capture.js S001 "https://example.com/article" cases/my-case
```

Creates `evidence/web/S001/` with screenshot, PDF, HTML, and metadata.

**AI research outputs are NOT sources.** Save to `research-leads/`, then find and capture primary sources.

## Verification

```bash
# Run all 9 termination gates
node scripts/verify-all-gates.js cases/[case-id]

# Exit 0 = ready to terminate
# Exit 1 = must continue (gates failed)
```

**All thresholds are 100%.** No partial credit. No "documented gaps" exemption.

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
| `.claude/commands/prompts/` | Agent prompt templates |

## Architecture Overview

```
Orchestrator (main)
+-- Reads: state.json, control/gaps.json, claims/index.json
+-- Runs: node scripts/generate-gaps.js every iteration
+-- Dispatches: Sub-agents with prompt templates
+-- Tracks: Progress via TodoWrite
+-- Enforces: 9 termination gates (100% thresholds)

Sub-agents
+-- Read: state.json, tasks/*.json, claims/C####.json
+-- Write: findings/*.md, claims/*.json
+-- Capture: evidence/web/S###/
+-- Log: ledger-append.js

Verification (every iteration)
+-- node scripts/generate-gaps.js -> control/gaps.json
+-- node scripts/verify-corroboration.js (claim evidence bundles)
+-- node scripts/verify-all-gates.js -> control/gate_results.json
+-- Blocking gaps = 0 to terminate
```

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
5. 100% coverage thresholds

## License

MIT
