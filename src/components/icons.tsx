const paths = {
  plus: 'M12 5v14M5 12h14',
  edit: 'm14 6 4 4M4 20l4.5-1 11-11a2.8 2.8 0 0 0-4-4l-11 11L4 20Z',
  chevron: 'm6 9 6 6 6-6',
  close: 'm6 6 12 12M18 6 6 18',
  history: 'M3 12a9 9 0 1 1 2.6 6.4M3 4v8h8M12 7v5l3 2',
  check: 'm5 12 4 4L19 6',
  delete: 'M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5',
};
export type Glyph = keyof typeof paths | 'arrow' | 'copy' | 'refresh';

export function Icon({ name }: { name: Glyph }) {
  if (name === 'arrow' || name === 'copy' || name === 'refresh') {
    return <img src={`/assets/${name}.webp`} alt="" aria-hidden="true" width={18} height={18} />;
  }
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[name]} />
  </svg>;
}

export function Spark({ className }: { className?: string }) {
  return <svg className={className} aria-hidden width="50" height="55" viewBox="0 0 50 55" fill="none"
    stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m13 38 4-8 5 8 9 2-7 5 1 8-8-5-7 4 1-8-7-5 9-1ZM32 25l8-8M29 16l3-10m9 25 8-2"/>
  </svg>;
}
