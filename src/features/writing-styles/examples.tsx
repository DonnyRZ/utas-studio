'use client';

import { useState } from 'react';
import { Dialog } from '../../components/dialog';
import { TextEditor } from '../../components/text-editor';
import { Button, Notice } from '../../components/ui';
import { length, splitExamples } from '../../domain/text';
import type { Example } from '../../domain/types';
import { api } from '../studio/api';
import { useStudio } from '../studio/provider';
import styles from './styles.module.css';

type Modal = { type: 'paste' } | { type: 'edit' | 'delete'; example: Example };
export function Examples({ examples }: { examples: Example[] }) {
  const { refresh, notify } = useStudio();
  const [modal, setModal] = useState<Modal | null>(null);
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const items = splitExamples(paste);
  const invalid = items.some((text) => length(text) > 2000) ? 'Maksimum 2.000 karakter per contoh.'
    : items.length > 100 ? 'Maksimum 100 contoh sekaligus.' : '';
  const open = (dialog: Modal) => { setError(''); setModal(dialog); };
  const close = () => { if (!busy) setModal(null); };

  return <>
    {!examples.length ? <section className={`panel stack ${styles.empty}`}>
      <img className={styles.art} src="/assets/paper.webp" alt="" />
      <h2>Belum ada contoh</h2>
      <Button tone="primary" icon="plus" onClick={() => open({ type: 'paste' })}>Tambah Contoh</Button>
    </section> : <section className="panel stack" aria-label="Pustaka contoh">
      <div className="row between"><h2>{examples.length} contoh</h2>
        <Button tone="primary" icon="plus" onClick={() => open({ type: 'paste' })}>Tambah Contoh</Button></div>
      {examples.map((example) => <article className={styles.reference} key={example.id}>
        <p>{example.text}</p>
        <div className="row">
          <Button icon="edit" onClick={() => open({ type: 'edit', example })}>Edit</Button>
          <Button icon="delete" tone="ghost" onClick={() => open({ type: 'delete', example })}>Hapus</Button>
        </div>
      </article>)}
    </section>}
    {modal?.type === 'paste' && <Dialog title="Tambah contoh" close={close}>
      <form className="stack" onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError('');
        try {
          const data = await api<{ added: number; skipped: number }>('examples', 'POST', { items });
          await refresh();
          setPaste('');
          setModal(null);
          notify(`${data.added} contoh disimpan${data.skipped ? `, ${data.skipped} dilewati` : ''}.`);
        } catch (err) { setError((err as Error).message); }
        finally { setBusy(false); }
      }}>
        <label className="label">Tempel beberapa utas
          <textarea autoFocus rows={6} value={paste} onChange={(event) => setPaste(event.target.value)}
            placeholder="Tempel teks utas di sini…" />
        </label>
        <p className="muted">Pisahkan utas dengan baris kosong atau baris berisi tiga tanda hubung.</p>
        {!!items.length && <><p><strong>{items.length} contoh terdeteksi</strong></p>
          <ol className={styles.pastePreview}>{items.slice(0, 4).map((text, index) =>
            <li key={index}>{text.length > 180 ? `${text.slice(0, 180)}…` : text}</li>)}</ol></>}
        <Notice>{invalid || error}</Notice>
        <div className="row"><Button tone="ghost" disabled={busy} onClick={close}>Tutup panel</Button>
          <Button type="submit" tone="primary" busy={busy} disabled={!items.length || !!invalid}>
            {items.length ? `Simpan ${items.length} contoh` : 'Simpan contoh'}</Button></div>
      </form>
    </Dialog>}
    {modal?.type === 'edit' && <TextEditor title="Edit contoh" label="Isi utas" initial={modal.example.text}
      max={2000} close={close} save={async (text) => {
        await api(`examples/${modal.example.id}`, 'PATCH', { text, revision: modal.example.revision });
        await refresh();
        notify('Contoh diperbarui.');
      }} />}
    {modal?.type === 'delete' && <Dialog title="Hapus contoh ini?" drawer={false} close={close}>
      <p>Contoh dikeluarkan dari pustaka untuk analisis berikutnya.</p>
      <Notice>{error}</Notice>
      <div className="row"><Button disabled={busy} onClick={close}>Batal</Button>
        <Button tone="primary" busy={busy} onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await api(`examples/${modal.example.id}`, 'DELETE', { revision: modal.example.revision });
            await refresh();
            setModal(null);
            notify('Contoh dihapus.');
          } catch (err) { setError((err as Error).message); }
          finally { setBusy(false); }
        }}>Hapus</Button>
      </div>
    </Dialog>}
  </>;
}
