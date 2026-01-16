# Root Cause Analysis: Context Loss in Sub-Agent Handoffs

**Date:** 2026-01-16
**Investigator:** Claude Opus 4.5
**Scope:** Analysis of data flow and potential information loss between investigation phases

---

## Executive Summary

Analysis of the AgenticInvestigator system reveals **10 confirmed context loss points** where valuable investigation findings can be lost during sub-agent handoffs and phase transitions. The most critical issues are:

1. **future_research.md is write-only** - Leads beyond max_depth are captured but never read
2. **Question files are secondary to article generation** - Rich analysis gets compressed
3. **No gate verifies content inclusion** - Article can omit important findings without detection

---

## Confirmed Context Loss Points

### 1. future_research.md Is Write-Only (Never Read)

**Location:** `/follow` command, `init-case.js`

**Evidence:**
- Created by `init-case.js:222-227`
- Written to by `/follow` when leads exceed `max_depth` (follow.md:194-204)
- **Never read** by any command: `/curiosity`, `/article`, `/verify`, `/integrity`, `/legal-review`

**Grep verification:**
```
CLAUDE.md:270:- Leads beyond `max_depth` go to `future_research.md` instead
.claude/commands/follow.md:170:   - If new depth > `max_depth` → add to `future_research.md` instead
.claude/commands/follow.md:195:2. Add to `future_research.md`:
```
No grep results for any command reading this file.

**Impact:** Leads that spawn from depth-2 investigations are logged but never reviewed. These often represent the most interesting findings discovered during recursive investigation.

**Fix Required:**
- `/curiosity` should read `future_research.md` and flag if it contains high-priority unaddressed leads
- `/article` should optionally reference `future_research.md` for a "Further Investigation" section

---

### 2. Question Files Are Secondary to Article Generation

**Location:** `/article` command (article.md:22-24)

