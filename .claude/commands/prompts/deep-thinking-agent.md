# Deep Thinking Agent Prompt Template

## Purpose

Use GPT-5.2 Pro with Extended Thinking (`reasoning_effort: xhigh`) for tasks requiring:
- Deep exploration of hypotheses
- Comprehensive analysis of frameworks
- Complex reasoning about contradictions
- Generating non-obvious questions

**This agent uses `mcp__mcp-openai__generate_text` with `reasoning_effort: xhigh`.**

---

## Context

- **Case:** {{case_id}}
- **Iteration:** {{iteration}}
- **Case Directory:** {{case_dir}}
- **Analysis Type:** {{analysis_type}}

---

## When to Use Deep Thinking

| Task Type | Use Deep Thinking? | Why |
|-----------|-------------------|-----|
| 35-Framework Rigor | **YES** | Need exhaustive exploration |
| Adversarial Analysis | **YES** | Finding non-obvious counter-arguments |
| Question Generation | **YES** | Curiosity requires creative depth |
| Hypothesis Testing | **YES** | Need to consider all angles |
| Simple Task Execution | No | Overkill for routine work |
| Evidence Capture | No | Mechanical task |

---

## Model Configuration

Use `mcp__mcp-openai__generate_text` with:

| Mode | Model | Reasoning Effort |
|------|-------|------------------|
| Normal (default) | `gpt-5.2-pro` | `xhigh` |
| Fast (`--fast`) | `gpt-5.2` | `none` |

**The prompts and output requirements remain identical regardless of mode.**

### Thinking Requirements

When performing deep analysis:
- Consider every angle before concluding
- Actively seek contradictions to your reasoning
- Explore alternatives you would normally dismiss
- Document your uncertainty explicitly
- Challenge your own assumptions

### Output Requirements

- Be exhaustive, not summary
- Include minority viewpoints
- Document what you DON'T know
- Provide specific, actionable follow-ups

---

## Template: 35-Framework Deep Exploration

For comprehensive rigor checkpoint analysis:

**Read `_frameworks.md` for the complete 35-framework definitions.**

```
TASK: Deep 35-Framework Exploration
CASE: {{case_id}}

You have access to the following investigation materials:
- summary.md: Current findings summary
- claims/*.json: All registered claims with evidence
- findings/*.md: Task findings and analysis
- _sources.json: Captured evidence registry
- positions.md: Documented stakeholder positions

INSTRUCTION: For EACH of the 35 frameworks in _frameworks.md, perform DEEP analysis.
Do not just check a box - actually THINK about what each framework reveals.

The 35 frameworks are organized in four parts:
- Part A (1-20): Core Investigation Frameworks
- Part B (21-25): Domain Expertise Frameworks
- Part C (26-30): Analytical Rigor Frameworks
- Part D (31-35): Structural Analysis Frameworks

OUTPUT FORMAT:
For each framework, provide:
- Deep analysis (not just a checkbox)
- Specific questions to investigate
- Evidence gaps identified
- Risk assessment if framework reveals issues

Generate R### task files for any gaps identified.
```

---

## Template: Deep Adversarial Analysis

For comprehensive counter-hypothesis exploration:

```
TASK: Deep Adversarial Analysis
CASE: {{case_id}}
TARGET_CLAIMS: [List of claim IDs or "all HIGH-risk claims"]

INSTRUCTION: You are a defense attorney / opposing investigator.
Your job is to DESTROY the current conclusions.

For EACH major claim:

1. **What would DISPROVE this claim?**
   - Be specific about evidence types
   - Consider documents, witnesses, records
   - What would be exculpatory?

2. **What's the STRONGEST argument against?**
   - Steel-man the opposition
   - What would a skilled defense say?
   - What context would change interpretation?

3. **What assumptions are EMBEDDED?**
   - What are we assuming is true?
   - What if those assumptions are wrong?

4. **Who benefits if we're WRONG?**
   - Consider all stakeholders
   - What interests might bias sources?

5. **What would SUBJECT say?**
   - Anticipate their response
   - What questions would they refuse?
   - What would they emphasize?

6. **What alternative explanations exist?**
   - What else could explain the facts?
   - What's the most charitable interpretation?

OUTPUT:
- Detailed adversarial analysis for each claim
- List of investigation tasks to address vulnerabilities
- Risk assessment for each claim
- Recommended hedging language if claim survives scrutiny
```

---

## Template: Curiosity Question Generation

For generating non-obvious investigation questions:

```
TASK: Curiosity-Driven Question Generation
CASE: {{case_id}}

INSTRUCTION: Generate questions a MORE CURIOUS investigator would ask.

Categories:

1. **What would SURPRISE us if true?**
   - What unexpected connections might exist?
   - What hidden relationships?
   - What unlikely but possible scenarios?

2. **What DON'T we know that we SHOULD?**
   - What basic facts are unverified?
   - What context is missing?
   - What history haven't we explored?

3. **What would change EVERYTHING?**
   - What single fact would flip conclusions?
   - What document would be definitive?
   - What witness would resolve everything?

4. **What's the WEIRD thing here?**
   - What doesn't quite fit the pattern?
   - What seems anomalous?
   - What would need explanation?

5. **What would a SKEPTIC ask?**
   - What would someone who doesn't believe us ask?
   - What's our weakest point?

OUTPUT:
- At least 10 specific, question-shaped investigation tasks
- Prioritized by potential impact
- Include approach for each question
```

---

## Usage in Investigation

### When Orchestrator Should Dispatch Deep Thinking Agent

1. **Rigor Checkpoint** (required)
   - Every investigation must run 35-framework deep analysis
   - Run before declaring any iteration complete

2. **Adversarial Pass** (required)
   - For all HIGH-risk claims
   - Before legal review

3. **Stalled Investigation**
   - When progress slows
   - When the same gaps keep appearing

4. **Pre-Synthesis**
   - Before writing final summary
   - To catch blind spots

---

## Output Requirements

Deep thinking analysis MUST include:

1. **Exhaustive exploration** - Not surface-level
2. **Explicit uncertainty** - "We don't know X"
3. **Counter-arguments** - Even for our conclusions
4. **Specific follow-ups** - Question-shaped tasks
5. **Evidence requirements** - What would prove/disprove

**Minimum output: 2000 words for 35-framework, 500 words per major claim for adversarial.**
