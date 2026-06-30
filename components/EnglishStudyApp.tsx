"use client";

import Image from "next/image";
import {
  useState,
  useRef,
  useMemo,
  useEffect,
  type CSSProperties,
} from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Check,
  X,
  ListChecks,
  Brain,
  RotateCcw,
  ChevronLeft,
  Repeat,
  Search,
  ListMusic,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  loadPlaybackSettings,
  loadSelectedLevel,
  loadSelectedMomLevel,
  loadSelectedToeicLevel,
  loadSelectedToeicSet,
  saveQuizScore,
  saveSelectedLevel,
  saveSelectedMomLevel,
  saveSelectedToeicLevel,
  saveSelectedToeicSet,
} from "@/lib/storage";
import type { LevelId } from "@/lib/storage";
import {
  cancelPlayback,
  preloadWordAudio,
  preloadWordSequence,
  reclaimAudioSession,
  setAudioSubdirForLevel,
  setAudioSubdirForLifeSentenceLevel,
  setAudioSubdirForToeicLevel,
  setAudioGroups,
  skipsExamplePhase,
  speakEnglishExample,
  speakEnglishExampleNow,
  speakEnglishWord,
  speakEnglishWordNow,
  speakKoreanExKo,
  speakKoreanMean,
  startAudioKeepAlive,
  stopAudioKeepAlive,
  stopStudyPlayback,
} from "@/lib/audio";
import {
  clearMediaSessionHandlers,
  registerMediaSessionHandlers,
  setMediaPlaybackState,
  updateMediaPositionState,
  updateStudyMediaMetadata,
} from "@/lib/media-session";
import { GROUPS } from "@/data/groups.mjs";
import {
  getLifeSentenceLevel,
  getLifeSentenceLevels,
  getLifeSentenceStudyItems,
  getToeicLevel,
  getToeicLevels,
  getToeicSet,
  isSimpleListenLevel,
  LIFE_SENTENCE_LEVEL01_WORD_COUNT,
  TOEIC_LEVEL01_WORD_COUNT,
  type LifeSentenceLevelId,
  type ToeicLevelId,
} from "@/lib/word-data";
import { buildWordCatalog, getWordCatalog, resolveWordIds } from "@/lib/playlists";
import type { WordId } from "@/lib/playlists";
import { useHiddenWords } from "@/hooks/useHiddenWords";
import PlaylistSection from "@/components/PlaylistSection";
import SettingsScreen from "@/components/SettingsScreen";
import HiddenWordsPanel from "@/components/HiddenWordsPanel";
import SwipeableWordRow from "@/components/SwipeableWordRow";
import type { StudyItem as PlaylistStudyItem } from "@/lib/playlists";

type Tab = "study" | "quiz" | "playlist";
type StudyPhase = "word" | "example";

type Word = {
  pos: string;
  word: string;
  mean: string;
  ex: string;
  exKo: string;
};

type StudyItem = Word & { concept: string; conceptKo: string };

// 색 팔레트 — 잉크 베이스 + 골드 액센트(축적의 금빛). 운전 중/저녁 학습에 눈 편한 다크.
const C = {
  bg: "#12141C",
  card: "#1B1E2A",
  elevated: "#232735",
  text: "#F0EBDF",
  muted: "#8B8FA3",
  gold: "#E8B33D",
  goldDim: "#5A4A22",
  green: "#5BBF8E",
  red: "#E07A5F",
  border: "#2E3344",
};

const POS_COLOR: Record<string, string> = {
  동사: "#E8B33D",
  명사: "#7CA8E0",
  형용사: "#5BBF8E",
  부사: "#C98BD0",
  문장: "#7CA8E0",
};

function posColor(pos: string): string {
  return POS_COLOR[pos] ?? C.muted;
}

const WORD_COUNT = GROUPS.reduce((n, g) => n + g.words.length, 0);

type LevelEntry = {
  id: LevelId;
  label: string;
  desc: string;
  active: boolean;
  inactiveToast?: string;
};

type LevelCategory = {
  id: string;
  label: string;
  levels: LevelEntry[];
};

const LEVEL_CATEGORIES: LevelCategory[] = [
  {
    id: "foundation",
    label: "기본",
    levels: [
      { id: "basic", label: "기초", desc: "기초 단어", active: false },
      { id: "intermediate", label: "중급", desc: "중급 단어", active: false },
      { id: "advanced", label: "고급", desc: "고급 단어", active: false },
    ],
  },
  {
    id: "toeic",
    label: "토익",
    levels: [
      {
        id: "toeic",
        label: "토익",
        desc: `Level 1 · ${TOEIC_LEVEL01_WORD_COUNT}단어~`,
        active: true,
      },
    ],
  },
  {
    id: "custom",
    label: "커스텀",
    levels: [
      {
        id: "namjeonghyeon",
        label: "남정현",
        desc: `단어장 ${WORD_COUNT}개`,
        active: true,
      },
      {
        id: "eomuni",
        label: "생활 문장",
        desc: `생활 문장 · ${LIFE_SENTENCE_LEVEL01_WORD_COUNT}문장~`,
        active: true,
      },
    ],
  },
];

const LEVEL_LABEL: Record<LevelId, string> = {
  basic: "기초",
  intermediate: "중급",
  advanced: "고급",
  toeic: "토익",
  namjeonghyeon: "남정현",
  eomuni: "생활 문장",
};

