import type { AnswerLetter, StudentRow } from '../types/sheet';
import { normalizeAnswers } from './answerParser';

export type OptionCountMode = 4 | 5;
export type GroupLabel = 'Unggul' | 'Tengah' | 'Asor';

export interface RankedStudent {
  id: number;
  nama: string;
  kelas: string;
  rank: number;
  score: number;
  maxScore: number;
  scorePercent: number;
  group: GroupLabel;
}

export interface DistractorDetail {
  option: Exclude<AnswerLetter, ''>;
  isKey: boolean;
  count: number;
  percent: number;
  upperCount: number;
  lowerCount: number;
  status: 'Kunci' | 'Berfungsi' | 'Kurang Efektif' | 'Tidak Dipilih';
}

export interface ItemAnalysisRow {
  questionNumber: number;
  key: AnswerLetter;
  hasKey: boolean;
  correctCount: number;
  difficultyIndex: number; // P (0..1)
  difficultyCategory: 'Mudah' | 'Sedang' | 'Sukar' | '-';
  upperCorrect: number;
  lowerCorrect: number;
  upperRatio: number;
  lowerRatio: number;
  discriminationIndex: number; // D (-1..1)
  discriminationCategory:
    | 'Baik Sekali'
    | 'Baik'
    | 'Cukup'
    | 'Jelek'
    | 'Negatif'
    | '-';
  correlationR: number | null;
  validityStatus: 'Valid' | 'Tidak Valid' | '-';
  distractors: DistractorDetail[];
  functioningDistractors: number;
  totalDistractors: number;
  distractorSummary: string;
  finalDecision: 'Dipakai' | 'Revisi' | 'Dibuang' | '-';
}

export interface ReliabilityResult {
  kr20: number | null;
  category: string;
  keyedItemCount: number;
  studentCount: number;
  meanScore: number;
  varianceTotal: number;
  sumPQ: number;
  rTable: number | null;
}

export interface FullItemAnalysisReport {
  hasSufficientData: boolean;
  reasonIfInsufficient: string;
  optionMode: OptionCountMode;
  groupSize: number;
  reliability: ReliabilityResult;
  rankedStudents: RankedStudent[];
  items: ItemAnalysisRow[];
  summaryCounts: {
    valid: number;
    invalid: number;
    easy: number;
    medium: number;
    hard: number;
    usable: number;
    revise: number;
    discard: number;
  };
}

// Accurate two-tailed critical r at alpha = 0.05 for df = n - 2 (n >= 3)
export function getCriticalRTable(n: number): number | null {
  if (n < 3) return null;
  const lookup: Record<number, number> = {
    3: 0.997,
    4: 0.95,
    5: 0.878,
    6: 0.811,
    7: 0.754,
    8: 0.707,
    9: 0.666,
    10: 0.632,
    11: 0.602,
    12: 0.576,
    13: 0.553,
    14: 0.532,
    15: 0.514,
    16: 0.497,
    17: 0.482,
    18: 0.468,
    19: 0.456,
    20: 0.444,
    21: 0.433,
    22: 0.423,
    23: 0.413,
    24: 0.404,
    25: 0.396,
    26: 0.388,
    27: 0.381,
    28: 0.374,
    29: 0.367,
    30: 0.361,
  };
  if (lookup[n]) return lookup[n];
  const df = n - 2;
  // Standard normal z for alpha=0.05 two-tailed is 1.95996
  const z = 1.95996;
  // Cornish-Fisher approximation for Student-t critical value
  const t =
    z +
    (Math.pow(z, 3) + z) / (4 * df) +
    (5 * Math.pow(z, 5) + 16 * Math.pow(z, 3) + 3 * z) / (96 * df * df);
  const r = t / Math.sqrt(t * t + df);
  return Math.round(r * 1000) / 1000;
}

export function detectOptionMode(
  rows: StudentRow[],
  questionCount: number,
  answerKey: AnswerLetter[],
): OptionCountMode {
  const normKey = normalizeAnswers(answerKey, questionCount);
  if (normKey.some((k) => k === 'E')) return 5;
  for (const row of rows) {
    const ans = normalizeAnswers(row.jawaban, questionCount);
    if (ans.some((a) => a === 'E')) return 5;
  }
  return 4;
}

function classifyReliability(r: number | null): string {
  if (r === null) return '-';
  if (r >= 0.8) return 'Sangat Tinggi';
  if (r >= 0.6) return 'Tinggi (Reliabel)';
  if (r >= 0.4) return 'Cukup';
  if (r >= 0.2) return 'Rendah';
  return 'Sangat Rendah';
}

function classifyDifficulty(p: number): 'Mudah' | 'Sedang' | 'Sukar' {
  if (p > 0.7) return 'Mudah';
  if (p >= 0.3) return 'Sedang';
  return 'Sukar';
}

