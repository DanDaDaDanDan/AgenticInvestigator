# /merge-cases - Combine Multiple Investigations

Merge two or more completed investigations into a new unified case.

## Usage

```
/merge-cases [case1] [case2] --topic "[new topic]"
/merge-cases [case1] [case2] [case3] --topic "[new topic]"
```

## Example

```
/merge-cases renee-good ice-morale-crisis --topic "ICE in Minnesota: From Agent Culture to Tragic Consequences"
```

## Prerequisites

- All source cases must have `phase: VERIFY` or `phase: COMPLETE` (gates passing)
- Source cases should have thematic overlap justifying the merge

## What Gets Merged

| Component | Merge Strategy |
|-----------|----------------|
| **Sources** | Renumber sequentially (S001, S002...), copy evidence folders |
| **Leads** | Renumber sequentially (L001, L002...), preserve parent relationships |
| **Summary** | Concatenate with section headers indicating origin |
| **Questions** | Preserve all answers, add cross-reference section |
| **Evidence** | Copy all evidence folders with renumbered IDs |
| **Articles** | NOT merged - regenerated fresh from combined content |

## Process

### Phase 1: Case Creation

1. Create new case folder with `node scripts/init-case.js "[topic]"`
2. Set `phase: MERGE` in state.json

### Phase 2: Source Merge (via sub-agent)

1. Read all `sources.json` from source cases
2. Create unified `sources.json` with renumbered IDs
3. Copy all `evidence/S###/` folders with new IDs
4. Build source ID mapping (old -> new)

### Phase 3: Lead Merge (via sub-agent)

1. Read all `leads.json` from source cases
2. Create unified `leads.json` with renumbered IDs
3. Update `from` and `sources` fields using ID mapping
4. Preserve `parent` relationships with new IDs

### Phase 4: Content Merge (via sub-agent)

1. Merge `summary.md` files with origin headers
2. Merge `questions/*.md` files, adding cross-reference findings
3. Copy planning documents (`refined_prompt.md`, `investigation_plan.md`)
4. Create new `custom_questions.md` for cross-case analysis

### Phase 5: Cross-Case Analysis (via sub-agent)

Generate new custom questions that emerge from combining the cases:
- What connections exist between the cases?
- What patterns span both investigations?
- What new questions arise from the combined evidence?

### Phase 6: Gap Analysis

1. Run `/action curiosity` to identify:
   - Gaps in cross-case connections
   - New leads suggested by combined evidence
   - Unresolved tensions between findings
2. If gaps found, run targeted `/action follow` for new leads

### Phase 7: Article Generation

1. Run `/action article` to generate new unified articles
2. Articles should synthesize findings from all source cases
3. Maintain all `[S###]` citations using new numbering

### Phase 8: Verification

1. Run `/action verify` for all 8 gates
2. Run `/action integrity` and `/action legal-review`

## Instructions

When invoked, execute:

1. **Validate inputs**: Check source cases exist and are complete
2. **Create new case**: `node scripts/init-case.js "[topic]"`
3. **Dispatch merge sub-agent**:
   ```
   Task (subagent_type: "general-purpose")
     prompt: "Execute case merge for [case1] + [case2] into [new-case].
              Read all source files, merge with renumbering,
              generate cross-case custom questions."
   ```
4. **Run gap analysis**: `/action curiosity`
5. **Generate articles**: `/action article`
6. **Verify**: `/action verify`

## ID Mapping

Maintain mapping in `state.json`:

```json
{
  "merge": {
    "sources": {
      "case1": { "S001": "S001", "S002": "S002" },
      "case2": { "S001": "S047", "S002": "S048" }
    },
    "leads": {
      "case1": { "L001": "L001", "L002": "L002" },
      "case2": { "L001": "L112", "L002": "L113" }
    }
  }
}
```

## Commit Strategy

All changes committed to DATA repo (`cases/.git`) with prefix:
```
[new-case-slug] /merge-cases: [description]
```

## Output

- New case folder at `cases/[new-topic-slug]/`
- Combined sources, leads, evidence
- Cross-case custom questions
- Fresh articles synthesizing all findings
- All 8 gates passing
