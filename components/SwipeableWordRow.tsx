"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { EyeOff } from "lucide-react";

const C = {
  card: "#1B1E2A",
  elevated: "#232735",
  text: "#F0EBDF",
  muted: "#8B8FA3",
  red: "#E07A5F",
  border: "#2E3344",
};

const ACTION_WIDTH = 76;
const SNAP_THRESHOLD = 38;

type Props = {
  children: ReactNode;
  onHide: () => void;
  onClick?: () => void;
  rowStyle?: CSSProperties;
};

export default function SwipeableWordRow({
  children,
  onHide,
  onClick,
  rowStyle,
}: Props) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);
  const moved = useRef(false);

  const snapOpen = () => setOffsetX(-ACTION_WIDTH);
  const snapClosed = () => setOffsetX(0);

  const onPointerDown = (e: ReactPointerEvent) => {
    setIsDragging(true);
    moved.current = false;
    dragStartX.current = e.clientX;
    dragStartOffset.current = offsetX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - dragStartX.current;
    if (Math.abs(delta) > 4) moved.current = true;
    const next = Math.min(0, Math.max(-ACTION_WIDTH, dragStartOffset.current + delta));
    setOffsetX(next);
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (offsetX < -SNAP_THRESHOLD) snapOpen();
    else snapClosed();
  };

  const handleRowClick = () => {
    if (moved.current) return;
    onClick?.();
  };

  const handleHide = () => {
    snapClosed();
    onHide();
  };

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 12,
        overflow: "hidden",
        touchAction: "pan-y",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "flex-end",
          background: C.elevated,
        }}
      >
        <button
          type="button"
          onClick={handleHide}
          style={{
            width: ACTION_WIDTH,
            border: "none",
            cursor: "pointer",
            background: C.red,
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          <EyeOff size={18} />
          숨기기
        </button>
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease",
          background: C.card,
          borderRadius: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            ...rowStyle,
          }}
        >
          <button
            type="button"
            onClick={handleRowClick}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 12,
              textAlign: "left",
              background: "transparent",
              border: "none",
              padding: 0,
              color: C.text,
              cursor: onClick ? "pointer" : "default",
              minWidth: 0,
            }}
          >
            {children}
          </button>
          <button
            type="button"
            onClick={handleHide}
            aria-label="숨기기"
            style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.muted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EyeOff size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
