import { z } from 'zod';
import { POST_LIMIT } from '../../domain/types';
import { getBatch, readBatch, saveDraft } from '../db/batches';
import { enqueue } from '../db/jobs';
import { selectedVersion } from '../db/versions';
import { Problem } from '../errors';
import { body, id, text } from './validation';

export async function batchesRoute(request: Request, parts: string[]) {
  const [rawId, action, rawSlot, replace] = parts;
  if (!rawId && request.method === 'POST') {
    const input = await body(request, z.object({ topic: text(1000), versionId: z.number().int().min(0),
      profiles: z.array(text(80)).min(1).max(5) }));
    const version = await selectedVersion();
    if (version.id !== input.versionId || input.profiles.some((name) =>
      !version.blueprint.profiles.some((profile) => profile.name === name))) {
      throw new Problem(409, 'Pilihan gaya sudah berubah. Pilih lagi dari versi aktif.');
    }
    return enqueue({ kind: 'generate', create: { topic: input.topic, version, profiles: [...new Set(input.profiles)] } });
  }
  const parsed = id.safeParse(rawId);
  if (!parsed.success) throw new Problem(404, 'Batch tidak ditemukan.');
  const batchId = parsed.data;
  if (!action && request.method === 'GET') return readBatch(batchId);
  const batch = await getBatch(batchId);
  if (action === 'complete' && request.method === 'POST' && parts.length === 2) {
    return enqueue({ kind: 'generate', batchId });
  }
  const slot = id.safeParse(rawSlot);
  if (action === 'drafts' && slot.success) {
    const draft = batch.drafts.find((item) => item.slot === slot.data);
    if (!draft) throw new Problem(404, 'Draf tidak ditemukan.');
    if (replace === 'replace' && request.method === 'POST' && parts.length === 4) {
      return enqueue({ kind: 'replace', batchId, slot: slot.data, input: { previousText: draft.text } });
    }
    if (parts.length === 3 && request.method === 'PATCH') {
      const input = await body(request, z.object({ text: text(POST_LIMIT), previous: text(POST_LIMIT) }));
      if (input.text !== draft.text || input.previous !== draft.text) {
        await saveDraft(batchId, { ...draft, text: input.text }, { edited: true }, true, input.previous);
      }
      return readBatch(batchId);
    }
  }
  throw new Problem(404, 'Aksi draf tidak ditemukan.');
}
