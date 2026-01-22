/*
  Warnings:

  - You are about to drop the column `noteId` on the `Message` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "NoteMessage" (
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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "messageId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "createTime" BIGINT NOT NULL,
    "status" INTEGER NOT NULL
);
INSERT INTO "new_Message" ("assistantId", "content", "createTime", "id", "image", "messageId", "name", "role", "status", "type") SELECT "assistantId", "content", "createTime", "id", "image", "messageId", "name", "role", "status", "type" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE UNIQUE INDEX "Message_messageId_key" ON "Message"("messageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "NoteMessage_messageId_key" ON "NoteMessage"("messageId");
