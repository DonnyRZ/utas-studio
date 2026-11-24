export const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://utas:utas-local@127.0.0.1:54326/utas';
export const apiKey = process.env.OPENAI_API_KEY?.trim();
export const mode = process.env.UTAS_MODE === 'demo' || !apiKey && process.env.UTAS_MODE !== 'live' ? 'demo' : 'live';
export const model = 'gpt-6-luna';
export const embeddingModel = 'text-embedding-3-large';
export const embeddingDimensions = 3072;
