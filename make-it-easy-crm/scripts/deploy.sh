#!/usr/bin/env bash
# Deploy seguro del CRM (Make it Easy)
# - Sincroniza el código que publica GitHub Actions en el webroot.
# - Nunca toca .env, la base de datos ni los datos de usuario.
# - Rebuild con Turbopack + salida standalone y reload de pm2 (zero-downtime).
set -euo pipefail

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

APP=/var/www/apps/mie-crm
SRC=/var/www/html/makeiteasy/make-it-easy-crm

cd "$APP"

if [ -d "$SRC/src" ]; then
  echo "[deploy] Sincronizando código desde $SRC"
  rsync -a --delete "$SRC/src/" "$APP/src/"
  rsync -a "$SRC/prisma/schema.prisma" "$APP/prisma/schema.prisma"
  if [ -d "$SRC/prisma/migrations" ]; then
    rsync -a "$SRC/prisma/migrations/" "$APP/prisma/migrations/"
  fi
  for f in package.json next.config.ts postcss.config.mjs tsconfig.json; do
    [ -f "$SRC/$f" ] && rsync -a "$SRC/$f" "$APP/$f"
  done
else
  echo "[deploy] Aviso: no hay código en $SRC, se usa el actual"
fi

echo "[deploy] Instalando dependencias"
npm install --no-audit --no-fund --loglevel=error

echo "[deploy] Prisma generate + migrate"
npx prisma generate
npx prisma migrate deploy

echo "[deploy] Build"
NEXT_TELEMETRY_DISABLED=1 npm run build

echo "[deploy] Preparando standalone"
rm -rf "$APP/.next/standalone/.next/static"
cp -r "$APP/.next/static" "$APP/.next/standalone/.next/"
mkdir -p "$APP/.next/standalone/public"
cp -r "$APP/public/." "$APP/.next/standalone/public/"

echo "[deploy] Reload pm2"
pm2 reload "$APP/ecosystem.config.js" --update-env || pm2 restart "$APP/ecosystem.config.js" --update-env

echo "[deploy] COMPLETADO $(date -Iseconds)"
