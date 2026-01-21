/*
  Warnings:

  - You are about to drop the `Collection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `collectionId` on the `Message` table. All the data in the column will be lost.
  - Added the required column `noteId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Collection_collectionId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Collection";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Note" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "noteId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createTime" BIGINT NOT NULL,
    "lastUpdateTime" BIGINT NOT NULL,
    "instruction" TEXT NOT NULL,
    "inputMaxTokens" INTEGER NOT NULL,
    "maxTokens" INTEGER NOT NULL,
    "contextSize" INTEGER NOT NULL,
    "status" INTEGER NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "messageId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "Note_noteId_key" ON "Note"("noteId");
