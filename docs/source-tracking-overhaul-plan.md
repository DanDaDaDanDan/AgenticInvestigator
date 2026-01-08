# Source Tracking Overhaul Plan

## Problem Statement

Current source tracking has critical weaknesses:

1. **No actual URLs** - Sources like `[S001]` have domain hints but not clickable URLs
2. **Link rot** - URLs disappear, pages change, content is removed
3. **No proof of content** - Can't verify what the page actually said when researched
4. **AI synthesis opacity** - Gemini/OpenAI deep research synthesizes from many sources, untraceable
5. **No local copies** - Everything depends on external availability
6. **Hallucination vulnerability** - No way to prove a claim was actually in a source

## Goal

Create a **hallucination-proof, legally-defensible evidence system** where:
- Every cited source has a verifiable local copy
- Content can be proven to have existed at research time
- Claims can be traced to exact locations in source documents
- Evidence survives link rot and page changes

---

## Proposed Architecture

### Case Directory Structure (Enhanced)

```
cases/[topic-slug]/
├── .git/
│
├── evidence/                         # NEW: Evidence archive
│   ├── web/                          # Web page captures
│   │   ├── S001/
│   │   │   ├── capture.png           # Full-page screenshot
│   │   │   ├── capture.pdf           # PDF rendering
│   │   │   ├── capture.html          # Raw HTML source
│   │   │   ├── capture.mhtml         # Single-file archive (MHTML)
│   │   │   └── metadata.json         # Capture metadata
│   │   ├── S002/
│   │   └── ...
│   │
│   ├── documents/                    # Downloaded documents
│   │   ├── S015_sec_10k_2024.pdf
│   │   ├── S016_court_complaint.pdf
│   │   └── ...
│   │
│   ├── api/                          # API response captures
│   │   ├── S020_twitter_search.json
│   │   ├── S021_sec_edgar.json
│   │   └── ...
│   │
│   └── media/                        # Videos, images, audio
│       ├── S030_youtube_transcript.txt
│       ├── S030_youtube_thumbnail.png
│       └── ...
│
├── sources.md                        # Enhanced source registry
├── summary.md
└── ...
```

### Enhanced sources.md Format

```markdown
# Source Registry

**Case**: [topic-slug]
**Total Sources**: 47
**Captured**: 42 | Pending: 3 | Unavailable: 2

---

## Source Entries

### [S001] Certified Humane - Pasture-Raised Standards

| Field | Value |
|-------|-------|
| **Type** | Certification Standards |
| **URL** | https://certifiedhumane.org/how-we-work/our-standards/egg-laying-hens/ |
| **Archive** | https://web.archive.org/web/20260107142300/https://certifiedhumane.org/... |
| **Captured** | 2026-01-07 14:23:00 UTC |
| **Method** | Playwright full capture |
| **Hash** | sha256:a1b2c3d4e5f6... |
| **Credibility** | Primary (official standards body) |

**Evidence Files**:
- Screenshot: `evidence/web/S001/capture.png`
- PDF: `evidence/web/S001/capture.pdf`
- HTML: `evidence/web/S001/capture.html`
- MHTML: `evidence/web/S001/capture.mhtml`

**Key Claims Extracted**:
- Requires 108 sq ft outdoor space per hen
- Year-round outdoor access required
- Soil must be vegetation-covered or rotated

---

### [S056] FDA Recall Notice - August Egg Company

| Field | Value |
|-------|-------|
| **Type** | Government Document |
| **URL** | https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/august-egg-company-recalls-shell-eggs |
| **Archive** | https://web.archive.org/web/20260107143500/https://www.fda.gov/... |
| **Captured** | 2026-01-07 14:35:00 UTC |
| **Method** | Playwright + PDF download |
| **Hash** | sha256:b2c3d4e5f6g7... |
| **Credibility** | Primary (official government source) |

**Evidence Files**:
- Screenshot: `evidence/web/S056/capture.png`
- PDF: `evidence/web/S056/capture.pdf`
- Official PDF: `evidence/documents/S056_fda_recall_notice.pdf`

**Key Claims Extracted**:
- 20.4 million eggs recalled
- 79 illnesses, 21 hospitalizations
- Simple Truth explicitly listed as affected brand
- Plant codes P-6562 and CA-5330 identified

---
```

### metadata.json Schema

```json
{
  "source_id": "S001",
  "url": "https://example.com/article",
  "title": "Page Title",
  "captured_at": "2026-01-07T14:23:00Z",
  "method": "playwright",
  "playwright_version": "1.40.0",
  "viewport": {"width": 1920, "height": 1080},
  "full_page": true,
  "files": {
    "screenshot": "capture.png",
    "pdf": "capture.pdf",
    "html": "capture.html",
    "mhtml": "capture.mhtml"
  },
  "hashes": {
    "screenshot": "sha256:...",
    "pdf": "sha256:...",
    "html": "sha256:...",
    "mhtml": "sha256:..."
  },
  "archive_org": {
    "submitted": true,
    "url": "https://web.archive.org/web/...",
    "job_id": "..."
  },
  "http_status": 200,
  "content_type": "text/html",
  "page_load_time_ms": 2340,
  "errors": []
}
```

