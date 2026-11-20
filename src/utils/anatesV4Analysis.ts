import * as XLSX from 'xlsx';
import type {
  AnswerLetter,
  StudentRow,
  SurveySubMode,
  UraianStudentRow,
} from '../types/sheet';
import { normalizeAnswers } from './answerParser';
import { makeSlug, triggerFileDownload } from './excelExport';
import {
  getCriticalRTable,
  type GroupLabel,
  type OptionCountMode,
  type RankedStudent,
} from './itemAnalysis';
import {
  clampScore,
  normalizeMaxScores,
} from './uraianAnalysis';

export type AnalysisEngineMode = 'rekapinjx' | 'anatesv4' | 'compare';

export type AnatesDifficultyCategory =
  | 'Sangat Sukar'
  | 'Sukar'
  | 'Sedang'
  | 'Mudah'
  | 'Sangat Mudah'
  | '-';

export type AnatesSignificanceLabel =
  | 'Sangat Signifikan'
  | 'Signifikan'
  | 'Tidak Signifikan'
  | '-';

export type AnatesDistractorCode = '***' | '++' | '+' | '-' | '--' | '---';

export interface AnatesDistractorDetail {
  option: Exclude<AnswerLetter, ''>;
  isKey: boolean;
  count: number;
  percent: number;
  upperCount: number;
  lowerCount: number;
  idealCount: number;
  code: AnatesDistractorCode;
  label: string;
}

export interface AnatesV4AbcItemRow {
  questionNumber: number;
  key: AnswerLetter;
  hasKey: boolean;
  correctCount: number;
  difficultyPercent: number;
  difficultyCategory: AnatesDifficultyCategory;
  upperCorrect: number;
  lowerCorrect: number;
  discriminationPercent: number;
  discriminationCategory:
    | 'Baik Sekali'
    | 'Baik'
    | 'Cukup'
    | 'Jelek'
    | 'Negatif'
    | '-';
  correlationR: number | null;
  significance: AnatesSignificanceLabel;
  distractors: AnatesDistractorDetail[];
  goodDistractors: number;
  totalDistractors: number;
  distractorSummary: string;
}

export interface AnatesV4ReliabilityResult {
  studentCount: number;
  itemCount: number;
  meanScore: number;
  stdDev: number;
  splitHalfR: number | null;
  spearmanBrownR: number | null;
  category: string;
  rTable5: number | null;
  rTable1: number | null;
}

export interface FullAnatesV4AbcReport {
  hasSufficientData: boolean;
  reasonIfInsufficient: string;
  optionMode: OptionCountMode;
  groupSize: number;
  reliability: AnatesV4ReliabilityResult;
  rankedStudents: RankedStudent[];
  items: AnatesV4AbcItemRow[];
  summaryCounts: {
    significant: number;
    notSignificant: number;
    veryEasy: number;
    easy: number;
    medium: number;
    hard: number;
    veryHard: number;
  };
}

export interface AnatesV4UraianItemRow {
  itemNumber: number;
  maxScore: number;
  meanScore: number;
  stdDev: number;
  difficultyPercent: number;
  difficultyCategory: Exclude<AnatesDifficultyCategory, '-'>;
  upperMean: number;
  lowerMean: number;
  discriminationPercent: number;
  discriminationCategory:
    | 'Baik Sekali'
    | 'Baik'
    | 'Cukup'
    | 'Jelek'
    | 'Negatif';
  correlationR: number | null;
  significance: Exclude<AnatesSignificanceLabel, '-'>;
  distributionText: string;
}

export interface FullAnatesV4UraianReport {
  hasSufficientData: boolean;
  reasonIfInsufficient: string;
  subMode: SurveySubMode;
  scaleMin: number;
  groupSize: number;
  reliability: AnatesV4ReliabilityResult;
  rankedStudents: RankedStudent[];
  items: AnatesV4UraianItemRow[];
  summaryCounts: {
    significant: number;
    notSignificant: number;
    veryEasy: number;
    easy: number;
    medium: number;
    hard: number;
    veryHard: number;
  };
}

// Two-tailed critical r at alpha = 0.01 for df = n - 2 (n >= 3)
export function getCriticalRTableOnePercent(n: number): number | null {
  if (n < 3) return null;
  const lookup: Record<number, number> = {
    3: 1.0,
    4: 0.99,
    5: 0.959,
    6: 0.917,
    7: 0.875,
    8: 0.834,
    9: 0.798,
    10: 0.765,
    11: 0.735,
    12: 0.708,
    13: 0.684,
    14: 0.661,
    15: 0.641,
    16: 0.623,
    17: 0.606,
    18: 0.59,
    19: 0.575,
    20: 0.561,
    21: 0.549,
    22: 0.537,
    23: 0.526,
    24: 0.515,
    25: 0.505,
    26: 0.496,
    27: 0.487,
    28: 0.479,
    29: 0.471,
    30: 0.463,
  };
  if (lookup[n]) return lookup[n];
  const df = n - 2;
  const z = 2.57583;
  const t =
    z +
    (Math.pow(z, 3) + z) / (4 * df) +
    (5 * Math.pow(z, 5) + 16 * Math.pow(z, 3) + 3 * z) / (96 * df * df);
  const r = t / Math.sqrt(t * t + df);
  return Math.round(r * 1000) / 1000;
}

