import { Problem } from './errors';

export const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://utas:utas-local@127.0.0.1:54326/utas';
export const apiKey = process.env.OPENAI_API_KEY?.trim();
export const mode = process.env.UTAS_MODE === 'demo' || !apiKey && process.env.UTAS_MODE !== 'live' ? 'demo' : 'live';
export function requiredModel(name: 'OPENAI_MODEL' | 'OPENAI_EMBEDDING_MODEL') {
  const value = process.env[name]?.trim();
  if (!value) throw new Problem(503, `Isi ${name} di .env.local, lalu mulai ulang web dan worker.`);
  return value;
}
