import { audioFileBase } from "./audio-filename.mjs";

/** 기본(남정현 등) 단어장 mp3 하위 폴더 */
export const DEFAULT_AUDIO_SUBDIR = "njh";

/** 남정현 등 njh 레벨 ID → public/audio/ 하위 경로 */
const LEVEL_AUDIO_SUBDIR = {
  namjeonghyeon: "njh",
};

export function getMomAudioSubdir(momLevelId) {
  return `mom/${momLevelId}`;
}

export function getToeicAudioSubdir(toeicLevelId) {
  return `toeic/${toeicLevelId}`;
}

export function getAudioSubdirForMomLevel(momLevelId) {
  return getMomAudioSubdir(momLevelId);
}

export function getAudioSubdirForToeicLevel(toeicLevelId) {
  return getToeicAudioSubdir(toeicLevelId);
}

export function getAudioSubdirForLevel(level, momLevelId) {
  if (level === "eomuni") {
    return momLevelId ? getMomAudioSubdir(momLevelId) : getMomAudioSubdir("level01");
  }
  return LEVEL_AUDIO_SUBDIR[level] ?? DEFAULT_AUDIO_SUBDIR;
}

export function getAudioSubdirForDataset(dataset, levelId = "level01") {
  const key = (dataset || "default").toLowerCase();
  if (key === "mom") return getMomAudioSubdir(levelId);
  if (key === "toeic") return getToeicAudioSubdir(levelId);
  return DEFAULT_AUDIO_SUBDIR;
}

/** mom 계열 데이터셋 — 문장 전용, 예문 재생 단계 없음 */
export function skipsExamplePhaseForAudioSubdir(subdir) {
  return subdir.startsWith("mom/");
}

export function skipsExamplePhaseForLevel(level) {
  return level === "eomuni";
}

export function audioUrl(subdir, filename) {
  return `/audio/${subdir}/${filename}`;
}

export function wordAudioUrl(subdir, word, pos) {
  return audioUrl(subdir, `${audioFileBase(word, pos)}.mp3`);
}

export function exampleAudioUrl(subdir, word, pos) {
  return audioUrl(subdir, `${audioFileBase(word, pos)}-ex.mp3`);
}

export function meanAudioUrl(subdir, word, pos) {
  return audioUrl(subdir, `${audioFileBase(word, pos)}-ko.mp3`);
}

export function exKoAudioUrl(subdir, word, pos) {
  return audioUrl(subdir, `${audioFileBase(word, pos)}-exko.mp3`);
}
