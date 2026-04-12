-- Phase 7: Seed second tenant and demo users for multi-tenant QA
-- Run this once against the PostgreSQL database

-- 1. Create second tenant "client2"
INSERT INTO "Tenant" (id, name, slug, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Client 2',
  'client2',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Get the tenant IDs (for reference in next steps)
-- The default tenant should already exist from Phase 2 backfill

-- 3. Create manager user for client2
INSERT INTO "User" (id, name, email, password, role, "isActive", "createdAt", "updatedAt", username, "isSuperAdmin")
VALUES (
  gen_random_uuid(),
  'Client2 Manager',
  'manager2@demo.com',
  '$2a$10$8K1p/a0d5i/ZM9z6c.Y3Iu9lH2p/EY8rG5bPxrH5rH5rH5rH5rH', -- password: demo123 (hash varies, update after)
  'manager',
  true,
  NOW(),
  NOW(),
  'manager2',
  false
)
ON CONFLICT (email) DO NOTHING;

-- 4. Create tech user for client2
INSERT INTO "User" (id, name, email, password, role, "isActive", "createdAt", "updatedAt", username, "isSuperAdmin")
VALUES (
  gen_random_uuid(),
  'Client2 Tech',
  'tech3@demo.com',
  '$2a$10$8K1p/a0d5i/ZM9z6c.Y3Iu9lH2p/EY8rG5bPxrH5rH5rH5rH5rH', -- password: demo123 (hash varies, update after)
  'technician',
  true,
  NOW(),
  NOW(),
  'tech3',
  false
)
ON CONFLICT (email) DO NOTHING;

-- Note: After running, update passwords with actual bcrypt hashes:
-- Default tenant users (should already exist):
--   - manager@demo.com / demo123 (role: manager)
--   - tech1@demo.com / demo123 (role: technician)
--   - tech2@demo.com / demo123 (role: technician)
--   - admin@demo.com / demo123 (role: admin)
-- Client2 tenant users:
--   - manager2@demo.com / demo123 (role: manager)
--   - tech3@demo.com / demo123 (role: technician)