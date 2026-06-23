"use client";

import { useState, useRef, useMemo, useEffect, type CSSProperties } from "react";
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  load,
  saveGapSec,
  saveQuizScore,
} from "@/lib/storage";
import {
  cancelPlayback,
  preloadEnglishAudio,
  speakEnglishExample,
  speakEnglishExampleNow,
  speakEnglishWord,
  speakEnglishWordNow,
  speakKoreanOnce,
} from "@/lib/audio";
import { GROUPS } from "@/data/groups.mjs";

type Pos = "동사" | "명사" | "형용사" | "부사";
type Tab = "study" | "quiz";
type StudyPhase = "word" | "example";

type Word = {
  pos: Pos;
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

const POS_COLOR: Record<Pos, string> = {
  동사: "#E8B33D",
  명사: "#7CA8E0",
  형용사: "#5BBF8E",
  부사: "#C98BD0",
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
  const [tab, setTab] = useState<Tab>("study");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [started, setStarted] = useState(false);

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
            padding: "20px 20px 14px",
            borderBottom: `1px solid ${C.border}`,
            position: "sticky",
            top: 0,
            background: C.bg,
            zIndex: 10,
          }}
        >
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
          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            {(
              [
                { id: "study" as Tab, label: "단어", Icon: ListChecks },
                { id: "quiz" as Tab, label: "퀴즈", Icon: Brain },
              ] satisfies { id: Tab; label: string; Icon: LucideIcon }[]
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  setStarted(false);
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

        {tab === "study" && !started && (
          <GroupPicker
            {...{
              selected,
              toggleGroup,
              allSelected,
              toggleAll,
              count: items.length,
            }}
            onStart={() => items.length && setStarted(true)}
            ctaLabel="학습 시작"
          />
        )}
        {tab === "study" && started && (
          <StudyView
            items={items}
            onBack={() => {
              cancelPlayback();
              setStarted(false);
            }}
          />
        )}
        {tab === "quiz" && !started && (
          <GroupPicker
            {...{
              selected,
              toggleGroup,
              allSelected,
              toggleAll,
              count: items.length,
            }}
            onStart={() => items.length >= 1 && setStarted(true)}
            ctaLabel="퀴즈 시작"
            minNote={
              items.length < 4 ? "4개 이상 단어를 선택하면 더 좋아" : null
            }
          />
        )}
        {tab === "quiz" && started && (
          <QuizView items={items} onBack={() => setStarted(false)} />
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
          {showGroups
            ? GROUPS.map((g) => {
                const on = selected.has(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    style={rowButtonStyle(on)}
                  >
                    <div style={checkboxStyle(on)}>
                      {on && (
                        <Check size={15} color="#1A1408" strokeWidth={3} />
                      )}
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
            : displayedWords.length > 0
              ? displayedWords.map((w) => {
                  const on = selected.has(w.groupId);
                  return (
                    <button
                      key={w.order}
                      onClick={() => toggleGroup(w.groupId)}
                      style={rowButtonStyle(on)}
                    >
                      <div style={checkboxStyle(on)}>
                        {on && (
                          <Check size={15} color="#1A1408" strokeWidth={3} />
                        )}
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
                              color: POS_COLOR[w.pos as Pos] || C.muted,
                              border: `1px solid ${POS_COLOR[w.pos as Pos] || C.muted}`,
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
              : (
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
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          boxSizing: "border-box",
          padding: "12px 20px calc(12px + env(safe-area-inset-bottom, 0px))",
          background: C.bg,
          borderTop: `1px solid ${C.border}`,
          zIndex: 20,
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

  const runFrom = async (start: number) => {
    playingRef.current = true;
    setIsPlaying(true);
    for (let i = start; i < items.length; i++) {
      const w = items[i];
      const next = items[i + 1];
      if (next) preloadEnglishAudio(next.word);
      if (!playingRef.current) return;
      setIndex(i);
      setPhase("word");
      preloadEnglishAudio(w.word);
      await speakEnglishWord(w.word);
      if (!playingRef.current) return;
      await wait(gapRef.current * 1000); // 단어 따라하기 텀
      if (!playingRef.current) return;
      await speakKoreanOnce(w.mean);
      if (!playingRef.current) return;
      await wait(600);
      if (!playingRef.current) return;
      setPhase("example");
      await speakEnglishExample(w.word, w.ex);
      if (!playingRef.current) return;
      await wait(gapRef.current * 1000); // 예문 따라하기 텀
      if (!playingRef.current) return;
      await speakKoreanOnce(w.exKo);
      if (!playingRef.current) return;
      await wait(800);
    }
    playingRef.current = false;
    setIsPlaying(false);
    setPhase("word");
  };
  const pause = () => {
    playingRef.current = false;
    cancelPlayback();
    setIsPlaying(false);
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
              color: POS_COLOR[cur.pos] || C.muted,
              border: `1px solid ${POS_COLOR[cur.pos] || C.muted}`,
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
            onClick={onBack}
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
