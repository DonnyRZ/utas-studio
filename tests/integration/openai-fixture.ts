import { expect } from 'vitest';
import type { Example } from '../../src/domain/types';
import { posts } from './drafts-fixture';

type Slot = { slot: number; text: string };
const result = (value: object) => Response.json({ status: 'completed',
  output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] });

export function openaiFixture() {
  const control = { failSecondGroup: true, replace: false, requests: 0, embedded: [] as string[] };
  const fetch = async (url: string, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    if (url.endsWith('/embeddings')) {
      expect(body.model).toBe(process.env.OPENAI_EMBEDDING_MODEL);
      expect(body.dimensions).toBeUndefined();
      control.embedded.push(...body.input);
      return Response.json({ data: (body.input as string[]).map((text, index) => ({
        index, embedding: Array.from({ length: 8 }, (_, i) => i === 0 ? 1 : i === 1 ? text.length / 100 : 0),
      })) });
    }
    expect(body.model).toBe(process.env.OPENAI_MODEL);
    expect(body.store).toBe(false);
    expect(body.text.format.strict).toBe(true);
    const input = JSON.parse(body.input);
    switch (body.text.format.name) {
      case 'observe_examples': return result({ items: (input as Example[]).map(({ id, text }) =>
        ({ id, quote: text, register: 'santai', opening: 'kegiatan', humor: 'belokan', ending: 'punchline' })) });
      case 'synthesize_blueprint': return result({ profiles: [{
        name: 'Observasi', summary: 'Pola belokan singkat.', minEmoji: 0, maxEmoji: 2, maxCharacters: 500,
        miniExample: 'Niat cari hobi. Sekarang hobiku beli alat buat hobi.',
        rules: [{ dimension: 'Humor', core: true, instruction: 'Akhiri dengan belokan.',
          evidence: (input.sources as Example[]).slice(0, 3).map(({ id, revision, text }) => ({ id, revision, quote: text })) }],
      }] });
      case 'validate_blueprint': return result({ items: (input.examples as Example[]).map(({ id }) =>
        ({ id, profile: 'Observasi', fits: true, rationale: 'Ada belokan di akhir.' })) });
      case 'plan_drafts': return result({ items: (input.slots as Slot[]).map(({ slot }) =>
        ({ slot, angle: `Sudut ${slot}`, device: 'Kontras' })) });
      case 'revise_ideas': return result({ items: (input.slots as Slot[]).map(({ slot }) =>
        ({ slot, angle: 'Timbangan rusak', device: 'Bertukar peran' })) });
      case 'write_drafts':
        control.requests++;
        if (control.failSecondGroup && control.requests === 2) return Response.json({}, { status: 400 });
        return result({ items: (input.slots as Slot[]).map(({ slot }) => ({ slot,
          text: control.replace ? 'Timbangan rusak. Akhirnya kardus yang menimbang aku.' : posts[slot - 1] })) });
      case 'grade_drafts': return result({ items: (input.drafts as Slot[]).map(({ slot, text }) =>
        ({ slot, fits: true, reason: 'Kontras di akhir.', evidence: text })) });
      case 'check_novelty': return result({ items: (input as Slot[]).map(({ slot }) =>
        ({ slot, repeats: false, reason: 'Punchline berbeda.' })) });
      default: throw new Error(`Permintaan tidak dikenal ${body.text.format.name}`);
    }
  };
  return { control, fetch };
}
