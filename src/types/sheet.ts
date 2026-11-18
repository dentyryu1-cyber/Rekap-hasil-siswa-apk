export type AnswerLetter = 'A' | 'B' | 'C' | 'D' | 'E' | '';

export type ActiveLayout = 'beranda' | 'abc' | 'uraian';

export type ButtonStyleMode = 'wood' | 'tactile' | 'flat' | 'glass';

export type SurveySubMode = 'uraian' | 'angket-4' | 'angket-5' | 'custom';

export type ScoreValue = number | null;

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

export interface UraianStudentRow {
  id: number;
  nama: string;
  kelas: string;
  scores: ScoreValue[];
}

export interface UraianStudentStats {
  filled: number;
  empty: number;
  totalScore: number;
  maxPossible: number;
  averageScore: number | null;
  percentScore: number | null;
}
