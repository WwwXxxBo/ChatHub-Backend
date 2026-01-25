/*
  Warnings:

  - You are about to drop the column `apiKey` on the `Setting` table. All the data in the column will be lost.
  - You are about to drop the column `apiSecret` on the `Setting` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `Setting` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `Setting` table. All the data in the column will be lost.
  - You are about to drop the column `textType` on the `Setting` table. All the data in the column will be lost.
  - You are about to alter the column `theme` on the `Setting` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `customTheme` to the `Setting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fontSize` to the `Setting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `locale` to the `Setting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `settingId` to the `Setting` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "settingId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "theme" INTEGER NOT NULL,
    "customTheme" TEXT NOT NULL,
    "fontSize" INTEGER NOT NULL,
    "locale" TEXT NOT NULL
);
INSERT INTO "new_Setting" ("id", "theme", "userId") SELECT "id", "theme", "userId" FROM "Setting";
DROP TABLE "Setting";
ALTER TABLE "new_Setting" RENAME TO "Setting";
CREATE UNIQUE INDEX "Setting_settingId_key" ON "Setting"("settingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
