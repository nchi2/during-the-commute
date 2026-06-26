import { GROUPS } from "@/data/groups.mjs";
import type { WordGroup } from "@/lib/word-data";

export type WordId = string;

export type Playlist = {
  id: string;
  name: string;
  wordIds: WordId[];
  createdAt: string;
  updatedAt: string;
};

export type CatalogWord = {
  id: WordId;
  groupId: number;
  concept: string;
  conceptKo: string;
  pos: string;
  word: string;
  mean: string;
  ex: string;
  exKo: string;
  order: number;
};

export type StudyItem = {
  pos: string;
  word: string;
  mean: string;
  ex: string;
  exKo: string;
  concept: string;
  conceptKo: string;
};

const PLAYLISTS_KEY = "english-study-playlists";

export function makeWordId(groupId: number, word: string, pos: string): WordId {
  return `${groupId}:${word}:${pos}`;
}

let catalogCache: CatalogWord[] | null = null;

export function buildWordCatalog(groups: WordGroup[]): CatalogWord[] {
  return groups.flatMap((g, gi) =>
    g.words.map((w, wi) => ({
      id: makeWordId(g.id, w.word, w.pos),
      groupId: g.id,
      concept: g.concept,
      conceptKo: g.ko,
      pos: w.pos,
      word: w.word,
      mean: w.mean,
      ex: w.ex,
      exKo: w.exKo,
      order: gi * 10000 + wi,
    })),
  );
}

export function getWordCatalog(): CatalogWord[] {
  if (!catalogCache) {
    catalogCache = buildWordCatalog(GROUPS as WordGroup[]);
  }
  return catalogCache;
}

export function resolveWordIds(
  wordIds: WordId[],
  catalog?: CatalogWord[],
): StudyItem[] {
  const map = new Map((catalog ?? getWordCatalog()).map((w) => [w.id, w]));
  const out: StudyItem[] = [];
  for (const id of wordIds) {
    const w = map.get(id);
    if (!w) continue;
    out.push({
      pos: w.pos,
      word: w.word,
      mean: w.mean,
      ex: w.ex,
      exKo: w.exKo,
      concept: w.concept,
      conceptKo: w.conceptKo,
    });
  }
  return out;
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadPlaylists(): Playlist[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PLAYLISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Playlist[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(playlists: Playlist[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

export function createPlaylist(name: string, wordIds: WordId[]): Playlist {
  const now = new Date().toISOString();
  const playlist: Playlist = {
    id: newId(),
    name: name.trim() || "이름 없음",
    wordIds: Array.from(new Set(wordIds)),
    createdAt: now,
    updatedAt: now,
  };
  const all = loadPlaylists();
  all.unshift(playlist);
  saveAll(all);
  return playlist;
}

export function updatePlaylist(
  id: string,
  patch: Partial<Pick<Playlist, "name" | "wordIds">>,
): Playlist | null {
  const all = loadPlaylists();
  const i = all.findIndex((p) => p.id === id);
  if (i < 0) return null;
  const next: Playlist = {
    ...all[i],
    ...patch,
    wordIds: patch.wordIds ? Array.from(new Set(patch.wordIds)) : all[i].wordIds,
    updatedAt: new Date().toISOString(),
  };
  all[i] = next;
  saveAll(all);
  return next;
}

export function deletePlaylist(id: string): boolean {
  const all = loadPlaylists();
  const next = all.filter((p) => p.id !== id);
  if (next.length === all.length) return false;
  saveAll(next);
  return true;
}

export function appendWordIds(id: string, wordIds: WordId[]): Playlist | null {
  const all = loadPlaylists();
  const pl = all.find((p) => p.id === id);
  if (!pl) return null;
  return updatePlaylist(id, {
    wordIds: [...pl.wordIds, ...wordIds],
  });
}

export function removeWordId(id: string, wordId: WordId): Playlist | null {
  const pl = loadPlaylists().find((p) => p.id === id);
  if (!pl) return null;
  return updatePlaylist(id, {
    wordIds: pl.wordIds.filter((w) => w !== wordId),
  });
}
