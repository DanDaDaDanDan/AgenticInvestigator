# /question - Answer Framework Questions

Apply the 35 analytical frameworks via structured Q&A.

## Usage

```
/question <batch-number>
/question all
```

**Batches:**
- Batch 1: Frameworks 1-7
- Batch 2: Frameworks 8-14
- Batch 3: Frameworks 15-20
- Batch 4: Frameworks 21-25
- Batch 5: Frameworks 26-35

## Task

For each framework in the batch, answer the guiding questions from `reference/frameworks.md`.

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

4. **Use extended thinking** for genuinely complex or contested questions

5. **Capture sources before citing** - Use `/capture-source <url>` for new sources

6. **Add leads to leads.json** - Any question that generates a follow-up lead (depth: 0, parent: null)

7. **Update summary.md** - Add key findings with `[S###](url)` citations

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
- Novel questions added where appropriate
- New leads added to `leads.json`
- Key findings added to `summary.md`

## Next Step

After all 5 batches complete, orchestrator invokes `/follow` for each lead.
