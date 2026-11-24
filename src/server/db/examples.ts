import { and, asc, eq } from 'drizzle-orm';
import { normalize } from '../../domain/text';
import { db, pool } from './client';
import { examples, exampleRevisions } from './schema';
import { Problem } from '../errors';

export function listExamples() {
  return db.select({ id: examples.id, revision: examples.revision, text: exampleRevisions.text })
    .from(examples).innerJoin(exampleRevisions, and(eq(examples.id, exampleRevisions.id),
      eq(examples.revision, exampleRevisions.revision)))
    .where(eq(examples.archived, false)).orderBy(asc(examples.id));
}

export async function saveExamples(texts: string[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(902456)');
    const current = await client.query<{ normalized: string }>(`SELECT r.normalized FROM examples e
      JOIN example_revisions r ON r.example_id=e.id AND r.revision=e.revision WHERE NOT archived`);
    const known = new Set(current.rows.map(({ normalized }) => normalized));
    let added = 0;
    for (const text of texts) {
      const key = normalize(text);
      if (!key || known.has(key)) continue;
      if (known.size >= 100) throw new Problem(400, 'Pustaka memuat maksimal 100 contoh aktif.');
      const result = await client.query<{ id: number }>('INSERT INTO examples DEFAULT VALUES RETURNING id');
      await client.query('INSERT INTO example_revisions VALUES ($1,1,$2,$3)', [result.rows[0].id, text, key]);
      known.add(key);
      added++;
    }
    await client.query('COMMIT');
    return { added, skipped: texts.length - added };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function updateExample(id: number, revision: number, text?: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(902456)');
    const locked = await client.query<{ revision: number }>(
      'SELECT revision FROM examples WHERE id=$1 AND NOT archived FOR UPDATE', [id]);
    if (!locked.rowCount) throw new Problem(404, 'Contoh tidak ditemukan.');
    if (locked.rows[0].revision !== revision) throw new Problem(409, 'Contoh sudah berubah. Muat ulang lalu coba lagi.');
    if (text === undefined) {
      await client.query('UPDATE examples SET archived=true WHERE id=$1', [id]);
    } else {
      const key = normalize(text);
      const duplicate = await client.query(`SELECT 1 FROM example_revisions r JOIN examples e
        ON e.id=r.example_id AND e.revision=r.revision WHERE NOT e.archived AND e.id<>$1 AND r.normalized=$2`, [id, key]);
      if (!key || duplicate.rowCount) throw new Problem(409, 'Contoh kosong atau sudah ada di pustaka.');
      await client.query('INSERT INTO example_revisions VALUES ($1,$2,$3,$4)', [id, revision + 1, text, key]);
      await client.query('UPDATE examples SET revision=$2 WHERE id=$1', [id, revision + 1]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
