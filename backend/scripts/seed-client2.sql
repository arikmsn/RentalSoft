-- Phase 7: Seed second tenant "client2" and demo users
-- Run: npx prisma db execute --sql "$(cat scripts/seed-client2.sql)"
-- Or paste into PostgreSQL query tool

-- 1. Create second tenant "client2"
INSERT INTO "Tenant" (id, name, slug, "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  'Client 2',
  'client2',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Tenant" WHERE slug = 'client2');

-- 2. Create manager2 user for client2 (password: demo123)
INSERT INTO "User" (id, name, email, password, role, "isActive", "createdAt", "updatedAt", username, "isSuperAdmin")
SELECT 
  gen_random_uuid(),
  'Client2 Manager',
  'manager2@demo.com',
  '$2a$10$ZZh5E3egjazVr5Zp413bUu308eJBI.JbPuEUTdKdKiEmES64jwU6RMu',
  'manager',
  true,
  NOW(),
  NOW(),
  'manager2',
  false
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = 'manager2@demo.com');

-- 3. Create tech3 user for client2 (password: demo123)
INSERT INTO "User" (id, name, email, password, role, "isActive", "createdAt", "updatedAt", username, "isSuperAdmin")
SELECT 
  gen_random_uuid(),
  'Client2 Tech',
  'tech3@demo.com',
  '$2a$10$ZZh5E3egjazVr5Zp413bUu308eJBI.JbPuEUTdKdKiEmES64jwU6RMu',
  'technician',
  true,
  NOW(),
  NOW(),
  'tech3',
  false
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = 'tech3@demo.com');

-- 4. Get tenant ID for client2
-- Run separately to find the ID: SELECT id FROM "Tenant" WHERE slug = 'client2';

-- 5. Create TenantMembership for manager2@demo.com
-- (Run after getting client2 tenant ID)
-- INSERT INTO "TenantMembership" (id, userId, tenantId, role, createdAt, updatedAt)
-- SELECT gen_random_uuid(), (SELECT id FROM "User" WHERE email = 'manager2@demo.com'), 
--        (SELECT id FROM "Tenant" WHERE slug = 'client2'), 'manager', NOW(), NOW();

-- 6. Create TenantMembership for tech3@demo.com
-- (Run after getting client2 tenant ID)
-- INSERT INTO "TenantMembership" (id, userId, tenantId, role, createdAt, updatedAt)
-- SELECT gen_random_uuid(), (SELECT id FROM "User" WHERE email = 'tech3@demo.com'), 
--        (SELECT id FROM "Tenant" WHERE slug = 'client2'), 'member', NOW(), NOW();