import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Obter todos os produtos em zonas (inventário de produtos por zona)
router.get('/', async (req, res) => {
  try {
    const { zona_id } = req.query;

    let query = `
      SELECT pz.*, 
        p.descricao, p.desenho, t.descricao as tipo, p.largura, p.profundidade, p.altura,
        z.nome as zona_nome, z.descricao as zona_descricao,
        COALESCE(
          (SELECT STRING_AGG(m.descricao, ', ' ORDER BY m.descricao)
           FROM produtos_materiais pm2
           INNER JOIN materiais m ON m.id = pm2.material_id
           WHERE pm2.produto_id = p.id), ''
        ) as materiais_texto
      FROM produtos_zona pz
      INNER JOIN produtos p ON pz.produto_id = p.id
      INNER JOIN tipos t ON t.id = p.tipo_id
      INNER JOIN zonas z ON pz.zona_id = z.id
    `;
    const params = [];

    if (zona_id) {
      query += ' WHERE pz.zona_id = $1';
      params.push(zona_id);
    }

    query += ' ORDER BY z.nome, t.descricao, p.descricao';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter produtos-zona:', error);
    res.status(500).json({ error: 'Erro ao obter dados' });
  }
});

// Pesquisar produtos em zonas
router.get('/search', async (req, res) => {
  try {
    const { q, zona_id } = req.query;

    let query = `
      SELECT pz.*, 
        p.descricao, p.desenho, t.descricao as tipo, p.largura, p.profundidade, p.altura,
        z.nome as zona_nome, z.descricao as zona_descricao,
        COALESCE(
          (SELECT STRING_AGG(m.descricao, ', ' ORDER BY m.descricao)
           FROM produtos_materiais pm2
           INNER JOIN materiais m ON m.id = pm2.material_id
           WHERE pm2.produto_id = p.id), ''
        ) as materiais_texto
      FROM produtos_zona pz
      INNER JOIN produtos p ON pz.produto_id = p.id
      INNER JOIN tipos t ON t.id = p.tipo_id
      INNER JOIN zonas z ON pz.zona_id = z.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (q) {
      query += ` AND (
        p.descricao ILIKE $${paramIndex}
        OR p.desenho ILIKE $${paramIndex + 1}
        OR t.descricao ILIKE $${paramIndex + 2}
        OR z.nome ILIKE $${paramIndex + 3}
        OR EXISTS (
          SELECT 1 FROM produtos_materiais pm3
          INNER JOIN materiais m3 ON m3.id = pm3.material_id
          WHERE pm3.produto_id = p.id AND m3.descricao ILIKE $${paramIndex + 4}
        )
      )`;
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      paramIndex += 5;
    }

    if (zona_id) {
      query += ` AND pz.zona_id = $${paramIndex}`;
      params.push(zona_id);
    }

    query += ' ORDER BY z.nome, t.descricao, p.descricao';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao pesquisar:', error);
    res.status(500).json({ error: 'Erro ao pesquisar' });
  }
});

// Adicionar produto a uma zona (picagem)
router.post('/adicionar', async (req, res) => {
  try {
    const { produto_id, zona_id, quantidade } = req.body;

    if (!produto_id || !zona_id || !quantidade) {
      return res.status(400).json({ error: 'Campos obrigatórios: produto_id, zona_id, quantidade' });
    }

    // Check if product exists
    const produtoCheck = await pool.query('SELECT id FROM produtos WHERE id = $1', [produto_id]);
    if (produtoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Check if zona exists
    const zonaCheck = await pool.query('SELECT id FROM zonas WHERE id = $1', [zona_id]);
    if (zonaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Zona não encontrada' });
    }

    // Check if association already exists - if so, update quantity
    const existingResult = await pool.query(
      'SELECT * FROM produtos_zona WHERE produto_id = $1 AND zona_id = $2',
      [produto_id, zona_id]
    );

    let result;
    if (existingResult.rows.length > 0) {
      // Update existing - add to quantity
      const novaQuantidade = parseInt(existingResult.rows[0].quantidade) + parseInt(quantidade);
      result = await pool.query(
        `UPDATE produtos_zona SET quantidade = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE produto_id = $2 AND zona_id = $3 RETURNING *`,
        [novaQuantidade, produto_id, zona_id]
      );
      res.json({ message: 'Quantidade atualizada', ...result.rows[0] });
    } else {
      // Insert new
      result = await pool.query(
        `INSERT INTO produtos_zona (produto_id, zona_id, quantidade) 
         VALUES ($1, $2, $3) RETURNING *`,
        [produto_id, zona_id, quantidade]
      );
      res.status(201).json({ message: 'Produto adicionado à zona', ...result.rows[0] });
    }
  } catch (error) {
    console.error('Erro ao adicionar produto à zona:', error);
    res.status(500).json({ error: 'Erro ao adicionar produto à zona' });
  }
});

// Remover produto de uma zona (ou reduzir quantidade)
router.post('/remover', async (req, res) => {
  try {
    const { produto_id, zona_id, quantidade, remover_tudo } = req.body;

    if (!produto_id || !zona_id) {
      return res.status(400).json({ error: 'Campos obrigatórios: produto_id, zona_id' });
    }

    const existingResult = await pool.query(
      'SELECT * FROM produtos_zona WHERE produto_id = $1 AND zona_id = $2',
      [produto_id, zona_id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado nesta zona' });
    }

    const quantidadeAtual = parseInt(existingResult.rows[0].quantidade);

    if (remover_tudo || parseInt(quantidade) >= quantidadeAtual) {
      await pool.query(
        'DELETE FROM produtos_zona WHERE produto_id = $1 AND zona_id = $2',
        [produto_id, zona_id]
      );
      res.json({ message: 'Produto removido da zona' });
    } else {
      const novaQuantidade = quantidadeAtual - parseInt(quantidade);
      await pool.query(
        `UPDATE produtos_zona SET quantidade = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE produto_id = $2 AND zona_id = $3`,
        [novaQuantidade, produto_id, zona_id]
      );
      res.json({ message: 'Quantidade atualizada', nova_quantidade: novaQuantidade });
    }
  } catch (error) {
    console.error('Erro ao remover produto da zona:', error);
    res.status(500).json({ error: 'Erro ao remover produto da zona' });
  }
});

// Eliminar registo por ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM produtos_zona WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registo não encontrado' });
    }

    res.json({ message: 'Registo eliminado com sucesso' });
  } catch (error) {
    console.error('Erro ao eliminar registo:', error);
    res.status(500).json({ error: 'Erro ao eliminar registo' });
  }
});

export default router;
