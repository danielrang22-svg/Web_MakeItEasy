-- AlterTable
ALTER TABLE "radar_businesses" ADD COLUMN "siteQuality" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "radar_businesses" ADD COLUMN "siteGrade" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "radar_businesses" ADD COLUMN "siteCheckedAt" DATETIME;
ALTER TABLE "radar_businesses" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "radar_businesses" ADD COLUMN "emailStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "radar_businesses" ADD COLUMN "contactName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "radar_businesses" ADD COLUMN "contactRole" TEXT NOT NULL DEFAULT '';
ALTER TABLE "radar_businesses" ADD COLUMN "enrichedAt" DATETIME;

-- CreateTable
CREATE TABLE "radar_site_scans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "radarPlaceId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "finalUrl" TEXT,
    "status" INTEGER,
    "ms" INTEGER NOT NULL DEFAULT 0,
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "quality" TEXT NOT NULL DEFAULT 'unknown',
    "grade" INTEGER NOT NULL DEFAULT 0,
    "signalsJson" TEXT NOT NULL,
    "contactsJson" TEXT NOT NULL,
    "emailChecksJson" TEXT NOT NULL,
    "placeholder" BOOLEAN NOT NULL DEFAULT false,
    "freeHosting" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "radar_businesses_siteQuality_idx" ON "radar_businesses"("siteQuality");

-- CreateIndex
CREATE INDEX "radar_site_scans_radarPlaceId_createdAt_idx" ON "radar_site_scans"("radarPlaceId", "createdAt");

-- CreateIndex
CREATE INDEX "radar_site_scans_userEmail_createdAt_idx" ON "radar_site_scans"("userEmail", "createdAt");

-- CreateIndex
CREATE INDEX "radar_site_scans_createdAt_idx" ON "radar_site_scans"("createdAt");
