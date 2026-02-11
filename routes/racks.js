import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// Obter todas as racks (com zona nome via JOIN)
router.get('/', async (req, res) => {
  try {
    const { zona_id } = req.query;
    
    let query = `
      SELECT r.*, z.nome as zona_nome, z.descricao as zona_descricao
      FROM racks r
      LEFT JOIN zonas z ON r.zona_id = z.id
    `;
    const params = [];

    if (zona_id) {
      query += ' WHERE r.zona_id = $1';
      params.push(zona_id);
    }

    query += ' ORDER BY z.nome, r.corredor, r.rack, r.nivel, r.coluna';
    
    const result = await pool.query(query, params);
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
      `SELECT r.*, z.nome as zona_nome
       FROM racks r
       LEFT JOIN zonas z ON r.zona_id = z.id
       WHERE r.codigo = $1`,
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
      `SELECT r.*, z.nome as zona_nome
       FROM racks r
       LEFT JOIN zonas z ON r.zona_id = z.id
       WHERE r.id = $1`,
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

// Criar nova rack (código gerado automaticamente: zona_nome + corredor + rack + nivel + coluna)
router.post('/', async (req, res) => {
  try {
    const { zona_id, corredor, rack, nivel, coluna } = req.body;

    if (!zona_id || !corredor || !rack || !nivel || !coluna) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios (zona_id, corredor, rack, nivel, coluna)' });
    }

    // Fetch zona nome to build the code
    const zonaResult = await pool.query('SELECT nome FROM zonas WHERE id = $1', [zona_id]);
    if (zonaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Zona não encontrada' });
    }

    const zonaNome = zonaResult.rows[0].nome;
    const codigo = `${zonaNome}${corredor}${rack}${nivel}${coluna}`;

    // Check if code already exists
    const existingResult = await pool.query('SELECT id FROM racks WHERE codigo = $1', [codigo]);
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: `Rack com código ${codigo} já existe` });
    }

    const result = await pool.query(
      `INSERT INTO racks (codigo, corredor, rack, nivel, coluna, zona_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [codigo, corredor, rack, nivel, coluna, zona_id]
    );

    // Return with zona_nome
    const newRack = { ...result.rows[0], zona_nome: zonaNome };
    res.status(201).json(newRack);
  } catch (error) {
    console.error('Erro ao criar rack:', error);
    res.status(500).json({ error: 'Erro ao criar rack' });
  }
});

// Eliminar rack
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await pool.query('SELECT id FROM racks WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rack não encontrada' });
    }

    await pool.query('DELETE FROM racks WHERE id = $1', [id]);
    res.json({ message: 'Rack eliminada com sucesso' });
  } catch (error) {
    console.error('Erro ao eliminar rack:', error);
    res.status(500).json({ error: 'Erro ao eliminar rack' });
  }
});

export default router;