---

## Capture Methods

### 1. Web Pages (Playwright)

**Tool**: Playwright via npx or installed globally

**Capture script** (`scripts/capture-url.sh`):
```bash
#!/bin/bash
# Usage: ./capture-url.sh <source_id> <url> <case_dir>

SOURCE_ID=$1
URL=$2
CASE_DIR=$3
EVIDENCE_DIR="$CASE_DIR/evidence/web/$SOURCE_ID"

mkdir -p "$EVIDENCE_DIR"

# Use Playwright to capture
npx playwright screenshot --full-page "$URL" "$EVIDENCE_DIR/capture.png"
npx playwright pdf "$URL" "$EVIDENCE_DIR/capture.pdf"

# Save HTML source
curl -sL "$URL" > "$EVIDENCE_DIR/capture.html"

# Generate hashes
sha256sum "$EVIDENCE_DIR"/* > "$EVIDENCE_DIR/hashes.txt"

# Submit to Wayback Machine
curl -s "https://web.archive.org/save/$URL" > /dev/null

# Generate metadata
cat > "$EVIDENCE_DIR/metadata.json" << EOF
{
  "source_id": "$SOURCE_ID",
  "url": "$URL",
  "captured_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "method": "playwright"
}
EOF

echo "Captured $SOURCE_ID: $URL"
```

### 2. PDF Documents

**For SEC filings, court documents, etc.**:
```bash
# Download with metadata
curl -sL "$URL" -o "evidence/documents/${SOURCE_ID}_filename.pdf"
sha256sum "evidence/documents/${SOURCE_ID}_filename.pdf" >> evidence/documents/hashes.txt
```

### 3. API Responses

**For structured data (Twitter, SEC EDGAR API, etc.)**:
```bash
# Save raw JSON response
curl -sL "$API_URL" | jq '.' > "evidence/api/${SOURCE_ID}_response.json"
```

### 4. Wayback Machine Integration

**Submit for archiving**:
```bash
# Submit URL to Wayback Machine
curl -s "https://web.archive.org/save/$URL"

# Get archived version URL
ARCHIVE_URL=$(curl -sI "https://web.archive.org/web/$URL" | grep -i "location:" | cut -d' ' -f2)
```

---

## Integration with Investigation Workflow

### Phase 1: Research (Modified)

```
When a source is found:

1. IMMEDIATE CAPTURE
   - Run capture script on URL
   - Download any linked documents (PDFs, etc.)
   - Store in evidence/ folder

2. REGISTER SOURCE
   - Add to sources.md with full metadata
   - Include local evidence paths
   - Include content hash

3. EXTRACT CLAIMS
   - List specific claims from this source
   - Note page numbers / locations for each claim
```

### New Investigation Loop Step

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1.5: EVIDENCE CAPTURE (NEW)                                  │
│                                                                     │
│  For EVERY URL found during research:                               │
│    1. Capture full page (screenshot, PDF, HTML)                     │
│    2. Submit to Wayback Machine                                     │
│    3. Download linked documents                                     │
│    4. Generate content hashes                                       │
│    5. Register in sources.md with evidence paths                    │
│                                                                     │
│  For AI research results (Gemini/OpenAI deep research):             │
│    1. Treat as LEADS, not sources                                   │
│    2. For each claim, find PRIMARY source                           │
│    3. Capture primary source as above                               │
│    4. Never cite AI research as final source                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Verification Enhancement

```
/verify now includes:

□ Source Integrity Check
  - All cited sources have evidence files
  - All evidence file hashes match metadata
  - All Wayback Machine submissions confirmed
  - No orphaned source IDs (cited but not captured)

□ Claim Traceability Check
  - Each claim in summary.md links to source
  - Source evidence file contains the claim
  - Page/location noted for verification
```

---

## Handling AI Research Sources

### Problem
Gemini and OpenAI deep research synthesize from many sources. Current practice cites them directly (e.g., `[S007] Gemini Deep Research: Harris Teeter Supply Chain Analysis`).

### Solution: Two-Tier Source System

**Tier 1: Research Leads** (internal use only)
- AI research outputs stored in `research/` folder
- Used to identify claims and find primary sources
- Never cited in final outputs

**Tier 2: Verified Sources** (citable)
- Primary sources captured and verified
- Full evidence chain
- Used in summary.md, articles.md, etc.

### Workflow

```
AI Research Result:
  "MPS Egg Farms is the 6th largest producer with 12-14M hens"

  ↓

Find Primary Source:
  Search for "MPS Egg Farms" + "largest producer" + "million hens"
  Find: Industry publication, SEC filing, or news article

  ↓

Capture Primary Source:
  URL: https://wattagnet.com/articles/mps-egg-farms-profile
  Screenshot, PDF, HTML → evidence/web/S058/

  ↓

Register as Verified Source:
  [S058] WATTPoultry - MPS Egg Farms Profile
  URL: https://wattagnet.com/...
  Evidence: evidence/web/S058/
  Claim: "6th largest US egg producer, 12-14 million hens"
```

