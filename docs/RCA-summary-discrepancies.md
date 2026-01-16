# Root Cause Analysis: Summary-Evidence Discrepancies

**Date:** 2026-01-15
**Investigator:** Claude Opus 4.5
**Scope:** Analysis of discrepancies between summary.md claims and underlying evidence
**Status:** IMPLEMENTING - Fixes in progress

---

## Executive Summary

Analysis of the AI case (`ai-as-2026-us-midterm-election-issue`) reveals **7 critical discrepancies** between summary.md claims and underlying evidence. These represent a different failure mode than the context-loss issues in `RCA-context-loss.md`: here the problem is not lost information, but **misinformation that propagates through the pipeline**.

### Root Causes Identified

1. **No RECONCILIATION phase** - Lead investigation results don't update summary.md
2. **Citation without capture enforcement** - Sources cited before/without capture
3. **Citation laundering** - Statistics attributed to sources that don't contain them
4. **Lead results without evidence** - Detailed findings with empty `sources[]`
5. **Premature curiosity satisfaction** - Gate passed with 67% of leads pending
6. **Temporal context omission** - Dated evidence presented without dates

---

## Discrepancy 1: Phantom Super PACs

### Evidence

**summary.md (lines 53-58):**
```
"Leading the Future" Super PAC with initial war chest of **over $100 million** funded by Andreessen Horowitz, OpenAI figures, and tech investors.
...
"Public First" Super PAC (bipartisan) aims to raise **$50 million**, led by former Representatives Chris Stewart (R) and Brad Carson (D).
```

**leads.json (L016):**
```json
{
  "id": "L016",
  "lead": "Pull FEC filings for Leading the Future and Public First Super PACs",
  "status": "dead_end",
  "result": "These specific PAC names do not exist in FEC records. The names may have been incorrectly reported in initial research or may be informal names."
}
```

### Root Cause

Summary was written during RESEARCH phase from deep_research synthesis. When L016 investigated and couldn't verify these PACs, the summary was never updated. **No phase exists to reconcile lead findings with summary claims.**

### Impact

- Readers believe $150M+ Super PAC war is established fact
- Core thesis about "AI political spending war" rests on unverifiable claims
- Article perpetuates the error

### Fix Required

Add RECONCILIATION sub-phase after FOLLOW that:
1. Diffs lead investigation results against summary.md claims
2. Updates or caveats claims that leads couldn't verify
3. Flags contradictions for human review

---

## Discrepancy 2: Uncaptured Source Cited

### Evidence

**summary.md (line 18):**
```
The Trump Administration launched the "Genesis Mission" in late 2025... [S001](https://www.whitehouse.gov/briefing-room/presidential-actions/)
```

**sources.json:**
```json
{ "id": "S001", "captured": false }
```

**evidence/S001/:** Directory is empty or minimal

### Root Cause

Deep research returned claims about the Genesis Mission EO. A source placeholder S001 was created, but the actual page was never captured. The summary cites S001 despite `captured: false`. **Core Rule #1 "CAPTURE BEFORE CITE" was violated.**

### Impact

- Core political claims about federal AI policy have no verifiable evidence
- If URL changes or content differs, we cannot prove what was claimed
- Undermines the entire evidentiary foundation

### Fix Required

Add pre-article verification in `/verify` Gate 4:
- Block if any cited source has `captured: false` in sources.json
- Block if any cited source has missing/empty evidence/S###/ directory

---

## Discrepancy 3: Citation Laundering (Wrong Source)

### Evidence

**summary.md (line 30):**
```
**72% of workers** are concerned about AI reducing jobs [S003](url)
```

**S003 content.md actual content:**
```
- **52%** of Americans say they feel more concerned than excited about AI
- **53%** say AI is doing more to hurt than help privacy
```

The figure "72%" does NOT appear in S003.

### Root Cause

The 72% figure came from deep_research synthesis (likely a different Pew or Gallup study). When writing summary.md, the agent incorrectly attributed it to S003, the closest captured Pew source. This is **citation laundering** - attaching a citation to a claim the citation doesn't support.

### Impact

- Key statistic underpinning "economic anxiety" thesis is unverifiable
- If fact-checked, the citation doesn't support the claim
- Damages credibility of entire analysis

### Fix Required

Add **semantic verification** to `/verify` Gate 4:
1. Extract each `[claim] [S###]` pair from summary.md and articles
2. Use LLM to verify the source actually supports the specific claim
3. Flag citation laundering: "S003 cited for '72% of workers' but source contains '52%'"

---

## Discrepancy 4: Lead Results Without Source Capture

### Evidence

**leads.json examples of "investigated" leads with `sources: []`:**

