'use client';

import type { ReactNode } from 'react';
import { Button, Notice, Spinner } from '../../components/ui';
import { useStudio } from './provider';

export function Gate({ children }: { children: ReactNode }) {
  const { studio, error, refresh, start, notify } = useStudio();
  if (studio) return children;
  if (error) return <div className="stack"><Notice>{error}</Notice>
    <div><Button onClick={() => void refresh().then((state) => {
      if (state.running) start(state.running);
    }).catch((err) => notify(err.message))}>Coba lagi</Button></div></div>;
  return <div className="row" role="status"><Spinner /> Memuat Utas Studio…</div>;
}
