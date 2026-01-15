# /article - Generate Publication Articles

Generate publication-ready articles from investigation findings.

## Usage

```
/article              # Generate for active case
/article [case-id]    # Generate for specific case
```

## IMPORTANT: Sub-Agent Execution

This command reads summary + 35 question files (~166KB). To avoid polluting the main orchestrator context:

**The `/action` router MUST invoke article via a Task sub-agent.**

The sub-agent reads files, writes articles to `articles/`, returns only completion status.

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
- ALWAYS preserve [S###] citations inline
- Present contested claims as contested
- Neutral, professional tone
- All perspectives balanced

## Next Step

After article generation, orchestrator invokes `/verify`.
