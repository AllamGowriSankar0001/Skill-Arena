# PDF Service Security (Phase 6C)

## Flow

```text
Authenticated client (web/mobile)
  → POST /api/resume/pdf { ats }   (auth + CSRF/Bearer + rate limit)
  → API resumePdfService
  → POST http://127.0.0.1:8001/render
       header: X-PDF-Service-Secret
       body: { ats }   # structured data only — no url/html
  → LaTeX (Tectonic/pdflatex) in temp dir
  → PDF bytes → API → client download
```

Clients never call the PDF service and never receive `PDF_SERVICE_SECRET`.

## Input class

**A — Raw structured ATS JSON → PDF.**  
Arbitrary URL fetching and raw HTML rendering are **not supported** and are rejected.

## Network

- Default bind: `PDF_SERVICE_HOST=127.0.0.1`
- Non-loopback bind **requires** `PDF_SERVICE_SECRET` or the process refuses to start
- No public CORS on the PDF service

## Auth

- `X-PDF-Service-Secret` compared with `secrets.compare_digest`
- Loopback + empty secret allowed only for local development (warning logged)

## Limits

| Limit | Default |
|-------|---------|
| Body | 512 KiB |
| PDF output | 5 MiB |
| Concurrent renders | 2 |
| API PDF rate | 10 / 15 min / user |
| API fetch timeout | 120 s |
| Cache files | 100 (pruned by mtime) |
