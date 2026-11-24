import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { expect, it } from 'vitest';
import type { Job } from '../../src/domain/types';

const testUrl = process.env.UTAS_TEST_DATABASE_URL;
const test = testUrl ? it : it.skip;

test('worker pg-boss menjalankan batch dan klik ganda tetap membuat satu batch', async () => {
  if (!new URL(testUrl!).pathname.endsWith('_test')) throw new Error('Gunakan database integrasi terpisah.');
  process.env.DATABASE_URL = testUrl;
  process.env.UTAS_MODE = 'demo';
  const { pool } = await import('../../src/server/db/client');
  await pool.query(await readFile('drizzle/0000_studio.sql', 'utf8'));
  const { POST, GET } = await import('../../src/app/api/[...path]/route');
  const worker = spawn(process.execPath, ['--import', 'tsx', 'src/server/jobs/worker.ts'], {
    env: { ...process.env, DATABASE_URL: testUrl, UTAS_MODE: 'demo' },
  });
  let logs = '';
  worker.stdout.on('data', (buffer) => { logs += buffer.toString(); });
  worker.stderr.on('data', (buffer) => { logs += buffer.toString(); });
  const stop = new Promise<void>((resolve) => worker.once('close', () => resolve()));
  async function waitFor<T>(get: () => T | Promise<T>, match: (value: T) => boolean) {
    for (let i = 0; i < 125; i++) {
      const value = await get();
      if (match(value)) return value;
      await sleep(120);
    }
    throw new Error(`Worker timeout. ${logs}`);
  }
  const create = () => POST(new Request('http://localhost/api/batches', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: `Uji antrean ${Date.now()}`, versionId: 0, profiles: ['Ceplas-ceplos'] }),
  }), { params: Promise.resolve({ path: ['batches'] }) });
  const read = (resource: string, id: string) => GET(new Request(`http://localhost/api/${resource}/${id}`),
    { params: Promise.resolve({ path: [resource, id] }) });
  try {
    await waitFor(() => logs, (text) => text.includes('Worker Utas Studio siap'));
    const outcomes = await Promise.all([create(), create()]);
    expect(outcomes.map((response) => response.status).sort()).toEqual([200, 409]);
    const queued: Job = await outcomes.find((response) => response.ok)!.json();
    const last = await waitFor(async () => await (await read('jobs', queued.id)).json() as Job,
      (job) => job.status === 'done' || job.status === 'failed');
    expect(last.status, last.error ?? logs).toBe('done');
    const batch = await (await read('batches', String(queued.batchId))).json();
    expect(batch.drafts).toHaveLength(25);
    expect(new Set(batch.drafts.map((draft: { slot: number }) => draft.slot)).size).toBe(25);
  } finally {
    worker.kill('SIGTERM');
    await stop;
    await pool.end();
  }
});
