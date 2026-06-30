import { Capacitor } from "@capacitor/core";
import { NativeAudio } from "@capgo/capacitor-native-audio";
import { audioFileBase, sanitizeAudioFilename } from "./audio-filename.mjs";
import {
  DEFAULT_AUDIO_SUBDIR,
  exampleAudioUrl as buildExampleAudioUrl,
  exKoAudioUrl as buildExKoAudioUrl,
  getAudioSubdirForLevel,
  getAudioSubdirForLifeSentenceLevel,
  getAudioSubdirForToeicLevel,
  meanAudioUrl as buildMeanAudioUrl,
  skipsExamplePhaseForAudioSubdir,
  wordAudioUrl as buildWordAudioUrl,
} from "./audio-paths.mjs";
import { loadPlaybackSettings } from "./storage";
import type { LevelId } from "./storage";
import { prepareTtsText } from "./tts-text.mjs";

export { audioFileBase, sanitizeAudioFilename };

type TtsField = "word" | "mean" | "ex" | "exKo";

function ttsLangFromLocale(lang: string): "ko" | "en" {
  return lang.startsWith("en") ? "en" : "ko";
}

let currentAudioSubdir = DEFAULT_AUDIO_SUBDIR;
/** 품사 충돌 mp3 파일명 — toeic Set 등 데이터셋별 groups */
let currentAudioGroups: { words: { word: string; pos: string }[] }[] | null =
  null;

export function setAudioSubdir(subdir: string): void {
  currentAudioSubdir = subdir;
}

export function setAudioGroups(
  groups: { words: { word: string; pos: string }[] }[] | null,
): void {
  currentAudioGroups = groups;
}

export function getAudioSubdir(): string {
  return currentAudioSubdir;
}

export function setAudioSubdirForLevel(level: LevelId): void {
  setAudioSubdir(getAudioSubdirForLevel(level));
}

export function setAudioSubdirForLifeSentenceLevel(
  lifeSentenceLevelId: string,
): void {
  setAudioSubdir(getAudioSubdirForLifeSentenceLevel(lifeSentenceLevelId));
}

export function setAudioSubdirForToeicLevel(toeicLevelId: string): void {
  setAudioSubdir(getAudioSubdirForToeicLevel(toeicLevelId));
}

export function skipsExamplePhase(): boolean {
  return skipsExamplePhaseForAudioSubdir(currentAudioSubdir);
}

export function wordAudioUrl(word: string, pos?: string): string {
  return buildWordAudioUrl(currentAudioSubdir, word, pos, currentAudioGroups);
}

export function exampleAudioUrl(word: string, pos?: string): string {
  return buildExampleAudioUrl(
    currentAudioSubdir,
    word,
    pos,
    currentAudioGroups,
  );
}

export function meanAudioUrl(word: string, pos?: string): string {
  return buildMeanAudioUrl(currentAudioSubdir, word, pos, currentAudioGroups);
}

export function exKoAudioUrl(word: string, pos?: string): string {
  return buildExKoAudioUrl(currentAudioSubdir, word, pos, currentAudioGroups);
}

let sharedAudio: HTMLAudioElement | null = null;
let keepAliveAudio: HTMLAudioElement | null = null;
let activeResolve: (() => void) | null = null;
let onReadyHandler: (() => void) | null = null;

const AUDIO_READY_EVENT = "canplaythrough";
let stopRequested = false;
const preloaded = new Set<string>();

