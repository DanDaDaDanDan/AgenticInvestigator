# Rigor Exploration Agent Prompt Template

## Context

- **Case:** {{case_id}}
- **Iteration:** {{iteration}}
- **Case Directory:** {{case_dir}}

## Task

Run comprehensive 20-Framework rigor exploration using GPT-5.2 Pro Extended Thinking.

**CRITICAL: This agent MUST use extended thinking for exhaustive exploration.**

---

## Model Configuration

Tool ids in this section are placeholders; see `prompts/_tooling.md`.

### Normal Mode (default)

```
mcp__mcp-openai__generate_text:
  model: "gpt-5.2-pro"
  reasoning_effort: "xhigh"
  max_output_tokens: 16384
```

### Fast Mode (`--fast`)

```
mcp__mcp-openai__generate_text:
  model: "gpt-5.2"
  reasoning_effort: "none"
  max_output_tokens: 16384
```

**Only the model changes. All prompts, depth requirements, and outputs remain identical.**

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

## Instructions

1. **Read investigation state:**
   - `summary.md` — Current findings summary
   - `claims/index.json` — All registered claims
   - `findings/*.md` — Task findings (for context)
   - `positions.md` — Documented stakeholder positions
   - `_sources.json` — Captured evidence registry

2. **Run 20-Framework Extended Thinking Analysis:**

   For EACH framework below, use GPT-5.2 Pro with `reasoning_effort: xhigh` to perform DEEP analysis. Not a checklist — actual exploration.

3. **CRITICAL: Create task files for ALL gaps (not just document them)**

   **⚠️ YOU MUST CREATE ACTUAL FILES, NOT JUST WRITE ABOUT THEM**

   For EVERY gap identified, you MUST:

   **Step 3a: Create the task file FIRST**
   ```bash
   # Use the Write tool to create tasks/R001.json, tasks/R002.json, etc.
   # Each task MUST be a separate JSON file
   ```

   Task file schema (`tasks/R###.json`):
   ```json
   {
     "id": "R001",
     "status": "pending",
     "priority": "HIGH",
     "type": "rigor",
     "framework": "follow_the_money",
     "question": "What financial relationships exist between X and Y that we haven't documented?",
     "evidence_requirements": {
       "min_supporting_sources": 2,
       "independence_rule": "true_independent",
       "requires_capture": true
     },
     "approach": "Search for SEC filings, financial disclosures, transaction records",
     "success_criteria": "Document all financial connections or confirm none exist with evidence",
     "created_at": "ISO-8601"
   }
   ```

   **Step 3b: Log task creation to ledger**
   ```bash
   node scripts/ledger-append.js {{case_dir}} task_create --task R001 --priority HIGH --perspective Rigor
   ```

   **Step 3c: ONLY THEN reference the task in rigor-checkpoint.md**
   ```markdown
   **Tasks Generated:** R001, R002  ← These files MUST exist
   ```

4. **Verification before completing:**

   Before writing rigor-checkpoint.md, verify:
   ```bash
   ls {{case_dir}}/tasks/R*.json  # Must show all R### files you created
   ```

   **❌ WRONG (documenting tasks without creating files):**
   ```markdown
   ### 1. Follow the Money
   - **Tasks:**
     - R021: Create "Scope & Methods" memo...  ← File doesn't exist!
   ```

   **✅ CORRECT (create file, then reference):**
   ```bash
   # 1. Create file first
   Write tasks/R021.json with full schema
   # 2. Log to ledger
   node scripts/ledger-append.js ... task_create --task R021 ...
   # 3. Then reference in checkpoint
   **Tasks Generated:** R021
   ```

---

## The 20 Frameworks (Deep Analysis Required)

**MINIMUM: 200 words per framework. Do not check boxes — THINK.**

### 1. Follow the Money
- Who benefits financially from each outcome?
- What financial relationships haven't we mapped?
- What payments, contracts, or interests might explain behavior?
- What financial documents MUST exist that we haven't found?

### 2. Follow the Silence
- Who is NOT talking that should be?
- What questions are being avoided?
- What topics cause deflection?
- Who has something to lose by speaking?
- What would we expect to hear that we're NOT hearing?

