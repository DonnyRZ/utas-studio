import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { databaseUrl } from '../config';

const singleton = globalThis as typeof globalThis & { utasPool?: Pool };
export const pool = singleton.utasPool ?? new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
pool.on('error', (error) => console.error('PostgreSQL', error.message));
if (process.env.NODE_ENV !== 'production') singleton.utasPool = pool;
export const db = drizzle(pool);
