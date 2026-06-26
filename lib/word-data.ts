import { GROUPS } from "@/data/groups.mjs";
import { MOM_LEVELS } from "@/data/groups.mom.mjs";
import { TOEIC_LEVELS } from "@/data/groups.toeic.mjs";
import type { LevelId } from "@/lib/storage";
import type { StudyItem } from "@/lib/playlists";

export type GroupWord = {
  cat?: string;
  pos: string;
  word: string;
  mean: string;
  ex: string;
  exKo: string;
};

export type WordGroup = {
  id: number;
  concept: string;
  ko: string;
  words: GroupWord[];
};

export type MomLevelEntry = {
  id: string;
  label: string;
  desc: string;
  groups: WordGroup[];
  active: boolean;
};

export type ToeicSetEntry = {
  id: string;
  label: string;
  desc: string;
  groups: WordGroup[];
  active: boolean;
};

export type ToeicLevelEntry = {
  id: string;
  label: string;
  desc: string;
  sets: ToeicSetEntry[];
  active: boolean;
};

export type MomLevelId = (typeof MOM_LEVELS)[number]["id"];
export type ToeicLevelId = (typeof TOEIC_LEVELS)[number]["id"];

export function getMomLevels(): MomLevelEntry[] {
  return MOM_LEVELS as MomLevelEntry[];
}

export function getMomLevel(id: string): MomLevelEntry | undefined {
  return getMomLevels().find((l) => l.id === id);
}

export function getMomLevelWordCount(id: string): number {
  const entry = getMomLevel(id);
  if (!entry) return 0;
  return entry.groups.reduce((n, g) => n + g.words.length, 0);
}

export function getToeicLevels(): ToeicLevelEntry[] {
  return TOEIC_LEVELS as ToeicLevelEntry[];
}

export function getToeicLevel(id: string): ToeicLevelEntry | undefined {
  return getToeicLevels().find((l) => l.id === id);
}

export function getToeicSet(
  levelId: string,
  setId: string,
): ToeicSetEntry | undefined {
  return getToeicLevel(levelId)?.sets.find((s) => s.id === setId);
}

export function getToeicSetWordCount(levelId: string, setId: string): number {
  const entry = getToeicSet(levelId, setId);
  if (!entry) return 0;
  return entry.groups.reduce((n, g) => n + g.words.length, 0);
}

export function getToeicLevelWordCount(levelId: string): number {
  const entry = getToeicLevel(levelId);
  if (!entry) return 0;
  return entry.sets
    .filter((s) => s.active)
    .reduce((n, s) => n + s.groups.reduce((m, g) => m + g.words.length, 0), 0);
}

export function getGroupsForLevel(level: LevelId): WordGroup[] {
  return GROUPS as WordGroup[];
}

export function getMomStudyItems(momLevelId: string): StudyItem[] {
  const entry = getMomLevel(momLevelId);
  if (!entry?.active) return [];
  return groupsToStudyItems(entry.groups);
}

export function getToeicStudyItems(
  toeicLevelId: string,
  toeicSetId: string,
): StudyItem[] {
  const entry = getToeicSet(toeicLevelId, toeicSetId);
  if (!entry?.active) return [];
  return groupsToStudyItems(entry.groups);
}

export function groupsToStudyItems(groups: WordGroup[]): StudyItem[] {
  return groups.flatMap((g) =>
    g.words.map((w) => ({
      pos: w.pos,
      word: w.word,
      mean: w.mean,
      ex: w.ex,
      exKo: w.exKo,
      concept: g.concept,
      conceptKo: g.ko,
    })),
  );
}

export function isSimpleListenLevel(level: LevelId): boolean {
  return level === "eomuni";
}

export const MOM_LEVEL01_WORD_COUNT = getMomLevelWordCount("level01");
export const TOEIC_LEVEL01_WORD_COUNT = getToeicLevelWordCount("level01");
