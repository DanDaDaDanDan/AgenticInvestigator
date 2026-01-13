# /follow - Pursue Lead to Conclusion

Investigate a single lead to its conclusion.

## Usage

```
/follow <lead-id>
```

## Task

Take a lead from `leads.json` and investigate until you either:
- Find the answer (with sources)
- Hit a dead end (documented why)
- Generate new leads needing separate investigation

## MCP Tools

Leads often involve current events or live information. Consider **real-time search** (see `reference/tooling.md`):

- `mcp__mcp-xai__web_search` - Current news, recent articles, live web
- `mcp__mcp-xai__x_search` - Social discourse, public statements, breaking news
- `mcp__mcp-xai__research` - Broad real-time research

**When to use real-time vs deep research:**
- Real-time: Recent events, current status, what people are saying now
- Deep research: Historical context, academic sources, comprehensive understanding

For leads requiring complex judgment, consider **extended thinking**:
- `mcp__mcp-openai__generate_text` for weighing conflicting evidence

## Instructions

1. **Read the lead** from `leads.json`

2. **Choose appropriate search approach:**
   - Real-time for current/recent information
   - Deep research for comprehensive understanding
   - Both if the lead spans past and present

3. **Capture all sources** before citing

4. **Update the lead status** in `leads.json`:
   - `investigated` with result and sources
   - `dead_end` with explanation

5. **Update the framework document** - Add findings to relevant `questions/*.md`

6. **Update summary.md** - Add significant findings with citations

7. **Generate new leads** if discovered

## Lead Statuses

- `pending` - Not yet investigated
- `investigated` - Completed with result
- `dead_end` - Pursued but no useful info found

## Dead End Criteria

A lead is a genuine dead end if:
- Information doesn't exist or isn't public
- Multiple search approaches found nothing
- Sources contradict each other without resolution

A lead is NOT a dead end if:
- You just haven't searched enough
- The information is hard to find but probably exists
- You found partial information that could be expanded

## Output

- Updated `leads.json` with result
- Sources captured to `evidence/S###/`
- Updated `questions/*.md` with findings
- Updated `summary.md` with key points

## Next Step

After all leads investigated, orchestrator invokes `/curiosity`.
