-- ============================================
-- Database Initialization Script
-- QR Code Racks Application
-- For fresh databases only. Use migrate.sql for existing databases.
-- ============================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Zonas table
CREATE TABLE IF NOT EXISTS zonas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) UNIQUE NOT NULL,
  descricao VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Racks table (zona_id references zonas - code = zona.nome + corredor + rack + nivel + coluna)
CREATE TABLE IF NOT EXISTS racks (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  corredor VARCHAR(10) NOT NULL,
  rack VARCHAR(10) NOT NULL,
  nivel VARCHAR(10) NOT NULL,
  coluna VARCHAR(10) NOT NULL,
  zona_id INTEGER REFERENCES zonas(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Encomendas fornecedor table
CREATE TABLE IF NOT EXISTS encomendas_fornecedor (
  id SERIAL PRIMARY KEY,
  numero_requisicao VARCHAR(100),
  numero_encomenda VARCHAR(100),
  data_encomenda VARCHAR(100),
  nome_fornecedor VARCHAR(200),
  numero_fornecedor VARCHAR(100),
  data_prevista_entrega VARCHAR(100),
  codigo_artigo VARCHAR(100),
  descricao_artigo VARCHAR(500),
  quantidade_encomenda VARCHAR(100),
  unidade VARCHAR(50)
);

-- 5. Racks_encomendas table (association between racks and encomendas by values)
CREATE TABLE IF NOT EXISTS racks_encomendas (
  id SERIAL PRIMARY KEY,
  rack_id INTEGER NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
  numero_requisicao VARCHAR(100),
  numero_encomenda VARCHAR(100),
  data_encomenda VARCHAR(100),
  nome_fornecedor VARCHAR(200),
  numero_fornecedor VARCHAR(100),
  data_prevista_entrega VARCHAR(100),
  codigo_artigo VARCHAR(100),
  descricao_artigo VARCHAR(500),
  quantidade NUMERIC DEFAULT 0,
  unidade VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Produtos table (factory products/furniture)
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  descricao VARCHAR(500) NOT NULL,
  desenho VARCHAR(100),
  material VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Produtos_zona table (association between products and zones via picking)
CREATE TABLE IF NOT EXISTS produtos_zona (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  zona_id INTEGER NOT NULL REFERENCES zonas(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_racks_zona_id ON racks(zona_id);
CREATE INDEX IF NOT EXISTS idx_racks_encomendas_rack_id ON racks_encomendas(rack_id);
CREATE INDEX IF NOT EXISTS idx_produtos_zona_produto_id ON produtos_zona(produto_id);
CREATE INDEX IF NOT EXISTS idx_produtos_zona_zona_id ON produtos_zona(zona_id);
