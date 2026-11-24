import type { Profile } from '../../domain/types';
import styles from './styles.module.css';

export function Profiles({ profiles }: { profiles: Profile[] }) {
  return <div className="stack">
    {profiles.map((profile, index) => <details className={styles.profile} key={profile.name} open={index === 0 || undefined}>
      <summary>{profile.name}{profile.provisional && <span className="chip">Bukti terbatas</span>}</summary>
      <p className="muted">{profile.summary}</p>
      <dl>{profile.rules.map((rule, ruleIndex) => <div key={ruleIndex}>
        <dt>{rule.dimension} · {rule.core ? 'Inti' : 'Fleksibel'}</dt>
        <dd>{rule.instruction}
          {rule.userEdited && <small>Diubah oleh pengguna</small>}
          {rule.evidence.map(({ id, revision, quote }, evIndex) =>
            <small key={evIndex} className="muted">Contoh #{id}, revisi {revision} · “{quote}”</small>)}
        </dd>
      </div>)}</dl>
      <p className="muted">{profile.minEmoji}–{profile.maxEmoji} emoji · maksimum {profile.maxCharacters} karakter</p>
      <p>“{profile.miniExample}”</p>
    </details>)}
  </div>;
}
