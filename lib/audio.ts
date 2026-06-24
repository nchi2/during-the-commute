import { sanitizeAudioFilename } from "./audio-filename.mjs";
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
import type { LevelId } from "./storage";

export { sanitizeAudioFilename };

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

export function wordAudioUrl(word: string): string {
  return buildWordAudioUrl(currentAudioSubdir, word);
}

export function exampleAudioUrl(word: string): string {
  return buildExampleAudioUrl(currentAudioSubdir, word);
}

export function meanAudioUrl(word: string): string {
  return buildMeanAudioUrl(currentAudioSubdir, word);
}

export function exKoAudioUrl(word: string): string {
  return buildExKoAudioUrl(currentAudioSubdir, word);
}

let sharedAudio: HTMLAudioElement | null = null;
let keepAliveAudio: HTMLAudioElement | null = null;
let activeResolve: (() => void) | null = null;
let onCanPlayHandler: (() => void) | null = null;
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
    if (onCanPlayHandler) {
      audio.removeEventListener("canplay", onCanPlayHandler);
      onCanPlayHandler = null;
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

function playMp3(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    stopRequested = false;
    const audio = getSharedAudio();

    const done = (ok: boolean) => {
      audio.onended = null;
      audio.onerror = null;
      if (onCanPlayHandler) {
        audio.removeEventListener("canplay", onCanPlayHandler);
        onCanPlayHandler = null;
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
      audio.play().catch(() => done(false));
    };

    audio.onended = () => done(true);
    audio.onerror = () => done(false);

    audio.pause();
    audio.currentTime = 0;
    audio.src = url;
    audio.load();

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      startPlay();
    } else {
      onCanPlayHandler = startPlay;
      audio.addEventListener("canplay", onCanPlayHandler, { once: true });
    }
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
): Promise<void> {
  const ok = await playMp3(url);
  if (stopRequested) return;
  if (!ok) await speakOnceTTS(fallbackText, lang);
}

export async function speakEnglishWord(word: string): Promise<void> {
  await playMp3OrTTS(wordAudioUrl(word), word, "en-US");
}

export async function speakEnglishExample(
  word: string,
  ex: string,
): Promise<void> {
  await playMp3OrTTS(exampleAudioUrl(word), ex, "en-US");
}

export async function speakKoreanMean(
  word: string,
  mean: string,
): Promise<void> {
  await playMp3OrTTS(meanAudioUrl(word), mean, "ko-KR");
}

export async function speakKoreanExKo(
  word: string,
  exKo: string,
): Promise<void> {
  await playMp3OrTTS(exKoAudioUrl(word), exKo, "ko-KR");
}

export function speakEnglishWordNow(word: string): void {
  cancelPlayback();
  void speakEnglishWord(word);
}

export function speakEnglishExampleNow(word: string, ex: string): void {
  cancelPlayback();
  void speakEnglishExample(word, ex);
}

export function speakKoreanMeanNow(word: string, mean: string): void {
  cancelPlayback();
  void speakKoreanMean(word, mean);
}

export function speakKoreanExKoNow(word: string, exKo: string): void {
  cancelPlayback();
  void speakKoreanExKo(word, exKo);
}

export function preloadAudioUrl(url: string): void {
  if (preloaded.has(url)) return;
  preloaded.add(url);
  const audio = new Audio();
  audio.preload = "auto";
  audio.src = url;
  audio.load();
}

export function preloadWordAudio(word: string): void {
  const urls = [wordAudioUrl(word), meanAudioUrl(word)];
  if (!skipsExamplePhase()) {
    urls.push(exampleAudioUrl(word), exKoAudioUrl(word));
  }
  for (const url of urls) {
    preloadAudioUrl(url);
  }
}

/** 자동재생 시퀀스에서 다음에 재생할 mp3를 미리 로드 */
export function preloadWordSequence(
  word: string,
  step: "word" | "mean" | "ex" | "exko",
): void {
  const steps: Record<typeof step, string[]> = skipsExamplePhase()
    ? {
        word: [meanAudioUrl(word)],
        mean: [],
        ex: [],
        exko: [],
      }
    : {
        word: [meanAudioUrl(word), exampleAudioUrl(word), exKoAudioUrl(word)],
        mean: [exampleAudioUrl(word), exKoAudioUrl(word)],
        ex: [exKoAudioUrl(word)],
        exko: [],
      };
  for (const url of steps[step]) preloadAudioUrl(url);
}

/** @deprecated preloadWordAudio 사용 */
export const preloadEnglishAudio = preloadWordAudio;
