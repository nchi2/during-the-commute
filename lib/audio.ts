import { sanitizeAudioFilename } from "./audio-filename.mjs";

export { sanitizeAudioFilename };

export function wordAudioUrl(word: string): string {
  return `/audio/${sanitizeAudioFilename(word)}.mp3`;
}

export function exampleAudioUrl(word: string): string {
  return `/audio/${sanitizeAudioFilename(word)}-ex.mp3`;
}

let activeAudio: HTMLAudioElement | null = null;
let activeResolve: (() => void) | null = null;
const preloaded = new Set<string>();

export function cancelPlayback(): void {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* noop */
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio = null;
  }
  if (activeResolve) {
    const resolve = activeResolve;
    activeResolve = null;
    resolve();
  }
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

function playMp3(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.preload = "auto";
    activeAudio = audio;

    const done = (ok: boolean) => {
      if (activeResolve === onCancel) activeResolve = null;
      if (activeAudio === audio) activeAudio = null;
      audio.onended = null;
      audio.onerror = null;
      resolve(ok);
    };

    const onCancel = () => done(false);
    activeResolve = onCancel;

    audio.onended = () => done(true);
    audio.onerror = () => done(false);
    audio.play().catch(() => done(false));
  });
}

export async function speakEnglishWord(word: string): Promise<void> {
  const ok = await playMp3(wordAudioUrl(word));
  if (!ok) await speakOnceTTS(word, "en-US");
}

export async function speakEnglishExample(
  word: string,
  ex: string,
): Promise<void> {
  const ok = await playMp3(exampleAudioUrl(word));
  if (!ok) await speakOnceTTS(ex, "en-US");
}

export function speakEnglishWordNow(word: string): void {
  cancelPlayback();
  void speakEnglishWord(word);
}

export function speakEnglishExampleNow(word: string, ex: string): void {
  cancelPlayback();
  void speakEnglishExample(word, ex);
}

export function speakKoreanOnce(text: string, rate = 0.92): Promise<void> {
  return speakOnceTTS(text, "ko-KR", rate);
}

export function preloadEnglishAudio(word: string): void {
  for (const url of [wordAudioUrl(word), exampleAudioUrl(word)]) {
    if (preloaded.has(url)) continue;
    preloaded.add(url);
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = url;
    audio.load();
  }
}
