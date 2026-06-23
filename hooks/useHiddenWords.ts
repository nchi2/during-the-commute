"use client";

import { useCallback, useEffect, useState } from "react";
import type { WordId } from "@/lib/playlists";
import {
  hideWordId,
  loadHiddenWordIds,
  restoreAllHiddenWordIds,
  restoreWordId,
} from "@/lib/hidden-words";

export function useHiddenWords() {
  const [hiddenIds, setHiddenIds] = useState<Set<WordId>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHiddenIds(loadHiddenWordIds());
    setReady(true);
  }, []);

  const hide = useCallback((id: WordId) => {
    const next = hideWordId(id);
    setHiddenIds(new Set(next));
    return next;
  }, []);

  const restore = useCallback((id: WordId) => {
    const next = restoreWordId(id);
    setHiddenIds(new Set(next));
    return next;
  }, []);

  const restoreAll = useCallback(() => {
    const next = restoreAllHiddenWordIds();
    setHiddenIds(new Set(next));
    return next;
  }, []);

  return {
    hiddenIds,
    ready,
    hide,
    restore,
    restoreAll,
    count: hiddenIds.size,
  };
}
