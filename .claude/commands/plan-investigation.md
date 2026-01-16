# /plan-investigation - Investigation Planning

Design investigation strategy before execution.

## Usage

```
/plan-investigation [topic]
```

## Purpose

The 35 frameworks are comprehensive but generic. This command surfaces **topic-specific** aspects that fall between generic frameworks:

1. Custom questions the 35 frameworks don't capture
2. Domain-specific data sources that must be checked
3. Investigation approaches suited to this specific topic
4. Critical verification points

## Prerequisites

The case folder must already exist (created by `init-case.js`). All planning files are saved directly to `cases/[topic-slug]/`.

---

## Three-Step Process

```
Step 1: PROMPT REFINEMENT
  What are we REALLY trying to learn?
  Output: refined_prompt.md

Step 2: STRATEGIC RESEARCH
  What's the landscape look like?
  Output: strategic_context.md

Step 3: INVESTIGATION DESIGN (GPT 5.2 Pro + Extended Thinking)
  What's missing from the 35 frameworks for THIS topic?
  Output: investigation_plan.md, custom_questions.md, planning_todos
```

---

## Step 1: Prompt Refinement

**Goal:** Transform the raw topic into a clear, actionable investigation question.

### Invoke Sub-Agent

```
Task tool:
  subagent_type: "general-purpose"
  prompt: See below
```

### Prompt

```
You are helping design an investigative journalism piece.

The user wants to investigate: "[RAW TOPIC]"

Your task is to deeply understand what we're REALLY trying to learn.

Consider:

1. CORE QUESTION
   - What is the user actually trying to understand?
   - What's the question beneath the question?
   - If we answered this perfectly, what would we know?

2. VALUE PROPOSITION
   - Why does this matter?
   - Who would benefit from this investigation?
   - What decisions could this inform?

3. SCOPE BOUNDARIES
   - What's IN scope vs OUT of scope?
   - What timeframe matters?
   - What geographic/organizational boundaries?

4. SUCCESS CRITERIA
   - What findings would make this investigation successful?
   - What would be a disappointing outcome?
   - What's the minimum viable investigation?

5. STAKEHOLDER PERSPECTIVES
   - Who are the key parties involved?
   - What does each party claim/believe?
   - Whose perspective is usually missing?

OUTPUT FORMAT:

# Refined Investigation Prompt

## Investigation Question
[Clear, specific statement of what we're trying to learn - 1-2 sentences]

## Core Sub-Questions
1. [Specific question that must be answered]
2. [Specific question that must be answered]
3. [Specific question that must be answered]
4. [Specific question that must be answered]
5. [Specific question that must be answered]

## Scope
**In Scope:**
- [Boundary]
- [Boundary]

**Out of Scope:**
- [Boundary]
- [Boundary]

## Success Criteria
This investigation succeeds if we can:
- [Criterion]
- [Criterion]

## Key Perspectives
- [Stakeholder group]: [Their likely view]
- [Stakeholder group]: [Their likely view]
```

### Save Output

Save the sub-agent's response to `cases/[topic-slug]/refined_prompt.md`.

---

## Step 2: Strategic Research

**Goal:** Understand the investigative landscape before designing the strategy.

### Invoke Sub-Agent

```
Task tool:
  subagent_type: "general-purpose"
  prompt: See below
```

### Prompt