function classifyAnatesReliability(r: number | null): string {
  if (r === null) return '-';
  if (r >= 0.8) return 'Sangat Tinggi';
  if (r >= 0.6) return 'Tinggi (Reliabel)';
  if (r >= 0.4) return 'Cukup';
  if (r >= 0.2) return 'Rendah';
  return 'Sangat Rendah';
}

function classifyAnatesDifficulty(
  percent: number,
): Exclude<AnatesDifficultyCategory, '-'> {
  if (percent <= 15) return 'Sangat Sukar';
  if (percent <= 30) return 'Sukar';
  if (percent <= 70) return 'Sedang';
  if (percent <= 85) return 'Mudah';
  return 'Sangat Mudah';
}

function classifyAnatesDiscrimination(
  dpPercent: number,
): 'Baik Sekali' | 'Baik' | 'Cukup' | 'Jelek' | 'Negatif' {
  if (dpPercent >= 70) return 'Baik Sekali';
  if (dpPercent >= 40) return 'Baik';
  if (dpPercent >= 20) return 'Cukup';
  if (dpPercent >= 0) return 'Jelek';
  return 'Negatif';
}

function computePearsonCorrelation(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }
  const denom = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
  );
  if (denom <= 0) return null;
  return (n * sumXY - sumX * sumY) / denom;
}

function computeSplitHalfStats(
  oddScores: number[],
  evenScores: number[],
): { splitHalfR: number | null; spearmanBrownR: number | null } {
  const rawR = computePearsonCorrelation(oddScores, evenScores);
  if (rawR === null) {
    return { splitHalfR: null, spearmanBrownR: null };
  }
  const splitHalfR = Math.round(rawR * 1000) / 1000;
  if (1 + rawR <= 0) {
    return { splitHalfR, spearmanBrownR: null };
  }
  const r11 = (2 * rawR) / (1 + rawR);
  return {
    splitHalfR,
    spearmanBrownR: Math.round(r11 * 1000) / 1000,
  };
}

function classifyAnatesDistractor(
  isKey: boolean,
  count: number,
  idealCount: number,
): { code: AnatesDistractorCode; label: string } {
  if (isKey) {
    return { code: '***', label: 'Kunci Jawaban' };
  }
  if (count === 0) {
    return { code: '---', label: 'Sangat Buruk (0)' };
  }
  if (idealCount <= 0) {
    return { code: '--', label: 'Buruk' };
  }
  const ratio = count / idealCount;
  if (ratio >= 0.76 && ratio <= 1.25) {
    return { code: '++', label: 'Sangat Baik' };
  }
  if ((ratio >= 0.51 && ratio < 0.76) || (ratio > 1.25 && ratio <= 1.5)) {
    return { code: '+', label: 'Baik' };
  }
  if ((ratio >= 0.26 && ratio < 0.51) || (ratio > 1.5 && ratio <= 1.75)) {
    return { code: '-', label: 'Kurang Baik' };
  }
  return { code: '--', label: 'Buruk' };
}