---

## Implementation Phases

### Phase 1: Infrastructure (Week 1)
- [ ] Create `evidence/` folder structure
- [ ] Write capture scripts (bash + Playwright)
- [ ] Update sources.md template
- [ ] Update architecture.md, CLAUDE.md, investigate.md

### Phase 2: Tooling (Week 2)
- [ ] Create MCP-compatible capture tool or bash wrapper
- [ ] Integrate Wayback Machine submission
- [ ] Add hash verification utilities
- [ ] Create source audit script

### Phase 3: Workflow Integration (Week 3)
- [ ] Modify investigation loop to include capture step
- [ ] Add capture prompts to investigate.md
- [ ] Update /verify to check source integrity
- [ ] Train on new workflow

### Phase 4: Migration (Week 4)
- [ ] Backfill existing case with evidence captures
- [ ] Upgrade sources.md to new format
- [ ] Verify all sources have evidence

---

## Technical Requirements

### Required Tools
1. **Playwright** - Web page capture (screenshots, PDFs)
   ```bash
   npm install -g playwright
   npx playwright install chromium
   ```

2. **curl** - HTTP requests, Wayback submission

3. **sha256sum** - Hash generation

4. **jq** - JSON processing

### Optional Enhancements
- **SingleFile CLI** - MHTML single-file archives
- **youtube-dl/yt-dlp** - Video transcripts
- **pdftotext** - PDF text extraction for searchability

---

## Quality Metrics

### Source Capture Rate
- Target: 100% of primary sources captured
- Acceptable: 95%+ (some may be truly unavailable)

### Hash Verification
- All evidence files have SHA-256 hashes
- Hashes recorded at capture time
- Verification on demand

### Archive Redundancy
- Local copy + Wayback Machine for all web sources
- Prevents single point of failure

---

## Example: Complete Source Entry

```markdown
### [S073] DxE March 2024 MPS Investigation

| Field | Value |
|-------|-------|
| **Type** | Investigative Report |
| **URL** | https://www.directactioneverywhere.com/investigations/mps-egg-farms |
| **Archive** | https://web.archive.org/web/20260107150000/... |
| **Captured** | 2026-01-07 15:00:00 UTC |
| **Method** | Playwright full capture |
| **Hash** | sha256:c3d4e5f6g7h8... |
| **Credibility** | Advocacy organization - requires corroboration |

**Evidence Files**:
- Screenshot: `evidence/web/S073/capture.png`
- PDF: `evidence/web/S073/capture.pdf`
- HTML: `evidence/web/S073/capture.html`
- Video: `evidence/media/S073_investigation_video.mp4`
- Transcript: `evidence/media/S073_video_transcript.txt`

**Key Claims Extracted**:
1. Facility in Wabash County, Indiana housed 1.2M hens
2. Pop-holes appeared closed during filming period
3. Birds observed indoors with no visible outdoor access
4. Filming date: March 2024

**Corroboration Status**:
- The Guardian [S080] independently reported on same facility
- USDA HPAI data [S101] confirms outbreak at different MPS facility
- Indiana records [S102] show no mandatory confinement for Wabash County

**Limitations Noted**:
- Single point-in-time observation
- No access to internal company records
- Advocacy source with stated position
```

---

## Cost/Benefit Analysis

### Costs
- Storage: ~10-50 MB per source (screenshots, PDFs)
- Time: ~30-60 seconds per capture
- Complexity: Additional workflow step

### Benefits
- **Legal protection**: Proof of what sources said
- **Hallucination prevention**: Verifiable claims
- **Longevity**: Sources preserved against link rot
- **Credibility**: Audit trail for fact-checking
- **Reproducibility**: Anyone can verify claims

---

## Decision Points

### Question 1: Capture All or Selective?
**Option A**: Capture everything (comprehensive)
**Option B**: Capture only sources cited in summary.md (efficient)
**Recommendation**: Option B with upgrade path to A

### Question 2: When to Capture?
**Option A**: During research (real-time)
**Option B**: Before finalization (batch)
**Recommendation**: Option A - capture immediately to avoid content changes

### Question 3: MCP Server vs. Bash Scripts?
**Option A**: Build custom MCP server for capture tools
**Option B**: Use bash scripts called via Bash tool
**Recommendation**: Start with Option B, upgrade to A if needed

---

## Next Steps

1. **Approve this plan** or request modifications
2. **Install Playwright** on development machine
3. **Create capture scripts** in `scripts/` folder
4. **Update documentation** (architecture.md, investigate.md, etc.)
5. **Test on existing case** - backfill evidence for current sources
6. **Integrate into workflow** - add capture step to investigation loop
