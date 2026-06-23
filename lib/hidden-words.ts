import type { WordId } from "@/lib/playlists";

const HIDDEN_WORDS_KEY = "english-study-hidden-words";

export function loadHiddenWordIds(): Set<WordId> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(HIDDEN_WORDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is WordId => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function saveHiddenWordIds(ids: Set<WordId>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HIDDEN_WORDS_KEY, JSON.stringify(Array.from(ids)));
}

export function hideWordId(id: WordId): Set<WordId> {
  const next = loadHiddenWordIds();
  next.add(id);
  saveHiddenWordIds(next);
  return next;
}

export function restoreWordId(id: WordId): Set<WordId> {
  const next = loadHiddenWordIds();
  next.delete(id);
  saveHiddenWordIds(next);
  return next;
}

export function restoreAllHiddenWordIds(): Set<WordId> {
  saveHiddenWordIds(new Set());
  return new Set();
}

export function filterVisibleWordIds(ids: WordId[]): WordId[] {
  const hidden = loadHiddenWordIds();
  return ids.filter((id) => !hidden.has(id));
}
