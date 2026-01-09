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

# Run verification checkpoint
/verify
```

## Output

**Modular files** in `cases/[topic-slug]/` (e.g., `cases/corporate-fraud-acme-corp/`):

```
├── _state.json                   # ORCHESTRATOR STATE (machine-readable)
├── _extraction.json              # Current extraction results (claims, people, entities)
├── _sources.json                 # Case-specific data sources (dynamically discovered)
├── _tasks.json                   # Dynamic task queue
├── _coverage.json                # Coverage metrics
├── evidence/                     # CAPTURED EVIDENCE (hallucination-proof)
│   ├── web/S001/                 # Screenshots, PDFs, HTML per source
│   └── documents/                # Downloaded PDFs (SEC filings, court docs)
├── research-leads/               # AI research outputs (NOT citable - leads only)
├── summary.md                    # THE DELIVERABLE - self-contained, shareable
├── sources.md                    # Master source registry [S001], [S002]...
├── timeline.md                   # Chronological events
├── people.md                     # Person profiles
├── organizations.md              # Company/entity profiles
├── positions.md                  # ALL sides - each position with arguments and evidence
├── fact-check.md                 # Claim verdicts (all sides)
├── theories.md                   # Alternative theories analysis
├── statements.md                 # Statement vs evidence, chain of knowledge
├── iterations.md                 # Progress log + verification checkpoints
└── articles.md                   # Publication-ready articles (generated)
```

**summary.md is self-contained** - includes complete source list, shareable standalone.

**Source attribution is sacred** - Every claim has a source ID `[S001]`. No exceptions.

**Evidence capture is mandatory** - Every source has local screenshots/PDFs proving content existed.

## Architecture: Dynamic Task Generation

**The system generates investigation tasks dynamically** based on what the case needs—not hardcoded templates.

### Key Innovation: Dynamic Source Discovery

Instead of relying on static reference files, the system **discovers case-specific data sources dynamically** using deep research. A pharmaceutical fraud investigation gets FDA MAUDE, ClinicalTrials.gov adverse events, and state pharmacy boards. A hedge fund investigation gets FINRA BrokerCheck, Form ADV, and SEC enforcement actions.

The baseline (`framework/data-sources.md`) seeds the discovery. Case-specific sources are found via deep research and saved to `_sources.json`. This ensures:

| Old Approach | New Approach |
|--------------|--------------|
| Static source list for entity type | Sources discovered for THIS specific case |
| Generic "corporate" sources for all | FDA for pharma, FINRA for finance, etc. |
| May miss novel investigation types | Adapts to any topic dynamically |
| Reference file may be stale | Always current via deep research |

### Three-Layer Rigor System

1. **Layer 1: Required Perspectives** (every task generation cycle)
   - 10 core perspectives: Money, Timeline, Silence, Documents, Contradictions, Relationships, Hypotheses, Assumptions, Counterfactual, Blind Spots
   - + Curiosity check (at least 2 tasks per cycle)

2. **Layer 2: Adversarial Pass** (after initial task generation)
   - What would disprove each claim?
   - Strongest argument for unexplored positions?
   - What assumptions are embedded?

3. **Layer 3: Rigor Checkpoint** (before termination)
   - Validate ALL 20 investigative frameworks addressed
   - Cannot terminate with unexplained gaps

## Orchestrator Pattern

**The main Claude Code instance ONLY orchestrates. All actual work is done by sub-agents via the Task tool.**

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
│    ✓ Reads _state.json, _tasks.json, _coverage.json                          │
│    ✓ Dispatches sub-agents via Task tool                                     │
│    ✓ Tracks termination gates                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### State Tracking

Each case has a `_state.json` for orchestrator state:

```json
{
  "case_id": "topic-slug",
  "topic": "Original investigation topic",
  "status": "IN_PROGRESS",
  "current_iteration": 5,
  "current_phase": "INVESTIGATION",
  "next_source_id": "S048",
  "verification_passed": false,
  "adversarial_complete": false,
  "rigor_checkpoint_passed": false,
  "quality_checks_passed": false,
  "created_at": "2026-01-07T09:00:00Z",
  "updated_at": "2026-01-08T10:30:00Z"
}
```

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│              DYNAMIC INVESTIGATION LOOP                          │
│                                                                  │
│  1. RESEARCH (multi-engine, parallel)                           │
│     → Gemini, OpenAI, XAI deep research                         │
│     → Save to research-leads/                                    │
│                                                                  │
│  2. EXTRACTION                                                   │
│     → Parse findings into _extraction.json                       │
│                                                                  │
│  3. SOURCE DISCOVERY (dynamic)                                   │
│     → Deep research to find case-specific data sources           │
│     → Merge baseline + discovered → _sources.json                │
│                                                                  │
│  4. TASK GENERATION (core innovation)                           │
│     → Generate tasks with 10 REQUIRED PERSPECTIVES               │
│     → Use sources from _sources.json                             │
│     → Generate 2+ CURIOSITY tasks                                │
│     → Write to _tasks.json                                       │
│                                                                  │
│  5. ADVERSARIAL PASS                                            │
│     → What would disprove each claim?                           │
│     → Generate counter-tasks for blind spots                     │
│                                                                  │
│  6. EXECUTE TASKS (parallel where independent)                  │
│     → Investigation agents use _sources.json                     │
│     → Update detail files, mark tasks complete                   │
│                                                                  │
│  7. UPDATE COVERAGE                                             │
│     → Calculate metrics in _coverage.json                        │
│                                                                  │
│  8. VERIFICATION                                                │
│     → Anti-hallucination check                                  │
│     → Cross-model critique                                      │
│                                                                  │
│  9. TERMINATION GATE CHECK (8 gates)                           │
│     → All pass? → SYNTHESIS + ARTICLE                           │
│     → Any fail? → Regenerate tasks → LOOP                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 8 Termination Gates

**ALL must pass to complete:**

```
1. Coverage thresholds met:
   - People: investigated/mentioned ≥ 90%
   - Entities: investigated/mentioned ≥ 90%
   - Claims: verified/total ≥ 80%
   - Sources: captured/cited = 100%
   - Positions: documented/identified = 100%
   - Contradictions: explored/identified = 100%

