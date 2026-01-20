# /case-feedback - Revise Completed Investigation

Incorporate feedback on completed articles and restart the investigation cycle.

## Usage

```
/case-feedback [feedback text]
```

## Purpose

After an investigation completes (all 8 gates pass), users may want to:
- Request deeper coverage of specific aspects
- Add missing perspectives
- Adjust tone or focus
- Incorporate new information
- Address factual concerns

This command creates a structured revision cycle.

## Prerequisites

- Investigation must be COMPLETE (all 8 gates passed)
- Articles must exist in `articles/` folder

## Workflow

```
COMPLETE
    │
    ▼ /case-feedback "..."
┌─────────────────┐
│ REVISION PLAN   │  Analyze feedback, determine scope
│                 │  Output: revision_plan.md
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RE-INVESTIGATE  │  Follow new leads from feedback
│                 │  May add sources, update questions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RECONCILE       │  Update summary.md with new findings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RE-WRITE        │  Regenerate articles with revisions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RE-VERIFY       │  All 8 gates must pass again
└────────┬────────┘
         │ All pass
         ▼
     COMPLETE (revision N)
```

## Protocol

### 1. Validate State

Check that investigation is COMPLETE:
```bash
node scripts/check-continue.js cases/<case-id>/
```

If not complete, return error: "Investigation must be complete before providing feedback."

### 2. Record Feedback

Create `feedback/` directory if it doesn't exist, then create `feedback/revisionN.md`:
```markdown
# Revision N Feedback

**Received:** [timestamp]
**From:** User

## Original Feedback

[user's exact feedback text - preserved verbatim for article regeneration]
```

The rest of the file (Analysis, Scope Assessment, Article Changes, etc.) is filled in during step 4.

### 3. Update State

Update `state.json`:
```json
{
  "phase": "REVISION",
  "revision": {
    "number": N,
    "feedback_file": "feedback/revisionN.md",
    "started_at": "timestamp"
  },
  "gates": {
    "planning": true,
    "questions": true,
    "curiosity": false,
    "reconciliation": false,
    "article": false,
    "sources": false,
    "integrity": false,
    "legal": false
  }
}
```

Gates 1-2 (planning, questions) stay true since original work is preserved.
Gates 3-8 reset to require re-verification.

### 4. Create Revision Plan

Dispatch sub-agent to analyze feedback and update the feedback file (`feedback/revisionN.md`) with the analysis and plan:

```markdown
# Revision N Feedback

**Received:** [timestamp]
**From:** User

## Original Feedback

[user's exact feedback text - preserved verbatim]

## Analysis

[Sub-agent's analysis of what the feedback requires]

## Scope Assessment
- [ ] Requires new research
- [ ] Requires new leads
- [ ] Requires source updates
- [ ] Requires perspective additions
- [ ] Tone/style changes only

## New Leads to Pursue
- L_R1: [lead from feedback]
- L_R2: [lead from feedback]

## Questions to Revisit
- [framework]: [specific aspect]

## Article Changes

[Specific instructions for article regeneration. This section is READ BY /article during revision cycles.]

- **Section X:** [what to change and why]
- **Tone:** [any tone/style adjustments]
- **Coverage:** [areas to expand/reduce]
- **Missing elements:** [what to add]

## Estimated Impact
[Minor/Moderate/Significant revision]
```

The feedback file serves as the **contract** between `/case-feedback` and `/article`. The `/article` command reads this file during revision cycles to understand what changes are required.

### 5. Execute Revision

Based on the feedback file's action items:

1. **Add new leads** to `leads.json` with `from: "revision-N"`
2. **Dispatch** `/action follow` for new leads
3. **Dispatch** `/action reconcile` to update summary
4. **Dispatch** `/action curiosity` to verify completeness
5. **Dispatch** `/action article` to regenerate articles (reads feedback file for revision instructions)
6. **Dispatch** `/action verify` to check all gates

### 6. Commit

```bash
git -C cases add -A
git -C cases commit -m "[case-id] /case-feedback: revision N started"
```

## Revision History

Each revision is tracked:
- `feedback/revision1.md` - First revision feedback + plan
- `feedback/revision2.md` - Second revision feedback + plan
- etc.

## Example

```
User: /case-feedback "The article doesn't adequately address the environmental impact
concerns raised by local communities. Please add more coverage of the community
response and any environmental studies that have been conducted."

Agent: Creating revision plan for feedback...

Revision Plan:
- Scope: Moderate revision
- New leads:
  - L_R1: Environmental impact studies for [topic]
  - L_R2: Community response and local opposition groups
  - L_R3: Regulatory environmental review documents
- Questions to revisit:
  - 06-follow-the-resistance: Community opposition details
  - 15-follow-the-unintended: Environmental externalities

Proceeding with revision cycle...
```

## Orchestrator Rules

1. Preserve original investigation work
2. Only re-run gates that feedback affects
3. Track revision number in state.json
4. New leads use `from: "revision-N"` for traceability
