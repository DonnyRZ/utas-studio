import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { Draft, HistoryEntry, Slot } from '../../domain/types';
import { mode } from '../config';
import { Problem } from '../errors';
import { db, pool } from './client';
import { batches, drafts } from './schema';

export async function getBatch(id: number) {
  const [batch] = await db.select().from(batches).where(and(eq(batches.id, id), eq(batches.mode, mode)));
  if (!batch) throw new Problem(404, 'Batch tidak ditemukan.');
  const items = await db.select().from(drafts).where(eq(drafts.batchId, id)).orderBy(asc(drafts.slot));
  return { ...batch, drafts: items };
}

export async function readBatch(id: number) {
  const { topic, versionId, profiles, createdAt, drafts: items } = await getBatch(id);
  const latest = await pool.query<{ error: string }>(
    'SELECT error FROM studio_jobs WHERE batch_id=$1 ORDER BY created_at DESC LIMIT 1', [id]);
  return { id, topic, versionId, profiles, createdAt, drafts: items.map(({ slot, text, profile, angle, device }) =>
    ({ slot, text, profile, angle, device })), lastError: latest.rows[0]?.error ?? null };
}

export function history(): Promise<HistoryEntry[]> {
  return db.select({ id: batches.id, topic: batches.topic, createdAt: batches.createdAt,
    count: sql<number>`count(${drafts.slot})::integer` })
    .from(batches).leftJoin(drafts, eq(batches.id, drafts.batchId)).where(eq(batches.mode, mode))
    .groupBy(batches.id).orderBy(desc(batches.id));
}

export async function savePlan(id: number, plan: Slot[]) {
  await db.update(batches).set({ plan }).where(eq(batches.id, id));
}

export async function saveDraft(id: number, draft: Draft, assessment: object, replace = false, expected?: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM batches WHERE id=$1 FOR UPDATE', [id]);
    const { rows: [old] } = await client.query<{ text: string }>(
      'SELECT text FROM drafts WHERE batch_id=$1 AND slot=$2', [id, draft.slot]);
    if (expected !== undefined && old?.text !== expected) {
      throw new Problem(409, 'Draf sudah berubah. Muat ulang sebelum mengeditnya.');
    }
    if (!old || replace) {
      if (old && old.text !== draft.text) {
        await client.query('INSERT INTO draft_archive(batch_id,text) VALUES ($1,$2)', [id, old.text]);
      }
      await client.query(`INSERT INTO drafts VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (batch_id,slot) DO UPDATE SET text=excluded.text, angle=excluded.angle,
        device=excluded.device, assessment=excluded.assessment`,
      [id, draft.slot, draft.profile, draft.angle, draft.device, draft.text, JSON.stringify(assessment)]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
