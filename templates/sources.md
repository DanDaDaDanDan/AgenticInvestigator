# Source Registry

**Case**: [case-id]
**Topic**: [topic]

---

## Source Statistics

| Metric | Count |
|--------|-------|
| Total Sources | 0 |
| Captured (web) | 0 |
| Captured (document) | 0 |
| Pending capture | 0 |
| Unavailable | 0 |

---

## Source Entries

*Append-only. Never renumber or delete entries. All sources must have evidence.*

<!-- TEMPLATE FOR NEW SOURCE ENTRY:

### [SXXX] Title

| Field | Value |
|-------|-------|
| **Type** | News Article / Court Filing / Government Document / Academic Paper / Company Filing / Social Media / Certification Standards |
| **URL** | https://... |
| **Archive** | https://web.archive.org/web/... |
| **Captured** | YYYY-MM-DD HH:MM:SS UTC |
| **Evidence** | `evidence/web/SXXX/` or `evidence/documents/SXXX_filename.pdf` |
| **Hash** | sha256:... |
| **Credibility** | Primary / Secondary / Tertiary |

**Key Claims**:
- Claim 1
- Claim 2

**Limitations**:
- Any known limitations or caveats

-->

---

## Research Leads (Not Citable)

*AI research outputs are stored in `research-leads/` folder. These are used to find primary sources but are NOT cited in final outputs.*

| Lead | Source | Primary Sources Found |
|------|--------|----------------------|
| [example] | Gemini Deep Research | [S001], [S002] |

---

## Pending Captures

*Sources identified but not yet captured. Must capture before citing.*

| ID | URL | Status |
|----|-----|--------|
| - | - | - |

---

## Unavailable Sources

*Sources that could not be captured (paywalled, deleted, etc.)*

| ID | URL | Reason | Alternative |
|----|-----|--------|-------------|
| - | - | - | - |
