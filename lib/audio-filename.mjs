/** generate-audio.mjs 와 앱 재생 로직이 공유하는 mp3 파일명 규칙 */
export function sanitizeAudioFilename(word) {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}