| Lead | Status | Result Contains | Sources |
|------|--------|-----------------|---------|
| L006 | investigated | "262K tech layoffs", "IBM replaced ~7,800 roles", "Goldman Sachs: 300M jobs" | [] |
| L007 | investigated | "Biden NH robocall reached ~5K voters", "49 viral fakes tracked" | [] |
| L018 | investigated | "US leads 60-70%", "China leads in deployment scale" | [] |
| L027 | investigated | "$200B hyperscaler capex 2024", "OpenAI ~$3.7B ARR" | [] |

### Root Cause

The `/follow` command investigated leads using deep_research or web_search, synthesized findings, and wrote results to leads.json. But it didn't capture the sources found - only stored synthesized findings. **"Capture before cite" was violated at the lead level.**

### Impact

- 13 "investigated" leads contain dozens of specific claims with no evidence trail
- Lead findings cannot be verified or fact-checked
- Claims propagate to summary.md and article without evidentiary support

### Fix Required

Modify `/follow` to require:
1. Any statistic/specific claim in `result` field requires source capture
2. Empty `sources[]` with numeric/specific `result` = verification failure
3. Validation script to flag: leads with numbers but no sources

---

## Discrepancy 5: Premature Curiosity Satisfaction

### Evidence

**leads.json:**
- Total leads: 42
- Status "pending": 28 (67%)
- Status "investigated": 13
- Status "dead_end": 1

**Pending HIGH priority leads:**
- L037: "Verify $380B AI infrastructure investment claim"
- L038: "Verify OpenAI lobbying increase claim"
- L042: "Actively seek Republican pro-safety voices for balance"

**state.json:** `"curiosity": true` (gate passed)

### Root Cause

The `/curiosity` check evaluated "are major avenues exhausted?" and declared SATISFIED. It weighted "quality of pursued leads" over "quantity of unpursued leads." The pre-check for pending leads (added in recent fix) may not have been strict enough, or the check was run before the fix was applied.

### Impact

- Investigation declared complete with 67% of leads uninvestigated
- Verification leads (L037, L038) that could falsify core claims were never pursued
- Balance lead (L042) ignored, creating potential partisan skew

### Fix Required

Modify `/curiosity` pre-check to include:
1. Hard threshold: Cannot pass if ANY HIGH priority leads are pending
2. Percentage threshold: Cannot pass if >40% of all leads are pending
3. Verification lead requirement: Leads with "verify" in description must be resolved

---

## Discrepancy 6: Unverified Claim Persists After Investigation

### Evidence

**summary.md (lines 44-45):**
```
New York: RAISE Act (Responsible AI Safety and Education) proposed by Alex Bores
```

**leads.json (L003):**
```json
{
  "result": "'Alex Bores' not found - may be misspelling or emerging figure. NY has AI legislation (A8156/S7817 on AI hiring bias) but no major AI-platform candidates identified."
}
```

### Root Cause

Same as Discrepancy 1: no RECONCILIATION phase to propagate lead findings back to summary.md. The claim "Alex Bores" was in initial research, lead L003 couldn't verify, but summary wasn't updated.

### Impact

- Article asserts a specific person proposed specific legislation that may not exist
- Fact-checkable claim that fails fact-checking

### Fix Required

Same as Discrepancy 1: RECONCILIATION phase

---

## Discrepancy 7: Temporal Context Missing

### Evidence

**S003 metadata:**
```
Published: August 28, 2023
```

**full.md (line 37):**
```
(Note: This data predates the most recent AI developments; current sentiment may differ.)
```

**summary.md:** No temporal caveat anywhere for S003 statistics.

### Root Cause

Article writing agent correctly added temporal context. But summary.md was written earlier and never updated. **Summary is treated as "working notes" while article is "publication-ready" - different evidentiary standards.**

### Impact

- Summary presents 2023 data as current
- Anyone using summary.md as reference is misled
- Creates version inconsistency between summary and article

### Fix Required

1. Treat summary.md with same rigor as article
2. Require temporal markers: `[S003, Aug 2023]` format
3. Add `/reconcile` command to refresh summary.md from current evidence after article

---

## Data Flow with Discrepancy Points

