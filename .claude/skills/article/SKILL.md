---
name: article
description: Generate three publication-ready articles from investigation findings
context: fork
agent: general-purpose
user-invocable: false
argument-hint: [case-id]
---

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

## Execution

Use **GPT 5.2 Pro with extended thinking** for article generation.

### Step 0: Prerequisite Gate Check (BLOCKING)

**Before ANY article generation**, verify that gates 0-3 are passing:

```
Read state.json and verify:
- gates.planning === true    (Gate 0)
- gates.questions === true   (Gate 1)
- gates.curiosity === true   (Gate 2)
- gates.reconciliation === true (Gate 3)
```

**FAIL IMMEDIATELY if ANY of gates 0-3 are false.**

Do not proceed to article generation. Return error:
```
ERROR: Cannot generate articles - prerequisite gates not satisfied.
Failing gates: [list failing gates]
Action required: Complete FOLLOW phase before WRITE phase.
```

This prevents generating articles from incomplete investigations. The curiosity and reconciliation gates ensure all leads are investigated and findings are reconciled with the summary before writing.

### Step 1: Read Source Material

Read `summary.md` and all `questions/*.md` files. This is the source content for all three articles.

**During revision cycles:** Also read the feedback file specified in `state.json.revision.feedback_file` (e.g., `feedback/revision1.md`). The `## Article Changes` section contains required revisions.

### Step 1.5: Pre-Generation Citation Validation (BLOCKING)

**Before generating any articles**, validate ALL citations in summary.md:

```bash
node scripts/audit-citations.js cases/<case-id>/ --block
```

If the audit fails, **DO NOT proceed** to article generation. Fix issues first:
1. Re-capture missing sources using `/capture-source`
2. Update `sources.json` entries to have `captured: true`
3. Ensure each `evidence/S###/` has `metadata.json` and `content.md`

**Then run claim verification:**

```bash
node scripts/claims/verify-article.js cases/<case-id>/ --fix
```

For each claim in summary.md:
1. Verify the claim is registered in `claims.json` (extracted from source at capture time)
2. If statistics are cited, verify the numbers match exactly
3. If verification flags unverified claims, either:
   - Capture a source that supports the claim (which extracts and registers claims)
   - Correct the claim in summary.md to match a registered claim
   - Add appropriate caveats ("according to X" or "estimates suggest")

