'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './ui';
import styles from './dialog.module.css';

export function Dialog({ title, close, drawer = true, children }: {
  title: string; close: () => void; drawer?: boolean; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('textarea, input[type="text"]')?.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      before?.focus({ preventScroll: true });
    };
  }, []);

  return <dialog ref={ref} className={`${styles.dialog} ${drawer ? styles.drawer : ''}`} aria-labelledby={id}
    onCancel={(event) => { event.preventDefault(); close(); }}
    onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className={`stack ${styles.inner}`}>
      <div className="row between"><h2 id={id}>{title}</h2>
        <Button tone="ghost" icon="close" aria-label="Tutup" onClick={close} />
      </div>
      {children}
    </div>
  </dialog>;
}
