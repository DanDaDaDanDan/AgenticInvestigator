# Adversarial Agent Prompt Template

## Context

- **Case:** {{case_id}}
- **Iteration:** {{iteration}}
- **Case Directory:** {{case_dir}}

## Task

Run adversarial review to identify blind spots and generate question-shaped counter-tasks.

**CRITICAL: Use GPT-5.2 Pro Extended Thinking for deep adversarial analysis.**

---

## Model Configuration

Tool ids in this section are placeholders; see `prompts/_tooling.md`.

### Normal Mode (default)

```
mcp__mcp-openai__generate_text:
  model: "gpt-5.2-pro"
  reasoning_effort: "xhigh"
```

### Fast Mode (`--fast`)

```
mcp__mcp-openai__generate_text:
  model: "gpt-5.2"
  reasoning_effort: "none"
```

**Only the model changes. All prompts and expectations remain identical.**

### System Prompt (both modes)

```
You are a defense attorney looking for every weakness.
Your job is to DESTROY the prosecution's case.
Find every gap, assumption, and alternative explanation.
```

**See `prompts/deep-thinking-agent.md` for full deep adversarial template.**

---

## Instructions

1. **Read state files:**
   - `control/gaps.json` — Current gaps (check for blind spot patterns)
   - `claims/index.json` — Claim status overview
   - `tasks/*.json` — Current tasks (completed and pending)
   - `extraction.json` — Known claims and entities
   - `summary.md` — Current findings (if exists)

2. **For each major claim in claims/, ask (USE EXTENDED THINKING):**
   - What evidence would **DISPROVE** this claim?
   - What's the **strongest argument against** it?
   - Who would **benefit from this being false**?
   - What **would change** if we're wrong?

3. **Check for blind spots (USE EXTENDED THINKING):**
   - What **assumptions are embedded** in verified claims?
   - Who **benefits from us not investigating** something?
   - What would the **SUBJECT refuse to answer**?
   - What positions have we **not steelmanned**?
   - What **alternative explanation** haven't we considered?

4. **Generate question-shaped adversarial tasks:**

   Create `tasks/A###.json` files:

   ```json
   {
     "id": "A001",
     "status": "pending",
     "priority": "HIGH",
     "type": "adversarial",
     "perspective": "Counter-hypothesis",
     "question": "What evidence would prove that [opposite of claim C0042] is true?",
     "evidence_requirements": {
       "min_supporting_sources": 1,
       "independence_rule": "any",
       "requires_capture": true
     },
     "approach": "Search for primary sources that contradict current findings",
     "success_criteria": "Document the strongest evidence against claim C0042, or confirm no contradicting evidence exists",
     "target_claim": "C0042",
     "created_at": "ISO-8601"
   }
   ```

   **Question templates:**
   | Blind Spot Type | Question Template |
   |-----------------|-------------------|
   | Unsteelmanned position | "What is the strongest evidence FOR [opposing view]?" |
   | Untested assumption | "What evidence would show [assumption] is false?" |
   | Missing perspective | "What would [stakeholder X] say contradicts this?" |
   | Alternative explanation | "What evidence supports [alternative theory] over current conclusion?" |
   | Uncomfortable question | "What would [subject] refuse to answer, and why?" |

5. **Log task creation:**
   ```bash
   node scripts/ledger-append.js {{case_dir}} task_create --task A### --priority HIGH --perspective Counter-hypothesis
   ```

## Adversarial Checklist

- [ ] Each HIGH-risk claim has a disproval task
- [ ] Each unexplored position has a steelman task
- [ ] Key assumptions are surfaced and have questioning tasks
- [ ] "Uncomfortable questions" are generated (min 2)
- [ ] Alternative explanations have investigation tasks
- [ ] Tasks are question-shaped, not topic-shaped

## BAD vs GOOD Examples

**BAD (topic-shaped):**
- "Investigate opposing viewpoint"
- "Review alternative theories"

**GOOD (question-shaped):**
- "What primary document contradicts the claim that Company X received $5M?"
- "What would prove that the timeline started AFTER the reported date?"
- "Who benefits if this claim is false, and what evidence supports their position?"

## Output

- Create `tasks/A###.json` files for counter-tasks (question-shaped)
- Log each task creation to ledger
- Return count of adversarial tasks generated
- Minimum: 3 adversarial tasks per iteration
