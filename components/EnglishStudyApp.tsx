"use client";

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
  Dices,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { load, saveGapSec, saveQuizScore, saveSelectedLevel } from "@/lib/storage";
import type { LevelId } from "@/lib/storage";
import {
  cancelPlayback,
  preloadWordAudio,
  preloadWordSequence,
  speakEnglishExample,
  speakEnglishExampleNow,
  speakEnglishWord,
  speakEnglishWordNow,
  speakKoreanExKo,
  speakKoreanMean,
} from "@/lib/audio";
import { GROUPS } from "@/data/groups.mjs";
import PlaylistSection from "@/components/PlaylistSection";
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
};

function posColor(pos: string): string {
  return POS_COLOR[pos] ?? C.muted;
}

const LEVELS: {
  id: LevelId;
  label: string;
  desc: string;
  active: boolean;
  theme?: "arena";
  badge?: string;
  inactiveToast?: string;
}[] = [
  {
    id: "TEST",
    label: "TEST",
    desc: `전체 단어 (${GROUPS.reduce((n, g) => n + g.words.length, 0)}개)`,
    active: true,
  },
  { id: "basic", label: "Basic", desc: "기초 단어", active: false },
  { id: "intermediate", label: "중급", desc: "중급 단어", active: false },
  { id: "advanced", label: "고급", desc: "고급 단어", active: false },
  {
    id: "arena",
    label: "투기장",
    desc: "단어 맞히고 판돈 걸기 — 올인 각오",
    active: false,
    theme: "arena",
    badge: "오픈 예정",
    inactiveToast: "아직 판이 안 열렸어요. 조금만 기다려 주세요.",
  },
];

const LEVEL_LABEL: Record<LevelId, string> = {
  TEST: "TEST",
  basic: "Basic",
  intermediate: "중급",
  advanced: "고급",
  arena: "투기장",
};

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
  const [tab, setTab] = useState<Tab>("study");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [started, setStarted] = useState(false);
  const [playlistSession, setPlaylistSession] = useState<{
    mode: "study" | "quiz";
    items: StudyItem[];
  } | null>(null);
  const [playlistReset, setPlaylistReset] = useState(0);

  useEffect(() => {
    setLevelReady(true);
  }, []);

  const handleSelectLevel = (id: LevelId, active: boolean) => {
    if (!active) {
      const meta = LEVELS.find((l) => l.id === id);
      setLevelToast(meta?.inactiveToast ?? "준비 중입니다");
      setTimeout(() => setLevelToast(null), 2500);
      return;
    }
    cancelPlayback();
    setLevel(id);
    saveSelectedLevel(id);
  };

  const handleChangeLevel = () => {
    cancelPlayback();
    setTab("study");
    setStarted(false);
    setSelected(new Set());
    setLevel(null);
    saveSelectedLevel(null);
    setPlaylistSession(null);
    setPlaylistReset((n) => n + 1);
  };

  const handleGoHome = () => {
    cancelPlayback();
    setTab("study");
    setStarted(false);
    setPlaylistSession(null);
    setPlaylistReset((n) => n + 1);
  };

  const toggleGroup = (id: number) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const allSelected = selected.size === GROUPS.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(GROUPS.map((g) => g.id)));

  const items = useMemo(
    () =>
      GROUPS.filter((g) => selected.has(g.id)).flatMap((g) =>
        g.words.map((w) => ({ ...w, concept: g.concept, conceptKo: g.ko })),
      ),
    [selected],
  );

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
      <LevelSelectScreen
        toast={levelToast}
        onSelect={handleSelectLevel}
      />
    );
  }

  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 0 40px" }}>
        {/* 헤더 */}
        <header
          style={{
            padding: "14px 20px",
            paddingTop: "max(20px, calc(12px + env(safe-area-inset-top, 0px)))",
            borderBottom: `1px solid ${C.border}`,
            position: "sticky",
            top: 0,
            background: C.bg,
            zIndex: 10,
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
            <img
              src="/logos/logo_commute.png"
              alt="오늘의 단어"
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
                오늘의 단어
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: C.muted,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                daily reps
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
            </span>
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
              레벨 변경
            </button>
          </div>
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
        </header>

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
            {...{
              selected,
              toggleGroup,
              allSelected,
              toggleAll,
              count: items.length,
            }}
            onStart={() => {
              cancelPlayback();
              if (items.length) setStarted(true);
            }}
            ctaLabel="학습 시작"
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
            {...{
              selected,
              toggleGroup,
              allSelected,
              toggleAll,
              count: items.length,
            }}
            onStart={() => {
              cancelPlayback();
              if (items.length >= 1) setStarted(true);
            }}
            ctaLabel="퀴즈 시작"
            minNote={
              items.length < 4 ? "4개 이상 단어를 선택하면 더 좋아" : null
            }
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
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
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
          <img
            src="/logos/logo_commute.png"
            alt="오늘의 단어"
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
            레벨 선택
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 14,
              color: C.muted,
              textAlign: "center",
            }}
          >
            학습할 레벨을 골라 시작하세요
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {LEVELS.map(({ id, label, desc, active, theme, badge }) => {
            const isArena = theme === "arena";
            return (
            <button
              key={id}
              onClick={() => onSelect(id, active)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                textAlign: "left",
                padding: "16px 16px",
                borderRadius: 12,
                cursor: active ? "pointer" : "not-allowed",
                background: isArena
                  ? "linear-gradient(135deg, #1f1418 0%, #2a1a12 45%, #1B1E2A 100%)"
                  : active
                    ? C.elevated
                    : C.card,
                border: `1px solid ${
                  isArena ? "#9e3d3d" : active ? C.gold : C.border
                }`,
                color: active ? C.text : isArena ? C.text : C.muted,
                opacity: active ? 1 : isArena ? 0.82 : 0.55,
                width: "100%",
                boxShadow: isArena ? "0 0 20px rgba(224, 122, 95, 0.12)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {isArena && (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(224, 122, 95, 0.15)",
                      border: "1px solid rgba(224, 122, 95, 0.35)",
                    }}
                  >
                    <Dices size={22} color={C.red} />
                  </div>
                )}
                <div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: isArena ? C.gold : undefined,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: isArena ? "#c9a88a" : C.muted,
                      marginTop: 4,
                    }}
                  >
                    {desc}
                  </div>
                </div>
              </div>
              {!active && (
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    color: isArena ? C.gold : C.muted,
                    border: `1px solid ${isArena ? C.goldDim : C.border}`,
                    background: isArena ? "rgba(232, 179, 61, 0.1)" : "transparent",
                    padding: "3px 8px",
                    borderRadius: 6,
                  }}
                >
                  {badge ?? "준비 중"}
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
    </div>
  );
}

