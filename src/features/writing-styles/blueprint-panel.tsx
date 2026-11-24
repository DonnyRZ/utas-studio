'use client';

import { useState } from 'react';
import { Button, JobStatus, Notice } from '../../components/ui';
import type { Job, Studio } from '../../domain/types';
import { api } from '../studio/api';
import { useStudio } from '../studio/provider';
import { Profiles } from './profiles';
import { Preview } from './preview';
import styles from './styles.module.css';

export function BlueprintPanel({ data }: { data: Studio }) {
  const { start, job } = useStudio();
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { examples, active, analysis } = data;
  const ready = !job && analysis?.status === 'done' && analysis.result ? analysis : null;
  const failure = !job && analysis?.status === 'failed' ? analysis.error : null;
  return <section className={`panel stack ${active ? '' : styles.empty}`} aria-label="Blueprint">
    {active ? <div className="row between"><h2>Blueprint</h2><span className="chip">Versi {active.id} · Aktif</span></div>
      : <><img src="/assets/notebook.webp" className={styles.art} alt="" /><h2>Blueprint belum dibuat</h2></>}
    {active && <img src="/assets/style-girl.webp" className={styles.styleArt} alt="" />}
    {examples.length === 1 && <p className="muted">Tambahkan satu contoh lagi untuk mulai.</p>}
    <Notice>{error || failure}</Notice>
    {job?.kind === 'analyze' && <JobStatus job={job} />}
    <div className="row">
      {ready && <Button tone="blue" icon="arrow" onClick={() => setPreview(true)}>Buka pratinjau</Button>}
      {!!examples.length && <Button icon="refresh" tone={active || ready ? 'secondary' : 'primary'}
        disabled={examples.length < 2 || !!job} busy={busy} onClick={async () => {
          setBusy(true);
          setError('');
          try { start(await api<Job>('analyze', 'POST', {})); }
          catch (err) { setError((err as Error).message); }
          finally { setBusy(false); }
        }}>{failure ? 'Coba lagi' : active ? 'Perbarui Blueprint' : 'Buat Blueprint'}</Button>}
    </div>
    {active && <Profiles profiles={active.blueprint.profiles} />}
    {preview && ready?.result && <Preview id={ready.id} blueprint={ready.result} active={active} close={() => setPreview(false)} />}
  </section>;
}
