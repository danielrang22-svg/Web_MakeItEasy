-- Limite, cache persistente y almacenamiento de negocios de Radar
-- SQLite

CREATE TABLE "radar_businesses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "websiteKind" TEXT NOT NULL DEFAULT 'none',
    "source" TEXT NOT NULL DEFAULT 'osm',
    "score" INTEGER NOT NULL DEFAULT 0,
    "payload" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenCount" INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX "radar_businesses_externalId_key" ON "radar_businesses"("externalId");
CREATE INDEX "radar_businesses_category_idx" ON "radar_businesses"("category");
CREATE INDEX "radar_businesses_lastSeenAt_idx" ON "radar_businesses"("lastSeenAt");

CREATE TABLE "radar_searches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zoneKey" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "newCount" INTEGER NOT NULL,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "userEmail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "radar_searches_createdAt_idx" ON "radar_searches"("createdAt");
CREATE INDEX "radar_searches_userEmail_createdAt_idx" ON "radar_searches"("userEmail", "createdAt");

CREATE TABLE "radar_search_cache" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "payload" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "radar_search_cache_expiresAt_idx" ON "radar_search_cache"("expiresAt");
