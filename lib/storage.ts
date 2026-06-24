const STORAGE_KEY = "english-study";

export type LevelId =
  | "basic"
  | "intermediate"
  | "advanced"
  | "toeic-750"
  | "namjeonghyeon"
  | "eomuni";

export type LoopMode = "stop" | "repeat";

export type PlaybackSettings = {
  gapSec: number;
  wordRepeatCount: number;
  exampleRepeatCount: number;
  setGapSec: number;
  loopMode: LoopMode;
  itemGapEnabled: boolean;
  itemGapSec: number;
};

const ACTIVE_LEVELS: LevelId[] = ["namjeonghyeon", "eomuni"];

const ALL_LEVEL_IDS: LevelId[] = [
  "basic",
  "intermediate",
  "advanced",
  "toeic-750",
  "namjeonghyeon",
  "eomuni",
];

export type QuizScoreEntry = {
  score: number;
  total: number;
};

export type StoredSettings = PlaybackSettings & {
  quizScores: Record<string, QuizScoreEntry>;
  selectedLevel?: LevelId;
  selectedMomLevel?: string;
};

export const PLAYBACK_DEFAULTS: PlaybackSettings = {
  gapSec: 3.0,
  wordRepeatCount: 2,
  exampleRepeatCount: 2,
  setGapSec: 0.8,
  loopMode: "stop",
  itemGapEnabled: true,
  itemGapSec: 0.7,
};

function isLevelId(value: unknown): value is LevelId {
  return (
    typeof value === "string" &&
    (ALL_LEVEL_IDS as string[]).includes(value)
  );
}

function normalizeSelectedLevel(raw: unknown): LevelId | undefined {
  if (raw === "TEST" || raw === "namjeonghyeon") return "namjeonghyeon";
  if (isLevelId(raw) && ACTIVE_LEVELS.includes(raw)) return raw;
  return undefined;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function clampInt(n: number, min: number, max: number): number {
  return clamp(Math.round(n), min, max);
}

function normalizePlayback(raw: Partial<StoredSettings>): PlaybackSettings {
  return {
    gapSec:
      typeof raw.gapSec === "number"
        ? clamp(raw.gapSec, 0.2, 6)
        : PLAYBACK_DEFAULTS.gapSec,
    wordRepeatCount:
      typeof raw.wordRepeatCount === "number"
        ? clampInt(raw.wordRepeatCount, 1, 3)
        : PLAYBACK_DEFAULTS.wordRepeatCount,
    exampleRepeatCount:
      typeof raw.exampleRepeatCount === "number"
        ? clampInt(raw.exampleRepeatCount, 1, 3)
        : PLAYBACK_DEFAULTS.exampleRepeatCount,
    setGapSec:
      typeof raw.setGapSec === "number"
        ? clamp(raw.setGapSec, 0.3, 2)
        : PLAYBACK_DEFAULTS.setGapSec,
    loopMode: raw.loopMode === "repeat" ? "repeat" : "stop",
    itemGapEnabled:
      typeof raw.itemGapEnabled === "boolean"
        ? raw.itemGapEnabled
        : PLAYBACK_DEFAULTS.itemGapEnabled,
    itemGapSec:
      typeof raw.itemGapSec === "number"
        ? clamp(raw.itemGapSec, 0.3, 1.5)
        : PLAYBACK_DEFAULTS.itemGapSec,
  };
}

export function isActiveLevel(id: LevelId): boolean {
  return ACTIVE_LEVELS.includes(id);
}

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
  const playback = normalizePlayback(raw);
  return {
    ...playback,
    quizScores:
      raw.quizScores && typeof raw.quizScores === "object"
        ? raw.quizScores
        : {},
    selectedLevel: normalizeSelectedLevel(raw.selectedLevel),
  };
}

export function loadPlaybackSettings(): PlaybackSettings {
  const {
    gapSec,
    wordRepeatCount,
    exampleRepeatCount,
    setGapSec,
    loopMode,
    itemGapEnabled,
    itemGapSec,
  } = load();
  return {
    gapSec,
    wordRepeatCount,
    exampleRepeatCount,
    setGapSec,
    loopMode,
    itemGapEnabled,
    itemGapSec,
  };
}

export function savePlaybackSettings(partial: Partial<PlaybackSettings>) {
  const current = loadPlaybackSettings();
  const next = normalizePlayback({ ...current, ...partial });
  write(next);
}

/** @deprecated savePlaybackSettings 사용 */
export function saveGapSec(gapSec: number) {
  savePlaybackSettings({ gapSec });
}

export function loadSelectedLevel(): LevelId | null {
  return load().selectedLevel ?? null;
}

export function saveSelectedLevel(level: LevelId | null) {
  if (level === null) {
    const { selectedLevel: _, selectedMomLevel: __, ...rest } = load();
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    return;
  }
  write({ selectedLevel: level });
}

export function loadSelectedMomLevel(): string | null {
  return load().selectedMomLevel ?? null;
}

export function saveSelectedMomLevel(momLevel: string | null) {
  if (momLevel === null) {
    const { selectedMomLevel: _, ...rest } = load();
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    return;
  }
  write({ selectedMomLevel: momLevel });
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
