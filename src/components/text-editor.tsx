'use client';

import { useState } from 'react';
import { length } from '../domain/text';
import { Dialog } from './dialog';
import { Button, Notice } from './ui';

export function TextEditor({ title, label, initial, max, save, close }: {
  title: string; label: string; initial: string; max: number; save: (text: string) => Promise<void>; close: () => void;
}) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const cancel = () => { if (!busy) text !== initial ? setConfirm(true) : close(); };
  if (confirm) return <Dialog title="Buang perubahan?" drawer={false} close={() => setConfirm(false)}>
    <p>Perubahan yang belum disimpan akan hilang.</p>
    <div className="row"><Button onClick={() => setConfirm(false)}>Lanjut edit</Button>
      <Button tone="primary" onClick={close}>Buang</Button></div>
  </Dialog>;
  return <Dialog title={title} close={cancel}>
    <form className="stack" onSubmit={async (event) => {
      event.preventDefault();
      if (busy) return;
      setBusy(true);
      setError('');
      try { await save(text.trim()); close(); }
      catch (err) { setError((err as Error).message); }
      finally { setBusy(false); }
    }}>
      <label className="label">{label}<textarea autoFocus rows={6} value={text} onChange={(event) => setText(event.target.value)} /></label>
      <span className="muted">{length(text)}/{max} karakter</span>
      <Notice>{error}</Notice>
      <div className="row"><Button tone="ghost" disabled={busy} onClick={cancel}>Batal</Button>
        <Button tone="primary" type="submit" busy={busy} disabled={!text.trim() || length(text.trim()) > max}>Simpan</Button></div>
    </form>
  </Dialog>;
}
