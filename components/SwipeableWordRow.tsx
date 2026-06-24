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
  border: "#2E3344",
};

const ACTION_WIDTH = 52;
const SNAP_THRESHOLD = 30;

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
  const offsetRef = useRef(0);
  const draggingRef = useRef(false);
  const moved = useRef(false);

  offsetRef.current = offsetX;

  const snapOpen = () => {
    offsetRef.current = -ACTION_WIDTH;
    setOffsetX(-ACTION_WIDTH);
  };
  const snapClosed = () => {
    offsetRef.current = 0;
    setOffsetX(0);
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    draggingRef.current = true;
    setIsDragging(true);
    moved.current = false;
    dragStartX.current = e.clientX;
    dragStartOffset.current = offsetRef.current;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!draggingRef.current) return;
    const delta = e.clientX - dragStartX.current;
    if (Math.abs(delta) > 4) moved.current = true;
    const next = Math.min(
      0,
      Math.max(-ACTION_WIDTH, dragStartOffset.current + delta),
    );
    offsetRef.current = next;
    setOffsetX(next);
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (offsetRef.current < -SNAP_THRESHOLD) snapOpen();
    else snapClosed();
  };

  const handleRowClick = () => {
    if (moved.current) {
      moved.current = false;
      return;
    }
    onClick?.();
  };

  const handleHide = (e: ReactPointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    snapClosed();
    onHide();
  };

  return (
    <div
      className="word-row-wrap"
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
          aria-label="숨기기"
          title="숨기기"
          style={{
            width: ACTION_WIDTH,
            border: "none",
            borderLeft: `1px solid ${C.border}`,
            cursor: "pointer",
            background: C.elevated,
            color: C.muted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <EyeOff size={15} strokeWidth={2} />
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
            gap: 4,
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
            className="word-row-hide-btn"
            onClick={handleHide}
            aria-label="숨기기"
            title="숨기기"
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              marginRight: 2,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: C.muted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EyeOff size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
