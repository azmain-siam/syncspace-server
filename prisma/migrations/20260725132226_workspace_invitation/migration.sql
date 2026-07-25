-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "WorkspaceInvitation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvitation_tokenHash_key" ON "WorkspaceInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_workspaceId_idx" ON "WorkspaceInvitation"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_email_idx" ON "WorkspaceInvitation"("email");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_status_idx" ON "WorkspaceInvitation"("status");

-- AddForeignKey
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
