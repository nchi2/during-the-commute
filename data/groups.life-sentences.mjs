/**
 * 생활 문장 레벨 레지스트리
 *
 * 새 레벨 추가:
 *   1. data/groups.life-sentences.levelXX.mjs 작성
 *   2. 아래 LIFE_SENTENCE_LEVELS에 import + 항목 추가 (active: true)
 *   3. DATASET=life-sentences LIFE_SENTENCE_LEVEL=levelXX node --env-file=.env scripts/generate-audio.mjs
 */
import { LIFE_SENTENCE_LEVEL01_GROUPS } from "./groups.life-sentences.level01.mjs";

export const LIFE_SENTENCE_LEVELS = [
  {
    id: "level01",
    label: "Level 1",
    desc: "생활 문장",
    groups: LIFE_SENTENCE_LEVEL01_GROUPS,
    active: true,
  },
  {
    id: "level02",
    label: "Level 2",
    desc: "준비 중",
    groups: [],
    active: false,
  },
  {
    id: "level03",
    label: "Level 3",
    desc: "준비 중",
    groups: [],
    active: false,
  },
  {
    id: "level04",
    label: "Level 4",
    desc: "준비 중",
    groups: [],
    active: false,
  },
  {
    id: "level05",
    label: "Level 5",
    desc: "준비 중",
    groups: [],
    active: false,
  },
];
