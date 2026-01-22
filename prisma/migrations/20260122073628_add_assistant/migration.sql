/*
  Warnings:

  - You are about to drop the column `assistantId` on the `NoteMessage` table. All the data in the column will be lost.
  - Added the required column `assistantId` to the `Note` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Note" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "noteId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createTime" BIGINT NOT NULL,
    "lastUpdateTime" BIGINT NOT NULL,
    "status" INTEGER NOT NULL
);
INSERT INTO "new_Note" ("comment", "content", "createTime", "id", "lastUpdateTime", "name", "noteId", "status", "type", "userId") SELECT "comment", "content", "createTime", "id", "lastUpdateTime", "name", "noteId", "status", "type", "userId" FROM "Note";
DROP TABLE "Note";
ALTER TABLE "new_Note" RENAME TO "Note";
CREATE UNIQUE INDEX "Note_noteId_key" ON "Note"("noteId");
CREATE TABLE "new_NoteMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "messageId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "createTime" BIGINT NOT NULL,
    "status" INTEGER NOT NULL
);
INSERT INTO "new_NoteMessage" ("content", "createTime", "id", "image", "messageId", "name", "noteId", "role", "status", "type") SELECT "content", "createTime", "id", "image", "messageId", "name", "noteId", "role", "status", "type" FROM "NoteMessage";
DROP TABLE "NoteMessage";
ALTER TABLE "new_NoteMessage" RENAME TO "NoteMessage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
