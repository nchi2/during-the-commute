/**
 * toeic_level2_setN.json → data/groups.toeic.level02.setNN.mjs 변환
 *
 * 실행:
 *   node scripts/convert-toeic-level02.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcesDir = join(__dirname, "..", "data", "sources");
const dataDir = join(__dirname, "..", "data");

const POS_BASE = {
  v: "동사",
  n: "명사",
  adj: "형용사",
  adv: "부사",
  prep: "전치사",
};

/** njh 패턴: cat 연결 → pos 연결(단, prep는 전치사), cat 표현 + phrase → pos 표현 */
function mapPos(cat, posAbbr) {
  if (cat === "연결") {
    if (posAbbr === "prep") return "전치사";
    return "연결";
  }
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

function writeSetFile({
  exportName,
  setLabel,
  sourceFile,
  groups,
}) {
  const wordCount = groups.reduce((n, g) => n + g.words.length, 0);
  const setNum = setLabel.replace("set", "");
  const filename = `groups.toeic.level02.${setLabel}.mjs`;
  const body = `// 토익 Level 2 Set ${setNum} (${groups.length}개 그룹, ${wordCount}개 항목)
// 원본: data/sources/${sourceFile}
// topic: 추후 주제별 필터용 (화면 미연결)
export const ${exportName} = ${JSON.stringify(groups, null, 2)};
`;
  const outputPath = join(dataDir, filename);
  writeFileSync(outputPath, body, "utf8");
  console.log(`✓ ${outputPath}`);
  console.log(`  ${groups.length} groups, ${wordCount} words`);
}

const SETS = [
  { source: "toeic_level2_set1.json", setLabel: "set01", export: "TOEIC_LEVEL02_SET01_GROUPS" },
  { source: "toeic_level2_set2.json", setLabel: "set02", export: "TOEIC_LEVEL02_SET02_GROUPS" },
  { source: "toeic_level2_set3.json", setLabel: "set03", export: "TOEIC_LEVEL02_SET03_GROUPS" },
  { source: "toeic_level2_set4.json", setLabel: "set04", export: "TOEIC_LEVEL02_SET04_GROUPS" },
  { source: "toeic_level2_set5.json", setLabel: "set05", export: "TOEIC_LEVEL02_SET05_GROUPS" },
  { source: "toeic_level2_set6.json", setLabel: "set06", export: "TOEIC_LEVEL02_SET06_GROUPS" },
  { source: "toeic_level2_set7.json", setLabel: "set07", export: "TOEIC_LEVEL02_SET07_GROUPS" },
  { source: "toeic_level2_set8.json", setLabel: "set08", export: "TOEIC_LEVEL02_SET08_GROUPS" },
];

for (const { source, setLabel, export: exportName } of SETS) {
  const raw = JSON.parse(readFileSync(join(sourcesDir, source), "utf8"));
  writeSetFile({
    exportName,
    setLabel,
    sourceFile: source,
    groups: raw.map(convertGroup),
  });
}
