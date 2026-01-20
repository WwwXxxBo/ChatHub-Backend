/*
  Warnings:

  - You are about to alter the column `createTime` on the `Assistant` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `lastUpdateTime` on the `Assistant` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `createTime` on the `Message` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.

*/
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
    "createTime" INTEGER NOT NULL,
    "lastUpdateTime" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "inputMaxTokens" INTEGER NOT NULL,
    "maxTokens" INTEGER NOT NULL,
    "contextSize" INTEGER NOT NULL,
    "status" INTEGER NOT NULL
);
INSERT INTO "new_Assistant" ("assistantId", "contextSize", "createTime", "id", "inputMaxTokens", "instruction", "lastUpdateTime", "maxTokens", "model", "name", "provider", "status", "type", "userId") SELECT "assistantId", "contextSize", "createTime", "id", "inputMaxTokens", "instruction", "lastUpdateTime", "maxTokens", "model", "name", "provider", "status", "type", "userId" FROM "Assistant";
DROP TABLE "Assistant";
ALTER TABLE "new_Assistant" RENAME TO "Assistant";
CREATE UNIQUE INDEX "Assistant_assistantId_key" ON "Assistant"("assistantId");
CREATE UNIQUE INDEX "Assistant_name_key" ON "Assistant"("name");
CREATE TABLE "new_Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "messageId" TEXT NOT NULL,
    "assistantId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createTime" INTEGER NOT NULL,
    "status" INTEGER NOT NULL
);
INSERT INTO "new_Message" ("assistantId", "content", "createTime", "id", "messageId", "role", "status", "type") SELECT "assistantId", "content", "createTime", "id", "messageId", "role", "status", "type" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE UNIQUE INDEX "Message_messageId_key" ON "Message"("messageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