**Evidence:**
```markdown
1. **Read source material:**
   - `summary.md` (PRIMARY - contains all findings with [S###](url) citations)
   - `questions/*.md` (framework answers for context)
```

The word "PRIMARY" for summary.md and "for context" for questions explicitly deprioritizes the 35 framework files.

**Impact:** The 35 question files contain:
- Confidence levels (HIGH/MEDIUM/LOW) for each finding
- Leads generated from each framework
- Novel case-specific questions
- Detailed analysis per framework (~200 words each = ~7,000 words total)

If content from question files didn't make it to summary.md during the `/question` phase, it will likely be omitted from the article.

**Fix Required:**
- Article generation should explicitly check each question file for HIGH-confidence findings not in summary.md
- Add a verification step: "For each question file, verify key findings appear in summary.md or article"

---

### 3. "Key Findings" and "Significant Findings" Are Subjective

**Location:** `/question` (line 63), `/follow` (line 165)

**Evidence:**
```markdown
# question.md:63
7. **Update summary.md** - Add key findings with `[S###](url)` citations

# follow.md:165
8. **Update summary.md** - Add significant findings with `[S###](url)` citations
```

**Impact:** The agent must decide what constitutes "key" or "significant." This subjective judgment can lead to:
- Important but subtle findings being omitted
- Consistency issues between different agent invocations
- Loss of nuance that becomes important later

**Fix Required:**
- Define explicit criteria: "A finding is KEY if: (a) it answers a framework question, (b) it contradicts existing information, (c) it has evidentiary support, OR (d) it would change a reader's understanding"
- Or: Require ALL findings go to summary.md, with a separate "priority" annotation

---

### 4. Lead Results to Question File Sync Is Unstructured

**Location:** `/follow` (line 163)

**Evidence:**
```markdown
7. **Update the framework document** - Add findings to `questions/*.md`
```

No specification of:
- WHERE in the question file to add findings
- WHAT format to use
- HOW to connect findings back to original questions

**Impact:** This instruction is likely inconsistently followed or skipped entirely because there's no clear structure for it.

**Fix Required:**
- Define a `## Findings from Leads` section in the question file template
- Specify format: `### L### Result\n[Finding with [S###] citation]`

---

### 5. Novel Questions Have No Lead Tracking

**Location:** `/question` (lines 55, 71-81)

**Evidence:**
```markdown
3. **Add novel questions** that the case suggests but frameworks don't cover
...
## Novel Question Examples
If investigating a pharmaceutical topic, you might add:
- "What do the clinical trial protocols actually specify vs what was reported?"
```

Novel questions are added to question files but:
- They don't become leads in `leads.json`
- They have no status tracking (pending/investigated)
- The `/curiosity` check asks about "leads mentioned in question files" but this is unstructured

**Impact:** Novel questions represent case-specific insights that may never be investigated.

**Fix Required:**
- Novel questions should generate corresponding leads in `leads.json`
- Or: Add a `## Novel Questions` tracked section in question files with explicit status

---

### 6. Curiosity Check for Missing Leads Is Error-Prone

**Location:** `/curiosity` (lines 96, 134, 155)

**Evidence:**
```markdown
4. Are there leads mentioned in question files but not in leads.json?
...
- Leads mentioned in question files but not in leads.json
```

This requires the LLM to:
1. Read all 35 question files
2. Identify text that looks like a lead
3. Cross-reference against leads.json

**Impact:** This is a fragile pattern because:
- "Leads" in question files have no standard format
- Easy to miss embedded lead-like statements
- No structured extraction possible

**Fix Required:**
- Define a `<!-- LEAD: ... -->` or `[LEAD: ...]` markup for leads in question files
- Or: Require all leads go to leads.json immediately, no embedding in prose

---

### 7. No Verification That All Lead Results Made It to Article

**Location:** `/verify` gates (verify.md:14-21)

**Evidence:**
```markdown
| # | Gate | Pass Criteria |
|---|------|---------------|
| 1 | Questions | All `questions/*.md` have Status: investigated |
| 2 | Curiosity | `/curiosity` returns SATISFIED |
| 3 | Article | `articles/full.md` + `full.pdf` exist with [S###] citations |
| 4 | Sources | All [S###] citations have evidence and support the claim |
| 5 | Integrity | `/integrity` returns READY |
| 6 | Legal | `/legal-review` returns READY |
```

**Analysis of each gate:**
- Gate 1: Checks STATUS (structural), not CONTENT
- Gate 2: Holistic LLM judgment, may miss specific omissions
- Gate 3: Checks EXISTENCE of article and citations
- Gate 4: Verifies cited sources support claims - but doesn't check for UNCITED findings
- Gate 5: Flags issues IN the article, doesn't flag missing content
- Gate 6: Flags legal issues IN the article, doesn't flag missing content

**Impact:** An article could omit important findings and still pass all 6 gates.

**Fix Required:**
- Add Gate 4b: "Article Coverage Check" - verify that each HIGH-confidence finding from questions/*.md and each investigated lead result appears in the article (or is explicitly noted as out-of-scope)

---

### 8. Confidence Levels Are Not Systematically Tracked

**Location:** `/question` (line 52), `/curiosity` (lines 94, 132, 154)

**Evidence:**
```markdown
# question.md
- Note confidence level (HIGH/MEDIUM/LOW)

# curiosity.md
2. Are there LOW/MEDIUM confidence answers that need more research?
...
- Any LOW confidence answers not acknowledged as known limitations
```

**Impact:**
- Confidence levels are noted in prose within question files
- No structured field to extract them programmatically
- The curiosity check relies on LLM to identify LOW confidence answers
- No automatic triggering of follow-up for LOW confidence findings

**Fix Required:**
- Add structured format: `**Confidence:** LOW` after each answer
- Script to extract all LOW/MEDIUM confidence answers automatically
- Require leads for all LOW confidence answers

---

### 9. Legal Review Doesn't Read Question Files

**Location:** `/legal-review` (lines 63-66)

**Evidence:**
```markdown
Now read the full case materials:
- `sources.json` — Source registry
- `evidence/S###/metadata.json` — Source details
- `evidence/S###/content.md` — Source content (as needed)
```

Compare to `/integrity` (lines 59-61):
```markdown
Now read full case materials:
- `questions/*.md` — For perspective coverage
- `sources.json` — Source registry
- `summary.md` — Investigation findings
```

**Impact:** Legal review cannot verify:
- That all perspectives from framework analysis are represented
- That steelmanned positions from question files appear in article
- Potential balance issues from missing stakeholder views

**Fix Required:**
- Add `questions/*.md` to legal-review Stage 2 reads
- Or: Add explicit "perspective coverage" check to legal review

---

### 10. Article Length Constraint Forces Untracked Compression

**Location:** `/article` (line 14-16)

**Evidence:**
```markdown
Create two articles from `summary.md`:
1. **Short** (400-800 words) - Quick overview
2. **Full** (2,000-4,000 words) - Publication-ready
```

**Analysis:**
- 35 frameworks × ~200 words minimum = ~7,000 words of analysis
- Full article target: 2,000-4,000 words
- Compression ratio: 50-70% of content MUST be omitted

**Impact:** No mechanism tracks:
- What was included vs excluded
- Why specific findings were prioritized
- Whether balance was maintained across frameworks

**Fix Required:**
- Generate an `article-coverage.md` alongside the article showing which findings from each question file were included
- Add a post-generation verification: "Check that each framework with HIGH-priority findings has at least one finding in the article"

---

## Data Flow Diagram with Loss Points

```
┌─────────────────────────────────────────────────────────────────────┐
│                         QUESTION PHASE                               │
│                                                                      │
│  frameworks.md ──► /question ──┬──► questions/*.md                   │
│                                │    (detailed analysis)              │
│                                │         │                           │
│                                │    [LOSS POINT 3]                   │
│                                │    "key findings" subjective        │
│                                │         ▼                           │
│                                └──► summary.md ◄─────────────────┐   │
│                                     (compressed)                 │   │
│                                         │                        │   │
│                                    [LOSS POINT 5]                │   │
│                                    novel questions not tracked   │   │
└─────────────────────────────────────────────────────────────────┘   │
                                          │                            │
┌─────────────────────────────────────────────────────────────────┐   │
│                          FOLLOW PHASE                            │   │
│                                                                  │   │
│  leads.json ──► /follow ──┬──► lead results                      │   │
│       ▲                   │         │                            │   │
│       │                   │    [LOSS POINT 4]                    │   │
│       │                   │    sync to questions unstructured    │   │
│       │                   │         │                            │   │
│       │                   │    [LOSS POINT 3]                    │   │
│       │                   │    "significant findings" subjective │   │
│       │                   │         ▼                            │   │
│       │                   └──► summary.md ───────────────────────┘   │
│       │                                                              │
│  [LOSS POINT 1]                                                      │
│  depth > 3 leads ──► future_research.md ──► NEVER READ               │
└──────────────────────────────────────────────────────────────────────┘
                                          │
┌──────────────────────────────────────────────────────────────────────┐
│                         CURIOSITY CHECK                               │
│                                                                       │
│  leads.json + questions/* + summary.md ──► /curiosity                 │
│                                                │                      │
│                                           [LOSS POINT 6]              │
│                                           leads in prose hard to find │
│                                                │                      │
│                                           [LOSS POINT 8]              │
│                                           confidence not structured   │
│                                                ▼                      │
│                                         SATISFIED/NOT                 │
└───────────────────────────────────────────────────────────────────────┘
                                          │
┌───────────────────────────────────────────────────────────────────────┐
│                          ARTICLE PHASE                                 │
│                                                                        │
│  summary.md (PRIMARY) ──► /article ──► articles/full.md                │
│  questions/* (context)        │            │                           │
│           │                   │       [LOSS POINT 10]                  │
│           │                   │       7000 words → 4000 words          │
│      [LOSS POINT 2]           │       untracked compression            │
│      secondary status         │                                        │
└───────────────────────────────────────────────────────────────────────┘
                                          │
┌───────────────────────────────────────────────────────────────────────┐
│                          VERIFY PHASE                                  │
│                                                                        │
│  Gate 1: questions status ──► structural only                          │
│  Gate 2: curiosity ──────────► holistic judgment                       │
│  Gate 3: article exists ─────► structural only                         │
│  Gate 4: sources verified ───► cited sources only                      │
│  Gate 5: integrity ──────────► article issues only                     │
│  Gate 6: legal ──────────────► article issues only                     │
│                                     │                                  │
│                               [LOSS POINT 7]                           │
│                               no gate checks content coverage          │
│                                                                        │
│  [LOSS POINT 9]                                                        │
│  legal-review doesn't read question files                              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Recommendations by Priority

### Critical (Must Fix)

1. **Add Gate 4b: Article Coverage Check**
   - Verify each HIGH-confidence finding appears in article
   - Verify each investigated lead result appears in article
   - Flag omissions for human review

2. **Make future_research.md Readable**
   - `/curiosity` should check for high-priority leads in future_research.md
   - `/article` should generate "Areas for Further Investigation" from it

3. **Define "Key/Significant Findings" Criteria**
   - Explicit definition in CLAUDE.md and command files
   - Or: Require ALL findings go to summary.md

### High (Should Fix)

4. **Structured Confidence Tracking**
   - Add `**Confidence:** HIGH|MEDIUM|LOW` field format
   - Script to extract and report all LOW confidence answers

5. **Structured Lead Format in Question Files**
   - Define `<!-- LEAD: ... -->` markup
   - Or: Require immediate leads.json entry

6. **Novel Questions Generate Leads**
   - Novel questions should create corresponding leads.json entries
   - Track status of novel question investigation

### Medium (Nice to Have)

7. **Article Coverage Report**
   - Generate `article-coverage.md` showing inclusion decisions
   - Track what was omitted and why

8. **Lead Results Sync Structure**
   - Define `## Findings from Leads` section in question files
   - Specify format for lead result additions

9. **Legal Review Reads Question Files**
   - Add questions/*.md to Stage 2 reads for perspective coverage

10. **Depth-Limited Lead Quality Assessment**
    - Before writing to future_research.md, assess if lead is HIGH priority
    - HIGH priority leads beyond depth limit should flag for human review

---

## Testing Recommendations

To verify these issues exist in practice, run an investigation and check:

1. After QUESTION phase: Count findings in questions/*.md vs summary.md
2. After FOLLOW phase: Check if lead results appear in corresponding question files
3. After ARTICLE phase: Check if future_research.md has substantive content that was never addressed
4. After VERIFY phase: Manually check if important findings from questions are missing from article

---

## Appendix: Evidence Files

All evidence gathered from these source files:
- `.claude/commands/article.md` (lines 14-24, 104)
- `.claude/commands/question.md` (lines 52, 55, 61, 63, 71-81)
- `.claude/commands/follow.md` (lines 163, 165, 170, 194-204)
- `.claude/commands/curiosity.md` (lines 94, 96, 132, 134, 154-155)
- `.claude/commands/verify.md` (lines 14-21, 35)
- `.claude/commands/legal-review.md` (lines 63-66)
- `.claude/commands/integrity.md` (lines 59-61)
- `scripts/init-case.js` (lines 222-227)
- `CLAUDE.md` (lines 66, 270)
