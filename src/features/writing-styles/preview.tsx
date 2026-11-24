'use client';

import { useState } from 'react';
import { Dialog } from '../../components/dialog';
import { Button, Notice } from '../../components/ui';
import { length } from '../../domain/text';
import type { Blueprint, Version } from '../../domain/types';
import { api } from '../studio/api';
import { useStudio } from '../studio/provider';
import { Profiles } from './profiles';
import styles from './styles.module.css';

export function Preview({ blueprint, id, active, close }: {
  blueprint: Blueprint; id: string; active: Version | null; close: () => void;
}) {
  const { refresh, notify } = useStudio();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [profiles, setProfiles] = useState(() => blueprint.profiles.map(({ name, rules }) => ({
    name, instructions: rules.map(({ instruction }) => instruction),
  })));
  const dismiss = () => { if (!busy) editing ? setEditing(false) : close(); };
  const match = blueprint.checks.filter(({ fits }) => fits).length;
  const versionNotice = active && <Notice info>Versi {active.id} tetap aktif sampai versi baru disimpan.</Notice>;
  return <Dialog title={editing ? 'Edit dan simpan gaya' : 'Pratinjau blueprint'} close={dismiss}>
    {versionNotice}
    {!editing ? <>
      <div className="row">
        {active && <span className="chip">Versi {active.id} · Aktif</span>}
        <span className="chip">Versi baru · Pratinjau</span>
      </div>
      <p className="muted">{blueprint.sourceCount} contoh · {blueprint.profiles.length} profil gaya</p>
      {blueprint.checks.length ? <details>
        <summary>{match}/{blueprint.checks.length} contoh validasi cocok</summary>
        <ul>{blueprint.checks.map((check) => <li key={check.id}>#{check.id} · {check.profile || 'Belum cocok'} · {check.rationale}</li>)}</ul>
      </details> : <p className="muted">Belum ada hasil validasi terpisah. Tinjau aturan sebelum menyimpan.</p>}
      <Profiles profiles={blueprint.profiles} />
      <div className="row"><Button tone="ghost" onClick={close}>Tutup pratinjau</Button>
        <Button tone="primary" icon="edit" onClick={() => setEditing(true)}>Edit dan simpan</Button></div>
    </> : <form className="stack" onSubmit={async (event) => {
      event.preventDefault();
      if (busy) return;
      setBusy(true);
      setError('');
      try {
        await api('blueprint', 'POST', { jobId: id, profiles });
        await refresh();
        notify('Gaya aktif tersimpan.');
        close();
      } catch (err) { setError((err as Error).message); }
      finally { setBusy(false); }
    }}>
      {profiles.map((profile, index) => <fieldset className={`stack ${styles.guide}`} key={index}>
        <legend className="muted">Profil {index + 1}</legend>
        <label className="label">Nama gaya<input type="text" required value={profile.name} onChange={(event) => {
          const name = event.target.value;
          setProfiles((current) => current.map((item, i) => i === index ? { ...item, name } : item));
        }} /></label>
        {profile.instructions.map((value, rule) => <label className="label" key={rule}>
          {blueprint.profiles[index].rules[rule].dimension}<textarea required rows={2} value={value}
            onChange={(event) => {
              const next = event.target.value;
              setProfiles((current) => current.map((item, i) => i === index
                ? { ...item, instructions: item.instructions.map((text, j) => j === rule ? next : text) } : item));
            }} /></label>)}
      </fieldset>)}
      <Notice>{error}</Notice>
      <div className="row"><Button tone="ghost" disabled={busy} onClick={dismiss}>Kembali ke pratinjau</Button>
        <Button tone="primary" type="submit" busy={busy} disabled={profiles.some(({ name, instructions }) =>
          !name.trim() || length(name.trim()) > 80 || instructions.some((value) => !value.trim() || length(value.trim()) > 600))}>
          {active ? 'Simpan versi baru' : 'Simpan Gaya'}</Button></div>
    </form>}
  </Dialog>;
}
