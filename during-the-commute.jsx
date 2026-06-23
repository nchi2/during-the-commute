import React, { useState, useRef, useMemo } from "react";
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
} from "lucide-react";

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

// 정현 엑셀 워크북 데이터 (첨부 이미지 그대로). found 그룹 세번째(foundation)는 이미지가 잘려서 합리적으로 보충함 — 틀리면 알려줘.
const GROUPS = [
  {
    id: 1,
    concept: "succeed",
    ko: "성공",
    words: [
      {
        pos: "동사",
        word: "succeed",
        mean: "성공하다",
        ex: "If the OTC platform succeeds, we can expand the business.",
        exKo: "OTC 플랫폼이 성공하면 사업을 확장할 수 있다.",
      },
      {
        pos: "명사",
        word: "success",
        mean: "성공",
        ex: "The OTC platform would be a success.",
        exKo: "OTC 플랫폼은 성공작이 될 것이다.",
      },
      {
        pos: "형용사",
        word: "successful",
        mean: "성공적인",
        ex: "The project will be successful if users actively trade.",
        exKo: "사용자들이 활발히 거래하면 프로젝트는 성공적일 것이다.",
      },
      {
        pos: "부사",
        word: "successfully",
        mean: "성공적으로",
        ex: "We successfully completed the airdrop.",
        exKo: "우리는 에어드랍을 성공적으로 완료했다.",
      },
    ],
  },
  {
    id: 2,
    concept: "produce",
    ko: "생산",
    words: [
      {
        pos: "동사",
        word: "produce",
        mean: "생산하다, 만들어내다",
        ex: "Our team produces useful crypto tools.",
        exKo: "우리 팀은 유용한 크립토 도구를 만들어낸다.",
      },
      {
        pos: "명사",
        word: "product",
        mean: "제품",
        ex: "I prefer practical products.",
        exKo: "나는 실용적인 제품을 선호한다.",
      },
      {
        pos: "명사",
        word: "production",
        mean: "생산",
        ex: "Content production takes time.",
        exKo: "콘텐츠 생산은 시간이 걸린다.",
      },
      {
        pos: "명사",
        word: "productivity",
        mean: "생산성",
        ex: "AI improves productivity.",
        exKo: "AI는 생산성을 높인다.",
      },
      {
        pos: "형용사",
        word: "productive",
        mean: "생산적인",
        ex: "Today was a productive day.",
        exKo: "오늘은 생산적인 하루였다.",
      },
      {
        pos: "부사",
        word: "productively",
        mean: "생산적으로",
        ex: "I want to use my time productively.",
        exKo: "나는 시간을 생산적으로 쓰고 싶다.",
      },
    ],
  },
  {
    id: 3,
    concept: "prepare",
    ko: "준비",
    words: [
      {
        pos: "동사",
        word: "prepare",
        mean: "준비하다",
        ex: "I need to prepare for the presentation.",
        exKo: "나는 발표를 준비해야 한다.",
      },
      {
        pos: "명사",
        word: "preparation",
        mean: "준비",
        ex: "The preparation took longer than expected.",
        exKo: "준비가 예상보다 오래 걸렸다.",
      },
      {
        pos: "형용사",
        word: "prepared",
        mean: "준비된",
        ex: "I was not fully prepared for the test.",
        exKo: "나는 시험에 완전히 준비되어 있지 않았다.",
      },
    ],
  },
  {
    id: 4,
    concept: "distribute",
    ko: "배포",
    words: [
      {
        pos: "동사",
        word: "distribute",
        mean: "배포하다, 분배하다",
        ex: "We distribute tokens to participants.",
        exKo: "우리는 참가자들에게 토큰을 배포한다.",
      },
      {
        pos: "명사",
        word: "distribution",
        mean: "배포, 분배",
        ex: "The NFT distribution was completed.",
        exKo: "NFT 배포가 완료되었다.",
      },
    ],
  },
  {
    id: 5,
    concept: "accumulate",
    ko: "축적",
    words: [
      {
        pos: "동사",
        word: "accumulate",
        mean: "축적하다, 모으다",
        ex: "We accumulated Bitcoin-related assets.",
        exKo: "우리는 비트코인 관련 자산을 모았다.",
      },
      {
        pos: "형용사",
        word: "accumulated",
        mean: "축적된, 모은",
        ex: "The accumulated rewards grew over time.",
        exKo: "축적된 보상이 시간이 지나며 늘었다.",
      },
      {
        pos: "명사",
        word: "accumulation",
        mean: "축적",
        ex: "Wealth accumulation takes patience.",
        exKo: "부의 축적은 인내가 필요하다.",
      },
    ],
  },
  {
    id: 6,
    concept: "argue",
    ko: "주장",
    words: [
      {
        pos: "동사",
        word: "argue",
        mean: "주장하다, 논쟁하다",
        ex: "He argued that security is the top priority.",
        exKo: "그는 보안이 최우선이라고 주장했다.",
      },
      {
        pos: "명사",
        word: "argument",
        mean: "주장, 논거",
        ex: "His argument was based on solid evidence.",
        exKo: "그의 주장은 탄탄한 근거에 기반했다.",
      },
    ],
  },
  {
    id: 7,
    concept: "mediate",
    ko: "중재",
    words: [
      {
        pos: "동사",
        word: "mediate",
        mean: "중재하다",
        ex: "I tried to mediate between my friends.",
        exKo: "나는 친구들 사이를 중재하려 했다.",
      },
      {
        pos: "명사",
        word: "mediation",
        mean: "중재",
        ex: "Our team started as an escrow mediation service.",
        exKo: "우리 팀은 에스크로 중재 서비스로 시작했다.",
      },
      {
        pos: "명사",
        word: "mediator",
        mean: "중재자",
        ex: "I acted as a mediator in the dispute.",
        exKo: "나는 분쟁에서 중재자 역할을 했다.",
      },
    ],
  },
  {
    id: 8,
    concept: "dedicate",
    ko: "헌신",
    words: [
      {
        pos: "동사",
        word: "dedicate",
        mean: "헌신하다, 전념하다",
        ex: "He dedicated his weekend to the project.",
        exKo: "그는 주말을 프로젝트에 바쳤다.",
      },
      {
        pos: "형용사",
        word: "dedicated",
        mean: "헌신적인, 전용의",
        ex: "He is dedicated to the project.",
        exKo: "그는 그 프로젝트에 헌신적이다.",
      },
      {
        pos: "명사",
        word: "dedication",
        mean: "헌신",
        ex: "Her dedication impressed the team.",
        exKo: "그녀의 헌신은 팀을 감동시켰다.",
      },
    ],
  },
  {
    id: 9,
    concept: "found",
    ko: "설립",
    words: [
      {
        pos: "동사",
        word: "found",
        mean: "설립하다",
        ex: "They founded the team in 2021.",
        exKo: "그들은 2021년에 팀을 설립했다.",
      },
      {
        pos: "명사",
        word: "founder",
        mean: "창업자, 설립자",
        ex: "The founder created the project.",
        exKo: "창업자가 그 프로젝트를 만들었다.",
      },
      {
        pos: "명사",
        word: "foundation",
        mean: "설립, 기반, 토대",
        ex: "A strong foundation makes the project last.",
        exKo: "탄탄한 기반이 프로젝트를 오래가게 한다.",
      },
    ],
  },
];

