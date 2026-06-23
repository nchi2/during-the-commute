import { sanitizeAudioFilename } from "./audio-filename.mjs";

export { sanitizeAudioFilename };

export function wordAudioUrl(word: string): string {
  return `/audio/${sanitizeAudioFilename(word)}.mp3`;
}

export function exampleAudioUrl(word: string): string {
  return `/audio/${sanitizeAudioFilename(word)}-ex.mp3`;
}

export function meanAudioUrl(word: string): string {
  return `/audio/${sanitizeAudioFilename(word)}-ko.mp3`;
}

export function exKoAudioUrl(word: string): string {
  return `/audio/${sanitizeAudioFilename(word)}-exko.mp3`;
}

let sharedAudio: HTMLAudioElement | null = null;
let activeResolve: (() => void) | null = null;
let onCanPlayHandler: (() => void) | null = null;
let stopRequested = false;
const preloaded = new Set<string>();

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
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
  for (const url of [
    wordAudioUrl(word),
    meanAudioUrl(word),
    exampleAudioUrl(word),
    exKoAudioUrl(word),
  ]) {
    preloadAudioUrl(url);
  }
}

/** 자동재생 시퀀스에서 다음에 재생할 mp3를 미리 로드 */
export function preloadWordSequence(
  word: string,
  step: "word" | "mean" | "ex" | "exko",
): void {
  const steps: Record<typeof step, string[]> = {
    word: [meanAudioUrl(word), exampleAudioUrl(word), exKoAudioUrl(word)],
    mean: [exampleAudioUrl(word), exKoAudioUrl(word)],
    ex: [exKoAudioUrl(word)],
    exko: [],
  };
  for (const url of steps[step]) preloadAudioUrl(url);
}

/** @deprecated preloadWordAudio 사용 */
export const preloadEnglishAudio = preloadWordAudio;
