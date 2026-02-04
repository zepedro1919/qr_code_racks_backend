import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// Obter todas as associações racks_encomendas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT re.*, r.codigo as rack_codigo, r.corredor, r.rack, r.nivel, r.coluna
       FROM racks_encomendas re
       LEFT JOIN racks r ON re.rack_id = r.id
       ORDER BY re.id DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter racks_encomendas:', error);
    res.status(500).json({ error: 'Erro ao obter dados' });
  }
});

// Pesquisar produtos em racks
router.get('/search', async (req, res) => {
  try {
    const { q, rack_codigo } = req.query;
    
    let query = `
      SELECT re.*, r.codigo as rack_codigo, r.corredor, r.rack, r.nivel, r.coluna
      FROM racks_encomendas re
      LEFT JOIN racks r ON re.rack_id = r.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (q) {
      query += ` AND (
        re.numero_requisicao ILIKE $${paramIndex} 
        OR re.numero_encomenda ILIKE $${paramIndex + 1} 
        OR re.nome_fornecedor ILIKE $${paramIndex + 2} 
        OR re.codigo_artigo ILIKE $${paramIndex + 3} 
        OR re.descricao_artigo ILIKE $${paramIndex + 4}
        OR r.codigo ILIKE $${paramIndex + 5}
      )`;
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      paramIndex += 6;
    }

    if (rack_codigo) {
      query += ` AND r.codigo = $${paramIndex}`;
      params.push(rack_codigo);
    }

    query += ' ORDER BY re.id DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao pesquisar:', error);
    res.status(500).json({ error: 'Erro ao pesquisar' });
  }
});

// Obter produtos por rack
router.get('/rack/:rackCodigo', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT re.*, r.codigo as rack_codigo, r.corredor, r.rack, r.nivel, r.coluna
       FROM racks_encomendas re
       INNER JOIN racks r ON re.rack_id = r.id
       WHERE r.codigo = $1
       ORDER BY re.id DESC`,
      [req.params.rackCodigo]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter produtos da rack:', error);
    res.status(500).json({ error: 'Erro ao obter produtos da rack' });
  }
});

// Obter quantidade já alocada de uma encomenda
router.get('/quantidade-alocada', async (req, res) => {
  try {
    const { numero_requisicao, numero_encomenda, codigo_artigo } = req.query;

    const result = await pool.query(
      `SELECT COALESCE(SUM(quantidade), 0) as quantidade_alocada
       FROM racks_encomendas
       WHERE numero_requisicao = $1 
       AND numero_encomenda = $2 
       AND codigo_artigo = $3`,
      [numero_requisicao, numero_encomenda, codigo_artigo]
    );

    res.json({ quantidade_alocada: result.rows[0].quantidade_alocada });
  } catch (error) {
    console.error('Erro ao obter quantidade alocada:', error);
    res.status(500).json({ error: 'Erro ao obter quantidade alocada' });
  }
});

