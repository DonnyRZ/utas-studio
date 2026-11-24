import { createHash } from 'node:crypto';
import { z } from 'zod';
import { requiredModel } from '../config';
import { pool } from '../db/client';
import { Problem } from '../errors';
import { openai } from './openai';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const vectors = z.object({ data: z.array(z.object({
  index: z.number().int(), embedding: z.array(z.number()).min(1).max(16000),
})) });

export async function cacheEmbeddings(texts: string[]) {
  const embeddingModel = requiredModel('OPENAI_EMBEDDING_MODEL');
  const values = new Map(texts.map((text) => [hash(text), text]));
  const { rows } = await pool.query<{ hash: string }>(
    'SELECT hash FROM embeddings WHERE model=$1 AND hash=ANY($2::text[])', [embeddingModel, [...values.keys()]]);
  const cached = new Set(rows.map((value) => value.hash));
  const missing = [...values].filter(([key]) => !cached.has(key));
  for (let offset = 0; offset < missing.length; offset += 48) {
    const group = missing.slice(offset, offset + 48);
    const result = vectors.safeParse(await openai('embeddings', {
      model: embeddingModel, input: group.map(([, text]) => text),
    }));
    if (!result.success) throw new Problem(502, 'Vektor OpenAI tidak lengkap.');
    const mapped = new Map(result.data.data.map(({ index, embedding }) => [index, embedding]));
    if (mapped.size !== group.length || group.some((_, index) => !mapped.has(index))) {
      throw new Problem(502, 'Jumlah vektor tidak sesuai.');
    }
    await pool.query(`INSERT INTO embeddings(model,hash,value)
      SELECT $1, item.key, item.vector::vector FROM unnest($2::text[], $3::text[]) AS item(key,vector)
      ON CONFLICT DO NOTHING`,
    [embeddingModel, group.map(([key]) => key), group.map((_, i) => JSON.stringify(mapped.get(i)))]);
  }
}

export async function nearestMatches(text: string, references: string[]) {
  const embeddingModel = requiredModel('OPENAI_EMBEDDING_MODEL');
  const byKey = new Map(references.map((ref) => [hash(ref), ref]));
  const { rows } = await pool.query<{ hash: string }>(`SELECT candidate.hash FROM embeddings candidate
    JOIN embeddings query ON query.model=candidate.model AND query.hash=$2
    WHERE candidate.model=$1 AND candidate.hash=ANY($3::text[])
      AND vector_dims(candidate.value)=vector_dims(query.value)
    ORDER BY CASE WHEN vector_dims(candidate.value)=vector_dims(query.value)
      THEN candidate.value <=> query.value END NULLS LAST, candidate.hash LIMIT 5`,
  [embeddingModel, hash(text), [...byKey.keys()]]);
  return rows.map((row) => byKey.get(row.hash)!);
}
