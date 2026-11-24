export const TARGET = 25;
export const POST_LIMIT = 500;
export type Example = { id: number; revision: number; text: string };
export type Evidence = { id: number; revision: number; quote: string };
export type Rule = { dimension: string; instruction: string; core: boolean; evidence: Evidence[]; userEdited?: boolean };
export type Profile = {
  name: string; summary: string; minEmoji: number; maxEmoji: number; maxCharacters: number;
  miniExample: string; rules: Rule[]; provisional?: boolean;
};
export type Validation = { id: number; profile: string; fits: boolean; rationale: string };
export type Blueprint = { profiles: Profile[]; sourceCount: number; checks: Validation[] };
export type Version = { id: number; blueprint: Blueprint };
export type Slot = { slot: number; profile: string; angle: string; device: string };
export type Draft = Slot & { text: string };
export type Batch = {
  id: number; topic: string; versionId: number; profiles: string[];
  createdAt: string; drafts: Draft[]; lastError?: string | null;
};
export type HistoryEntry = Pick<Batch, 'id' | 'topic' | 'createdAt'> & { count: number };
export type Job = {
  id: string; kind: 'analyze' | 'generate' | 'replace'; status: 'queued' | 'working' | 'done' | 'failed';
  batchId: number | null; slot: number | null; phase: string; completed: number; total: number | null;
  error: string | null; result: Blueprint | null;
};
export type Studio = {
  mode: 'demo' | 'live'; examples: Example[]; active: Version | null; styles: Version;
  history: HistoryEntry[]; running: Job | null; analysis: Job | null;
};
