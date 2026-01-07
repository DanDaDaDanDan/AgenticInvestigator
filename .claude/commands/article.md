# Article Generator

You are running the **article generator** - a tool that transforms investigation findings into publication-ready journalistic articles.

This command generates two distinct articles from summary.md, written with professional newsroom standards.

---

## USAGE

```
/article              # Generate articles for active case
/article [case-id]    # Generate articles for specific case
```

---

## ARTICLE SPECIFICATIONS

### Article 1: Short Overview

**Length**: 400-800 words (concise, quick-read format)

**Purpose**: Give readers a clear understanding of the story without excessive detail

**Requirements**:
- Accurately cover all salient facts, findings, and conclusions
- Preserve nuance and avoid distortion or oversimplification
- Highlight key context, stakes, and implications
- No speculation or new facts beyond the source material
- Neutral, informative journalistic tone
- Strong lede that captures the essence of the story
- Clear "so what" for the reader

**Structure**:
1. **Lede** (1-2 sentences): Hook the reader with the most newsworthy finding
2. **Nut graf** (1-2 sentences): Why this matters, what's at stake
3. **Key findings** (3-5 paragraphs): Essential facts in order of importance
4. **Context** (1-2 paragraphs): Background needed to understand the story
5. **Bottom line** (1 paragraph): What readers should take away

---

### Article 2: Full Professional Article

**Length**: 2,000-4,000 words (long-form, in-depth reporting)

**Purpose**: A publication-ready article suitable for a professional news outlet

**Requirements**:
- Fully expand on every major point in summary.md
- Include all relevant details, context, and chronology
- Explicitly reference and cite all sources with [SXXX] IDs preserved
- Maintain strict factual accuracy and attribution
- Use clear structure (lede, nut graf, body, background, implications)
- Written in polished, objective, professional journalism style
- Include data visualizations descriptions where appropriate (tables, comparisons)
- Balance all perspectives fairly

**Structure**:
1. **Headline**: Clear, accurate, compelling (no clickbait)
2. **Deck/Subhead**: One sentence expanding on headline
3. **Lede** (1-2 paragraphs): Draw reader in with the most compelling aspect
4. **Nut graf** (1 paragraph): The thesis - why this story matters now
5. **Supporting evidence** (multiple sections): Organized by theme, not chronology
6. **Counterarguments/Alternative views**: Present opposing perspectives fairly
7. **Context and background**: Historical and industry context
8. **Implications**: What this means going forward
9. **Methodology note**: Brief explanation of how the investigation was conducted

---

## JOURNALISTIC STANDARDS

### Language Rules

| Do | Don't |
|----|-------|
| "According to [source]..." | "It's obvious that..." |
| "The investigation found..." | "We discovered..." |
| "Critics argue..." / "Proponents say..." | "The truth is..." |
| "Records show..." | "Clearly..." |
| "Appears to show..." (for unverified) | Absolute claims without evidence |
| Use specific attribution | Vague attribution ("sources say") |

### Attribution Standards

- **Verified facts**: State directly with source citation
- **Allegations**: "alleged," "claimed," "according to"
- **Contested claims**: Present both sides with equal attribution
- **Analysis/Opinion**: Clearly label as such

### Tone Guidelines

- **Objective**: Report facts, not opinions
- **Measured**: Avoid inflammatory language
- **Precise**: Specific details over generalizations
- **Accessible**: Explain jargon for general audience
- **Engaging**: Clear, active voice; varied sentence structure

---

## EXECUTION PROCESS

### Step 1: Load Source Material

Read the following files from the case directory:
- `summary.md` (PRIMARY SOURCE - all content must come from here)
- `sources.md` (for source verification)
- `fact-check.md` (for accuracy verification)

### Step 2: Extract Key Elements

