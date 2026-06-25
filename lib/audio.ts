import { audioFileBase, sanitizeAudioFilename } from "./audio-filename.mjs";
import {
  DEFAULT_AUDIO_SUBDIR,
  exampleAudioUrl as buildExampleAudioUrl,
  exKoAudioUrl as buildExKoAudioUrl,
  getAudioSubdirForLevel,
  getAudioSubdirForMomLevel,
  meanAudioUrl as buildMeanAudioUrl,
  skipsExamplePhaseForAudioSubdir,
  wordAudioUrl as buildWordAudioUrl,
} from "./audio-paths.mjs";
import { loadPlaybackSettings } from "./storage";
import type { LevelId } from "./storage";

export { audioFileBase, sanitizeAudioFilename };

let currentAudioSubdir = DEFAULT_AUDIO_SUBDIR;

export function setAudioSubdir(subdir: string): void {
  currentAudioSubdir = subdir;
}

export function getAudioSubdir(): string {
  return currentAudioSubdir;
}

export function setAudioSubdirForLevel(level: LevelId): void {
  setAudioSubdir(getAudioSubdirForLevel(level));
}

export function setAudioSubdirForMomLevel(momLevelId: string): void {
  setAudioSubdir(getAudioSubdirForMomLevel(momLevelId));
}

export function skipsExamplePhase(): boolean {
  return skipsExamplePhaseForAudioSubdir(currentAudioSubdir);
}

export function wordAudioUrl(word: string, pos?: string): string {
  return buildWordAudioUrl(currentAudioSubdir, word, pos);
}

export function exampleAudioUrl(word: string, pos?: string): string {
  return buildExampleAudioUrl(currentAudioSubdir, word, pos);
}

export function meanAudioUrl(word: string, pos?: string): string {
  return buildMeanAudioUrl(currentAudioSubdir, word, pos);
}

export function exKoAudioUrl(word: string, pos?: string): string {
  return buildExKoAudioUrl(currentAudioSubdir, word, pos);
}

let sharedAudio: HTMLAudioElement | null = null;
let keepAliveAudio: HTMLAudioElement | null = null;
let activeResolve: (() => void) | null = null;
let onReadyHandler: (() => void) | null = null;

const AUDIO_READY_EVENT = "canplaythrough";
let stopRequested = false;
const preloaded = new Set<string>();

/** iOS 백그라운드 오디오 세션 유지용 무음 루프 (~0.3s) */
const SILENT_MP3 =
  "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+1DEAAAAAA0gAAAAABJhwAAAEAAAABAAAAAAAAAAAAAAAAAAAA";

function attachAudioToDom(audio: HTMLAudioElement): void {
  if (typeof document === "undefined") return;
  if (audio.parentElement) return;
  audio.style.display = "none";
  document.body.appendChild(audio);
}

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "auto";
    attachAudioToDom(sharedAudio);
  }
  return sharedAudio;
}

/** 학습 자동재생 중 iOS 오디오 세션 유지 (무음 루프) */
export function startAudioKeepAlive(): void {
  if (keepAliveAudio) return;
  keepAliveAudio = new Audio();
  keepAliveAudio.loop = true;
  keepAliveAudio.volume = 0.001;
  keepAliveAudio.preload = "auto";
  keepAliveAudio.src = SILENT_MP3;
  attachAudioToDom(keepAliveAudio);
  void keepAliveAudio.play().catch(() => {
    /* 사용자 제스처 없으면 실패할 수 있음 */
  });
}

export function stopAudioKeepAlive(): void {
  if (!keepAliveAudio) return;
  keepAliveAudio.pause();
  keepAliveAudio.src = "";
  keepAliveAudio.remove();
  keepAliveAudio = null;
}

/** 백그라운드 복귀 시 오디오 세션 재활성화 */
export function reclaimAudioSession(): void {
  if (keepAliveAudio && keepAliveAudio.paused) {
    void keepAliveAudio.play().catch(() => {});
  }
}

export function cancelPlayback(): void {
  stopRequested = true;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* noop */
  }
  const audio = sharedAudio;
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.onended = null;
    audio.onerror = null;
    if (onReadyHandler) {
      audio.removeEventListener(AUDIO_READY_EVENT, onReadyHandler);
      onReadyHandler = null;
    }
  }
  if (activeResolve) {
    const resolve = activeResolve;
    activeResolve = null;
    resolve();
  }
}

/** 학습 세션 종료 시 keepAlive까지 정리 */
export function stopStudyPlayback(): void {
  cancelPlayback();
  stopAudioKeepAlive();
}

function getEnglishPlaybackRate(): number {
  return loadPlaybackSettings().playbackRate;
}

