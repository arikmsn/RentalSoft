-- Create the _prisma_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id VARCHAR(36) PRIMARY KEY,
    checksum VARCHAR(255) NOT NULL,
    finished_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    migration_name VARCHAR(255) NOT NULL,
    logs text,
    rolled_back_at TIMESTAMP(3),
    started_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    state VARCHAR(20) NOT NULL DEFAULT 'APPLIED'
);

-- Mark original migrations as applied
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, state) 
VALUES 
    ('20240319000000', 'existing', CURRENT_TIMESTAMP, '20240319000000_add_isActive_to_site', 'APPLIED'),
    ('20240320000000', 'existing', CURRENT_TIMESTAMP, '20240320000000_add_workTypeId_to_workorder', 'APPLIED'),
    ('20240325000000', 'existing', CURRENT_TIMESTAMP, '20240325000000_normalize_workorder_type_and_equipment_status', 'APPLIED'),
    ('20250412000000', 'phase1', CURRENT_TIMESTAMP, '20250412000000_multi_tenant_phase1_schema', 'APPLIED')
ON CONFLICT (id) DO NOTHING;