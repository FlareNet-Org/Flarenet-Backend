-- CreateEnum
CREATE TYPE "FailedJobStatus" AS ENUM ('PENDING', 'RETRYING', 'RESOLVED', 'ESCALATED', 'DISCARDED');

-- CreateTable
CREATE TABLE "FailedJob" (
    "id" UUID NOT NULL,
    "queueName" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "deploymentId" UUID,
    "projectId" UUID,
    "errorMessage" TEXT NOT NULL,
    "failedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "FailedJobStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastProcessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FailedJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FailedJob_jobId_key" ON "FailedJob"("jobId");

-- CreateIndex
CREATE INDEX "FailedJob_queueName_idx" ON "FailedJob"("queueName");

-- CreateIndex
CREATE INDEX "FailedJob_status_idx" ON "FailedJob"("status");

-- AddForeignKey
ALTER TABLE "FailedJob" ADD CONSTRAINT "FailedJob_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FailedJob" ADD CONSTRAINT "FailedJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
