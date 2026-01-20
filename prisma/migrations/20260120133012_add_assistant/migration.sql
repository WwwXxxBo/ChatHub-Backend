/*
  Warnings:

  - Added the required column `image` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL,
    "textType" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "theme" TEXT NOT NULL
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
INSERT INTO "new_Message" ("assistantId", "content", "createTime", "id", "messageId", "role", "status", "type") SELECT "assistantId", "content", "createTime", "id", "messageId", "role", "status", "type" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE UNIQUE INDEX "Message_messageId_key" ON "Message"("messageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
