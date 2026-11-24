import { z } from 'zod';
import type { Studio } from '../../domain/types';
import { mode } from '../config';
import { defaultStyles } from '../ai/defaults';
import { history } from '../db/batches';
import { listExamples, saveExamples, updateExample } from '../db/examples';
import { enqueue, getJob, latestJob, previewIsActive } from '../db/jobs';
import { activate, activeVersion } from '../db/versions';
import { Problem } from '../errors';
import { body, id, revision, text } from './validation';

export async function readStudio(): Promise<Studio> {
  const [examples, active, batches, running, lastAnalysis] = await Promise.all([
    listExamples(), activeVersion(), history(), latestJob('running'), latestJob('analysis'),
  ]);
  const analysis = lastAnalysis && ['done', 'failed'].includes(lastAnalysis.status) &&
    !await previewIsActive(lastAnalysis.id) ? lastAnalysis : null;
  return { mode, examples, active, styles: active ?? defaultStyles, history: batches, running, analysis };
}

export async function examplesRoute(request: Request, rawId?: string) {
  if (request.method === 'POST' && !rawId) {
    const { items } = await body(request, z.object({ items: z.array(text(2000)).min(1).max(100) }));
    return { ...await saveExamples(items), examples: await listExamples() };
  }
  const parsed = id.safeParse(rawId);
  if (parsed.success && (request.method === 'PATCH' || request.method === 'DELETE')) {
    const input = await body<{ revision: number; text?: string }>(request, request.method === 'PATCH'
      ? z.object({ revision, text: text(2000) }) : z.object({ revision, text: z.undefined() }));
    await updateExample(parsed.data, input.revision, input.text);
    return { examples: await listExamples() };
  }
  throw new Problem(404, 'Aksi contoh tidak ditemukan.');
}

export async function analyze() {
  const examples = await listExamples();
  if (examples.length < 2) throw new Problem(400, 'Simpan setidaknya dua contoh untuk menganalisis gaya.');
  return enqueue({ kind: 'analyze', input: { examples } });
}

export async function saveBlueprint(request: Request) {
  const input = await body(request, z.object({ jobId: z.uuid(),
    profiles: z.array(z.object({ name: text(80), instructions: z.array(text(600)).min(1) })).min(1).max(5) }));
  const job = await getJob(input.jobId);
  const latest = await latestJob('analysis');
  if (job.kind !== 'analyze' || job.status !== 'done' || !job.result || latest?.id !== job.id) {
    throw new Problem(409, 'Pratinjau sudah berubah. Buka pratinjau terbaru.');
  }
  return activate(job.id, job.result, input.profiles);
}
