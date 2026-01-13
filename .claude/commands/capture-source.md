# /capture-source - Capture Web Evidence

Capture web sources as evidence for citations.

## Usage

```
/capture-source <url>
/capture-source --document <url>
```

## Purpose

Evidence capture is critical for anti-hallucination:
1. **Prove existence** - Source existed at research time
2. **Prove content** - Evidence actually contains cited claims
3. **Permanence** - Content preserved even if URL disappears

## Workflow

1. **Get next source ID** from `state.json.next_source`
2. **Capture** using the capture script
3. **Verify** evidence folder exists with required files
4. **Register** in sources.json
5. **Increment** next_source in state.json

## Capture Commands

**Web Page:**
```bash
node scripts/capture.js S001 https://example.com cases/[case-id]
```

**Document:**
```bash
node scripts/capture.js --document S002 https://sec.gov/file.pdf cases/[case-id]
```

**Bot-Bypass (Cloudflare):**
```bash
node scripts/firecrawl-capture.js S003 https://protected-site.com cases/[case-id]/evidence/web/S003
```

## Output

```
evidence/web/S001/
├── content.md       # Markdown content
├── links.json       # Extracted links
└── metadata.json    # Timestamps, hashes
```

## Rules

1. **Never cite before capture** - No `[S###]` until evidence exists
2. **Always verify** - Check evidence folder before registering
3. **Report failures** - If capture fails, don't hide it
4. **Do NOT cite** failed captures

## Failure Handling

If capture fails:
1. Try alternate method (Firecrawl for bot-protected)
2. Check Wayback Machine: `node scripts/find-wayback-url.js <url>`
3. Document failure
