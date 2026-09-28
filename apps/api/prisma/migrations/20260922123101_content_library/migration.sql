-- CreateEnum
CREATE TYPE "LibraryCategory" AS ENUM ('ORGANIZATION', 'PROGRAMS', 'IMPACT', 'TEAM', 'FINANCE', 'POLICIES', 'OTHER');

-- CreateTable
CREATE TABLE "library_blocks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "LibraryCategory" NOT NULL DEFAULT 'OTHER',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "library_blocks_organizationId_category_idx" ON "library_blocks"("organizationId", "category");

-- AddForeignKey
ALTER TABLE "library_blocks" ADD CONSTRAINT "library_blocks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_blocks" ADD CONSTRAINT "library_blocks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
