# Estado actual — Web_MakeItEasy
Actualizado: 2026-10-26 09:59 | Sesión: 2026-10-26_0959_radar-fase1.md

## Objetivo del proyecto
Sitio público de Make It Easy y CRM interno (leads, cotizaciones, proyectos y Radar de prospección).

## Hecho (verificado)
- [x] Radar desplegado en producción (`crm.makeiteasycol.com`, PM2 `mie-crm` en 127.0.0.1:3011) con build del 2026-10-26 16:59 UTC.
- [x] Geocodificación corregida a Colombia (PR #2, commit `712a547`): "Chía" y "Bogotá" resuelven en Colombia; Bogotá devuelve 38 talleres.
- [x] Cuota de `localStorage` corregida y desplegada (PR #3, commit `81ceea9`): análisis sin captura, tope de 50 y escrituras tolerantes a cuota.
- [x] Workflow de deploy corregido (PR #4, commit `677642a`): el CRM vuelve a sincronizarse al webroot.
- [x] Migraciones de SQLite aplicadas en local y producción (radarPlaceId, agents.proposito, radar_usage).
- [x] APIs del Radar autenticadas responden: `/api/radar/config` 200 y `/radar` redirige al login.
- [x] Búsqueda OSM validada para Colombia (Bogotá 38 talleres, Medellín 9).
- [x] `.env.example`, `.gitignore`, `ecosystem.config.js`, README y `docs/RADAR.md` corregidos.

## En curso
- [ ] PR de leads multiusuario + tests (modelo `RadarLead`, API propia y migración) pendiente de desplegar.
- [ ] Configurar `PAGESPEED_API_KEY` en el VPS (opcional, gratis).

## Siguiente paso
1. Subir y desplegar el PR de multiusuario; verificar aislamiento entre usuarios. Después, añadir `PAGESPEED_API_KEY`.

## Decisiones vigentes
| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-10-26 | `RADAR_COUNTRY` default `co` | El geocoder estaba fijado a España y "Bogotá" resolvía en Madrid |
| 2026-10-26 | El workflow debe sincronizar `make-it-easy-crm/` | `deploy.sh` compila desde el webroot; excluirlo deja código viejo |
| 2026-10-26 | PM2 en 3011 (standalone) | 3005 está ocupado por NullClaw |

## Bloqueos / riesgos
- `PAGESPEED_API_KEY` vacía en producción (PageSpeed deshabilitado).
- Leads y análisis del Radar viven en `localStorage`; sin multiusuario y con riesgo de cuota.
- Algunos `@types` de `node_modules` están como placeholders de OneDrive y rompen `tsc` sin `--types node`.

## Entorno y comandos
- Levantar: `npm run dev` (CRM) · `npx next dev -p 3012` para pruebas aisladas.
- Tests/calidad: `npx eslint <archivos>` · `npx tsc --noEmit --types node`.
- Deploy: push a `main` → GitHub Actions (rsync + webhook) → `scripts/deploy.sh` en el VPS.
