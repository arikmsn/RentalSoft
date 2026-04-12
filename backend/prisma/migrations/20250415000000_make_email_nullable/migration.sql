-- Make User.email nullable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Handle existing NULL values if any
UPDATE "User" SET "email" = '' WHERE "email" IS NULL AND username IS NOT NULL;