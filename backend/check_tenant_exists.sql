-- Check if Tenant table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'Tenant'
);