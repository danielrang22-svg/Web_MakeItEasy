# CRM Make It Easy

CRM interno de Make It Easy para prospección (Radar), leads, pipeline, cotizaciones, compras, proyectos, facturación y reportes.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Prisma 5.11 sobre SQLite (desarrollo y producción en este proyecto)
- Tailwind CSS 4 + lucide-react
- Auth propia con JWT (`jose`) y cookie HttpOnly `mie-auth`
- Estado de UI con Zustand

## Módulos

| Módulo | Ruta |
|---|---|
| Radar de prospección | `/radar` |
| Leads | `/leads` |
| Pipeline | `/kanban` |
| Contactos y empresas | `/contactos`, `/empresas` |
| Cotizaciones | `/cotizaciones` |
| Compras | `/compras` |
| Productos y proveedores | `/productos`, `/proveedores` |
| Proyectos y tareas | `/proyectos` |
| Facturas y finanzas | `/facturas`, `/reportes` |
| Comerciales | `/vendedores` |
| Ajustes (usuarios, agentes IA, conexiones) | `/ajustes` |

## Puesta en marcha

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run seed
npm run dev
```

Abrir `http://localhost:3000`. Las cuentas iniciales se definen en `prisma/seed.ts`; cambia las contraseñas después del primer acceso.

## Variables de entorno

| Variable | Uso | Obligatoria |
|---|---|---|
| `DATABASE_URL` | Ruta de SQLite (`file:./dev.db`) | Sí |
| `AUTH_SECRET` | Firma de las cookies JWT | Sí |
| `AI_KEYS_SECRET` | Cifrado de API keys guardadas (si falta usa `AUTH_SECRET`) | Recomendada |
| `PORT` | Puerto de `npm run start` | No |
| `NEXT_PUBLIC_APP_URL` | URL pública del CRM | No |
| `OPENAI_API_KEY` | Fallback de IA si no hay agentes configurados | No |
| `OPENAI_MODEL` | Modelo del fallback (por defecto `gpt-4o-mini`) | No |
| `PAGESPEED_API_KEY` | Notas de velocidad y captura en la ficha del Radar | No |
| `RADAR_COUNTRY` | País ISO-2 para geocodificar zonas (por defecto `co`) | No |
| `GITHUB_TOKEN`, `DEPLOY_WEBHOOK_SECRET`, `APP_DIR` | Auto-deploy | No |

Nunca subas `.env` al repositorio.

## Radar de prospección

- Búsqueda gratuita con OpenStreetMap: Photon como fuente principal, Overpass como respaldo y Nominatim para la zona y los datos de contacto.
- Caché en servidor de 6 horas por búsqueda y 30 días por zona.
- Filtro por el polígono real del municipio, 14 nichos predefinidos y búsqueda libre.
- Puntuación de oportunidad explicada (web propia, red social, sin web, teléfono, dirección, horario).
- Ficha con PageSpeed opcional, auditoría SEO de 38 comprobaciones y análisis con IA.
- Borradores de llamada, WhatsApp y correo con tres tonos.
- Mis leads en el servidor (por usuario, con estado, notas y próxima acción) y envío al CRM con deduplicación por `radarPlaceId`.
- Cada usuario ve solo sus leads; un administrador puede consultar todos con `?scope=all`.

### Configurar IA y PageSpeed

- IA: Ajustes → Agentes y APIs, con propósito `radar`. Si no hay agente, se usa `OPENAI_API_KEY`.
- PageSpeed: crear una API key gratuita (sin facturación) en Google Cloud, habilitar PageSpeed Insights API y añadir `PAGESPEED_API_KEY` al `.env` del servidor.
- País: `RADAR_COUNTRY` permite cambiar el país de búsqueda sin tocar código.

### Limitaciones conocidas

- OpenStreetMap no tiene reseñas ni valoraciones: los filtros de rating no aplican.
- "Sin web" proviene de OSM y conviene verificarlo antes de contactar.
- Photon tiene menos cobertura que Google Places en municipios pequeños.
- Los análisis, fichas y ajustes de vendedor se guardan en el navegador; los leads son multiusuario.
- La captura de PageSpeed no se persiste en `localStorage` para no agotar la cuota.

## Base de datos

- SQLite con migraciones versionadas en `prisma/migrations`.
- Desarrollo: `npx prisma migrate dev`.
- Despliegue: `npx prisma migrate deploy`.
- No usar features exclusivas de PostgreSQL.

## Despliegue

- Push a `main` → GitHub Actions sincroniza el repositorio a `/var/www/html/makeiteasy`.
- El webhook `/api/deploy` ejecuta `scripts/deploy.sh`: migraciones, build standalone y `pm2 reload`.
- PM2 sirve `mie-crm` en `127.0.0.1:3011`; nginx publica `crm.makeiteasycol.com`.
- El CRM no se publica en el webroot estático del sitio.

## Calidad

```bash
npm run lint
npm test
npx tsc --noEmit
```

Tests del Radar con `node:test` + `tsx` (puntuación, clasificación de webs, estados y cuota de `localStorage`).
