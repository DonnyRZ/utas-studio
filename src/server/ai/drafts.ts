import { setTimeout as sleep } from 'node:timers/promises';
import { TARGET, type Draft, type Job } from '../../domain/types';
import { mode } from '../config';
import { getBatch, saveDraft, savePlan } from '../db/batches';
import { Problem } from '../errors';
import type { Report } from './blueprint';
import { demoCandidates } from './demo';
import { checkDraft, gradeDrafts } from './draft-check';
import { ask } from './openai';
import { duplicatesText, findNovelty, loadCorpus } from './originality';
import { compactProfile, makePlan, reviseIdeas, type Compact, type Pending } from './planning';
import { write } from './prompts/drafts';
import { writeSchema } from './schemas';

async function writeGroup(topic: string, batchId: number, round: number, group: Pending[],
  profiles: Map<string, Compact>, corpus: string[]) {
  if (mode === 'demo') {
    await sleep(210);
    const existing = [...corpus];
    return group.map((slot) => {
      const item = demoCandidates(topic, slot.slot, batchId, round).find(({ text }) => !duplicatesText(text, existing));
      if (item) existing.push(item.text);
      return { ...slot, ...item, text: item?.text };
    });
  }
  const { items } = await ask('write_drafts', write, {
    topic, slots: group, profiles: [...new Set(group.map(({ profile }) => profile))].map((name) => profiles.get(name)),
  }, writeSchema);
  return group.map((slot) => ({ ...slot, text: items.find((item) => item.slot === slot.slot)?.text?.trim() }));
}

export async function generate(job: Job, previousText: string | undefined, report: Report) {
  const id = job.batchId!;
  const batch = await getBatch(id);
  const selected = batch.blueprint.profiles.filter(({ name }) => batch.profiles.includes(name)).map(compactProfile);
  const profiles = new Map(selected.map((profile) => [profile.name, profile]));
  const filled = new Set(batch.drafts.map(({ slot }) => slot));
  const isReplacing = job.kind === 'replace';
  const show = (phase: string) => report(phase, isReplacing ? 0 : filled.size, isReplacing ? null : TARGET);
  await show('Merencanakan sudut pandang');
  const plan = batch.plan ?? await makePlan(id, batch.topic, selected);
  if (!batch.plan) await savePlan(id, plan);
  const corpus = await loadCorpus();
  const historic = [...plan.map((item) => item.angle), ...batch.drafts.map((item) => item.angle)];
  let pending: Pending[];
  if (isReplacing) {
    const old = batch.drafts.find(({ slot }) => slot === job.slot);
    if (!old) throw new Problem(404, 'Draf tidak ditemukan.');
    if (old.text !== previousText) {
      if ((old.assessment as { jobId?: string }).jobId === job.id) return;
      throw new Problem(409, 'Draf berubah sebelum penggantian. Coba lagi.');
    }
    pending = [{ ...old, avoid: old.text, feedback: 'Buat ide baru dan punchline berbeda.' }];
    if (mode === 'live') pending = await reviseIdeas(batch.topic, pending, selected, historic);
  } else {
    pending = plan.filter(({ slot }) => !filled.has(slot));
  }
  for (let round = 0; round < 3 && pending.length; round++) {
    const retry: Pending[] = [];
    for (let offset = 0; offset < pending.length; offset += 5) {
      await show('Menulis draf');
      const written = await writeGroup(batch.topic, id, round, pending.slice(offset, offset + 5), profiles, corpus);
      const candidates: Draft[] = [];
      for (const item of written) {
        const issue = checkDraft(item.text, profiles.get(item.profile)!);
        if (issue) retry.push({ ...item, feedback: issue });
        else if (duplicatesText(item.text!, corpus)) retry.push({ ...item, replan: true,
          feedback: 'Redaksi terlalu mirip. Tulis lelucon dengan sudut baru.' });
        else candidates.push({ ...item, text: item.text! });
      }
      await show('Menilai kesesuaian gaya');
      const assessments = await gradeDrafts(batch.topic, candidates, profiles);
      const passed = candidates.filter((item) => {
        const grade = assessments.get(item.slot);
        if (grade?.fits && grade.evidence.trim() && item.text.includes(grade.evidence)) return true;
        retry.push({ ...item, feedback: grade?.reason || 'Sesuaikan dengan aturan inti profil.' });
        return false;
      });
      await show('Memeriksa kemiripan');
      const novelty = await findNovelty(passed, corpus);
      for (const item of passed) {
        const verdict = novelty.get(item.slot);
        if (duplicatesText(item.text, corpus) || verdict?.repeats) {
          retry.push({ ...item, replan: true, feedback: verdict?.reason || 'Lelucon diulang dalam batch.' });
          continue;
        }
        await saveDraft(id, item, { jobId: job.id, style: assessments.get(item.slot), novelty: verdict ?? null },
          isReplacing, isReplacing ? previousText : undefined);
        corpus.push(item.text);
        filled.add(item.slot);
        historic.push(item.angle);
        await show('Memeriksa kemiripan');
      }
    }
    const replan = retry.filter((item) => item.replan);
    if (mode === 'live' && replan.length && round < 2) {
      const updated = new Map((await reviseIdeas(batch.topic, replan, selected, historic)).map((slot) => [slot.slot, slot]));
      pending = retry.map((slot) => updated.get(slot.slot) ?? slot);
    } else pending = retry;
  }
  if (pending.length) throw new Problem(422, isReplacing
    ? 'Belum ada pengganti yang lolos. Draf semula masih tersimpan.'
    : 'Sebagian slot belum lolos. Draf yang sudah lolos tetap tersimpan.');
}
