---
phase: 04
slug: photo-input
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-05
---

# Phase 04 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client → /api/solve | User-pasted HTML string crosses from browser to server | Unvalidated user HTML (validated server-side by existing middleware) |
| OS file picker → browser | User-selected files enter page context as File objects | Local image files (JPEG/PNG); client-side type check applied |
| browser memory → DOM | Object URLs created from user files rendered in `<img src>` | Blob URLs (non-executable); revoked on remove and unmount |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-04-01 | Tampering | paste Textarea (client input) | accept | Existing server-side rate limiting and payload validation on `/api/solve` unchanged; plan only removes one client-side input path | closed |
| T-04-02 | Information Disclosure | removed upload flow | accept | Removing the file upload path **reduces** attack surface — no file reads, no FileReader exposure introduced | closed |
| T-04-03 | Denial of Service | pasteHTML size | accept | Existing `/api/solve` payload validation unchanged; no new DoS vector introduced | closed |
| T-04-04 | Information Disclosure | Object URLs in memory | mitigate | `URL.revokeObjectURL` called in remove handler (`photo-scan-tab.tsx:66`) AND unmount `useEffect` cleanup (`photo-scan-tab.tsx:24-26`) | closed |
| T-04-05 | Tampering | file.type check | mitigate | Client-side `file.type.startsWith("image/")` at `photo-scan-tab.tsx:38` (defense-in-depth); server-side validation deferred to Phase 5 `/api/extract` | closed |
| T-04-06 | Denial of Service | unbounded image queue | accept | D-09 explicitly allows no hard limit; browser memory is natural ceiling; Phase 5 will enforce upload size limits server-side | closed |
| T-04-07 | Information Disclosure | `<img src=objectUrl>` XSS | mitigate | `URL.createObjectURL` produces non-executable `blob:` URLs; `alt=""` on all thumbnails; no user-controlled strings reach DOM (`photo-scan-tab.tsx:92-94`) | closed |
| T-04-08 | Elevation of Privilege | `capture="environment"` | accept | Standard HTML attribute; browser prompts user for camera access per its own policy — no elevated app permissions | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-04-01 | T-04-01 | Server-side validation on `/api/solve` pre-exists and is unchanged; plan scope is UI only | seriouslyvictor | 2026-04-05 |
| AR-04-02 | T-04-02 | Upload removal reduces surface; no new disclosure vector introduced | seriouslyvictor | 2026-04-05 |
| AR-04-03 | T-04-03 | No new payload path; existing server validation applies | seriouslyvictor | 2026-04-05 |
| AR-04-06 | T-04-06 | Queue limit deferred to Phase 5 per design decision D-09; browser memory acts as natural ceiling | seriouslyvictor | 2026-04-05 |
| AR-04-08 | T-04-08 | `capture` is a hint attribute only — browser enforces its own permission model; no app privilege escalation possible | seriouslyvictor | 2026-04-05 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-05 | 8 | 8 | 0 | gsd-security-auditor (automated) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-05
