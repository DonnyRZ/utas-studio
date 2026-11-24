'use client';

import { useState } from 'react';
import { Dialog } from '../../components/dialog';
import { Notice, Spinner } from '../../components/ui';
import type { Batch, HistoryEntry } from '../../domain/types';
import { api } from '../studio/api';
import styles from './posts.module.css';

const dates = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' });
export function History({ entries, close, select }: {
  entries: HistoryEntry[]; close: () => void; select: (batch: Batch) => void;
}) {
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  return <Dialog title="Riwayat" close={() => { if (!loading) close(); }}>
    <Notice>{error}</Notice>
    {!entries.length && <p className="muted">Belum ada riwayat draf.</p>}
    {entries.map(({ id, topic, count, createdAt }) => <button type="button" key={id}
      className={styles.historyItem} disabled={loading !== null}
      onClick={async () => {
        setLoading(id);
        setError('');
        try { select(await api<Batch>(`batches/${id}`)); }
        catch (err) { setError((err as Error).message); }
        finally { setLoading(null); }
      }}>
      <span className="row">{loading === id && <Spinner />}<strong>{topic}</strong></span>
      <small className="muted">{dates.format(new Date(createdAt))} · {count} draf</small>
    </button>)}
  </Dialog>;
}