function findLevelEntry(id: LevelId): LevelEntry | undefined {
  for (const cat of LEVEL_CATEGORIES) {
    const found = cat.levels.find((l) => l.id === id);
    if (found) return found;
  }
  return undefined;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const shuffle = <T,>(a: T[]): T[] => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

export default function EnglishStudyApp() {
  const [level, setLevel] = useState<LevelId | null>(null);
  const [levelReady, setLevelReady] = useState(false);
  const [levelToast, setLevelToast] = useState<string | null>(null);
  const [lifeSentenceLevel, setLifeSentenceLevel] =
    useState<LifeSentenceLevelId | null>(null);
  const [lifeSentenceToast, setLifeSentenceToast] = useState<string | null>(
    null,
  );
  const [toeicLevel, setToeicLevel] = useState<ToeicLevelId | null>(null);
  const [toeicSet, setToeicSet] = useState<string | null>(null);
  const [toeicToast, setToeicToast] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("study");
  const [selected, setSelected] = useState<Set<WordId>>(new Set());
  const [started, setStarted] = useState(false);
  const [playlistSession, setPlaylistSession] = useState<{
    mode: "study" | "quiz";
    items: StudyItem[];
  } | null>(null);
  const [playlistReset, setPlaylistReset] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const {
    hiddenIds,
    hide: hideWord,
    restore: restoreWord,
    restoreAll: restoreAllHidden,
    count: hiddenCount,
  } = useHiddenWords();
  const settingsReturnRef = useRef<{
    tab: Tab;
    started: boolean;
    playlistSession: {
      mode: "study" | "quiz";
      items: StudyItem[];
    } | null;
  } | null>(null);

  const openSettings = () => {
    cancelPlayback();
    settingsReturnRef.current = { tab, started, playlistSession };
    setShowSettings(true);
  };

  const closeSettings = () => {
    const snap = settingsReturnRef.current;
    if (snap) {
      setTab(snap.tab);
      setStarted(snap.started);
      setPlaylistSession(snap.playlistSession);
      settingsReturnRef.current = null;
    }
    setShowSettings(false);
  };

  useEffect(() => {
    const saved = loadSelectedLevel();
    if (saved) {
      setLevel(saved);
      if (saved === "eomuni") {
        const savedMom = loadSelectedMomLevel();
        const entry = savedMom ? getLifeSentenceLevel(savedMom) : undefined;
        if (savedMom && entry?.active) {
          setLifeSentenceLevel(savedMom as LifeSentenceLevelId);
          setAudioSubdirForLifeSentenceLevel(savedMom);
        }
      } else if (saved === "toeic") {
        const savedToeicLevel = loadSelectedToeicLevel();
        const savedToeicSet = loadSelectedToeicSet();
        const levelEntry = savedToeicLevel
          ? getToeicLevel(savedToeicLevel)
          : undefined;
        const setEntry =
          savedToeicLevel && savedToeicSet
            ? getToeicSet(savedToeicLevel, savedToeicSet)
            : undefined;
        if (savedToeicLevel && levelEntry?.active) {
          setToeicLevel(savedToeicLevel as ToeicLevelId);
          setAudioSubdirForToeicLevel(savedToeicLevel);
          if (savedToeicSet && setEntry?.active) {
            setToeicSet(savedToeicSet);
          }
        }
      } else {
        setAudioSubdirForLevel(saved);
      }
    }
    setLevelReady(true);
  }, []);

  useEffect(() => {
    if (level === "eomuni" && lifeSentenceLevel) {
      setAudioSubdirForLifeSentenceLevel(lifeSentenceLevel);
      setAudioGroups(null);
    } else if (level === "toeic" && toeicLevel) {
      setAudioSubdirForToeicLevel(toeicLevel);
      if (toeicSet) {
        const set = getToeicSet(toeicLevel, toeicSet);
        setAudioGroups(set?.groups ?? null);
      } else {
        setAudioGroups(null);
      }
    } else if (level && level !== "eomuni" && level !== "toeic") {
      setAudioSubdirForLevel(level);
      setAudioGroups(null);
    } else {
      setAudioGroups(null);
    }
  }, [level, lifeSentenceLevel, toeicLevel, toeicSet]);

  const handleSelectLevel = (id: LevelId, active: boolean) => {
    if (!active) {
      const meta = findLevelEntry(id);
      setLevelToast(meta?.inactiveToast ?? "준비 중입니다");
      setTimeout(() => setLevelToast(null), 2500);
      return;
    }
    cancelPlayback();
    setLevel(id);
    saveSelectedLevel(id);
    setTab("study");
    setPlaylistSession(null);
    if (id === "eomuni") {
      setLifeSentenceLevel(null);
      saveSelectedMomLevel(null);
      setToeicLevel(null);
      setToeicSet(null);
      saveSelectedToeicLevel(null);
      saveSelectedToeicSet(null);
      setSelected(new Set());
    } else if (id === "toeic") {
      setLifeSentenceLevel(null);
      saveSelectedMomLevel(null);
      setToeicLevel(null);
      setToeicSet(null);
      saveSelectedToeicLevel(null);
      saveSelectedToeicSet(null);
      setStarted(false);
      setSelected(new Set());
    } else {
      setLifeSentenceLevel(null);
      saveSelectedMomLevel(null);
      setToeicLevel(null);
      setToeicSet(null);
      saveSelectedToeicLevel(null);
      saveSelectedToeicSet(null);
      setStarted(false);
      setSelected(new Set());
      setAudioSubdirForLevel(id);
    }
  };

  const handleSelectLifeSentenceLevel = (
    id: LifeSentenceLevelId,
    active: boolean,
  ) => {
    if (!active) {
      setLifeSentenceToast("준비 중입니다");
      setTimeout(() => setLifeSentenceToast(null), 2500);
      return;
    }
    cancelPlayback();
    setLifeSentenceLevel(id);
    saveSelectedMomLevel(id);
    setAudioSubdirForLifeSentenceLevel(id);
  };

  const handleSelectToeicLevel = (id: ToeicLevelId, active: boolean) => {
    if (!active) {
      setToeicToast("준비 중입니다");
      setTimeout(() => setToeicToast(null), 2500);
      return;
    }
    cancelPlayback();
    setToeicLevel(id);
    setToeicSet(null);
    saveSelectedToeicLevel(id);
    saveSelectedToeicSet(null);
    setAudioSubdirForToeicLevel(id);
    setStarted(false);
    setSelected(new Set());
    setPlaylistSession(null);
  };

  const handleSelectToeicSet = (id: string, active: boolean) => {
    if (!active) {
      setToeicToast("준비 중입니다");
      setTimeout(() => setToeicToast(null), 2500);
      return;
    }
    cancelPlayback();
    setToeicSet(id);
    saveSelectedToeicSet(id);
    setStarted(false);
    setSelected(new Set());
    setPlaylistSession(null);
  };

  const handleToeicLevelBack = () => {
    cancelPlayback();
    setToeicLevel(null);
    setToeicSet(null);
    saveSelectedToeicLevel(null);
    saveSelectedToeicSet(null);
    setStarted(false);
    setSelected(new Set());
    setPlaylistSession(null);
  };

  const handleToeicSetBack = () => {
    cancelPlayback();
    setToeicSet(null);
    saveSelectedToeicSet(null);
    setStarted(false);
    setSelected(new Set());
    setPlaylistSession(null);
  };

  const handleLifeSentenceLevelBack = () => {
    cancelPlayback();
    setLifeSentenceLevel(null);
    saveSelectedMomLevel(null);
  };

  const handleChangeLevel = () => {
    cancelPlayback();
    settingsReturnRef.current = null;
    setShowSettings(false);
    setTab("study");
    setStarted(false);
    setSelected(new Set());
    setLifeSentenceLevel(null);
    saveSelectedMomLevel(null);
    setToeicLevel(null);
    setToeicSet(null);
    saveSelectedToeicLevel(null);
    saveSelectedToeicSet(null);
    setLevel(null);
    saveSelectedLevel(null);
    setPlaylistSession(null);
    setPlaylistReset((n) => n + 1);
  };

  const handleGoHome = () => {
    cancelPlayback();
    settingsReturnRef.current = null;
    setShowSettings(false);
    setTab("study");
    setStarted(false);
    setSelected(new Set());
    setLifeSentenceLevel(null);
    saveSelectedMomLevel(null);
    setToeicLevel(null);
    setToeicSet(null);
    saveSelectedToeicLevel(null);
    saveSelectedToeicSet(null);
    setLevel(null);
    saveSelectedLevel(null);
    setPlaylistSession(null);
    setPlaylistReset((n) => n + 1);
  };

  const lifeSentenceItems = useMemo(() => {
    if (!lifeSentenceLevel) return [];
    return getLifeSentenceStudyItems(lifeSentenceLevel);
  }, [lifeSentenceLevel]);

  const toeicCatalog = useMemo(() => {
    if (!toeicLevel || !toeicSet) return null;
    const set = getToeicSet(toeicLevel, toeicSet);
    if (!set?.active) return null;
    return buildWordCatalog(set.groups);
  }, [toeicLevel, toeicSet]);

  const items = useMemo(() => {
    const catalog = toeicCatalog ?? getWordCatalog();
    const ids = catalog
      .filter((w) => selected.has(w.id) && !hiddenIds.has(w.id))
      .map((w) => w.id);
    return resolveWordIds(ids, catalog);
  }, [selected, hiddenIds, toeicCatalog]);

  if (!levelReady) {
    return (
      <div
        style={{
          background: C.bg,
          minHeight: "100vh",
        }}
      />
    );
  }

  if (level === null) {
    return (
      <LevelSelectScreen toast={levelToast} onSelect={handleSelectLevel} />
    );
  }

  const isLifeSentenceMode = isSimpleListenLevel(level);
  const isToeicMode = level === "toeic";
  const showStudyTabs =
    !isLifeSentenceMode && !(isToeicMode && (!toeicLevel || !toeicSet));

  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          width: "100%",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 헤더 */}
        <header
          style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
            background: C.bg,
            zIndex: 30,
          }}
        >
          <button
            onClick={handleGoHome}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: C.text,
              textAlign: "left",
            }}
          >
            <Image
              src="/logos/logo_commute.png"
              alt="출퇴근 영어"
              width={36}
              height={36}
              style={{ display: "block", borderRadius: 8, flexShrink: 0 }}
            />
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                출퇴근 영어
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: C.muted,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                commute english
              </span>
            </div>
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.gold,
                  border: `1px solid ${C.goldDim}`,
                  background: C.elevated,
                  padding: "4px 10px",
                  borderRadius: 8,
                }}
              >
                {LEVEL_LABEL[level]}
                {isLifeSentenceMode && lifeSentenceLevel && (
                  <span style={{ color: C.muted, fontWeight: 500 }}>
                    {" "}
                    · {getLifeSentenceLevel(lifeSentenceLevel)?.label}
                  </span>
                )}
                {isToeicMode && toeicLevel && (
                  <span style={{ color: C.muted, fontWeight: 500 }}>
                    {" "}
                    · {getToeicLevel(toeicLevel)?.label}
                    {toeicSet && (
                      <> · {getToeicSet(toeicLevel, toeicSet)?.label}</>
                    )}
                  </span>
                )}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={openSettings}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: `1px solid ${C.border}`,
                  color: showSettings ? C.gold : C.muted,
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                <Settings size={14} /> 설정
              </button>
              <button
                onClick={handleChangeLevel}
                style={{
                  background: "none",
                  border: `1px solid ${C.border}`,
                  color: C.muted,
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {isLifeSentenceMode ? "생활 문장 변경" : isToeicMode ? "토익 변경" : "단어장 변경"}
              </button>
            </div>
          </div>
          {isToeicMode &&
            toeicSet &&
            !playlistSession &&
            !showSettings &&
            showStudyTabs && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  onClick={handleToeicSetBack}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "none",
                    border: "none",
                    color: C.muted,
                    cursor: "pointer",
                    fontSize: 14,
                    padding: 0,
                  }}
                >
                  <ChevronLeft size={18} /> 세트선택
                </button>
              </div>
            )}
          {!showSettings && showStudyTabs && (
            <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
              {(
                [
                  { id: "study" as Tab, label: "단어", Icon: ListChecks },
                  { id: "quiz" as Tab, label: "퀴즈", Icon: Brain },
                  { id: "playlist" as Tab, label: "플레이", Icon: ListMusic },
                ] satisfies { id: Tab; label: string; Icon: LucideIcon }[]
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setTab(id);
                    setStarted(false);
                    setPlaylistSession(null);
                    cancelPlayback();
                  }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "9px 0",
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    background: tab === id ? C.gold : C.elevated,
                    color: tab === id ? "#1A1408" : C.muted,
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          )}
        </header>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
        {showSettings ? (
          <SettingsScreen
            onBack={closeSettings}
            hideExampleSettings={isLifeSentenceMode}
          />
        ) : isToeicMode ? (
          !toeicLevel ? (
            <ToeicLevelSelectScreen
              toast={toeicToast}
              onSelect={handleSelectToeicLevel}
              onBack={handleChangeLevel}
            />
          ) : !toeicSet ? (
            <ToeicSetSelectScreen
              levelId={toeicLevel}
              toast={toeicToast}
              onSelect={handleSelectToeicSet}
              onBack={handleToeicLevelBack}
            />
          ) : (
            <>
              {playlistSession?.mode === "study" && (
                <StudyView
                  items={playlistSession.items}
                  onBack={() => {
                    setPlaylistSession(null);
                  }}
                />
              )}
              {playlistSession?.mode === "quiz" && (
                <QuizView
                  items={playlistSession.items}
                  onBack={() => {
                    cancelPlayback();
                    setPlaylistSession(null);
                  }}
                />
              )}

              {!playlistSession && tab === "study" && !started && (
                <GroupPicker
                  catalog={toeicCatalog ?? undefined}
                  selected={selected}
                  onSelectedChange={setSelected}
                  count={items.length}
                  onStart={() => {
                    cancelPlayback();
                    if (items.length) setStarted(true);
                  }}
                  ctaLabel="학습 시작"
                  hiddenIds={hiddenIds}
                  hiddenCount={hiddenCount}
                  onHideWord={hideWord}
                  onRestoreWord={restoreWord}
                  onRestoreAllHidden={restoreAllHidden}
                />
              )}
              {!playlistSession && tab === "study" && started && (
                <StudyView
                  items={items}
                  onBack={() => {
                    setStarted(false);
                  }}
                />
              )}
              {!playlistSession && tab === "quiz" && !started && (
                <GroupPicker
                  catalog={toeicCatalog ?? undefined}
                  selected={selected}
                  onSelectedChange={setSelected}
                  count={items.length}
                  onStart={() => {
                    cancelPlayback();
                    if (items.length >= 1) setStarted(true);
                  }}
                  ctaLabel="퀴즈 시작"
                  minNote={
                    items.length < 4 ? "4개 이상 단어를 선택하면 더 좋아" : null
                  }
                  hiddenIds={hiddenIds}
                  hiddenCount={hiddenCount}
                  onHideWord={hideWord}
                  onRestoreWord={restoreWord}
                  onRestoreAllHidden={restoreAllHidden}
                />
              )}
              {!playlistSession && tab === "quiz" && started && (
                <QuizView
                  items={items}
                  onBack={() => {
                    setStarted(false);
                  }}
                />
              )}
              {!playlistSession && tab === "playlist" && (
                <PlaylistSection
                  wordCatalog={toeicCatalog ?? undefined}
                  resetToken={playlistReset}
                  hiddenIds={hiddenIds}
                  hiddenCount={hiddenCount}
                  onHideWord={hideWord}
                  onRestoreWord={restoreWord}
                  onRestoreAllHidden={restoreAllHidden}
                  onStartStudy={(playlistItems: PlaylistStudyItem[]) => {
                    cancelPlayback();
                    setPlaylistSession({ mode: "study", items: playlistItems });
                  }}
                  onStartQuiz={(playlistItems: PlaylistStudyItem[]) => {
                    cancelPlayback();
                    setPlaylistSession({ mode: "quiz", items: playlistItems });
                  }}
                />
              )}
            </>
          )
        ) : isLifeSentenceMode ? (
          lifeSentenceLevel ? (
            <StudyView
              items={lifeSentenceItems}
              onBack={handleLifeSentenceLevelBack}
              backLabel="레벨"
            />
          ) : (
            <LifeSentenceLevelSelectScreen
              toast={lifeSentenceToast}
              onSelect={handleSelectLifeSentenceLevel}
              onBack={handleChangeLevel}
            />
          )
        ) : (
          <>
            {playlistSession?.mode === "study" && (
              <StudyView
                items={playlistSession.items}
                onBack={() => {
                  setPlaylistSession(null);
                }}
              />
            )}
            {playlistSession?.mode === "quiz" && (
              <QuizView
                items={playlistSession.items}
                onBack={() => {
                  cancelPlayback();
                  setPlaylistSession(null);
                }}
              />
            )}

            {!playlistSession && tab === "study" && !started && (
              <GroupPicker
                selected={selected}
                onSelectedChange={setSelected}
                count={items.length}
                onStart={() => {
                  cancelPlayback();
                  if (items.length) setStarted(true);
                }}
                ctaLabel="학습 시작"
                hiddenIds={hiddenIds}
                hiddenCount={hiddenCount}
                onHideWord={hideWord}
                onRestoreWord={restoreWord}
                onRestoreAllHidden={restoreAllHidden}
              />
            )}
            {!playlistSession && tab === "study" && started && (
              <StudyView
                items={items}
                onBack={() => {
                  setStarted(false);
                }}
              />
            )}
            {!playlistSession && tab === "quiz" && !started && (
              <GroupPicker
                selected={selected}
                onSelectedChange={setSelected}
                count={items.length}
                onStart={() => {
                  cancelPlayback();
                  if (items.length >= 1) setStarted(true);
                }}
                ctaLabel="퀴즈 시작"
                minNote={
                  items.length < 4 ? "4개 이상 단어를 선택하면 더 좋아" : null
                }
                hiddenIds={hiddenIds}
                hiddenCount={hiddenCount}
                onHideWord={hideWord}
                onRestoreWord={restoreWord}
                onRestoreAllHidden={restoreAllHidden}
              />
            )}
            {!playlistSession && tab === "quiz" && started && (
              <QuizView
                items={items}
                onBack={() => {
                  setStarted(false);
                }}
              />
            )}
            {!playlistSession && tab === "playlist" && (
              <PlaylistSection
                resetToken={playlistReset}
                hiddenIds={hiddenIds}
                hiddenCount={hiddenCount}
                onHideWord={hideWord}
                onRestoreWord={restoreWord}
                onRestoreAllHidden={restoreAllHidden}
                onStartStudy={(playlistItems: PlaylistStudyItem[]) => {
                  cancelPlayback();
                  setPlaylistSession({ mode: "study", items: playlistItems });
                }}
                onStartQuiz={(playlistItems: PlaylistStudyItem[]) => {
                  cancelPlayback();
                  setPlaylistSession({ mode: "quiz", items: playlistItems });
                }}
              />
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}

function LevelSelectScreen({
  toast,
  onSelect,
}: {
  toast: string | null;
  onSelect: (id: LevelId, active: boolean) => void;
}) {
  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        height: "100dvh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          padding: "32px 20px 40px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <Image
            src="/logos/logo_commute.png"
            alt="출퇴근 영어"
            width={56}
            height={56}
            style={{ display: "block", borderRadius: 12, marginBottom: 14 }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            단어장 선택
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 14,
              color: C.muted,
              textAlign: "center",
            }}
          >
            학습할 단어장을 골라 시작하세요
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {LEVEL_CATEGORIES.map((category) => (
            <section key={category.id}>
              <h2
                style={{
                  margin: "0 0 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: C.muted,
                }}
              >
                {category.label}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {category.levels.map(({ id, label, desc, active }) => (
                  <button
                    key={id}
                    onClick={() => onSelect(id, active)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      textAlign: "left",
                      padding: "15px 16px",
                      borderRadius: 12,
                      cursor: active ? "pointer" : "not-allowed",
                      background: active ? C.elevated : C.card,
                      border: `1px solid ${active ? C.gold : C.border}`,
                      color: active ? C.text : C.muted,
                      opacity: active ? 1 : 0.55,
                      width: "100%",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700 }}>
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: C.muted,
                          marginTop: 4,
                        }}
                      >
                        {desc}
                      </div>
                    </div>
                    {!active && (
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: 11,
                          fontWeight: 700,
                          color: C.muted,
                          border: `1px solid ${C.border}`,
                          padding: "3px 8px",
                          borderRadius: 6,
                        }}
                      >
                        준비 중
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        {toast && (
          <div
            style={{
              marginTop: 16,
              textAlign: "center",
              fontSize: 14,
              color: C.gold,
              padding: "10px 14px",
              borderRadius: 10,
              background: C.elevated,
              border: `1px solid ${C.goldDim}`,
            }}
          >
            {toast}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function LifeSentenceLevelSelectScreen({
  toast,
  onSelect,
  onBack,
}: {
  toast: string | null;
  onSelect: (id: LifeSentenceLevelId, active: boolean) => void;
  onBack: () => void;
}) {
  const levels = getLifeSentenceLevels();

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "20px 20px 32px",
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          color: C.muted,
          cursor: "pointer",
          fontSize: 14,
          marginBottom: 20,
          padding: 0,
        }}
      >
        <ChevronLeft size={18} /> 레벨 선택
      </button>

      <h2
        style={{
          margin: "0 0 6px",
          fontSize: 22,
          fontWeight: 800,
        }}
      >
        생활 문장
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: C.muted }}>
        레벨을 골라 문장을 들어보세요
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {levels.map((entry) => {
          const count = entry.groups.reduce((n, g) => n + g.words.length, 0);
          const desc = entry.active
            ? `${entry.desc} · ${count}문장`
            : entry.desc;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelect(entry.id as LifeSentenceLevelId, entry.active)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                textAlign: "left",
                padding: "15px 16px",
                borderRadius: 12,
                cursor: entry.active ? "pointer" : "not-allowed",
                background: entry.active ? C.elevated : C.card,
                border: `1px solid ${entry.active ? C.gold : C.border}`,
                color: entry.active ? C.text : C.muted,
                opacity: entry.active ? 1 : 0.55,
                width: "100%",
              }}
            >
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{entry.label}</div>
                <div
                  style={{
                    fontSize: 13,
                    color: C.muted,
                    marginTop: 4,
                  }}
                >
                  {desc}
                </div>
              </div>
              {!entry.active && (
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.muted,
                    border: `1px solid ${C.border}`,
                    padding: "3px 8px",
                    borderRadius: 6,
                  }}
                >
                  준비 중
                </span>
              )}
            </button>
          );
        })}
      </div>

      {toast && (
        <div
          style={{
            marginTop: 16,
            textAlign: "center",
            fontSize: 14,
            color: C.gold,
            padding: "10px 14px",
            borderRadius: 10,
            background: C.elevated,
            border: `1px solid ${C.goldDim}`,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function ToeicLevelSelectScreen({
  toast,
  onSelect,
  onBack,
}: {
  toast: string | null;
  onSelect: (id: ToeicLevelId, active: boolean) => void;
  onBack: () => void;
}) {
  const levels = getToeicLevels();

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "20px 20px 32px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            color: C.muted,
            cursor: "pointer",
            fontSize: 14,
            padding: 0,
          }}
        >
          <ChevronLeft size={18} /> 단어장 선택
        </button>
      </div>

      <h2
        style={{
          margin: "0 0 6px",
          fontSize: 22,
          fontWeight: 800,
        }}
      >
        토익
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: C.muted }}>
        레벨을 골라 학습을 시작하세요
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {levels.map((entry) => {
          const count = entry.sets
            .filter((s) => s.active)
            .reduce(
              (n, s) => n + s.groups.reduce((m, g) => m + g.words.length, 0),
              0,
            );
          const desc = entry.active
            ? `${entry.desc} · ${count}단어~`
            : entry.desc;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelect(entry.id as ToeicLevelId, entry.active)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                textAlign: "left",
                padding: "15px 16px",
                borderRadius: 12,
                cursor: entry.active ? "pointer" : "not-allowed",
                background: entry.active ? C.elevated : C.card,
                border: `1px solid ${entry.active ? C.gold : C.border}`,
                color: entry.active ? C.text : C.muted,
                opacity: entry.active ? 1 : 0.55,
                width: "100%",
              }}
            >
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{entry.label}</div>
                <div
                  style={{
                    fontSize: 13,
                    color: C.muted,
                    marginTop: 4,
                  }}
                >
                  {desc}
                </div>
              </div>
              {!entry.active && (
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.muted,
                    border: `1px solid ${C.border}`,
                    padding: "3px 8px",
                    borderRadius: 6,
                  }}
                >
                  준비 중
                </span>
              )}
            </button>
          );
        })}
      </div>

      {toast && (
        <div
          style={{
            marginTop: 16,
            textAlign: "center",
            fontSize: 14,
            color: C.gold,
            padding: "10px 14px",
            borderRadius: 10,
            background: C.elevated,
            border: `1px solid ${C.goldDim}`,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function ToeicSetSelectScreen({
  levelId,
  toast,
  onSelect,
  onBack,
}: {
  levelId: ToeicLevelId;
  toast: string | null;
  onSelect: (id: string, active: boolean) => void;
  onBack: () => void;
}) {
  const level = getToeicLevel(levelId);
  const sets = level?.sets ?? [];

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "20px 20px 32px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            color: C.muted,
            cursor: "pointer",
            fontSize: 14,
            padding: 0,
          }}
        >
          <ChevronLeft size={18} /> 레벨
        </button>
      </div>

      <h2
        style={{
          margin: "0 0 6px",
          fontSize: 22,
          fontWeight: 800,
        }}
      >
        {level?.label ?? "Level"}
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: C.muted }}>
        Set을 골라 단어를 학습하세요
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sets.map((entry) => {
          const count = entry.groups.reduce((n, g) => n + g.words.length, 0);
          const desc = entry.active
            ? `${entry.desc} · ${count}단어`
            : entry.desc;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelect(entry.id, entry.active)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                textAlign: "left",
                padding: "15px 16px",
                borderRadius: 12,
                cursor: entry.active ? "pointer" : "not-allowed",
                background: entry.active ? C.elevated : C.card,
                border: `1px solid ${entry.active ? C.gold : C.border}`,
                color: entry.active ? C.text : C.muted,
                opacity: entry.active ? 1 : 0.55,
                width: "100%",
              }}
            >
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>
                  {entry.label}
                  {entry.description ? (
                    <span style={{ fontWeight: 500, color: C.muted }}>
                      {" "}
                      ({entry.description})
                    </span>
                  ) : null}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: C.muted,
                    marginTop: 4,
                  }}
                >
                  {desc}
                </div>
              </div>
              {!entry.active && (
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.muted,
                    border: `1px solid ${C.border}`,
                    padding: "3px 8px",
                    borderRadius: 6,
                  }}
                >
                  준비 중
                </span>
              )}
            </button>
          );
        })}
      </div>

      {toast && (
        <div
          style={{
            marginTop: 16,
            textAlign: "center",
            fontSize: 14,
            color: C.gold,
            padding: "10px 14px",
            borderRadius: 10,
            background: C.elevated,
            border: `1px solid ${C.goldDim}`,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function GroupPicker({
  catalog,
  selected,
  onSelectedChange,
  onStart,
  count,
  ctaLabel,
  minNote,
  hiddenIds,
  hiddenCount,
  onHideWord,
  onRestoreWord,
  onRestoreAllHidden,
}: {
  catalog?: ReturnType<typeof getWordCatalog>;
  selected: Set<WordId>;
  onSelectedChange: (s: Set<WordId>) => void;
  onStart: () => void;
  count: number;
  ctaLabel: string;
  minNote?: string | null;
  hiddenIds: Set<WordId>;
  hiddenCount: number;
  onHideWord: (id: WordId) => void;
  onRestoreWord: (id: WordId) => void;
  onRestoreAllHidden: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"default" | "az">("default");
  const [showHidden, setShowHidden] = useState(false);
  const [undo, setUndo] = useState<{ ids: WordId[]; label: string } | null>(
    null,
  );
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allWords = useMemo(
    () => catalog ?? getWordCatalog(),
    [catalog],
  );
  const query = searchQuery.trim().toLowerCase();

  const displayedWords = useMemo(() => {
    let list = allWords.filter((w) => !hiddenIds.has(w.id));
    if (query) {
      list = list.filter(
        (w) =>
          w.word.toLowerCase().includes(query) ||
          w.mean.toLowerCase().includes(query),
      );
    }
    if (sortMode === "az") {
      list = [...list].sort((a, b) =>
        a.word.localeCompare(b.word, "en", { sensitivity: "base" }),
      );
    }
    return list;
  }, [allWords, query, sortMode, hiddenIds]);

  const toggleWord = (id: WordId) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  };

  const visibleIds = displayedWords.map((w) => w.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggleAllVisible = () => {
    const next = new Set(selected);
    if (allVisibleSelected) {
      for (const id of visibleIds) next.delete(id);
    } else {
      for (const id of visibleIds) next.add(id);
    }
    onSelectedChange(next);
  };

  const handleHideWord = (id: WordId, label: string) => {
    onHideWord(id);
    if (selected.has(id)) {
      const next = new Set(selected);
      next.delete(id);
      onSelectedChange(next);
    }
    setUndo({ ids: [id], label });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 4000);
  };

  const handleUndo = () => {
    if (!undo) return;
    undo.ids.forEach((id) => onRestoreWord(id));
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, []);

  const checkboxStyle = (on: boolean): CSSProperties => ({
    width: 22,
    height: 22,
    borderRadius: 6,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: on ? C.gold : "transparent",
    border: `1.5px solid ${on ? C.gold : C.muted}`,
  });

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {showHidden ? (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <HiddenWordsPanel
            hiddenIds={hiddenIds}
            onBack={() => setShowHidden(false)}
            onRestore={onRestoreWord}
            onRestoreAll={onRestoreAllHidden}
          />
        </div>
      ) : (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            padding: "16px 20px 12px",
            background: C.bg,
            borderBottom: `1px solid ${C.border}`,
            zIndex: 20,
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              color={C.muted}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="단어·뜻 검색"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "11px 12px 11px 36px",
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: C.card,
                color: C.text,
                fontSize: 15,
                outline: "none",
              }}
            />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "12px 20px",
            paddingBottom: "calc(108px + env(safe-area-inset-bottom, 0px))",
          }}
        >
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {(
            [
              { id: "default" as const, label: "기본순" },
              { id: "az" as const, label: "A-Z" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSortMode(id)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                border: `1px solid ${sortMode === id ? C.gold : C.border}`,
                background: sortMode === id ? C.elevated : C.card,
                color: sortMode === id ? C.gold : C.muted,
                fontWeight: sortMode === id ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowHidden(true)}
            style={{
              display: "block",
              width: "100%",
              marginBottom: 12,
              padding: "9px 12px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.card,
              color: C.gold,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {`숨김 ${hiddenCount}개 보기`}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowHidden(true)}
            style={{
              display: "block",
              width: "100%",
              marginBottom: 8,
              padding: "4px 0",
              border: "none",
              background: "transparent",
              color: C.muted,
              fontSize: 12,
              fontWeight: 400,
              opacity: 0.45,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            숨긴 단어 보기
          </button>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, color: C.muted }}>
            {query
              ? `검색 결과 ${displayedWords.length}개`
              : `${selected.size}개 선택 · ${displayedWords.length}개 표시`}
          </span>
          <button
            type="button"
            onClick={toggleAllVisible}
            style={{
              background: "none",
              border: `1px solid ${C.border}`,
              color: C.muted,
              padding: "5px 10px",
              borderRadius: 8,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {allVisibleSelected ? "전체 해제" : "전체 선택"}
          </button>
        </div>

        <div
          key={query || `sort-${sortMode}`}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {displayedWords.length > 0 ? (
            displayedWords.map((w) => {
              const on = selected.has(w.id);
              return (
                <SwipeableWordRow
                  key={w.id}
                  onHide={() => handleHideWord(w.id, w.word)}
                  onClick={() => toggleWord(w.id)}
                  rowStyle={{
                    padding: "13px 14px",
                    borderRadius: 12,
                    border: `1px solid ${on ? C.gold : C.border}`,
                    background: on ? C.elevated : C.card,
                  }}
                >
                  <div style={checkboxStyle(on)}>
                    {on && <Check size={15} color="#1A1408" strokeWidth={3} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontSize: 16, fontWeight: 700 }}>
                        {w.word}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: posColor(w.pos),
                          border: `1px solid ${posColor(w.pos)}`,
                          padding: "1px 6px",
                          borderRadius: 5,
                        }}
                      >
                        {w.pos}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: C.muted,
                        marginTop: 3,
                      }}
                    >
                      {w.mean}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.muted,
                        marginTop: 2,
                        opacity: 0.75,
                      }}
                    >
                      {w.concept} · {w.conceptKo}
                    </div>
                  </div>
                </SwipeableWordRow>
              );
            })
          ) : (
            <div
              style={{
                textAlign: "center",
                color: C.muted,
                padding: "32px 0",
                fontSize: 14,
              }}
            >
              {query ? "검색 결과가 없어요" : "표시할 단어가 없어요"}
            </div>
          )}
        </div>

        {minNote && (
          <div style={{ marginTop: 12, fontSize: 12, color: C.gold }}>
            {minNote}
          </div>
        )}
        </div>
      </div>
      )}

      {undo && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
            zIndex: 25,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 12,
              maxWidth: 440,
              width: "calc(100% - 40px)",
              padding: "11px 14px",
              borderRadius: 10,
              background: C.elevated,
              border: `1px solid ${C.border}`,
              boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
            }}
          >
            <span style={{ flex: 1, fontSize: 14, color: C.text }}>
              「{undo.label}」 숨김
            </span>
            <button
              type="button"
              onClick={handleUndo}
              style={{
                background: "none",
                border: "none",
                color: C.gold,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                padding: 0,
              }}
            >
              실행 취소
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          background: C.bg,
          borderTop: `1px solid ${C.border}`,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            boxSizing: "border-box",
            padding: "12px 20px calc(12px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: 13,
              color: C.muted,
              marginBottom: 8,
            }}
          >
            선택한 단어 {count}개
          </div>
          <button
            onClick={onStart}
            disabled={!count}
            style={{
              width: "100%",
              padding: "15px 0",
              borderRadius: 12,
              border: "none",
              cursor: count ? "pointer" : "not-allowed",
              background: count ? C.gold : C.elevated,
              color: count ? "#1A1408" : C.muted,
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function StudyView({
  items,
  onBack,
  backLabel = "목록",
}: {
  items: StudyItem[];
  onBack: () => void;
  backLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cycleComplete, setCycleComplete] = useState(false);
  const [finishedLastItem, setFinishedLastItem] = useState(false);
  const [phase, setPhase] = useState<StudyPhase>("word");
  const [showKo, setShowKo] = useState(true);
  const playingRef = useRef(false);
  const indexRef = useRef(0);
  const itemsRef = useRef(items);
  const cur = items[index];
  const skipExample = skipsExamplePhase();

  indexRef.current = index;
  itemsRef.current = items;

  useEffect(() => {
    return () => {
      playingRef.current = false;
      stopStudyPlayback();
      clearMediaSessionHandlers();
    };
  }, []);

  useEffect(() => {
    if (!cur) return;
    const phaseLabel = phase === "word" ? "단어" : "예문";
    updateStudyMediaMetadata({
      title: cur.word,
      artist: showKo ? cur.mean : "출퇴근 영어",
      album: `${cur.concept} · ${index + 1}/${items.length} · ${phaseLabel}`,
    });
    updateMediaPositionState({
      duration: items.length,
      position: index,
    });
  }, [cur, index, phase, showKo, items.length]);

  useEffect(() => {
    setMediaPlaybackState(isPlaying ? "playing" : "paused");
  }, [isPlaying]);

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden && playingRef.current) {
        reclaimAudioSession();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const stopSession = () => {
    playingRef.current = false;
    cancelPlayback();
    stopAudioKeepAlive();
    setIsPlaying(false);
    setMediaPlaybackState("paused");
  };

  const handleBack = () => {
    stopSession();
    clearMediaSessionHandlers();
    onBack();
  };

  const playItem = async (w: StudyItem, i: number): Promise<boolean> => {
    const settings = loadPlaybackSettings();
    const { playWord, playMean, playExample } = settings;
    const playExPhase = playExample && !skipExample;
    const playWordPhase = playWord || playMean;
    const next = items[i + 1];
    if (next) preloadWordAudio(next.word, next.pos);

    if (!playingRef.current) return false;
    setIndex(i);
    setPhase(playWordPhase ? "word" : "example");
    preloadWordAudio(w.word, w.pos);

    if (playWordPhase) {
      for (let r = 0; r < settings.wordRepeatCount; r++) {
        if (!playingRef.current) return false;

        if (playWord) {
          preloadWordSequence(w.word, "word", w.pos);
          await speakEnglishWord(w.word, w.pos);
          if (!playingRef.current) return false;
          await wait(settings.gapSec * 1000);
        }

        if (playMean) {
          preloadWordSequence(w.word, "mean", w.pos);
          await speakKoreanMean(w.word, w.mean, w.pos);
        }

        if (r < settings.wordRepeatCount - 1) {
          if (!playingRef.current) return false;
          await wait(settings.setGapSec * 1000);
        }
      }
    }

    if (playExPhase) {
      if (!playingRef.current) return false;
      setPhase("example");

      for (let r = 0; r < settings.exampleRepeatCount; r++) {
        if (!playingRef.current) return false;
        preloadWordSequence(w.word, "ex", w.pos);
        await speakEnglishExample(w.word, w.ex, w.pos);
        if (!playingRef.current) return false;
        await wait(settings.gapSec * 1000);
        preloadWordSequence(w.word, "exko", w.pos);
        await speakKoreanExKo(w.word, w.exKo, w.pos);
        if (r < settings.exampleRepeatCount - 1) {
          if (!playingRef.current) return false;
          await wait(settings.setGapSec * 1000);
        }
      }
    }

    if (!playingRef.current) return false;
    if (i < items.length - 1 && settings.itemGapEnabled) {
      await wait(settings.itemGapSec * 1000);
    }
    if (i === items.length - 1) {
      setFinishedLastItem(true);
    }
    return true;
  };

  const finishRun = () => {
    playingRef.current = false;
    stopAudioKeepAlive();
    setIsPlaying(false);
    setPhase("word");
    setIndex(items.length - 1);
    setCycleComplete(true);
    setMediaPlaybackState("paused");
  };

  const runFrom = async (start: number) => {
    playingRef.current = true;
    setIsPlaying(true);
    setCycleComplete(false);
    setFinishedLastItem(false);
    startAudioKeepAlive();
    reclaimAudioSession();
    setMediaPlaybackState("playing");

    let pos = start;
    while (playingRef.current) {
      for (let i = pos; i < items.length; i++) {
        const completed = await playItem(items[i], i);
        if (!playingRef.current) {
          if (completed && i === items.length - 1) finishRun();
          return;
        }
      }

      const { loopMode } = loadPlaybackSettings();
      if (loopMode === "repeat") {
        pos = 0;
        continue;
      }
      break;
    }

    if (playingRef.current) finishRun();
  };

  const pause = () => {
    stopSession();
  };
  const play = () => runFrom(index);

  const jumpToWord = (ni: number, resumePlayback: boolean) => {
    cancelPlayback();
    playingRef.current = false;
    setIsPlaying(false);
    setCycleComplete(false);
    setFinishedLastItem(false);
    setIndex(ni);
    setPhase("word");
    if (resumePlayback) {
      void Promise.resolve().then(() => runFrom(ni));
    } else {
      stopAudioKeepAlive();
      setMediaPlaybackState("paused");
      speakEnglishWordNow(itemsRef.current[ni].word, itemsRef.current[ni].pos);
    }
  };

  const sessionApiRef = useRef({
    play: () => {},
    pause: () => {},
    next: () => {},
    prev: () => {},
  });

  sessionApiRef.current = {
    play: () => {
      if (!playingRef.current) runFrom(indexRef.current);
    },
    pause: () => {
      if (playingRef.current) stopSession();
    },
    next: () => {
      const list = itemsRef.current;
      const { loopMode } = loadPlaybackSettings();
      let ni = indexRef.current + 1;
      if (ni >= list.length) {
        if (loopMode === "repeat") ni = 0;
        else return;
      }
      jumpToWord(ni, playingRef.current);
    },
    prev: () => {
      const ni = Math.max(0, indexRef.current - 1);
      jumpToWord(ni, playingRef.current);
    },
  };

  useEffect(() => {
    registerMediaSessionHandlers({
      onPlay: () => sessionApiRef.current.play(),
      onPause: () => sessionApiRef.current.pause(),
      onNext: () => sessionApiRef.current.next(),
      onPrev: () => sessionApiRef.current.prev(),
    });
    return () => clearMediaSessionHandlers();
  }, []);

  const replayFromStart = () => {
    setFinishedLastItem(false);
    setCycleComplete(false);
    setIndex(0);
    runFrom(0);
  };
  const go = (i: number) => {
    pause();
    setCycleComplete(false);
    setFinishedLastItem(false);
    const ni = (i + items.length) % items.length;
    setIndex(ni);
    setPhase("word");
    speakEnglishWordNow(items[ni].word, items[ni].pos);
  };

  const progress = ((index + 1) / items.length) * 100;
  const playback = loadPlaybackSettings();

  return (
    <div
      style={{
        padding: "14px 20px",
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <button
          onClick={handleBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            color: C.muted,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          <ChevronLeft size={18} /> {backLabel}
        </button>
        <span
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 13,
            color: C.muted,
          }}
        >
          {index + 1} / {items.length}
        </span>
        <button
          onClick={() => setShowKo((s) => !s)}
          style={{
            background: "none",
            border: `1px solid ${C.border}`,
            color: showKo ? C.gold : C.muted,
            padding: "4px 9px",
            borderRadius: 8,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          뜻 {showKo ? "ON" : "OFF"}
        </button>
      </div>

      {/* 진행 바 */}
      <div
        style={{
          height: 4,
          background: C.elevated,
          borderRadius: 4,
          overflow: "hidden",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: C.gold,
            transition: "width 0.3s",
          }}
        />
      </div>

      {/* 단어 카드 (시그니처) */}
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          padding: "28px 22px",
          minHeight: 280,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: posColor(cur.pos),
              border: `1px solid ${posColor(cur.pos)}`,
              padding: "2px 8px",
              borderRadius: 6,
            }}
          >
            {cur.pos}
          </span>
          <span style={{ fontSize: 12, color: C.muted }}>
            {cur.concept} · {cur.conceptKo}
          </span>
        </div>

        <button
          onClick={() => speakEnglishWordNow(cur.word, cur.pos)}
          style={{
            background: "none",
            border: "none",
            color: C.text,
            cursor: "pointer",
            textAlign: "left",
            padding: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: skipExample ? 28 : 40,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: phase === "word" && isPlaying ? C.gold : C.text,
                lineHeight: 1.25,
              }}
            >
              {cur.word}
            </span>
            <Volume2 size={22} color={C.muted} />
          </div>
        </button>
        {showKo && (
          <div
            style={{
              fontSize: skipExample ? 26 : 17,
              fontWeight: skipExample ? 600 : 400,
              color: skipExample ? C.text : C.muted,
              marginTop: skipExample ? 18 : 6,
              lineHeight: 1.45,
            }}
          >
            {cur.mean}
          </div>
        )}

        {!skipExample && (
          <>
        <div
          style={{ height: 1, background: C.border, margin: "22px 0 18px" }}
        />

        <button
          onClick={() => speakEnglishExampleNow(cur.word, cur.ex, cur.pos)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            padding: 0,
          }}
        >
          <div
            style={{
              fontSize: 18,
              lineHeight: 1.5,
              color: phase === "example" && isPlaying ? C.gold : C.text,
            }}
          >
            {cur.ex}
          </div>
        </button>
        {showKo && (
          <div
            style={{
              fontSize: 14,
              color: C.muted,
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            {cur.exKo}
          </div>
        )}
          </>
        )}
      </div>

      {/* 컨트롤 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          marginTop: 24,
        }}
      >
        <button onClick={() => go(index - 1)} style={ctrlBtn}>
          <SkipBack size={26} color={C.text} />
        </button>
        <button
          onClick={() => (isPlaying ? pause() : play())}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            border: "none",
            cursor: "pointer",
            background: C.gold,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isPlaying ? (
            <Pause size={28} color="#1A1408" fill="#1A1408" />
          ) : (
            <Play
              size={28}
              color="#1A1408"
              fill="#1A1408"
              style={{ marginLeft: 3 }}
            />
          )}
        </button>
        <button onClick={() => go(index + 1)} style={ctrlBtn}>
          <SkipForward size={26} color={C.text} />
        </button>
      </div>
      <div
        style={{
          textAlign: "center",
          marginTop: 14,
          fontSize: 12,
          color: C.muted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
        }}
      >
        <Repeat size={13} />{" "}
        {skipExample
          ? `(영어→텀→뜻)×${playback.wordRepeatCount}`
          : `(단어→텀→뜻)×${playback.wordRepeatCount} → (예문→텀→예문뜻)×${playback.exampleRepeatCount}`}
      </div>

      {index === items.length - 1 &&
        !isPlaying &&
        (cycleComplete || finishedLastItem) && (
        <button
          onClick={replayFromStart}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            marginTop: 16,
            padding: "13px 0",
            borderRadius: 12,
            border: `1px solid ${C.goldDim}`,
            cursor: "pointer",
            background: C.elevated,
            color: C.gold,
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          <RotateCcw size={18} /> 처음부터 다시 듣기
        </button>
      )}
    </div>
  );
}
const ctrlBtn: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 24,
  border: "none",
  cursor: "pointer",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function QuizView({
  items,
  onBack,
}: {
  items: StudyItem[];
  onBack: () => void;
}) {
  const pool = useMemo(() => shuffle(items), [items]);
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) saveQuizScore(score, pool.length);
  }, [done, score, pool.length]);

  useEffect(() => {
    return () => {
      cancelPlayback();
    };
  }, []);

  const handleBack = () => {
    cancelPlayback();
    onBack();
  };

  const q = pool[qi];
  const options = useMemo(() => {
    if (!q) return [];
    const wrong = shuffle(items.filter((x) => x.word !== q.word))
      .slice(0, 3)
      .map((x) => x.mean);
    return shuffle([q.mean, ...wrong]);
  }, [q, items]);

  if (done) {
    const pct = Math.round((score / pool.length) * 100);
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ fontSize: 14, color: C.muted }}>오늘 점수</div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: C.gold,
            fontFamily: "ui-monospace, monospace",
            margin: "8px 0",
          }}
        >
          {score}
          <span style={{ fontSize: 24, color: C.muted }}> / {pool.length}</span>
        </div>
        <div style={{ fontSize: 15, color: pct >= 70 ? C.green : C.red }}>
          {pct}% · {pct >= 70 ? "오늘 reps 채웠다" : "내일 같은 그룹 한 번 더"}
        </div>
        <button
          onClick={() => {
            setQi(0);
            setScore(0);
            setPicked(null);
            setDone(false);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: 28,
            padding: "13px 24px",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            background: C.gold,
            color: "#1A1408",
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          <RotateCcw size={18} /> 다시
        </button>
        <div>
          <button
            onClick={handleBack}
            style={{
              marginTop: 14,
              background: "none",
              border: "none",
              color: C.muted,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            그룹 다시 고르기
          </button>
        </div>
      </div>
    );
  }

  const answer = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    if (opt === q.mean) setScore((s) => s + 1);
    speakEnglishWordNow(q.word, q.pos);
    setTimeout(() => {
      if (qi + 1 >= pool.length) setDone(true);
      else {
        setQi((i) => i + 1);
        setPicked(null);
      }
    }, 1100);
  };

  return (
    <div
      style={{
        padding: "14px 20px",
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <button
          onClick={handleBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            color: C.muted,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          <ChevronLeft size={18} /> 목록
        </button>
        <span
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 13,
            color: C.muted,
          }}
        >
          {qi + 1} / {pool.length}
        </span>
        <span
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 13,
            color: C.gold,
          }}
        >
          {score}점
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: C.elevated,
          borderRadius: 4,
          overflow: "hidden",
          marginBottom: 26,
        }}
      >
        <div
          style={{
            width: `${(qi / pool.length) * 100}%`,
            height: "100%",
            background: C.gold,
            transition: "width 0.3s",
          }}
        />
      </div>

      <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>
        이 단어의 뜻은?
      </div>
      <div
        style={{
          fontSize: 38,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          marginBottom: 26,
        }}
      >
        {q.word}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {options.map((opt) => {
          let bg = C.card,
            bd = C.border,
            fg = C.text;
          if (picked) {
            if (opt === q.mean) {
              bg = C.elevated;
              bd = C.green;
              fg = C.green;
            } else if (opt === picked) {
              bg = C.elevated;
              bd = C.red;
              fg = C.red;
            }
          }
          return (
            <button
              key={opt}
              onClick={() => answer(opt)}
              disabled={!!picked}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textAlign: "left",
                padding: "15px 16px",
                borderRadius: 12,
                cursor: picked ? "default" : "pointer",
                background: bg,
                border: `1.5px solid ${bd}`,
                color: fg,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {opt}
              {picked && opt === q.mean && (
                <Check size={20} color={C.green} strokeWidth={3} />
              )}
              {picked && opt === picked && opt !== q.mean && (
                <X size={20} color={C.red} strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