```
┌────────────────────────────────────────────────────────────────────────┐
│                          RESEARCH PHASE                                  │
│                                                                          │
│  deep_research ──► summary.md (DRAFT)                                    │
│       │                 │                                                │
│       │            [DISCREPANCY 1, 6]                                    │
│       │            Claims from synthesis, no capture                     │
│       │                 │                                                │
│       └──► sources.json (S001 placeholder, captured: false)              │
│                         │                                                │
│                    [DISCREPANCY 2]                                       │
│                    Source cited without capture                          │
└──────────────────────────────────────────────────────────────────────────┘
                                │
┌──────────────────────────────────────────────────────────────────────────┐
│                          QUESTION PHASE                                    │
│                                                                            │
│  frameworks ──► questions/*.md ──► summary.md additions                    │
│                       │                                                    │
│                  [DISCREPANCY 3]                                           │
│                  Statistics attributed to wrong sources                    │
└────────────────────────────────────────────────────────────────────────────┘
                                │
┌────────────────────────────────────────────────────────────────────────────┐
│                           FOLLOW PHASE                                       │
│                                                                              │
│  leads.json ──► /follow ──► lead results                                     │
│       │              │           │                                           │
│       │              │      [DISCREPANCY 4]                                  │
│       │              │      Results without source capture                   │
│       │              │           │                                           │
│       │              │      [DISCREPANCY 1, 6 - NO RECONCILIATION]          │
│       │              │      Contradicting results don't update summary       │
│       │              │                                                       │
│  [DISCREPANCY 5]     │                                                       │
│  28/42 leads still   │                                                       │
│  pending at /curiosity                                                       │
└──────────────────────────────────────────────────────────────────────────────┘
                                │
┌──────────────────────────────────────────────────────────────────────────────┐
│                         CURIOSITY CHECK                                        │
│                                                                                │
│  leads + questions + summary ──► /curiosity ──► SATISFIED                      │
│                                       │                                        │
│                               [DISCREPANCY 5]                                  │
│                               Passed despite 67% pending                       │
└────────────────────────────────────────────────────────────────────────────────┘
                                │
┌────────────────────────────────────────────────────────────────────────────────┐
│                          ARTICLE PHASE                                          │
│                                                                                 │
│  summary.md (with errors) ──► /article ──► articles/*.md                        │
│                                   │              │                              │
│                                   │         [ALL DISCREPANCIES PROPAGATE]       │
│                                   │         Phantom PACs, uncaptured sources,   │
│                                   │         wrong citations, unverified claims  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           VERIFY PHASE                                            │
│                                                                                   │
│  Gate 4: Sources ──► checks citation exists, NOT that it supports claim           │
│                            │                                                      │
│                      [DISCREPANCY 2, 3 NOT CAUGHT]                                │
│                      Uncaptured sources pass                                      │
│                      Wrong citations pass                                         │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Relationship to RCA-context-loss.md

| Issue Type | RCA-context-loss.md | This RCA |
|------------|---------------------|----------|
| Core problem | Information is lost | Misinformation propagates |
| Where | Handoffs between phases | Within summary.md |
| Detection | Missing content in article | False claims in article |
| Fix approach | Include more content | Verify content accuracy |

Both RCAs are complementary. Context-loss addresses coverage gaps; this RCA addresses accuracy gaps.

---

## Implementation Plan

### Phase 1: Gate Hardening

1. **Modify `/curiosity` pre-check:**
   - Block if ANY HIGH priority leads are pending
   - Block if >40% of leads are pending
   - Require "verify" leads to be resolved

2. **Modify `/verify` Gate 4:**
   - Add 4a: Check all cited sources have `captured: true`
   - Add 4b: Semantic verification that citations support claims
   - Add 4c: Check lead results have non-empty `sources[]`

### Phase 2: RECONCILIATION Phase

3. **Create `/reconcile` command:**
   - Run after FOLLOW, before CURIOSITY
   - Diff lead results against summary.md claims
   - Update/caveat claims that leads couldn't verify
   - Flag contradictions for human review

4. **Update workflow in CLAUDE.md:**
   - Add RECONCILIATION between FOLLOW and CURIOSITY
   - Add reconciliation gate to 6 gates

### Phase 3: Validation Scripts

5. **Create `scripts/check-summary-claims.js`:**
   - Extract all factual claims from summary.md
   - Cross-reference against sources.json (captured status)
   - Cross-reference against leads.json (investigation results)
   - Report: uncaptured citations, contradicted claims, unverified statistics

6. **Create `scripts/verify-citations.js --semantic`:**
   - For each [claim] [S###] pair, extract the claim text
   - Load source content from evidence/S###/content.md
   - Use LLM to verify source supports the specific claim
   - Report citation laundering

### Phase 4: Template Updates

7. **Update summary.md template:**
   - Require temporal markers: `[S###, Month Year]`
   - Add reconciliation status section
   - Add verification status section

8. **Update leads.json schema:**
   - Warn if `result` contains numbers but `sources: []`
   - Require `sources` for "investigated" status

---

## Testing Plan

After implementing fixes, re-run AI case through pipeline and verify:

1. Curiosity check fails due to pending HIGH priority leads
2. Verify check fails due to S001 not captured
3. Verify check fails due to 72% claim not in S003
4. Reconciliation updates summary.md with caveats for phantom PACs
5. Validation scripts catch all 7 discrepancies

---

## Appendix: Files to Modify

| File | Change |
|------|--------|
| `.claude/commands/curiosity.md` | Add HIGH priority check, percentage threshold |
| `.claude/commands/verify.md` | Add 4a/4b/4c semantic checks |
| `.claude/commands/follow.md` | Require source capture for results |
| `CLAUDE.md` | Add RECONCILIATION phase, update gates |
| `scripts/check-summary-claims.js` | NEW - validation script |
| `scripts/verify-citations.js` | ADD --semantic flag |

---

*Analysis complete. Implementation follows.*
