/*
  Warnings:

  - Added the required column `providerId` to the `Provider` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Provider" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "providerId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL
);
INSERT INTO "new_Provider" ("apiKey", "apiSecret", "id", "provider", "userId") SELECT "apiKey", "apiSecret", "id", "provider", "userId" FROM "Provider";
DROP TABLE "Provider";
ALTER TABLE "new_Provider" RENAME TO "Provider";
CREATE UNIQUE INDEX "Provider_providerId_key" ON "Provider"("providerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
