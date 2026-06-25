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

/** 같은 영단어 텍스트에 품사가 여러 개인 경우만 pos 접미사를 붙인다 */
export const AMBIGUOUS_WORD_KEYS = buildAmbiguousWordKeys(GROUPS);

export function audioFileBase(word, pos) {
  const base = sanitizeAudioFilename(word);
  if (pos && AMBIGUOUS_WORD_KEYS.has(base)) {
    return `${base}-${sanitizePosSuffix(pos)}`;
  }
  return base;
}
