# OSINT Data Sources

You are helping the user identify the best OSINT (Open Source Intelligence) data sources for their investigation.

> **Key insight**: Most public records are NOT indexed by Google. They live in "deep web" databases that require direct queries. Knowing where to look is half the investigation.

---

## USAGE

```
/osint                    # Show quick reference and OSINT frameworks
/osint [topic]            # Recommend sources for specific investigation type
```

**Note**: This command helps find *where* to look (OSINT databases). For the investigation's *citation registry* (source IDs like [S001]), see `sources.md` in the case directory.

---

## WHEN INVOKED

### If no topic specified:

Display the Quick Reference table and OSINT Frameworks from `docs/investigative_data_sources.md`:

```markdown
## Quick Reference by Investigation Type

| Investigating... | Primary Sources |
|------------------|-----------------|
| **Government fraud/spending** | USAspending.gov, Data.gov, State checkbooks, FOIA libraries |
| **Corporate entities** | OpenCorporates, SEC EDGAR, State SOS registries |
| **Nonprofits/charities** | ProPublica Nonprofit Explorer, Candid 990 Finder |
| **Court cases** | PACER, RECAP/CourtListener, State court portals |
| **Campaign finance** | OpenSecrets, FEC database |
| **Lobbying/influence** | FARA.gov, Senate LDA database |
| **Offshore/shell companies** | ICIJ Offshore Leaks, OpenSanctions, OCCRP Aleph |
| **Sanctions/PEPs** | OpenSanctions.org, OFAC lists |
| **Police/criminal records** | State DOC locators, FBI Crime Data Explorer |
| **Trade/imports** | UN Comtrade, ImportGenius, Panjiva |
| **International entities** | OCCRP ID Catalogue, country-specific registries |
| **Deleted web content** | Wayback Machine (web.archive.org) |

## OSINT Frameworks (Lists of Lists)

| Resource | URL | What It Does |
|----------|-----|--------------|
| **OSINT Framework** | osintframework.com | Visual directory of 100s of tools by search type |
| **Awesome OSINT** | github.com/jivoi/awesome-osint | Comprehensive list of public record sources |
| **OCCRP ID Catalogue** | id.occrp.org/databases | Databases by country |
| **GIJN Resource Center** | gijn.org/topic/databases | Topic-specific guides |
| **Journalist's Toolbox** | journaliststoolbox.ai | SPJ's collection |
| **Bellingcat Toolkit** | bellingcat.gitbook.io | Verification, satellites, geolocation |

For full reference with 100+ sources: `docs/investigative_data_sources.md`
```

### If topic specified:

Analyze the topic and recommend specific sources with URLs and query strategies.

**Step 1: Parse the topic type**

| Keywords | Investigation Type |
|----------|-------------------|
| fraud, spending, grants, contracts, government money | Government fraud/spending |
| company, corporation, LLC, business, ownership | Corporate entities |
| nonprofit, charity, foundation, 501c3, NGO | Nonprofits |
| court, lawsuit, case, legal, trial, verdict | Court cases |
| campaign, election, donation, PAC, political | Campaign finance |
| lobby, lobbying, foreign agent, influence | Lobbying/influence |
| offshore, shell company, Panama, hidden ownership | Offshore/shell companies |
| sanction, PEP, politically exposed, blacklist | Sanctions/PEPs |
| police, crime, arrest, prison, inmate, misconduct | Police/criminal records |
| import, export, shipping, trade, customs | Trade/imports |
| person, who is, background, investigate someone | Person investigation |
| deleted, removed, old version, archived | Deleted content |
| international, foreign, [country name] | International |

**Step 2: Provide tailored recommendations**

---

## RESPONSE TEMPLATES

### For Government Fraud/Spending

```markdown
## Sources for Government Fraud/Spending Investigation

### Follow the Money
- **USAspending.gov** - All federal contracts, grants, loans - search by company/agency/amount
- **Data.gov** - 200,000+ federal datasets
- **State checkbook portals** - Search "[state] transparency" or "[state] openbook"
- **SAM.gov** - Contractor registration and exclusions

### FOIA & Declassified
- **FOIA.gov** - Track FOIA requests across agencies
- **FBI Vault** (vault.fbi.gov) - Declassified FBI files
- **National Security Archive** (nsarchive.gwu.edu) - 35+ years of declassified docs

### Audit Reports
- **GAO Reports** (gao.gov) - Federal program audits
- **State OLA/Auditor** - State-level program evaluations
- **OIG Reports** - Agency Inspector General findings

### Cross-Reference
- **OpenSecrets** - Political connections of contractors
- **ProPublica Nonprofit Explorer** - If funds went to tax-exempt orgs
- **OpenCorporates** - Who owns the receiving entities?

### Query Strategy
1. Identify the program/agency involved
2. Search USAspending for recipient organizations
3. Cross-reference recipients in OpenCorporates and state SOS
4. Check if any are nonprofits via ProPublica 990 search
5. Look for OIG/GAO audit reports on the program
6. Check OpenSecrets for political connections
```