export function computeAnatesV4AbcReport(
  rows: StudentRow[],
  questionCount: number,
  answerKey: AnswerLetter[],
  optionMode: OptionCountMode,
): FullAnatesV4AbcReport {
  const normKey = normalizeAnswers(answerKey, questionCount);
  const keyedIndices: number[] = [];
  for (let i = 0; i < questionCount; i++) {
    if (normKey[i] !== '') keyedIndices.push(i);
  }

  const N = rows.length;
  const k = keyedIndices.length;
  const rTable5 = getCriticalRTable(N);
  const rTable1 = getCriticalRTableOnePercent(N);

  if (N < 2 || k === 0) {
    return {
      hasSufficientData: false,
      reasonIfInsufficient:
        k === 0
          ? 'Atur Kunci Jawaban terlebih dahulu pada Langkah 1 untuk melihat olah data versi Anates V4.'
          : 'Tambahkan minimal 2 siswa agar analisis Anates V4 dapat dihitung.',
      optionMode,
      groupSize: 0,
      reliability: {
        studentCount: N,
        itemCount: k,
        meanScore: 0,
        stdDev: 0,
        splitHalfR: null,
        spearmanBrownR: null,
        category: '-',
        rTable5,
        rTable1,
      },
      rankedStudents: [],
      items: [],
      summaryCounts: {
        significant: 0,
        notSignificant: 0,
        veryEasy: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        veryHard: 0,
      },
    };
  }

  const matrix = rows.map((r) => normalizeAnswers(r.jawaban, questionCount));

  const totalScores: number[] = [];
  const oddScores: number[] = [];
  const evenScores: number[] = [];

  for (let sIdx = 0; sIdx < N; sIdx++) {
    let total = 0;
    let odd = 0;
    let even = 0;
    for (const qIdx of keyedIndices) {
      const hit = matrix[sIdx][qIdx] === normKey[qIdx] ? 1 : 0;
      total += hit;
      // Anates V4 odd/even split by item number (1-indexed)
      if ((qIdx + 1) % 2 === 1) odd += hit;
      else even += hit;
    }
    totalScores.push(total);
    oddScores.push(odd);
    evenScores.push(even);
  }

  const meanScore = totalScores.reduce((acc, v) => acc + v, 0) / N;
  const variance =
    totalScores.reduce((acc, v) => acc + Math.pow(v - meanScore, 2), 0) / N;
  const stdDev = Math.sqrt(variance);

  const { splitHalfR, spearmanBrownR } =
    k >= 2
      ? computeSplitHalfStats(oddScores, evenScores)
      : { splitHalfR: null, spearmanBrownR: null };

  const sortedIndices = rows
    .map((_, idx) => idx)
    .sort((a, b) => totalScores[b] - totalScores[a] || a - b);

  const rawGroupSize = Math.max(1, Math.round(N * 0.27));
  const groupSize = Math.min(rawGroupSize, Math.floor(N / 2));
  const upperSet = new Set<number>(sortedIndices.slice(0, groupSize));
  const lowerSet = new Set<number>(sortedIndices.slice(N - groupSize));

  const rankedStudents: RankedStudent[] = sortedIndices.map(
    (origIdx, rankIdx) => {
      const score = totalScores[origIdx];
      const group: GroupLabel = upperSet.has(origIdx)
        ? 'Unggul'
        : lowerSet.has(origIdx)
          ? 'Asor'
          : 'Tengah';
      return {
        id: rows[origIdx].id,
        nama: rows[origIdx].nama || `Siswa ${origIdx + 1}`,
        kelas: rows[origIdx].kelas || '-',
        rank: rankIdx + 1,
        score,
        maxScore: k,
        scorePercent: Math.round((score / k) * 1000) / 10,
        group,
      };
    },
  );

  const optionsList: Array<Exclude<AnswerLetter, ''>> =
    optionMode === 5 ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];

  const summaryCounts = {
    significant: 0,
    notSignificant: 0,
    veryEasy: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    veryHard: 0,
  };

  const items: AnatesV4AbcItemRow[] = [];

  for (let qIdx = 0; qIdx < questionCount; qIdx++) {
    const keyChar = normKey[qIdx];
    const hasKey = keyChar !== '';

    const optionCounts: Record<Exclude<AnswerLetter, ''>, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
    };
    const optionUpper: Record<Exclude<AnswerLetter, ''>, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
    };
    const optionLower: Record<Exclude<AnswerLetter, ''>, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
    };

    let correctCount = 0;
    let upperCorrect = 0;
    let lowerCorrect = 0;
    const itemVec: number[] = [];

    for (let sIdx = 0; sIdx < N; sIdx++) {
      const ans = matrix[sIdx][qIdx];
      if (ans) {
        optionCounts[ans]++;
        if (upperSet.has(sIdx)) optionUpper[ans]++;
        if (lowerSet.has(sIdx)) optionLower[ans]++;
      }
      const x = hasKey && ans === keyChar ? 1 : 0;
      itemVec.push(x);
      if (x === 1) {
        correctCount++;
        if (upperSet.has(sIdx)) upperCorrect++;
        if (lowerSet.has(sIdx)) lowerCorrect++;
      }
    }

    const idealCount =
      optionsList.length > 1
        ? Math.round(((N - correctCount) / (optionsList.length - 1)) * 100) / 100
        : 0;

    const distractors: AnatesDistractorDetail[] = optionsList.map((opt) => {
      const count = optionCounts[opt];
      const percent = Math.round((count / N) * 1000) / 10;
      const isKey = hasKey && opt === keyChar;
      const { code, label } = hasKey
        ? classifyAnatesDistractor(isKey, count, idealCount)
        : { code: '---' as AnatesDistractorCode, label: '-' };
      return {
        option: opt,
        isKey,
        count,
        percent,
        upperCount: optionUpper[opt],
        lowerCount: optionLower[opt],
        idealCount,
        code,
        label,
      };
    });

    const wrongOpts = distractors.filter((d) => !d.isKey);
    const goodDistractors = wrongOpts.filter(
      (d) => d.code === '++' || d.code === '+',
    ).length;

    if (!hasKey) {
      items.push({
        questionNumber: qIdx + 1,
        key: '',
        hasKey: false,
        correctCount: 0,
        difficultyPercent: 0,
        difficultyCategory: '-',
        upperCorrect: 0,
        lowerCorrect: 0,
        discriminationPercent: 0,
        discriminationCategory: '-',
        correlationR: null,
        significance: '-',
        distractors,
        goodDistractors: 0,
        totalDistractors: wrongOpts.length,
        distractorSummary: '-',
      });
      continue;
    }

    const difficultyPercent = Math.round((correctCount / N) * 10000) / 100;
    const difficultyCategory = classifyAnatesDifficulty(difficultyPercent);
    if (difficultyCategory === 'Sangat Mudah') summaryCounts.veryEasy++;
    else if (difficultyCategory === 'Mudah') summaryCounts.easy++;
    else if (difficultyCategory === 'Sedang') summaryCounts.medium++;
    else if (difficultyCategory === 'Sukar') summaryCounts.hard++;
    else summaryCounts.veryHard++;

    const upperRatio = groupSize > 0 ? upperCorrect / groupSize : 0;
    const lowerRatio = groupSize > 0 ? lowerCorrect / groupSize : 0;
    const discriminationPercent =
      Math.round((upperRatio - lowerRatio) * 10000) / 100;
    const discriminationCategory = classifyAnatesDiscrimination(
      discriminationPercent,
    );

    const rawR = computePearsonCorrelation(itemVec, totalScores);
    const correlationR = rawR !== null ? Math.round(rawR * 1000) / 1000 : 0;

    let significance: AnatesSignificanceLabel = 'Tidak Signifikan';
    if (rTable1 !== null && correlationR >= rTable1) {
      significance = 'Sangat Signifikan';
      summaryCounts.significant++;
    } else if (rTable5 !== null && correlationR >= rTable5) {
      significance = 'Signifikan';
      summaryCounts.significant++;
    } else {
      summaryCounts.notSignificant++;
    }

    const distractorSummary = wrongOpts
      .map((d) => `${d.option}:${d.code}`)
      .join(' ');

    items.push({
      questionNumber: qIdx + 1,
      key: keyChar,
      hasKey: true,
      correctCount,
      difficultyPercent,
      difficultyCategory,
      upperCorrect,
      lowerCorrect,
      discriminationPercent,
      discriminationCategory,
      correlationR,
      significance,
      distractors,
      goodDistractors,
      totalDistractors: wrongOpts.length,
      distractorSummary,
    });
  }

  return {
    hasSufficientData: true,
    reasonIfInsufficient: '',
    optionMode,
    groupSize,
    reliability: {
      studentCount: N,
      itemCount: k,
      meanScore: Math.round(meanScore * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      splitHalfR,
      spearmanBrownR,
      category: classifyAnatesReliability(spearmanBrownR),
      rTable5,
      rTable1,
    },
    rankedStudents,
    items,
    summaryCounts,
  };
}

