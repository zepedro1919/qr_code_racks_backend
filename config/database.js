import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuração do pool - SSL apenas para conexões externas
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

// Adicionar SSL apenas se não for conexão interna do Railway
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('.railway.internal')) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(poolConfig);

// Testar conexão
pool.connect()
  .then(client => {
    console.log('✅ Conectado à base de dados PostgreSQL');
    client.release();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar à base de dados:', err.message);
  });

export default pool;
