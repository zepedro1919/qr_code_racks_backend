import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Helper: get materiais for a produto
const getMateriais = async (produtoId) => {
  const result = await pool.query(
    `SELECT m.id, m.descricao FROM materiais m
     INNER JOIN produtos_materiais pm ON pm.material_id = m.id
     WHERE pm.produto_id = $1
     ORDER BY m.descricao`,
    [produtoId]
  );
  return result.rows;
};

// Helper: set materiais for a produto (replaces all associations)
const setMateriais = async (client, produtoId, materialIds) => {
  // Remove existing associations
  await client.query('DELETE FROM produtos_materiais WHERE produto_id = $1', [produtoId]);
  // Insert new associations
  for (const materialId of materialIds) {
    await client.query(
      'INSERT INTO produtos_materiais (produto_id, material_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [produtoId, materialId]
    );
  }
};

// Obter todos os produtos (with materiais)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM produtos ORDER BY id DESC');
    // Attach materiais to each produto
    const produtos = [];
    for (const p of result.rows) {
      const materiais = await getMateriais(p.id);
      produtos.push({ ...p, materiais });
    }
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao obter produtos:', error);
    res.status(500).json({ error: 'Erro ao obter produtos' });
  }
});

// Pesquisar produtos
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.redirect('/api/produtos');
    }

    const searchTerm = `%${q}%`;
    const result = await pool.query(
      `SELECT DISTINCT p.* FROM produtos p
       LEFT JOIN produtos_materiais pm ON pm.produto_id = p.id
       LEFT JOIN materiais m ON m.id = pm.material_id
       WHERE p.descricao ILIKE $1 OR p.desenho ILIKE $1 OR p.tipo ILIKE $1 OR m.descricao ILIKE $1
       ORDER BY p.id DESC`,
      [searchTerm]
    );
    const produtos = [];
    for (const p of result.rows) {
      const materiais = await getMateriais(p.id);
      produtos.push({ ...p, materiais });
    }
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao pesquisar produtos:', error);
    res.status(500).json({ error: 'Erro ao pesquisar produtos' });
  }
});

// Obter produto por ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    const materiais = await getMateriais(result.rows[0].id);
    res.json({ ...result.rows[0], materiais });
  } catch (error) {
    console.error('Erro ao obter produto:', error);
    res.status(500).json({ error: 'Erro ao obter produto' });
  }
});

// Helper: check if a product with the same (tipo, l, p, a, materials set) already exists
// Returns the existing product id or null
const checkDuplicate = async (client, tipo, largura, profundidade, altura, materialIds, excludeId = null) => {
  // Find all products with same tipo + dimensions
  let query = `SELECT id FROM produtos WHERE tipo = $1 AND largura = $2 AND profundidade = $3 AND altura = $4`;
  const params = [tipo.trim(), parseFloat(largura), parseFloat(profundidade), parseFloat(altura)];
  if (excludeId) {
    query += ` AND id != $5`;
    params.push(excludeId);
  }
  const candidates = await client.query(query, params);

  // Normalize the incoming material set (sorted)
  const sortedNew = (materialIds || []).map(Number).sort((a, b) => a - b);

  for (const row of candidates.rows) {
    // Get materials for this candidate
    const matResult = await client.query(
      `SELECT material_id FROM produtos_materiais WHERE produto_id = $1 ORDER BY material_id`,
      [row.id]
    );
    const sortedExisting = matResult.rows.map(r => r.material_id);
    // Compare sorted arrays
    if (sortedNew.length === sortedExisting.length && sortedNew.every((v, i) => v === sortedExisting[i])) {
      return row.id;
    }
  }
  return null;
};

// Criar produto
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { descricao, desenho, tipo, largura, profundidade, altura, material_ids } = req.body;

    // Validate required fields
    if (!tipo || largura === undefined || profundidade === undefined || altura === undefined) {
      return res.status(400).json({ error: 'Campos obrigatórios: tipo, largura, profundidade, altura' });
    }

    // Check full uniqueness: tipo + l + p + a + materials set
    const existingId = await checkDuplicate(client, tipo, largura, profundidade, altura, material_ids || []);
    if (existingId) {
      return res.status(409).json({ 
        error: 'Já existe um produto com este tipo, dimensões e materiais',
        existing_id: existingId
      });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO produtos (descricao, desenho, tipo, largura, profundidade, altura) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        descricao || null,
        desenho || null,
        tipo.trim(),
        parseFloat(largura),
        parseFloat(profundidade),
        parseFloat(altura)
      ]
    );

    const produto = result.rows[0];

    // Associate materiais
    if (material_ids && Array.isArray(material_ids) && material_ids.length > 0) {
      await setMateriais(client, produto.id, material_ids);
    }

    await client.query('COMMIT');

    const materiais = await getMateriais(produto.id);
    res.status(201).json({ ...produto, materiais });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  } finally {
    client.release();
  }
});

// Atualizar produto
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { descricao, desenho, tipo, largura, profundidade, altura, material_ids } = req.body;
    const { id } = req.params;

    if (!tipo || largura === undefined || profundidade === undefined || altura === undefined) {
      return res.status(400).json({ error: 'Campos obrigatórios: tipo, largura, profundidade, altura' });
    }

    // Check full uniqueness excluding self: tipo + l + p + a + materials set
    const existingId = await checkDuplicate(client, tipo, largura, profundidade, altura, material_ids || [], id);
    if (existingId) {
      return res.status(409).json({ error: 'Já existe outro produto com este tipo, dimensões e materiais' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE produtos SET descricao = $1, desenho = $2, tipo = $3, largura = $4, profundidade = $5, altura = $6
       WHERE id = $7 RETURNING *`,
      [
        descricao || null,
        desenho || null,
        tipo.trim(),
        parseFloat(largura),
        parseFloat(profundidade),
        parseFloat(altura),
        id
      ]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Update materiais associations
    if (material_ids && Array.isArray(material_ids)) {
      await setMateriais(client, id, material_ids);
    }

    await client.query('COMMIT');

    const materiais = await getMateriais(id);
    res.json({ ...result.rows[0], materiais });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  } finally {
    client.release();
  }
});

// Eliminar produto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM produtos WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json({ message: 'Produto eliminado com sucesso' });
  } catch (error) {
    console.error('Erro ao eliminar produto:', error);
    res.status(500).json({ error: 'Erro ao eliminar produto' });
  }
});

export default router;
