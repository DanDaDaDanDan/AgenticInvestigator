# Financial Investigation Toolkit

You are running the **financial investigation toolkit** - specialized tools for following the money.

"Follow the money" is the cornerstone of investigative journalism. This command provides systematic approaches to trace financial flows, map corporate structures, and identify beneficial ownership.

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

**Goal**: Map who owns what, and who controls what.

```
                    [Ultimate Beneficial Owner]
                              │
                    ┌─────────┴─────────┐
                    │                   │
              [Holding Co A]      [Holding Co B]
                    │                   │
              ┌─────┴─────┐            │
              │           │            │
         [Sub 1]    [Sub 2]      [Sub 3]
              │           │            │
         [Operating] [Operating] [Operating]
```

**Questions to answer**:
- Who is the ultimate beneficial owner (UBO)?
- What is the corporate structure (parent → subsidiaries)?
- Are there shell companies or nominee directors?
- What jurisdictions are involved (especially secrecy jurisdictions)?
- Who are the directors and officers?
- Who has signatory authority?
- What's the ownership percentage at each level?

### 2. Transaction Pattern Analysis

**Goal**: Identify suspicious financial patterns.

**Red Flags**:
| Pattern | What It Might Indicate |
|---------|------------------------|
| Round-trip transactions | Money laundering, artificial revenue |
| Circular payments | Related-party fraud |
| Just-under-threshold amounts | Structuring to avoid reporting |
| Sudden spikes in related-party transactions | Asset stripping |
| Payments to secrecy jurisdictions | Tax evasion, hidden ownership |
| Invoice amounts that don't match services | Kickbacks, bribery |
| Loans that are never repaid | Disguised distributions |
| Consulting fees to connected parties | Self-dealing |

### 3. Beneficial Ownership Tracing

**Goal**: Find who really controls and benefits from an entity.

**Layers to penetrate**:
1. Nominee directors/shareholders (front people)
2. Bearer shares (anonymous ownership)
3. Trusts (beneficiaries hidden)
4. Shell companies (multiple layers)
5. Secrecy jurisdictions (limited disclosure)

**Key questions**:
- Who has actual control (vs. nominal ownership)?
- Who receives the economic benefits?
- Are there undisclosed related parties?
- Who makes the real decisions?

### 4. Money Flow Mapping

**Goal**: Trace where money comes from and where it goes.

```
[Source] → [Intermediary 1] → [Intermediary 2] → [Destination]
   │              │                  │               │
 Where did     Why this          Why this        Where did
 it originate? intermediary?     intermediary?   it end up?
```

**Track**:
- Source of funds
- Path of funds (each hop)
- Purpose stated vs. actual
- Timing patterns
- Amount patterns

---

## DATA SOURCES

### Corporate Records

| Source | Coverage | What You Get |
|--------|----------|--------------|
| **SEC EDGAR** | US public companies | 10-K, 10-Q, proxy statements, insider transactions |
| **OpenCorporates** | 200+ jurisdictions | Basic company info, directors, filings |
| **State SOS** | US states | Articles of incorporation, annual reports, registered agents |
| **Companies House** | UK | Full company records, directors, shareholders |
| **GLEIF** | Global | Legal Entity Identifiers, ownership chains |

### Beneficial Ownership

| Source | Coverage | What You Get |
|--------|----------|--------------|
| **ICIJ Offshore Leaks** | Global leaks | Panama Papers, Paradise Papers, Pandora Papers |
| **OpenOwnership** | Select countries | Beneficial ownership registers |
| **OpenSanctions** | Global | Sanctions lists, PEPs, wanted persons |
| **UK PSC Register** | UK | Persons of Significant Control |
| **EU BO Registers** | EU countries | National beneficial ownership registers |

### Financial Disclosures

| Source | Coverage | What You Get |
|--------|----------|--------------|
| **FEC** | US federal | Campaign contributions, PACs, dark money |
| **OpenSecrets** | US | Aggregated political money data |
| **IRS 990s** | US nonprofits | Nonprofit financials, executive comp |
| **USAspending.gov** | US federal | Government contracts, grants |
| **FPDS** | US federal | Federal procurement data |
| **Lobbying disclosures** | US | Lobbying registrations, payments |

### Court & Legal