function classifyDiscrimination(
  d: number,
): 'Baik Sekali' | 'Baik' | 'Cukup' | 'Jelek' | 'Negatif' {
  if (d >= 0.7) return 'Baik Sekali';
  if (d >= 0.4) return 'Baik';
  if (d >= 0.2) return 'Cukup';
  if (d >= 0) return 'Jelek';
  return 'Negatif';
}

export function computeFullItemAnalysis(
  rows: StudentRow[],
  questionCount: number,
  answerKey: AnswerLetter[],
  optionMode: OptionCountMode,
): FullItemAnalysisReport {
  const normKey = normalizeAnswers(answerKey, questionCount);
  const keyedIndices: number[] = [];
  for (let i = 0; i < questionCount; i++) {
    if (normKey[i] !== '') keyedIndices.push(i);
  }

  const N = rows.length;
  const k = keyedIndices.length;
  const rTable = getCriticalRTable(N);

  if (N < 2 || k === 0) {
    return {
      hasSufficientData: false,
      reasonIfInsufficient:
        k === 0
          ? 'Atur Kunci Jawaban terlebih dahulu pada Langkah 1 agar sistem dapat menghitung skor, reliabilitas, validitas, dan daya pembeda.'
          : 'Tambahkan minimal 2 siswa agar kelompok unggul/asor, daya pembeda, korelasi, dan reliabilitas dapat dihitung.',
      optionMode,
      groupSize: 0,
      reliability: {
        kr20: null,
        category: '-',
        keyedItemCount: k,
        studentCount: N,
        meanScore: 0,
        varianceTotal: 0,
        sumPQ: 0,
        rTable,
      },
      rankedStudents: [],
      items: [],
      summaryCounts: {
        valid: 0,
        invalid: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        usable: 0,
        revise: 0,
        discard: 0,
      },
    };
  }

  // Normalized answers matrix
  const matrix = rows.map((r) => normalizeAnswers(r.jawaban, questionCount));

  // Dichotomous score matrix for keyed items & student total scores
  const totalScores = rows.map((_, sIdx) => {
    let sum = 0;
    for (const qIdx of keyedIndices) {
      if (matrix[sIdx][qIdx] === normKey[qIdx]) sum++;
    }
    return sum;
  });

  // Sort indices descending by total score for 27% Unggul & Asor
  const sortedStudentIndices = rows
    .map((_, idx) => idx)
    .sort((a, b) => totalScores[b] - totalScores[a] || a - b);

  const rawGroupSize = Math.max(1, Math.round(N * 0.27));
  const groupSize = Math.min(rawGroupSize, Math.floor(N / 2));

  const upperSet = new Set<number>(sortedStudentIndices.slice(0, groupSize));
  const lowerSet = new Set<number>(sortedStudentIndices.slice(N - groupSize));

  const rankedStudents: RankedStudent[] = sortedStudentIndices.map(
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

  // Reliability (KR-20)
  const meanScore =
    totalScores.reduce((acc, val) => acc + val, 0) / N;
  const varianceTotal =
    totalScores.reduce((acc, val) => acc + Math.pow(val - meanScore, 2), 0) / N;

  let sumPQ = 0;
  for (const qIdx of keyedIndices) {
    let correct = 0;
    for (let sIdx = 0; sIdx < N; sIdx++) {
      if (matrix[sIdx][qIdx] === normKey[qIdx]) correct++;
    }
    const p = correct / N;
    sumPQ += p * (1 - p);
  }

  let kr20: number | null = null;
  if (k > 1 && varianceTotal > 0) {
    kr20 = (k / (k - 1)) * ((varianceTotal - sumPQ) / varianceTotal);
    kr20 = Math.round(kr20 * 1000) / 1000;
  }

  const optionsList: Array<Exclude<AnswerLetter, ''>> =
    optionMode === 5 ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];

  const summaryCounts = {
    valid: 0,
    invalid: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    usable: 0,
    revise: 0,
    discard: 0,
  };

  const items: ItemAnalysisRow[] = [];

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

    // For Pearson r_xy
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let sIdx = 0; sIdx < N; sIdx++) {
      const ans = matrix[sIdx][qIdx];
      if (ans) {
        optionCounts[ans]++;
        if (upperSet.has(sIdx)) optionUpper[ans]++;
        if (lowerSet.has(sIdx)) optionLower[ans]++;
      }

      const x = hasKey && ans === keyChar ? 1 : 0;
      const y = totalScores[sIdx];
      if (x === 1) {
        correctCount++;
        if (upperSet.has(sIdx)) upperCorrect++;
        if (lowerSet.has(sIdx)) lowerCorrect++;
      }
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const distractors: DistractorDetail[] = optionsList.map((opt) => {
      const count = optionCounts[opt];
      const percent = Math.round((count / N) * 1000) / 10;
      const isKey = hasKey && opt === keyChar;
      let status: DistractorDetail['status'];
      if (isKey) {
        status = 'Kunci';
      } else if (count === 0) {
        status = 'Tidak Dipilih';
      } else if (count / N >= 0.05) {
        status = 'Berfungsi';
      } else {
        status = 'Kurang Efektif';
      }
      return {
        option: opt,
        isKey,
        count,
        percent,
        upperCount: optionUpper[opt],
        lowerCount: optionLower[opt],
        status,
      };
    });

    const wrongOptions = distractors.filter((d) => !d.isKey);
    const functioningDistractors = wrongOptions.filter(
      (d) => d.status === 'Berfungsi',
    ).length;
    const totalDistractors = wrongOptions.length;
    const distractorSummary = hasKey
      ? functioningDistractors === totalDistractors
        ? `${functioningDistractors}/${totalDistractors} Baik`
        : `${functioningDistractors}/${totalDistractors} Efektif`
      : '-';

    if (!hasKey) {
      items.push({
        questionNumber: qIdx + 1,
        key: '',
        hasKey: false,
        correctCount: 0,
        difficultyIndex: 0,
        difficultyCategory: '-',
        upperCorrect: 0,
        lowerCorrect: 0,
        upperRatio: 0,
        lowerRatio: 0,
        discriminationIndex: 0,
        discriminationCategory: '-',
        correlationR: null,
        validityStatus: '-',
        distractors,
        functioningDistractors,
        totalDistractors,
        distractorSummary: '-',
        finalDecision: '-',
      });
      continue;
    }

    const difficultyIndex = Math.round((correctCount / N) * 1000) / 1000;
    const difficultyCategory = classifyDifficulty(difficultyIndex);

    const upperRatio = groupSize > 0 ? upperCorrect / groupSize : 0;
    const lowerRatio = groupSize > 0 ? lowerCorrect / groupSize : 0;
    const discriminationIndex =
      Math.round((upperRatio - lowerRatio) * 1000) / 1000;
    const discriminationCategory = classifyDiscrimination(discriminationIndex);

    const denom = Math.sqrt(
      (N * sumX2 - sumX * sumX) * (N * sumY2 - sumY * sumY),
    );
    const correlationR =
      denom > 0 ? Math.round(((N * sumXY - sumX * sumY) / denom) * 1000) / 1000 : 0;

    const validityStatus: 'Valid' | 'Tidak Valid' =
      rTable !== null && correlationR >= rTable ? 'Valid' : 'Tidak Valid';

    if (validityStatus === 'Valid') summaryCounts.valid++;
    else summaryCounts.invalid++;

    if (difficultyCategory === 'Mudah') summaryCounts.easy++;
    else if (difficultyCategory === 'Sedang') summaryCounts.medium++;
    else summaryCounts.hard++;

    let finalDecision: 'Dipakai' | 'Revisi' | 'Dibuang';
    if (
      discriminationIndex < 0 ||
      (validityStatus === 'Tidak Valid' && discriminationIndex < 0.2)
    ) {
      finalDecision = 'Dibuang';
      summaryCounts.discard++;
    } else if (
      validityStatus === 'Valid' &&
      discriminationIndex >= 0.2 &&
      difficultyCategory === 'Sedang' &&
      functioningDistractors === totalDistractors
    ) {
      finalDecision = 'Dipakai';
      summaryCounts.usable++;
    } else if (validityStatus === 'Valid' && discriminationIndex >= 0.2) {
      // Valid with acceptable discrimination, but extreme difficulty or weak distractor
      finalDecision =
        functioningDistractors === 0 || difficultyIndex === 1 || difficultyIndex === 0
          ? 'Revisi'
          : 'Dipakai';
      if (finalDecision === 'Dipakai') summaryCounts.usable++;
      else summaryCounts.revise++;
    } else {
      finalDecision = 'Revisi';
      summaryCounts.revise++;
    }

    items.push({
      questionNumber: qIdx + 1,
      key: keyChar,
      hasKey: true,
      correctCount,
      difficultyIndex,
      difficultyCategory,
      upperCorrect,
      lowerCorrect,
      upperRatio: Math.round(upperRatio * 1000) / 1000,
      lowerRatio: Math.round(lowerRatio * 1000) / 1000,
      discriminationIndex,
      discriminationCategory,
      correlationR,
      validityStatus,
      distractors,
      functioningDistractors,
      totalDistractors,
      distractorSummary,
      finalDecision,
    });
  }

  return {
    hasSufficientData: true,
    reasonIfInsufficient: '',
    optionMode,
    groupSize,
    reliability: {
      kr20,
      category: classifyReliability(kr20),
      keyedItemCount: k,
      studentCount: N,
      meanScore: Math.round(meanScore * 100) / 100,
      varianceTotal: Math.round(varianceTotal * 100) / 100,
      sumPQ: Math.round(sumPQ * 1000) / 1000,
      rTable,
    },
    rankedStudents,
    items,
    summaryCounts,
  };
}
