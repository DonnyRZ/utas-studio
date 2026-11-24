import { z } from 'zod';

const id = z.number().int();
const evidence = z.object({ id, revision: id, quote: z.string() });
const rule = z.object({ dimension: z.string(), instruction: z.string(), core: z.boolean(), evidence: z.array(evidence) });
export const profilesSchema = z.object({ profiles: z.array(z.object({
  name: z.string(), summary: z.string(), minEmoji: id, maxEmoji: id, maxCharacters: id,
  miniExample: z.string(), rules: z.array(rule),
})) });
export const observationSchema = z.object({ items: z.array(z.object({
  id, register: z.string(), opening: z.string(), humor: z.string(), ending: z.string(), quote: z.string(),
})) });
export const holdoutSchema = z.object({ items: z.array(z.object({
  id, profile: z.string(), fits: z.boolean(), rationale: z.string(),
})) });
export const planSchema = z.object({ items: z.array(z.object({ slot: id, angle: z.string(), device: z.string() })) });
export const writeSchema = z.object({ items: z.array(z.object({ slot: id, text: z.string() })) });
export const gradeSchema = z.object({ items: z.array(z.object({
  slot: id, fits: z.boolean(), reason: z.string(), evidence: z.string(),
})) });
export const noveltySchema = z.object({ items: z.array(z.object({
  slot: id, repeats: z.boolean(), reason: z.string(),
})) });
