import type { Example, Profile } from '../../domain/types';
import { lexicalSimilarity, normalize } from '../../domain/text';
import { Problem } from '../errors';

export function partition(examples: Example[]) {
  const training: Example[] = [];
  const heldOut: Example[] = [];
  for (const example of examples) {
    const nearTraining = training.some((item) => lexicalSimilarity(item.text, example.text) >= 0.65);
    const nearHoldout = heldOut.some((item) => lexicalSimilarity(item.text, example.text) >= 0.65);
    if (nearTraining && nearHoldout) continue;
    if (nearHoldout || (!nearTraining && examples.length >= 5 &&
        (training.length + heldOut.length) % 5 === 4)) heldOut.push(example);
    else training.push(example);
  }
  return { training, heldOut };
}

export function verifyProfiles(profiles: Profile[], sources: Example[]) {
  const texts = new Map(sources.map((item) => [`${item.id}:${item.revision}`, item.text]));
  const names = new Set<string>();
  if (!profiles.length || profiles.length > 5) throw new Problem(422, 'Blueprint harus berisi 1–5 profil.');
  for (const profile of profiles) {
    const name = normalize(profile.name);
    if (!name || names.has(name) || profile.name.length > 80 || !profile.summary.trim() ||
        !profile.miniExample.trim() || !profile.rules.some((rule) => rule.core) ||
        profile.minEmoji < 0 || profile.maxEmoji < profile.minEmoji || profile.maxEmoji > 50 ||
        profile.maxCharacters < 1 || profile.maxCharacters > 500) {
      throw new Problem(422, 'Profil gaya atau batas penulisan belum valid.');
    }
    names.add(name);
    for (const rule of profile.rules) {
      if (!rule.dimension.trim() || !rule.instruction.trim() || rule.instruction.length > 600 || !rule.evidence.length ||
          rule.evidence.some(({ id, revision, quote }) => !quote.trim() || !texts.get(`${id}:${revision}`)?.includes(quote))) {
        throw new Problem(422, 'Ada aturan dengan bukti yang tidak ditemukan di sumber.');
      }
    }
    if (sources.some(({ text }) => normalize(text) === normalize(profile.miniExample) ||
      lexicalSimilarity(text, profile.miniExample) >= 0.65)) {
      throw new Problem(422, 'Contoh mini terlalu mirip dengan sumber.');
    }
  }
}
