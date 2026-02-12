-- ============================================
-- Migration 2: Restructure produtos table
-- - Remove material column from produtos
-- - Add tipo, largura, profundidade, altura columns
-- - Create materiais table (id, descricao)
-- - Create produtos_materiais junction table (many-to-many)
-- - Add UNIQUE constraint on (tipo, largura, profundidade, altura)
-- - Clean existing produtos data
-- ============================================

-- 1. Clean existing data (produtos_zona depends on produtos, so clean first)
TRUNCATE TABLE produtos_zona CASCADE;
TRUNCATE TABLE produtos CASCADE;

-- 2. Create materiais table
CREATE TABLE IF NOT EXISTS materiais (
  id SERIAL PRIMARY KEY,
  descricao VARCHAR(500) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add new columns to produtos
DO $$
BEGIN
  -- Add tipo column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'tipo'
  ) THEN
    ALTER TABLE produtos ADD COLUMN tipo VARCHAR(200) NOT NULL DEFAULT '';
  END IF;

  -- Add largura column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'largura'
  ) THEN
    ALTER TABLE produtos ADD COLUMN largura NUMERIC NOT NULL DEFAULT 0;
  END IF;

  -- Add profundidade column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'profundidade'
  ) THEN
    ALTER TABLE produtos ADD COLUMN profundidade NUMERIC NOT NULL DEFAULT 0;
  END IF;

  -- Add altura column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'altura'
  ) THEN
    ALTER TABLE produtos ADD COLUMN altura NUMERIC NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 4. Drop old material column from produtos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'material'
  ) THEN
    ALTER TABLE produtos DROP COLUMN material;
  END IF;
END $$;

-- 5. (Uniqueness enforced in backend logic: tipo + l + p + a + materials set)

-- 6. Create produtos_materiais junction table (many-to-many)
CREATE TABLE IF NOT EXISTS produtos_materiais (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materiais(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (produto_id, material_id)
);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_produtos_materiais_produto_id ON produtos_materiais(produto_id);
CREATE INDEX IF NOT EXISTS idx_produtos_materiais_material_id ON produtos_materiais(material_id);
