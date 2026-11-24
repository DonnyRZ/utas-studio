import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { StudioProvider } from '../features/studio/provider';
import { Header } from '../features/studio/header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Utas Studio',
  description: 'Susun gaya penulisan dan buat draf Threads.',
  icons: { icon: '/assets/logo.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="id"><body><StudioProvider>
    <Header />
    <main className="workspace">{children}</main>
  </StudioProvider></body></html>;
}