const POS_COLOR = {
  동사: "#E8B33D",
  명사: "#7CA8E0",
  형용사: "#5BBF8E",
  부사: "#C98BD0",
};

function speakOnce(text, lang = "en-US", rate = 0.92) {
  return new Promise((resolve) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = rate;
      u.onend = resolve;
      u.onerror = resolve;
      window.speechSynthesis.speak(u);
    } catch (e) {
      resolve();
    }
  });
}
function speakNow(text, lang = "en-US", rate = 0.92) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shuffle = (a) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

export default function App() {
  const [tab, setTab] = useState("study"); // study | quiz
  const [selected, setSelected] = useState(new Set([1, 2]));
  const [started, setStarted] = useState(false);

  const toggleGroup = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
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
            {[
              ["study", "단어", ListChecks],
              ["quiz", "퀴즈", Brain],
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  setStarted(false);
                  window.speechSynthesis.cancel();
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
              window.speechSynthesis.cancel();
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
}) {
  return (
    <div style={{ padding: "16px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 13, color: C.muted }}>
          그룹을 골라 플레이리스트를 만들어
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
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {GROUPS.map((g) => {
          const on = selected.has(g.id);
          return (
            <button
              key={g.id}
              onClick={() => toggleGroup(g.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                textAlign: "left",
                padding: "13px 14px",
                borderRadius: 12,
                cursor: "pointer",
                background: on ? C.elevated : C.card,
                border: `1px solid ${on ? C.gold : C.border}`,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: on ? C.gold : "transparent",
                  border: `1.5px solid ${on ? C.gold : C.muted}`,
                }}
              >
                {on && <Check size={15} color="#1A1408" strokeWidth={3} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {g.concept}{" "}
                  <span
                    style={{ color: C.muted, fontWeight: 500, fontSize: 14 }}
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
        })}
      </div>
      {minNote && (
        <div style={{ marginTop: 12, fontSize: 12, color: C.gold }}>
          {minNote}
        </div>
      )}
      <button
        onClick={onStart}
        disabled={!count}
        style={{
          width: "100%",
          marginTop: 18,
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
        {ctaLabel} {count ? `· ${count}개` : ""}
      </button>
    </div>
  );
}

function StudyView({ items, onBack }) {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState("word"); // word | example
  const [showKo, setShowKo] = useState(true);
  const [gapSec, setGapSec] = useState(2.5); // 따라하기 텀 (초)
  const gapRef = useRef(2.5);
  gapRef.current = gapSec;
  const playingRef = useRef(false);
  const cur = items[index];

  // 재생 순서: 영어단어 → [따라하기 텀] → 한글뜻 → 영어예문 → [따라하기 텀] → 예문뜻 → 다음
  const runFrom = async (start) => {
    playingRef.current = true;
    setIsPlaying(true);
    for (let i = start; i < items.length; i++) {
      const w = items[i];
      if (!playingRef.current) return;
      setIndex(i);
      setPhase("word");
      await speakOnce(w.word, "en-US");
      if (!playingRef.current) return;
      await wait(gapRef.current * 1000); // 단어 따라하기 텀
      if (!playingRef.current) return;
      await speakOnce(w.mean, "ko-KR");
      if (!playingRef.current) return;
      await wait(600);
      if (!playingRef.current) return;
      setPhase("example");
      await speakOnce(w.ex, "en-US");
      if (!playingRef.current) return;
      await wait(gapRef.current * 1000); // 예문 따라하기 텀
      if (!playingRef.current) return;
      await speakOnce(w.exKo, "ko-KR");
      if (!playingRef.current) return;
      await wait(800);
    }
    playingRef.current = false;
    setIsPlaying(false);
    setPhase("word");
  };
  const pause = () => {
    playingRef.current = false;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };
  const play = () => runFrom(index);
  const go = (i) => {
    pause();
    const ni = (i + items.length) % items.length;
    setIndex(ni);
    setPhase("word");
    speakNow(items[ni].word);
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
          onClick={() => speakNow(cur.word)}
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
          onClick={() => speakNow(cur.ex)}
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
const ctrlBtn = {
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

function QuizView({ items, onBack }) {
  const pool = useMemo(() => shuffle(items), [items]);
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(false);

  const q = pool[qi];
  const options = useMemo(() => {
    if (!q) return [];
    const wrong = shuffle(items.filter((x) => x.word !== q.word))
      .slice(0, 3)
      .map((x) => x.mean);
    return shuffle([q.mean, ...wrong]);
  }, [qi, q, items]);

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

  const answer = (opt) => {
    if (picked) return;
    setPicked(opt);
    if (opt === q.mean) setScore((s) => s + 1);
    speakNow(q.word);
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
