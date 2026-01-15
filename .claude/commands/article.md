# /article - Generate Publication Articles

Generate publication-ready articles from investigation findings.

## Usage

```
/article              # Generate for active case
/article [case-id]    # Generate for specific case
```

## Task

Create two articles from `summary.md`:
1. **Short** (400-800 words) - Quick overview
2. **Full** (2,000-4,000 words) - Publication-ready

## Instructions

1. **Read source material:**
   - `summary.md` (PRIMARY - contains all findings with [S###](url) citations)
   - `questions/*.md` (framework answers for context)

2. **Generate both articles:**
   - Write to `articles/short.md`
   - Write to `articles/full.md`
   - Include source key in full article
   - Include methodology note in full article

3. **Update state.json:** Set `gates.article: true`

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

## Next Step

After article generation, orchestrator invokes `/verify`.