function playMp3(url: string, playbackRate = 1): Promise<boolean> {
  return new Promise((resolve) => {
    stopRequested = false;
    const audio = getSharedAudio();

    const done = (ok: boolean) => {
      audio.onended = null;
      audio.onerror = null;
      if (onReadyHandler) {
        audio.removeEventListener(AUDIO_READY_EVENT, onReadyHandler);
        onReadyHandler = null;
      }
      if (activeResolve === onCancel) activeResolve = null;
      resolve(ok);
    };

    const onCancel = () => done(false);
    activeResolve = onCancel;

    const startPlay = () => {
      if (stopRequested) {
        done(false);
        return;
      }
      audio.currentTime = 0;
      audio.playbackRate = playbackRate;
      audio.play().catch(() => done(false));
    };

    audio.onended = () => done(true);
    audio.onerror = () => done(false);

    audio.pause();
    audio.currentTime = 0;
    audio.src = url;
    onReadyHandler = startPlay;
    audio.addEventListener(AUDIO_READY_EVENT, onReadyHandler, { once: true });
    audio.load();
  });
}

function speakOnceTTS(
  text: string,
  lang: string,
  rate = 0.92,
): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      if (activeResolve === finish) activeResolve = null;
      resolve();
    };

    try {
      activeResolve = finish;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = rate;
      u.onend = finish;
      u.onerror = finish;
      window.speechSynthesis.speak(u);
    } catch {
      finish();
    }
  });
}

async function playMp3OrTTS(
  url: string,
  fallbackText: string,
  lang: string,
  playbackRate = 1,
): Promise<void> {
  const ok = await playMp3(url, playbackRate);
  if (stopRequested) return;
  if (!ok) {
    const ttsRate = lang.startsWith("en") ? 0.92 * playbackRate : 0.92;
    await speakOnceTTS(fallbackText, lang, ttsRate);
  }
}

export async function speakEnglishWord(word: string, pos?: string): Promise<void> {
  const rate = getEnglishPlaybackRate();
  await playMp3OrTTS(wordAudioUrl(word, pos), word, "en-US", rate);
}

export async function speakEnglishExample(
  word: string,
  ex: string,
  pos?: string,
): Promise<void> {
  const rate = getEnglishPlaybackRate();
  await playMp3OrTTS(exampleAudioUrl(word, pos), ex, "en-US", rate);
}

export async function speakKoreanMean(
  word: string,
  mean: string,
  pos?: string,
): Promise<void> {
  await playMp3OrTTS(meanAudioUrl(word, pos), mean, "ko-KR", 1);
}

export async function speakKoreanExKo(
  word: string,
  exKo: string,
  pos?: string,
): Promise<void> {
  await playMp3OrTTS(exKoAudioUrl(word, pos), exKo, "ko-KR", 1);
}

export function speakEnglishWordNow(word: string, pos?: string): void {
  cancelPlayback();
  void speakEnglishWord(word, pos);
}

export function speakEnglishExampleNow(
  word: string,
  ex: string,
  pos?: string,
): void {
  cancelPlayback();
  void speakEnglishExample(word, ex, pos);
}

export function speakKoreanMeanNow(
  word: string,
  mean: string,
  pos?: string,
): void {
  cancelPlayback();
  void speakKoreanMean(word, mean, pos);
}

export function speakKoreanExKoNow(
  word: string,
  exKo: string,
  pos?: string,
): void {
  cancelPlayback();
  void speakKoreanExKo(word, exKo, pos);
}

export function preloadAudioUrl(url: string): void {
  if (preloaded.has(url)) return;
  preloaded.add(url);
  const audio = new Audio();
  audio.preload = "auto";
  audio.src = url;
  audio.load();
}

export function preloadWordAudio(word: string, pos?: string): void {
  const urls = [wordAudioUrl(word, pos), meanAudioUrl(word, pos)];
  if (!skipsExamplePhase()) {
    urls.push(exampleAudioUrl(word, pos), exKoAudioUrl(word, pos));
  }
  for (const url of urls) {
    preloadAudioUrl(url);
  }
}

/** 자동재생 시퀀스에서 다음에 재생할 mp3를 미리 로드 */
export function preloadWordSequence(
  word: string,
  step: "word" | "mean" | "ex" | "exko",
  pos?: string,
): void {
  const steps: Record<typeof step, string[]> = skipsExamplePhase()
    ? {
        word: [meanAudioUrl(word, pos)],
        mean: [],
        ex: [],
        exko: [],
      }
    : {
        word: [
          meanAudioUrl(word, pos),
          exampleAudioUrl(word, pos),
          exKoAudioUrl(word, pos),
        ],
        mean: [exampleAudioUrl(word, pos), exKoAudioUrl(word, pos)],
        ex: [exKoAudioUrl(word, pos)],
        exko: [],
      };
  for (const url of steps[step]) preloadAudioUrl(url);
}

/** @deprecated preloadWordAudio 사용 */
export const preloadEnglishAudio = preloadWordAudio;
