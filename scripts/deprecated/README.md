# Deprecated Scripts

Scripts in this folder have been superseded by newer implementations.

## verification-pipeline-v1/

**Superseded by:** `scripts/claims/` (claim registry system)

The old 5-step verification pipeline has been replaced by a simpler claim-centric architecture:

### Old Architecture (verification-pipeline-v1)
- 5 sequential steps: CAPTURE → INTEGRITY → BINDING → SEMANTIC → STATISTICS
- Verified claims AFTER article was written
- Complex chain hash computation
- ~1500 lines across 13 files

### New Architecture (scripts/claims/)
- Claims verified AT CAPTURE time
- Article verification = simple registry matching
- No hallucination possible (claims must exist in registry)
- ~2000 lines across 7 focused modules

### Migration

To migrate an existing case to the new system:

```bash
# Check status
node scripts/claims/migrate-sources.js cases/<case-id> status

# Quick extraction (regex-based)
node scripts/claims/migrate-sources.js cases/<case-id> quick-all

# Verify article
node scripts/claims/verify-article.js cases/<case-id> --fix
```

### Why Deprecated

1. **Claims should be verified at capture, not after writing** - Prevents hallucination
2. **Simpler mental model** - "Verify each claim" vs "Run 5 steps"
3. **Naturally parallel** - Each claim is independent
4. **Better debugging** - "Claim X not in registry" vs "Step 3 failed"

---

*Deprecated: 2026-01-21*
