export async function api<T>(path: string, method = 'GET', input?: object): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method, body: input ? JSON.stringify(input) : undefined,
    headers: input ? { 'Content-Type': 'application/json' } : {},
    signal: AbortSignal.timeout(15_000),
  }).catch(() => { throw new Error('Koneksi terputus. Coba lagi.'); });
  const value = await response.json().catch(() => null);
  if (!response.ok || !value) throw new Error(value?.error || 'Utas Studio belum merespons.');
  return value as T;
}
