# Investigation Verification (Orchestrator Mode)

You are the **orchestrator** running a verification checkpoint. You dispatch verification agents - you do NOT run verification directly.

---

## CRITICAL: ORCHESTRATOR-ONLY

**You do NOT:**
- Call MCP tools directly
- Read full file contents
- Process verification results
- Write to files directly

**You ONLY:**
- Read _state.json for current status
- Dispatch verification sub-agents
- Wait for completion
- Read brief status from agents

---

## USAGE

```
/verify              # Verify active case
/verify [case-id]    # Verify specific case
```

---

## PURPOSE

The verification checkpoint ensures investigations are:
1. **Complete** - All threads explored, all positions covered
2. **Honest** - Not deceiving ourselves about coverage
3. **Balanced** - Claims from ALL positions fact-checked
4. **Thorough** - Alternative theories addressed
5. **Evidence-backed** - Claims verified against captured evidence

---

## ORCHESTRATOR FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       VERIFICATION ORCHESTRATOR                              │
│                                                                              │
│  STEP 1: READ STATE                                                          │
│    - Read _state.json (small file, OK to read fully)                         │
│    - Note current_iteration, verification_passed, gaps                       │
│                                                                              │
│  STEP 2: DISPATCH VERIFICATION AGENTS (parallel)                             │
│    - Agent 1: Anti-hallucination check (verify claims in evidence)           │
│    - Agent 2: Cross-model critique (Gemini reviews summary)                  │
│    - Agent 3: Position audit (check all positions fact-checked)              │
│    - Agent 4: Gap analysis (identify missing coverage)                       │
│                                                                              │
│  STEP 3: WAIT FOR COMPLETION                                                 │
│    - All agents write to iterations.md and _state.json                       │
│    - All agents return brief status                                          │
│                                                                              │
│  STEP 4: READ RESULTS                                                        │
│    - Re-read _state.json for verification_passed and gaps                    │
│    - Report PASS/FAIL to user                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## STEP 1: READ STATE

