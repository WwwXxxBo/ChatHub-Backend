/*
  Warnings:

  - Added the required column `title` to the `Note` table without a default value. This is not possible if the table is not empty.

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
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createTime" BIGINT NOT NULL,
    "lastUpdateTime" BIGINT NOT NULL,
    "status" INTEGER NOT NULL
);
INSERT INTO "new_Note" ("assistantId", "comment", "content", "createTime", "id", "lastUpdateTime", "name", "noteId", "status", "type", "userId") SELECT "assistantId", "comment", "content", "createTime", "id", "lastUpdateTime", "name", "noteId", "status", "type", "userId" FROM "Note";
DROP TABLE "Note";
ALTER TABLE "new_Note" RENAME TO "Note";
CREATE UNIQUE INDEX "Note_noteId_key" ON "Note"("noteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
