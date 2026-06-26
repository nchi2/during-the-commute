/**
 * 토익 레벨·Set 레지스트리
 *
 * 새 Set 추가:
 *   1. data/groups.toeic.levelXX.setYY.mjs 작성
 *   2. 해당 레벨 sets 배열에 import + 항목 추가 (active: true)
 *   3. DATASET=toeic TOEIC_LEVEL=levelXX TOEIC_SET=setYY node --env-file=.env scripts/generate-audio.mjs
 *
 * 새 레벨 추가:
 *   1. sets 배열과 placeholder Set 정의
 *   2. data/groups.toeic.mjs TOEIC_LEVELS에 항목 추가
 */
import { TOEIC_LEVEL01_SET01_GROUPS } from "./groups.toeic.level01.set01.mjs";
import { TOEIC_LEVEL01_SET02_GROUPS } from "./groups.toeic.level01.set02.mjs";

const TOEIC_LEVEL01_SETS = [
  {
    id: "set01",
    label: "Set 1",
    desc: "기초 단어",
    groups: TOEIC_LEVEL01_SET01_GROUPS,
    active: true,
  },
  {
    id: "set02",
    label: "Set 2",
    desc: "기초 단어",
    groups: TOEIC_LEVEL01_SET02_GROUPS,
    active: true,
  },
  {
    id: "set03",
    label: "Set 3",
    desc: "준비 중",
    groups: [],
    active: false,
  },
  {
    id: "set04",
    label: "Set 4",
    desc: "준비 중",
    groups: [],
    active: false,
  },
];

export const TOEIC_LEVELS = [
  {
    id: "level01",
    label: "Level 1",
    desc: "기초~600점",
    sets: TOEIC_LEVEL01_SETS,
    active: true,
  },
  {
    id: "level02",
    label: "Level 2",
    desc: "준비 중",
    sets: [],
    active: false,
  },
  {
    id: "level03",
    label: "Level 3",
    desc: "준비 중",
    sets: [],
    active: false,
  },
];
