-- Verify isSuperAdmin exists in User table in production
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'User' AND column_name = 'isSuperAdmin';