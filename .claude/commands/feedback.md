# /feedback - Revise Completed Investigation

Incorporate feedback on completed articles and restart the investigation cycle.

## Usage

```
/feedback [feedback text]
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
    ▼ /feedback "..."
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

Create `feedback/revisionN.md` in the case folder:
```markdown
# Revision N Feedback

**Received:** [timestamp]
**From:** User

## Feedback

[user's feedback text]

## Analysis

[To be filled by revision planning]
```

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

Dispatch sub-agent to analyze feedback and create `revision_plan.md`:

```markdown
# Revision Plan

## Feedback Summary
[Condensed version of user feedback]

## Scope Assessment
- [ ] Requires new research
- [ ] Requires new leads
- [ ] Requires source updates
- [ ] Requires perspective additions
- [ ] Tone/style changes only

## Action Items

### New Leads to Pursue
- L_R1: [lead from feedback]
- L_R2: [lead from feedback]

### Questions to Revisit
- [framework]: [specific aspect]

### Article Changes
- [section]: [change needed]

## Estimated Impact
[Minor/Moderate/Significant revision]
```

### 5. Execute Revision

Based on revision_plan.md:

1. **Add new leads** to `leads.json` with `from: "revision-N"`
2. **Dispatch** `/action follow` for new leads
3. **Dispatch** `/action reconcile` to update summary
4. **Dispatch** `/action curiosity` to verify completeness
5. **Dispatch** `/action article` to regenerate articles
6. **Dispatch** `/action verify` to check all gates

### 6. Commit

```bash
git -C cases add -A
git -C cases commit -m "[case-id] /feedback: revision N started"
```

## Revision History

Each revision is tracked:
- `feedback/revision1.md` - First revision feedback + plan
- `feedback/revision2.md` - Second revision feedback + plan
- etc.

Previous article versions are preserved:
- `articles/full.md` - Current version
- `articles/full.r1.md` - Pre-revision-1 version
- `articles/full.r2.md` - Pre-revision-2 version

## Example

```
User: /feedback "The article doesn't adequately address the environmental impact
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
4. Archive previous article versions before regenerating
5. New leads use `from: "revision-N"` for traceability
