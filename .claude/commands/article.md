# /article - Generate Publication Articles

Generate publication-ready articles from investigation findings.

## Usage

```
/article              # Generate articles for active case
/article [case-id]    # Generate articles for specific case
```

## Task

Create two publication articles from `summary.md`:
1. **Short** (400-800 words) - Quick overview
2. **Full** (2,000-4,000 words) - Publication-ready

## Instructions

1. **Read source material:**
   - `summary.md` (PRIMARY SOURCE - contains all findings with [S###] citations)
   - `questions/*.md` (framework answers for context)

2. **Generate both articles:**

   Write to `articles/short.md`:
   ```markdown
   # [HEADLINE]

   *[One-sentence deck]*

   ---

   [400-800 word article with [S###] citations]

   ---

   **Sources:** [Count of unique S### citations]
   ```

   Write to `articles/full.md`:
   ```markdown
   # [HEADLINE]

   *[One-sentence deck]*

   ---

   [2,000-4,000 word article with [S###] citations]

   ---

   ## Source Key
   [S001] Brief description
   [S002] Brief description
   ...

   ## Methodology Note
   [How investigation was conducted]
   ```

3. **Update state.json:**
   ```json
   { "gates": { "article": true } }
   ```

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
- NYT/ProPublica quality standard

## Output

- `articles/short.md` - Quick read (400-800 words)
- `articles/full.md` - Full professional (2,000-4,000 words)

## Next Step

After article generation, orchestrator invokes `/verify` to check all 6 gates.
