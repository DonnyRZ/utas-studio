import { metrics, normalize } from '../../domain/text';
import type { Draft } from '../../domain/types';
import { mode } from '../config';
import type { Compact } from './planning';
import { ask } from './openai';
import { grade } from './prompts/drafts';
import { gradeSchema } from './schemas';

export function checkDraft(text: string | undefined, profile: Compact) {
  if (!text || !normalize(text)) return 'Draf kosong atau slot tidak dikembalikan.';
  const count = metrics(text);
  if (count.characters > profile.maxCharacters) return 'Draf terlalu panjang.';
  if (count.emojis < profile.minEmoji || count.emojis > profile.maxEmoji) return 'Jumlah emoji di luar rentang profil.';
  return '';
}

export async function gradeDrafts(topic: string, candidates: Draft[], profiles: Map<string, Compact>) {
  if (mode === 'demo' || !candidates.length) return new Map(candidates.map(({ slot, text }) =>
    [slot, { fits: true, reason: 'Simulasi', evidence: text.slice(0, 20) }]));
  const { items } = await ask('grade_drafts', grade, {
    topic, drafts: candidates.map((item) => ({ ...item, rubric: profiles.get(item.profile) })),
  }, gradeSchema);
  return new Map(items.map((item) => [item.slot, item]));
}