function isNativeAudioPlatform(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

let nativeAudioConfigured = false;
let nativeCompleteListenerReady = false;
let pendingNativePlay: {
  assetId: string;
  finish: (ok: boolean) => void;
  timeoutId: ReturnType<typeof setTimeout> | null;
} | null = null;

const NATIVE_COMPLETE_BUFFER_SEC = 3;
const NATIVE_DEFAULT_TIMEOUT_SEC = 30;

async function nativeUnload(assetId: string): Promise<void> {
  try {
    await NativeAudio.unload({ assetId });
  } catch (err) {
    console.error("[NativeAudio] unload failed", assetId, err);
  }
}

async function nativeStopAndUnload(assetId: string): Promise<void> {
  try {
    await NativeAudio.stop({ assetId });
  } catch (err) {
    console.error("[NativeAudio] stop failed", assetId, err);
  }
  await nativeUnload(assetId);
}

function urlToAssetId(url: string): string {
  const id = url.replace(/^\//, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  return id || "audio";
}

function webUrlToNativeAsset(webUrl: string): {
  assetPath: string;
  isUrl: boolean;
} {
  const assetPath = webUrl.startsWith("/") ? webUrl.slice(1) : webUrl;
  return { assetPath, isUrl: false };
}

function clearNativePlayTimeout(): void {
  if (pendingNativePlay?.timeoutId != null) {
    clearTimeout(pendingNativePlay.timeoutId);
    pendingNativePlay.timeoutId = null;
  }
}

/** preload resolve 이후 AVAudioPlayer duration이 잡힐 때까지 짧게 대기 */
async function waitForNativeAssetReady(
  assetId: string,
  maxAttempts = 40,
  intervalMs = 25,
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { duration } = await NativeAudio.getDuration({ assetId });
      if (typeof duration === "number" && duration > 0) {
        return true;
      }
    } catch {
      /* 아직 디코더 준비 전 */
    }
    if (stopRequested) return false;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.error("[NativeAudio] asset not ready after preload", assetId);
  return false;
}

function settleNativePlay(ok: boolean): void {
  if (!pendingNativePlay) return;
  clearNativePlayTimeout();
  const { finish, assetId } = pendingNativePlay;
  pendingNativePlay = null;
  activeResolve = null;
  finish(ok);
  // 재생 완료 후 unload 하지 않음 — 다음 재생 시 디코더 재초기화로 첫 음절이 잘릴 수 있음
}

async function armNativePlayTimeout(
  assetId: string,
  playbackRate: number,
): Promise<void> {
  let durationSec = NATIVE_DEFAULT_TIMEOUT_SEC;
  try {
    const { duration } = await NativeAudio.getDuration({ assetId });
    if (typeof duration === "number" && duration > 0) {
      durationSec = duration;
    }
  } catch (err) {
    console.error("[NativeAudio] getDuration failed", assetId, err);
  }

  const timeoutMs =
    (durationSec / Math.max(playbackRate, 0.1) + NATIVE_COMPLETE_BUFFER_SEC) *
    1000;

  if (!pendingNativePlay || pendingNativePlay.assetId !== assetId) return;

  pendingNativePlay.timeoutId = setTimeout(() => {
    if (!pendingNativePlay || pendingNativePlay.assetId !== assetId) return;
    console.error(
      "[NativeAudio] complete event timeout",
      assetId,
      `${Math.round(timeoutMs)}ms`,
    );
    void (async () => {
      await nativeStopAndUnload(assetId);
      settleNativePlay(true);
    })();
  }, timeoutMs);
}

async function ensureNativeAudioReady(): Promise<void> {
  if (nativeAudioConfigured) return;
  await NativeAudio.configure({
    backgroundPlayback: true,
    showNotification: true,
    background: true,
    focus: true,
  });
  if (!nativeCompleteListenerReady) {
    await NativeAudio.addListener("complete", (event) => {
      if (pendingNativePlay?.assetId !== event.assetId) return;
      settleNativePlay(true);
    });
    nativeCompleteListenerReady = true;
  }
  nativeAudioConfigured = true;
}

async function preloadNativeAudio(url: string): Promise<void> {
  if (!isNativeAudioPlatform()) return;
  try {
    await ensureNativeAudioReady();
    const assetId = urlToAssetId(url);
    const { assetPath, isUrl } = webUrlToNativeAsset(url);
    const { found } = await NativeAudio.isPreloaded({
      assetId,
      assetPath,
      isUrl,
    });
    if (!found) {
      await NativeAudio.preload({
        assetId,
        assetPath,
        isUrl,
        audioChannelNum: 1,
      });
    }
  } catch (err) {
    console.error("[NativeAudio] preload failed", url, err);
  }
}

async function stopNativePlayback(): Promise<void> {
  if (!pendingNativePlay) return;
  clearNativePlayTimeout();
  const { assetId, finish } = pendingNativePlay;
  pendingNativePlay = null;
  await nativeStopAndUnload(assetId);
  finish(false);
}

function playMp3NativeOnce(url: string, playbackRate = 1): Promise<boolean> {
  return new Promise((resolve, reject) => {
    stopRequested = false;

    const done = (ok: boolean) => {
      clearNativePlayTimeout();
      if (pendingNativePlay?.finish === finish) pendingNativePlay = null;
      if (activeResolve === onCancel) activeResolve = null;
      resolve(ok);
    };

    const onCancel = () => {
      if (pendingNativePlay) {
        void stopNativePlayback();
        return;
      }
      activeResolve = null;
      done(false);
    };
    const finish = (ok: boolean) => done(ok);

    activeResolve = onCancel;

    void (async () => {
      try {
        await ensureNativeAudioReady();
        const assetId = urlToAssetId(url);
        const { assetPath, isUrl } = webUrlToNativeAsset(url);

        if (stopRequested) {
          done(false);
          return;
        }

        const { found } = await NativeAudio.isPreloaded({
          assetId,
          assetPath,
          isUrl,
        });
        if (!found) {
          await NativeAudio.preload({
            assetId,
            assetPath,
            isUrl,
            audioChannelNum: 1,
          });
        }

        if (stopRequested) {
          done(false);
          return;
        }

        const ready = await waitForNativeAssetReady(assetId);
        if (!ready || stopRequested) {
          done(false);
          return;
        }

        pendingNativePlay = { assetId, finish, timeoutId: null };

        if (playbackRate !== 1) {
          try {
            await NativeAudio.setRate({ assetId, rate: playbackRate });
          } catch (err) {
            console.error("[NativeAudio] setRate failed", assetId, err);
          }
        }

        // time: 0 생략 — 재생 직전 seek가 첫 음절을 잘라냄. 짧은 delay로 오디오 세션 안정화.
        await NativeAudio.play({ assetId, delay: 0.05 });
        await armNativePlayTimeout(assetId, playbackRate);
      } catch (err) {
        console.error("[NativeAudio] preload/play failed", url, err);
        pendingNativePlay = null;
        clearNativePlayTimeout();
        reject(err);
      }
    })();
  });
}

async function playMp3Native(url: string, playbackRate = 1): Promise<boolean> {
  try {
    return await playMp3NativeOnce(url, playbackRate);
  } catch (err) {
    console.error(
      "[NativeAudio] play failed, falling back to HTMLAudio",
      url,
      err,
    );
    return playMp3Web(url, playbackRate);
  }
}

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

/** 학습 자동재생 중 iOS 오디오 세션 유지 (무음 루프) — 웹/PWA 전용 */
export function startAudioKeepAlive(): void {
  if (isNativeAudioPlatform()) return;
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
  if (isNativeAudioPlatform()) return;
  if (!keepAliveAudio) return;
  keepAliveAudio.pause();
  keepAliveAudio.src = "";
  keepAliveAudio.remove();
  keepAliveAudio = null;
}

/** 백그라운드 복귀 시 오디오 세션 재활성화 — 웹/PWA 전용 */
export function reclaimAudioSession(): void {
  if (isNativeAudioPlatform()) return;
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
  if (isNativeAudioPlatform()) {
    void stopNativePlayback();
    activeResolve = null;
    return;
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

function playMp3Web(url: string, playbackRate = 1): Promise<boolean> {
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
      // canplaythrough 이후 currentTime 재설정은 iOS/Safari에서 seek로 첫 음절이 잘림
      audio.playbackRate = playbackRate;
      audio.play().catch(() => done(false));
    };

    audio.onended = () => done(true);
    audio.onerror = () => done(false);

    audio.pause();
    audio.src = url;
    onReadyHandler = startPlay;
    audio.addEventListener(AUDIO_READY_EVENT, onReadyHandler, { once: true });
    audio.load();
  });
}

