import { z } from 'zod';
import { length } from '../../domain/text';
import { Problem } from '../errors';

export const text = (limit: number) => z.string().trim().min(1).refine((value) => length(value) <= limit);
export const id = z.coerce.number().int().positive();
export const revision = z.number().int().positive();

export async function body<T>(request: Request, schema: z.ZodType<T>) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    throw new Problem(415, 'Permintaan harus memakai JSON.');
  }
  const raw = await request.text();
  if (raw.length > 1_000_000) throw new Problem(413, 'Ukuran permintaan terlalu besar.');
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new Problem(400, 'Format permintaan tidak valid.'); }
  const result = schema.safeParse(data);
  if (!result.success) throw new Problem(400, 'Periksa isi dan panjang isian, lalu coba lagi.');
  return result.data;
}

export function sameOrigin(request: Request) {
  if (request.method === 'GET') return;
  const site = request.headers.get('sec-fetch-site');
  const origin = request.headers.get('origin');
  if (site && site !== 'same-origin' ||
      origin && !site && new URL(origin).host !== new URL(request.url).host) {
    throw new Problem(403, 'Permintaan lintas situs ditolak.');
  }
}