```
You are researching the landscape for an investigation.

REFINED PROMPT:
[Paste full content of refined_prompt.md from Step 1]

Your task is to understand the investigative landscape, NOT to gather evidence.

Use these MCP tools:
- mcp__mcp-openai__deep_research - For comprehensive background research
- mcp__mcp-xai__research - For real-time context and recent developments
- mcp__mcp-osint__osint_search - To identify what authoritative databases exist

Research and document:

1. CURRENT STATE OF KNOWLEDGE
   - What's the mainstream understanding?
   - What are the key facts everyone agrees on?
   - What's disputed or uncertain?

2. KEY PLAYERS & STAKEHOLDERS
   - Who are the main actors?
   - What organizations are involved?
   - Who are the domain experts?

3. AUTHORITATIVE DATA SOURCES
   - What databases/registries exist for this domain?
   - What regulatory bodies have jurisdiction?
   - What academic fields study this?
   - What primary source documents exist?

4. PREVIOUS INVESTIGATIONS
   - What journalism has been done on this?
   - What academic research exists?
   - What government investigations have occurred?

5. DOMAIN TERMINOLOGY
   - What terms have specific meanings in this domain?
   - What concepts require domain knowledge?
   - What jargon might be misunderstood?

6. KNOWN CONTROVERSIES
   - What are the main disputes?
   - What claims are contested?
   - What evidence is disputed?

OUTPUT FORMAT:

# Strategic Context

## Current State of Knowledge
[Summary of what's known and what's disputed]

## Key Players & Stakeholders
| Player | Role | Perspective |
|--------|------|-------------|
| [Name] | [Role] | [What they claim/believe] |

## Authoritative Data Sources
| Source | Type | What It Contains | Access Method |
|--------|------|------------------|---------------|
| [Source] | [Database/Registry/Filing] | [Description] | [osint connector or URL] |

## Previous Investigations
- [Investigation/Report]: [Key findings] [Source if available]

## Domain Terminology
| Term | Domain Meaning | Common Misconception |
|------|---------------|---------------------|
| [Term] | [Actual meaning] | [What people think it means] |

## Known Controversies
| Issue | Side A | Side B | Key Evidence Disputed |
|-------|--------|--------|----------------------|
| [Issue] | [Claim] | [Counter-claim] | [What's contested] |
```

### Save Output

Save the sub-agent's response to `cases/[topic-slug]/strategic_context.md`.

---

## Step 3: Investigation Design

**Goal:** Identify what's MISSING from the 35 frameworks for THIS specific topic.

### Model: GPT 5.2 Pro with Extended Thinking

This step requires maximum reasoning depth. Use:

```
mcp__mcp-openai__generate_text
  model: "gpt-5.2-pro"
  reasoning_effort: "xhigh"
  prompt: [See below - must include ALL context]
```

### Gather Context

Before calling the model, read:
1. `refined_prompt.md` (from Step 1)
2. `strategic_context.md` (from Step 2)
3. `reference/frameworks.md` (FULL ~10KB file with all 35 frameworks)

### Prompt

