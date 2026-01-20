/*
  Warnings:

  - Added the required column `assistantId` to the `Assistant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Assistant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Assistant` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "messageId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createTime" INTEGER NOT NULL,
    "status" INTEGER NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Assistant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assistantId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createTime" TEXT NOT NULL,
    "lastUpdateTime" TEXT NOT NULL,
    "chatMessageList" JSONB NOT NULL,
    "instruction" TEXT NOT NULL,
    "inputMaxTokens" INTEGER NOT NULL,
    "maxTokens" INTEGER NOT NULL,
    "contextSize" INTEGER NOT NULL,
    "status" INTEGER NOT NULL
);
INSERT INTO "new_Assistant" ("chatMessageList", "contextSize", "createTime", "id", "inputMaxTokens", "instruction", "lastUpdateTime", "maxTokens", "model", "name", "provider", "type") SELECT "chatMessageList", "contextSize", "createTime", "id", "inputMaxTokens", "instruction", "lastUpdateTime", "maxTokens", "model", "name", "provider", "type" FROM "Assistant";
DROP TABLE "Assistant";
ALTER TABLE "new_Assistant" RENAME TO "Assistant";
CREATE UNIQUE INDEX "Assistant_assistantId_key" ON "Assistant"("assistantId");
CREATE UNIQUE INDEX "Assistant_name_key" ON "Assistant"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Message_messageId_key" ON "Message"("messageId");
