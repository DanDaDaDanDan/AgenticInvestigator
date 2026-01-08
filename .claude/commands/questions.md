# Investigation Questions Generator (Orchestrator Mode)

You are the **orchestrator**. You dispatch question generation agents — you do NOT generate questions directly.

---

## Usage

```
/questions              # Generate questions for active case
/questions [case-id]    # Generate questions for specific case
```

---

## The 20 Frameworks

Apply these frameworks to generate investigative questions. The model knows what each means — just invoke by name.

| # | Framework | Category | Key Question |
|---|-----------|----------|--------------|
| 1 | Follow the Money | Core | Who benefits financially? |
| 2 | Follow the Silence | Core | Who's NOT talking? |
| 3 | Follow the Timeline | Core | What happened before/after? |
| 4 | Follow the Documents | Core | What paper trail exists? |
| 5 | Follow the Contradictions | Core | Who changed their story? |
| 6 | Follow the Relationships | People | Who knows whom? |
| 7 | Stakeholder Mapping | People | Who has power/interests? |
| 8 | Network Analysis | People | Who connects the players? |
| 9 | Means/Motive/Opportunity | People | Who could have done it? |
| 10 | ACH (Competing Hypotheses) | Analysis | Which theory fits evidence? |
| 11 | Key Assumptions Check | Analysis | What are we assuming? |
| 12 | Follow the Patterns | Analysis | Has this happened before? |
| 13 | Counterfactual Thinking | Adversarial | What would prove this wrong? |
| 14 | Pre-Mortem Analysis | Adversarial | If we're wrong, why? |
| 15 | Cognitive Bias Check | Adversarial | Where are our blind spots? |
| 16 | Uncomfortable Questions | Adversarial | What would they refuse to answer? |
| 17 | Second-Order Effects | Context | What happens after the consequence? |
| 18 | Meta Questions | Context | Why is this story being told now? |
| 19 | 5 Whys (Root Cause) | Root Cause | Why was this possible? |
| 20 | Framing & Sense-Making | Context | What does this actually mean? |

---

## Stage-Based Selection

| Stage | Frameworks to Apply |
|-------|---------------------|
| Early | Core (1-6) + Stakeholder + Relationships + Sense-Making |
| Mid | Add Network, Means/Motive, ACH, Assumptions, Patterns, Meta, 5 Whys |
| Late | Add Counterfactual, Pre-Mortem, Cognitive Bias, Second-Order |
| Stuck | Pre-Mortem, Bias Check, Uncomfortable Questions |

---

## Orchestrator Flow

```
1. READ: _state.json for topic and iteration
2. DISPATCH: Question generation agents (parallel)
3. WAIT: Agents write to questions.md
4. REPORT: Question count and priorities
```

---

## Dispatch Agents (parallel, ONE message)

```
Task 1: Core investigation questions (Money, Silence, Timeline, Documents, Contradictions, Relationships)
Task 2: Hypothesis questions (ACH, Assumptions, Patterns, Means/Motive)
Task 3: Adversarial questions (Counterfactual, Pre-Mortem, Bias, Uncomfortable)
Task 4: Context questions (Second-Order, Meta, 5 Whys, Sense-Making)
Task 5: Real-time questions from discourse (XAI x_search)
Task 6: Pattern research (similar cases, precedents)
```

### Agent Prompt Template

```
Task tool:
  subagent_type: "general-purpose"
  description: "[Category] questions for [topic]"
  prompt: |
    TASK: Generate [category] investigative questions
    CASE: cases/[case-id]/

    Read summary.md and positions.md for context.

    Apply frameworks: [list frameworks]

    Generate questions using mcp__mcp-gemini__generate_text (thinking_level: high).

    Write to questions.md with:
    - Question text
    - Framework used
    - Priority (HIGH/MEDIUM/LOW)
    - How to answer

    RETURN: Question count, high-priority count
```

---

## Output Format

```markdown
# Investigation Questions: [Topic]

## Executive Summary
Investigation stage: [Early/Mid/Late]
Frameworks applied: [N of 20]
Questions generated: [N]

## HIGH PRIORITY

### Q1: [Question]
- Framework: [Name]
- Why it matters: [brief]
- How to answer: [approach]

## Questions by Category

### Core Investigation
[Questions 1-6]

### People & Networks
[Questions 7-10]

### Hypothesis & Analysis
[Questions 11-13]

### Adversarial
[Questions 14-16]

### Context
[Questions 17-20]
```
