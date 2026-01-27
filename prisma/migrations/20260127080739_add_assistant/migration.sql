/*
  Warnings:

  - Added the required column `duration` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Video" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "videoId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "coverUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "tags" TEXT,
    "difficulty" TEXT,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "uploadTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleteTime" DATETIME,
    "status" INTEGER NOT NULL
);
INSERT INTO "new_Video" ("bucket", "coverUrl", "deleteTime", "difficulty", "fileName", "id", "metadata", "mimeType", "originalName", "size", "status", "tags", "thumbnailUrl", "uploadTime", "url", "userId", "videoId") SELECT "bucket", "coverUrl", "deleteTime", "difficulty", "fileName", "id", "metadata", "mimeType", "originalName", "size", "status", "tags", "thumbnailUrl", "uploadTime", "url", "userId", "videoId" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
CREATE UNIQUE INDEX "Video_videoId_key" ON "Video"("videoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
