export type Word = {
  pos: string;
  word: string;
  mean: string;
  ex: string;
  exKo: string;
};

export type WordGroup = {
  id: number;
  concept: string;
  ko: string;
  words: Word[];
};

export const GROUPS: WordGroup[];
