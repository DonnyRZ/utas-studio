import type { Draft } from '../../domain/types';
import { lexicalSimilarity, normalize } from '../../domain/text';
import { mode } from '../config';
import { pool } from '../db/client';
import { cacheEmbeddings, nearestMatches } from './embeddings';
import { ask } from './openai';
import { novelty } from './prompts/drafts';
import { noveltySchema } from './schemas';

export async function loadCorpus() {
  const { rows } = await pool.query<{ text: string }>(`SELECT text FROM example_revisions
    UNION SELECT drafts.text FROM drafts JOIN batches ON batches.id=drafts.batch_id WHERE batches.mode=$1
    UNION SELECT draft_archive.text FROM draft_archive JOIN batches ON batches.id=draft_archive.batch_id WHERE batches.mode=$1`, [mode]);
  return rows.map(({ text }) => text);
}

export function duplicatesText(text: string, corpus: string[]) {
  const key = normalize(text);
  return corpus.some((ref) => normalize(ref) === key || lexicalSimilarity(text, ref) >= 0.70);
}

export async function findNovelty(candidates: Draft[], corpus: string[]) {
  if (mode === 'demo' || !candidates.length) return new Map<number, { repeats: boolean; reason: string }>();
  const texts = candidates.map(({ text }) => text);
  await cacheEmbeddings([...corpus, ...texts]);
  const comparisons = await Promise.all(candidates.map(async ({ slot, text }, index) => ({
    slot, text, nearest: await nearestMatches(text, [...corpus, ...texts.slice(0, index)]),
  })));
  const inputs = comparisons.filter((item) => item.nearest.length);
  if (!inputs.length) return new Map<number, { repeats: boolean; reason: string }>();
  const { items } = await ask('check_novelty', novelty, inputs, noveltySchema);
  return new Map(inputs.map(({ slot }) => [slot, items.find((item) => item.slot === slot) ??
    { repeats: true, reason: 'Penilaian orisinalitas belum lengkap.' }]));
}