// Adicionar produto a uma rack
router.post('/adicionar', async (req, res) => {
  try {
    const {
      rack_codigo,
      numero_requisicao,
      numero_encomenda,
      data_encomenda,
      nome_fornecedor,
      numero_fornecedor,
      data_prevista_entrega,
      codigo_artigo,
      descricao_artigo,
      quantidade,
      unidade,
      quantidade_encomenda
    } = req.body;

    // Validar campos obrigatórios
    if (!rack_codigo || !numero_requisicao || !numero_encomenda || !codigo_artigo || !quantidade) {
      return res.status(400).json({ error: 'Campos obrigatórios em falta' });
    }

    // Obter rack_id pelo código
    const racksResult = await pool.query(
      'SELECT id FROM racks WHERE codigo = $1',
      [rack_codigo]
    );

    if (racksResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rack não encontrada' });
    }

    const rack_id = racksResult.rows[0].id;

    // Verificar quantidade já alocada
    const alocadoResult = await pool.query(
      `SELECT COALESCE(SUM(quantidade), 0) as quantidade_alocada
       FROM racks_encomendas
       WHERE numero_requisicao = $1 
       AND numero_encomenda = $2 
       AND codigo_artigo = $3`,
      [numero_requisicao, numero_encomenda, codigo_artigo]
    );

    const quantidadeAlocada = parseFloat(alocadoResult.rows[0].quantidade_alocada);
    const quantidadeTotal = parseFloat(quantidade_encomenda);
    const quantidadeAdicionar = parseFloat(quantidade);
    const restante = quantidadeTotal - quantidadeAlocada;

    if (quantidadeAdicionar > restante) {
      return res.status(400).json({ 
        error: `Quantidade excede o disponível. Restam ${restante} unidades para alocar.`,
        restante 
      });
    }

    // Verificar se já existe entrada para esta combinação rack + encomenda
    const existingResult = await pool.query(
      `SELECT id, quantidade FROM racks_encomendas
       WHERE rack_id = $1 
       AND numero_requisicao = $2 
       AND numero_encomenda = $3 
       AND codigo_artigo = $4`,
      [rack_id, numero_requisicao, numero_encomenda, codigo_artigo]
    );

    if (existingResult.rows.length > 0) {
      // Atualizar quantidade existente
      const novaQuantidade = parseFloat(existingResult.rows[0].quantidade) + quantidadeAdicionar;
      await pool.query(
        `UPDATE racks_encomendas 
         SET quantidade = $1
         WHERE id = $2`,
        [novaQuantidade, existingResult.rows[0].id]
      );
      
      res.json({ 
        message: 'Quantidade atualizada com sucesso', 
        id: existingResult.rows[0].id,
        nova_quantidade: novaQuantidade,
        restante: restante - quantidadeAdicionar
      });
    } else {
      // Inserir nova entrada
      const insertResult = await pool.query(
        `INSERT INTO racks_encomendas 
         (rack_id, numero_requisicao, numero_encomenda, data_encomenda, 
          nome_fornecedor, numero_fornecedor, data_prevista_entrega,
          codigo_artigo, descricao_artigo, quantidade, unidade)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [rack_id, numero_requisicao, numero_encomenda, data_encomenda,
         nome_fornecedor, numero_fornecedor, data_prevista_entrega,
         codigo_artigo, descricao_artigo, quantidadeAdicionar, unidade]
      );

      res.status(201).json({ 
        message: 'Produto adicionado à rack com sucesso', 
        id: insertResult.rows[0].id,
        restante: restante - quantidadeAdicionar
      });
    }
  } catch (error) {
    console.error('Erro ao adicionar produto:', error);
    res.status(500).json({ error: 'Erro ao adicionar produto' });
  }
});

// Remover produto de uma rack
router.post('/remover', async (req, res) => {
  try {
    const {
      rack_codigo,
      numero_requisicao,
      numero_encomenda,
      codigo_artigo,
      quantidade,
      remover_tudo
    } = req.body;

    // Validar campos obrigatórios
    if (!rack_codigo || !numero_requisicao || !numero_encomenda || !codigo_artigo) {
      return res.status(400).json({ error: 'Campos obrigatórios em falta' });
    }

    // Obter rack_id pelo código
    const racksResult = await pool.query(
      'SELECT id FROM racks WHERE codigo = $1',
      [rack_codigo]
    );

    if (racksResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rack não encontrada' });
    }

    const rack_id = racksResult.rows[0].id;

    // Verificar se existe entrada
    const existingResult = await pool.query(
      `SELECT id, quantidade FROM racks_encomendas
       WHERE rack_id = $1 
       AND numero_requisicao = $2 
       AND numero_encomenda = $3 
       AND codigo_artigo = $4`,
      [rack_id, numero_requisicao, numero_encomenda, codigo_artigo]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado nesta rack' });
    }

    const quantidadeAtual = parseFloat(existingResult.rows[0].quantidade);
    
    if (remover_tudo) {
      // Remover entrada completamente
      await pool.query(
        'DELETE FROM racks_encomendas WHERE id = $1',
        [existingResult.rows[0].id]
      );
      
      res.json({ message: 'Produto removido da rack com sucesso' });
    } else {
      const quantidadeRemover = parseFloat(quantidade);
      
      if (quantidadeRemover > quantidadeAtual) {
        return res.status(400).json({ 
          error: `Quantidade a remover excede a disponível (${quantidadeAtual})` 
        });
      }

      if (quantidadeRemover === quantidadeAtual) {
        // Remover entrada completamente
        await pool.query(
          'DELETE FROM racks_encomendas WHERE id = $1',
          [existingResult.rows[0].id]
        );
        
        res.json({ message: 'Produto removido da rack com sucesso' });
      } else {
        // Atualizar quantidade
        const novaQuantidade = quantidadeAtual - quantidadeRemover;
        await pool.query(
          `UPDATE racks_encomendas 
           SET quantidade = $1
           WHERE id = $2`,
          [novaQuantidade, existingResult.rows[0].id]
        );
        
        res.json({ 
          message: 'Quantidade atualizada com sucesso', 
          nova_quantidade: novaQuantidade 
        });
      }
    }
  } catch (error) {
    console.error('Erro ao remover produto:', error);
    res.status(500).json({ error: 'Erro ao remover produto' });
  }
});

// Obter quantidade numa rack específica
router.get('/quantidade-rack', async (req, res) => {
  try {
    const { rack_codigo, numero_requisicao, numero_encomenda, codigo_artigo } = req.query;

    const racksResult = await pool.query(
      'SELECT id FROM racks WHERE codigo = $1',
      [rack_codigo]
    );

    if (racksResult.rows.length === 0) {
      return res.json({ quantidade: 0 });
    }

    const result = await pool.query(
      `SELECT COALESCE(quantidade, 0) as quantidade
       FROM racks_encomendas
       WHERE rack_id = $1
       AND numero_requisicao = $2 
       AND numero_encomenda = $3 
       AND codigo_artigo = $4`,
      [racksResult.rows[0].id, numero_requisicao, numero_encomenda, codigo_artigo]
    );

    res.json({ quantidade: result.rows.length > 0 ? result.rows[0].quantidade : 0 });
  } catch (error) {
    console.error('Erro ao obter quantidade:', error);
    res.status(500).json({ error: 'Erro ao obter quantidade' });
  }
});

export default router;
