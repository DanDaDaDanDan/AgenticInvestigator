# AgenticInvestigator - Claude Instructions

Behavioral rules and quick reference for Claude Code operating in this project.

---

## Document Sync Requirements

**CRITICAL**: When modifying system behavior, keep these files in sync:

| File | Update When... |
|------|----------------|
| `README.md` | Commands change, features change, workflow changes |
| `architecture.md` | Data formats change, parallelization changes, case structure changes |
| `CLAUDE.md` | Behavioral rules change, MCP tools change |

After any structural change, verify all three files are consistent.

---

## Philosophy

1. **Fail fast** - Surface problems immediately. Don't paper over issues.
2. **Be curious** - Explore, question assumptions, dig deeper.
3. **Don't guess, research** - Investigate first. If still uncertain, ask.
4. **No mock code** - Write real, functional code or don't write it.
5. **No silent rollbacks** - Don't revert on failure. Surface it and wait.
6. **Finish the job** - Verify completion. Never stop mid-task silently.
7. **Commit early, commit often** - Git is our safety net. Be bold.

---

## Commands

| Command | Purpose | Detailed Docs |
|---------|---------|---------------|
| `/investigate --new [topic]` | Start new investigation (topic required) | `.claude/commands/investigate.md` |
| `/investigate [case-id]` | Resume specific case | `.claude/commands/investigate.md` |
| `/investigate [case-id] [topic]` | Resume case with new research direction | `.claude/commands/investigate.md` |
| `/verify` | Run verification checkpoint | `.claude/commands/verify.md` |
| `/verify [case-id]` | Verify specific case | `.claude/commands/verify.md` |
| `/status` | Show case progress | `.claude/commands/status.md` |
| `/status [case-id]` | Show status of specific case | `.claude/commands/status.md` |
| `/status --list` | List all cases | `.claude/commands/status.md` |
| `/osint` | OSINT quick reference | `.claude/commands/osint.md` |
| `/osint [topic]` | OSINT sources for specific investigation type | `.claude/commands/osint.md` |
| `/questions` | Generate investigative questions for active case | `.claude/commands/questions.md` |
| `/questions [case-id]` | Generate questions for specific case | `.claude/commands/questions.md` |
| `/financial [entity]` | Financial investigation toolkit | `.claude/commands/financial.md` |
| `/financial [case-id]` | Financial analysis for existing case | `.claude/commands/financial.md` |
| `/financial [case-id] [entity]` | Add financial focus to existing case | `.claude/commands/financial.md` |
| `/legal-review` | Pre-publication legal risk assessment | `.claude/commands/legal-review.md` |
| `/legal-review [case-id]` | Legal review for specific case | `.claude/commands/legal-review.md` |
| `/integrity` | Journalistic integrity & neutrality check | `.claude/commands/integrity.md` |
| `/integrity [case-id]` | Integrity check for specific case | `.claude/commands/integrity.md` |
| `/article` | Generate journalistic articles from findings | `.claude/commands/article.md` |
| `/article [case-id]` | Generate articles for specific case | `.claude/commands/article.md` |

---

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

---

## Orchestrator-Only Architecture (CRITICAL)

**The main Claude Code instance ONLY orchestrates. All actual work is done by sub-agents via Task tool.**

This prevents context bloat in the main loop and ensures all findings are persisted to files.

### What the Orchestrator Does

| Action | ✓ ALLOWED | ✗ FORBIDDEN |
|--------|-----------|-------------|
| State tracking | Read file headers (20-30 lines) | Read full file contents |
| Research | Dispatch sub-agents via Task tool | Call MCP research tools directly |
| Analysis | Dispatch sub-agents | Process research results in main loop |
| File updates | Dispatch sub-agents | Write large content directly |
| Iteration tracking | Track iteration count | Accumulate findings in memory |

### Orchestrator Loop

```
REPEAT:
  1. READ STATE: Read _state.json or file headers (brief)
  2. DECIDE: What phase/step is next?
  3. DISPATCH: Launch sub-agents via Task tool (parallel when independent)
  4. WAIT: Sub-agents write to files, return brief status
  5. CHECK: Read brief status from files
  6. LOOP OR TERMINATE
```

### Sub-Agent Dispatch Rules

