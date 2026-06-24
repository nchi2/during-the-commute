export type StudyMediaMetadata = {
  title: string;
  artist?: string;
  album?: string;
};

export type MediaSessionHandlers = {
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
};

const ARTWORK: MediaImage[] = [
  {
    src: "/logos/logo_commute.png",
    sizes: "512x512",
    type: "image/png",
  },
];

let handlers: MediaSessionHandlers = {};
let handlersRegistered = false;

function hasMediaSession(): boolean {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}

function setActionHandler(
  action: MediaSessionAction,
  handler: (() => void) | null,
): void {
  if (!hasMediaSession()) return;
  try {
    navigator.mediaSession.setActionHandler(action, handler);
  } catch {
    /* action not supported on this platform */
  }
}

function bindActionHandlers(): void {
  if (!hasMediaSession() || handlersRegistered) return;
  handlersRegistered = true;

  setActionHandler("play", () => handlers.onPlay?.());
  setActionHandler("pause", () => handlers.onPause?.());
  setActionHandler("nexttrack", () => handlers.onNext?.());
  setActionHandler("previoustrack", () => handlers.onPrev?.());
}

function clearActionHandlers(): void {
  if (!hasMediaSession()) return;
  for (const action of [
    "play",
    "pause",
    "nexttrack",
    "previoustrack",
  ] as MediaSessionAction[]) {
    setActionHandler(action, null);
  }
  handlersRegistered = false;
}

export function registerMediaSessionHandlers(next: MediaSessionHandlers): void {
  handlers = next;
  bindActionHandlers();
}

export function clearMediaSessionHandlers(): void {
  handlers = {};
  clearActionHandlers();
  if (hasMediaSession()) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
  }
}

export function updateStudyMediaMetadata(meta: StudyMediaMetadata): void {
  if (!hasMediaSession()) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: meta.title,
      artist: meta.artist ?? "오늘의 단어",
      album: meta.album ?? "단어 학습",
      artwork: ARTWORK,
    });
  } catch {
    /* MediaMetadata unsupported */
  }
}

export function setMediaPlaybackState(
  state: MediaSessionPlaybackState,
): void {
  if (!hasMediaSession()) return;
  navigator.mediaSession.playbackState = state;
}

export function updateMediaPositionState(opts: {
  duration: number;
  position: number;
}): void {
  if (!hasMediaSession() || !navigator.mediaSession.setPositionState) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: Math.max(opts.duration, 1),
      playbackRate: 1,
      position: Math.min(Math.max(opts.position, 0), opts.duration),
    });
  } catch {
    /* position state rejected */
  }
}
