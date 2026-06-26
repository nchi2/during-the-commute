/**
 * Google Cloud TTS로 단어·예문·한글 뜻 mp3를 생성하는 일회성 스크립트.
 *
 * 사전 준비:
 *   cp .env.example .env
 *   # .env 에 GOOGLE_TTS_KEY=YOUR_API_KEY 설정
 *
 * 데이터셋 (DATASET 환경변수, 기본값 GROUPS):
 *   GROUPS     — data/groups.mjs (영어 단어장, 기본)
 *   mom        — data/groups.mom.mjs (어무니 생활 문장)
 *   toeic      — data/groups.toeic.level01.mjs (토익 Level 1)
 *
 * 테스트 (첫 항목 1~2개):
 *   TEST_ONLY=1 node --env-file=.env scripts/generate-audio.mjs
 *   DATASET=mom TEST_ONLY=1 node --env-file=.env scripts/generate-audio.mjs
 *   DATASET=toeic LEVEL=1 TEST_ONLY=1 node --env-file=.env scripts/generate-audio.mjs
 *
 * 전체 생성:
 *   node --env-file=.env scripts/generate-audio.mjs
 *   DATASET=mom MOM_LEVEL=level01 node --env-file=.env scripts/generate-audio.mjs
 *     → public/audio/mom/level01/
 *   DATASET=toeic LEVEL=1 node --env-file=.env scripts/generate-audio.mjs
 *     → public/audio/toeic/level01/
 */

import { writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { GROUPS } from "../data/groups.mjs";
import { MOM_LEVELS } from "../data/groups.mom.mjs";
import { TOEIC_LEVEL01_GROUPS } from "../data/groups.toeic.level01.mjs";
import { audioFileBase } from "../lib/audio-filename.mjs";
import { getAudioSubdirForDataset } from "../lib/audio-paths.mjs";
import { prepareTtsText } from "../lib/tts-text.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_ROOT = join(__dirname, "..", "public", "audio");
const DELAY_MS = 200;

const TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

const VOICES = {
  en: { languageCode: "en-US", name: "en-US-Chirp3-HD-Charon" },
  ko: { languageCode: "ko-KR", name: "ko-KR-Chirp3-HD-Charon" },
};

const VOICES_MOM = {
  en: { languageCode: "en-US", name: "en-US-Chirp3-HD-Leda" },
  ko: { languageCode: "ko-KR", name: "ko-KR-Chirp3-HD-Leda" },
};

const dataset = (process.env.DATASET || "default").toLowerCase();
const isMom = dataset === "mom";
const isToeic = dataset === "toeic";

function normalizeToeicLevelId(raw) {
  const value = String(raw ?? "1").trim().toLowerCase();
  if (value === "1" || value === "01" || value === "level01" || value === "level1") {
    return "level01";
  }
  if (value.startsWith("level")) return value;
  return `level${value.padStart(2, "0")}`;
}

const momLevelId = process.env.MOM_LEVEL || "level01";
const toeicLevelId = normalizeToeicLevelId(
  process.env.TOEIC_LEVEL || process.env.LEVEL || "1",
);
const momEntry = isMom ? MOM_LEVELS.find((l) => l.id === momLevelId) : null;

let groups;
let datasetLabel;
let audioLevelId;

if (isMom) {
  groups = momEntry?.groups ?? [];
  datasetLabel = `MOM ${momLevelId}`;
  audioLevelId = momLevelId;
} else if (isToeic) {
  if (toeicLevelId !== "level01") {
    console.error(`알 수 없는 TOEIC LEVEL: ${process.env.LEVEL ?? process.env.TOEIC_LEVEL}`);
    console.error("  현재 사용 가능: 1 (level01)");
    process.exit(1);
  }
  groups = TOEIC_LEVEL01_GROUPS;
  datasetLabel = `TOEIC ${toeicLevelId}`;
  audioLevelId = toeicLevelId;
} else {
  groups = GROUPS;
  datasetLabel = "GROUPS";
  audioLevelId = "level01";
}

const AUDIO_SUBDIR = getAudioSubdirForDataset(dataset, audioLevelId);
const AUDIO_DIR = join(AUDIO_ROOT, AUDIO_SUBDIR);
const voices = isMom ? VOICES_MOM : VOICES;

if (isMom && !momEntry) {
  console.error(`알 수 없는 MOM_LEVEL: ${momLevelId}`);
  console.error(`  사용 가능: ${MOM_LEVELS.map((l) => l.id).join(", ")}`);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesize(text, voice, apiKey) {
  const res = await fetch(`${TTS_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice,
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

async function saveMp3(text, filename, wordLabel, apiKey, voice, lang, field) {
  const filePath = join(AUDIO_DIR, filename);
  const ttsLang = lang === "en" ? "en" : "ko";
  const ttsText = prepareTtsText(text, { lang: ttsLang, field });

  if (existsSync(filePath)) {
    console.log(`- ${filename} [${lang}] 이미 존재 — 건너뜀`);
    return;
  }

  try {
    const audio = await synthesize(ttsText, voice, apiKey);
    writeFileSync(filePath, audio);
    console.log(`✓ ${filename} [${lang}] 생성됨`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `✗ ${filename} [${lang}] 실패 (단어: ${wordLabel}): ${message}`,
    );
    return;
  }

  await sleep(DELAY_MS);
}

function copyMp3(srcFilename, destFilename, wordLabel) {
  const srcPath = join(AUDIO_DIR, srcFilename);
  const destPath = join(AUDIO_DIR, destFilename);

  if (existsSync(destPath)) {
    console.log(`- ${destFilename} 이미 존재 — 건너뜀`);
    return;
  }

  if (!existsSync(srcPath)) {
    console.error(
      `✗ ${destFilename} 복사 실패 (단어: ${wordLabel}): ${srcFilename} 없음`,
    );
    return;
  }

  copyFileSync(srcPath, destPath);
  console.log(`✓ ${destFilename} ← ${srcFilename} 복사됨`);
}

async function generateMomWord({ word, mean, pos }, apiKey, { includeEnglish }) {
  const base = audioFileBase(word, pos, groups);

  if (includeEnglish) {
    await saveMp3(word, `${base}.mp3`, word, apiKey, voices.en, "en", "word");
  }

  await saveMp3(mean, `${base}-ko.mp3`, word, apiKey, voices.ko, "ko", "mean");
}

async function generateDefaultWord({ word, ex, mean, exKo, pos }, apiKey, { includeEnglish }) {
  const base = audioFileBase(word, pos, groups);

  if (includeEnglish) {
    await saveMp3(word, `${base}.mp3`, word, apiKey, voices.en, "en", "word");
    await saveMp3(ex, `${base}-ex.mp3`, word, apiKey, voices.en, "en", "ex");
  }

  await saveMp3(mean, `${base}-ko.mp3`, word, apiKey, voices.ko, "ko", "mean");
  await saveMp3(exKo, `${base}-exko.mp3`, word, apiKey, voices.ko, "ko", "exKo");
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

const allWords = groups.flatMap((g) => g.words);
const testLimit = testOnly ? (isToeic ? 2 : 1) : allWords.length;
const words = allWords.slice(0, testLimit);
const includeEnglish = !testOnly || isMom || isToeic;

if (testOnly) {
  console.log(
    `TEST_ONLY [${datasetLabel}] → audio/${AUDIO_SUBDIR}/: 첫 ${words.length}개 항목 (${words[0]?.word?.slice(0, 40)}…)`,
  );
  if (isMom) {
    console.log("  → 영어 1 + 한국어 1 TTS");
  } else if (isToeic) {
    console.log("  → 영어 2 + 한국어 2 TTS × 항목 (word/ex/mean/exKo)");
  } else {
    console.log("  → 한국어 2개 mp3만 생성");
  }
} else if (isMom) {
  console.log(
    `전체 ${words.length}개 문장 × 2 TTS (${datasetLabel}) → audio/${AUDIO_SUBDIR}/`,
  );
} else {
  console.log(
    `전체 ${words.length}개 단어 × 4개 mp3 (${datasetLabel}) → audio/${AUDIO_SUBDIR}/`,
  );
}

for (const entry of words) {
  if (isMom) {
    await generateMomWord(entry, apiKey, { includeEnglish });
  } else {
    await generateDefaultWord(entry, apiKey, { includeEnglish });
  }
}

if (testOnly) {
  console.log("\n테스트 완료. 전체 생성:");
  if (isMom) {
    console.log("  DATASET=mom MOM_LEVEL=level01 node --env-file=.env scripts/generate-audio.mjs");
  } else if (isToeic) {
    console.log("  DATASET=toeic LEVEL=1 node --env-file=.env scripts/generate-audio.mjs");
  } else {
    console.log("  node --env-file=.env scripts/generate-audio.mjs");
  }
}
