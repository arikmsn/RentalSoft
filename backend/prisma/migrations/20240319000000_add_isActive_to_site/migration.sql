-- Add "isActive" column
ALTER TABLE "Site" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
