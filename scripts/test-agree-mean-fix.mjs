/**
 * agree mean TTS 해결책 A/B 비교 샘플 생성
 *
 * 실행:
 *   node --env-file=.env scripts/test-agree-mean-fix.mjs
 *
 * 출력 (public/audio/_tts-test/ko-mean/):
 *   agree-baseline.mp3      — 현재 agree-ko.mp3 복사
 *   agree-method-a.mp3      — 방법 A: 마지막 마침표 (prepareTtsText)
 *   agree-method-b.mp3      — 방법 B: segment별 TTS + concat
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { prepareTtsText, splitKoMeanSegments } from "../lib/tts-text.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "audio", "_tts-test", "ko-mean");
const TMP_DIR = join(OUT_DIR, "_tmp-agree");
const BASELINE = join(
  __dirname,
  "..",
  "public",
  "audio",
  "toeic",
  "level01",
  "agree-ko.mp3",
);

const TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const VOICE_KO = { languageCode: "ko-KR", name: "ko-KR-Chirp3-HD-Charon" };

const RAW_MEAN = "동의하다, 합의하다";

async function synthesize(text, apiKey) {
  const res = await fetch(`${TTS_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: VOICE_KO,
      audioConfig: { audioEncoding: "MP3" },
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const { audioContent } = await res.json();
  return Buffer.from(audioContent, "base64");
}

function mp3Duration(path) {
  const out = execFileSync("afinfo", [path], { encoding: "utf8" });
  const m = out.match(/estimated duration:\s*([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

function concatMp3(segmentPaths, outputPath) {
  const buffers = segmentPaths.map((p) => readFileSync(p));
  writeFileSync(outputPath, Buffer.concat(buffers));
}

const apiKey = process.env.GOOGLE_TTS_KEY;
if (!apiKey) {
  console.error("GOOGLE_TTS_KEY 필요");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(TMP_DIR, { recursive: true });

const methodAText = prepareTtsText(RAW_MEAN, { lang: "ko", field: "mean" });
const segments = splitKoMeanSegments(RAW_MEAN);

console.log("=== agree mean 비교 ===");
console.log("raw:", RAW_MEAN);
console.log("방법 A TTS 입력:", methodAText);
console.log("방법 B segments:", segments);

if (existsSync(BASELINE)) {
  copyFileSync(BASELINE, join(OUT_DIR, "agree-baseline.mp3"));
  console.log(`\n✓ agree-baseline.mp3 ← 현재 agree-ko.mp3 (${mp3Duration(BASELINE)}s)`);
} else {
  console.warn("\n- agree-ko.mp3 없음 — baseline 스킵");
}

// 방법 A
const pathA = join(OUT_DIR, "agree-method-a.mp3");
writeFileSync(pathA, await synthesize(methodAText, apiKey));
console.log(`✓ agree-method-a.mp3 [방법 A: ${methodAText}] (${mp3Duration(pathA)}s)`);

// 방법 B
const segPaths = [];
for (let i = 0; i < segments.length; i++) {
  const segPath = join(TMP_DIR, `seg-${i}.mp3`);
  writeFileSync(segPath, await synthesize(segments[i], apiKey));
  segPaths.push(segPath);
  console.log(`  segment ${i + 1}: "${segments[i]}" (${mp3Duration(segPath)}s)`);
}
const pathB = join(OUT_DIR, "agree-method-b.mp3");
concatMp3(segPaths, pathB);
console.log(`✓ agree-method-b.mp3 [방법 B: concat × ${segments.length}] (${mp3Duration(pathB)}s)`);

for (const p of segPaths) {
  try {
    unlinkSync(p);
  } catch {
    /* noop */
  }
}

console.log("\n=== 들어보기 ===");
console.log("  public/audio/_tts-test/ko-mean/agree-baseline.mp3  (현재)");
console.log("  public/audio/_tts-test/ko-mean/agree-method-a.mp3   (마침표)");
console.log("  public/audio/_tts-test/ko-mean/agree-method-b.mp3   (segment concat)");

console.log("\n=== 방법 B 일반화 검토 ===");
console.log("  · prepareTtsText 후 segment 분리 → segment마다 TTS → mp3 이어붙임");
console.log("  · 동일 API/코덱이면 Buffer concat으로 충분 (ffmpeg 불필요)");
console.log("  · multi-mean(쉼표 2개+=3 segment) 전체에 적용 가능");
console.log("  · mp3 1개/file 유지 — 재생 코드 변경 불필요");
