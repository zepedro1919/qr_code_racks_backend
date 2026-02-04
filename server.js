import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import racksRoutes from './routes/racks.js';
import encomendasRoutes from './routes/encomendas.js';
import racksEncomendasRoutes from './routes/racksEncomendas.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiter geral
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP
  message: { error: 'Demasiados pedidos. Por favor, aguarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(generalLimiter);

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/racks', racksRoutes);
app.use('/api/encomendas', encomendasRoutes);
app.use('/api/racks-encomendas', racksEncomendasRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Tratamento de erros gerais
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor a correr na porta ${PORT}`);
});
