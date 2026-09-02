# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Development with hot-reload (tsx watch)
npm run start        # Run with tsx (no watch, one-shot)
npm run build        # Compile TypeScript + copy HTML/CSS assets to dist/
npm run start:prod   # Run compiled production build
docker compose up    # Run containerized (port 3005)
```

```bash
npm test             # Run the Vitest suite once
```

## Architecture

Multi-tenant HTTP microservice that generates PDFs from Handlebars templates rendered via Playwright (Chromium). Runs on port 3005 (configurable via `PORT` env var).

### Endpoints

- `POST /render/:clienteNombre?nombreInforme=REPORT_NAME` — generate PDF; returns `application/pdf`
- `GET /health` — health check; returns `{ status: "ok" }`

### Request flow

```
POST /render/:clienteNombre?nombreInforme=REPORT_NAME  { body: { contractVersion?, data } }
  → app.ts route handler
    → if contractVersion is present and isn't 1 → 422 (omitted entirely = accepted, for tenants that don't envelope their payload)
    → validarPayload(): if the tenant/report declared a schema.ts, Zod-validate `data`; throws PayloadValidationError → 422 on mismatch
    → createPdf.ts
      → TenantManager: retrieve pre-compiled Handlebars template
      → Handlebars.execute(template, data) → HTML string
      → PdfService (Playwright): render HTML in headless Chromium → PDF Buffer
  ← returns PDF bytes
```

`src/app.ts` builds the Express app (routes, middleware) without listening — it's what tests import. `src/index.ts` is the boot script: initializes `TenantManager` against the real `src/tenants` and calls `app.listen`.

### Tenant/template discovery

At startup, `TenantManager.inicializar()` scans `src/tenants/` and compiles every template it finds. If initialization fails, the process exits with code 1. The directory layout defines the routing:

```
src/tenants/{clienteName}/helpers.ts                              ← optional, shared across all reports for this client
src/tenants/{clienteName}/schema.ts                               ← optional, shared Zod schema across all reports for this client
src/tenants/{clienteName}/{nombreInforme}/pdf/template.html       ← required
src/tenants/{clienteName}/{nombreInforme}/pdf/styles.css          ← optional, prepended as <style> at compile time
src/tenants/{clienteName}/{nombreInforme}/helpers.ts              ← optional, overrides client-level helpers
src/tenants/{clienteName}/{nombreInforme}/schema.ts               ← optional, overrides client-level schema
```

Example: `src/tenants/basa/menor/` is served by `POST /render/basa?nombreInforme=menor`.

Templates are compiled once into Handlebars delegate functions and cached in memory — no disk reads during request handling.

> **CSS note:** `styles.css` is injected as an inline `<style>` block prepended to the HTML at compile time. Playwright never resolves the `<link rel="stylesheet">` in the template — that tag exists only for browser preview during development.

### Adding a new tenant/report

1. Create the directory `src/tenants/{client}/{report}/pdf/`
2. Add `template.html` (Handlebars syntax)
3. Optionally add `styles.css` and a `helpers.ts` that exports:
   ```ts
   export const helpers = {
     helperName: (value: any) => string,
   };
   ```
4. Restart the service — `TenantManager` picks it up on startup.

Client-level helpers (`src/tenants/{client}/helpers.ts`) are shared across all reports for that client. Report-level helpers override them when names collide.

### Payload validation (optional, per tenant/report)

Add a `schema.ts` (or `.js`) next to `helpers.ts` — same loading convention (report-level file wins over client-level when both exist; a report with neither skips validation entirely, exactly like today):

```ts
import { z } from "zod";

export const schema = z.object({
  campo: z.string(),
});
```

`TenantManager.getSchema(cliente, informe)` resolves it at request time; `validarPayload` (`src/core/validation/payloadValidator.ts`) runs it against the request body and throws `PayloadValidationError` (caught in `app.ts`, returned as `422` with the failing field paths) on mismatch. None of the three existing tenants (`basa/menor`, `basa/califSinLimites`, `example/default`) declare a schema, so they behave exactly as before.

### Existing tenants

| Client | Report | Route |
|--------|--------|-------|
| basa | menor | `POST /render/basa?nombreInforme=menor` |
| basa | califSinLimites | `POST /render/basa?nombreInforme=califSinLimites` |
| gsc | scoring | `POST /render/gsc?nombreInforme=scoring` |
| example | default | onboarding reference — not a production tenant |

### PdfService: shared browser

`PdfService` is a static singleton, symmetric to `TenantManager`. `PdfService.inicializar()` launches a single Chromium instance once at boot (called from `index.ts` alongside `TenantManager.inicializar()`) and keeps it open for the life of the process. Each `createDocument()` call opens its own `page` on that shared browser, renders, and closes only the `page` — the browser itself is never closed between requests. If the shared browser is found disconnected (crashed, closed externally), the next call to `createDocument()` relaunches it automatically, no process restart needed.

Chromium launches with `--disable-dev-shm-usage` and `--no-sandbox` for Docker compatibility. `docker-compose.yml` allocates 1 GB shared memory (`shm_size: "1gb"`) — reduce this only if memory is constrained and rendering artifacts appear acceptable.

### DTOs

`src/core/dtos/renderPdfRequest.ts` defines the shape of the request body. The response is the raw PDF bytes (`application/pdf`), not a JSON DTO. The body is passed directly to Handlebars as the template context, optionally Zod-validated first — see "Payload validation" above.

---

## PDF Template Development

> **When creating or modifying a PDF report, always read both skills first:**
> - `.claude/skills/basa-pdf-html/SKILL.md` — HTML structure, sections, tables, Handlebars patterns
> - `.claude/skills/basa-pdf-css/SKILL.md` — CSS variables, table styles, typography, extension rules

The visual design system is anchored in `src/tenants/basa/menor/pdf/` — every new template must extend that system without replacing it.