export function computeAnatesV4UraianReport(
  rows: UraianStudentRow[],
  itemCount: number,
  subMode: SurveySubMode,
  scaleMin: number,
  itemMaxScores: number[],
): FullAnatesV4UraianReport {
  const N = rows.length;
  const k = itemCount;
  const rTable5 = getCriticalRTable(N);
  const rTable1 = getCriticalRTableOnePercent(N);

  if (N < 2 || k < 1) {
    return {
      hasSufficientData: false,
      reasonIfInsufficient:
        'Tambahkan minimal 2 peserta dan isi skor butir untuk melihat olah data versi Anates V4.',
      subMode,
      scaleMin,
      groupSize: 0,
      reliability: {
        studentCount: N,
        itemCount: k,
        meanScore: 0,
        stdDev: 0,
        splitHalfR: null,
        spearmanBrownR: null,
        category: '-',
        rTable5,
        rTable1,
      },
      rankedStudents: [],
      items: [],
      summaryCounts: {
        significant: 0,
        notSignificant: 0,
        veryEasy: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        veryHard: 0,
      },
    };
  }

  const normalizedMax = normalizeMaxScores(
    itemMaxScores,
    k,
    subMode === 'angket-4' ? 4 : subMode === 'angket-5' ? 5 : 10,
    scaleMin,
  );

  const matrix: number[][] = rows.map((row) =>
    Array.from({ length: k }, (_, i) => {
      const v = row.scores[i];
      if (v === null || v === undefined || Number.isNaN(v)) return 0;
      return clampScore(v, scaleMin, normalizedMax[i]);
    }),
  );

  const maxTotalPossible = normalizedMax.reduce((acc, m) => acc + m, 0);
  const totalScores: number[] = [];
  const oddScores: number[] = [];
  const evenScores: number[] = [];

  for (let sIdx = 0; sIdx < N; sIdx++) {
    let tot = 0;
    let odd = 0;
    let even = 0;
    for (let qIdx = 0; qIdx < k; qIdx++) {
      const val = matrix[sIdx][qIdx];
      tot += val;
      if ((qIdx + 1) % 2 === 1) odd += val;
      else even += val;
    }
    totalScores.push(Math.round(tot * 100) / 100);
    oddScores.push(Math.round(odd * 100) / 100);
    evenScores.push(Math.round(even * 100) / 100);
  }

  const meanScore = totalScores.reduce((acc, v) => acc + v, 0) / N;
  const variance =
    totalScores.reduce((acc, v) => acc + Math.pow(v - meanScore, 2), 0) / N;
  const stdDev = Math.sqrt(variance);

  const { splitHalfR, spearmanBrownR } =
    k >= 2
      ? computeSplitHalfStats(oddScores, evenScores)
      : { splitHalfR: null, spearmanBrownR: null };

  const sortedIndices = rows
    .map((_, idx) => idx)
    .sort((a, b) => totalScores[b] - totalScores[a] || a - b);

  const rawGroupSize = Math.max(1, Math.round(N * 0.27));
  const groupSize = Math.min(rawGroupSize, Math.floor(N / 2));
  const upperSet = new Set<number>(sortedIndices.slice(0, groupSize));
  const lowerSet = new Set<number>(sortedIndices.slice(N - groupSize));

  const rankedStudents: RankedStudent[] = sortedIndices.map(
    (origIdx, rankIdx) => {
      const score = totalScores[origIdx];
      const group: GroupLabel = upperSet.has(origIdx)
        ? 'Unggul'
        : lowerSet.has(origIdx)
          ? 'Asor'
          : 'Tengah';
      return {
        id: rows[origIdx].id,
        nama: rows[origIdx].nama || `Peserta ${origIdx + 1}`,
        kelas: rows[origIdx].kelas || '-',
        rank: rankIdx + 1,
        score,
        maxScore: maxTotalPossible,
        scorePercent:
          maxTotalPossible > 0
            ? Math.round((score / maxTotalPossible) * 1000) / 10
            : 0,
        group,
      };
    },
  );

  const summaryCounts = {
    significant: 0,
    notSignificant: 0,
    veryEasy: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    veryHard: 0,
  };

  const items: AnatesV4UraianItemRow[] = [];

  for (let qIdx = 0; qIdx < k; qIdx++) {
    const itemMax = Math.max(1, normalizedMax[qIdx]);
    const itemVec: number[] = [];
    let sumX = 0;
    let upperSum = 0;
    let lowerSum = 0;
    const freqMap = new Map<number, number>();

    for (let sIdx = 0; sIdx < N; sIdx++) {
      const x = matrix[sIdx][qIdx];
      itemVec.push(x);
      sumX += x;
      if (upperSet.has(sIdx)) upperSum += x;
      if (lowerSet.has(sIdx)) lowerSum += x;
      const roundedKey = Math.round(x * 10) / 10;
      freqMap.set(roundedKey, (freqMap.get(roundedKey) ?? 0) + 1);
    }

    const itemMean = sumX / N;
    const itemVar =
      itemVec.reduce((acc, v) => acc + Math.pow(v - itemMean, 2), 0) / N;
    const itemStd = Math.sqrt(itemVar);

    // Authentic Anates V4 Uraian: TK% = (mean / Skor Maks) * 100
    const difficultyPercent = Math.max(
      0,
      Math.min(100, Math.round((itemMean / itemMax) * 10000) / 100),
    );
    const difficultyCategory = classifyAnatesDifficulty(difficultyPercent);
    if (difficultyCategory === 'Sangat Mudah') summaryCounts.veryEasy++;
    else if (difficultyCategory === 'Mudah') summaryCounts.easy++;
    else if (difficultyCategory === 'Sedang') summaryCounts.medium++;
    else if (difficultyCategory === 'Sukar') summaryCounts.hard++;
    else summaryCounts.veryHard++;

    const upperMean = groupSize > 0 ? upperSum / groupSize : 0;
    const lowerMean = groupSize > 0 ? lowerSum / groupSize : 0;
    // Authentic Anates V4 Uraian: DP% = ((mean_Unggul - mean_Asor) / Skor Maks) * 100
    const discriminationPercent =
      Math.round(((upperMean - lowerMean) / itemMax) * 10000) / 100;
    const discriminationCategory = classifyAnatesDiscrimination(
      discriminationPercent,
    );

    const rawR = computePearsonCorrelation(itemVec, totalScores);
    const correlationR = rawR !== null ? Math.round(rawR * 1000) / 1000 : 0;

    let significance: Exclude<AnatesSignificanceLabel, '-'> =
      'Tidak Signifikan';
    if (rTable1 !== null && correlationR >= rTable1) {
      significance = 'Sangat Signifikan';
      summaryCounts.significant++;
    } else if (rTable5 !== null && correlationR >= rTable5) {
      significance = 'Signifikan';
      summaryCounts.significant++;
    } else {
      summaryCounts.notSignificant++;
    }

    const sortedFreqs = Array.from(freqMap.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(0, 6)
      .map(([val, cnt]) => `${val}:${cnt}`)
      .join(' · ');

    items.push({
      itemNumber: qIdx + 1,
      maxScore: itemMax,
      meanScore: Math.round(itemMean * 100) / 100,
      stdDev: Math.round(itemStd * 100) / 100,
      difficultyPercent,
      difficultyCategory,
      upperMean: Math.round(upperMean * 100) / 100,
      lowerMean: Math.round(lowerMean * 100) / 100,
      discriminationPercent,
      discriminationCategory,
      correlationR,
      significance,
      distributionText: sortedFreqs,
    });
  }

  return {
    hasSufficientData: true,
    reasonIfInsufficient: '',
    subMode,
    scaleMin,
    groupSize,
    reliability: {
      studentCount: N,
      itemCount: k,
      meanScore: Math.round(meanScore * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      splitHalfR,
      spearmanBrownR,
      category: classifyAnatesReliability(spearmanBrownR),
      rTable5,
      rTable1,
    },
    rankedStudents,
    items,
    summaryCounts,
  };
}

// ================================
// Anates V4 Excel & Text Exporters
// ================================
export type AnatesAbcSectionId =
  | 'rekap'
  | 'reliabilitas'
  | 'unggul-asor'
  | 'daya-pembeda'
  | 'tingkat-kesukaran'
  | 'korelasi'
  | 'pengecoh';

export type AnatesUraianSectionId =
  | 'rekap'
  | 'reliabilitas'
  | 'unggul-asor'
  | 'daya-pembeda'
  | 'tingkat-kesukaran'
  | 'korelasi'
  | 'distribusi';

function buildAnatesAbcAOA(
  section: AnatesAbcSectionId,
  report: FullAnatesV4AbcReport,
): { sheetName: string; filePrefix: string; aoa: (string | number)[][] } {
  const keyed = report.items.filter((it) => it.hasKey);
  const optLetters =
    report.optionMode === 5
      ? ['A', 'B', 'C', 'D', 'E']
      : ['A', 'B', 'C', 'D'];

  switch (section) {
    case 'reliabilitas':
      return {
        sheetName: 'Reliabilitas AnatesV4',
        filePrefix: 'anatesv4-reliabilitas',
        aoa: [
          ['Parameter Pengujian (Metode Anates V4)', 'Nilai'],
          ['Jumlah Subjek (N)', report.reliability.studentCount],
          ['Jumlah Butir Berkunci (k)', report.reliability.itemCount],
          ['Rata-rata Skor', report.reliability.meanScore],
          ['Simpangan Baku', report.reliability.stdDev],
          [
            'Korelasi XY (Belah Dua Ganjil-Genap)',
            report.reliability.splitHalfR ?? '-',
          ],
          [
            'Reliabilitas Tes (Spearman-Brown r11)',
            report.reliability.spearmanBrownR ?? '-',
          ],
          ['Interpretasi Reliabilitas', report.reliability.category],
          ['r Tabel (alpha = 5%)', report.reliability.rTable5 ?? '-'],
          ['r Tabel (alpha = 1%)', report.reliability.rTable1 ?? '-'],
        ],
      };

    case 'unggul-asor':
      return {
        sheetName: 'Unggul Asor AnatesV4',
        filePrefix: 'anatesv4-unggul-asor',
        aoa: [
          ['Peringkat', 'Nama Siswa', 'Kelas', 'Skor', 'Skor Maks', 'Nilai (%)', 'Kelompok (27%)'],
          ...report.rankedStudents.map((st) => [
            st.rank,
            st.nama,
            st.kelas,
            st.score,
            st.maxScore,
            st.scorePercent,
            st.group,
          ]),
        ],
      };

    case 'daya-pembeda':
      return {
        sheetName: 'Daya Pembeda AnatesV4',
        filePrefix: 'anatesv4-daya-pembeda',
        aoa: [
          [
            'No Butir',
            'Kunci',
            `Unggul (n=${report.groupSize})`,
            `Asor (n=${report.groupSize})`,
            'Beda (U - A)',
            'DP (%)',
            'Tafsiran',
          ],
          ...keyed.map((it) => [
            it.questionNumber,
            it.key,
            it.upperCorrect,
            it.lowerCorrect,
            it.upperCorrect - it.lowerCorrect,
            it.discriminationPercent,
            it.discriminationCategory,
          ]),
        ],
      };

    case 'tingkat-kesukaran':
      return {
        sheetName: 'Kesukaran AnatesV4',
        filePrefix: 'anatesv4-tingkat-kesukaran',
        aoa: [
          ['No Butir', 'Kunci', `Jml Benar (N=${report.reliability.studentCount})`, 'TK (%)', 'Tafsiran Anates V4'],
          ...keyed.map((it) => [
            it.questionNumber,
            it.key,
            it.correctCount,
            it.difficultyPercent,
            it.difficultyCategory,
          ]),
        ],
      };

    case 'korelasi':
      return {
        sheetName: 'Korelasi AnatesV4',
        filePrefix: 'anatesv4-korelasi',
        aoa: [
          ['No Butir', 'Kunci', 'Korelasi (r)', 'r Tabel 5%', 'r Tabel 1%', 'Signifikansi'],
          ...keyed.map((it) => [
            it.questionNumber,
            it.key,
            it.correlationR ?? 0,
            report.reliability.rTable5 ?? '-',
            report.reliability.rTable1 ?? '-',
            it.significance,
          ]),
        ],
      };

    case 'pengecoh': {
      const headers: (string | number)[] = ['No', 'Kunci'];
      for (const opt of optLetters) {
        headers.push(`${opt} (Jml)`, `${opt} (Kode)`);
      }
      headers.push('Ringkasan Kode');
      return {
        sheetName: 'Pengecoh AnatesV4',
        filePrefix: 'anatesv4-pengecoh',
        aoa: [
          headers,
          ...keyed.map((it) => {
            const line: (string | number)[] = [it.questionNumber, it.key];
            for (const d of it.distractors) {
              line.push(d.count, d.code);
            }
            line.push(it.distractorSummary);
            return line;
          }),
        ],
      };
    }

    case 'rekap':
    default:
      return {
        sheetName: 'Rekap AnatesV4',
        filePrefix: 'anatesv4-rekap',
        aoa: [
          [
            'No Butir',
            'Kunci',
            'DP (%)',
            'TK (%)',
            'Tafsiran TK (Anates V4)',
            'Korelasi (r)',
            'Signifikansi',
            'Kode Pengecoh',
          ],
          ...keyed.map((it) => [
            it.questionNumber,
            it.key,
            it.discriminationPercent,
            it.difficultyPercent,
            it.difficultyCategory,
            it.correlationR ?? 0,
            it.significance,
            it.distractorSummary,
          ]),
        ],
      };
  }
}

function buildAnatesUraianAOA(
  section: AnatesUraianSectionId,
  report: FullAnatesV4UraianReport,
): { sheetName: string; filePrefix: string; aoa: (string | number)[][] } {
  switch (section) {
    case 'reliabilitas':
      return {
        sheetName: 'Reliabilitas AnatesV4',
        filePrefix: 'anatesv4-uraian-reliabilitas',
        aoa: [
          ['Parameter Pengujian (Metode Anates V4)', 'Nilai'],
          ['Jumlah Subjek (N)', report.reliability.studentCount],
          ['Jumlah Butir (k)', report.reliability.itemCount],
          ['Rata-rata Skor Total', report.reliability.meanScore],
          ['Simpangan Baku', report.reliability.stdDev],
          [
            'Korelasi XY (Belah Dua Ganjil-Genap)',
            report.reliability.splitHalfR ?? '-',
          ],
          [
            'Reliabilitas Tes (Spearman-Brown r11)',
            report.reliability.spearmanBrownR ?? '-',
          ],
          ['Interpretasi Reliabilitas', report.reliability.category],
          ['r Tabel (alpha = 5%)', report.reliability.rTable5 ?? '-'],
          ['r Tabel (alpha = 1%)', report.reliability.rTable1 ?? '-'],
        ],
      };

    case 'unggul-asor':
      return {
        sheetName: 'Unggul Asor AnatesV4',
        filePrefix: 'anatesv4-uraian-unggul-asor',
        aoa: [
          ['Peringkat', 'Nama Peserta', 'Kelas', 'Skor', 'Skor Maks', 'Capaian (%)', 'Kelompok (27%)'],
          ...report.rankedStudents.map((st) => [
            st.rank,
            st.nama,
            st.kelas,
            st.score,
            st.maxScore,
            st.scorePercent,
            st.group,
          ]),
        ],
      };

    case 'daya-pembeda':
      return {
        sheetName: 'Daya Pembeda AnatesV4',
        filePrefix: 'anatesv4-uraian-daya-pembeda',
        aoa: [
          ['No Butir', 'Skor Maks', 'Rata2 Unggul', 'Rata2 Asor', 'Beda (U - A)', 'DP (%)', 'Tafsiran'],
          ...report.items.map((it) => [
            it.itemNumber,
            it.maxScore,
            it.upperMean,
            it.lowerMean,
            Math.round((it.upperMean - it.lowerMean) * 100) / 100,
            it.discriminationPercent,
            it.discriminationCategory,
          ]),
        ],
      };

    case 'tingkat-kesukaran':
      return {
        sheetName: 'Kesukaran AnatesV4',
        filePrefix: 'anatesv4-uraian-kesukaran',
        aoa: [
          ['No Butir', 'Skor Maks', 'Rata-rata', 'TK (%)', 'Tafsiran Anates V4'],
          ...report.items.map((it) => [
            it.itemNumber,
            it.maxScore,
            it.meanScore,
            it.difficultyPercent,
            it.difficultyCategory,
          ]),
        ],
      };

    case 'korelasi':
      return {
        sheetName: 'Korelasi AnatesV4',
        filePrefix: 'anatesv4-uraian-korelasi',
        aoa: [
          ['No Butir', 'Skor Maks', 'Korelasi (r)', 'r Tabel 5%', 'r Tabel 1%', 'Signifikansi'],
          ...report.items.map((it) => [
            it.itemNumber,
            it.maxScore,
            it.correlationR ?? 0,
            report.reliability.rTable5 ?? '-',
            report.reliability.rTable1 ?? '-',
            it.significance,
          ]),
        ],
      };

    case 'distribusi':
      return {
        sheetName: 'Sebaran AnatesV4',
        filePrefix: 'anatesv4-uraian-sebaran',
        aoa: [
          ['No Butir', 'Skor Maks', 'Rata-rata', 'Simpangan Baku', 'Sebaran Skor'],
          ...report.items.map((it) => [
            it.itemNumber,
            it.maxScore,
            it.meanScore,
            it.stdDev,
            it.distributionText,
          ]),
        ],
      };

    case 'rekap':
    default:
      return {
        sheetName: 'Rekap AnatesV4',
        filePrefix: 'anatesv4-uraian-rekap',
        aoa: [
          [
            'No Butir',
            'Skor Maks',
            'Rata-rata',
            'DP (%)',
            'TK (%)',
            'Tafsiran TK (Anates V4)',
            'Korelasi (r)',
            'Signifikansi',
          ],
          ...report.items.map((it) => [
            it.itemNumber,
            it.maxScore,
            it.meanScore,
            it.discriminationPercent,
            it.difficultyPercent,
            it.difficultyCategory,
            it.correlationR ?? 0,
            it.significance,
          ]),
        ],
      };
  }
}

function saveSingleWorkbook(
  sheetName: string,
  filePrefix: string,
  aoa: (string | number)[][],
  examTitle: string,
): string {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const colCount = aoa[0]?.length || 1;
  ws['!cols'] = Array.from({ length: colCount }, (_, i) => ({
    wch: i === 0 ? 18 : i === 1 ? 24 : 16,
  }));
  if (aoa.length > 1) {
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: aoa.length - 1, c: colCount - 1 },
      }),
    };
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${filePrefix}-${makeSlug(examTitle)}-${dateStr}.xlsx`;
  triggerFileDownload(blob, filename);
  return filename;
}

function saveTextFile(
  sheetName: string,
  filePrefix: string,
  aoa: (string | number)[][],
  examTitle: string,
  studentCount: number,
  itemCount: number,
): string {
  const title = examTitle.trim() || 'Rekap Lembar Jawaban';
  const headerLines = [
    `LAPORAN METODE ANATES V4 — ${sheetName.toUpperCase()}`,
    `Ujian / Instrumen : ${title}`,
    `Subjek (N)        : ${studentCount}`,
    `Butir (k)         : ${itemCount}`,
    `Tanggal           : ${new Date().toISOString().slice(0, 10)}`,
    '='.repeat(72),
    '',
  ];
  const colWidths = (aoa[0] || []).map((_, colIdx) =>
    Math.max(...aoa.map((row) => String(row[colIdx] ?? '').length), 4),
  );
  const tableLines = aoa.map((row, rowIdx) => {
    const line = row
      .map((cell, cIdx) => String(cell ?? '').padEnd(colWidths[cIdx] + 2))
      .join('');
    if (rowIdx === 0) {
      return `${line}\n${'-'.repeat(Math.min(140, line.length))}`;
    }
    return line;
  });
  const content = [...headerLines, ...tableLines].join('\r\n');
  const blob = new Blob(['\uFEFF' + content], {
    type: 'text/plain;charset=utf-8',
  });
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${filePrefix}-${makeSlug(examTitle)}-${dateStr}.txt`;
  triggerFileDownload(blob, filename);
  return filename;
}

