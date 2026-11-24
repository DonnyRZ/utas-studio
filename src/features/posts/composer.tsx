'use client';

import { useState } from 'react';
import { Button, Headline, Notice } from '../../components/ui';
import { Spark } from '../../components/icons';
import { length } from '../../domain/text';
import type { Batch, Job, Version } from '../../domain/types';
import { api } from '../studio/api';
import { useStudio } from '../studio/provider';
import { StylePicker } from './style-picker';
import styles from './posts.module.css';

export function Composer({ version, initial, openHistory }: { version: Version; initial: string; openHistory: () => void }) {
  const { job, start, setBatch } = useStudio();
  const [topic, setTopic] = useState(initial);
  const [chosen, setChosen] = useState([version.blueprint.profiles[0].name]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <section aria-labelledby="post-heading">
    <div className={`row between ${styles.heading}`}>
      <div className="row"><Headline id="post-heading">Mau bahas apa hari ini?</Headline><Spark className={styles.spark} /></div>
      <Button tone="ghost" icon="history" onClick={openHistory}>Riwayat</Button>
    </div>
    <form className={styles.composer} onSubmit={async (event) => {
      event.preventDefault();
      if (busy || job) return;
      setBusy(true);
      setError('');
      try {
        const queued = await api<Job>('batches', 'POST', { topic, profiles: chosen, versionId: version.id });
        const next: Batch = { id: queued.batchId!, topic: topic.trim(), versionId: version.id,
          profiles: chosen, drafts: [], createdAt: new Date().toISOString() };
        setBatch(next);
        start(queued);
      } catch (err) { setError((err as Error).message); }
      finally { setBusy(false); }
    }}>
      <div className={styles.fields}>
        <label htmlFor="topic" className="sr">Topik postingan</label>
        <textarea id="topic" placeholder="Misalnya, suka dukanya jualan online…" value={topic}
          onChange={(event) => setTopic(event.target.value)} />
        <div className="row between">
          <StylePicker profiles={version.blueprint.profiles} chosen={chosen} change={setChosen} />
          <Button tone="primary" icon="arrow" type="submit" busy={busy}
            disabled={!topic.trim() || !chosen.length || !!job || length(topic.trim()) > 1000}>Buat 25 postingan</Button>
        </div>
        <Notice>{length(topic.trim()) > 1000 ? 'Topik maksimal 1.000 karakter.' : error}</Notice>
      </div>
      <img src="/assets/pencil.webp" className={styles.pencil} alt="" />
    </form>
  </section>;
}
