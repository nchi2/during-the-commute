import { audioFileBase } from "./audio-filename.mjs";

/** 기본(남정현 등) 단어장 mp3 하위 폴더 */
export const DEFAULT_AUDIO_SUBDIR = "njh";

/** 남정현 등 njh 레벨 ID → public/audio/ 하위 경로 */
const LEVEL_AUDIO_SUBDIR = {
  namjeonghyeon: "njh",
};

export function getLifeSentencesAudioSubdir(lifeSentenceLevelId) {
  return `life-sentences/${lifeSentenceLevelId}`;
}

export function getToeicAudioSubdir(toeicLevelId) {
  return `toeic/${toeicLevelId}`;
}

export function getAudioSubdirForLifeSentenceLevel(lifeSentenceLevelId) {
  return getLifeSentencesAudioSubdir(lifeSentenceLevelId);
}

export function getAudioSubdirForToeicLevel(toeicLevelId) {
  return getToeicAudioSubdir(toeicLevelId);
}

export function getAudioSubdirForLevel(level, lifeSentenceLevelId) {
  if (level === "eomuni") {
    return lifeSentenceLevelId
      ? getLifeSentencesAudioSubdir(lifeSentenceLevelId)
      : getLifeSentencesAudioSubdir("level01");
  }
  return LEVEL_AUDIO_SUBDIR[level] ?? DEFAULT_AUDIO_SUBDIR;
}

export function getAudioSubdirForDataset(dataset, levelId = "level01") {
  const key = (dataset || "default").toLowerCase();
  if (key === "life-sentences" || key === "mom") {
    return getLifeSentencesAudioSubdir(levelId);
  }
  if (key === "toeic") return getToeicAudioSubdir(levelId);
  return DEFAULT_AUDIO_SUBDIR;
}

/** 생활 문장 데이터셋 — 문장 전용, 예문 재생 단계 없음 */
export function skipsExamplePhaseForAudioSubdir(subdir) {
  return subdir.startsWith("life-sentences/");
}

export function skipsExamplePhaseForLevel(level) {
  return level === "eomuni";
}

export function audioUrl(subdir, filename) {
  return `/audio/${subdir}/${filename}`;
}

export function wordAudioUrl(subdir, word, pos, groups) {
  return audioUrl(subdir, `${audioFileBase(word, pos, groups)}.mp3`);
}

export function exampleAudioUrl(subdir, word, pos, groups) {
  return audioUrl(subdir, `${audioFileBase(word, pos, groups)}-ex.mp3`);
}

export function meanAudioUrl(subdir, word, pos, groups) {
  return audioUrl(subdir, `${audioFileBase(word, pos, groups)}-ko.mp3`);
}

export function exKoAudioUrl(subdir, word, pos, groups) {
  return audioUrl(subdir, `${audioFileBase(word, pos, groups)}-exko.mp3`);
}
