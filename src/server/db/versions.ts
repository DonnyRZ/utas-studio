import { and, desc, eq } from 'drizzle-orm';
import type { Blueprint, Version } from '../../domain/types';
import { normalize } from '../../domain/text';
import { defaultStyles } from '../ai/defaults';
import { mode } from '../config';
import { Problem } from '../errors';
import { db } from './client';
import { blueprints } from './schema';

export async function activeVersion(): Promise<Version | null> {
  const [row] = await db.select({ id: blueprints.id, blueprint: blueprints.blueprint }).from(blueprints)
    .where(eq(blueprints.mode, mode)).orderBy(desc(blueprints.id)).limit(1);
  return row ?? null;
}

export async function selectedVersion() {
  return await activeVersion() ?? defaultStyles;
}

export async function activate(jobId: string, blueprint: Blueprint, edits: { name: string; instructions: string[] }[]) {
  if (blueprint.profiles.length !== edits.length) throw new Problem(400, 'Daftar profil berubah.');
  const names = new Set<string>();
  const profiles = blueprint.profiles.map((profile, i) => {
    const edit = edits[i];
    const name = normalize(edit.name);
    if (!name || names.has(name) || edit.instructions.length !== profile.rules.length) {
      throw new Problem(400, 'Nama gaya harus unik dan setiap aturan perlu diisi.');
    }
    names.add(name);
    const rules = profile.rules.map((rule, j) => ({
      ...rule, instruction: edit.instructions[j], userEdited: rule.instruction !== edit.instructions[j],
    }));
    return { ...profile, name: edit.name, rules, provisional: profile.provisional || rules.some((rule) => rule.userEdited) };
  });
  const rename = new Map(blueprint.profiles.map((profile, i) => [profile.name, profiles[i].name]));
  const data = { ...blueprint, profiles, checks: blueprint.checks.map((item) => ({
    ...item, profile: rename.get(item.profile) ?? item.profile,
  })) };
  const [row] = await db.insert(blueprints).values({ jobId, blueprint: data, mode }).onConflictDoNothing().returning();
  if (!row) {
    const [existing] = await db.select().from(blueprints)
      .where(and(eq(blueprints.jobId, jobId), eq(blueprints.mode, mode)));
    if (existing) return existing;
    throw new Problem(409, 'Pratinjau sudah berubah.');
  }
  return row;
}
