import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Obter todas as zonas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT z.*, 
        (SELECT COUNT(*) FROM racks r WHERE r.zona_id = z.id) as total_racks,
        (SELECT COUNT(*) FROM produtos_zona pz WHERE pz.zona_id = z.id) as total_produtos
      FROM zonas z
      ORDER BY z.nome
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter zonas:', error);
    res.status(500).json({ error: 'Erro ao obter zonas' });
  }
});

// Obter zona por ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM zonas WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zona não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter zona:', error);
    res.status(500).json({ error: 'Erro ao obter zona' });
  }
});

// Criar zona
router.post('/', async (req, res) => {
  try {
    const { nome, descricao } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome da zona é obrigatório' });
    }

    const result = await pool.query(
      'INSERT INTO zonas (nome, descricao) VALUES ($1, $2) RETURNING *',
      [nome.toUpperCase(), descricao || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Zona com este nome já existe' });
    }
    console.error('Erro ao criar zona:', error);
    res.status(500).json({ error: 'Erro ao criar zona' });
  }
});

// Atualizar zona
router.put('/:id', async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    const { id } = req.params;

    if (!nome) {
      return res.status(400).json({ error: 'Nome da zona é obrigatório' });
    }

    const result = await pool.query(
      'UPDATE zonas SET nome = $1, descricao = $2 WHERE id = $3 RETURNING *',
      [nome.toUpperCase(), descricao || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zona não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Zona com este nome já existe' });
    }
    console.error('Erro ao atualizar zona:', error);
    res.status(500).json({ error: 'Erro ao atualizar zona' });
  }
});

// Eliminar zona
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if zona has racks
    const racksCheck = await pool.query('SELECT COUNT(*) FROM racks WHERE zona_id = $1', [id]);
    if (parseInt(racksCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Não é possível eliminar zona com racks associadas' });
    }

    const result = await pool.query('DELETE FROM zonas WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zona não encontrada' });
    }

    res.json({ message: 'Zona eliminada com sucesso' });
  } catch (error) {
    console.error('Erro ao eliminar zona:', error);
    res.status(500).json({ error: 'Erro ao eliminar zona' });
  }
});

export default router;