### For Corporate Entities

```markdown
## Sources for Corporate Investigation

### Ownership & Structure
- **OpenCorporates** (opencorporates.com) - 220M+ companies from 140+ registries
- **State SOS** - [State] Secretary of State business search (officers, agents, addresses)
- **SEC EDGAR** (sec.gov/edgar) - Public company 10-K, 10-Q, insider transactions
- **FINRA BrokerCheck** - Broker backgrounds and disciplinary history

### Red Flags & Connections
- **OpenSanctions** (opensanctions.org) - 140,000+ profiles - sanctions + PEPs
- **ICIJ Offshore Leaks** (offshoreleaks.icij.org) - 800,000+ offshore entities
- **OCCRP Aleph** (aleph.occrp.org) - 340M+ entities (request access)

### Financial
- **USAspending** - Any government contracts/grants received
- **ProPublica Nonprofit Explorer** - If tax-exempt
- **Court records** - Lawsuits via CourtListener/PACER

### Query Strategy
1. Search OpenCorporates for company name across jurisdictions
2. Check state SOS for local filings (officers, registered agent)
3. Search SEC EDGAR for any filings
4. Cross-reference officers in OpenSanctions
5. Search ICIJ Offshore Leaks for offshore connections
6. Check court records for litigation history
```

### For Nonprofits

```markdown
## Sources for Nonprofit Investigation

### Financial Records
- **ProPublica Nonprofit Explorer** (projects.propublica.org/nonprofits) - Searchable 990s
- **Candid 990 Finder** (candid.org) - Foundation and charity filings
- **IRS Tax Exempt Search** (apps.irs.gov/app/eos) - Official lookup
- **Charity Navigator** (charitynavigator.org) - Ratings and analysis

### Key 990 Data Points
- Total revenue and expenses
- Executive compensation (Schedule J)
- Related party transactions
- Program vs. admin spending ratio
- Board members and key employees

### Cross-Reference
- **OpenCorporates** - Other entities with same officers
- **OpenSecrets** - Political activity
- **State charity registration** - Some states require separate registration

### Query Strategy
1. Find EIN (Employer ID Number) via IRS search or Guidestar
2. Pull all 990s from ProPublica (multiple years)
3. Compare year-over-year for anomalies
4. Check Schedule J for executive pay
5. Search for related entities with same officers
6. Check state charity registration status
```

### For Court Cases

```markdown
## Sources for Court/Legal Investigation

### Federal Courts
- **RECAP/CourtListener** (courtlistener.com) - Free PACER mirror (try first!)
- **PACER** (pacer.uscourts.gov) - All federal court docs (~$0.10/page)
- **Google Scholar** (scholar.google.com → Case law) - Free appellate opinions

### State Courts
- **SearchSystems** (publicrecords.searchsystems.net) - Find state court portals
- **State judiciary websites** - Direct case search
- Note: Many state courts NOT online - may need physical request

### Legal Research
- **CourtListener** - Court opinions, oral arguments, judge databases
- **Justia** (justia.com) - Free case law
- **Cornell LII** (law.cornell.edu) - US Code, Supreme Court

### Criminal Records
- **Federal Inmate Locator** (bop.gov/inmateloc) - Federal prisoners
- **State DOC Locators** - State prison inmate search

### Query Strategy
1. Start with RECAP/CourtListener (free)
2. If not found, search PACER directly
3. For state cases, find portal via SearchSystems
4. Check Google Scholar for appellate opinions
5. Search by party name AND case number if known
```

### For Campaign Finance/Political

```markdown
## Sources for Campaign Finance Investigation

### Federal
- **OpenSecrets** (opensecrets.org) - Campaign finance, lobbying, PAC data
- **FEC Database** (fec.gov) - Official contribution filings
- **ProPublica FEC Itemizer** - Easier FEC search interface

### State Level
- **State campaign finance portals** - Search "[state] campaign finance"
- **OpenStates** (openstates.org) - Bills, legislators across all states

### Lobbying
- **FARA.gov** - Foreign agent registrations
- **Senate LDA Database** (lda.senate.gov) - Domestic lobbying

### Query Strategy
1. Search donor name in OpenSecrets
2. Cross-reference with FEC for itemized contributions
3. Check if donor has business with government (USAspending)
4. Search state-level contributions
5. Check lobbying disclosures for related entities
```

