import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Obter todos os materiais
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materiais ORDER BY descricao ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter materiais:', error);
    res.status(500).json({ error: 'Erro ao obter materiais' });
  }
});

// Obter material por ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materiais WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter material:', error);
    res.status(500).json({ error: 'Erro ao obter material' });
  }
});

// Criar material
router.post('/', async (req, res) => {
  try {
    const { descricao } = req.body;

    if (!descricao || !descricao.trim()) {
      return res.status(400).json({ error: 'Descrição é obrigatória' });
    }

    const result = await pool.query(
      'INSERT INTO materiais (descricao) VALUES ($1) RETURNING *',
      [descricao.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Material já existe' });
    }
    console.error('Erro ao criar material:', error);
    res.status(500).json({ error: 'Erro ao criar material' });
  }
});

// Atualizar material
router.put('/:id', async (req, res) => {
  try {
    const { descricao } = req.body;
    const { id } = req.params;

    if (!descricao || !descricao.trim()) {
      return res.status(400).json({ error: 'Descrição é obrigatória' });
    }

    const result = await pool.query(
      'UPDATE materiais SET descricao = $1 WHERE id = $2 RETURNING *',
      [descricao.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Já existe um material com essa descrição' });
    }
    console.error('Erro ao atualizar material:', error);
    res.status(500).json({ error: 'Erro ao atualizar material' });
  }
});

// Eliminar material
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if material is associated with any produto
    const check = await pool.query(
      'SELECT COUNT(*) FROM produtos_materiais WHERE material_id = $1',
      [id]
    );
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível eliminar: material associado a produtos' 
      });
    }

    const result = await pool.query('DELETE FROM materiais WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    res.json({ message: 'Material eliminado com sucesso' });
  } catch (error) {
    console.error('Erro ao eliminar material:', error);
    res.status(500).json({ error: 'Erro ao eliminar material' });
  }
});

export default router;
