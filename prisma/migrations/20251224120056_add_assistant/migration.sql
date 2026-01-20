/*
  Warnings:

  - You are about to drop the column `chatMessageList` on the `Assistant` table. All the data in the column will be lost.

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
    "createTime" TEXT NOT NULL,
    "lastUpdateTime" TEXT NOT NULL,
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
