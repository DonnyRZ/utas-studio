'use client';

import { useState } from 'react';
import { Dialog } from '../../components/dialog';
import { Icon, Spark } from '../../components/icons';
import { TextEditor } from '../../components/text-editor';
import { Button, Headline, JobStatus, Notice } from '../../components/ui';
import { POST_LIMIT, TARGET, type Batch, type Draft, type Job } from '../../domain/types';
import { api } from '../studio/api';
import { useStudio } from '../studio/provider';
import styles from './posts.module.css';

export function Results({ batch, compose, openHistory }: { batch: Batch; compose: () => void; openHistory: () => void }) {
  const { job, start, setBatch, notify, studio } = useStudio();
  const [error, setError] = useState('');
  const [sending, setSending] = useState<number | null>(null);
  const [edit, setEdit] = useState<Draft | null>(null);
  const [copy, setCopy] = useState<Draft | null>(null);
  const running = job?.batchId === batch.id ? job : null;
  const count = batch.drafts.length;
  const remaining = TARGET - count;
  const queue = async (slot: number) => {
    setSending(slot);
    setError('');
    try {
      start(await api<Job>(slot
        ? `batches/${batch.id}/drafts/${slot}/replace` : `batches/${batch.id}/complete`, 'POST', {}));
    } catch (err) { setError((err as Error).message); }
    finally { setSending(null); }
  };
  const copyDraft = async (draft: Draft) => {
    try { await navigator.clipboard.writeText(draft.text); notify('Draf disalin.'); }
    catch { setCopy(draft); }
  };

  return <section className="stack" aria-labelledby="results-heading">
    <div className={styles.resultHead}>
      <div className="stack">
        <div className="row">
          <span className="chip">Hasil</span>
          <Button tone="ghost" onClick={compose}>Topik baru</Button>
          <Button tone="ghost" icon="history" onClick={openHistory}>Riwayat</Button>
        </div>
        <div className="row"><Headline id="results-heading">{count === TARGET ? '25 draf siap'
          : count ? `${count} dari 25 draf siap` : running ? 'Menyiapkan draf' : 'Draf belum siap'}</Headline>
          <Spark className={styles.spark} /></div>
        {!!count && studio?.mode === 'live' && <div><span className="chip"><Icon name="check" /> Diperiksa saat dibuat</span></div>}
        <div className="row"><span className="chip">Topik · {batch.topic}</span>
          <span className="chip">Gaya · {batch.profiles.join(', ')}</span></div>
      </div>
      <img src="/assets/results-girl.webp" className={styles.resultArt} alt="" />
    </div>
    <Notice>{error || (!running && batch.lastError)}</Notice>
    {running && running.kind !== 'replace' && <JobStatus job={running} />}
    {!running && remaining > 0 && <div>
      <Button tone="primary" icon="refresh" disabled={!!job || sending !== null && sending !== 0}
        busy={sending === 0} onClick={() => void queue(0)}>{count ? `Lengkapi ${remaining} draf` : 'Coba lagi'}</Button>
    </div>}
    {!!count && <div className={styles.resultList}>
      {batch.drafts.map((draft) => <article key={draft.slot} className={styles.draft}>
        <span className={`chip ${styles.number}`}>{draft.slot}</span>
        <div><p>{draft.text}</p>{batch.profiles.length > 1 && <small className="muted">{draft.profile}</small>}</div>
        <div className="row">
          <Button tone="primary" icon="edit" disabled={!!job || sending !== null} onClick={() => setEdit(draft)}>Edit</Button>
          <Button icon="copy" onClick={() => void copyDraft(draft)}>Salin</Button>
          <Button icon="refresh" busy={sending === draft.slot || running?.kind === 'replace' && running.slot === draft.slot}
            disabled={!!job || sending !== null} onClick={() => void queue(draft.slot)}>
            {running?.kind === 'replace' && running.slot === draft.slot ? 'Mencari alternatif…' : 'Ganti'}
          </Button>
        </div>
      </article>)}
    </div>}
    {!count && running && <div className="panel stack" aria-hidden>
      <div className={styles.skeleton} /><div className={styles.skeleton} />
    </div>}
    {edit && <TextEditor title="Edit draf" label="Isi postingan" initial={edit.text} max={POST_LIMIT}
      close={() => setEdit(null)} save={async (text) => {
        setBatch(await api<Batch>(`batches/${batch.id}/drafts/${edit.slot}`, 'PATCH', { text, previous: edit.text }));
        notify('Perubahan tersimpan.');
      }} />}
    {copy && <Dialog title="Salin draf" drawer={false} close={() => setCopy(null)}>
      <label className="label">Teks draf
        <textarea readOnly rows={6} value={copy.text} autoFocus onFocus={(event) => event.target.select()} />
      </label>
      <p className="muted">Gunakan menu salin pada perangkatmu untuk menyalin teks yang dipilih.</p>
    </Dialog>}
  </section>;
}
