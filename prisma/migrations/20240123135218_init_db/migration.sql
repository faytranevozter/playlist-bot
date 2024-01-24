-- CreateTable
CREATE TABLE "Queue" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SearchResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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

-- CreateIndex
CREATE UNIQUE INDEX "Queue_musicID_key" ON "Queue"("musicID");

-- CreateIndex
CREATE UNIQUE INDEX "SearchResult_musicID_key" ON "SearchResult"("musicID");
