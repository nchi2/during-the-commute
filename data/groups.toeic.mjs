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
import { TOEIC_LEVEL02_SET01_GROUPS } from "./groups.toeic.level02.set01.mjs";
import { TOEIC_LEVEL02_SET02_GROUPS } from "./groups.toeic.level02.set02.mjs";
import { TOEIC_LEVEL02_SET03_GROUPS } from "./groups.toeic.level02.set03.mjs";
import { TOEIC_LEVEL02_SET04_GROUPS } from "./groups.toeic.level02.set04.mjs";
import { TOEIC_LEVEL02_SET05_GROUPS } from "./groups.toeic.level02.set05.mjs";
import { TOEIC_LEVEL02_SET06_GROUPS } from "./groups.toeic.level02.set06.mjs";
import { TOEIC_LEVEL02_SET07_GROUPS } from "./groups.toeic.level02.set07.mjs";
import { TOEIC_LEVEL02_SET08_GROUPS } from "./groups.toeic.level02.set08.mjs";
import { TOEIC_LEVEL03_SET01_GROUPS } from "./groups.toeic.level03.set01.mjs";

const TOEIC_LEVEL01_SETS = [
  {
    id: "set01",
    label: "Set 1",
    desc: "기초 단어",
    description: "사무·회의·계약·인사·일정",
    groups: TOEIC_LEVEL01_SET01_GROUPS,
    active: true,
  },
  {
    id: "set02",
    label: "Set 2",
    desc: "기초 단어",
    description: "배송·광고·공지·시설·재무·고객서비스",
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

const TOEIC_LEVEL02_SETS = [
  {
    id: "set01",
    label: "Set 1",
    desc: "중급 단어",
    description: "전문어 진입 + 첫 혼동쌍",
    groups: TOEIC_LEVEL02_SET01_GROUPS,
    active: true,
  },
  {
    id: "set02",
    label: "Set 2",
    desc: "중급 단어",
    description: "전문 가족 + 혼동쌍",
    groups: TOEIC_LEVEL02_SET02_GROUPS,
    active: true,
  },
  {
    id: "set03",
    label: "Set 3",
    desc: "중급 단어",
    description: "전문 가족 + 연결어",
    groups: TOEIC_LEVEL02_SET03_GROUPS,
    active: true,
  },
  {
    id: "set04",
    label: "Set 4",
    desc: "중급 단어",
    description: "전문 가족 + 혼동쌍",
    groups: TOEIC_LEVEL02_SET04_GROUPS,
    active: true,
  },
  {
    id: "set05",
    label: "Set 5",
    desc: "중급 단어",
    description: "전문 가족 + 전치사 혼동쌍",
    groups: TOEIC_LEVEL02_SET05_GROUPS,
    active: true,
  },
  {
    id: "set06",
    label: "Set 6",
    desc: "중급 단어",
    description: "콜로케이션 + 다의어",
    groups: TOEIC_LEVEL02_SET06_GROUPS,
    active: true,
  },
  {
    id: "set07",
    label: "Set 7",
    desc: "중급 단어",
    description: "다의어 + 혼동쌍",
    groups: TOEIC_LEVEL02_SET07_GROUPS,
    active: true,
  },
  {
    id: "set08",
    label: "Set 8",
    desc: "중급 단어",
    description: "다의어 + 혼동쌍 마무리",
    groups: TOEIC_LEVEL02_SET08_GROUPS,
    active: true,
  },
];

const TOEIC_LEVEL03_SETS = [
  {
    id: "set01",
    label: "Set 1",
    desc: "고급 단어",
    description: "종합 변별: 파생뉘앙스·형태함정·다의어·격식체",
    groups: TOEIC_LEVEL03_SET01_GROUPS,
    active: true,
  },
  {
    id: "set02",
    label: "Set 2",
    desc: "준비 중",
    groups: [],
    active: false,
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
    desc: "601~750점",
    sets: TOEIC_LEVEL02_SETS,
    active: true,
  },
  {
    id: "level03",
    label: "Level 3",
    desc: "751~900점",
    sets: TOEIC_LEVEL03_SETS,
    active: true,
  },
];
