# /follow - Pursue Lead to Conclusion

Investigate a single lead to its conclusion.

## Usage

```
/follow <lead-id>
```

## Task

Take a lead from `leads.json` and investigate it until you either:
- Find the answer (with sources)
- Hit a dead end (documented why)
- Generate new leads that need separate investigation

## Instructions

1. **Read the lead** from `leads.json`:
   ```json
   {
     "id": "L007",
     "lead": "Investigate UEP certification funding sources",
     "from": "01-follow-the-money",
     "priority": "HIGH",
     "status": "pending"
   }
   ```

2. **Research the specific question**

   Use MCP tools to find the answer:
   - `mcp__mcp-xai__web_search` for web searches
   - `mcp__mcp-xai__research` for multi-source research
   - `mcp__mcp-gemini__generate_text` for analysis

3. **Capture all sources**

   Use `/capture-source <url>` for every source before citing.

4. **Update the lead status**

   In `leads.json`:
   ```json
   {
     "id": "L007",
     "lead": "Investigate UEP certification funding sources",
     "from": "01-follow-the-money",
     "priority": "HIGH",
     "status": "investigated",
     "result": "Found: UEP funded primarily by egg producer fees. See S045, S046.",
     "sources": ["S045", "S046"]
   }
   ```

   Or if dead end:
   ```json
   {
     "status": "dead_end",
     "result": "No public financial disclosures available for UEP"
   }
   ```

5. **Update the framework document**

   Add findings to the relevant `questions/NN-*.md` file.

6. **Update summary.md**

   Add significant findings with citations.

7. **Generate new leads if discovered**

   If investigation reveals new questions, add to `leads.json` with status `pending`.

## Lead Statuses

- `pending` - Not yet investigated
- `investigated` - Completed with result
- `dead_end` - Pursued but no useful info found

## Output

- Updated `leads.json` with result
- Sources captured to `evidence/S###/`
- Updated `questions/*.md` with findings
- Updated `summary.md` with key points
- New leads in `leads.json` if discovered

## Next Step

After all leads investigated, orchestrator invokes `/curiosity` to evaluate completeness.
