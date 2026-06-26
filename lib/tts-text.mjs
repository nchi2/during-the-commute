/**
 * 화면 표기용 텍스트 → TTS/mp3 생성용 텍스트 정제.
 * UI 데이터(groups.mjs 등)는 건드리지 않고, 음성 합성 직전에만 적용한다.
 */

/** @typedef {"word" | "mean" | "ex" | "exKo"} TtsField */
/** @typedef {"ko" | "en"} TtsLang */

const PAREN_RE = /\([^)]*\)/g;

const KO_TILDE_RULES = [
  [/계속\s*~/g, "계속 "],
  [/~\s*에\s/g, "이것에 "],
  [/~\s*을\s/g, "이것을 "],
  [/~\s*를\s/g, "이것을 "],
  [/~\s*와\s/g, "이것과 "],
  [/~\s*과\s/g, "이것과 "],
  [/~\s*보다는/g, "그것보다는"],
  [/~\s*보다/g, "그것보다"],
  [/~\s*말고도/g, "말고도"],
  [/~\s*말고/g, "말고"],
  [/~\s*없이/g, "없이"],
  [/~\s*이기\s*때문에/g, "이기 때문에"],
  [/~\s*일\s*수도/g, "일 수도"],
  [/~\s*하는\s*동안/g, "하는 동안"],
  [/~\s*하자마자/g, "하자마자"],
  [/~\s*해왔다/g, "해왔다"],
  [/~\s*할\s/g, "할 "],
  [/~\s*했을/g, "했을"],
  [/^~\s*/g, "이것 "],
  [/~/g, ""],
];

/**
 * @param {string} text
 * @param {{ lang: TtsLang, field?: TtsField }} opts
 */
export function prepareTtsText(text, { lang, field }) {
  if (!text) return text;

  let out = text;

  // C: 괄호 보조설명 제거
  out = out.replace(PAREN_RE, "").replace(/\s+/g, " ").trim();

  if (lang === "ko") {
    // 슬래시 나열 → 문장 구분
    out = out.replace(/\s*\/\s*/g, ". ");

    // A: 물결표 치환
    for (const [pattern, replacement] of KO_TILDE_RULES) {
      out = out.replace(pattern, replacement);
    }

    // B: 쉼표 나열 → 마침표 휴지 (mean, exKo만)
    if (field === "mean" || field === "exKo") {
      out = out.replace(/,/g, ". ");
    }
  } else if (lang === "en") {
    // A: 영어 물결표
    out = out
      .replace(/~\s*,/g, "something,")
      .replace(/\s+~/g, " something")
      .replace(/~\s+/g, "something ")
      .replace(/~/g, "something");
  }

  return out.replace(/\s+/g, " ").replace(/\.{2,}/g, ".").trim();
}
