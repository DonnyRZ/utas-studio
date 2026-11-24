import { PgBoss } from 'pg-boss';
import { databaseUrl, mode } from '../config';
import { pool } from '../db/client';
import { finish } from '../db/jobs';
import { perform } from './runner';

const boss = new PgBoss({ connectionString: databaseUrl });
const queue = `utas-studio-${mode}`;
boss.on('error', (error) => console.error('Antrean', error.message));

async function dispatch() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM studio_jobs
      WHERE mode=$1 AND status='queued' AND queued_at IS NULL FOR UPDATE SKIP LOCKED`, [mode]);
    for (const { id } of rows) {
      const delivered = await boss.send(queue, { id }, {
        id, db: { executeSql: (query, params) => client.query(query, params) },
      });
      if (!delivered) throw new Error('Pekerjaan gagal masuk antrean.');
      await client.query('UPDATE studio_jobs SET queued_at=now() WHERE id=$1', [id]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM studio_jobs
    WHERE mode=$1 AND queued_at IS NOT NULL AND status IN ('queued','working')`, [mode]);
  for (const { id } of rows) {
    const queued = await boss.getJobById(queue, id);
    if (queued?.state === 'failed' || queued?.state === 'cancelled' || !queued) {
      await finish(id, undefined, 'Worker belum menyelesaikan proses. Hasil yang sudah lolos tetap tersimpan.');
    }
  }
}

async function main() {
  await boss.start();
  await boss.createQueue(queue, { retryLimit: 2, retryDelay: 5, expireInSeconds: 3600, heartbeatSeconds: 60 });
  await boss.work<{ id: string }>(queue, { pollingIntervalSeconds: 0.5 }, async ([item]) => {
    await perform(item.data.id);
  });
  await dispatch();
  let inFlight: Promise<void> | undefined;
  const timer = setInterval(() => {
    if (inFlight) return;
    inFlight = dispatch().catch((error) => console.error('Pengiriman antrean', error.message))
      .finally(() => { inFlight = undefined; });
  }, 1500);
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    clearInterval(timer);
    await inFlight;
    await boss.stop({ graceful: true, timeout: 15000 });
    await pool.end();
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
  console.log(`Worker Utas Studio siap (${mode}).`);
}

main().catch(async (error) => {
  console.error(error);
  await boss.stop({ graceful: false });
  await pool.end();
  process.exitCode = 1;
});
