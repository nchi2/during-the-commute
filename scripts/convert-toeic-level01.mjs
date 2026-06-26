/**
 * toeic_level1_batch1.json → data/groups.toeic.level01.mjs 변환
 *
 * 실행:
 *   node scripts/convert-toeic-level01.mjs [입력.json 경로]
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultInput = join(
  __dirname,
  "..",
  "data",
  "sources",
  "toeic_level1_batch1.json",
);
const inputPath = process.argv[2] ?? defaultInput;
const outputPath = join(__dirname, "..", "data", "groups.toeic.level01.mjs");

const POS_BASE = {
  v: "동사",
  n: "명사",
  adj: "형용사",
  adv: "부사",
};

/** njh 패턴: cat 연결 → pos 연결, cat 표현 + phrase → pos 표현 */
function mapPos(cat, posAbbr) {
  if (cat === "연결") return "연결";
  if (cat === "표현" && posAbbr === "phrase") return "표현";
  if (posAbbr === "phrase") return "표현";
  return POS_BASE[posAbbr] ?? posAbbr;
}

function convertWord(word) {
  const { cat, pos, word: text, mean, ex, exKo } = word;
  return {
    cat,
    pos: mapPos(cat, pos),
    word: text,
    mean,
    ex,
    exKo,
  };
}

function convertGroup(group) {
  return {
    id: group.id,
    concept: group.concept,
    ko: group.ko,
    topic: group.topic,
    words: group.words.map(convertWord),
  };
}

const raw = JSON.parse(readFileSync(inputPath, "utf8"));
const groups = raw.map(convertGroup);
const wordCount = groups.reduce((n, g) => n + g.words.length, 0);

const body = `// 토익 Level 1 — batch 1 (${groups.length}개 그룹, ${wordCount}개 항목)
// 원본: data/sources/toeic_level1_batch1.json
// topic: 추후 주제별 필터용 (화면 미연결)
export const TOEIC_LEVEL01_GROUPS = ${JSON.stringify(groups, null, 2)};
`;

writeFileSync(outputPath, body, "utf8");
console.log(`✓ ${outputPath}`);
console.log(`  ${groups.length} groups, ${wordCount} words`);
