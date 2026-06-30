/**
 * 한국어 mean TTS 톤 비교 테스트
 *
 * 실행:
 *   node --env-file=.env scripts/test-ko-mean-tts.mjs
 *
 * 출력: public/audio/_tts-test/ko-mean/
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { prepareTtsText } from "../lib/tts-text.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "audio", "_tts-test", "ko-mean");
const TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

const SAMPLES = [
  {
    id: "agree",
    raw: "동의하다, 합의하다",
    note: "토익 agree (쉼표→마침표 정제 후)",
  },
  {
    id: "manage",
    raw: "관리하다, 운영하다, 해내다",
    note: "토익 manage (다의어)",
  },
];

const VOICES = {
  charon: { languageCode: "ko-KR", name: "ko-KR-Chirp3-HD-Charon" },
  neural2A: { languageCode: "ko-KR", name: "ko-KR-Neural2-A" },
  neural2B: { languageCode: "ko-KR", name: "ko-KR-Neural2-B" },
  wavenetA: { languageCode: "ko-KR", name: "ko-KR-Wavenet-A" },
  wavenetB: { languageCode: "ko-KR", name: "ko-KR-Wavenet-B" },
};

async function synthesize(body, apiKey) {
  const res = await fetch(`${TTS_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const { audioContent } = await res.json();
  return Buffer.from(audioContent, "base64");
}

function ensurePeriod(text) {
  const t = text.trim();
  if (!t) return t;
  if (/[.!?。]$/.test(t)) return t;
  return `${t}.`;
}

function buildVariants(prepared) {
  const withPeriod = ensurePeriod(prepared);
  return [
    {
      key: "01-baseline-charon",
      label: "현재 (Charon + prepareTtsText)",
      voice: VOICES.charon,
      input: { text: prepared },
      audioConfig: { audioEncoding: "MP3" },
    },
    {
      key: "02-period-end",
      label: "끝 마침표 강제 (+ Charon)",
      voice: VOICES.charon,
      input: { text: withPeriod },
      audioConfig: { audioEncoding: "MP3" },
    },
    {
      key: "03-rate-110",
      label: "speakingRate 1.10 (+ 마침표)",
      voice: VOICES.charon,
      input: { text: withPeriod },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.1 },
    },
    {
      key: "04-rate-125",
      label: "speakingRate 1.25 (+ 마침표)",
      voice: VOICES.charon,
      input: { text: withPeriod },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.25 },
    },
    {
      key: "05-pitch-minus2",
      label: "pitch -2.0 (+ 마침표)",
      voice: VOICES.charon,
      input: { text: withPeriod },
      audioConfig: { audioEncoding: "MP3", pitch: -2.0 },
    },
    {
      key: "06-rate110-pitch-minus2",
      label: "rate 1.10 + pitch -2.0",
      voice: VOICES.charon,
      input: { text: withPeriod },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.1, pitch: -2.0 },
    },
    {
      key: "07-neural2-a",
      label: "Neural2-A (+ 마침표)",
      voice: VOICES.neural2A,
      input: { text: withPeriod },
      audioConfig: { audioEncoding: "MP3" },
    },
    {
      key: "08-neural2-b",
      label: "Neural2-B (+ 마침표)",
      voice: VOICES.neural2B,
      input: { text: withPeriod },
      audioConfig: { audioEncoding: "MP3" },
    },
    {
      key: "09-wavenet-a",
      label: "Wavenet-A (+ 마침표)",
      voice: VOICES.wavenetA,
      input: { text: withPeriod },
      audioConfig: { audioEncoding: "MP3" },
    },
    {
      key: "10-ssml-prosody-flat",
      label: "SSML prosody flat/rate (+ Charon)",
      voice: VOICES.charon,
      input: {
        ssml: `<speak><prosody rate="105%" pitch="-1st">${withPeriod}</prosody></speak>`,
      },
      audioConfig: { audioEncoding: "MP3" },
    },
    {
      key: "11-ssml-break-after",
      label: "SSML 각 항목 뒤 break (+ Charon)",
      voice: VOICES.charon,
      input: {
        ssml: `<speak>${withPeriod
          .split(".")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => `${s}.<break time="200ms"/>`)
          .join("")}</speak>`,
      },
      audioConfig: { audioEncoding: "MP3" },
    },
    {
      key: "12-single-first-mean",
      label: "첫 뜻만 단독 (Charon + 마침표)",
      voice: VOICES.charon,
      input: {
        text: ensurePeriod(prepared.split(".")[0]?.trim() ?? prepared),
      },
      audioConfig: { audioEncoding: "MP3" },
    },
  ];
}

const apiKey = process.env.GOOGLE_TTS_KEY;
if (!apiKey) {
  console.error("GOOGLE_TTS_KEY 필요");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const report = [];

for (const sample of SAMPLES) {
  const prepared = prepareTtsText(sample.raw, { lang: "ko", field: "mean" });
  console.log(`\n=== ${sample.id}: ${sample.note} ===`);
  console.log(`  raw: ${sample.raw}`);
  console.log(`  prepared: ${prepared}`);

  for (const variant of buildVariants(prepared)) {
    const filename = `${sample.id}-${variant.key}.mp3`;
    const filePath = join(OUT_DIR, filename);
    try {
      const audio = await synthesize(
        {
          input: variant.input,
          voice: variant.voice,
          audioConfig: variant.audioConfig,
        },
        apiKey,
      );
      writeFileSync(filePath, audio);
      console.log(`✓ ${filename} — ${variant.label}`);
      report.push({
        sample: sample.id,
        file: `_tts-test/ko-mean/${filename}`,
        variant: variant.label,
        ok: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`✗ ${filename} — ${variant.label}: ${msg}`);
      report.push({
        sample: sample.id,
        file: filename,
        variant: variant.label,
        ok: false,
        error: msg.slice(0, 120),
      });
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

console.log("\n=== 요약 ===");
for (const sample of SAMPLES) {
  console.log(`\n[${sample.id}]`);
  for (const row of report.filter((r) => r.sample === sample.id)) {
    console.log(`  ${row.ok ? "OK" : "FAIL"} ${row.variant}`);
    if (!row.ok) console.log(`       ${row.error}`);
    else console.log(`       → public/audio/${row.file}`);
  }
}