**ALWAYS use Task tool with `subagent_type: "general-purpose"` for:**
- Research (Gemini, OpenAI, XAI deep research)
- Extraction (parsing research-leads/)
- Investigation (people, claims, timelines)
- Verification (cross-model critique)
- Synthesis (summary.md updates)
- Any file analysis or updates

**Sub-agent prompts MUST include:**
1. **TASK**: Clear description of what to do
2. **CASE**: Path to case directory
3. **ITERATION**: Current iteration number
4. **ACTIONS**: Specific steps to perform
5. **OUTPUT FILE**: Where to write results
6. **RETURN**: "Brief status only" (counts, key findings, errors)

**Sub-agents MUST:**
- Write ALL findings to specified files
- NEVER return large content bodies to orchestrator
- Update _state.json with state changes
- Return only brief status message

### State File (_state.json)

Each case has a `_state.json` for orchestrator state tracking:

```json
{
  "case_id": "topic-slug",
  "topic": "Original investigation topic",
  "status": "IN_PROGRESS",
  "current_iteration": 5,
  "current_phase": "VERIFICATION",
  "next_source_id": "S048",
  "people_count": 12,
  "sources_count": 47,
  "gaps": ["gap1", "gap2"],
  "last_verification": "2026-01-08T10:30:00Z",
  "verification_passed": false,
  "created_at": "2026-01-07T09:00:00Z",
  "updated_at": "2026-01-08T10:30:00Z"
}
```

Sub-agents update this file. Orchestrator reads it.

See `architecture.md` → "Agent Orchestration Model" for full details.

---

## Core Philosophy: INSATIABLE CURIOSITY

**The key to AgenticInvestigator is to be INSATIABLY CURIOUS.**

Every finding triggers more questions. Every person gets investigated. Every source gets traced. Every contradiction gets explored. Every gap gets filled. **Every claim from ALL sides gets fact-checked.**

### The Looping Principle

```
DO NOT STOP EARLY.

Only stop when ALL conditions are true:
  1. No unexplored avenues remaining
  2. All positions documented
  3. All alternative theories addressed
  4. All major claims from ALL sides fact-checked
  5. Verification checklist passed
```

---

## The Investigation Loop (Orchestrator View)

**All phases executed via sub-agents. Orchestrator only dispatches and tracks.**

