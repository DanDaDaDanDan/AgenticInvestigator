# Extraction Agent Prompt Template

## Context

- **Case:** {{case_id}}
- **Iteration:** {{iteration}}
- **Case Directory:** {{case_dir}}

## Task

Parse research leads and extract structured entities, then initialize claim registry.

## Instructions

1. **Read all research leads:** `research-leads/iteration-{{iteration}}-*.md`

2. **Extract and structure to extraction.json:**

```json
{
  "people": [
    {
      "id": "P001",
      "name": "Full Name",
      "role": "Title/Position",
      "source_file": "research-leads/...",
      "needs_investigation": true,
      "affiliated_entities": ["Org1", "Org2"]
    }
  ],
  "entities": [
    {
      "id": "E001",
      "name": "Organization Name",
      "type": "company|nonprofit|government|media",
      "jurisdiction": "Country/State",
      "parent": "Parent Org or null",
      "subsidiaries": []
    }
  ],
  "events": [
    {
      "id": "EV001",
      "date": "YYYY-MM-DD or range",
      "event": "What happened",
      "entities_involved": ["Entity1", "Entity2"]
    }
  ],
  "contradictions": [
    {
      "description": "What conflicts",
      "sources": ["source1", "source2"],
      "entities_involved": []
    }
  ],
  "sources_to_capture": [
    {
      "url": "https://...",
      "type": "article|document|database",
      "priority": "HIGH|MEDIUM|LOW",
      "reason": "Why this source matters"
    }
  ]
}
```

3. **Create individual claim files in `claims/`:**

   For EACH factual assertion extracted, create `claims/C####.json`:

   ```json
   {
     "id": "C0001",
     "claim": "Company X received $5M from Agency Z on DATE.",
     "type": "factual|attribution|timeline|causal",
     "status": "pending",
     "risk_level": "HIGH|MEDIUM|LOW",
     "subject": "Company X",
     "source_file": "research-leads/iteration-1-gemini.md",
     "supporting_sources": [],
     "corroboration": {
       "min_sources": 2,
       "independence_rule": "different_domain_or_primary",
       "requires_primary": false
     },
     "created_at": "ISO-8601"
   }
   ```

   **Risk level determines corroboration requirements:**
   | Risk | min_sources | independence_rule |
   |------|-------------|-------------------|
   | HIGH | 2 | different_domain_or_primary |
   | MEDIUM | 2 | different_domain |
   | LOW | 1 | none |

   **Claim types:**
   - `factual` — Verifiable fact (amounts, dates, events)
   - `attribution` — Statement attributed to someone
   - `timeline` — Sequence or causation claim
   - `causal` — X caused Y

4. **Create claims/index.json:**

   ```json
   {
     "total": 15,
     "by_status": {
       "pending": 12,
       "verified": 2,
       "disputed": 1,
       "unverifiable": 0
     },
     "by_risk": {
       "HIGH": 5,
       "MEDIUM": 7,
       "LOW": 3
     },
     "claims": ["C0001", "C0002", "C0003", ...]
   }
   ```

5. **Prioritize sources_to_capture:**
   - HIGH: Primary sources, official documents, key testimony
   - MEDIUM: Supporting evidence, secondary reporting
   - LOW: Background, context

6. **Identify contradictions:**
   - Conflicting dates or timelines
   - Opposing claims from different parties
   - Inconsistent statements from same person

7. **Log claim creation:**
   ```bash
   node scripts/ledger-append.js {{case_dir}} claim_create --claim C0001 --risk HIGH
   ```

## Output

- Write `extraction.json` with all extracted data (people, entities, events)
- Create individual `claims/C####.json` files
- Create `claims/index.json` rollup
- Log all claim creations to ledger