export function exportAnatesAbcSingleExcel(
  section: AnatesAbcSectionId,
  report: FullAnatesV4AbcReport,
  examTitle: string,
): string {
  const { sheetName, filePrefix, aoa } = buildAnatesAbcAOA(section, report);
  return saveSingleWorkbook(sheetName, filePrefix, aoa, examTitle);
}

export function exportAnatesAbcAllExcel(
  report: FullAnatesV4AbcReport,
  examTitle: string,
): string {
  const wb = XLSX.utils.book_new();
  const sections: AnatesAbcSectionId[] = [
    'rekap',
    'reliabilitas',
    'unggul-asor',
    'daya-pembeda',
    'tingkat-kesukaran',
    'korelasi',
    'pengecoh',
  ];
  for (const sec of sections) {
    const { sheetName, aoa } = buildAnatesAbcAOA(sec, report);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const colCount = aoa[0]?.length || 1;
    ws['!cols'] = Array.from({ length: colCount }, (_, i) => ({
      wch: i === 0 ? 18 : i === 1 ? 22 : 16,
    }));
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `anatesv4-lengkap-${makeSlug(examTitle)}-${dateStr}.xlsx`;
  triggerFileDownload(blob, filename);
  return filename;
}

export function exportAnatesAbcSingleText(
  section: AnatesAbcSectionId,
  report: FullAnatesV4AbcReport,
  examTitle: string,
): string {
  const { sheetName, filePrefix, aoa } = buildAnatesAbcAOA(section, report);
  return saveTextFile(
    sheetName,
    filePrefix,
    aoa,
    examTitle,
    report.reliability.studentCount,
    report.reliability.itemCount,
  );
}

export function exportAnatesUraianSingleExcel(
  section: AnatesUraianSectionId,
  report: FullAnatesV4UraianReport,
  examTitle: string,
): string {
  const { sheetName, filePrefix, aoa } = buildAnatesUraianAOA(section, report);
  return saveSingleWorkbook(sheetName, filePrefix, aoa, examTitle);
}

export function exportAnatesUraianAllExcel(
  report: FullAnatesV4UraianReport,
  examTitle: string,
): string {
  const wb = XLSX.utils.book_new();
  const sections: AnatesUraianSectionId[] = [
    'rekap',
    'reliabilitas',
    'unggul-asor',
    'daya-pembeda',
    'tingkat-kesukaran',
    'korelasi',
    'distribusi',
  ];
  for (const sec of sections) {
    const { sheetName, aoa } = buildAnatesUraianAOA(sec, report);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const colCount = aoa[0]?.length || 1;
    ws['!cols'] = Array.from({ length: colCount }, (_, i) => ({
      wch: i === 0 ? 18 : i === 1 ? 22 : 16,
    }));
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `anatesv4-uraian-lengkap-${makeSlug(examTitle)}-${dateStr}.xlsx`;
  triggerFileDownload(blob, filename);
  return filename;
}

export function exportAnatesUraianSingleText(
  section: AnatesUraianSectionId,
  report: FullAnatesV4UraianReport,
  examTitle: string,
): string {
  const { sheetName, filePrefix, aoa } = buildAnatesUraianAOA(section, report);
  return saveTextFile(
    sheetName,
    filePrefix,
    aoa,
    examTitle,
    report.reliability.studentCount,
    report.reliability.itemCount,
  );
}
