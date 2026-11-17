# Sesión — Radar 2.0: web deficiente y contacto enriquecido

Fecha: 2026-11-17 14:26
Rama: pendiente de crear `feature/radar-web-deficiente`

## Objetivo

Ampliar el Radar para detectar no solo negocios sin web, sino también negocios con una web mal hecha, y portar las mejoras útiles de Sellbird (señales, contacto y email) sin instalar Sellbird.

## Decisiones

- Solo se mejora el Radar; Sellbird no se instala ni se copia código (AGPL-3.0).
- El escaneo de webs es manual (botón «Analizar webs») con caché de 30 días.
- Canales: WhatsApp, email manual (`mailto:`) y visita. Sin envío masivo ni outbox automático.
- Calidad de web en 5 niveles: `broken`, `bad`, `weak`, `good`, `unknown`.
- Nota 0–100 explicable (responde, HTTPS, móvil, contenido, conversión, frescura) con topes por web aparcada, sin HTTPS o sin móvil.
- El score de oportunidad suma +25 (rota), +15 (mala) o +8 (mejorable).
- Email verificado con DNS (MX) y clasificado como `verified`, `risky` o `invalid`.
- Cuota nueva: `RADAR_DAILY_SITE_SCANS` (200/día por usuario por defecto).

## Cambios por archivo

- `src/lib/radar/types.ts`: tipos de calidad, señales, `SiteScan`, `EmailCheck` y campos nuevos en `RadarBusiness`.
- `src/lib/radar/siteScan.ts`: hechos de la home, clasificación pura y escaneo con guard SSRF.
- `src/lib/radar/contacts.ts`: extracción de emails/teléfonos/redes/decisor y verificación MX.
- `src/lib/radar/siteQuality.ts`: etiquetas, colores y `applyScanSummary` (score + contacto).
- `src/lib/radar/siteScanStore.ts`: caché 30 días, guardado de escaneos y denormalización.
- `src/lib/radar/score.ts`: uplift por calidad de web.
- `src/lib/radar/quota.ts`: `dailySiteScans`, `siteScansUsed`, `assertSiteScanQuota`.
- `src/app/api/radar/site-scan/route.ts`: escaneo por lotes (máx. 10, concurrencia 4).
- `src/app/api/radar/search/route.ts`: aplica scans, filtros `objective`, `maxSiteGrade`, `requireEmail` y contadores.
- `src/app/api/radar/messages/route.ts`: contexto de salud web/contacto y reglas «sin web» vs «web mala».
- `src/app/radar/page.tsx`: selector de objetivo, botón y progreso de análisis, badges, email/decisor y CSV ampliado.
- `src/app/radar/negocio/page.tsx`: tarjeta «Salud de la web» y análisis rápido.
- `src/app/radar/leads/page.tsx`: filtro por calidad de web/email, badges y acción de email.
- `src/app/radar/nichos/page.tsx`: % web mala y muestreo opcional de 3 webs por nicho.
- `src/lib/radar/outreach.ts`: mensaje distinto para web deficiente, `mailtoUrl` y hoja de visitas ampliada.
- `src/lib/radar/report.ts`: salud web y contacto en el informe imprimible.
- `src/lib/radar/osm.ts`: geocodificación por área (no por POI), expansión a radio 2.5 km, `gimnasios` con consultas extra (`gym`, `fitness`, `bodytech`, `crossfit`) y fallback a Overpass cuando Photon devuelve pocos.
- `src/lib/radar/__tests__/osm.test.ts`: pruebas de selección de zona, expansión y fallback Photon→Overpass.
- `src/app/api/radar/search/route.ts`: upsert de negocios también en búsquedas cacheadas (arregla site-scan con `skipped`) y aviso de zona/fallback.
- `prisma/schema.prisma` + `prisma/migrations/20261117180000_radar_site_scan`: tabla `radar_site_scans` y campos en `radar_businesses`.
- `docs/RADAR.md`, `.env.example`, `src/lib/radar/__tests__/siteScan.test.ts`, `package.json`.

## Verificación

- `npm test`: 26/26.
- `npx tsc --noEmit --types node`: OK.
- `npx eslint` sobre los archivos tocados: 0 errores (1 warning preexistente de `<img>`).
- `npm run lint` completo: 5 errores preexistentes en módulos ajenos (cotizaciones, finanzas, tareas, contrato); 0 en el Radar.
- `npm run build`: OK, ruta `/api/radar/site-scan` incluida.
- Escaneo real de `https://makeiteasycol.com`: `good`, 100/100, 2 emails verificados.
- Persistencia comprobada con `saveScan` + `getFreshScans` (fila temporal borrada).

## Prueba real Mazurén (2026-11-17)

Antes: `geocodeZone("Mazurén")` elegía una parada de bus con bbox de ~11 m; fast y exhaustive devolvían 0.
- Nominatim limit=10: primer resultado era `bus_stop`/`bus_station`; luego bloques `residential`.
- OSM API en una caja de ~2.8 × 2.2 km: 19 `leisure=fitness_centre`.
- Después del arreglo:
  - `searchOsm("Mazurén","gimnasios","","fast")`: **5 gimnasios** (Gimsipei, Fitness Factory, Bodytech ×3), zona `Mazurén · radio 2.5 km`, 4.5 s.
  - `searchOsm("Mazurén","gimnasios","","exhaustive")`: **35 gimnasios** (Hardbody 170, Smart Gym, Natura Spa Gym, Bodytech, etc.).
  - `searchOsm("Mazurén","restaurantes","","fast")`: **200** (Photon devolvió pocos y se completó con Overpass).
- Web real: Bodytech `weak` 60/100; Smart Fit `good` 78/100 con email verificado.
- Persistencia: fila temporal de Bodytech con `siteQuality=weak`, `siteGrade=60`; borrada después.
- Limitación: los gimnasios de Mazurén no tienen web en OSM, así que el filtro «web mala» no aplica ahí; sí aplica cuando la ficha trae URL.

## Deploy

- PR #7 `feat(radar): webs deficientes y geocodificacion por area`.
- Squash merge a `main`: `f84165e`.
- GitHub Actions `Deploy VPS Make It Easy` run `44170942042`: verde en 1m51s.
- Verificación pública: `/login` 200, `/radar` 307→login, `POST /api/radar/site-scan` 401 (ruta nueva activa), `POST /api/radar/search` 401.
- `scripts/deploy.sh` ejecuta `prisma migrate deploy` antes del build; la ruta nueva activa confirma que el build nuevo está desplegado.

## Pendientes

- Prueba funcional autenticada en producción (`Mazurén` + `Gimnasios`): el usuario debe entrar y confirmar 5/35.
- Probar «Analizar webs» en una ficha con URL.
- Configurar `PAGESPEED_API_KEY` si se quiere la captura y notas de velocidad.
- Fase 5: cohortes guardadas (debe tener / descarta / rango) y Google Places.
- Revisar falsos positivos del decisor en webs con cargos genéricos.

## Próximo paso

1. Crear rama `feature/radar-web-deficiente` y commit.
2. Deploy y prueba en producción con Bogotá/talleres.
3. Medir cuántas webs salen `bad`/`weak` y ajustar el umbral si hace falta.

## Comandos

```bash
npm test
npx tsc --noEmit --types node
npm run build
npx prisma migrate deploy
```