### 3. Follow the Timeline
- What sequence of events would change the interpretation?
- Are there suspicious gaps in the timeline?
- What happened JUST BEFORE the key event?
- What decisions were made in what order?
- Do the timestamps make sense?

### 4. Follow the Documents
- What documents MUST exist but we haven't found?
- What paper trails would prove/disprove claims?
- What contracts, emails, records are missing?
- What filings should be public but we haven't checked?

### 5. Follow the Contradictions
- Where do sources disagree?
- Which contradictions are most significant?
- What would resolve each contradiction?
- Are contradictions explained or unexplained?

### 6. Follow the Relationships
- What connections haven't we mapped?
- Who knows whom, and since when?
- What conflicts of interest exist?
- What relationships preceded the events in question?

### 7. Stakeholder Mapping
- Who are ALL the stakeholders?
- What does each stakeholder want?
- Whose interests are we missing?
- Who has been impacted that we haven't considered?

### 8. Network Analysis
- What networks connect key players?
- Are there hidden connections?
- Who are the information brokers?
- What organizational ties exist?

### 9. Means/Motive/Opportunity
- For each allegation: who had means, motive, opportunity?
- Are there OTHER people who had all three?
- Have we considered all who could have done this?

### 10. Competing Hypotheses
- What are ALL the possible explanations?
- Which hypotheses haven't we tested?
- What evidence would distinguish between hypotheses?
- What's the probability of each hypothesis?

### 11. Assumptions Check
- What are we ASSUMING without evidence?
- Which assumptions would change everything if wrong?
- What are we taking for granted?
- What "obvious" facts haven't we verified?

### 12. Pattern Analysis
- What patterns have we identified?
- What patterns might we be missing?
- Is this part of a larger pattern?
- Does this fit known patterns of similar situations?

### 13. Counterfactual
- What would prove us WRONG?
- What evidence would we expect to see if our conclusions are wrong?
- Have we looked for disconfirming evidence?
- What haven't we found that we should have found if true?

### 14. Pre-Mortem
- If this investigation fails, why would it fail?
- What are we most likely to get wrong?
- What would we regret not asking?
- What criticism would future reviewers have?

### 15. Cognitive Bias Check
- What biases might be affecting our analysis?
- Are we confirmation-biased toward certain conclusions?
- Are we anchored on early information?
- Are we favoring sources that agree with us?

### 16. Uncomfortable Questions
- What questions are we avoiding?
- What would we NOT want to find?
- What questions would make subjects most defensive?
- What's the elephant in the room?

### 17. Second-Order Effects
- What are the downstream implications of our findings?
- Who else is affected?
- What unintended consequences might result?
- What does this connect to that we haven't explored?

