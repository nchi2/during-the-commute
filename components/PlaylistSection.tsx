"use client";

import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import SwipeableWordRow from "@/components/SwipeableWordRow";
import HiddenWordsPanel from "@/components/HiddenWordsPanel";
import {
  Check,
  ChevronLeft,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Brain,
  type LucideIcon,
} from "lucide-react";
import {
  appendWordIds,
  createPlaylist,
  deletePlaylist,
  getWordCatalog,
  loadPlaylists,
  resolveWordIds,
  updatePlaylist,
  removeWordId,
  type CatalogWord,
  type Playlist,
  type StudyItem,
  type WordId,
} from "@/lib/playlists";

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

type Screen =
  | { type: "list" }
  | { type: "pick"; mode: "new" | "append"; appendId?: string }
  | { type: "edit"; playlistId: string };

type Props = {
  onStartStudy: (items: StudyItem[]) => void;
  onStartQuiz: (items: StudyItem[]) => void;
  resetToken: number;
  hiddenIds: Set<WordId>;
  hiddenCount: number;
  onHideWord: (id: WordId) => void;
  onRestoreWord: (id: WordId) => void;
  onRestoreAllHidden: () => void;
};

export default function PlaylistSection({
  onStartStudy,
  onStartQuiz,
  resetToken,
  hiddenIds,
  hiddenCount,
  onHideWord,
  onRestoreWord,
  onRestoreAllHidden,
}: Props) {
  const [screen, setScreen] = useState<Screen>({ type: "list" });
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [pickIds, setPickIds] = useState<Set<WordId>>(new Set());

  const refresh = useCallback(() => {
    setPlaylists(loadPlaylists());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, resetToken]);

  useEffect(() => {
    setScreen({ type: "list" });
    setPickIds(new Set());
  }, [resetToken]);

  if (screen.type === "pick") {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
      <WordPicker
        selected={pickIds}
        onChange={setPickIds}
        onBack={() => {
          if (screen.mode === "append" && screen.appendId) {
            setScreen({ type: "edit", playlistId: screen.appendId });
          } else {
            setScreen({ type: "list" });
          }
          setPickIds(new Set());
        }}
        onSaveNew={(name) => {
          if (pickIds.size === 0) return;
          createPlaylist(name, Array.from(pickIds));
          refresh();
          setScreen({ type: "list" });
          setPickIds(new Set());
        }}
        onAppend={(playlistId) => {
          if (pickIds.size === 0) return;
          appendWordIds(playlistId, Array.from(pickIds));
          refresh();
          if (screen.mode === "append") {
            setScreen({ type: "edit", playlistId });
          } else {
            setScreen({ type: "list" });
          }
          setPickIds(new Set());
        }}
        playlists={playlists}
        mode={screen.mode}
        appendId={screen.appendId}
        hiddenIds={hiddenIds}
        hiddenCount={hiddenCount}
        onHideWord={onHideWord}
        onRestoreWord={onRestoreWord}
        onRestoreAllHidden={onRestoreAllHidden}
      />
      </div>
    );
  }

  if (screen.type === "edit") {
    const pl = playlists.find((p) => p.id === screen.playlistId);
    if (!pl) {
      setScreen({ type: "list" });
      return null;
    }
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <PlaylistEdit
          playlist={pl}
          onBack={() => {
            refresh();
            setScreen({ type: "list" });
          }}
          onRemove={(wordId) => {
            removeWordId(pl.id, wordId);
            refresh();
          }}
          onAddWords={() => {
            setPickIds(new Set());
            setScreen({ type: "pick", mode: "append", appendId: pl.id });
          }}
          onRename={(name) => {
            updatePlaylist(pl.id, { name });
            refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
    <PlaylistList
      playlists={playlists}
      onNew={() => {
        setPickIds(new Set());
        setScreen({ type: "pick", mode: "new" });
      }}
      onEdit={(id) => setScreen({ type: "edit", playlistId: id })}
      onDelete={(id) => {
        if (window.confirm("이 플레이리스트를 삭제할까요?")) {
          deletePlaylist(id);
          refresh();
        }
      }}
      onRename={(id, name) => {
        updatePlaylist(id, { name });
        refresh();
      }}
      onStudy={(pl) => {
        const items = resolveWordIds(
          pl.wordIds.filter((id) => !hiddenIds.has(id)),
        );
        if (items.length) onStartStudy(items);
      }}
      onQuiz={(pl) => {
        const items = resolveWordIds(
          pl.wordIds.filter((id) => !hiddenIds.has(id)),
        );
        if (items.length) onStartQuiz(items);
      }}
    />
    </div>
  );
}

function PlaylistList({
  playlists,
  onNew,
  onEdit,
  onDelete,
  onRename,
  onStudy,
  onQuiz,
}: {
  playlists: Playlist[];
  onNew: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onStudy: (pl: Playlist) => void;
  onQuiz: (pl: Playlist) => void;
}) {
  return (
    <div style={{ padding: "16px 20px 40px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 13, color: C.muted }}>나만의 단어 리스트</span>
        <button
          onClick={onNew}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: C.gold,
            color: "#1A1408",
            border: "none",
            padding: "7px 12px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Plus size={15} /> 새 리스트
        </button>
      </div>

      {playlists.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: C.muted,
            padding: "48px 0",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          아직 플레이리스트가 없어요.
          <br />
          단어를 골라 나만의 리스트를 만들어 보세요.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {playlists.map((pl) => (
            <div
              key={pl.id}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "14px 14px 12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{pl.name}</div>
                  <div
                    style={{
                      fontSize: 13,
                      color: C.muted,
                      marginTop: 4,
                      fontFamily: "ui-monospace, monospace",
                    }}
                  >
                    {pl.wordIds.length}개 단어
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <IconBtn
                    title="이름 변경"
                    onClick={() => {
                      const name = window.prompt("플레이리스트 이름", pl.name);
                      if (name?.trim()) onRename(pl.id, name.trim());
                    }}
                  >
                    <Pencil size={15} />
                  </IconBtn>
                  <IconBtn title="삭제" onClick={() => onDelete(pl.id)}>
                    <Trash2 size={15} color={C.red} />
                  </IconBtn>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <ActionBtn
                  label="학습"
                  Icon={Play}
                  primary
                  disabled={pl.wordIds.length === 0}
                  onClick={() => onStudy(pl)}
                />
                <ActionBtn
                  label="퀴즈"
                  Icon={Brain}
                  disabled={pl.wordIds.length === 0}
                  onClick={() => onQuiz(pl)}
                />
                <ActionBtn label="수정" onClick={() => onEdit(pl.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlaylistEdit({
  playlist,
  onBack,
  onRemove,
  onAddWords,
  onRename,
}: {
  playlist: Playlist;
  onBack: () => void;
  onRemove: (wordId: WordId) => void;
  onAddWords: () => void;
  onRename: (name: string) => void;
}) {
  const catalog = getWordCatalog();
  const map = useMemo(
    () => new Map(catalog.map((w) => [w.id, w])),
    [catalog],
  );
  const words = playlist.wordIds
    .map((id) => map.get(id))
    .filter((w): w is CatalogWord => !!w);

  return (
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
          padding: "14px 20px 12px",
          background: C.bg,
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
            marginBottom: 12,
            padding: 0,
          }}
        >
          <ChevronLeft size={18} /> 목록
        </button>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{playlist.name}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
              {words.length}개 단어
            </div>
          </div>
          <button
            onClick={() => {
              const name = window.prompt("플레이리스트 이름", playlist.name);
              if (name?.trim()) onRename(name.trim());
            }}
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
            이름 변경
          </button>
        </div>
        <button
          onClick={onAddWords}
          style={{
            width: "100%",
            padding: "11px 0",
            borderRadius: 10,
            border: `1px dashed ${C.gold}`,
            background: "transparent",
            color: C.gold,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          + 단어 추가
        </button>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "12px 20px 40px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {words.length === 0 ? (
            <div style={{ textAlign: "center", color: C.muted, padding: 24 }}>
              단어가 없어요. 추가해 보세요.
            </div>
          ) : (
            words.map((w) => (
              <div
                key={w.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: C.card,
                  border: `1px solid ${C.border}`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{w.word}</div>
                  <div style={{ fontSize: 14, color: C.muted, marginTop: 2 }}>
                    {w.mean}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(w.id)}
                  style={{
                    background: "none",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "6px 8px",
                    cursor: "pointer",
                    color: C.muted,
                  }}
                  aria-label="단어 제거"
                >
                  <XIcon />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function WordPicker({
  selected,
  onChange,
  onBack,
  onSaveNew,
  onAppend,
  playlists,
  mode,
  appendId,
  hiddenIds,
  hiddenCount,
  onHideWord,
  onRestoreWord,
  onRestoreAllHidden,
}: {
  selected: Set<WordId>;
  onChange: (s: Set<WordId>) => void;
  onBack: () => void;
  onSaveNew: (name: string) => void;
  onAppend: (playlistId: string) => void;
  playlists: Playlist[];
  mode: "new" | "append";
  appendId?: string;
  hiddenIds: Set<WordId>;
  hiddenCount: number;
  onHideWord: (id: WordId) => void;
  onRestoreWord: (id: WordId) => void;
  onRestoreAllHidden: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"default" | "az">("default");
  const [showAppendList, setShowAppendList] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [undo, setUndo] = useState<{ id: WordId; label: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allWords = useMemo(() => getWordCatalog(), []);
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

  const handleHideWord = (id: WordId, label: string) => {
    onHideWord(id);
    if (selected.has(id)) {
      const next = new Set(selected);
      next.delete(id);
      onChange(next);
    }
    setUndo({ id, label });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 4000);
  };

  const handleUndo = () => {
    if (!undo) return;
    onRestoreWord(undo.id);
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, []);

  const toggle = (id: WordId) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const toggleAllVisible = () => {
    const ids = displayedWords.map((w) => w.id);
    const allOn = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    if (allOn) {
      for (const id of ids) next.delete(id);
    } else {
      for (const id of ids) next.add(id);
    }
    onChange(next);
  };

  const checkboxStyle = (on: boolean) => ({
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

  const rowStyle = (on: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    textAlign: "left" as const,
    padding: "13px 14px",
    borderRadius: 12,
    cursor: "pointer" as const,
    background: on ? C.elevated : C.card,
    border: `1px solid ${on ? C.gold : C.border}`,
    width: "100%",
    color: C.text,
  });

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
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
        <>
          <div
            style={{
              flexShrink: 0,
              padding: "14px 20px 12px",
              background: C.bg,
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
                marginBottom: 12,
                padding: 0,
              }}
            >
              <ChevronLeft size={18} />{" "}
              {mode === "append" ? "수정으로 돌아가기" : "목록"}
            </button>

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
              paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {(["default", "az"] as const).map((id) => (
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
                  {id === "default" ? "기본순" : "A-Z"}
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
                {selected.size}개 선택 · {displayedWords.length}개 표시
              </span>
              <button
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
                보이는 항목 전체
              </button>
            </div>

            <div
              key={query || `sort-${sortMode}`}
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              {displayedWords.map((w) => {
                const on = selected.has(w.id);
                return (
                  <SwipeableWordRow
                    key={w.id}
                    onHide={() => handleHideWord(w.id, w.word)}
                    onClick={() => toggle(w.id)}
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
                        style={{ fontSize: 14, color: C.muted, marginTop: 3 }}
                      >
                        {w.mean}
                      </div>
                    </div>
                  </SwipeableWordRow>
                );
              })}
            </div>
          </div>
        </>
      )}

      {undo && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: "calc(100px + env(safe-area-inset-bottom, 0px))",
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
          {nameOpen ? (
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="플레이리스트 이름"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: C.card,
                  color: C.text,
                  fontSize: 15,
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nameInput.trim()) {
                    onSaveNew(nameInput.trim());
                    setNameOpen(false);
                  }
                }}
              />
              <button
                onClick={() => {
                  if (nameInput.trim()) onSaveNew(nameInput.trim());
                  setNameOpen(false);
                }}
                disabled={!nameInput.trim()}
                style={{
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "none",
                  background: nameInput.trim() ? C.gold : C.elevated,
                  color: nameInput.trim() ? "#1A1408" : C.muted,
                  fontWeight: 700,
                  cursor: nameInput.trim() ? "pointer" : "not-allowed",
                }}
              >
                저장
              </button>
            </div>
          ) : (
            <>
              {mode === "new" && (
                <button
                  onClick={() => {
                    setNameInput("");
                    setNameOpen(true);
                  }}
                  disabled={selected.size === 0}
                  style={{
                    width: "100%",
                    marginBottom: 8,
                    padding: "14px 0",
                    borderRadius: 12,
                    border: "none",
                    cursor: selected.size ? "pointer" : "not-allowed",
                    background: selected.size ? C.gold : C.elevated,
                    color: selected.size ? "#1A1408" : C.muted,
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  새 플레이리스트로 저장 ({selected.size}개)
                </button>
              )}
              {mode === "append" && appendId && (
                <button
                  onClick={() => onAppend(appendId)}
                  disabled={selected.size === 0}
                  style={{
                    width: "100%",
                    marginBottom: 8,
                    padding: "14px 0",
                    borderRadius: 12,
                    border: "none",
                    cursor: selected.size ? "pointer" : "not-allowed",
                    background: selected.size ? C.gold : C.elevated,
                    color: selected.size ? "#1A1408" : C.muted,
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  리스트에 추가 ({selected.size}개)
                </button>
              )}
              {mode === "new" && playlists.length > 0 && (
                <>
                  <button
                    onClick={() => setShowAppendList((s) => !s)}
                    disabled={selected.size === 0}
                    style={{
                      width: "100%",
                      padding: "11px 0",
                      borderRadius: 10,
                      border: `1px solid ${C.border}`,
                      background: "transparent",
                      color: selected.size ? C.muted : C.muted,
                      fontSize: 14,
                      cursor: selected.size ? "pointer" : "not-allowed",
                    }}
                  >
                    기존 플레이리스트에 추가
                  </button>
                  {showAppendList && selected.size > 0 && (
                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        maxHeight: 160,
                        overflowY: "auto",
                      }}
                    >
                      {playlists.map((pl) => (
                        <button
                          key={pl.id}
                          onClick={() => {
                            onAppend(pl.id);
                            setShowAppendList(false);
                          }}
                          style={{
                            textAlign: "left",
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: `1px solid ${C.border}`,
                            background: C.card,
                            color: C.text,
                            cursor: "pointer",
                            fontSize: 14,
                          }}
                        >
                          {pl.name}{" "}
                          <span style={{ color: C.muted }}>
                            ({pl.wordIds.length}개)
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: "none",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: 6,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

function ActionBtn({
  label,
  Icon,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  Icon?: LucideIcon;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        padding: "9px 0",
        borderRadius: 8,
        border: primary ? "none" : `1px solid ${C.border}`,
        background: disabled ? C.elevated : primary ? C.gold : "transparent",
        color: disabled ? C.muted : primary ? "#1A1408" : C.muted,
        fontWeight: 700,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );
}
