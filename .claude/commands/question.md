# /question - Answer Framework Questions

Apply the 35 analytical frameworks via structured Q&A.

## Usage

```
/question <batch-number>
/question all
/question <batch-number> --parallel --source-start N --source-end M --lead-start X --lead-end Y
```

**Batches:**
- Batch 1: Frameworks 1-7
- Batch 2: Frameworks 8-14
- Batch 3: Frameworks 15-20
- Batch 4: Frameworks 21-25
- Batch 5: Frameworks 26-35
- Batch 6: Custom questions from planning (if `custom_questions.md` exists)

## Parallel Mode

When called with `--parallel` flag, operates in isolation mode for parallel execution:

```
/question 1 --parallel --source-start 1 --source-end 100 --lead-start 1 --lead-end 50
```

### Parameters
- `--parallel` - Enable parallel mode (writes to temp files)
- `--source-start N` - First source ID in pre-allocated range
- `--source-end M` - Last source ID in range (exclusive)
- `--lead-start X` - First lead ID in pre-allocated range
- `--lead-end Y` - Last lead ID in range (exclusive)

### Output Files (Parallel Mode)

Instead of updating main files directly, parallel mode writes to temp files:

```
temp/
├── summary-batch-1.md       # Summary findings for this batch
├── leads-batch-1.json       # New leads generated (with pre-allocated IDs)
└── sources-batch-1.json     # Sources captured (with pre-allocated IDs)
```

These are later merged by `scripts/merge-question-batches.js`.

### Source ID Assignment (Parallel Mode)

Use source IDs from your allocated range:
```
# If allocated range 1-100, use S001, S002, ... S099
# Track highest used in your batch for merge script
```

### Lead ID Assignment (Parallel Mode)

Use lead IDs from your allocated range:
```
# If allocated range 1-50, use L001, L002, ... L049
# Track highest used in your batch for merge script
```

### Reporting Results (Parallel Mode)

When in parallel mode, include a metadata block at the end of each temp file for the merge script:

**In `sources-batch-N.json`:**
```json
{
  "sources": [...],
  "_batch_metadata": {
    "batch_num": 1,
    "source_range": { "start": 1, "end": 100 },
    "highest_used": 47,
    "completed_at": "2026-01-19T10:30:00Z"
  }
}
```

**In `leads-batch-N.json`:**
```json
{
  "leads": [...],
  "_batch_metadata": {
    "batch_num": 1,
    "lead_range": { "start": 1, "end": 50 },
    "highest_used": 23,
    "completed_at": "2026-01-19T10:30:00Z"
  }
}
```

This metadata enables the merge script to correctly update `state.json.next_source` and detect ID collisions.

## Task

For each framework in the batch, answer the guiding questions from `reference/frameworks.md`.

## Custom Questions (Batch 6)

If the investigation used the planning phase, a `custom_questions.md` file may exist with topic-specific questions identified during investigation design. Process these as Batch 6:

1. **Read `custom_questions.md`** from the case directory
2. **For each custom question:**
   - Answer with the same rigor as framework questions
   - Use `[S###](url)` citations
   - Note confidence level
   - Generate leads as needed
3. **Create `questions/36-custom-questions.md`** with all answers
4. **Add to summary.md** like other framework findings

Custom questions represent gaps the 35 frameworks don't cover for this specific topic. They are identified by GPT 5.2 Pro during planning and are critical to a complete investigation.

## The 35 Frameworks Are a Starting Point

The frameworks provide structure, but **use judgment to go beyond them**:

- If the case suggests a question not covered by the frameworks, ask it
- If a framework sparks a novel angle specific to this topic, pursue it
- If you notice patterns or connections the frameworks don't address, explore them
- Add case-specific questions to the relevant framework document

The goal is thorough investigation, not checkbox completion.

## When to Use Extended Thinking

Most questions can be answered with Claude's native reasoning. However, consider using **GPT 5.2 Pro Extended Thinking** (`mcp__mcp-openai__generate_text`) for:

- **Contested questions** where reasonable people disagree
- **Competing hypotheses** that need careful weighing
- **Steelmanning** positions you might be biased against
- **Contradictions** that need deep analysis to resolve
- **Judgment calls** on ambiguous evidence

This is optional - use judgment on when deep reasoning adds value.

## Instructions

1. **Read the framework** from `reference/frameworks.md`

2. **For each question in the framework:**
   - Write answer with inline `[S###](url)` citations (clickable markdown links)
   - Note confidence level (HIGH/MEDIUM/LOW)
   - Flag if it generates a lead for further investigation

3. **Add novel questions** that the case suggests but frameworks don't cover
   - Mark with `<!-- LEAD: description -->` for tracking
   - These MUST become leads in `leads.json` (see step 6)

4. **Use extended thinking** for genuinely complex or contested questions

5. **Capture sources before citing** - Use `/capture-source <url>` for new sources

6. **Add leads to leads.json** - This includes:
   - Any question that generates a follow-up lead (depth: 0, parent: null)
   - **All novel questions** added in step 3 (depth: 0, parent: null, from: framework-file)

7. **Update summary.md** - Add ALL findings with `[S###](url)` citations
   - Low bar for inclusion: anything of interest, unique insight, or noteworthy
   - Filtering happens later during article generation
   - When in doubt, include it

## Question Status

- `pending` - Not yet answered
- `investigated` - All questions answered
- `not-applicable` - Framework doesn't apply to this topic

## Novel Question Examples

If investigating a pharmaceutical topic, you might add:
- "What do the clinical trial protocols actually specify vs what was reported?"
- "Who were the principal investigators and what are their conflicts?"

If investigating a financial topic, you might add:
- "What do the SEC filings show that press releases don't mention?"
- "What related-party transactions exist?"

These case-specific questions go in the most relevant framework document.

## Output

- Updated `questions/NN-framework-name.md` files for each framework in batch
- Novel questions added where appropriate (with `<!-- LEAD: ... -->` markers)
- New leads added to `leads.json` (including all novel questions)
- ALL findings added to `summary.md` (low bar - include everything noteworthy)

## Next Step

After all 5 batches complete, orchestrator invokes `/follow` for each lead.
