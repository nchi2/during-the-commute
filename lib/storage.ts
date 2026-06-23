const STORAGE_KEY = "english-study";

export type QuizScoreEntry = {
  score: number;
  total: number;
};

export type StoredSettings = {
  gapSec: number;
  quizScores: Record<string, QuizScoreEntry>;
};

const DEFAULTS: StoredSettings = {
  gapSec: 2.5,
  quizScores: {},
};

function readRaw(): Partial<StoredSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<StoredSettings>;
  } catch {
    return {};
  }
}

function write(partial: Partial<StoredSettings>) {
  if (typeof window === "undefined") return;
  const next = { ...load(), ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function load(): StoredSettings {
  const raw = readRaw();
  return {
    gapSec: typeof raw.gapSec === "number" ? raw.gapSec : DEFAULTS.gapSec,
    quizScores:
      raw.quizScores && typeof raw.quizScores === "object"
        ? raw.quizScores
        : DEFAULTS.quizScores,
  };
}

export function saveGapSec(gapSec: number) {
  write({ gapSec });
}

export function saveQuizScore(score: number, total: number) {
  const date = new Date().toISOString().slice(0, 10);
  const settings = load();
  settings.quizScores[date] = { score, total };
  write({ quizScores: settings.quizScores });
}

export function todayQuizScore(): QuizScoreEntry | null {
  const date = new Date().toISOString().slice(0, 10);
  return load().quizScores[date] ?? null;
}