```
┌─────────────────────────────────────────────────────────────────────┐
│                   INVESTIGATION LOOP (Orchestrator)                  │
│                                                                     │
│  PHASE 1: RESEARCH → Dispatch Research Agents (parallel)            │
│    [Agent] Gemini deep research → research-leads/                   │
│    [Agent] OpenAI deep research → research-leads/                   │
│    [Agent] XAI real-time search → research-leads/                   │
│    [Agent] Statement searches → research-leads/                     │
│                                                                     │
│  PHASE 2: EXTRACTION → Dispatch Extraction Agent                    │
│    [Agent] Parse research-leads/ → _extraction.json                 │
│    [Agent] Update _state.json with new items found                  │
│                                                                     │
│  PHASE 3: INVESTIGATION → Dispatch Investigation Agents (parallel)  │
│    [Agent] Person A background → people.md                          │
│    [Agent] Person B background → people.md                          │
│    [Agent] Claim X verification → fact-check.md                     │
│    [Agent] Timeline event Y → timeline.md                           │
│                                                                     │
│  PHASE 4: VERIFICATION → Dispatch Verification Agent                │
│    [Agent] Cross-model critique → iterations.md (checkpoint)        │
│    [Agent] Gap analysis → _state.json (gaps list)                   │
│                                                                     │
│  PHASE 5: SYNTHESIS → Dispatch Synthesis Agent                      │
│    [Agent] Read all detail files → summary.md (complete rewrite)    │
│    [Agent] Update _state.json (iteration++, phase, status)          │
│    [Agent] Git commit                                               │
│                                                                     │
│  TERMINATION CHECK (orchestrator reads _state.json)                 │
│    - verification_passed == true                                    │
│    - gaps.length == 0                                               │
│    - status == "COMPLETE"                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Parallelization Rules

**Always maximize parallel execution.** Dispatch multiple sub-agents in ONE message when tasks are independent.

### Phase 1 - Research (parallel)

Dispatch ALL in ONE message:
```
Task 1: Research Agent - Gemini deep research on [topic]
Task 2: Research Agent - OpenAI deep research on [critical claims]
Task 3: Research Agent - XAI multi-source search
Task 4: Research Agent - X/Twitter discourse
Task 5: Research Agent - Official records search
Task 6: Research Agent - Alternative theories search
```

All write to `research-leads/`. Orchestrator waits for all to complete.

### Phase 3 - Investigation (parallel)

Dispatch ALL in ONE message:
```
Task 1: Investigation Agent - Person A (writes to people.md)
Task 2: Investigation Agent - Person B (writes to people.md)
Task 3: Investigation Agent - Claim verification (writes to fact-check.md)
Task 4: Investigation Agent - Timeline event (writes to timeline.md)
```

Each agent updates its target file and _state.json.

### Phase 4 - Verification (parallel)

Dispatch ALL in ONE message:
```
Task 1: Verification Agent - Cross-model critique (Gemini)
Task 2: Verification Agent - Unexplored claims search
Task 3: Verification Agent - Alternative theory search
```

Results aggregated in iterations.md checkpoint and _state.json gaps.

---

## The /questions Command: 20 Frameworks

Use `/questions` to generate investigative questions using 20 frameworks in 6 categories:

### Quick Reference

| # | Framework | Category | Key Question |
|---|-----------|----------|--------------|
| 1-6 | Money, Silence, Timeline, Documents, Contradictions, Uncomfortable | Core | Who benefits? Who's silent? What's the paper trail? |
| 7-10 | Stakeholder Mapping, Network Analysis, Means/Motive/Opportunity, Relationships | People | Who has power? Who connects them? |
| 11-13 | ACH, Key Assumptions, Patterns | Analysis | Which theory fits? What are we assuming? |
| 14-16 | Counterfactual, Pre-Mortem, Cognitive Bias | Adversarial | What would prove this wrong? If we're wrong, why? |
| 17-19 | Second-Order Effects, Meta Questions, Sense-Making | Context | What happens next? What does this mean? |
| 20 | 5 Whys | Root Cause | Why was this possible? |

### When to Use

| Investigation Stage | Frameworks to Apply |
|--------------------|---------------------|
| Early (gathering facts) | Core (1-6) + Stakeholder + Relationships + Sense-Making |
| Mid (building understanding) | Add Network, Means/Motive, ACH, Assumptions, Patterns, Meta, 5 Whys |
| Late (stress testing) | Add Counterfactual, Pre-Mortem, Cognitive Bias, Second-Order |
| When stuck | Pre-Mortem, Bias Check, Uncomfortable Questions |

### The Investigator's Mindset (20 Principles)

1. "What are they hiding?" - Assume concealment
2. "Who benefits?" - Follow the incentives
3. "What's the paper trail?" - Documents don't lie
4. "Who's NOT talking?" - Silence speaks
5. "What happened before/after?" - Context matters
6. "Who knows whom?" - Relationships explain behavior
7. "Who has power here?" - Map the stakeholders
8. "Who connects these people?" - Find the network nodes
9. "Who had means, motive, opportunity?" - Classic forensics
10. "Which theory fits the evidence?" - Test hypotheses
11. "What are we assuming?" - Challenge assumptions
12. "Has this happened before?" - Find patterns
13. "What would prove this wrong?" - Steel-man the opposition
14. "If we're wrong, why?" - Pre-mortem thinking
15. "What are our blind spots?" - Audit for bias
16. "What would they refuse to answer?" - Ask the uncomfortable
17. "What happens next?" - Think second-order
18. "Why is this story being told now?" - Question the narrative
19. "Why was this possible?" - Find root causes
20. "So what?" - Every finding needs significance

---

## Case File Structure

**Each case has its own git repository for version control.**

**Case naming**: Folder name is a slug derived from the topic (e.g., `boeing-737-max`, `ftx-collapse`).

```
cases/[topic-slug]/
├── _state.json                   # ORCHESTRATOR STATE (machine-readable)
├── _extraction.json              # Current extraction results (claims, people, dates)
├── .git/                         # Case-specific git repository
├── evidence/                     # EVIDENCE ARCHIVE (hallucination-proof)
│   ├── web/S001/                 # Screenshots, PDFs, HTML per source
│   ├── documents/                # Downloaded PDFs (SEC filings, court docs)
│   ├── api/                      # API response captures
│   └── media/                    # Videos, transcripts
├── research-leads/               # AI research outputs (NOT citable)
├── summary.md                    # THE DELIVERABLE - self-contained, shareable
├── sources.md                    # Source registry with URLs, evidence paths, hashes
├── timeline.md                   # Chronological events
├── people.md                     # Person profiles
├── positions.md                  # ALL positions with arguments and evidence
├── fact-check.md                 # Claim verdicts (all positions)
├── theories.md                   # Alternative/fringe theories
├── statements.md                 # Statement vs evidence analysis
├── iterations.md                 # Progress log + verification checkpoints
├── integrity-check.md            # Journalistic integrity assessment (generated)
├── legal-review.md               # Pre-publication legal risk assessment (generated)
└── articles.md                   # Publication-ready articles (generated)
```

### Evidence Capture (CRITICAL)

**Every source must have captured evidence. Capture IMMEDIATELY when found.**

```bash
# Web page capture
./scripts/capture S001 https://example.com/article