### For Offshore/Shell Companies

```markdown
## Sources for Offshore/Shell Company Investigation

### Leak Databases
- **ICIJ Offshore Leaks** (offshoreleaks.icij.org) - 800,000+ entities from Panama/Paradise/Pandora Papers
- **OCCRP Aleph** (aleph.occrp.org) - 340M+ entities from leaks and registries (request access)

### Sanctions & PEPs
- **OpenSanctions** (opensanctions.org) - 140,000+ profiles from global sources
- **OFAC Sanctions List** (sanctionssearch.ofac.treas.gov) - US Treasury
- **EU Sanctions Map** (sanctionsmap.eu) - European Union

### Corporate Registries
- **OpenCorporates** - Aggregates 140+ country registries
- **OCCRP ID Catalogue** (id.occrp.org/databases) - Find registry by country
- Country-specific: Companies House (UK), Delaware Division of Corporations, etc.

### Query Strategy
1. Search entity/person name in ICIJ Offshore Leaks
2. Check OpenSanctions for connections to PEPs
3. Search OpenCorporates across jurisdictions
4. Use OCCRP ID Catalogue to find specific country registries
5. Look for common addresses, agents, directors across entities
6. Trace beneficial ownership chains
```

### For Person Investigation

```markdown
## Sources for Investigating a Person

### Business Connections
- **OpenCorporates** - What companies are they connected to?
- **State SOS registries** - Officer/director positions
- **SEC EDGAR** - If connected to public companies

### Political & Financial
- **OpenSanctions** - Are they a PEP or sanctioned?
- **ICIJ Offshore Leaks** - Offshore connections?
- **OpenSecrets** - Political donations?

### Legal
- **CourtListener/PACER** - Federal lawsuits
- **State court portals** - State lawsuits
- **Professional license databases** - Disciplinary actions

### Property & Public Records
- **County assessor/recorder sites** - Property ownership
- **SearchSystems** - Find local record portals

### Query Strategy
1. Start with OpenCorporates for business connections
2. Check OpenSanctions for PEP/sanctions status
3. Search court records for litigation
4. Check campaign finance for political activity
5. Search property records in likely jurisdictions
6. Check professional licenses if applicable
```

### For International Investigations

```markdown
## Sources for International Investigation

### Find the Right Database
- **OCCRP ID Catalogue** (id.occrp.org/databases) - Databases by country (corporate, court, gazette)
- **OpenCorporates** - Covers 140+ country registries

### Cross-Border Financial
- **ICIJ Offshore Leaks** - Panama/Paradise/Pandora Papers
- **OpenSanctions** - Global sanctions and PEP lists
- **UN Comtrade** (comtrade.un.org) - Import/export by country

### Specific Countries
- **UK**: Companies House (companieshouse.gov.uk)
- **EU**: National registries via OCCRP catalogue
- **Offshore jurisdictions**: ICIJ Offshore Leaks first

### Query Strategy
1. Identify relevant jurisdictions
2. Use OCCRP ID Catalogue to find each country's registry
3. Search OpenCorporates for cross-border presence
4. Check ICIJ Offshore Leaks for hidden structures
5. Cross-reference with OpenSanctions
```

### For Deleted/Archived Content

```markdown
## Sources for Finding Deleted Content

### Web Archives
- **Wayback Machine** (web.archive.org) - Enter exact URL
- **Archive.today** (archive.today) - Alternative archive
- **Google Cache** - Prefix URL with `cache:`

### Documents
- **DocumentCloud** (documentcloud.org) - Journalist-uploaded documents
- **RECAP/CourtListener** - Court documents may persist

### Social Media
- Various tools in **OSINT Framework** (osintframework.com)
- Some Twitter archives exist

### Query Strategy
1. Try Wayback Machine with exact URL first
2. Check Archive.today as backup
3. Try Google cache for recent deletions
4. Search DocumentCloud for documents
5. Check OSINT Framework for social media tools
```

---

## INTEGRATION WITH /investigate

When running `/investigate` investigations, the Official Records research agent (Step 2, Agent 5) should automatically consult these sources. This command provides on-demand access to source recommendations without running a full investigation.

---

## FULL REFERENCE

For complete source database with 100+ sources:

```
docs/investigative_data_sources.md
```

Includes:
- Government & public records (federal, state, local)
- FOIA libraries and declassified documents
- Legal & court records
- Corporate & financial records
- Corruption, sanctions, offshore finance
- Specialized archives and investigative projects
- OSINT frameworks (lists of lists)
- Query strategies for each investigation type
- Minnesota-specific sources
- Tips for finding even more sources
