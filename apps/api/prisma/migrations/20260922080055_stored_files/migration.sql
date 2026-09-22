-- CreateTable
CREATE TABLE "stored_files" (
    "key" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contentType" TEXT,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "stored_files_organizationId_idx" ON "stored_files"("organizationId");

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
