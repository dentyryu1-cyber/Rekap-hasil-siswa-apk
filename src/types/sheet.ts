export type AnswerLetter = 'A' | 'B' | 'C' | 'D' | 'E' | '';

export interface StudentRow {
  id: number;
  nama: string;
  kelas: string;
  jawaban: AnswerLetter[];
}

export interface StudentStats {
  filled: number;
  empty: number;
  correct: number;
  wrong: number;
  scorePercent: number | null;
  hasKey: boolean;
}
