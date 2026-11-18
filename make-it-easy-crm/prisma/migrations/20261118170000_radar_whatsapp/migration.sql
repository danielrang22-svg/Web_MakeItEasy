-- AlterTable
ALTER TABLE "radar_businesses" ADD COLUMN "whatsappKind" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "radar_businesses" ADD COLUMN "whatsappProvider" TEXT NOT NULL DEFAULT '';
ALTER TABLE "radar_businesses" ADD COLUMN "whatsappConfidence" TEXT NOT NULL DEFAULT '';
ALTER TABLE "radar_businesses" ADD COLUMN "whatsappEvidence" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "radar_businesses" ADD COLUMN "whatsappNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "radar_businesses" ADD COLUMN "whatsappCheckedAt" DATETIME;

-- AlterTable
ALTER TABLE "radar_site_scans" ADD COLUMN "whatsappJson" TEXT NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "radar_leads" ADD COLUMN "whatsappVerified" TEXT NOT NULL DEFAULT '';
ALTER TABLE "radar_leads" ADD COLUMN "whatsappNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "radar_leads" ADD COLUMN "whatsappVerifiedAt" DATETIME;

-- CreateIndex
CREATE INDEX "radar_businesses_whatsappKind_idx" ON "radar_businesses"("whatsappKind");
