import { GROUPS } from "../data/groups.mjs";

/** generate-audio.mjs 와 앱 재생 로직이 공유하는 mp3 파일명 규칙 */
export function sanitizeAudioFilename(word) {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function sanitizePosSuffix(pos) {
  return String(pos).replace(/[^a-zA-Z0-9가-힣]/g, "");
}

function buildAmbiguousWordKeys(groups) {
  const posesByKey = new Map();
  for (const g of groups) {
    for (const w of g.words) {
      const key = sanitizeAudioFilename(w.word);
      if (!posesByKey.has(key)) posesByKey.set(key, new Set());
      posesByKey.get(key).add(w.pos);
    }
  }
  const ambiguous = new Set();
  for (const [key, poses] of posesByKey) {
    if (poses.size > 1) ambiguous.add(key);
  }
  return ambiguous;
}

/** njh 단어장 기준 — 앱 재생 시 기본값 */
export const AMBIGUOUS_WORD_KEYS = buildAmbiguousWordKeys(GROUPS);

export function audioFileBase(word, pos, groups) {
  const base = sanitizeAudioFilename(word);
  const ambiguous = groups ? buildAmbiguousWordKeys(groups) : AMBIGUOUS_WORD_KEYS;
  if (pos && ambiguous.has(base)) {
    return `${base}-${sanitizePosSuffix(pos)}`;
  }
  return base;
}
