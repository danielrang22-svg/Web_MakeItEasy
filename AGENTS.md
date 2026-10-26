# AGENTS.md — Web_MakeItEasy
# Make It Easy | Vibe Forge V1.7 | Tool-agnostic
<!-- GENERADO el 2026-10-26 a partir del stack detectado (package.json / prisma / docs).
     REVISAR: si el stack o el deploy cambian, actualizar este archivo y volver a correr
     sync-reglas-proyecto.ps1 -Opcionales para regenerar los espejos. -->

## IDENTIDAD
- Proyecto: Web_MakeItEasy
- Objetivo: Sitio público de Make It Easy y CRM interno (leads, cotizaciones, Radar de prospección).
- Agencia: Make It Easy | Arquitecto: Daniel (Vibrand)
- Perfil de la guía: D (sitio estático) + A (CRM Next.js)
- Stack: HTML/CSS/JS estático + Tailwind (raíz) · CRM: Next.js 16 + React 19 + TypeScript + Prisma 5.11 + SQLite + Tailwind

## ORDEN DE LECTURA
1. Guía maestra V1.5 §0.11 (perfil) y §0.12 (sesiones).
2. `_SESIONES/00_ESTADO_ACTUAL.md` + última sesión de `_SESIONES/_INDICE.md`.
3. `_BLUEPRINT/PLAN_DE_TRABAJO.md` (pendientes) y el blueprint que aplique.
4. `_CONTEXTO/CONVENCIONES.md` si existe.
5. Declarar: Contexto recuperado / Voy a / No tocaré.

## ARQUITECTURA
- Capas: `index.html`, páginas públicas, `public/`, `i18n/` (sitio) · `make-it-easy-crm/src/data|logic|ui` + `prisma/` (CRM)

## DATOS Y AUTH
- CRM: Prisma + SQLite (`DATABASE_URL`, `prisma/dev.db`); migraciones en `make-it-easy-crm/prisma/migrations`. Sitio: sin DB.
- CRM: login propio con sesión; no Supabase. Sitio: sin auth.

## REGLAS DE CÓDIGO
- TypeScript estricto cuando aplique: sin `any`, tipos explícitos.
- Validación de inputs externos antes de tocar datos (Zod/Pydantic/rules según stack).
- Funciones ≤30 líneas, componentes ≤200 líneas, una responsabilidad.
- Manejo de errores explícito; errores de API con status correcto (400/401/403/404/500).
- Variables de entorno, nunca valores hardcodeados.

## DISEÑO
- Sí (sitio y CRM). SEO obligatorio en el sitio (seo-audit), Core Web Vitals y metadata.

## DEPLOY
- VPS Hostinger + nginx + PM2 (`mie-crm` en 127.0.0.1:3011) + GitHub Actions (rsync + webhook). Ver `docs/CRM.md` y `deploy/`.

## REGLAS ESPECÍFICAS DE ESTE PROYECTO
- El sitio estático y el CRM son artefactos distintos: `make-it-easy-crm/` NO se publica en el webroot público.
- SQLite: no usar features exclusivas de Postgres. Cambios de schema con migración versionada.
- Radar usa APIs externas gratuitas (Photon/Nominatim/Overpass/PageSpeed): manejar rate limits y caché.

## ARRANQUE
- Estructura creada con `~/.agents/bin/bootstrap-proyecto.ps1`; espejos regenerados con `sync-reglas-proyecto.ps1 -Opcionales`.

## NULCLAW / NULLHUB (INTEGRACIÓN DE AGENTES)
- Si el proyecto integra agentes, bots, automatizaciones, NullHub, n8n o el CRM: ANTES de diseñar, leer `C:\Users\USUARIO\OneDrive\Documentos\nulclaw\README.md` y la guía que aplique.
- Guías: `NullHub_Setup_Guide.md`, `NullHub_Agency_Guide.md`, `Guia_Agente_Web_Sitio.md`, `Make_It_Easy_N8N_Guide.md`, `guia_integracion_vibrand_crm.md`, `NullHub_Monitoreo_Alertas.md`.
- Una carpeta/instancia por cliente; no mezclar credenciales ni `memory.db`.
- PROHIBIDO `pkill nullclaw` o borrar `memory.db`. Reiniciar con `nullhub api POST /api/instances/nullclaw/<instancia>/restart`.
- Credenciales solo en NullHub/.env o gestor de secretos; nunca en el repo ni en `_SESIONES`.

## SESIONES (OBLIGATORIO — guía §0.12)
- Al iniciar: leer `_SESIONES/00_ESTADO_ACTUAL.md` y la última entrada de `_SESIONES/_INDICE.md`.
- Al cerrar o en cada cambio significativo: actualizar archivo de sesión, estado e índice.
- Formato: objetivo, decisiones, cambios por archivo, pendientes, próximo paso, comandos.
- Sin secretos ni valores de `.env`. Historial append-only. Máximo ~150 líneas por archivo.
- Si el estado contradice el código/tests, gana el código y se corrige el estado.

## GITHUB
- Nunca commitear en `main` directamente. Ramas: feature/, bugfix/, chore/, hotfix/, security/.
- Commits en Conventional Commits (feat:, fix:, security:, test:, docs:).
- PR con descripción, módulos afectados y checklist.

## PROHIBICIONES ABSOLUTAS
- No hardcodear API keys, URLs ni configuración.
- No entregar código con `console.log` de depuración, TODOs sin resolver o `any`.
- No cambiar el stack ni agregar librerías sin aprobación en `_BLUEPRINT/STACK_DECISIONES.md`.
- No saltar validación de inputs ni checks de auth.
- No escribir secretos en `_SESIONES` ni en el repositorio.

## FLUJO DE TRABAJO
1. Leer este AGENTS.md + `_BLUEPRINT/STACK_DECISIONES.md`.
2. Leer `_SESIONES/00_ESTADO_ACTUAL.md` + PRD/SCHEMA si aplica.
3. Construir en orden: data → logic → ui.
4. Limpiar (sin logs, código muerto ni imports sin usar) y correr lint/typecheck/tests.
5. Verificar con el checklist §8 de la guía maestra y cerrar sesión.

## SKILLS
- UI: ckw-design, frontend-design, web-design-guidelines, tailwind-patterns.
- Front/Next: react-best-practices, nextjs-best-practices, nextjs-app-router-patterns.
- Backend/API: api-patterns, nodejs-best-practices, api-security-best-practices.
- Datos: database-design, postgres-best-practices, prisma-expert.
- Tests: test-driven-development, vitest, playwright-best-practices.
- Seguridad: security-audit, top-web-vulnerabilities. SEO: seo-audit. Sitios: clone-website.

## CONTEXT-MODE (obligatorio)
Usar `ctx_execute`, `ctx_execute_file`, `ctx_search`, `ctx_batch_execute`, `ctx_fetch_and_index` e `ctx_index` para no quemar tokens. Reglas completas: `~/.agents/reglas/GLOBAL.md`.