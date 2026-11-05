-- CreateTable
CREATE TABLE "NarrationClip" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "voice" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "chars" INTEGER NOT NULL,
    "mime" TEXT NOT NULL,
    "audio" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NarrationClip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NarrationClip_hash_key" ON "NarrationClip"("hash");

-- CreateIndex
CREATE INDEX "NarrationClip_createdAt_idx" ON "NarrationClip"("createdAt");