# Document download
./scripts/capture --document S015 https://sec.gov/filing.pdf

# Verify all sources have evidence
node scripts/verify-sources.js /path/to/case
```

**AI research (Gemini/OpenAI deep research) = LEADS, not sources.**
- Save AI output to `research-leads/` (for reference only)
- Find primary source URL for each claim
- Capture primary source with `./scripts/capture`
- NEVER cite AI research directly - cite the captured primary source

### Source Attribution (CRITICAL)

**Every claim must have a source ID with captured evidence. No exceptions.**

```
Source format: [S001], [S002], [S003]...
- Append-only: Never renumber, never delete
- Cite inline: "The CEO knew by January [S001] [S002]."
- Each source has evidence in evidence/web/SXXX/ or evidence/documents/
- summary.md embeds complete source list → shareable standalone
```

### summary.md Quality Standards (CRITICAL)

**summary.md is THE DELIVERABLE - a polished final product, NOT a ledger.**

#### What summary.md IS:
- A self-contained, shareable investigative report
- Written as if composed in one sitting by a professional journalist
- Smooth narrative flow with no seams showing
- Complete with all sources embedded
- Ready to share with anyone without additional context

#### What summary.md is NOT:
- A log of iterative discoveries
- A ledger showing additions over time
- A changelog with "additionally found..." or "we also discovered..."
- A working document with visible revision artifacts

#### Rewrite, Don't Append

Each time summary.md is updated:
1. **Completely rewrite** as a fresh, polished document
2. **Remove all artifacts** of iterative process
3. **No language** that reveals multiple passes:
   - ❌ "We also found..."
   - ❌ "Additionally..."
   - ❌ "In a subsequent search..."
   - ❌ "Further investigation revealed..."
   - ✅ Just state the findings directly
4. **Smooth narrative** that reads as cohesive prose
5. **Professional quality** - publishable as-is

#### The Test

> Could you hand this to a journalist or executive right now and have them understand the full investigation without any explanation?

If yes, it's a proper summary.md. If no, rewrite it.

---

## MCP Quick Reference (For Sub-Agents)

**NOTE**: These tools are called by SUB-AGENTS, not by the orchestrator directly. The orchestrator dispatches agents that use these tools.

### When to Use Which Server

| Need | Server | Tool |
|------|--------|------|
| Deep research (fast) | `mcp-gemini` | `deep_research` |
| Deep research (max depth) | `mcp-openai` | `deep_research` |
| Cross-model critique | `mcp-gemini` | `generate_text` (thinking_level: high) |
| Real-time X/Twitter | `mcp-xai` | `x_search` |
| Real-time web search | `mcp-xai` | `web_search` |
| Real-time news | `mcp-xai` | `news_search` |
| Multi-source research | `mcp-xai` | `research` |

### Common Patterns

**Deep research (background)** - default 60 min timeout:
```
mcp__mcp-gemini__deep_research
  query: "[topic] investigation"
  timeout_minutes: 60
```

**Check/resume research after timeout**:
```
# Gemini - use interaction_id from timeout error
mcp__mcp-gemini__check_research
  interaction_id: "[id from error message or _meta]"

# OpenAI - use response_id from timeout error
mcp__mcp-openai__check_research
  response_id: "[id from error message or _meta]"
