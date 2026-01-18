# /article - Generate Publication Articles

Generate publication-ready articles with beautiful PDF output.

## Usage

```
/article              # Generate for active case
/article [case-id]    # Generate for specific case
```

## Task

Create three articles from `summary.md`:
1. **Short** (400-800 words) - Quick overview, key findings only
2. **Medium** (2,000-4,000 words + sources) - Balanced coverage, main points, with source list
3. **Full** (no limit) - Comprehensive coverage with methodology and sources

**Word counts exclude the Sources section** - sources are free.

Then generate PDFs with professional typography.

## Instructions

1. **Read source material:**
   - `summary.md` (PRIMARY - contains all findings with [S###](url) citations)
   - `questions/*.md` (framework answers - include ALL relevant findings)

2. **Generate all three articles:**
   - `articles/short.md` (400-800 words) - No sources section
   - `articles/medium.md` (2,000-4,000 words) - Include Sources section, skip methodology
   - `articles/full.md` (no limit) - Include both Methodology and Sources sections
   - Word counts exclude Sources section

3. **Full article guidelines:**
   - Cover ALL findings from summary.md and questions/*.md
   - Err on the side of inclusion - if it's in the research, include it
   - Draw clear conclusions from the evidence
   - Connect findings across frameworks
   - Don't compress or summarize when full detail serves the reader

4. **Generate PDFs:**
   ```bash
   node scripts/generate-pdf.js cases/<case-id>/
   ```
   This creates `articles/short.pdf`, `articles/medium.pdf`, and `articles/full.pdf`

5. **Update state.json:** Set `gates.article: true`

---

## Markdown Formatting for PDF

The PDF uses Kindle-style typography. Structure your markdown for optimal rendering:

### Document Structure

```markdown
# Title of the Article

Opening paragraph becomes the italicized lead/subtitle. Make it compelling -
one or two sentences summarizing the investigation's key finding.

## First Section Heading

Body text here...

### Subsection (if needed)

More details...

---

## Sources

[S001]: URL - Description
[S002]: URL - Description
```

### Typography Features

| Element | Renders As |
|---------|------------|
| `# H1` | Large serif title |
| First paragraph after H1 | Italicized lead paragraph with bottom border |
| `## H2` | Section headings |
| `### H3` | Subsections (italic style) |
| `> Blockquote` | Left-bordered, italic, indented |
| `---` | Centered asterisks (* * *) as section break |
| `**bold**` | Emphasized text |
| `[link](url)` | Underlined with subtle color |

### Best Practices

- **Lead paragraph matters** - First paragraph after title gets special styling
- **Use H2 for major sections** - Creates clear visual hierarchy
- **Blockquotes for direct quotes** - Styled distinctively
- **Section breaks (---) between major parts** - Renders as elegant divider
- **End with sources section** - Professional attribution

---

## Writing Standards

| Do | Don't |
|----|-------|
| "According to [source]..." | "It's obvious that..." |
| "The investigation found..." | "We discovered..." |
| "Critics argue..." | "The truth is..." |
| "Records show..." | "Clearly..." |

## Rules

- NEVER introduce facts not in summary.md
- ALWAYS preserve `[S###](url)` citation format
- Present contested claims as contested
- Neutral, professional tone
- All perspectives balanced

---

## Pre-Flight Checklist

Before finalizing, verify:

### Legal Safety
- [ ] **Presumption of innocence** - "Charged with" not "committed" for unconvicted
- [ ] **Attribution** - Damaging claims attributed to sources, not stated as fact
- [ ] **Opinion vs fact** - Clearly distinguished

### Fairness
- [ ] **Right of reply** - Subject's response included (or "declined to comment")
- [ ] **Legal status** - Clear whether alleged, charged, convicted
- [ ] **Balance** - All significant viewpoints represented

### Accuracy
- [ ] **Every fact cited** - No uncited factual claims
- [ ] **Sources verified** - All [S###] actually exist in evidence/
- [ ] **Quotes in context** - Not misleadingly excerpted

---

## Output

- `articles/short.md` - Short article markdown (400-800 words)
- `articles/short.pdf` - Short article PDF
- `articles/medium.md` - Medium article markdown (2,000-4,000 words)
- `articles/medium.pdf` - Medium article PDF
- `articles/full.md` - Full article markdown (comprehensive, no length limit)
- `articles/full.pdf` - Full article PDF (primary deliverable)

## Next Step

After article generation, orchestrator invokes `/verify`.
