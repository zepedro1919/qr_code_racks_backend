-- ============================================
-- Migration 3: Extract tipo to separate table
-- - Create tipos table
-- - Populate from existing distinct tipo values in produtos
-- - Add tipo_id FK column to produtos
-- - Migrate data (set tipo_id from matched tipos)
-- - Drop old tipo varchar column
-- ============================================

-- 1. Create tipos table
CREATE TABLE IF NOT EXISTS tipos (
  id SERIAL PRIMARY KEY,
  descricao VARCHAR(200) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Populate tipos from existing distinct produto tipo values
INSERT INTO tipos (descricao)
SELECT DISTINCT tipo FROM produtos WHERE tipo IS NOT NULL AND tipo != ''
ON CONFLICT (descricao) DO NOTHING;

-- 3. Add tipo_id column to produtos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'tipo_id'
  ) THEN
    ALTER TABLE produtos ADD COLUMN tipo_id INTEGER REFERENCES tipos(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 4. Migrate data: set tipo_id based on matching tipo text
UPDATE produtos p
SET tipo_id = t.id
FROM tipos t
WHERE p.tipo = t.descricao AND p.tipo_id IS NULL;

-- 5. Make tipo_id NOT NULL (all rows should now have a value)
DO $$
BEGIN
  -- Only set NOT NULL if all rows have tipo_id populated
  IF NOT EXISTS (SELECT 1 FROM produtos WHERE tipo_id IS NULL) THEN
    ALTER TABLE produtos ALTER COLUMN tipo_id SET NOT NULL;
  END IF;
END $$;

-- 6. Drop old tipo varchar column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'tipo'
  ) THEN
    ALTER TABLE produtos DROP COLUMN tipo;
  END IF;
END $$;

-- 7. Index on tipo_id
CREATE INDEX IF NOT EXISTS idx_produtos_tipo_id ON produtos(tipo_id);