```

**Cross-model critique (verification)**:
```
mcp__mcp-gemini__generate_text
  thinking_level: "high"
  system_prompt: "You are a ruthless investigative critic..."
  prompt: "[content to critique]"
```

**Multi-source search**:
```
mcp__mcp-xai__research
  prompt: "[research question]"
  sources: ["x", "web", "news"]
```

### Deep Research Error Handling

| Error Prefix | Meaning | Action |
|-------------|---------|--------|
| `TIMEOUT:` | Research timed out but may still be running | Use `check_research` with the ID in error message |
| `AUTH_ERROR:` | Invalid API key | Check credentials in MCP config |
| `RATE_LIMIT:` | API rate limit exceeded | Wait and retry |
| `API_ERROR:` | General API error | Check logs, may need retry |
| `RESEARCH_FAILED:` | Research task failed | Try different query or approach |
| `NOT_FOUND:` | Research ID not found | ID may have expired or be invalid |

---

## Core Rules

1. **Version everything** - Create v1, v2, v3... Never overwrite.
2. **Verify before done** - Run verification checkpoint before claiming completion.
3. **Commit at checkpoints** - After each major phase completes.
4. **Track provenance** - Every claim needs attribution.
5. **Probability ranges** - `[0.6, 0.8]` not `0.7`. No false precision.
6. **Cross-model critique** - Use Gemini to critique Claude's work.

---

## AgenticInvestigator-Specific Rules

1. **Never fabricate sources** - If you can't find evidence, say so.
2. **Steelman ALL positions** - Build strongest version of EVERY side.
3. **Separate fact from inference** - Be explicit about what's proven vs. concluded.
4. **Document uncertainty** - "We don't know" is a valid finding.
5. **Detect circular reporting** - Multiple outlets citing each other is one source.
6. **Fact-check ALL sides** - Claims from every position get verified.
7. **Address alternative theories** - Don't ignore them; investigate with evidence.
8. **Every claim needs [SXXX]** - Source attribution is sacred. No ID = no claim.
9. **Append-only sources** - Never renumber or delete source IDs.
10. **summary.md is self-contained** - Must embed full source list, shareable standalone.
11. **Proactively seek statements** - Don't wait for statements to surface; hunt for testimony, interviews, earnings calls.
12. **Document role timelines** - Track when people joined, left, got promoted - roles change over time.
13. **Compare statements across time** - Same person, different dates - track how their story evolved.
14. **Compare statements across venues** - Public statements vs. testimony vs. internal - note discrepancies.
15. **Flag all statement contradictions** - When someone's statements conflict, investigate the discrepancy.
16. **Git repo per case** - Each case has its own git repository. Commit after every iteration.
17. **Capture evidence IMMEDIATELY** - Use `./scripts/capture` when source is found. Don't wait.
18. **AI research = leads only** - Gemini/OpenAI deep research goes to research-leads/. Find and capture primary sources.
19. **Verify claims in evidence** - Read captured HTML/PDF to confirm claim exists before citing.
20. **Every source needs evidence** - No source ID without captured evidence in evidence/ folder.

---

## Verification Checkpoint Rules

**Run verification checkpoint:**
- Periodically during investigation
- When claiming "saturation" (no more threads)
- When claiming "complete" (before final status)
- When user says "wrap up"

**If gaps exist:**
- MUST continue investigating
- Address listed gaps in next iteration(s)
- Re-verify when gaps addressed

**Anti-gaming rules:**
- Do NOT skip verification because "it's obviously done"
- Do NOT claim saturation to avoid more iterations
- Do NOT cherry-pick which claims to fact-check
- Do NOT ignore alternative theories because they're "obviously false"

---

## Detailed Documentation

| Topic | File |
|-------|------|
| System architecture | `architecture.md` |
| Case structure | `architecture.md` → Case Directory Structure |
| Full investigation procedure | `.claude/commands/investigate.md` |
| Verification procedure | `.claude/commands/verify.md` |
| Status command | `.claude/commands/status.md` |
| OSINT command | `.claude/commands/osint.md` |
| Questions generator | `.claude/commands/questions.md` |
| Financial toolkit | `.claude/commands/financial.md` |
| Legal risk assessment | `.claude/commands/legal-review.md` |
| Integrity check | `.claude/commands/integrity.md` |
| Article generator | `.claude/commands/article.md` |
| Deep-web data sources | `docs/investigative_data_sources.md` |