**CRITICAL:** Do not generate articles with unverified citations. Citation laundering
(attaching citations to claims they don't support) is a root cause of article failures.

### Step 2: Generate Articles with GPT 5.2 Pro

Generate all three articles **in parallel** using `mcp__mcp-openai__generate_text`:

| Article | model | reasoning_effort | max_output_tokens |
|---------|-------|------------------|-------------------|
| Short | gpt-5.2-pro | xhigh | 65536 |
| Medium | gpt-5.2-pro | xhigh | 65536 |
| Full | gpt-5.2-pro | xhigh | 65536 |

For each, pass:
- `system_prompt`: The writing rules and safety checklists from this document
- `prompt`: The source material + that article's specific requirements (length, inclusions, exclusions)

**Content Coverage Guidance:**

The model has editorial discretion to skip sections orthogonal to the main story. However, sections that rebut central claims from subjects (e.g., expert analysis contradicting official characterizations) should not be omitted.

**During revision cycles** (when `state.json` contains a `revision` block):

Include the **full `## Article Changes` section** from the feedback file in each prompt. Structure the prompt as:

```
[Source material: summary.md content]

---

## REVISION INSTRUCTIONS (MANDATORY)

The following changes were requested by the user and MUST be addressed in this revision:

[Paste the complete ## Article Changes section from feedback/revisionN.md here]

---

[Article-specific requirements: length, inclusions, exclusions]
```

The revision instructions are **binding requirements**, not suggestions. Every item in the Article Changes section must be addressed in the regenerated article.

**Note:** With `xhigh` reasoning, each call may take up to 60 minutes.

### Step 3: Write and Generate PDFs

1. Write responses to `articles/short.md`, `articles/medium.md`, `articles/full.md`
2. Run: `node scripts/generate-pdf.js cases/<case-id>/`

---

## Source Material

Read (in order of authority):

1. `summary.md` — **single source of truth** for findings and `[S###](url)` citations
2. `questions/*.md` — additional context **only if consistent with summary.md**

If a claim appears in `questions/*.md` but not in `summary.md`, **do not include it**.

Do not use outside knowledge. Do not invent anecdotes, quotes, stakeholders, or timelines.

### During Revision Cycles

When `state.json` contains a `revision` block, this is a revision cycle triggered by `/case-feedback`:

1. Read `state.json` to get `revision.feedback_file` path (e.g., `feedback/revision1.md`)
2. Read that feedback file to understand what user requested
3. The `## Article Changes` section contains specific revision instructions
4. Generate new articles that incorporate the feedback (git provides revision history)

The feedback file is **required reading** during revisions. Articles must address the user's feedback while maintaining all existing quality standards.

---

## Editorial Goal

Write with a clear story spine:

- **Lede** that captures the central tension in concrete terms (no hype, no moralizing)
- **Nut graf** early: the question investigated, key findings, why it matters to readers
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
  - Brief **Methodology** section: what types of sources consulted, how claims were selected, limitations
  - Complete **Sources Cited** section (sources with `[S###]` markers used in text)
  - **REQUIRED: Sources Consulted** section listing ALL other captured sources from `sources.json` that informed the investigation but were not directly cited. This provides transparency about the full evidence base.
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

[Nut graf: 3-6 sentences. The question at stake, key findings, why it matters.]

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

## Methodology (full.md only)

Must be auditable, not performative. Include:

- **Scope:** What was examined, what was excluded
- **Sources:** Count, types (primary/secondary), anonymous source handling
- **Verification:** Define "verified"; list gates used; describe cross-checking
- **Leads:** Define what counts as a lead; how tracked to resolution
- **Limitations:** What wasn't examined, pending FOIA, unavailable records
- **Disclosure:** Who produced the report

---

## Sources Cited

[List all sources cited in the article with `[S###]` markers]

- **[S001]** [Title](url) — Brief description
- **[S002]** [Title](url) — Brief description

## Sources Consulted

[REQUIRED for full.md: List ALL other captured sources from sources.json that informed the investigation but were not directly cited. Read sources.json and include every source not already in Sources Cited above. This section demonstrates the full evidence base examined.]

- **[S003]** [Title](url) — Brief description of how it informed the investigation
- **[S004]** [Title](url) — Brief description
```

---

## Writing Rules

### Voice & Tone

- Third person, neutral: "The investigation found..."
- No cheerleading; no cynicism
- When evidence is mixed, say so. When evidence is strong, say how you know
- Translate jargon. Define acronyms on first use

### Tone: Investigation vs Prosecution

- No novelistic scene-setting (weather, atmosphere) — stick to evidence
- Present facts neutrally; attribute characterizations to speakers
- Loaded adjectives ("stormed," "militarized") must be attributed, not stated as fact

### Evidence Handling

- **Do not imply causation** unless evidence is causal (RCTs)
- State limitations for observational results (confounding, selection)
- Distinguish: efficacy vs effectiveness, universal vs targeted, short-term vs long-term

### Epistemic Language for Forensic/Video Evidence

- Never "shows" or "proves" for contested interpretations — use "appears to show," "consistent with," "analysis indicates"
- Attribute conclusions to the analyst, not the medium: "[Analyst] found..." not "Video shows..."
- Preserve uncertainty from source analysis

### Citations

- Preserve `[S###](url)` format exactly
- Cite every key factual claim (numbers, findings, policy facts)
- **Do not cite every sentence** — prefer 1-3 citations per paragraph at end of claim
- When multiple claims use same source, cite once at paragraph end

### Citation Quality

- **Primary over secondary:** Cite original source; if unavailable, attribute: "X reported that Y found..."
- **Quantitative claims:** Cite specific tables/pages when possible
- **High-salience statistics:** Require primary source OR two independent secondary sources; caveat single-source claims

### Readability

- Paragraphs: 2-5 sentences
- Prefer prose over lists. Bullets only for short enumerations (max 6-8)
- No ALL CAPS emphasis. Use narrative emphasis
- No "thesis dump" intros. Earn complexity step by step
- Avoid vague phrases ("many," "experts say") unless you specify who and cite it

### Temporal Markers

Add "as of [date]" to evolving legal/procedural claims (lawsuit status, injunctions, pending investigations).

### Timeline Tables

For fast-moving events or contested sequences, consider a timeline table (`| Time | Event | Source |`) to strengthen verifiability.

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

### Legal Precision

- Distinguish legal definitions from criminal charges (definitions ≠ standalone offenses)
- Note colloquial vs legal usage of terms
- Include expert disagreement on legal characterizations

---

## Quality Bar

**Short:** Would a reader understand the core tension and defensible takeaways in 2-3 minutes without feeling oversold?

**Medium:** Would a skeptical editor accept this as a magazine feature—clear, fair, fact-checkable—without rewriting?

**Full:** Would a professional peer say "comprehensive *and* readable"? Are appendices keeping the narrative flowing?

---

## After Completion

Update `state.json`: Set `gates.article: true`

Orchestrator then invokes `/verify`.
