'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStudio } from './provider';
import styles from './header.module.css';

export function Header() {
  const path = usePathname();
  const { studio } = useStudio();
  return <header className={styles.header}><div className={styles.inner}>
    <Link href="/" className={styles.brand}><img src="/assets/logo.svg" alt="" width={42} height={42} />Utas Studio</Link>
    <nav aria-label="Navigasi utama">
      <Link href="/" aria-current={path === '/' ? 'page' : undefined}>Buat Postingan</Link>
      <Link href="/gaya" aria-current={path === '/gaya' ? 'page' : undefined}>Gaya Penulisan</Link>
    </nav>
    {studio?.mode === 'demo' && <span className={styles.mode}>Mode demo</span>}
  </div></header>;
}
