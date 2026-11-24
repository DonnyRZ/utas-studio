'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Batch, Job, Studio } from '../../domain/types';
import { api } from './api';
import styles from './header.module.css';

type StudioState = {
  studio: Studio | null; job: Job | null; batch: Batch | null; setBatch: (batch: Batch | null) => void;
  error: string; refresh: () => Promise<Studio>; start: (job: Job) => void; notify: (message: string) => void;
};
const Context = createContext<StudioState | null>(null);
const active = (job: Job) => job.status === 'queued' || job.status === 'working';

export function StudioProvider({ children }: { children: ReactNode }) {
  const [studio, setStudio] = useState<Studio | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = useCallback(async () => {
    const data = await api<Studio>('state');
    setStudio(data);
    setError('');
    return data;
  }, []);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 3500);
  }, []);
  const start = useCallback((queued: Job) => setJob(queued), []);

  useEffect(() => {
    let alive = true;
    refresh().then(async (data) => {
      if (!alive || !data.running) return;
      setJob(data.running);
      if (data.running.batchId) {
        const current = await api<Batch>(`batches/${data.running.batchId}`);
        if (alive) setBatch((shown) => shown ?? current);
      }
    }).catch((err) => { if (alive) setError(err.message); });
    return () => { alive = false; if (timer.current) clearTimeout(timer.current); };
  }, [refresh]);

  const jobId = job?.id;
  useEffect(() => {
    if (!jobId) return;
    let alive = true;
    let handle: ReturnType<typeof setTimeout>;
    let disconnected = false;
    const poll = async () => {
      try {
        const result = await api<Job>(`jobs/${jobId}`);
        if (!alive) return;
        if (active(result)) {
          setJob(result);
          disconnected = false;
          handle = setTimeout(poll, 700);
          return;
        }
        const updated = result.batchId ? await api<Batch>(`batches/${result.batchId}`) : null;
        const state = await refresh();
        if (!alive) return;
        if (updated) setBatch((shown) => !shown || shown.id === updated.id ? updated : shown);
        setJob(state.running?.id !== jobId ? state.running : null);
        if (result.kind === 'replace') notify(result.error ?? 'Draf diganti.');
        if (result.kind === 'analyze' && result.status === 'done') notify('Pratinjau blueprint siap.');
      } catch {
        if (!alive) return;
        if (!disconnected) notify('Koneksi terputus. Menyambung kembali…');
        disconnected = true;
        handle = setTimeout(poll, 1800);
      }
    };
    handle = setTimeout(poll, 500);
    return () => { alive = false; clearTimeout(handle); };
  }, [jobId, notify, refresh]);

  return <Context.Provider value={{ studio, job, batch, setBatch, error, refresh, start, notify }}>
    {children}<div className={styles.toast} role="status" hidden={!toast}>{toast}</div>
  </Context.Provider>;
}

export function useStudio() {
  const state = useContext(Context);
  if (!state) throw new Error('StudioProvider belum tersedia.');
  return state;
}
