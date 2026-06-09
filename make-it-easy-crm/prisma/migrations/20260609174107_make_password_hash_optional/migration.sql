-- CreateTable
CREATE TABLE "ai_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "baseUrl" TEXT,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "connectionId" TEXT NOT NULL,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" DATETIME NOT NULL,
    CONSTRAINT "agents_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ai_connections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "nombreContacto" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "valorEstimado" REAL NOT NULL DEFAULT 0,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" DATETIME NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notas" TEXT NOT NULL,
    "etapa" TEXT NOT NULL,
    "origenLead" TEXT NOT NULL DEFAULT 'Manual',
    "sector" TEXT,
    "numEmpleados" TEXT,
    "procesoAAutomatizar" TEXT,
    "planInteres" TEXT
);
INSERT INTO "new_leads" ("email", "empresa", "etapa", "fechaActualizacion", "fechaCreacion", "id", "nombreContacto", "notas", "numEmpleados", "planInteres", "procesoAAutomatizar", "sector", "telefono", "titulo", "valorEstimado") SELECT "email", "empresa", "etapa", "fechaActualizacion", "fechaCreacion", "id", "nombreContacto", "notas", "numEmpleados", "planInteres", "procesoAAutomatizar", "sector", "telefono", "titulo", "valorEstimado" FROM "leads";
DROP TABLE "leads";
ALTER TABLE "new_leads" RENAME TO "leads";
CREATE INDEX "leads_email_idx" ON "leads"("email");
CREATE INDEX "leads_fechaCreacion_idx" ON "leads"("fechaCreacion");
CREATE TABLE "new_usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'ventas',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" DATETIME NOT NULL
);
INSERT INTO "new_usuarios" ("activo", "email", "fechaActualizacion", "fechaCreacion", "id", "nombre", "passwordHash", "rol") SELECT "activo", "email", "fechaActualizacion", "fechaCreacion", "id", "nombre", "passwordHash", "rol" FROM "usuarios";
DROP TABLE "usuarios";
ALTER TABLE "new_usuarios" RENAME TO "usuarios";
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
