/**
 * Google Cloud TTS로 단어·예문 mp3를 생성하는 일회성 스크립트.
 *
 * 사전 준비:
 *   cp .env.example .env
 *   # .env 에 GOOGLE_TTS_KEY=YOUR_API_KEY 설정
 *
 * 테스트 (첫 단어 1개만 — 단어 + 예문 2개 mp3):
 *   TEST_ONLY=1 node --env-file=.env scripts/generate-audio.mjs
 *
 * 전체 생성:
 *   node --env-file=.env scripts/generate-audio.mjs
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { GROUPS } from "../data/groups.mjs";
import { sanitizeAudioFilename } from "../lib/audio-filename.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = join(__dirname, "..", "public", "audio");
const DELAY_MS = 200;

const TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesize(text, apiKey) {
  const res = await fetch(`${TTS_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "en-US", name: "en-US-Chirp3-HD-Charon" },
      audioConfig: { audioEncoding: "MP3" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  const { audioContent } = await res.json();
  return Buffer.from(audioContent, "base64");
}

async function saveMp3(text, filename, wordLabel, apiKey) {
  const filePath = join(AUDIO_DIR, filename);

  if (existsSync(filePath)) {
    console.log(`- ${filename} 이미 존재 — 건너뜀`);
    return;
  }

  try {
    const audio = await synthesize(text, apiKey);
    writeFileSync(filePath, audio);
    console.log(`✓ ${filename} 생성됨`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`✗ ${filename} 실패 (단어: ${wordLabel}): ${message}`);
    return;
  }

  await sleep(DELAY_MS);
}

const apiKey = process.env.GOOGLE_TTS_KEY;
if (!apiKey) {
  console.error("GOOGLE_TTS_KEY 환경변수가 설정되지 않았습니다.");
  console.error("  cp .env.example .env 후 API 키를 입력하세요.");
  process.exit(1);
}

const testOnly =
  process.env.TEST_ONLY === "1" || process.env.TEST_ONLY === "true";

mkdirSync(AUDIO_DIR, { recursive: true });

const allWords = GROUPS.flatMap((g) => g.words);
const words = testOnly ? allWords.slice(0, 1) : allWords;

console.log(
  testOnly
    ? `TEST_ONLY: 첫 단어 1개만 생성 (${words[0]?.word})`
    : `전체 ${words.length}개 단어 생성 시작`,
);

for (const { word, ex } of words) {
  const base = sanitizeAudioFilename(word);
  await saveMp3(word, `${base}.mp3`, word, apiKey);
  await saveMp3(ex, `${base}-ex.mp3`, word, apiKey);
}

if (testOnly) {
  console.log("\n테스트 완료. 전체 단어를 생성하려면:");
  console.log("  node --env-file=.env scripts/generate-audio.mjs");
}
