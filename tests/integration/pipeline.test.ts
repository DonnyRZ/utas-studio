import { afterAll, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import type { Batch, Job, Version } from '../../src/domain/types';
import { examples } from './drafts-fixture';
import { openaiFixture } from './openai-fixture';

const testUrl = process.env.UTAS_TEST_DATABASE_URL;
const test = testUrl ? it : it.skip;

test('PostgreSQL memulihkan batch, menyimpan blueprint, dan memakai ulang embedding', async () => {
  const name = new URL(testUrl!).pathname;
  if (!name.endsWith('_test')) throw new Error('Database integrasi harus berakhiran _test.');
  process.env.DATABASE_URL = testUrl;
  process.env.OPENAI_API_KEY = 'fixture-key';
  process.env.UTAS_MODE = 'live';
  process.env.OPENAI_MODEL = 'fixture-generation';
  process.env.OPENAI_EMBEDDING_MODEL = 'fixture-embedding';
  const { pool } = await import('../../src/server/db/client');
  try {
    await pool.query(await readFile('drizzle/0000_studio.sql', 'utf8'));
    await pool.query(await readFile('drizzle/0001_model_native_dimensions.sql', 'utf8'));
    await pool.query('TRUNCATE studio_jobs, embeddings, drafts, draft_archive, batches, blueprints, example_revisions, examples RESTART IDENTITY');
    const { GET, POST, PATCH } = await import('../../src/app/api/[...path]/route');
    const { perform } = await import('../../src/server/jobs/runner');
    const fake = openaiFixture();
    vi.stubGlobal('fetch', fake.fetch);
    const call = async <T>(path: string, method: 'GET' | 'POST' | 'PATCH' = 'GET', value?: object) => {
      const handler = { GET, POST, PATCH }[method];
      const request = new Request(`http://localhost/api/${path}`, { method,
        headers: value ? { 'Content-Type': 'application/json' } : {},
        body: value ? JSON.stringify(value) : undefined });
      const res = await handler(request, { params: Promise.resolve({ path: path.split('/') }) });
      const data = await res.json();
      expect(res.ok, data.error).toBe(true);
      return data as T;
    };
    await call('examples', 'POST', { items: examples });
    const started = await call<Job>('analyze', 'POST', {});
    await perform(started.id);
    const analyzed = await call<Job>(`jobs/${started.id}`);
    expect(analyzed.result?.checks).toHaveLength(1);
    expect(analyzed.result?.profiles[0].provisional).toBe(false);
    const version = await call<Version>('blueprint', 'POST', { jobId: started.id,
      profiles: [{ name: 'Observasi', instructions: ['Akhiri dengan belokan.'] }] });
    const generation = await call<Job>('batches', 'POST', { topic: 'Jualan online', profiles: ['Observasi'], versionId: version.id });
    await perform(generation.id);
    expect((await call<Job>(`jobs/${generation.id}`)).status).toBe('failed');
    const path = `batches/${generation.batchId}`;
    const partial = await call<Batch>(path);
    expect(partial.drafts).toHaveLength(5);
    fake.control.failSecondGroup = false;
    const continuing = await call<Job>(`${path}/complete`, 'POST', {});
    await perform(continuing.id);
    const full = await call<Batch>(path);
    expect(full.drafts).toHaveLength(25);
    expect(full.drafts.slice(0, 5)).toEqual(partial.drafts);
    expect(fake.control.embedded).toHaveLength(30);
    expect(new Set(fake.control.embedded).size).toBe(30);
    fake.control.replace = true;
    const replacement = await call<Job>(`${path}/drafts/1/replace`, 'POST', {});
    await perform(replacement.id);
    await perform(replacement.id);
    const final = await call<Batch>(path);
    expect(final.drafts[0].angle).toBe('Timbangan rusak');
    expect(final.drafts.slice(1)).toEqual(full.drafts.slice(1));
    expect(fake.control.embedded).toHaveLength(31);
  } finally {
    vi.unstubAllGlobals();
    await pool.end();
  }
});

afterAll(() => vi.unstubAllGlobals());
