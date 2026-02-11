-- ============================================
-- Seed data for initial setup
-- ============================================
-- This essentially populates the tables with initial data

-- Insert default zones
INSERT INTO zonas (nome, descricao) VALUES
  ('P', 'Zona de Mercadoria'),
  ('M', 'Armazém da Mesanine')
ON CONFLICT (nome) DO NOTHING;

-- Sample products from the CSV (inventario_mesanine.csv)
INSERT INTO produtos (descricao, desenho, material) VALUES
  ('Armário 1600 Faia Aberto (Folha)', 'P13-65', 'Aglomerado; Folha de Faia'),
  ('Armário 1000x1000 fechado folha de faia', 'P29-02', 'Aglomerado; Folha de Faia'),
  ('Armário 1600 alto fechado folha de faia', 'P13-64', 'Aglomerado; Folha de Faia'),
  ('Armário 1200x1650 aberto em folha de faia', 'P13-65', 'Aglomerado; Folha de Faia'),
  ('Armário alto aberto folha de faia', 'P13-65', 'Aglomerado; Folha de Faia'),
  ('Armário alto 1600x1000x500 fechado folha de faia', 'P13-64', 'Aglomerado; Folha de Faia'),
  ('Armário misto 1600 altura folha da faia', 'P13-44', 'Aglomerado Melamínico Faia'),
  ('Armários alto aberto 2000 altura folha de faia', 'E487-04', 'Aglomerado; Folha de Faia')
ON CONFLICT DO NOTHING;
