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

## Instructions

1. **Read the lead** from `leads.json`

2. **Research the specific question** using MCP tools

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

## Output

- Updated `leads.json` with result
- Sources captured to `evidence/S###/`
- Updated `questions/*.md` with findings
- Updated `summary.md` with key points

## Next Step

After all leads investigated, orchestrator invokes `/curiosity`.
