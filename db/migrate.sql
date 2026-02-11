-- ============================================
-- Migration: Add zonas support to existing database
-- Run this on an existing database to add the new tables
-- IMPORTANT: Rack IDs are preserved - QR codes remain valid
-- ============================================

-- 1. Create zonas table
CREATE TABLE IF NOT EXISTS zonas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) UNIQUE NOT NULL,
  descricao VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Migrate existing zona values from racks into zonas table
-- This inserts unique zona values that already exist in racks
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'racks' AND column_name = 'zona'
  ) THEN
    INSERT INTO zonas (nome)
    SELECT DISTINCT zona FROM racks WHERE zona IS NOT NULL AND zona != ''
    ON CONFLICT (nome) DO NOTHING;
  END IF;
END $$;

-- 3. Add zona_id column to racks (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'racks' AND column_name = 'zona_id'
  ) THEN
    ALTER TABLE racks ADD COLUMN zona_id INTEGER REFERENCES zonas(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_racks_zona_id ON racks(zona_id);
  END IF;
END $$;

-- 4. Populate zona_id from existing zona column values
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'racks' AND column_name = 'zona'
  ) THEN
    UPDATE racks SET zona_id = z.id
    FROM zonas z
    WHERE racks.zona = z.nome AND racks.zona_id IS NULL;
  END IF;
END $$;

-- 5. Drop the old zona column (no longer needed, value comes from zonas table via zona_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'racks' AND column_name = 'zona'
  ) THEN
    ALTER TABLE racks DROP COLUMN zona;
  END IF;
END $$;

-- 6. Create produtos table
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  descricao VARCHAR(500) NOT NULL,
  desenho VARCHAR(100),
  material VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create produtos_zona table
CREATE TABLE IF NOT EXISTS produtos_zona (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  zona_id INTEGER NOT NULL REFERENCES zonas(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_produtos_zona_produto_id ON produtos_zona(produto_id);
CREATE INDEX IF NOT EXISTS idx_produtos_zona_zona_id ON produtos_zona(zona_id);