### 18. Meta Questions
- Why are we investigating this now?
- Who wants this investigated (and who doesn't)?
- What's the broader context?
- Are we being used for someone else's agenda?

### 19. 5 Whys (Root Cause)
- For key events: Why did this happen? (5 levels deep)
- What systemic factors contributed?
- What's the root cause, not just proximate cause?
- What conditions allowed this to happen?

### 20. Sense-Making
- Does our overall narrative make sense?
- Are there explanatory gaps?
- What's the most parsimonious explanation?
- Would a reasonable person believe this?

---

## CRITICAL FRAMEWORKS (21-25): Domain Expertise & First Principles

**These frameworks address the most common failure mode: surface-level analysis that misses what domain experts consider obvious.**

### 21. First Principles / Scientific Reality
**MANDATORY for any investigation involving physical, biological, or technical subjects.**

- What does SCIENCE say about the underlying subject matter?
- What are the biological, physical, chemical, or technical REALITIES?
- What do peer-reviewed studies actually show (not what marketing claims)?
- What is the scientific consensus in relevant fields?
- Have we consulted primary scientific literature, not just news articles?

**Example (egg labels):** Chickens are descended from jungle fowl and are naturally agoraphobic - they experience stress in open spaces and prefer cover. This basic ethological fact fundamentally challenges "free-range = better welfare" marketing.

**Required sources:** Peer-reviewed journals, academic textbooks, scientific reviews

### 22. Domain Expert Blind Spots
**What would a subject matter expert consider OBVIOUS that we're missing?**

- Who are the domain experts for this topic? (veterinarians, scientists, engineers, etc.)
- What do they consider common knowledge in their field?
- What would they immediately flag as missing from our analysis?
- What questions would they ask that we haven't?
- What terminology or concepts are we misunderstanding?

**Action:** Use deep research to query: "What do [domain experts] consider obvious about [topic] that journalists/laypeople typically miss?"

### 23. Marketing vs Scientific Reality
**Where do marketing claims diverge from scientific evidence?**

- What does marketing/PR say vs what does research show?
- What terms are being used that have marketing definitions vs scientific definitions?
- What beneficial-sounding claims lack scientific support?
- What negative realities are being obscured by positive framing?
- Who funded the studies being cited by marketing?

**Example:** "Free-range" sounds welfare-positive but science shows chickens may be more stressed outdoors due to agoraphobia, predator exposure, and disease risk.

### 24. Subject Experience / Ground Truth
**What does the actual subject (person, animal, system) experience?**

- For animals: What do ethological studies show about their preferences and stress responses?
- For people: What do affected individuals actually report experiencing?
- For systems: What do operational metrics actually show?
- Are we taking the subject's perspective or only the claimant's perspective?
- What would we find if we directly observed/measured the subject?

**This framework prevents accepting claims about subjects without verifying the subject's actual experience.**

### 25. Contrarian Expert Search
**Actively seek experts who disagree with the conventional narrative.**

- Who are the credentialed experts who dispute the mainstream view?
- What peer-reviewed research contradicts popular belief?
- What do industry insiders say privately vs publicly?
- What whistleblowers or critics have raised concerns?
- What inconvenient findings have been downplayed or ignored?

**Action:** Explicitly search for: "[topic] criticism", "[topic] problems", "[topic] myth", "why [popular belief] is wrong"

---

## Mandatory Domain-Specific Source Requirements

**Before publication, verify these source types are present:**

| Topic Domain | Required Source Types |
|--------------|----------------------|
| Animal welfare | Veterinary journals, ethology studies, animal behavior research |
| Health/nutrition | Peer-reviewed medical journals, clinical trials, systematic reviews |
| Environmental | Ecological studies, environmental science journals, emissions data |
| Financial | SEC filings, audited financials, court documents |
| Technical/engineering | Technical specifications, engineering studies, failure analyses |
| Legal/regulatory | Statutes, regulations, court rulings, enforcement actions |

**If required source types are MISSING, that is a BLOCKER for publication.**

---

## Output Requirements

### findings/rigor-checkpoint.md

```markdown
# Rigor Checkpoint: [Case ID]

**Iteration:** N
**Date:** YYYY-MM-DD
**Analysis Type:** 25-Framework Deep Exploration (includes Domain Expertise frameworks)

## Executive Summary
[3-5 paragraphs summarizing the rigor analysis results]

## Framework Analysis

### 1. Follow the Money
[Detailed analysis - minimum 200 words]
**Gaps Identified:** [List specific gaps]
**Tasks Generated:** R001, R002

### 2. Follow the Silence
[Detailed analysis - minimum 200 words]
**Gaps Identified:** [List]
**Tasks Generated:** R003

[... Continue for all 25 frameworks ...]

### 21. First Principles / Scientific Reality
[What does science actually say? Peer-reviewed sources required]
**Scientific Sources Consulted:** [List journals/studies]
**Tasks Generated:** R###

### 22. Domain Expert Blind Spots
[What would experts consider obvious that we missed?]
**Expert Perspectives Missing:** [List]
**Tasks Generated:** R###

### 23. Marketing vs Scientific Reality
[Where do marketing claims diverge from research?]
**Gaps Identified:** [List]
**Tasks Generated:** R###

### 24. Subject Experience / Ground Truth
[What does the actual subject experience?]
**Tasks Generated:** R###

### 25. Contrarian Expert Search
[What do credentialed critics say?]
**Tasks Generated:** R###

## Investigation Gaps Summary

### Critical (blocks publication)
| Gap | Framework | Required Action | Task ID |
|-----|-----------|-----------------|---------|

### Important (should address)
| Gap | Framework | Required Action | Task ID |
|-----|-----------|-----------------|---------|

### Minor (nice to have)
| Gap | Framework | Suggestion | Task ID |
|-----|-----------|------------|---------|

## Framework Checklist

| # | Framework | Analyzed | Gaps Found | Tasks Created |
|---|-----------|----------|------------|---------------|
| 1 | Follow the Money | YES | 3 | R001, R002, R003 |
| 2 | Follow the Silence | YES | 1 | R004 |
| ... | ... | ... | ... | ... |
| 21 | First Principles / Scientific Reality | YES | ? | R### |
| 22 | Domain Expert Blind Spots | YES | ? | R### |
| 23 | Marketing vs Scientific Reality | YES | ? | R### |
| 24 | Subject Experience / Ground Truth | YES | ? | R### |
| 25 | Contrarian Expert Search | YES | ? | R### |

**Frameworks Completed:** X/25

## Domain-Specific Source Audit

| Required Source Type | Present? | Sources |
|---------------------|----------|---------|
| Peer-reviewed journals | YES/NO | [List] |
| Veterinary/medical studies | YES/NO | [List] |
| Academic textbooks | YES/NO | [List] |
| Scientific reviews | YES/NO | [List] |

**BLOCKER if required domain sources are missing.**
**Total Gaps Identified:** Y
**Tasks Generated:** Z

## Publication Status

Based on rigorous 20-framework analysis:

**Status:** [READY | READY WITH CAVEATS | NOT READY]

**Blocking Issues:** [List if any]
**Recommended Actions:** [List]

---
*Rigor checkpoint completed using GPT-5.2 Pro Extended Thinking*
*Analysis depth: EXHAUSTIVE (reasoning_effort: xhigh)*
```

---

## Rigor Checklist (Self-Audit)

Before completing:

**Process Rigor:**
- [ ] All 25 frameworks analyzed (not just checked)
- [ ] Each framework has minimum 200 words of analysis
- [ ] Gaps are specific, not vague
- [ ] Tasks are question-shaped, not topic-shaped
- [ ] Counterfactual evidence was sought
- [ ] Uncomfortable questions were asked
- [ ] Alternative explanations were considered
- [ ] Assumptions were explicitly documented

**Domain Expertise (CRITICAL - prevents surface-level misses):**
- [ ] First principles scientific analysis completed (Framework 21)
- [ ] Peer-reviewed academic sources consulted
- [ ] Domain expert perspective explicitly considered (Framework 22)
- [ ] Marketing claims tested against scientific evidence (Framework 23)
- [ ] Subject experience/ground truth verified (Framework 24)
- [ ] Contrarian expert opinions sought (Framework 25)
- [ ] Required domain-specific source types present (see table above)

**Final Check:**
- [ ] Would a domain expert (veterinarian, scientist, engineer) find obvious gaps?
- [ ] Have we challenged feel-good narratives with scientific reality?
- [ ] Publication status is based on actual analysis

---

## Bad vs Good Analysis Examples

**BAD (checkbox mentality):**
```
### 1. Follow the Money
Checked financial aspects. No issues found.
```

**GOOD (deep exploration):**
```
### 1. Follow the Money
We have documented that Company X received funding from Investor Y, but we have NOT verified:
- The exact amount (sources conflict: $5M vs $10M)
- The timing relative to the regulatory decision
- Whether there were other undisclosed investors
- What Company X's financial state was before investment

The SEC filings we captured (S023, S024) are annual reports, but we need quarterly reports from Q2 2024 to establish precise timing. We also haven't searched state-level corporate filings which might reveal additional investors.

CRITICAL GAP: No primary documentation of the alleged $5M payment exists in our evidence. This is cited in news reports but traces back to a single anonymous source.

**Gaps Identified:**
1. Quarterly SEC filings for Q2 2024 (S023 shows annual only)
2. State corporate filings for LLC structure
3. Primary documentation of $5M figure

**Tasks Generated:** R001 (quarterly filings), R002 (state filings)
```

---

## Return Value

After completing analysis, return:

```
RIGOR CHECKPOINT COMPLETE

Frameworks Analyzed: 20/20
Gaps Identified: [number]
Tasks Generated: [list of R### IDs]
Publication Status: [READY|NOT READY]
Blocking Issues: [count]

Output written to: findings/rigor-checkpoint.md
```
