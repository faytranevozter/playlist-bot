/*
  Warnings:

  - Added the required column `telegramUserID` to the `Queue` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "TelegramUser" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "username" TEXT,
    "name" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Queue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "musicID" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "album" TEXT,
    "duration" TEXT NOT NULL,
    "duration_second" INTEGER NOT NULL DEFAULT 0,
    "total_play" TEXT NOT NULL,
    "playedAt" DATETIME,
    "finishedAt" DATETIME,
    "isPlaying" BOOLEAN NOT NULL DEFAULT false,
    "telegramUserID" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "year" TEXT,
    CONSTRAINT "Queue_telegramUserID_fkey" FOREIGN KEY ("telegramUserID") REFERENCES "TelegramUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Queue" ("album", "artist", "createdAt", "duration", "duration_second", "finishedAt", "id", "isPlaying", "musicID", "playedAt", "thumbnail", "title", "total_play", "updatedAt", "year") SELECT "album", "artist", "createdAt", "duration", "duration_second", "finishedAt", "id", "isPlaying", "musicID", "playedAt", "thumbnail", "title", "total_play", "updatedAt", "year" FROM "Queue";
DROP TABLE "Queue";
ALTER TABLE "new_Queue" RENAME TO "Queue";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
