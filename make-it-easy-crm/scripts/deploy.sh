#!/usr/bin/env bash
# Deploy seguro del CRM (Make it Easy)
# - Sincroniza el código que publica GitHub Actions en el webroot (SKIP_SYNC=1 lo omite).
# - Nunca toca .env, la base de datos ni los datos de usuario.
# - Rebuild con Turbopack + salida standalone y reload de pm2 (zero-downtime).
set -euo pipefail

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

command -v node >/dev/null 2>&1 || { echo "[deploy] ERROR: node no está en PATH"; exit 1; }

APP=/var/www/apps/mie-crm
SRC=/var/www/html/makeiteasy/make-it-easy-crm

cd "$APP"

echo "[deploy] $(date -Iseconds) | node $(node -v) | $(pwd)"

if [ "${SKIP_SYNC:-0}" != "1" ] && [ -d "$SRC/src" ]; then
  echo "[deploy] Sincronizando código desde $SRC"
  rsync -a --delete "$SRC/src/" "$APP/src/"
  rsync -a "$SRC/prisma/schema.prisma" "$APP/prisma/schema.prisma"
  if [ -d "$SRC/prisma/migrations" ]; then
    rsync -a "$SRC/prisma/migrations/" "$APP/prisma/migrations/"
  fi
  for f in package.json next.config.ts postcss.config.mjs tsconfig.json; do
    if [ -f "$SRC/$f" ]; then rsync -a "$SRC/$f" "$APP/$f"; fi
  done
else
  echo "[deploy] Sync de código omitido, se usa el código local de $APP"
fi

echo "[deploy] Instalando dependencias"
# --include=dev es obligatorio: el webhook corre con NODE_ENV=production y
# sin esto npm omite typescript/tailwind y el build falla.
NODE_ENV=development npm install --include=dev --no-audit --no-fund --loglevel=error

echo "[deploy] Prisma generate + migrate"
npx prisma generate
npx prisma migrate deploy

echo "[deploy] Build"
# El build se ejecuta con entorno limpio: si hereda las variables del proceso
# de Next (cuando lo dispara /api/deploy) `next build` falla.
set -a
# shellcheck disable=SC1090
. "$APP/.env"
set +a
env -i \
  HOME="$HOME" \
  PATH="$PATH" \
  TMPDIR="${TMPDIR:-/tmp}" \
  NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  DATABASE_URL="${DATABASE_URL:-}" \
  AUTH_SECRET="${AUTH_SECRET:-}" \
  npm run build

echo "[deploy] Preparando standalone"
rm -rf "$APP/.next/standalone/.next/static"
cp -r "$APP/.next/static" "$APP/.next/standalone/.next/"
mkdir -p "$APP/.next/standalone/public"
cp -r "$APP/public/." "$APP/.next/standalone/public/"

echo "[deploy] Reload pm2"
pm2 reload "$APP/ecosystem.config.js" --update-env || pm2 restart "$APP/ecosystem.config.js" --update-env

echo "[deploy] COMPLETADO $(date -Iseconds)"
