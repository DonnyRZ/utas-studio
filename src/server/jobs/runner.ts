import { buildBlueprint } from '../ai/blueprint';
import { generate } from '../ai/drafts';
import { finish, getJob, progress } from '../db/jobs';
import { Problem } from '../errors';

export async function perform(id: string) {
  const job = await getJob(id);
  if (job.status === 'done' || job.status === 'failed') return;
  const report = (phase: string, count?: number, total?: number | null) => progress(id, phase, count, total);
  await report('Menyiapkan proses');
  try {
    if (job.kind === 'analyze') {
      return await finish(id, await buildBlueprint(job.input.examples ?? [], report));
    }
    await generate(job, job.input.previousText, report);
    await finish(id);
  } catch (error) {
    if (!(error instanceof Problem)) throw error;
    await finish(id, undefined, error.message);
  }
}
