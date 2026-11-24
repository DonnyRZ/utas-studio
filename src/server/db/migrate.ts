import { readdir, readFile } from 'node:fs/promises';
import { pool } from './client';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(902455)');
    await client.query('CREATE TABLE IF NOT EXISTS studio_migrations(file text PRIMARY KEY)');
    for (const file of (await readdir('drizzle')).filter((name) => name.endsWith('.sql')).sort()) {
      if ((await client.query('SELECT 1 FROM studio_migrations WHERE file = $1', [file])).rowCount) continue;
      await client.query(await readFile(`drizzle/${file}`, 'utf8'));
      await client.query('INSERT INTO studio_migrations VALUES ($1)', [file]);
      console.log(`Migrasi ${file} selesai.`);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
migrate().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());
