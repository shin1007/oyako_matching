-- Move extensions from public schema to extensions schema
-- This fixes the security warning about extensions in public schema

-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move vector extension if it exists in public schema
DO $$
BEGIN
  -- Check if vector extension exists in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'vector' AND n.nspname = 'public'
  ) THEN
    -- Drop and recreate in extensions schema
    DROP EXTENSION IF EXISTS vector CASCADE;
    CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
    RAISE NOTICE 'Moved vector extension from public to extensions schema';
  END IF;
END $$;

-- Move uuid-ossp extension if it exists in public schema
DO $$
BEGIN
  -- Check if uuid-ossp extension exists in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'uuid-ossp' AND n.nspname = 'public'
  ) THEN
    -- Drop and recreate in extensions schema
    DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
    RAISE NOTICE 'Moved uuid-ossp extension from public to extensions schema';
  END IF;
END $$;