```
You are designing an investigation strategy.

REFINED PROMPT:
[Full content of refined_prompt.md]

STRATEGIC CONTEXT:
[Full content of strategic_context.md]

35 FRAMEWORKS (COMPLETE TEXT):
[Full content of reference/frameworks.md - ALL 35 frameworks with their questions]

---

Your task: Design the investigation to ensure NOTHING falls through the cracks.

The 35 frameworks above are comprehensive but GENERIC. For this specific
investigation, identify what's MISSING:

ANALYSIS REQUIRED:

1. CUSTOM QUESTIONS (Beyond 35 Frameworks)

   Review each of the 35 frameworks above. For THIS specific topic, what
   questions should we ask that the framework's generic questions don't capture?

   Format for each relevant framework:
   - Framework X "[name]" asks about [generic topic]. For THIS investigation,
     we specifically need to ask: [specific question]

   Also identify questions that don't fit ANY framework but are critical
   for this investigation.

2. DOMAIN-SPECIFIC DATA SOURCES

   Based on the strategic context, what specific data sources MUST we check
   that aren't obvious from the generic frameworks?

   For each source:
   - What is it?
   - Why is it authoritative for this topic?
   - What specific queries/searches should we run?
   - What MCP tool or method accesses it?

3. TOPIC-SPECIFIC INVESTIGATION APPROACHES

   What investigation methods are needed for THIS topic that aren't
   captured in the standard workflow?

   Examples:
   - Timeline reconstruction from specific events
   - Network mapping of specific relationships
   - Statistical analysis of specific data
   - FOIA requests to specific agencies
   - Expert interviews in specific fields

4. CRITICAL VERIFICATION POINTS

   What specific claims or facts MUST be verified for this investigation
   to be credible? What would be catastrophic to get wrong?

5. BLIND SPOT ANALYSIS

   Given the 35 frameworks and this specific topic, where are we most
   likely to miss something? What's the gap between generic frameworks
   and this specific domain?

OUTPUT THREE SECTIONS:

=== INVESTIGATION PLAN ===

# Investigation Plan: [Topic]

## Investigation Strategy

### Refined Question
[From refined prompt]

### Domain Classification
Primary: [e.g., Financial/Corporate, Political/Elections, Scientific/Medical]
Secondary: [additional relevant domains]

### Critical Data Sources
| Source | Why Critical | Query Strategy | Priority |
|--------|--------------|----------------|----------|
| [Source] | [Why must check] | [What to search] | HIGH/MEDIUM |

### Investigation Approach
[Narrative description of how to investigate this topic]

1. **Phase 1:** [What to establish first]
2. **Phase 2:** [What to investigate next]
3. **Phase 3:** [What to verify/reconcile]

### Critical Verification Points
These facts MUST be verified - getting them wrong would be catastrophic:
- [ ] [Fact that must be verified]
- [ ] [Fact that must be verified]

### Blind Spots to Watch
- [Blind spot]: [How to address]

### Key Experts/Sources to Research
| Expert/Source | Why Important | How to Find |
|---------------|---------------|-------------|
| [Name/Type] | [What they know] | [Where to look] |

=== CUSTOM QUESTIONS ===

# Custom Questions: [Topic]

These questions are SPECIFIC to this investigation and supplement
the 35 generic frameworks.

## Questions Derived from Framework Gaps

### From Framework 1 (Follow the Money)
The generic framework asks about financial relationships.
For THIS topic, we specifically need to ask:
- [Specific question]

### From Framework X ([Name])
[Continue for each framework where custom questions are needed]

## Questions Not Captured by Any Framework

### [Category]
- [Question]

## Verification Questions
- [Question that must be answered to verify a critical claim]

=== PLANNING TODOS ===

[
  {
    "id": "P001",
    "task": "[Specific task]",
    "rationale": "[Why this is needed]",
    "phase": "RESEARCH|QUESTION|FOLLOW",
    "priority": "HIGH|MEDIUM",
    "status": "pending"
  }
]
```

### Parse Output

The model will output three sections. Parse and save:

1. Content between `=== INVESTIGATION PLAN ===` and `=== CUSTOM QUESTIONS ===` → `investigation_plan.md`
2. Content between `=== CUSTOM QUESTIONS ===` and `=== PLANNING TODOS ===` → `custom_questions.md`
3. JSON array after `=== PLANNING TODOS ===` → store in state.json as `planning_todos`

---

## Step 4: Finalize

### Update State

After all three steps complete, update the case's `state.json`:

```json
{
  "phase": "BOOTSTRAP",
  "planning": {
    "step": 3,
    "refined_prompt": true,
    "strategic_context": true,
    "investigation_plan": true
  },
  "planning_todos": [/* from Step 3 */],
  "gates": {
    "planning": true
  }
}
```

### Commit

Commit within the case repository:
```bash
cd cases/<case-id>/
git add .
git commit -m "/plan-investigation: Investigation design complete"
```

---

## Output Files Summary

| File | Created By | Contains |
|------|------------|----------|
| `refined_prompt.md` | Step 1 | Clarified investigation question |
| `strategic_context.md` | Step 2 | Landscape understanding |
| `investigation_plan.md` | Step 3 | Strategy and approach |
| `custom_questions.md` | Step 3 | Topic-specific questions |
| `state.json` (planning_todos) | Step 3 | Tracked items |

---

## Integration

After `/plan-investigation` completes (files already in case directory):

1. **BOOTSTRAP** runs `/action research` (guided by `investigation_plan.md`)
2. **QUESTION** processes `custom_questions.md` as 36th "framework"
3. **FOLLOW** includes planning_todos as tracked leads
4. **CURIOSITY** verifies planning_todos addressed
