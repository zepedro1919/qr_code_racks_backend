import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// Obter todas as racks
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM racks ORDER BY corredor, rack, nivel, coluna');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter racks:', error);
    res.status(500).json({ error: 'Erro ao obter racks' });
  }
});

// Obter rack por código
router.get('/codigo/:codigo', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM racks WHERE codigo = $1',
      [req.params.codigo]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rack não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter rack:', error);
    res.status(500).json({ error: 'Erro ao obter rack' });
  }
});

// Obter rack por ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM racks WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rack não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter rack:', error);
    res.status(500).json({ error: 'Erro ao obter rack' });
  }
});

export default router;