2. No HIGH priority tasks pending
3. adversarial_complete == true
4. rigor_checkpoint_passed == true (20 frameworks validated)
5. verification_passed == true
6. quality_checks_passed == true (integrity + legal)
7. All positions steelmanned
8. No unexplored contradictions
```

**If ANY gate fails → generate tasks to address → loop.**

## Commands

### Entry Point
| Command | Purpose |
|---------|---------|
| `/investigate --new [topic]` | Start new investigation (topic required) |
| `/investigate [case-id]` | Resume specific case by ID |
| `/investigate [case-id] [topic]` | Resume case with new research direction |

### Manual Overrides (auto-invoked by main loop)
| Command | Purpose |
|---------|---------|
| `/verify` | Run verification checkpoint |
| `/integrity` | Run journalistic integrity check |
| `/legal-review` | Run legal risk assessment |
| `/article` | Generate publication-ready articles |

### Data Sources
Investigation agents use dynamically discovered sources from `_sources.json`. The SOURCE DISCOVERY phase finds case-specific databases (FDA for pharma, FINRA for finance) via deep research, merged with baseline sources from `framework/data-sources.md`.

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

## MCP Servers

| Server | Purpose |
|--------|---------|
| [`mcp-gemini`](https://github.com/DanDaDaDanDan/mcp-gemini) | Deep research (fast), cross-model critique |
| [`mcp-openai`](https://github.com/DanDaDaDanDan/mcp-openai) | Deep research (max depth), cross-model critique |
| [`mcp-xai`](https://github.com/DanDaDaDanDan/mcp-xai) | Real-time search (X, web, news), multi-source research |

## Documentation

| File | Contents |
|------|----------|
| `framework/rules.md` | **Canonical rules** (sources, evidence, verification, state ownership) |
| `framework/architecture.md` | Technical design, data formats |
| `framework/data-sources.md` | 100+ OSINT sources |
| `CLAUDE.md` | AI behavioral instructions |
| `.claude/commands/investigate.md` | Full investigation procedure |
| `.claude/commands/verify.md` | Verification checkpoint procedure |
| `.claude/commands/legal-review.md` | Legal risk assessment procedure |
| `.claude/commands/integrity.md` | Integrity check procedure |
| `.claude/commands/article.md` | Article generation procedure |

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
