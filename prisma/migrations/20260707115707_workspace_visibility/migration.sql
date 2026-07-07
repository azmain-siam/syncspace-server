-- CreateEnum
CREATE TYPE "WorkspaceVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "description" TEXT,
ADD COLUMN     "visibility" "WorkspaceVisibility" NOT NULL DEFAULT 'PRIVATE';
