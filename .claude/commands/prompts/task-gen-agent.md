# Task Generation Agent Prompt Template

## Context

- **Case:** {{case_id}}
- **Iteration:** {{iteration}}
- **Case Directory:** {{case_dir}}

## Task

Generate investigation tasks from gaps + required perspectives. Tasks must be **question-shaped**, not topic-shaped.

## Instructions

1. **Read control files:**
   - `control/gaps.json` — Current gaps (PRIMARY INPUT)
   - `state.json` — Current iteration
   - `extraction.json` — Extracted people, entities, claims
   - `sources.json` — Available data sources
   - `claims/index.json` — Claim status rollup

2. **Convert blocking gaps to R### tasks:**

   For each gap in `gaps.json.blocking`:
   - Create `tasks/R###.json`
   - Include `gap_id` reference
   - Set priority HIGH

   Gap-to-question mappings:
   | Gap Type | Question Template |
   |----------|-------------------|
   | MISSING_EVIDENCE | "Where can we find/capture evidence for [source]?" |
   | INSUFFICIENT_CORROBORATION | "What independent source corroborates claim [C####]?" |
   | CONTENT_MISMATCH | "Where in [source] does it actually say [claim]?" |
   | LEGAL_WORDING_RISK | "How should we reword [claim] to add proper attribution?" |

3. **Generate perspective tasks (T###):**

   Cover all 10 required perspectives:
   - Money/Financial — who benefits, funding sources
   - Timeline/Sequence — causation chains, key dates
   - Silence — who's NOT talking
   - Documents — paper trails that must exist
   - Contradictions — conflicting accounts
   - Relationships — connections, conflicts
   - Alternative Hypotheses — other explanations
   - Assumptions — what we're taking for granted
   - Counterfactual — what would prove us wrong
   - Blind Spots — what might we be missing

4. **Curiosity check (REQUIRED — at least 2 tasks):**
   - What would a MORE curious investigator ask?
   - What's the most important thing we DON'T know?
   - What would SURPRISE us if true?

## Question-Shaped Task Format

**BAD (topic-shaped):**
- "Investigate company finances"
- "Research CEO background"

**GOOD (question-shaped):**
- "What primary document confirms revenue was $X in Q3?"
- "What independent source corroborates the CEO's prior employment?"
- "What evidence would disprove the timeline claim?"

## Task File Schema

```json
{
  "id": "R014",
  "status": "pending",
  "priority": "HIGH",
  "type": "rigor_gap",
  "perspective": "Contradictions",
  "question": "What independent source corroborates claim C0042?",
  "evidence_requirements": {
    "min_supporting_sources": 2,
    "independence_rule": "different_domain",
    "allow_single_primary": true
  },
  "approach": "Search for primary docs; then independent reporting",
  "success_criteria": "Add >=1 corroborating source to C0042",
  "gap_id": "G0123",
  "created_at": "ISO-8601"
}
```

## Task Types

| Prefix | Type | Source |
|--------|------|--------|
| T### | Investigation | Perspectives, curiosity |
| A### | Adversarial | Adversarial pass |
| R### | Rigor gap | control/gaps.json |

## Evidence Requirements

Each task should specify what evidence is needed:

```json
"evidence_requirements": {
  "min_supporting_sources": 2,
  "independence_rule": "different_domain|primary_plus_secondary|different_domain_or_primary",
  "allow_single_primary": true,
  "requires_capture": true
}
```

## Logging

Log each task creation:

```bash
node scripts/ledger-append.js {{case_dir}} task_create --task R### --gap G0123
node scripts/ledger-append.js {{case_dir}} task_create --task T### --priority HIGH --perspective Money
```

## Output

- Create individual task files in `tasks/` directory
- R### tasks from gaps (highest priority)
- T### tasks from perspectives + curiosity
- Every perspective covered or explicitly N/A
- At least 2 curiosity tasks
