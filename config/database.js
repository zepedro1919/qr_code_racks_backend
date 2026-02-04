import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

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
