# Financial Investigation Toolkit (Orchestrator Mode)

You are the **orchestrator** running a financial investigation. You dispatch financial research agents - you do NOT run research directly.

---

## CRITICAL: ORCHESTRATOR-ONLY

**You do NOT:**
- Call MCP tools directly
- Read full research results
- Process financial data
- Write analysis directly

**You ONLY:**
- Read _state.json for current status
- Dispatch financial research agents (parallel)
- Wait for completion
- Read brief status from agents

---

## USAGE

```
/financial [entity]           # Investigate a person, company, or topic
/financial [case-id]          # Financial analysis for existing case
/financial [case-id] [entity] # Add financial focus to existing case
```

---

## FINANCIAL INVESTIGATION FRAMEWORKS

### 1. Corporate Structure Mapping
Trace who owns what, and who controls what.

### 2. Transaction Pattern Analysis
Identify suspicious financial patterns (round-trips, structuring, etc.).

### 3. Beneficial Ownership Tracing
Find who really controls and benefits from an entity.

### 4. Money Flow Mapping
Trace where money comes from and where it goes.

---

## ORCHESTRATOR FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FINANCIAL INVESTIGATION ORCHESTRATOR                     │
│                                                                              │
│  STEP 1: DETERMINE CONTEXT                                                   │
│    - New investigation or existing case?                                     │
│    - What entity to investigate?                                             │
│                                                                              │
│  STEP 2: DISPATCH FINANCIAL AGENTS (parallel, ONE message)                   │
│    - Agent 1: Corporate structure research                                   │
│    - Agent 2: SEC/regulatory filings research                                │
│    - Agent 3: Offshore/shell company search                                  │
│    - Agent 4: Political money research                                       │
│    - Agent 5: Litigation & enforcement research                              │
│    - Agent 6: Real-time financial news                                       │
│                                                                              │
│  STEP 3: WAIT FOR COMPLETION                                                 │
│    - All agents write to financial-[entity].md                               │
│    - All agents return brief status                                          │
│                                                                              │
│  STEP 4: DISPATCH SYNTHESIS AGENT                                            │
│    - Compile findings into final report                                      │
│    - Identify red flags                                                      │
│    - Register sources                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## FINANCIAL RESEARCH AGENTS

**Dispatch ALL in ONE message for parallel execution:**

### Agent 1: Corporate Structure

```
Task tool:
  subagent_type: "general-purpose"
  description: "Corporate structure research for [entity]"
  prompt: |
    TASK: Research corporate structure

    ENTITY: [entity name]
    CASE: cases/[case-id]/

    ACTIONS:
    1. Run deep research:
       mcp__mcp-gemini__deep_research
         query: "[entity] corporate structure ownership subsidiaries directors officers"
         timeout_minutes: 60

    2. Extract:
       - Parent company and ultimate owner
       - All subsidiaries and affiliates
       - Directors, officers, board members
       - Ownership percentages
       - Jurisdictions of incorporation
       - Corporate history (mergers, acquisitions)

    3. Write findings to:
       research-leads/financial-[entity]-corporate.md

    OUTPUT FILE: research-leads/financial-[entity]-corporate.md
    RETURN: Brief status - entity count, jurisdiction count, key names
```

### Agent 2: SEC/Regulatory Filings

```
Task tool:
  subagent_type: "general-purpose"
  description: "SEC/regulatory research for [entity]"
  prompt: |
    TASK: Research SEC and regulatory filings

    ENTITY: [entity name]
    CASE: cases/[case-id]/

    ACTIONS:
    1. Run deep research:
       mcp__mcp-openai__deep_research
         query: "[entity] SEC filings 10-K 10-Q proxy statement enforcement actions regulatory"
         timeout_minutes: 60

    2. Extract:
       - 10-K, 10-Q, 8-K findings
       - Proxy statements (executive comp, related party)
       - Insider trading (Form 4)
       - SEC enforcement actions
       - Other regulatory actions

    3. Write findings to:
       research-leads/financial-[entity]-regulatory.md

    OUTPUT FILE: research-leads/financial-[entity]-regulatory.md
    RETURN: Brief status - filing count, enforcement count, red flags
```

### Agent 3: Offshore/Shell Company Search

```
Task tool:
  subagent_type: "general-purpose"
  description: "Offshore/shell company search for [entity]"
  prompt: |
    TASK: Search for offshore and shell company connections

    ENTITY: [entity name]
    CASE: cases/[case-id]/

    ACTIONS:
    1. Run search:
       mcp__mcp-xai__research
         prompt: "[entity] Panama Papers Paradise Papers Pandora Papers offshore shell company"
         sources: ["web", "news"]

    2. Extract:
       - ICIJ leak database appearances
       - Shell company connections
       - Secrecy jurisdiction registrations
       - Nominee directors/shareholders

    3. Write findings to:
       research-leads/financial-[entity]-offshore.md

    OUTPUT FILE: research-leads/financial-[entity]-offshore.md
    RETURN: Brief status - leak appearances, shell company count
```

### Agent 4: Political Money

```
Task tool:
  subagent_type: "general-purpose"
  description: "Political money research for [entity]"
  prompt: |
    TASK: Research political money connections

    ENTITY: [entity name]
    CASE: cases/[case-id]/

    ACTIONS:
    1. Run search:
       mcp__mcp-xai__research
         prompt: "[entity] campaign contributions PAC lobbying government contracts political donations"
         sources: ["web", "news"]

    2. Extract:
       - Campaign contributions (FEC, state)
       - PAC donations
       - Lobbying expenditures
       - Government contracts received
       - Political connections

    3. Write findings to:
       research-leads/financial-[entity]-political.md

    OUTPUT FILE: research-leads/financial-[entity]-political.md
    RETURN: Brief status - contribution total, lobbying total, contract count
```

