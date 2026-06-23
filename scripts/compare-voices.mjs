/**
 * Chirp 3 HD 남성 음성 비교용 임시 스크립트.
 *
 * 실행:
 *   node --env-file=.env scripts/compare-voices.mjs
 *
 * 출력: public/audio/_compare/ 에 8개 mp3 (음성 4종 × 단어/예문)
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "audio", "_compare");
const DELAY_MS = 200;
const TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

const TEXTS = [
  { suffix: "word", text: "succeed" },
  {
    suffix: "ex",
    text: "If the OTC platform succeeds, we can expand the business.",
  },
];

const VOICES = [
  { id: "charon", name: "en-US-Chirp3-HD-Charon" },
  { id: "orus", name: "en-US-Chirp3-HD-Orus" },
  { id: "fenrir", name: "en-US-Chirp3-HD-Fenrir" },
  { id: "puck", name: "en-US-Chirp3-HD-Puck" },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesize(text, voiceName, apiKey) {
  const res = await fetch(`${TTS_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "en-US", name: voiceName },
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

async function saveMp3(text, filename, voiceName, apiKey) {
  try {
    const audio = await synthesize(text, voiceName, apiKey);
    writeFileSync(join(OUT_DIR, filename), audio);
    console.log(`✓ ${filename} 생성됨`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`✗ ${filename} 실패 (음성: ${voiceName}): ${message}`);
    return;
  }

  await sleep(DELAY_MS);
}

const apiKey = process.env.GOOGLE_TTS_KEY;
if (!apiKey) {
  console.error("GOOGLE_TTS_KEY 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

for (const { id, name } of VOICES) {
  for (const { suffix, text } of TEXTS) {
    await saveMp3(text, `${id}-${suffix}.mp3`, name, apiKey);
  }
}
