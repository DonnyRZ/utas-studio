'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { Profile } from '../../domain/types';
import { Button } from '../../components/ui';
import { Icon } from '../../components/icons';
import styles from './posts.module.css';

export function StylePicker({ profiles, chosen, change }: {
  profiles: Profile[]; chosen: string[]; change: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const close = () => { setOpen(false); ref.current?.querySelector('button')?.focus(); };
  return <div className={styles.picker} ref={ref} onKeyDown={(event) => {
    if (open && event.key === 'Escape') { event.stopPropagation(); close(); }
  }}>
    <Button icon="edit" aria-label={`Pilih gaya: ${chosen.join(', ')}`} aria-expanded={open} aria-controls={id}
      onClick={() => open ? close() : setOpen(true)}>
      {chosen.length > 1 ? `${chosen.length} gaya dipilih` : chosen[0] || 'Pilih gaya'} <Icon name="chevron" />
    </Button>
    {open && <div className={styles.menu} id={id} role="group" aria-label="Pilihan gaya">
      <div className="row between"><strong>Pilih gaya</strong>
        <Button tone="ghost" icon="close" aria-label="Tutup pilihan gaya" onClick={close} />
      </div>
      {profiles.map((profile) => <label key={profile.name}>
        <input type="checkbox" checked={chosen.includes(profile.name)} onChange={(event) =>
          change(event.target.checked ? [...chosen, profile.name] : chosen.filter((item) => item !== profile.name))} />
        <span><strong>{profile.name}</strong><br /><small className="muted">{profile.summary}</small></span>
      </label>)}
    </div>}
  </div>;
}
