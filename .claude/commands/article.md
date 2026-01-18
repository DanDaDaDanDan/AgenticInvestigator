# /article - Generate Publication Articles

Generate three publication-ready articles from investigation findings.

## Usage

```
/article              # Generate for active case
/article [case-id]    # Generate for specific case
```

## Task

Generate three publication-ready articles with **top-tier narrative clarity**, **rigorous sourcing**, and **high readability**. The output should read like **finished journalism**, not a policy memo.

---

## Execution: GPT 5.2 Pro in Parallel

Article generation uses **GPT 5.2 Pro with extended thinking** for maximum quality.

### Step 1: Gather Source Material

Read and concatenate into a single context block:
- `summary.md`
- All `questions/*.md` files

### Step 2: Generate All Three Articles in Parallel

Call `mcp__mcp-openai__generate_text` **three times in parallel** (single message, three tool calls):

```
Model: gpt-5.2-pro
Reasoning: xhigh
Max tokens: 16384 (short/medium), 32768 (full)
```

Each call gets:
- **system_prompt**: The writing rules and safety checklists from this document
- **prompt**: The source material + article-specific instructions (length, what to include/exclude)

### Step 3: Write Results

Write each response to:
- `articles/short.md`
- `articles/medium.md`
- `articles/full.md`

### Step 4: Generate PDFs

```bash
node scripts/generate-pdf.js cases/<case-id>/
```

---

## Source Material

Read (in order of authority):

1. `summary.md` — **single source of truth** for findings and `[S###](url)` citations
2. `questions/*.md` — additional context **only if consistent with summary.md**

If a claim appears in `questions/*.md` but not in `summary.md`, **do not include it**.

Do not use outside knowledge. Do not invent anecdotes, quotes, stakeholders, or timelines.

---

## Editorial Goal

Write with a clear story spine:

- **Lede** that captures the central tension in concrete terms (no hype, no moralizing)
- **Nut graf** early: what the investigation examined, what it found, why it matters
- A structured arc: *what's happening → what the evidence says → what breaks in reality → honest implications*
- End with a conclusion **earned** by the evidence, explicitly noting **uncertainties and limits**

Avoid "report voice" (Part I/Part II, CRITICAL FINDING, excessive bullets). If something is important, make it feel important through framing and placement.

---

## Outputs

### 1. Short Article (`articles/short.md`)

- **Length:** 500-900 words
- **Purpose:** Fast, compelling overview for a busy reader
- **Tone:** Newspaper-style lede + clean explanatory writing
- **Include:** 2-4 defining facts/figures, central tension, what's most supported vs oversold
- **Exclude:** Sources section, methodology, deep program catalogs, long study lists

### 2. Medium Article (`articles/medium.md`)

- **Length:** 2,200-3,800 words (excluding Sources)
- **Purpose:** Article of record — balanced, verifiable, readable
- **Tone:** Magazine feature with strong narrative spine
- **Include:**
  - Clear structure with informative subheads
  - Section on what works / what doesn't / what we don't know
  - Section on implementation constraints (fidelity, staffing, funding)
  - **Sources** section at end
- **Exclude:** Methodology section, exhaustive tables/enumerations

### 3. Full Article (`articles/full.md`)

- **Length:** No limit, but prioritize readability (do not bloat)
- **Purpose:** Complete, transparent record that remains readable
- **Tone:** Long-form investigative/explanatory journalism
- **Include:**
  - Everything needed to understand and verify the investigation
  - Brief **Methodology** section: what was reviewed, how claims were selected, limitations
  - Complete **Sources** section
- **Appendices preferred** for heavy detail:
  - `## Appendix: Study Notes / Evidence Map`
  - `## Appendix: Implementation Details`
  - `## Appendix: Definitions / Acronyms`

---

## Structure Template

Adapt subheads as needed. Keep paragraphs short. Make the piece skimmable.

```markdown
# [Compelling Title]

*[Lede: 1-2 sentences. Concrete tension, not vague trend language.]*

[Nut graf: 3-6 sentences. What was examined, key findings, why it matters.]

## [The Core Dynamic]
[Why this matters, what creates the tension]

## What the Evidence Supports
[Strongest areas; distinguish effect sizes vs expectations; name best-supported approaches]

## Where Things Break in the Real World
[Implementation gaps, staffing, funding, replication failures]

## The Hard Questions
[Potential harms, trade-offs, controversies—carefully attributed]

## What's Still Uncertain
[Long-term effects, subgroup differences, causal claims, thresholds]

## The Honest Bottom Line
[High-integrity conclusion. No advocacy masquerading as fact.]

---

## Sources

- **[S001]** [Title](url) — Brief description
- **[S002]** [Title](url) — Brief description
```

---

## Writing Rules

### Voice & Tone

- Third person, neutral: "The investigation found..."
- No cheerleading; no cynicism
- When evidence is mixed, say so. When evidence is strong, say how you know
- Translate jargon. Define acronyms on first use

### Evidence Handling

- **Do not imply causation** unless evidence is causal (RCTs)
- State limitations for observational results (confounding, selection)
- Distinguish: efficacy vs effectiveness, universal vs targeted, short-term vs long-term

### Citations

- Preserve `[S###](url)` format exactly
- Cite every key factual claim (numbers, findings, policy facts)
- **Do not cite every sentence** — prefer 1-3 citations per paragraph at end of claim
- When multiple claims use same source, cite once at paragraph end

### Readability

- Paragraphs: 2-5 sentences
- Prefer prose over lists. Bullets only for short enumerations (max 6-8)
- No ALL CAPS emphasis. Use narrative emphasis
- No "thesis dump" intros. Earn complexity step by step
- Avoid vague phrases ("many," "experts say") unless you specify who and cite it

### Prohibited

- Facts not in summary.md
- Invented anecdotes, scenes, or quotes
- "Declined to comment" unless summary.md documents outreach
- "Clearly," "obviously," "it's clear that"
- Single study presented as definitive when evidence is mixed
- CORRECTION, UPDATE, REVISION, or any revision language

---

## Safety Checklists

### Evidence Accuracy

- [ ] Causality language matches evidence type (RCT vs observational vs opinion)
- [ ] Uncertainty stated where evidence is limited or contested
- [ ] Numbers match across short/medium/full (no drift)
- [ ] All `[S###](url)` citations present and correct

### Legal Safety (for investigations involving named individuals)

- [ ] Unconvicted persons: "charged with" not "committed"
- [ ] Damaging claims attributed to sources, not stated as fact
- [ ] Alleged vs charged vs convicted clearly distinguished
- [ ] No stigmatizing or deterministic language about individuals

---

## Quality Bar

**Short:** Would a reader understand the core tension and defensible takeaways in 2-3 minutes without feeling oversold?

**Medium:** Would a skeptical editor accept this as a magazine feature—clear, fair, fact-checkable—without rewriting?

**Full:** Would a professional peer say "comprehensive *and* readable"? Are appendices keeping the narrative flowing?

---

## After Completion

Update `state.json`: Set `gates.article: true`

Orchestrator then invokes `/verify`.
