-- Radar de Clientes + propósito de agentes
-- SQLite

ALTER TABLE "agents" ADD COLUMN "proposito" TEXT NOT NULL DEFAULT 'personalizado';

CREATE INDEX "agents_proposito_idx" ON "agents"("proposito");

ALTER TABLE "leads" ADD COLUMN "radarPlaceId" TEXT;

CREATE INDEX "leads_radarPlaceId_idx" ON "leads"("radarPlaceId");

CREATE TABLE "radar_usage" (
    "month" TEXT NOT NULL PRIMARY KEY,
    "placesCalls" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
