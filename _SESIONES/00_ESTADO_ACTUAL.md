# Estado actual — Web_MakeItEasy
Actualizado: 2026-11-17 20:40 | Sesión: 2026-11-17_1426_radar-web-deficiente.md

## Objetivo del proyecto
Sitio público de Make It Easy y CRM interno (leads, cotizaciones, proyectos y Radar de prospección).

## Hecho (verificado)
- [x] Radar desplegado en producción (`crm.makeiteasycol.com`, PM2 `mie-crm` en 127.0.0.1:3011) con build del 2026-10-26 17:42 UTC.
- [x] Geocodificación corregida a Colombia (PR #2, commit `712a547`): "Chía" y "Bogotá" resuelven en Colombia; Bogotá devuelve 38 talleres.
- [x] Cuota de `localStorage` corregida y desplegada (PR #3, commit `81ceea9`): análisis sin captura, tope de 50 y escrituras tolerantes a cuota.
- [x] Workflow de deploy corregido (PR #4, commit `677642a`): el CRM vuelve a sincronizarse al webroot.
- [x] Leads multiusuario desplegados (PR #6): tabla `radar_leads`, API propia, aislamiento por usuario y migración de datos legacy.
- [x] Tests del Radar con `npm test`: 7/7 (score, webs, estados, cuota y migración).
- [x] Migraciones de SQLite aplicadas en local y producción (radarPlaceId, agents.proposito, radar_usage, radar_leads).
- [x] APIs del Radar autenticadas responden: `/api/radar/config` 200 y `/radar` redirige al login.
- [x] Búsqueda OSM validada para Colombia (Bogotá 38 talleres, Medellín 9).
- [x] `.env.example`, `.gitignore`, `ecosystem.config.js`, README y `docs/RADAR.md` corregidos.
- [x] Radar 2.0 en local: segmento «web deficiente», chequeo rápido de webs (rotas/malas/mejorables/buenas), contacto enriquecido con email verificado por MX y decisor, filtros en leads y métrica de web mala en nichos.
- [x] Migración `20261117180000_radar_site_scan` aplicada en local (`radar_site_scans` + campos en `radar_businesses`).
- [x] Tests del Radar 26/26, `tsc --noEmit` limpio, `npm run build` OK y escaneo real de `makeiteasycol.com` (good, 100/100, 2 emails verificados).
- [x] Corregida la geocodificación de barrios sin polígono: Nominatim limit=10, se prefiere área sobre POI, expansión a radio 2.5 km y fallback Photon→Overpass. Tests 26/26.
- [x] Prueba real Mazurén/gimnasios: 5 en modo rápido y 35 en exhaustivo; restaurantes 200; Bodytech `weak` 60/100 y Smart Fit `good` 78/100.
- [x] Upsert de negocios también con caché, para que `/api/radar/site-scan` no responda `skipped`.
- [x] Radar 2.0 + fix de geocodificación desplegado a producción: PR #7, squash `f84165e`, run `44170942042` verde en 1m51s.
- [x] Verificación de producción: `/login` 200, `/radar` 307→login, `/api/radar/site-scan` 401 (ruta nueva activa) y `/api/radar/search` 401.
- [x] Cache de búsqueda versionada a `v2` y autocompletado de zonas desplegados: PR #8, run `44173169532` verde en 1m55s; `/api/radar/zones` 401 sin sesión.
- [x] El fallo reportado en producción era la fila de caché vieja: servía el resultado vacío con la zona de la parada de bus aunque el código nuevo ya estaba desplegado.

## En curso
- [ ] Configurar `PAGESPEED_API_KEY` en el VPS (opcional, gratis).
- [ ] Prueba funcional autenticada en producción (`Mazurén` + `Gimnasios`) por el usuario, con Ctrl+F5 para cargar el JS nuevo.

## Siguiente paso
1. Entrar a `crm.makeiteasycol.com` con Ctrl+F5, escribir `mazuren` y elegir una sugerencia de área (Mazuren I/II/IV).
2. Buscar `Gimnasios`: rápido ~5, exhaustivo ~35. Si sale caché vacía, «Reintentar sin caché».
3. Pulsar «Analizar webs» en fichas que tengan URL y validar badges/contacto.

## Decisiones vigentes
| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-11-17 | Escaneo de webs manual con caché de 30 días | Evita ralentizar cada búsqueda y protege el VPS |
| 2026-11-17 | Sin Sellbird ni envío masivo; email manual | AGPL-3.0, deliverability y Ley 1581 |
| 2026-11-17 | Calidad de web en 5 niveles con nota 0–100 | Permite filtrar «web mala» y explicar el pitch |
| 2026-11-17 | Email verificado por MX, no por SMTP | Gratis y suficiente para distinguir dominio vivo/genérico |
| 2026-10-26 | `RADAR_COUNTRY` default `co` | El geocoder estaba fijado a España y "Bogotá" resolvía en Madrid |
| 2026-10-26 | El workflow debe sincronizar `make-it-easy-crm/` | `deploy.sh` compila desde el webroot; excluirlo deja código viejo |
| 2026-10-26 | PM2 en 3011 (standalone) | 3005 está ocupado por NullClaw |

## Bloqueos / riesgos
- `PAGESPEED_API_KEY` vacía en producción (PageSpeed deshabilitado).
- La calidad de web es un chequeo rápido, no la auditoría completa.
- Sitios que bloquean bots quedan `unknown`; no se penalizan.
- Falsos positivos del decisor en cargos genéricos (se filtra «arquitecto/diseñador/…»).
- Algunos `@types` de `node_modules` están como placeholders de OneDrive y rompen `tsc` sin `--types node`.

## Entorno y comandos
- Levantar: `npm run dev` (CRM) · `npx next dev -p 3012` para pruebas aisladas.
- Tests/calidad: `npx eslint <archivos>` · `npx tsc --noEmit --types node`.
- Deploy: push a `main` → GitHub Actions (rsync + webhook) → `scripts/deploy.sh` en el VPS.