### Agent 5: Litigation & Enforcement

```
Task tool:
  subagent_type: "general-purpose"
  description: "Litigation research for [entity]"
  prompt: |
    TASK: Research litigation and enforcement history

    ENTITY: [entity name]
    CASE: cases/[case-id]/

    ACTIONS:
    1. Run deep research:
       mcp__mcp-gemini__deep_research
         query: "[entity] lawsuit litigation SEC enforcement bankruptcy judgment whistleblower"
         timeout_minutes: 60

    2. Extract:
       - Civil lawsuits (plaintiff and defendant)
       - Criminal cases
       - Regulatory enforcement
       - Bankruptcies
       - Judgments and liens
       - Whistleblower complaints

    3. Write findings to:
       research-leads/financial-[entity]-litigation.md

    OUTPUT FILE: research-leads/financial-[entity]-litigation.md
    RETURN: Brief status - lawsuit count, enforcement count, key cases
```

### Agent 6: Real-Time Financial News

```
Task tool:
  subagent_type: "general-purpose"
  description: "Financial news search for [entity]"
  prompt: |
    TASK: Search real-time financial news

    ENTITY: [entity name]
    CASE: cases/[case-id]/

    ACTIONS:
    1. Run news search:
       mcp__mcp-xai__news_search
         query: "[entity] financial fraud investigation SEC accounting"
         prompt: "Find recent financial news, investigations, concerns"

    2. Extract:
       - Recent investigations
       - Financial irregularities
       - Executive departures
       - Accounting issues
       - Analyst concerns

    3. Write findings to:
       research-leads/financial-[entity]-news.md

    OUTPUT FILE: research-leads/financial-[entity]-news.md
    RETURN: Brief status - article count, investigation mentions
```

---

## SYNTHESIS AGENT

After all research agents complete:

```
Task tool:
  subagent_type: "general-purpose"
  description: "Synthesize financial investigation"
  prompt: |
    TASK: Synthesize financial investigation findings

    ENTITY: [entity name]
    CASE: cases/[case-id]/

    ACTIONS:
    1. Read all research-leads/financial-[entity]-*.md files

    2. Compile financial analysis report:
       - Executive summary
       - Corporate structure diagram
       - Key individuals table
       - Money flow analysis
       - Red flags identified (HIGH/MEDIUM/LOW)
       - Regulatory & legal history
       - Political connections
       - Offshore connections
       - Recommended follow-up

    3. Apply RED FLAG CHECKLIST:
       Corporate Structure:
       □ Multiple layers of holding companies
       □ Secrecy jurisdiction incorporation
       □ Nominee directors
       □ Complex cross-ownership

       Transactions:
       □ Related-party transactions
       □ Unusual consulting fees
       □ Loans to related parties
       □ Circular transactions

       Disclosures:
       □ Auditor changes
       □ Restatements
       □ Late filings
       □ Material weaknesses

       Behavioral:
       □ Insider selling
       □ Executive departures
       □ Aggressive accounting

    4. Write final report to:
       cases/[case-id]/financial-[entity].md

    5. Register new sources in sources.md

    6. Update _state.json if applicable

    OUTPUT FILE: cases/[case-id]/financial-[entity].md
    RETURN: Red flag count, source count, key findings summary
```

---

## PARALLEL DISPATCH EXAMPLE

```
ONE MESSAGE with these Task tool calls:

Task 1: Corporate structure agent
Task 2: SEC/regulatory agent
Task 3: Offshore/shell company agent
Task 4: Political money agent
Task 5: Litigation agent
Task 6: Financial news agent

All agents write to research-leads/.
Orchestrator waits for all to complete.
Then dispatch synthesis agent.
```

---

## RED FLAG REFERENCE

| Category | Red Flag | What It Might Indicate |
|----------|----------|------------------------|
| Structure | Multiple holding layers | Tax avoidance, liability shielding |
| Structure | Secrecy jurisdictions | Hidden ownership |
| Structure | Nominee directors | True control obscured |
| Transaction | Round-trip transactions | Money laundering |
| Transaction | Just-under-threshold | Structuring |
| Transaction | Related-party loans | Self-dealing |
| Disclosure | Auditor resignation | Accounting problems |
| Disclosure | Restatements | Material misstatements |
| Behavioral | CFO departure | Accounting issues |
| Behavioral | Insider selling before news | Insider trading |

---

## DATA SOURCES REFERENCE

| Category | Sources |
|----------|---------|
| Corporate | SEC EDGAR, OpenCorporates, State SOS, GLEIF |
| Beneficial Ownership | ICIJ Offshore Leaks, OpenOwnership, OpenSanctions |
| Financial | FEC, OpenSecrets, IRS 990s, USAspending.gov |
| Court/Legal | PACER/RECAP, SEC Litigation, State courts |
| Property | County recorders, FAA Registry, UCC filings |

---

## THE MONEY INVESTIGATOR'S MINDSET

1. "Where did it come from?" - Always trace source of funds
2. "Where did it go?" - Follow every dollar to destination
3. "Who benefits?" - Identify the ultimate beneficiary
4. "Why this structure?" - Complexity usually serves a purpose
5. "What's missing?" - Gaps in records are often deliberate
6. "Who really controls?" - Nominal vs. actual ownership
7. "What's the pattern?" - One transaction is incident; patterns are evidence
8. "Why this jurisdiction?" - Location choices are strategic
9. "What changed?" - Watch for restructuring before/after events
10. "Who else knows?" - Auditors, lawyers, bankers are witnesses

---

## REMEMBER

> "Money leaves a trail. Your job is to find it."

Every transaction has a source, a path, and a destination. Sub-agents trace all three.
