type Pos = "동사" | "명사" | "형용사" | "부사";

export type Word = {
  pos: Pos;
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
