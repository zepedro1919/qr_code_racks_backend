import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runSQL = async (filename) => {
  const filePath = path.join(__dirname, filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`\n📄 Running ${filename}...`);
  
  try {
    await pool.query(sql);
    console.log(`✅ ${filename} executed successfully`);
  } catch (error) {
    console.error(`❌ Error running ${filename}:`, error.message);
    throw error;
  }
};

const command = process.argv[2] || 'migrate';

const main = async () => {
  console.log('🗄️  Database Runner');
  console.log('='.repeat(40));
  
  try {
    switch (command) {
      case 'init':
        console.log('Initializing database from scratch...');
        await runSQL('init.sql');
        break;
      
      case 'migrate':
        console.log('Running migration on existing database...');
        await runSQL('migrate.sql');
        break;
      
      case 'seed':
        console.log('Seeding database...');
        await runSQL('seed.sql');
        break;
      
      case 'all':
        console.log('Running init + seed...');
        await runSQL('init.sql');
        await runSQL('seed.sql');
        break;
      
      default:
        // Run a specific SQL file
        if (fs.existsSync(path.join(__dirname, command))) {
          await runSQL(command);
        } else {
          console.log('Usage: node db/run.js [init|migrate|seed|all|filename.sql]');
        }
    }
    
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main();
