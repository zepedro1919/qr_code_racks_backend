import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Obter todos os tipos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tipos ORDER BY descricao ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter tipos:', error);
    res.status(500).json({ error: 'Erro ao obter tipos' });
  }
});

// Obter tipo por ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tipos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter tipo:', error);
    res.status(500).json({ error: 'Erro ao obter tipo' });
  }
});

// Criar tipo
router.post('/', async (req, res) => {
  try {
    const { descricao } = req.body;

    if (!descricao || !descricao.trim()) {
      return res.status(400).json({ error: 'Descrição é obrigatória' });
    }

    const result = await pool.query(
      'INSERT INTO tipos (descricao) VALUES ($1) RETURNING *',
      [descricao.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Tipo já existe' });
    }
    console.error('Erro ao criar tipo:', error);
    res.status(500).json({ error: 'Erro ao criar tipo' });
  }
});

// Atualizar tipo
router.put('/:id', async (req, res) => {
  try {
    const { descricao } = req.body;
    const { id } = req.params;

    if (!descricao || !descricao.trim()) {
      return res.status(400).json({ error: 'Descrição é obrigatória' });
    }

    const result = await pool.query(
      'UPDATE tipos SET descricao = $1 WHERE id = $2 RETURNING *',
      [descricao.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Já existe um tipo com essa descrição' });
    }
    console.error('Erro ao atualizar tipo:', error);
    res.status(500).json({ error: 'Erro ao atualizar tipo' });
  }
});

// Eliminar tipo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tipo is associated with any produto
    const check = await pool.query(
      'SELECT COUNT(*) FROM produtos WHERE tipo_id = $1',
      [id]
    );
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível eliminar: tipo associado a produtos' 
      });
    }

    const result = await pool.query('DELETE FROM tipos WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo não encontrado' });
    }

    res.json({ message: 'Tipo eliminado com sucesso' });
  } catch (error) {
    console.error('Erro ao eliminar tipo:', error);
    res.status(500).json({ error: 'Erro ao eliminar tipo' });
  }
});

export default router;