| Source | Coverage | What You Get |
|--------|----------|--------------|
| **PACER/RECAP** | US federal courts | Lawsuits, bankruptcies, judgments |
| **State courts** | US states | Civil, criminal, family court records |
| **SEC Litigation** | US | Securities enforcement actions |
| **DOJ Press Releases** | US | Criminal prosecutions |
| **FinCEN Files** | Global (leaked) | Suspicious Activity Reports |

### Property & Assets

| Source | Coverage | What You Get |
|--------|----------|--------------|
| **County recorders** | US counties | Property deeds, mortgages, liens |
| **FAA Registry** | US | Aircraft ownership |
| **USCG Documentation** | US | Vessel ownership |
| **Patent/trademark** | US/Global | IP ownership |
| **UCC filings** | US states | Secured transactions, collateral |

---

## EXECUTION: PARALLEL FINANCIAL RESEARCH

**Launch ALL of these simultaneously in ONE message:**

### Call 1: Corporate Structure (Gemini Deep Research)
```
mcp__mcp-gemini__deep_research:
  query: |
    [ENTITY] corporate structure ownership subsidiaries:
    - Parent company and ultimate owner
    - All subsidiaries and affiliates
    - Directors, officers, board members
    - Ownership percentages
    - Corporate history (mergers, acquisitions, spinoffs)
    - Registered agents and addresses
    - Jurisdictions of incorporation
```

### Call 2: SEC/Regulatory Filings (OpenAI Deep Research)
```
mcp__mcp-openai__deep_research:
  query: |
    [ENTITY] SEC filings regulatory enforcement:
    - 10-K, 10-Q, 8-K filings
    - Proxy statements (executive compensation, related party transactions)
    - Insider trading (Form 4)
    - SEC enforcement actions
    - Other regulatory actions (FTC, DOJ, state AGs)
```

### Call 3: Offshore/Shell Company Search (XAI)
```
mcp__mcp-xai__research:
  prompt: |
    Search for [ENTITY] or key individuals in:
    - Panama Papers
    - Paradise Papers
    - Pandora Papers
    - FinCEN Files
    - Other offshore leaks
    - Shell company connections
    - Secrecy jurisdiction registrations
  sources: ["web", "news"]
```

### Call 4: Political Money (XAI)
```
mcp__mcp-xai__research:
  prompt: |
    [ENTITY] or key individuals:
    - Campaign contributions (FEC, state)
    - PAC donations
    - Lobbying expenditures
    - Political connections
    - Government contracts received
  sources: ["web", "news"]
```

### Call 5: Litigation & Enforcement (Gemini)
```
mcp__mcp-gemini__deep_research:
  query: |
    [ENTITY] lawsuits litigation enforcement:
    - Civil lawsuits (plaintiff and defendant)
    - Criminal cases
    - Regulatory enforcement
    - Bankruptcies
    - Judgments and liens
    - Whistleblower complaints
```

### Call 6: Real-Time Financial News (XAI)
```
mcp__mcp-xai__news_search:
  query: "[ENTITY] financial fraud investigation SEC"
  prompt: |
    Find recent news about:
    - Financial irregularities
    - Investigations
    - Executive departures
    - Accounting issues
    - Analyst concerns
```

---

## RED FLAG CHECKLIST

When analyzing financial information, flag these indicators:

### Corporate Structure Red Flags
- [ ] Multiple layers of holding companies
- [ ] Incorporation in secrecy jurisdictions (BVI, Cayman, Delaware LLC)
- [ ] Nominee directors (professional directors with many directorships)
- [ ] Frequent corporate restructuring
- [ ] Complex cross-ownership between related entities
- [ ] Missing or inconsistent beneficial ownership information

### Transaction Red Flags
- [ ] Related-party transactions not at arm's length
- [ ] Unusual consulting or management fees
- [ ] Loans to/from related parties
- [ ] Revenue from single customer or related party
- [ ] Circular transactions
- [ ] Payments to shell companies
- [ ] Cash transactions just under reporting thresholds

### Disclosure Red Flags
- [ ] Auditor changes or qualifications
- [ ] Restatements of financial statements
- [ ] Late filings
- [ ] Material weaknesses in internal controls
- [ ] Unusual accounting policies
- [ ] Off-balance-sheet arrangements
- [ ] Related-party disclosures buried in footnotes

