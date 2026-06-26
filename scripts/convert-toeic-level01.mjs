/**
 * toeic_level1_batch1.json → data/groups.toeic.level01.set01|set02.mjs 변환
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
const dataDir = join(__dirname, "..", "data");

/** 그룹 id 기준 분할 — Set 1: id ≤ 25 (70항목), Set 2: 나머지 */
const SPLIT_AFTER_GROUP_ID = 25;

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

function writeSetFile(exportName, setLabel, groups) {
  const wordCount = groups.reduce((n, g) => n + g.words.length, 0);
  const filename = `groups.toeic.level01.${setLabel}.mjs`;
  const body = `// 토익 Level 1 ${setLabel.replace("set", "Set ")} (${groups.length}개 그룹, ${wordCount}개 항목)
// 원본: data/sources/toeic_level1_batch1.json
// topic: 추후 주제별 필터용 (화면 미연결)
export const ${exportName} = ${JSON.stringify(groups, null, 2)};
`;
  const outputPath = join(dataDir, filename);
  writeFileSync(outputPath, body, "utf8");
  console.log(`✓ ${outputPath}`);
  console.log(`  ${groups.length} groups, ${wordCount} words`);
}

const raw = JSON.parse(readFileSync(inputPath, "utf8"));
const groups = raw.map(convertGroup);
const set01 = groups.filter((g) => g.id <= SPLIT_AFTER_GROUP_ID);
const set02 = groups.filter((g) => g.id > SPLIT_AFTER_GROUP_ID);

writeSetFile("TOEIC_LEVEL01_SET01_GROUPS", "set01", set01);
writeSetFile("TOEIC_LEVEL01_SET02_GROUPS", "set02", set02);
