"use client";

import { ChevronLeft, RotateCcw } from "lucide-react";
import { getWordCatalog, type WordId } from "@/lib/playlists";

const C = {
  bg: "#12141C",
  card: "#1B1E2A",
  elevated: "#232735",
  text: "#F0EBDF",
  muted: "#8B8FA3",
  gold: "#E8B33D",
  goldDim: "#5A4A22",
  green: "#5BBF8E",
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

type Props = {
  hiddenIds: Set<WordId>;
  onBack: () => void;
  onRestore: (id: WordId) => void;
  onRestoreAll: () => void;
};

export default function HiddenWordsPanel({
  hiddenIds,
  onBack,
  onRestore,
  onRestoreAll,
}: Props) {
  const hiddenWords = getWordCatalog()
    .filter((w) => hiddenIds.has(w.id))
    .sort((a, b) => a.order - b.order);

  return (
    <div
      style={{
        padding: "14px 20px",
        paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))",
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
          marginBottom: 14,
          padding: 0,
        }}
      >
        <ChevronLeft size={18} /> 목록으로
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>숨긴 단어</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: C.muted }}>
            {hiddenWords.length}개 · 복원하면 다시 학습 목록에 나타납니다
          </p>
        </div>
        {hiddenWords.length > 0 && (
          <button
            onClick={onRestoreAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: `1px solid ${C.border}`,
              color: C.gold,
              padding: "6px 10px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <RotateCcw size={14} /> 전체 복원
          </button>
        )}
      </div>

      {hiddenWords.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: C.muted,
            padding: "48px 0",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          숨긴 단어가 없어요.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {hiddenWords.map((w) => (
            <div
              key={w.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "13px 14px",
                borderRadius: 12,
                background: C.card,
                border: `1px solid ${C.border}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{w.word}</span>
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
                <div style={{ fontSize: 14, color: C.muted, marginTop: 3 }}>
                  {w.mean}
                </div>
              </div>
              <button
                onClick={() => onRestore(w.id)}
                style={{
                  flexShrink: 0,
                  background: C.elevated,
                  border: `1px solid ${C.goldDim}`,
                  color: C.green,
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                복원
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
