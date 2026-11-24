import { randomUUID } from 'node:crypto';
import type { Blueprint, Example, Job, Version } from '../../domain/types';
import { mode } from '../config';
import { Problem } from '../errors';
import { pool } from './client';

type JobInput = { examples?: Example[]; previousText?: string };
type JobRow = Job & { input: JobInput; queued_at: Date | null };
const columns = 'id,kind,status,batch_id AS "batchId",slot,phase,completed,total,error,result,input,queued_at';
const publicJob = ({ input: _input, queued_at: _queued, ...job }: JobRow): Job => job;

export async function getJob(id: string) {
  const { rows: [job] } = await pool.query<JobRow>(
    `SELECT ${columns} FROM studio_jobs WHERE id=$1 AND mode=$2`, [id, mode]);
  if (!job) throw new Problem(404, 'Pekerjaan tidak ditemukan.');
  return job;
}
export async function readJob(id: string) { return publicJob(await getJob(id)); }

export async function latestJob(filter: 'running' | 'analysis') {
  const condition = filter === 'running' ? "status IN ('queued','working')" : "kind='analyze'";
  const { rows: [job] } = await pool.query<JobRow>(
    `SELECT ${columns} FROM studio_jobs WHERE mode=$1 AND ${condition} ORDER BY created_at DESC LIMIT 1`, [mode]);
  return job ? publicJob(job) : null;
}

type QueueOptions = {
  kind: Job['kind']; batchId?: number; slot?: number; input?: JobInput;
  create?: { topic: string; version: Version; profiles: string[] };
};
export async function enqueue(options: QueueOptions) {
  const { kind, slot, input, create } = options;
  const client = await pool.connect();
  const id = randomUUID();
  try {
    await client.query('BEGIN');
    let batchId = options.batchId ?? null;
    if (create) {
      const { topic, version, profiles } = create;
      const { rows: [batch] } = await client.query<{ id: number }>(
        'INSERT INTO batches(topic,mode,version_id,profiles,blueprint) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [topic, mode, version.id, JSON.stringify(profiles), JSON.stringify(version.blueprint)]);
      batchId = batch.id;
    }
    if (batchId && !create) {
      await client.query('SELECT 1 FROM batches WHERE id=$1 FOR UPDATE', [batchId]);
      if (kind === 'generate' && (await client.query('SELECT 1 FROM drafts WHERE batch_id=$1', [batchId])).rowCount === 25) {
        throw new Problem(409, 'Batch sudah lengkap.');
      }
    }
    await client.query(`INSERT INTO studio_jobs(id,mode,kind,status,batch_id,slot,input,phase)
      VALUES ($1,$2,$3,'queued',$4,$5,$6,'Menunggu worker')`,
    [id, mode, kind, batchId, slot ?? null, JSON.stringify(input ?? {})]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if ((error as { code?: string }).code === '23505') throw new Problem(409, 'Ada proses yang sedang berjalan.');
    throw error;
  } finally { client.release(); }
  return readJob(id);
}

export function progress(id: string, phase: string, completed = 0, total: number | null = null) {
  return pool.query("UPDATE studio_jobs SET status='working', phase=$2,completed=$3,total=$4 WHERE id=$1",
    [id, phase, completed, total]);
}
export function finish(id: string, result?: Blueprint, error?: string) {
  return pool.query('UPDATE studio_jobs SET status=$2,phase=$3,result=$4,error=$5 WHERE id=$1',
    [id, error ? 'failed' : 'done', error ? 'Proses berhenti' : 'Selesai', result ? JSON.stringify(result) : null, error ?? null]);
}

export async function previewIsActive(id: string) {
  return Boolean((await pool.query('SELECT 1 FROM blueprints WHERE job_id=$1 AND mode=$2', [id, mode])).rowCount);
}
