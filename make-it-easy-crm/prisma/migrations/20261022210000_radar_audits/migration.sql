-- Historial de auditorías SEO de Radar
-- SQLite

CREATE TABLE "radar_audits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "radarPlaceId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "url" TEXT,
    "globalScore" INTEGER NOT NULL,
    "potentialScore" INTEGER NOT NULL,
    "areaScores" TEXT NOT NULL,
    "checksJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "radar_audits_radarPlaceId_idx" ON "radar_audits"("radarPlaceId");
CREATE INDEX "radar_audits_createdAt_idx" ON "radar_audits"("createdAt");
