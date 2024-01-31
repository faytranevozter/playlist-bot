/*
  Warnings:

  - You are about to alter the column `chatID` on the `Subscriber` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Subscriber" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chatID" INTEGER NOT NULL,
    "username" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Subscriber" ("chatID", "createdAt", "id", "name", "type", "updatedAt", "username") SELECT "chatID", "createdAt", "id", "name", "type", "updatedAt", "username" FROM "Subscriber";
DROP TABLE "Subscriber";
ALTER TABLE "new_Subscriber" RENAME TO "Subscriber";
CREATE UNIQUE INDEX "Subscriber_chatID_key" ON "Subscriber"("chatID");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
