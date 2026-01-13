# /question - Answer Framework Questions

Apply the 35 analytical frameworks via structured Q&A.

## Usage

```
/question <batch-number>
/question all
```

**Batches:**
- Batch 1: Frameworks 1-7 (Core Investigation)
- Batch 2: Frameworks 8-14 (Core Investigation)
- Batch 3: Frameworks 15-20 (Core Investigation)
- Batch 4: Frameworks 21-25 (Domain Expertise)
- Batch 5: Frameworks 26-35 (Analytical + Structural)

## Task

For each framework in the batch, answer the guiding questions using structured Q&A format.

## Instructions

1. **Read the framework** from `_frameworks.md`

2. **For each question in the framework:**

   Write to `questions/NN-framework-name.md`:

   ```markdown
   # NN: Framework Name

   **Status:** investigated

   ---

   ## Q1: [Question from framework]
   **Answer:** [Your finding with inline [S###] citations]
   **Sources:** [S001] [S002]
   **Confidence:** HIGH | MEDIUM | LOW
   **Lead?:** NO | YES → L###

   ## Q2: [Next question]
   **Answer:** ...
   **Sources:** ...
   **Confidence:** ...
   **Lead?:** ...

   ---

   ## Leads Generated
   - L###: [Lead description]
   ```

3. **Capture sources before citing**

   Use `/capture-source <url>` for any new sources before writing [S###].

4. **Add leads to leads.json**

   When a question generates a follow-up lead:
   ```json
   {
     "id": "L###",
     "lead": "Description of what to investigate",
     "from": "NN-framework-name",
     "priority": "HIGH | MEDIUM | LOW",
     "status": "pending"
   }
   ```

5. **Update summary.md**

   Add key findings to summary.md with citations.

## Question Status

- `pending` - Not yet answered
- `investigated` - All questions answered
- `not-applicable` - Framework doesn't apply to this topic

## Framework Quick Reference

**Core Investigation (1-20):**
1. Follow the Money
2. Follow the Silence
3. Follow the Timeline
4. Follow the Documents
5. Follow the Contradictions
6. Follow the Relationships
7. Stakeholder Mapping
8. Network Analysis
9. Means/Motive/Opportunity
10. Competing Hypotheses
11. Assumptions Check
12. Pattern Analysis
13. Counterfactual
14. Pre-Mortem
15. Cognitive Bias Check
16. Uncomfortable Questions
17. Second-Order Effects
18. Meta Questions
19. 5 Whys (Root Cause)
20. Sense-Making

**Domain Expertise (21-25):**
21. First Principles / Scientific Reality
22. Domain Expert Blind Spots
23. Marketing vs Scientific Reality
24. Subject Experience / Ground Truth
25. Contrarian Expert Search

**Analytical Rigor (26-30):**
26. Quantification & Base Rates
27. Causation vs Correlation
28. Definitional Analysis
29. Methodology Audit
30. Incentive Mapping

**Structural Analysis (31-35):**
31. Information Asymmetry
32. Comparative Benchmarking
33. Regulatory & Institutional Capture
34. Data Provenance & Chain of Custody
35. Mechanism Tracing

## Output

- Updated `questions/NN-framework-name.md` files for each framework in batch
- New leads added to `leads.json`
- Key findings added to `summary.md`

## Next Step

After all 5 batches complete, orchestrator invokes `/follow` for each lead.
