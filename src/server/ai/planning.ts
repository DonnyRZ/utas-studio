import { normalize } from '../../domain/text';
import { TARGET, type Profile, type Slot } from '../../domain/types';
import { mode } from '../config';
import { pool } from '../db/client';
import { Problem } from '../errors';
import { ask } from './openai';
import { plan } from './prompts/drafts';
import { planSchema } from './schemas';

export function compactProfile(profile: Profile) {
  const { name, summary, rules, minEmoji, maxEmoji, maxCharacters, miniExample } = profile;
  return { name, summary, minEmoji, maxEmoji, maxCharacters, miniExample,
    rules: rules.map(({ dimension, instruction, core }) => ({ dimension, instruction, core })) };
}
export type Compact = ReturnType<typeof compactProfile>;
export type Pending = Slot & { feedback?: string; replan?: boolean; avoid?: string };

export async function makePlan(id: number, topic: string, profiles: Compact[]): Promise<Slot[]> {
  const slots = Array.from({ length: TARGET }, (_, index) => ({ slot: index + 1,
    profile: profiles[index % profiles.length].name }));
  if (mode === 'demo') return slots.map((item) => ({ ...item,
    angle: `Sudut pandang ${item.slot}`, device: 'Observasi' }));
  const { rows } = await pool.query<{ angle: string }>(`SELECT angle FROM drafts INNER JOIN batches
    ON batches.id=drafts.batch_id WHERE batches.topic=$1 AND batches.id<>$2 AND batches.mode=$3
    ORDER BY batches.id DESC LIMIT 50`, [topic, id, mode]);
  const { items } = await ask('plan_drafts', plan, { topic, slots, profiles, historic: rows.map(({ angle }) => angle) }, planSchema);
  const seen = new Set<string>();
  return slots.map((slot) => {
    const item = items.find((entry) => entry.slot === slot.slot);
    const key = normalize(item?.angle ?? '');
    if (!item || !key || seen.has(key) || !item.device.trim()) {
      throw new Problem(502, 'Model belum menghasilkan 25 sudut pandang yang berbeda.');
    }
    seen.add(key);
    return { ...slot, angle: item.angle, device: item.device };
  });
}

export async function reviseIdeas(topic: string, pending: Pending[], profiles: Compact[], angles: string[]) {
  const { items } = await ask('revise_ideas', plan, { topic, slots: pending, profiles, historic: angles }, planSchema);
  const seen = new Set(angles.map(normalize));
  return pending.map((slot) => {
    const item = items.find((entry) => entry.slot === slot.slot);
    const key = normalize(item?.angle ?? '');
    if (!item || !key || seen.has(key) || !item.device.trim()) return slot;
    seen.add(key);
    return { ...slot, angle: item.angle, device: item.device, replan: false };
  });
}
