/*
  Warnings:

  - A unique constraint covering the columns `[gitUrl]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Deployment" ALTER COLUMN "environment" SET DEFAULT 'DEVELOPMENT',
ALTER COLUMN "url" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_gitUrl_key" ON "Project"("gitUrl");