function playMp3(url: string, playbackRate = 1): Promise<boolean> {
  if (isNativeAudioPlatform()) {
    return playMp3Native(url, playbackRate);
  }
  return playMp3Web(url, playbackRate);
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
  field?: TtsField,
): Promise<void> {
  const ok = await playMp3(url, playbackRate);
  if (stopRequested) return;
  if (!ok) {
    const ttsRate = lang.startsWith("en") ? 0.92 * playbackRate : 0.92;
    const prepared = prepareTtsText(fallbackText, {
      lang: ttsLangFromLocale(lang),
      field,
    });
    await speakOnceTTS(prepared, lang, ttsRate);
  }
}

export async function speakEnglishWord(word: string, pos?: string): Promise<void> {
  const rate = getEnglishPlaybackRate();
  await playMp3OrTTS(wordAudioUrl(word, pos), word, "en-US", rate, "word");
}

export async function speakEnglishExample(
  word: string,
  ex: string,
  pos?: string,
): Promise<void> {
  const rate = getEnglishPlaybackRate();
  await playMp3OrTTS(exampleAudioUrl(word, pos), ex, "en-US", rate, "ex");
}

export async function speakKoreanMean(
  word: string,
  mean: string,
  pos?: string,
): Promise<void> {
  await playMp3OrTTS(meanAudioUrl(word, pos), mean, "ko-KR", 1, "mean");
}

export async function speakKoreanExKo(
  word: string,
  exKo: string,
  pos?: string,
): Promise<void> {
  await playMp3OrTTS(exKoAudioUrl(word, pos), exKo, "ko-KR", 1, "exKo");
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
  if (isNativeAudioPlatform()) {
    void preloadNativeAudio(url);
    return;
  }
  const audio = new Audio();
  audio.preload = "auto";
  audio.src = url;
  audio.load();
}

export function preloadWordAudio(word: string, pos?: string): void {
  const { playWord, playMean, playExample } = loadPlaybackSettings();
  const urls: string[] = [];
  if (playWord) urls.push(wordAudioUrl(word, pos));
  if (playMean) urls.push(meanAudioUrl(word, pos));
  if (playExample && !skipsExamplePhase()) {
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
  const { playWord, playMean, playExample } = loadPlaybackSettings();
  const withExample = playExample && !skipsExamplePhase();
  const chain: string[] = [];
  if (step === "word") {
    if (playMean) chain.push(meanAudioUrl(word, pos));
    if (withExample) {
      chain.push(exampleAudioUrl(word, pos), exKoAudioUrl(word, pos));
    }
  } else if (step === "mean") {
    if (withExample) {
      chain.push(exampleAudioUrl(word, pos), exKoAudioUrl(word, pos));
    }
  } else if (step === "ex") {
    chain.push(exKoAudioUrl(word, pos));
  }
  for (const url of chain) preloadAudioUrl(url);
}

/** @deprecated preloadWordAudio 사용 */
export const preloadEnglishAudio = preloadWordAudio;
