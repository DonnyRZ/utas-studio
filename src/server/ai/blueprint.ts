import { setTimeout as sleep } from 'node:timers/promises';
import { metrics } from '../../domain/text';
import type { Blueprint, Example, Validation } from '../../domain/types';
import { mode } from '../config';
import { Problem } from '../errors';
import { partition, verifyProfiles } from './blueprint-validation';
import { defaultStyles } from './defaults';
import { ask } from './openai';
import * as prompt from './prompts/blueprint';
import { holdoutSchema, observationSchema, profilesSchema } from './schemas';

export type Report = (phase: string, done?: number, total?: number | null) => Promise<unknown>;

export async function buildBlueprint(examples: Example[], report: Report): Promise<Blueprint> {
  const { training, heldOut } = partition(examples);
  if (mode === 'demo') {
    await report('Membaca contoh utas');
    await sleep(750);
    const preset = defaultStyles.blueprint.profiles[0];
    return { sourceCount: examples.length, checks: [], profiles: [{
      ...preset, provisional: true,
      rules: preset.rules.map((rule) => ({ ...rule, evidence: training.slice(0, 2).map(({ id, revision, text }) =>
        ({ id, revision, quote: text.slice(0, 80) })) })),
    }] };
  }
  const observations = [];
  await report('Membaca contoh utas', 0, training.length);
  for (let offset = 0; offset < training.length; offset += 8) {
    const group = training.slice(offset, offset + 8);
    const { items } = await ask('observe_examples', prompt.observe, group, observationSchema);
    for (const example of group) {
      const item = items.find(({ id, quote }) => id === example.id && quote.trim() && example.text.includes(quote));
      if (!item) throw new Problem(422, 'Satu observasi belum memiliki kutipan bukti yang valid.');
      observations.push({ ...item, revision: example.revision, metrics: metrics(example.text) });
    }
    await report('Membaca contoh utas', observations.length, training.length);
  }
  await report('Menyusun profil gaya');
  const { profiles } = await ask('synthesize_blueprint', prompt.synthesize,
    { observations, sources: training }, profilesSchema, 'medium');
  verifyProfiles(profiles, training);
  let checks: Validation[] = [];
  if (heldOut.length) {
    await report('Menguji dengan contoh yang disisihkan');
    const { items } = await ask('validate_blueprint', prompt.holdout, { profiles, examples: heldOut }, holdoutSchema);
    checks = heldOut.map(({ id }) => items.find((item) => item.id === id &&
      (!item.fits || profiles.some((profile) => profile.name === item.profile))) ??
      { id, profile: '', fits: false, rationale: 'Belum ada penilaian yang bisa dipakai.' });
  }
  return { sourceCount: examples.length, checks, profiles: profiles.map((profile) => ({
    ...profile,
    provisional: !checks.some((item) => item.fits && item.profile === profile.name) ||
      new Set(profile.rules.flatMap((rule) => rule.evidence.map((item) => item.id))).size < 3,
  })) };
}