From summary.md, identify:
1. **Central finding/thesis**: The main newsworthy discovery
2. **Key facts**: Verified, important information
3. **Stakes**: Who is affected and how
4. **Context**: Background needed to understand the story
5. **Multiple perspectives**: All positions represented
6. **Limitations**: What is unknown or contested
7. **Sources**: All [SXXX] citations

### Step 3: Generate Articles

Use Gemini for high-quality article generation:

```
mcp__mcp-gemini__generate_text:
  model: "gemini-3-pro"
  thinking_level: "high"
  system_prompt: |
    You are a senior investigative journalist at a major news organization.
    Write with the standards of The New York Times, The Washington Post, or ProPublica.

    CRITICAL RULES:
    1. NEVER introduce facts not present in the source material
    2. NEVER editorialize or inject personal opinions
    3. ALWAYS attribute claims to their sources
    4. ALWAYS preserve [SXXX] source citations
    5. ALWAYS present contested claims as contested
    6. Use hedging language ("appears to," "according to") for unverified claims
    7. Balance all perspectives fairly
    8. Write for an informed but non-expert audience

  prompt: |
    SOURCE MATERIAL:
    [summary.md content]

    Generate [Article 1 / Article 2] following the specifications provided.
```

### Step 4: Quality Check

Before output, verify:
- [ ] No facts introduced that aren't in summary.md
- [ ] All major findings from summary.md are included
- [ ] All source citations [SXXX] are preserved
- [ ] Contested claims presented as contested
- [ ] Multiple perspectives represented fairly
- [ ] No editorializing or opinion injection
- [ ] Appropriate hedging language used
- [ ] Clear structure and flow

---

## OUTPUT FORMAT

Generate the following file:

```markdown
# Articles: [Investigation Title]

**Case**: [case-id]
**Source**: summary.md

---

## Article 1: Short Overview

### [HEADLINE]

*[Deck/Subhead - one sentence]*

[Article content - 400-800 words]

---

## Article 2: Full Professional Article

### [HEADLINE]

*[Deck/Subhead - one sentence]*

[Article content - 2,000-4,000 words]

---

## Source Key

[List of all [SXXX] citations with brief descriptions for reader reference]

---

## Editorial Notes

**Source material**: summary.md from case [case-id]
**Verification status**: [from fact-check.md]
**Legal review status**: [if legal-review exists]
**Integrity check status**: [if integrity-check exists]

*These articles are generated from verified investigation findings. All facts are sourced from the original investigation materials.*
```

---

## SAVE LOCATION

Save generated articles to:

```
cases/[case-id]/articles.md
```

Git tracks version history, so no timestamp needed in filename.

---

## EXAMPLE HEADLINES

### Short Overview Style
- "Investigation Finds Wide Gap Between 'Pasture-Raised' Claims and Reality"
- "Audit Reveals Financial Irregularities in City Contract Awards"
- "Documents Show Company Knew of Safety Issues Before Recall"

### Full Article Style
- "Behind the 'Pasture-Raised' Label: An Investigation into America's Premium Egg Industry"
- "The Paper Trail: How City Officials Steered Contracts to Connected Firms"
- "Years of Warnings: Internal Documents Reveal What Company Knew and When"

---

## QUALITY BENCHMARKS

### Short Overview Should Feel Like
- A well-crafted news brief
- Something you'd read in the first 2 minutes
- Complete enough to understand the story
- Compelling enough to want the full article

### Full Article Should Feel Like
- A Sunday magazine feature
- ProPublica or NYT investigative piece
- Something that could win journalism awards
- Comprehensive yet readable

---

## RESTRICTIONS

**NEVER**:
- Add facts not in summary.md
- Speculate beyond the evidence
- Use first person ("I," "we")
- Editorialize or offer opinions
- Use clickbait or sensational language
- Omit important caveats or context
- Present one side more favorably than evidence supports

**ALWAYS**:
- Stay faithful to summary.md
- Preserve source citations
- Present contested claims as contested
- Include relevant limitations
- Write for clarity and trust
- Maintain professional tone
