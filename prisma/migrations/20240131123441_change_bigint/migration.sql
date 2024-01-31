/*
  Warnings:

  - The primary key for the `SearchResult` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `SearchResult` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SearchResult" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "musicID" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "album" TEXT,
    "duration" TEXT NOT NULL,
    "duration_second" INTEGER NOT NULL DEFAULT 0,
    "total_play" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SearchResult" ("album", "artist", "createdAt", "duration", "duration_second", "id", "musicID", "thumbnail", "title", "total_play", "updatedAt") SELECT "album", "artist", "createdAt", "duration", "duration_second", "id", "musicID", "thumbnail", "title", "total_play", "updatedAt" FROM "SearchResult";
DROP TABLE "SearchResult";
ALTER TABLE "new_SearchResult" RENAME TO "SearchResult";
CREATE UNIQUE INDEX "SearchResult_musicID_key" ON "SearchResult"("musicID");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
