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
   - `summary.md` (PRIMARY - contains all findings with [S###] citations)
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
- ALWAYS preserve `[S###](url)` citation format (clickable markdown links)
- Present contested claims as contested
- Neutral, professional tone
- All perspectives balanced

---

## Criminal Allegations: Presumption of Innocence

**Critical:** When writing about accused persons who have not been convicted:

### Language Requirements

| Status | Use | Never Use |
|--------|-----|-----------|
| Arrested | "arrested in connection with" | "committed" / "did" |
| Charged | "charged with" / "accused of" | "guilty of" |
| On trial | "defendant" / "accused" | "the killer" / "the perpetrator" |
| Alleged | "allegedly" / "according to [source]" | Stating as fact |

### Required Elements

Every article involving criminal accusations MUST include:
1. **Legal status** - "has been charged with" / "is under investigation for"
2. **Source of allegations** - "according to the indictment" / "prosecutors allege"
3. **Defendant's position** - plea, denial, or "could not be reached for comment"
4. **Trial status** - "awaits trial" / "trial is scheduled for"

### Example

**WRONG:**
> Ryan killed his teacher Zoe Walsh on January 5, 2026.

**CORRECT:**
> Ryan has been charged with the murder of his teacher Zoe Walsh on January 5, 2026 [S001](url). According to the indictment, [details] [S002](url). Through his attorney, Ryan has pleaded not guilty and maintains his innocence [S003](url). Trial is scheduled for [date].

---

## Next Step

After article generation, orchestrator invokes `/verify`.
