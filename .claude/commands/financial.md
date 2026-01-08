# Financial Investigation Toolkit (Orchestrator Mode)

You are the **orchestrator**. You dispatch financial research agents — you do NOT run research directly.

**See `rules.md` for source attribution and evidence capture rules.**

---

## Usage

```
/financial [entity]           # Investigate person, company, or topic
/financial [case-id]          # Financial analysis for existing case
/financial [case-id] [entity] # Add financial focus to existing case
```

---

## Orchestrator Flow

```
1. DETERMINE: New investigation or existing case?
2. DISPATCH: Financial research agents (parallel)
3. WAIT: Agents write to research-leads/financial-*
4. DISPATCH: Synthesis agent to compile findings
5. REPORT: Red flag count, key findings
```

---

## Dispatch Agents (parallel, ONE message)

```
Task 1: Corporate structure (ownership, subsidiaries, directors)
Task 2: SEC/regulatory filings (10-K, 10-Q, proxy, enforcement)
Task 3: Offshore/shell company search (ICIJ leaks, OpenSanctions)
Task 4: Political money (FEC, lobbying, government contracts)
Task 5: Litigation & enforcement (lawsuits, SEC actions, bankruptcies)
Task 6: Real-time financial news
```

### Agent Prompt Template

```
Task tool:
  subagent_type: "general-purpose"
  description: "[Research type] for [entity]"
  prompt: |
    TASK: [Research type] research
    ENTITY: [entity name]
    CASE: cases/[case-id]/

    Run appropriate MCP tools (Gemini deep research, XAI search).

    Save to research-leads/financial-[entity]-[type].md

    RETURN: Brief status (counts, red flags)
```

---

## Red Flag Reference

| Category | Red Flag | Indicates |
|----------|----------|-----------|
| Structure | Multiple holding layers | Tax avoidance, liability shielding |
| Structure | Secrecy jurisdictions | Hidden ownership |
| Structure | Nominee directors | True control obscured |
| Transaction | Round-trip transactions | Money laundering |
| Transaction | Related-party loans | Self-dealing |
| Disclosure | Auditor resignation | Accounting problems |
| Disclosure | Restatements | Material misstatements |
| Behavioral | Insider selling before news | Insider trading |

---

## Data Sources

| Category | Sources |
|----------|---------|
| Corporate | SEC EDGAR, OpenCorporates, State SOS, GLEIF |
| Beneficial Ownership | ICIJ Offshore Leaks, OpenSanctions, OCCRP Aleph |
| Financial | FEC, OpenSecrets, IRS 990s, USAspending.gov |
| Court/Legal | PACER/RECAP, SEC Litigation, State courts |

---

## Synthesis Agent

After research agents complete:

```
Task tool:
  subagent_type: "general-purpose"
  description: "Synthesize financial investigation"
  prompt: |
    TASK: Compile financial investigation
    ENTITY: [entity name]
    CASE: cases/[case-id]/

    Read all research-leads/financial-[entity]-*.md

    Write financial-[entity].md with:
    - Executive summary
    - Corporate structure
    - Key individuals
    - Money flow analysis
    - Red flags (HIGH/MEDIUM/LOW)
    - Regulatory/legal history
    - Recommended follow-up

    Register sources in sources.md.

    RETURN: Red flag count, source count, key findings
```