### Behavioral Red Flags
- [ ] Insider selling before bad news
- [ ] Executive departures (especially CFO, auditors)
- [ ] Aggressive revenue recognition
- [ ] Frequent acquisition accounting adjustments
- [ ] Excessive executive compensation vs. performance
- [ ] Board members with conflicts of interest

---

## OUTPUT: FINANCIAL ANALYSIS REPORT

Generate structured output:

```markdown
# Financial Investigation: [Entity]

**Case**: [case-id]
**Entity Type**: [Person | Company | Topic]

---

## Executive Summary

[2-3 paragraphs: Key financial findings, red flags identified,
money flow summary, recommended follow-up]

---

## Corporate Structure

### Ownership Chain
```
[Ultimate Beneficial Owner]
└── [Holding Company] (Jurisdiction)
    ├── [Subsidiary 1] (Jurisdiction) - [ownership %]
    └── [Subsidiary 2] (Jurisdiction) - [ownership %]
```

### Key Individuals
| Name | Role | Other Affiliations | Notes |
|------|------|-------------------|-------|
| | | | |

### Jurisdictions of Concern
- [List any secrecy jurisdictions and why they matter]

---

## Money Flow Analysis

### Sources of Funds
| Source | Amount | Period | Notes |
|--------|--------|--------|-------|
| | | | |

### Major Expenditures
| Destination | Amount | Period | Notes |
|-------------|--------|--------|-------|
| | | | |

### Suspicious Patterns
- [Pattern 1]: [Description and significance]
- [Pattern 2]: [Description and significance]

---

## Red Flags Identified

### High Concern
- [ ] [Red flag with specific evidence]
- [ ] [Red flag with specific evidence]

### Medium Concern
- [ ] [Red flag with specific evidence]

### Requires More Investigation
- [ ] [Potential issue needing more research]

---

## Regulatory & Legal History

### Enforcement Actions
| Agency | Date | Allegation | Outcome |
|--------|------|------------|---------|
| | | | |

### Significant Litigation
| Case | Date | Nature | Status/Outcome |
|------|------|--------|----------------|
| | | | |

---

## Political & Government Connections

### Campaign Contributions
| Recipient | Amount | Date | Notes |
|-----------|--------|------|-------|
| | | | |

### Lobbying Activity
| Issue | Amount | Period | Lobbyist |
|-------|--------|--------|----------|
| | | | |

### Government Contracts
| Agency | Amount | Purpose | Period |
|--------|--------|---------|--------|
| | | | |

---

## Offshore/Shell Company Connections

### Entities in Secrecy Jurisdictions
| Entity | Jurisdiction | Connection | Source |
|--------|--------------|------------|--------|
| | | | |

### Leaked Database Appearances
- [Database]: [Finding]

---

## Source Documents

### Filed with Regulators
- [S-XX] [Document name, date, key findings]

### Court Records
- [S-XX] [Case name, key findings]

### Public Records
- [S-XX] [Record type, key findings]

---

## Recommended Follow-Up

### High Priority
1. [Specific research action]
2. [Specific records to obtain]

### Medium Priority
1. [Additional research]

### FOIA/Records Requests to File
1. [Agency]: [Specific records]
```

---

## SAVE TO CASE

Save financial analysis to case directory:

```
cases/[case-id]/financial-[entity].md
```

Git handles versioning - no timestamps needed in filenames.

If new sources discovered, add to `sources.md` with proper [SXXX] IDs.

---

## THE MONEY INVESTIGATOR'S MINDSET

1. **"Where did it come from?"** - Always trace source of funds
2. **"Where did it go?"** - Follow every dollar to destination
3. **"Who benefits?"** - Identify the ultimate beneficiary
4. **"Why this structure?"** - Complexity usually serves a purpose
5. **"What's missing?"** - Gaps in records are often deliberate
6. **"Who really controls?"** - Nominal vs. actual ownership
7. **"What's the pattern?"** - One transaction is incident; patterns are evidence
8. **"Why this jurisdiction?"** - Location choices are strategic
9. **"What changed?"** - Watch for restructuring before/after events
10. **"Who else knows?"** - Auditors, lawyers, bankers are witnesses

---

## REMEMBER

> "Money leaves a trail. Your job is to find it."

Every transaction has a source, a path, and a destination. Follow all three.
