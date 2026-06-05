# Vibrand CRM

CRM interno de Vibrand para gestión de leads, cotizaciones, proyectos y órdenes de producción.

## Stack

- **Framework**: Next.js 16 (App Router)
- **Base de datos**: SQLite (desarrollo) / PostgreSQL (producción)
- **ORM**: Prisma
- **Auth**: JWT con `jose` + cookies HttpOnly
- **Estado**: Zustand
- **UI**: Tailwind CSS + lucide-react

---

## Desarrollo local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` y completar:

```env
AUTH_SECRET="genera-una-clave-aleatoria-larga"
DATABASE_URL="file:./prisma/dev.db"
```

Generar un `AUTH_SECRET` seguro:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Crear la base de datos y ejecutar migraciones

```bash
npx prisma migrate dev
```

### 4. Crear usuarios iniciales (seed)

```bash
npm run seed
```

Credenciales iniciales:
- **Admin**: `admin@vibrand.com` / `vibrand-admin-2026`
- **Ventas**: `ventas@vibrand.com` / `vibrand-ventas-2026`

> Cambiar las contraseñas después del primer login en Ajustes → Gestión de Personal.

### 5. Iniciar servidor de desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3001](http://localhost:3001).

---

## Despliegue en producción (VPS con PM2 + Nginx)

### 1. Clonar el repositorio

```bash
git clone <repo-url> vibrand-crm
cd vibrand-crm
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con valores de producción:

```env
AUTH_SECRET="clave-secreta-larga-y-aleatoria"
DATABASE_URL="postgresql://user:pass@localhost:5432/vibrand_crm"
NODE_ENV="production"
```

### 3. Migración a PostgreSQL

Para producción se recomienda PostgreSQL. Usar el schema de producción:

```bash
# Aplicar migraciones en PostgreSQL
npx prisma migrate deploy --schema=prisma/schema.production.prisma

# Generar cliente Prisma para PostgreSQL
npx prisma generate --schema=prisma/schema.production.prisma
```

Para desarrollo local con PostgreSQL (opcional, requiere Docker):

```bash
docker compose up -d
# DATABASE_URL="postgresql://vibrand:vibrand_dev@localhost:5432/vibrand_crm"
```

### 4. Ejecutar seed en producción

```bash
npm run seed
```

### 5. Build y start con PM2

```bash
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 6. Verificar

```bash
pm2 status
pm2 logs vibrand-crm
```

---

## Configuración Nginx (reverse proxy con HTTPS)

```nginx
# /etc/nginx/sites-available/vibrand

# Redirigir HTTP → HTTPS
server {
    listen 80;
    server_name vibrand.com www.vibrand.com crm.vibrand.com;
    return 301 https://$host$request_uri;
}

# Sitio web público (vibrand-web en :3000)
server {
    listen 443 ssl;
    server_name vibrand.com www.vibrand.com;

    ssl_certificate /etc/letsencrypt/live/vibrand.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vibrand.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}

# CRM interno (vibrand-crm en :3001)
server {
    listen 443 ssl;
    server_name crm.vibrand.com;

    ssl_certificate /etc/letsencrypt/live/crm.vibrand.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.vibrand.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activar y recargar:
```bash
sudo ln -s /etc/nginx/sites-available/vibrand /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Certificados SSL con Certbot:
```bash
sudo certbot --nginx -d vibrand.com -d www.vibrand.com
sudo certbot --nginx -d crm.vibrand.com
```

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Iniciar servidor de producción |
| `npm run seed` | Crear usuarios iniciales en la DB |
| `npm run lint` | Linter ESLint |