function GroupPicker({
  selected,
  toggleGroup,
  allSelected,
  toggleAll,
  onStart,
  count,
  ctaLabel,
  minNote,
}: {
  selected: Set<number>;
  toggleGroup: (id: number) => void;
  allSelected: boolean;
  toggleAll: () => void;
  onStart: () => void;
  count: number;
  ctaLabel: string;
  minNote?: string | null;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"default" | "az">("default");

  type PickerWord = {
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

  const allPickerWords = useMemo<PickerWord[]>(
    () =>
      GROUPS.flatMap((g, gi) =>
        g.words.map((w, wi) => ({
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
      ),
    [],
  );

  const query = searchQuery.trim().toLowerCase();
  const showGroups = !query && sortMode === "default";

  const displayedWords = useMemo(() => {
    const matchesQuery = (w: PickerWord) =>
      w.word.toLowerCase().includes(query) ||
      w.mean.toLowerCase().includes(query);

    const base = query
      ? allPickerWords.filter(matchesQuery)
      : [...allPickerWords];

    if (sortMode === "az") {
      return base.sort((a, b) =>
        a.word.localeCompare(b.word, "en", { sensitivity: "base" }),
      );
    }
    return base;
  }, [allPickerWords, query, sortMode]);

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

  const rowButtonStyle = (on: boolean): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    textAlign: "left",
    padding: "13px 14px",
    borderRadius: 12,
    cursor: "pointer",
    background: on ? C.elevated : C.card,
    border: `1px solid ${on ? C.gold : C.border}`,
    width: "100%",
    color: C.text,
  });

  return (
    <>
      <div
        style={{
          padding: "16px 20px",
          paddingBottom: "calc(108px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div style={{ position: "relative", marginBottom: 12 }}>
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

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, color: C.muted }}>
            {showGroups
              ? "그룹을 골라 플레이리스트를 만들어"
              : query
                ? `검색 결과 ${displayedWords.length}개`
                : `전체 ${displayedWords.length}개 단어`}
          </span>
          <button
            onClick={toggleAll}
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
            {allSelected ? "전체 해제" : "전체 선택"}
          </button>
        </div>

        <div
          key={query || `sort-${sortMode}`}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {showGroups ? (
            GROUPS.map((g) => {
              const on = selected.has(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggleGroup(g.id)}
                  style={rowButtonStyle(on)}
                >
                  <div style={checkboxStyle(on)}>
                    {on && <Check size={15} color="#1A1408" strokeWidth={3} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {g.concept}{" "}
                      <span
                        style={{
                          color: C.muted,
                          fontWeight: 500,
                          fontSize: 14,
                        }}
                      >
                        · {g.ko}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 13,
                      color: C.muted,
                    }}
                  >
                    {g.words.length}
                  </span>
                </button>
              );
            })
          ) : displayedWords.length > 0 ? (
            displayedWords.map((w) => {
              const on = selected.has(w.groupId);
              return (
                <button
                  key={w.order}
                  onClick={() => toggleGroup(w.groupId)}
                  style={rowButtonStyle(on)}
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
                </button>
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
              검색 결과가 없어요
            </div>
          )}
        </div>

        {minNote && (
          <div style={{ marginTop: 12, fontSize: 12, color: C.gold }}>
            {minNote}
          </div>
        )}
      </div>

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
    </>
  );
}

function StudyView({
  items,
  onBack,
}: {
  items: StudyItem[];
  onBack: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<StudyPhase>("word");
  const [showKo, setShowKo] = useState(true);
  const [gapSec, setGapSec] = useState(2.5);
  const [gapReady, setGapReady] = useState(false);
  const gapRef = useRef(2.5);
  gapRef.current = gapSec;
  const playingRef = useRef(false);
  const cur = items[index];

  useEffect(() => {
    setGapSec(load().gapSec);
    setGapReady(true);
  }, []);

  useEffect(() => {
    if (!gapReady) return;
    saveGapSec(gapSec);
  }, [gapSec, gapReady]);

  useEffect(() => {
    return () => {
      playingRef.current = false;
      cancelPlayback();
    };
  }, []);

  const stopSession = () => {
    playingRef.current = false;
    cancelPlayback();
    setIsPlaying(false);
  };

  const handleBack = () => {
    stopSession();
    onBack();
  };

  const runFrom = async (start: number) => {
    playingRef.current = true;
    setIsPlaying(true);
    for (let i = start; i < items.length; i++) {
      const w = items[i];
      const next = items[i + 1];
      if (next) preloadWordAudio(next.word);
      if (!playingRef.current) return;
      setIndex(i);
      setPhase("word");
      preloadWordAudio(w.word);
      preloadWordSequence(w.word, "word");
      await speakEnglishWord(w.word);
      if (!playingRef.current) return;
      await wait(gapRef.current * 1000); // 단어 따라하기 텀
      if (!playingRef.current) return;
      preloadWordSequence(w.word, "mean");
      await speakKoreanMean(w.word, w.mean);
      if (!playingRef.current) return;
      await wait(600);
      if (!playingRef.current) return;
      setPhase("example");
      preloadWordSequence(w.word, "ex");
      await speakEnglishExample(w.word, w.ex);
      if (!playingRef.current) return;
      await wait(gapRef.current * 1000); // 예문 따라하기 텀
      if (!playingRef.current) return;
      preloadWordSequence(w.word, "exko");
      await speakKoreanExKo(w.word, w.exKo);
      if (!playingRef.current) return;
      await wait(800);
    }
    playingRef.current = false;
    setIsPlaying(false);
    setPhase("word");
  };
  const pause = () => {
    stopSession();
  };
  const play = () => runFrom(index);
  const go = (i: number) => {
    pause();
    const ni = (i + items.length) % items.length;
    setIndex(ni);
    setPhase("word");
    speakEnglishWordNow(items[ni].word);
  };

  const progress = ((index + 1) / items.length) * 100;

  return (
    <div style={{ padding: "14px 20px" }}>
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
          <ChevronLeft size={18} /> 목록
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
          onClick={() => speakEnglishWordNow(cur.word)}
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
                fontSize: 40,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: phase === "word" && isPlaying ? C.gold : C.text,
              }}
            >
              {cur.word}
            </span>
            <Volume2 size={22} color={C.muted} />
          </div>
        </button>
        {showKo && (
          <div style={{ fontSize: 17, color: C.muted, marginTop: 6 }}>
            {cur.mean}
          </div>
        )}

        <div
          style={{ height: 1, background: C.border, margin: "22px 0 18px" }}
        />

        <button
          onClick={() => speakEnglishExampleNow(cur.word, cur.ex)}
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
        <Repeat size={13} /> 단어 → 뜻 → 따라하기 → 예문 → 예문뜻 → 따라하기
      </div>

      {/* 따라하기 텀 조절 */}
      <div
        style={{
          marginTop: 20,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 13, color: C.muted }}>따라하기 텀</span>
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 14,
              color: C.gold,
            }}
          >
            {gapSec.toFixed(1)}초
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="6"
          step="0.5"
          value={gapSec}
          onChange={(e) => setGapSec(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: C.gold, cursor: "pointer" }}
        />
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
          운전 중엔 길게, 책상에선 짧게
        </div>
      </div>
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
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
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
    speakEnglishWordNow(q.word);
    setTimeout(() => {
      if (qi + 1 >= pool.length) setDone(true);
      else {
        setQi((i) => i + 1);
        setPicked(null);
      }
    }, 1100);
  };

  return (
    <div style={{ padding: "14px 20px" }}>
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
