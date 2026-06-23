"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  loadPlaybackSettings,
  savePlaybackSettings,
  type LoopMode,
  type PlaybackSettings,
} from "@/lib/storage";

const C = {
  bg: "#12141C",
  card: "#1B1E2A",
  elevated: "#232735",
  text: "#F0EBDF",
  muted: "#8B8FA3",
  gold: "#E8B33D",
  goldDim: "#5A4A22",
  border: "#2E3344",
};

type Props = {
  onBack: () => void;
};

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map((opt) => {
        const on = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 8,
              border: `1px solid ${on ? C.gold : C.border}`,
              background: on ? C.elevated : C.card,
              color: on ? C.gold : C.muted,
              fontWeight: on ? 700 : 500,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SettingCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: desc ? 4 : 10 }}>
        {title}
      </div>
      {desc && (
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
          {desc}
        </div>
      )}
      {children}
    </div>
  );
}

export default function SettingsScreen({ onBack }: Props) {
  const [settings, setSettings] = useState<PlaybackSettings | null>(null);

  useEffect(() => {
    setSettings(loadPlaybackSettings());
  }, []);

  const patch = (partial: Partial<PlaybackSettings>) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      savePlaybackSettings(next);
      return next;
    });
  };

  if (!settings) {
    return (
      <div
        style={{
          background: C.bg,
          minHeight: "50vh",
        }}
      />
    );
  }

  const gapLabel = `${settings.gapSec.toFixed(1)}초`;

  return (
    <div
      style={{
        padding: "0 0 40px",
        paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "14px 20px",
          borderBottom: `1px solid ${C.border}`,
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
            padding: 0,
          }}
        >
          <ChevronLeft size={18} /> 뒤로
        </button>
        <span style={{ fontSize: 17, fontWeight: 800 }}>환경설정</span>
      </div>

      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <SettingCard
          title="단어 반복 횟수"
          desc="영어 단어를 듣고 따라한 뒤, 설정 횟수만큼 반복합니다."
        >
          <Segmented
            value={settings.wordRepeatCount}
            options={[
              { value: 1, label: "1회" },
              { value: 2, label: "2회" },
              { value: 3, label: "3회" },
            ]}
            onChange={(v) => patch({ wordRepeatCount: v })}
          />
        </SettingCard>

        <SettingCard
          title="예문 반복 횟수"
          desc="영어 예문도 단어와 별도로 반복 횟수를 지정합니다."
        >
          <Segmented
            value={settings.exampleRepeatCount}
            options={[
              { value: 1, label: "1회" },
              { value: 2, label: "2회" },
              { value: 3, label: "3회" },
            ]}
            onChange={(v) => patch({ exampleRepeatCount: v })}
          />
        </SettingCard>

        <SettingCard
          title="따라하기 텀"
          desc="영어 단어·예문을 듣은 뒤 따라 말할 여유 시간입니다."
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, color: C.muted }}>간격</span>
            <span
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 14,
                color: C.gold,
              }}
            >
              {gapLabel}
            </span>
          </div>
          <input
            type="range"
            min="0.2"
            max="6"
            step="0.1"
            value={settings.gapSec}
            onChange={(e) => patch({ gapSec: parseFloat(e.target.value) })}
            style={{ width: "100%", accentColor: C.gold, cursor: "pointer" }}
          />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            대중교통에선 짧게(0.2초~), 운전 중엔 길게
          </div>
        </SettingCard>

        <SettingCard
          title="세트 사이 간격"
          desc="같은 단어·예문을 반복할 때, 한 세트(영어→텀→뜻)가 끝난 뒤 다음 세트 전 무음 간격입니다."
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, color: C.muted }}>간격</span>
            <span
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 14,
                color: C.gold,
              }}
            >
              {settings.setGapSec.toFixed(1)}초
            </span>
          </div>
          <input
            type="range"
            min="0.3"
            max="2"
            step="0.1"
            value={settings.setGapSec}
            onChange={(e) => patch({ setGapSec: parseFloat(e.target.value) })}
            style={{ width: "100%", accentColor: C.gold, cursor: "pointer" }}
          />
        </SettingCard>

        <SettingCard
          title="루프 모드"
          desc="한 바퀴 재생이 끝났을 때의 동작입니다."
        >
          <Segmented<LoopMode>
            value={settings.loopMode}
            options={[
              { value: "stop", label: "한 바퀴 후 정지" },
              { value: "repeat", label: "처음부터 다시" },
            ]}
            onChange={(v) => patch({ loopMode: v })}
          />
        </SettingCard>

        <SettingCard
          title="항목 사이 구분 간격"
          desc="한 단어가 끝나고 다음 단어로 넘어가기 전 무음 간격입니다."
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: settings.itemGapEnabled ? 12 : 0,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 13, color: C.muted }}>구분 간격 사용</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.itemGapEnabled}
              onClick={() => patch({ itemGapEnabled: !settings.itemGapEnabled })}
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                border: "none",
                cursor: "pointer",
                background: settings.itemGapEnabled ? C.gold : C.elevated,
                position: "relative",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: settings.itemGapEnabled ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: settings.itemGapEnabled ? "#1A1408" : C.muted,
                  transition: "left 0.15s",
                }}
              />
            </button>
          </label>
          {settings.itemGapEnabled && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 13, color: C.muted }}>간격 길이</span>
                <span
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 14,
                    color: C.gold,
                  }}
                >
                  {settings.itemGapSec.toFixed(1)}초
                </span>
              </div>
              <input
                type="range"
                min="0.3"
                max="1.5"
                step="0.1"
                value={settings.itemGapSec}
                onChange={(e) =>
                  patch({ itemGapSec: parseFloat(e.target.value) })
                }
                style={{
                  width: "100%",
                  accentColor: C.gold,
                  cursor: "pointer",
                }}
              />
            </>
          )}
        </SettingCard>
      </div>
    </div>
  );
}
