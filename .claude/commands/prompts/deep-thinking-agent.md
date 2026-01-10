# Deep Thinking Agent Prompt Template

## Purpose

Use GPT-5.2 Pro with Extended Thinking (reasoning_effort: xhigh) for tasks requiring:
- Deep exploration of hypotheses
- Comprehensive analysis of frameworks
- Complex reasoning about contradictions
- Generating non-obvious questions

**This agent uses `mcp-openai.generate_text` with `reasoning_effort: xhigh`.**

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
| 20-Framework Rigor | **YES** | Need exhaustive exploration |
| Adversarial Analysis | **YES** | Finding non-obvious counter-arguments |
| Question Generation | **YES** | Curiosity requires creative depth |
| Hypothesis Testing | **YES** | Need to consider all angles |
| Simple Task Execution | No | Overkill for routine work |
| Evidence Capture | No | Mechanical task |

---

## MCP Tool Configuration

Tool ids in this section are placeholders; see `prompts/_tooling.md`.

### Normal Mode (default)

```
mcp__mcp-openai__generate_text:
  model: "gpt-5.2-pro"
  reasoning_effort: "xhigh"
  max_output_tokens: 16384
  prompt: [See templates below]
  system_prompt: [See below]
```

### Fast Mode (`--fast`)

```
mcp__mcp-openai__generate_text:
  model: "gpt-5.2"
  reasoning_effort: "none"
  max_output_tokens: 16384
  prompt: [Same templates]
  system_prompt: [Same system prompt]
```

**Only the model and reasoning_effort change. All prompts and expectations remain identical.**

### System Prompt (both modes)

```
You are a senior investigative analyst performing deep, exhaustive analysis.

THINKING REQUIREMENTS:
- Consider every angle before concluding
- Actively seek contradictions to your reasoning
- Explore alternatives you would normally dismiss
- Document your uncertainty explicitly
- Challenge your own assumptions

OUTPUT REQUIREMENTS:
- Be exhaustive, not summary
- Include minority viewpoints
- Document what you DON'T know
- Provide specific, actionable follow-ups
```

---

## Template: 20-Framework Deep Exploration

For comprehensive rigor checkpoint analysis:

```
TASK: Deep 20-Framework Exploration
CASE: {{case_id}}

You have access to the following investigation materials:
- summary.md: Current findings summary
- claims/*.json: All registered claims with evidence
- findings/*.md: Task findings and analysis
- sources.json: Captured evidence registry
- positions.md: Documented stakeholder positions

INSTRUCTION: For EACH of the 20 frameworks below, perform DEEP analysis.
Do not just check a box - actually THINK about what each framework reveals.

FRAMEWORKS:

1. **Follow the Money**
   - Who benefits financially from each outcome?
   - What financial relationships haven't we mapped?
   - What payments, contracts, or interests might explain behavior?
   - [Spend at least 500 words on this framework]

2. **Follow the Silence**
   - Who is NOT talking that should be?
   - What questions are being avoided?
   - What topics cause deflection?
   - Who has something to lose by speaking?

3. **Follow the Timeline**
   - What sequence of events would change the interpretation?
   - Are there suspicious gaps in the timeline?
   - What happened JUST BEFORE the key event?
   - What decisions were made in what order?

4. **Follow the Documents**
   - What documents MUST exist but we haven't found?
   - What paper trails would prove/disprove claims?
   - What contracts, emails, records are missing?

5. **Follow the Contradictions**
   - Where do sources disagree?
   - Which contradictions are most significant?
   - What would resolve each contradiction?

6. **Follow the Relationships**
   - What connections haven't we mapped?
   - Who knows whom, and since when?
   - What conflicts of interest exist?

7. **Stakeholder Mapping**
   - Who are ALL the stakeholders?
   - What does each stakeholder want?
   - Whose interests are we missing?

8. **Network Analysis**
   - What networks connect key players?
   - Are there hidden connections?
   - Who are the information brokers?

9. **Means/Motive/Opportunity**
   - For each allegation: who had means, motive, opportunity?
   - Are there OTHER people who had all three?

10. **Competing Hypotheses**
    - What are ALL the possible explanations?
    - Which hypotheses haven't we tested?
    - What evidence would distinguish between hypotheses?

11. **Assumptions Check**
    - What are we ASSUMING without evidence?
    - Which assumptions would change everything if wrong?
    - What are we taking for granted?

12. **Pattern Analysis**
    - What patterns have we identified?
    - What patterns might we be missing?
    - Is this part of a larger pattern?

13. **Counterfactual**
    - What would prove us WRONG?
    - What evidence would we expect to see if our conclusions are wrong?
    - Have we looked for disconfirming evidence?

14. **Pre-Mortem**
    - If this investigation fails, why would it fail?
    - What are we most likely to get wrong?
    - What would we regret not asking?

15. **Cognitive Bias Check**
    - What biases might be affecting our analysis?
    - Are we confirmation-biased toward certain conclusions?
    - Are we anchored on early information?

16. **Uncomfortable Questions**
    - What questions are we avoiding?
    - What would we NOT want to find?
    - What questions would make subjects most defensive?

17. **Second-Order Effects**
    - What are the downstream implications of our findings?
    - Who else is affected?
    - What unintended consequences might result?

18. **Meta Questions**
    - Why are we investigating this now?
    - Who wants this investigated (and who doesn't)?
    - What's the broader context?

19. **5 Whys (Root Cause)**
    - For key events: Why did this happen? (5 levels deep)
    - What systemic factors contributed?
    - What's the root cause, not just proximate cause?

20. **Sense-Making**
    - Does our overall narrative make sense?
    - Are there explanatory gaps?
    - What's the most parsimonious explanation?

OUTPUT FORMAT:
For each framework, provide:
- Deep analysis (not just a checkbox)
- Specific questions to investigate
- Evidence gaps identified
- Risk assessment if framework reveals issues

Generate tasks for any gaps identified.
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
   - Every investigation must run 20-framework deep analysis
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

### Agent Dispatch Pattern

```
Task tool:
  subagent_type: "general-purpose"
  description: "Deep 20-framework analysis"
  prompt: |
    Use mcp-openai.generate_text with these parameters:
    - model: gpt-5.2-pro
    - reasoning_effort: xhigh
    - max_output_tokens: 16384

    [Insert appropriate template from above]

    CASE: {{case_dir}}

    Write output to: findings/deep-analysis-{{analysis_type}}.md
    Generate task files for gaps: tasks/R###.json

    RETURN: Summary of findings, task count generated
```

---

## Output Requirements

Deep thinking analysis MUST include:

1. **Exhaustive exploration** - Not surface-level
2. **Explicit uncertainty** - "We don't know X"
3. **Counter-arguments** - Even for our conclusions
4. **Specific follow-ups** - Question-shaped tasks
5. **Evidence requirements** - What would prove/disprove

**Minimum output: 2000 words for 20-framework, 500 words per major claim for adversarial.**
