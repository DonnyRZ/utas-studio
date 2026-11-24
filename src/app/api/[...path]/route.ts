import { z } from 'zod';
import { readJob } from '../../../server/db/jobs';
import { Problem } from '../../../server/errors';
import { batchesRoute } from '../../../server/http/batches';
import { analyze, examplesRoute, readStudio, saveBlueprint } from '../../../server/http/studio';
import { sameOrigin } from '../../../server/http/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

async function api(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    sameOrigin(request);
    const { path } = await context.params;
    const [resource, ...parts] = path;
    let result;
    if (resource === 'state' && request.method === 'GET' && !parts.length) result = await readStudio();
    else if (resource === 'examples' && parts.length < 2) result = await examplesRoute(request, parts[0]);
    else if (resource === 'analyze' && request.method === 'POST' && !parts.length) result = await analyze();
    else if (resource === 'blueprint' && request.method === 'POST' && !parts.length) result = await saveBlueprint(request);
    else if (resource === 'batches') result = await batchesRoute(request, parts);
    else if (resource === 'jobs' && request.method === 'GET' && parts.length === 1 && z.uuid().safeParse(parts[0]).success) {
      result = await readJob(parts[0]);
    } else throw new Problem(404, 'Halaman tidak ditemukan.');
    return Response.json(result, { headers });
  } catch (error) {
    if (error instanceof Problem) return Response.json({ error: error.message }, { status: error.status, headers });
    const code = (error as { code?: string }).code;
    console.error('Utas Studio', code ?? (error instanceof Error ? error.message : error));
    return Response.json({ error: code === 'ECONNREFUSED' || code === '42P01'
      ? 'Database belum siap. Jalankan PostgreSQL dan migrasi.' : 'Ada gangguan. Coba lagi.' }, { status: 500, headers });
  }
}
export { api as GET, api as POST, api as PATCH, api as DELETE };
