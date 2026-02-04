import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// Obter todas as encomendas de fornecedor
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM encomendas_fornecedor ORDER BY data_encomenda DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter encomendas:', error);
    res.status(500).json({ error: 'Erro ao obter encomendas' });
  }
});

// Pesquisar encomendas
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Termo de pesquisa obrigatório' });
    }

    const searchTerm = `%${q}%`;
    const result = await pool.query(
      `SELECT * FROM encomendas_fornecedor 
       WHERE numero_requisicao ILIKE $1 
       OR numero_encomenda ILIKE $2 
       OR nome_fornecedor ILIKE $3 
       OR codigo_artigo ILIKE $4 
       OR descricao_artigo ILIKE $5
       ORDER BY data_encomenda DESC`,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao pesquisar encomendas:', error);
    res.status(500).json({ error: 'Erro ao pesquisar encomendas' });
  }
});

// Obter encomenda por campos específicos (para QR code)
router.post('/find', async (req, res) => {
  try {
    const {
      numero_requisicao,
      numero_encomenda,
      codigo_artigo
    } = req.body;

    const result = await pool.query(
      `SELECT * FROM encomendas_fornecedor 
       WHERE numero_requisicao = $1 
       AND numero_encomenda = $2 
       AND codigo_artigo = $3`,
      [numero_requisicao, numero_encomenda, codigo_artigo]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Encomenda não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao encontrar encomenda:', error);
    res.status(500).json({ error: 'Erro ao encontrar encomenda' });
  }
});

// Obter encomenda por ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM encomendas_fornecedor WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Encomenda não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao obter encomenda:', error);
    res.status(500).json({ error: 'Erro ao obter encomenda' });
  }
});

export default router;
