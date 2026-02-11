import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import racksRoutes from './routes/racks.js';
import encomendasRoutes from './routes/encomendas.js';
import racksEncomendasRoutes from './routes/racksEncomendas.js';
import zonasRoutes from './routes/zonas.js';
import produtosRoutes from './routes/produtos.js';
import produtosZonaRoutes from './routes/produtosZona.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://qrcoderacksfrontend-production.up.railway.app',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    // Permitir qualquer origem .railway.app em produção
    if (origin && origin.includes('.railway.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Rate limiter geral
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP
  message: { error: 'Demasiados pedidos. Por favor, aguarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(generalLimiter);

// Trust proxy (necessário para Railway)
app.set('trust proxy', 1);

// Rota raiz - info básica
app.get('/', (req, res) => {
  res.json({ 
    app: 'QR Racks API',
    status: 'running',
    endpoints: ['/api/health', '/api/auth/login']
  });
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/racks', racksRoutes);
app.use('/api/encomendas', encomendasRoutes);
app.use('/api/racks-encomendas', racksEncomendasRoutes);
app.use('/api/zonas', zonasRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/produtos-zona', produtosZonaRoutes);

// Rota de health check com teste de DB
app.get('/api/health', async (req, res) => {
  try {
    const dbTest = await import('./config/database.js');
    const result = await dbTest.default.query('SELECT NOW()');
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbTime: result.rows[0].now
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'error',
      dbError: error.message
    });
  }
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
