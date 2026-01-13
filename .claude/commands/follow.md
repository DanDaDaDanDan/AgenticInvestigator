# /follow - Pursue Lead to Conclusion

Investigate a single lead to its conclusion.

## Usage

```
/follow <lead-id>
```

## Task

Take a lead from `leads.json` and investigate until you either:
- Find the answer (with captured sources)
- Hit a dead end (documented why)
- Generate new leads needing separate investigation

## MCP Tools

Leads often involve current events or live information:

- `mcp__mcp-xai__web_search` - Current news, recent articles, live web
- `mcp__mcp-xai__x_search` - Social discourse, public statements, breaking news
- `mcp__mcp-xai__research` - Broad real-time research

**When to use real-time vs deep research:**
- Real-time: Recent events, current status, what people are saying now
- Deep research: Historical context, academic sources, comprehensive understanding

For leads requiring complex judgment:
- `mcp__mcp-openai__generate_text` for weighing conflicting evidence

## Critical: Source Capture

### 1. Extract URLs from search results

MCP tools return results with citation URLs. Look for:
- Markdown links in the response
- "Sources:" sections
- Specific article/document URLs

### 2. Capture before citing

For each URL you want to cite:

```bash
node scripts/capture.js S### <url> cases/<case-id>

# Verify
ls evidence/S###/  # Must see metadata.json AND content.md
```

### 3. Never synthesize

**DO NOT** create sources like:
- "Research compilation from..."
- "Summary of academic literature"
- Sources pointing to homepages instead of specific articles

Each source = one specific URL that was actually fetched.

## Instructions

1. **Read the lead** from `leads.json`

2. **Search** using appropriate MCP tools

3. **Extract URLs** from search results

4. **Capture each URL** with `/capture-source`
   - Verify metadata.json exists
   - For PDFs: use `--document` mode

5. **Update the lead status** in `leads.json`:
   - `investigated` with result and source IDs
   - `dead_end` with explanation

6. **Update the framework document** - Add findings to `questions/*.md`

7. **Update summary.md** - Add significant findings with [S###] citations

8. **Generate new leads** if discovered

## PDF Sources

For PDF documents (court filings, government reports):

```bash
node scripts/capture.js --document S### https://example.gov/file.pdf cases/<case-id>
```

If capture fails:
- Note the URL exists
- Do NOT synthesize the content
- Mark lead as partially investigated

## Lead Statuses

- `pending` - Not yet investigated
- `investigated` - Completed with result
- `dead_end` - Pursued but no useful info found

## Dead End Criteria

A lead is a genuine dead end if:
- Information doesn't exist or isn't public
- Multiple search approaches found nothing
- Capture failed and no alternatives exist

A lead is NOT a dead end if:
- You just haven't searched enough
- The information is hard to find but probably exists
- You found partial information that could be expanded

## Output

- Updated `leads.json` with result
- Sources captured to `evidence/S###/` (each with metadata.json)
- Updated `questions/*.md` with findings
- Updated `summary.md` with key points

## Next Step

After leads are investigated, orchestrator invokes `/curiosity`.
