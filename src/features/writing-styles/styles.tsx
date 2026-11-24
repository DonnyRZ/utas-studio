'use client';

import { Spark } from '../../components/icons';
import { Headline } from '../../components/ui';
import { Gate } from '../studio/gate';
import { useStudio } from '../studio/provider';
import { BlueprintPanel } from './blueprint-panel';
import { Examples } from './examples';
import styles from './styles.module.css';

export function WritingStyles() {
  const { studio } = useStudio();
  return <Gate>{studio && <section className="stack" aria-labelledby="style-heading">
    <div className="row"><Headline blue id="style-heading">Gaya Penulisan</Headline><Spark className={styles.spark} /></div>
    <div className={styles.columns}><Examples examples={studio.examples} /><BlueprintPanel data={studio} /></div>
  </section>}</Gate>;
}
