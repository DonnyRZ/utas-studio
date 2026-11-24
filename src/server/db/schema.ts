import { boolean, integer, jsonb, pgTable, primaryKey, serial, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core';
import type { Blueprint, Slot } from '../../domain/types';

const date = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' }).notNull().defaultNow();
export const examples = pgTable('examples', {
  id: serial('id').primaryKey(), revision: integer('revision').notNull().default(1),
  archived: boolean('archived').notNull().default(false),
});
export const exampleRevisions = pgTable('example_revisions', {
  id: integer('example_id').notNull().references(() => examples.id), revision: integer('revision').notNull(),
  text: text('text').notNull(), normalized: text('normalized').notNull(),
}, (table) => [primaryKey({ columns: [table.id, table.revision] })]);
export const blueprints = pgTable('blueprints', {
  id: serial('id').primaryKey(), jobId: uuid('job_id').notNull().unique(),
  blueprint: jsonb('data').$type<Blueprint>().notNull(), createdAt: date('created_at'),
  mode: text('mode').notNull(),
});
export const batches = pgTable('batches', {
  id: serial('id').primaryKey(), topic: text('topic').notNull(), mode: text('mode').notNull(),
  versionId: integer('version_id').notNull(), profiles: jsonb('profiles').$type<string[]>().notNull(),
  blueprint: jsonb('blueprint').$type<Blueprint>().notNull(), plan: jsonb('plan').$type<Slot[]>(),
  createdAt: date('created_at'),
});
export const drafts = pgTable('drafts', {
  batchId: integer('batch_id').notNull().references(() => batches.id), slot: integer('slot').notNull(),
  profile: text('profile').notNull(), angle: text('angle').notNull(), device: text('device').notNull(),
  text: text('text').notNull(), assessment: jsonb('assessment').notNull(),
}, (table) => [primaryKey({ columns: [table.batchId, table.slot] })]);
export const embeddings = pgTable('embeddings', {
  model: text('model').notNull(), hash: text('hash').notNull(),
  value: vector('value', { dimensions: 3072 }).notNull(),
}, (table) => [primaryKey({ columns: [table.model, table.hash] })]);
