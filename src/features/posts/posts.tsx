'use client';

import { useState } from 'react';
import { Gate } from '../studio/gate';
import { useStudio } from '../studio/provider';
import { Composer } from './composer';
import { History } from './history';
import { Results } from './results';

export function Posts() {
  const { studio, batch, setBatch } = useStudio();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [priorTopic, setPriorTopic] = useState('');
  const openHistory = () => setHistoryOpen(true);
  return <Gate>{studio && <>
    {batch ? <Results key={batch.id} batch={batch} openHistory={openHistory} compose={() => {
      setPriorTopic(batch.topic);
      setBatch(null);
      window.scrollTo(0, 0);
    }} /> : <Composer key={studio.styles.id} version={studio.styles} initial={priorTopic} openHistory={openHistory} />}
    {historyOpen && <History entries={studio.history} close={() => setHistoryOpen(false)} select={(selected) => {
      setBatch(selected);
      setHistoryOpen(false);
      window.scrollTo(0, 0);
    }} />}
  </>}</Gate>;
}
