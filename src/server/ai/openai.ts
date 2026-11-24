import { setTimeout as sleep } from 'node:timers/promises';
import { z } from 'zod';
import { apiKey, model } from '../config';
import { Problem } from '../errors';

export async function openai(path: 'responses' | 'embeddings', body: object): Promise<unknown> {
  if (!apiKey) throw new Problem(503, 'Isi OPENAI_API_KEY di .env.local, lalu mulai ulang web dan worker.');
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response | undefined;
    try {
      response = await fetch(`https://api.openai.com/v1/${path}`, {
        method: 'POST', signal: AbortSignal.timeout(75_000),
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) return await response.json();
    } catch {
      response = undefined;
    }
    const code = response?.status;
    if (code === 401 || code === 403 || code === 404) {
      throw new Problem(502, 'Periksa API key dan izin proyek untuk model OpenAI.');
    }
    const failure = await response?.json().catch(() => null);
    if (failure?.error?.code === 'insufficient_quota') throw new Problem(502, 'Kuota OpenAI habis.');
    if (code && code < 500 && code !== 408 && code !== 429) {
      throw new Problem(502, `OpenAI menolak permintaan (${code}). Periksa konfigurasi model.`);
    }
    if (attempt < 2) {
      const header = response?.headers.get('retry-after');
      const seconds = header ? Number(header) : 0;
      if (Number.isFinite(seconds) && seconds > 15) {
        throw new Problem(429, 'Batas laju OpenAI tercapai. Coba lagi nanti.');
      }
      await sleep(Math.max(Number.isFinite(seconds) ? seconds * 1000 : 0, 700 * 2 ** attempt) + Math.random() * 250);
    }
  }
  throw new Problem(502, 'OpenAI belum merespons. Hasil yang sudah diterima tetap tersimpan.');
}

const responseSchema = z.object({
  status: z.string(),
  output: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
  })),
});
export async function ask<T>(
  name: string, instructions: string, payload: unknown, schema: z.ZodType<T>, effort: 'low' | 'medium' = 'low',
) {
  const { $schema: _meta, ...format } = z.toJSONSchema(schema, { target: 'draft-7' });
  const response = responseSchema.safeParse(await openai('responses', {
    model, instructions, input: JSON.stringify(payload), reasoning: { effort }, store: false,
    max_output_tokens: 8192, text: { format: { name, type: 'json_schema', strict: true, schema: format } },
  }));
  if (!response.success) throw new Problem(502, 'Respons OpenAI belum dapat dibaca.');
  const parts = response.data.output.filter((item) => item.type === 'message').flatMap((item) => item.content ?? []);
  if (parts.some((part) => part.type === 'refusal')) throw new Problem(422, 'Model menolak isi ini. Ubah input dan coba lagi.');
  const text = parts.filter((part) => part.type === 'output_text').map((part) => part.text ?? '').join('');
  if (response.data.status !== 'completed' || !text) throw new Problem(502, 'Respons model belum lengkap.');
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Problem(502, 'Keluaran model bukan JSON yang valid.'); }
  const checked = schema.safeParse(data);
  if (!checked.success) throw new Problem(502, 'Keluaran model tidak sesuai skema.');
  return checked.data;
}
