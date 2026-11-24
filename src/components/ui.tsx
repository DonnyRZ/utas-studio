import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Job } from '../domain/types';
import { Icon, type Glyph } from './icons';
import styles from './ui.module.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'secondary' | 'primary' | 'blue' | 'ghost'; icon?: Glyph; busy?: boolean;
};
export function Button({ children, tone = 'secondary', icon, busy, className, type = 'button',
  disabled, ...props }: ButtonProps) {
  return <button {...props} type={type} className={`${styles.button} ${styles[tone]} ${className ?? ''}`}
    disabled={disabled || busy} aria-busy={busy || undefined}>
    {busy ? <Spinner /> : icon && <Icon name={icon} />}{children}
  </button>;
}
export function Spinner() { return <span className={styles.spinner} aria-hidden="true" />; }
export function Notice({ children, info }: { children?: ReactNode; info?: boolean }) {
  return children ? <p className={`notice${info ? ' info' : ''}`} role={info ? 'status' : 'alert'}>{children}</p> : null;
}
export function JobStatus({ job }: { job: Job }) {
  return <section className={`panel stack ${styles.job}`} aria-label="Progres" role="status">
    <div className="row"><Spinner /><strong>{job.phase}…</strong></div>
    {!!job.total && <><progress aria-label={job.phase} value={job.completed} max={job.total} />
      <span className="muted">{job.completed} / {job.total}</span></>}
  </section>;
}
export function Headline({ children, blue = false, id }: { children: ReactNode; blue?: boolean; id?: string }) {
  return <h1 id={id} className={`${styles.title} ${blue ? styles.titleBlue : ''}`}>{children}</h1>;
}