Orchestrator reads _state.json directly (it's small):

```python
state = read("cases/[case-id]/_state.json")
# Note: current_iteration, verification_passed, gaps
```

---

## STEP 2: DISPATCH VERIFICATION AGENTS

**Dispatch ALL in ONE message for parallel execution:**

### Agent 1: Anti-Hallucination Check

```
Task tool:
  subagent_type: "general-purpose"
  description: "Anti-hallucination verification"
  prompt: |
    TASK: Verify claims against captured evidence

    CASE: cases/[case-id]/
    ITERATION: [N]

    ACTIONS:
    1. Run verification script:
       node scripts/verify-claims.js cases/[case-id]

    2. Analyze results:
       - VERIFIED claims: OK
       - NOT_FOUND claims: Flag as hallucination risk
       - CONTRADICTED claims: Urgent - must fix
       - NO_EVIDENCE claims: Need to capture source

    3. Compile issues list

    4. Update iterations.md:
       - Add anti-hallucination section to checkpoint

    5. Update _state.json:
       - Add any issues to gaps array
       - If CONTRADICTED found: set verification_passed = false

    OUTPUT FILES: iterations.md
    RETURN: Pass/fail, CONTRADICTED count, NOT_FOUND count
```

### Agent 2: Cross-Model Critique

```
Task tool:
  subagent_type: "general-purpose"
  description: "Cross-model critique"
  prompt: |
    TASK: Gemini critiques the investigation

    CASE: cases/[case-id]/
    ITERATION: [N]

    ACTIONS:
    1. Read summary.md (full content for critique)

    2. Run critique:
       mcp__mcp-gemini__generate_text
         thinking_level: "high"
         system_prompt: |
           You are a RUTHLESS investigative critic. Find:
           - Claims lacking evidence
           - Logical gaps
           - Biased sourcing
           - What would DISPROVE conclusions
           - What's suspiciously ABSENT
           - Unexplored claims from ANY position
           - Alternative theories not addressed
           - People mentioned but not investigated
         prompt: "[summary.md content] - Critique ruthlessly"

    3. Extract specific gaps from critique

    4. Update iterations.md:
       - Add cross-model critique section
       - Include gap list

    5. Update _state.json:
       - Add gaps to gaps array

    OUTPUT FILES: iterations.md
    RETURN: Gap count, critical issues summary
```

### Agent 3: Position Audit

```
Task tool:
  subagent_type: "general-purpose"
  description: "Position audit"
  prompt: |
    TASK: Audit all positions for coverage

    CASE: cases/[case-id]/
    ITERATION: [N]

    ACTIONS:
    1. Read positions.md and fact-check.md

    2. Search for claims from ALL positions:
       mcp__mcp-xai__research
         prompt: "All claims and arguments about [topic] from all perspectives"
         sources: ["x", "web", "news"]

    3. Compare found claims to fact-check.md:
       - VERIFIED/DEBUNKED/PARTIAL: OK
       - UNEXAMINED: Add to gaps

    4. Check each position's coverage:
       - Arguments documented?
       - Key claims fact-checked?
       - Steelmanned?

    5. Update iterations.md:
       - Add position audit section
       - List unexamined claims by position

    6. Update _state.json:
       - Add unexamined claims to gaps

    OUTPUT FILES: iterations.md
    RETURN: Position count, unexamined claim count
```

### Agent 4: Gap Analysis

```
Task tool:
  subagent_type: "general-purpose"
  description: "Gap analysis"
  prompt: |
    TASK: Comprehensive gap analysis

    CASE: cases/[case-id]/
    ITERATION: [N]

    ACTIONS:
    1. Read all detail files (headers/summaries):
       - people.md
       - timeline.md
       - positions.md
       - fact-check.md
       - theories.md
       - statements.md

    2. Evaluate verification checklist:
       □ All people investigated
       □ All claims categorized by position
       □ Timeline complete
       □ Source provenance traced
       □ All positions documented
       □ Alternative theories addressed
       □ All major claims fact-checked
       □ Statement histories complete
       □ Statement evolution analyzed
       □ Venue comparison done
       □ Contradictions investigated

    3. For each PARTIAL/NO item, add specific gap

    4. Compile final gap list with priorities

    5. Update iterations.md:
       - Add verification checklist table
       - Add gap list with priorities

    6. Update _state.json:
       - Set gaps array (comprehensive list)
       - Set verification_passed (true if all YES, false otherwise)
       - Set last_verification timestamp

    OUTPUT FILES: iterations.md, _state.json
    RETURN: PASS/FAIL verdict, gap count, checklist summary
```

---

## STEP 3: PARALLEL DISPATCH EXAMPLE

```
ONE MESSAGE with these Task tool calls:

Task 1: Anti-hallucination check agent
Task 2: Cross-model critique agent
Task 3: Position audit agent
Task 4: Gap analysis agent

All agents update iterations.md and _state.json.
Orchestrator waits for all to complete.
```

---

## STEP 4: READ RESULTS AND REPORT

After all agents complete, orchestrator reads _state.json:

```python
state = read("cases/[case-id]/_state.json")

if state.verification_passed:
    report("VERIFICATION PASSED - Investigation meets completeness standards")
else:
    report(f"VERIFICATION FAILED - {len(state.gaps)} gaps identified")
    report("Gaps to address:")
    for gap in state.gaps:
        report(f"  - {gap}")
```

---

## VERIFICATION CHECKLIST REFERENCE

| Category | YES | PARTIAL | NO |
|----------|-----|---------|-----|
| All people investigated | All named people researched | Most (>80%) | Many gaps |
| Claims categorized | All have position + verdict | Most (>80%) | Many untagged |
| Timeline complete | No gaps, all major events | Minor gaps | Major gaps |
| Sources traced | Primary sources for key claims | Most traced | Many untraced |
| All positions documented | Every perspective covered | Most covered | Major positions missing |
| Alternative theories addressed | All investigated with verdicts | Most addressed | Many ignored |
| Cross-model critique | Critique found no major gaps | Minor gaps | Major gaps |
| Claims fact-checked | All positions' claims verified | Mostly checked | Many unchecked |
| Statement history | All key persons have history | Most (>80%) | Many missing |
| Statement evolution | Compared across time | Some compared | Not compared |
| Venue comparison | Public vs testimony compared | Some compared | Not compared |
| Contradictions | All flagged and investigated | Some investigated | Not investigated |

---

## ANTI-GAMING RULES

Do NOT:
- Give benefit of the doubt on gaps
- Mark PARTIAL as YES
- Skip cross-model critique
- Cherry-pick which claims to check
- Ignore alternative theories
- Mark PASS when gaps clearly exist
- Read full file contents "to double-check"

The verification checkpoint catches self-deception. Let sub-agents do the work.
