import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Obter todos os produtos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM produtos ORDER BY id DESC');
    res.json(result.rows);
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
      `SELECT * FROM produtos 
       WHERE descricao ILIKE $1 OR desenho ILIKE $2 OR material ILIKE $3
       ORDER BY id DESC`,
      [searchTerm, searchTerm, searchTerm]
    );
    res.json(result.rows);
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
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter produto:', error);
    res.status(500).json({ error: 'Erro ao obter produto' });
  }
});

// Criar produto
router.post('/', async (req, res) => {
  try {
    const { descricao, desenho, material } = req.body;

    if (!descricao) {
      return res.status(400).json({ error: 'Descrição é obrigatória' });
    }

    const result = await pool.query(
      'INSERT INTO produtos (descricao, desenho, material) VALUES ($1, $2, $3) RETURNING *',
      [descricao, desenho || null, material || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// Importar produtos em bulk (para CSV import)
router.post('/import', async (req, res) => {
  try {
    const { produtos } = req.body;

    if (!produtos || !Array.isArray(produtos) || produtos.length === 0) {
      return res.status(400).json({ error: 'Lista de produtos é obrigatória' });
    }

    const inserted = [];
    for (const p of produtos) {
      if (!p.descricao) continue;

      const result = await pool.query(
        'INSERT INTO produtos (descricao, desenho, material) VALUES ($1, $2, $3) RETURNING *',
        [p.descricao, p.desenho || null, p.material || null]
      );
      inserted.push(result.rows[0]);
    }

    res.status(201).json({ message: `${inserted.length} produtos importados`, produtos: inserted });
  } catch (error) {
    console.error('Erro ao importar produtos:', error);
    res.status(500).json({ error: 'Erro ao importar produtos' });
  }
});

// Atualizar produto
router.put('/:id', async (req, res) => {
  try {
    const { descricao, desenho, material } = req.body;
    const { id } = req.params;

    if (!descricao) {
      return res.status(400).json({ error: 'Descrição é obrigatória' });
    }

    const result = await pool.query(
      'UPDATE produtos SET descricao = $1, desenho = $2, material = $3 WHERE id = $4 RETURNING *',
      [descricao, desenho || null, material || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
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
