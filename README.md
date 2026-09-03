# informes-microservicio

Microservicio Node/Express/Playwright que renderiza informes PDF a partir de
un DTO JSON (`data`), por tenant/tipo de informe (`src/tenants/{cliente}/{informe}/pdf/`).
No tiene capa de persistencia ni conoce ninguna base de datos de dominio: solo
recibe JSON y devuelve bytes de PDF.

## Seguridad

**Sin autenticación** en `POST /render/:clienteNombre`. Es una decisión
deliberada, no un descuido: hoy el servicio escucha en loopback
(`127.0.0.1`/`localhost`), en el mismo host que el cliente que lo llama
(`imprimir_info_scoring.php` en `GSC-sir`), sin exposición a la red.

Si en algún momento este servicio se muda a otro host, o se expone fuera de
`localhost` (por ejemplo para escalar horizontalmente), **hay que agregar
autenticación antes de ese cambio**, no después. Sin loopback, la ausencia de
auth pasa de ser una decisión razonable a ser una vulnerabilidad real.

## Operación

- **Health check**: `GET /health` → `{status: "ok"}`. Usado por el
  `HEALTHCHECK` del `Dockerfile` y por `docker-compose.yml`.
- **Logs**: todo va a `stdout`/`stderr` (`console.log`/`console.error`), sin
  archivos de log dentro del contenedor. El logging del `render` solo
  imprime `clienteNombre` y `nombreInforme` — nunca el payload (`data`), que
  puede traer datos personales (CUIT, razón social, analista, etc.).
- **Templates**: se compilan y cachean en memoria una sola vez al arrancar
  el proceso (`TenantManager`). Cambiar un `template.html`/`styles.css` en
  producción requiere reiniciar el contenedor — no hay hot-reload fuera de
  `NODE_ENV=development` (ver `docs/adr/0004-preview-dev-only-templates-pdf.md`
  en el repo `agregar-reportes`).
- **Reinicio tras reboot del host**: `docker-compose.yml` ya tiene
  `restart: unless-stopped`. Requiere que el propio Docker esté habilitado
  para arrancar al boot del sistema operativo (fuera del alcance de este
  repo).
- **Concurrencia**: no hay límite de `page` (Playwright) concurrentes ni
  cola — cada request abre su propia `page` dentro de un único `Browser`
  reusado (`PdfService`). Sin tope hoy.
- **`contractVersion`**: `POST /render/:clienteNombre` rechaza (422) si
  `contractVersion` viene definido y no es `1`. No hay lógica de
  compatibilidad hacia atrás — un cambio de contrato requiere desplegar el
  cliente (`GSC-sir`) y este microservicio de forma coordinada.
