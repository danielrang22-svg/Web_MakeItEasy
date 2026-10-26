-- Radar de clientes multiusuario

CREATE TABLE "radar_leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'NUEVO',
    "notes" TEXT NOT NULL DEFAULT '',
    "nextActionAt" DATETIME,
    "business" TEXT NOT NULL,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "radar_leads_ownerEmail_businessId_key" ON "radar_leads"("ownerEmail", "businessId");
CREATE INDEX "radar_leads_ownerEmail_idx" ON "radar_leads"("ownerEmail");
CREATE INDEX "radar_leads_businessId_idx" ON "radar_leads"("businessId");
CREATE INDEX "radar_leads_fechaActualizacion_idx" ON "radar_leads"("fechaActualizacion");
