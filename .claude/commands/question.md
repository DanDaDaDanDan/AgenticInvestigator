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

For each framework in the batch, answer the guiding questions from `_frameworks.md`.

## Instructions

1. **Read the framework** from `_frameworks.md`

2. **For each question in the framework:**
   - Write answer with inline [S###] citations
   - Note confidence level (HIGH/MEDIUM/LOW)
   - Flag if it generates a lead for further investigation

3. **Capture sources before citing** - Use `/capture-source <url>` for new sources

4. **Add leads to leads.json** - Any question that generates a follow-up lead

5. **Update summary.md** - Add key findings with citations

## Question Status

- `pending` - Not yet answered
- `investigated` - All questions answered
- `not-applicable` - Framework doesn't apply to this topic

## Output

- Updated `questions/NN-framework-name.md` files for each framework in batch
- New leads added to `leads.json`
- Key findings added to `summary.md`

## Next Step

After all 5 batches complete, orchestrator invokes `/follow` for each lead.
