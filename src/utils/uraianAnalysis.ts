import * as XLSX from 'xlsx';
import type {
  ScoreValue,
  SurveySubMode,
  UraianStudentRow,
  UraianStudentStats,
} from '../types/sheet';
import {
  makeSlug,
  triggerFileDownload,
  type ExcelPreviewWorkbook,
  type ExcelSheetPreview,
} from './excelExport';
import {
  getCriticalRTable,
  type GroupLabel,
  type RankedStudent,
} from './itemAnalysis';
import {
  buildDistinguishedUnggulAsorAOA,
  buildDistinguishedUnggulAsorText,
} from './unggulAsorFormat';

export type UraianAnalysisSectionId =
  | 'rekap'
  | 'reliabilitas'
  | 'unggul-asor'
  | 'daya-pembeda'
  | 'tingkat-kesukaran'
  | 'korelasi'
  | 'distribusi';

export interface UraianItemAnalysisRow {
  itemNumber: number;
  minScore: number;
  maxScore: number;
  meanScore: number;
  stdDev: number;
  difficultyIndex: number; // P (0..1)
  difficultyCategory: 'Mudah / Tinggi' | 'Sedang' | 'Sukar / Rendah';
  upperMean: number;
  lowerMean: number;
  discriminationIndex: number; // D (-1..1)
  discriminationCategory:
    | 'Baik Sekali'
    | 'Baik'
    | 'Cukup'
    | 'Jelek'
    | 'Negatif';
  correlationR: number | null;
  validityStatus: 'Valid' | 'Tidak Valid';
  distributionText: string;
  finalDecision: 'Dipakai' | 'Revisi' | 'Dibuang';
}

export interface UraianReliabilityResult {
  cronbachAlpha: number | null;
  category: string;
  itemCount: number;
  studentCount: number;
  meanTotalScore: number;
  varianceTotal: number;
  sumItemVariance: number;
  rTable: number | null;
}

export interface FullUraianAnalysisReport {
  hasSufficientData: boolean;
  reasonIfInsufficient: string;
  subMode: SurveySubMode;
  scaleMin: number;
  groupSize: number;
  reliability: UraianReliabilityResult;
  rankedStudents: RankedStudent[];
  items: UraianItemAnalysisRow[];
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

export interface SavedUraianProjectData {
  format: 'rekap-uraian-v1';
  savedAt: string;
  examTitle: string;
  subMode: SurveySubMode;
  itemCount: number;
  scaleMin: number;
  defaultMaxScore: number;
  itemMaxScores: number[];
  rows: UraianStudentRow[];
}

export function clampScore(
  val: number,
  min: number,
  max: number,
): number {
  if (!Number.isFinite(val)) return min;
  const clamped = Math.min(max, Math.max(min, val));
  return Math.round(clamped * 100) / 100;
}

export function normalizeMaxScores(
  arr: number[],
  itemCount: number,
  defaultMax: number,
  minScore: number,
): number[] {
  const safeDefault = Math.max(minScore + 1, defaultMax || 10);
  return Array.from({ length: itemCount }, (_, idx) => {
    const v = arr[idx];
    return typeof v === 'number' && Number.isFinite(v) && v > minScore
      ? Math.round(v * 100) / 100
      : safeDefault;
  });
}

export function normalizeScores(
  scores: ScoreValue[],
  itemCount: number,
  scaleMin: number,
  itemMaxScores: number[],
): ScoreValue[] {
  return Array.from({ length: itemCount }, (_, idx) => {
    const v = scores[idx];
    if (v === null || v === undefined || Number.isNaN(v)) return null;
    const maxS = itemMaxScores[idx] ?? 10;
    return clampScore(v, scaleMin, maxS);
  });
}

export function parseBulkScores(
  rawText: string,
  itemCount: number,
  scaleMin: number,
  itemMaxScores: number[],
): ScoreValue[] {
  const tokens = rawText
    .trim()
    .split(/[\s,;|/\t\r\n]+/)
    .filter((t) => t.length > 0);
  const out: ScoreValue[] = new Array(itemCount).fill(null);

  let writeIdx = 0;
  for (const tok of tokens) {
    if (writeIdx >= itemCount) break;
    const cleaned = tok.replace(/^\d+[.)=:\-]/, '');
    if (cleaned === '-' || cleaned === '_') {
      out[writeIdx] = null;
      writeIdx++;
      continue;
    }
    const num = Number(cleaned.replace(',', '.'));
    if (Number.isFinite(num)) {
      const maxS = itemMaxScores[writeIdx] ?? 10;
      out[writeIdx] = clampScore(num, scaleMin, maxS);
      writeIdx++;
    }
  }
  return out;
}

export function countReadableScoreTokens(rawText: string): number {
  const tokens = rawText
    .trim()
    .split(/[\s,;|/\t\r\n]+/)
    .filter((t) => t.length > 0);
  let count = 0;
  for (const tok of tokens) {
    const cleaned = tok.replace(/^\d+[.)=:\-]/, '');
    if (cleaned === '-' || cleaned === '_') {
      count++;
      continue;
    }
    const num = Number(cleaned.replace(',', '.'));
    if (Number.isFinite(num)) count++;
  }
  return count;
}

export function firstEmptyScoreIndex(
  scores: ScoreValue[],
  itemCount: number,
): number {
  for (let i = 0; i < itemCount; i++) {
    if (scores[i] === null || scores[i] === undefined) return i;
  }
  return Math.max(0, itemCount - 1);
}

export function computeUraianStudentStats(
  scores: ScoreValue[],
  itemCount: number,
  itemMaxScores: number[],
): UraianStudentStats {
  let filled = 0;
  let empty = 0;
  let totalScore = 0;
  let maxPossible = 0;

  for (let i = 0; i < itemCount; i++) {
    const maxS = itemMaxScores[i] ?? 10;
    maxPossible += maxS;
    const val = scores[i];
    if (val === null || val === undefined || Number.isNaN(val)) {
      empty++;
    } else {
      filled++;
      totalScore += val;
    }
  }

  totalScore = Math.round(totalScore * 100) / 100;
  maxPossible = Math.round(maxPossible * 100) / 100;

  return {
    filled,
    empty,
    totalScore,
    maxPossible,
    averageScore: filled > 0 ? Math.round((totalScore / filled) * 100) / 100 : null,
    percentScore:
      filled > 0 && maxPossible > 0
        ? Math.round((totalScore / maxPossible) * 1000) / 10
        : null,
  };
}

function classifyAlpha(r: number | null): string {
  if (r === null) return '-';
  if (r >= 0.8) return 'Sangat Tinggi';
  if (r >= 0.6) return 'Tinggi (Reliabel)';
  if (r >= 0.4) return 'Cukup';
  if (r >= 0.2) return 'Rendah';
  return 'Sangat Rendah';
}

function classifyUraianDifficulty(
  p: number,
): 'Mudah / Tinggi' | 'Sedang' | 'Sukar / Rendah' {
  if (p > 0.7) return 'Mudah / Tinggi';
  if (p >= 0.3) return 'Sedang';
  return 'Sukar / Rendah';
}

function classifyUraianDiscrimination(
  d: number,
): 'Baik Sekali' | 'Baik' | 'Cukup' | 'Jelek' | 'Negatif' {
  if (d >= 0.7) return 'Baik Sekali';
  if (d >= 0.4) return 'Baik';
  if (d >= 0.2) return 'Cukup';
  if (d >= 0) return 'Jelek';
  return 'Negatif';
}

export function computeFullUraianAnalysis(
  rows: UraianStudentRow[],
  itemCount: number,
  subMode: SurveySubMode,
  scaleMin: number,
  itemMaxScores: number[],
  defaultMaxScore?: number,
): FullUraianAnalysisReport {
  const N = rows.length;
  const k = itemCount;
  const rTable = getCriticalRTable(N);

  if (N < 2 || k < 1) {
    return {
      hasSufficientData: false,
      reasonIfInsufficient:
        'Tambahkan minimal 2 siswa/responden dan isi skor butir agar Cronbach Alpha, Kelompok Unggul-Asor, Daya Pembeda, Tingkat Kesukaran/Capaian, dan Validitas dapat dihitung.',
      subMode,
      scaleMin,
      groupSize: 0,
      reliability: {
        cronbachAlpha: null,
        category: '-',
        itemCount: k,
        studentCount: N,
        meanTotalScore: 0,
        varianceTotal: 0,
        sumItemVariance: 0,
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

  const fallbackMax =
    defaultMaxScore && defaultMaxScore > scaleMin
      ? defaultMaxScore
      : subMode === 'angket-4'
        ? 4
        : subMode === 'angket-5'
          ? 5
          : 10;

  const normalizedMax = normalizeMaxScores(
    itemMaxScores,
    k,
    fallbackMax,
    scaleMin,
  );

  // Matrix of numeric scores (empty defaults to 0 for statistical computation)
  const matrix: number[][] = rows.map((row) =>
    Array.from({ length: k }, (_, i) => {
      const v = row.scores[i];
      if (v === null || v === undefined || Number.isNaN(v)) return 0;
      return clampScore(v, scaleMin, normalizedMax[i]);
    }),
  );

  const maxTotalPossible = normalizedMax.reduce((acc, m) => acc + m, 0);
  const totalScores = matrix.map(
    (rowScores) =>
      Math.round(rowScores.reduce((acc, v) => acc + v, 0) * 100) / 100,
  );

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

  const meanTotalScore =
    totalScores.reduce((acc, val) => acc + val, 0) / N;
  const varianceTotal =
    totalScores.reduce((acc, val) => acc + Math.pow(val - meanTotalScore, 2), 0) /
    N;

  let sumItemVariance = 0;
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

  const items: UraianItemAnalysisRow[] = [];

  for (let qIdx = 0; qIdx < k; qIdx++) {
    const itemMax = normalizedMax[qIdx];
    const span = Math.max(1, itemMax - scaleMin);

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;
    let upperSum = 0;
    let lowerSum = 0;
    const freqMap = new Map<number, number>();

    for (let sIdx = 0; sIdx < N; sIdx++) {
      const x = matrix[sIdx][qIdx];
      const y = totalScores[sIdx];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
      if (upperSet.has(sIdx)) upperSum += x;
      if (lowerSet.has(sIdx)) lowerSum += x;

      const roundedKey = Math.round(x * 10) / 10;
      freqMap.set(roundedKey, (freqMap.get(roundedKey) ?? 0) + 1);
    }

    const meanScore = sumX / N;
    let itemVar = 0;
    for (let sIdx = 0; sIdx < N; sIdx++) {
      itemVar += Math.pow(matrix[sIdx][qIdx] - meanScore, 2);
    }
    itemVar = itemVar / N;
    sumItemVariance += itemVar;

    const stdDev = Math.sqrt(itemVar);
    const difficultyRaw = (meanScore - scaleMin) / span;
    const difficultyIndex = Math.round(
      Math.min(1, Math.max(0, difficultyRaw)) * 1000,
    ) / 1000;
    const difficultyCategory = classifyUraianDifficulty(difficultyIndex);

    const upperMean = groupSize > 0 ? upperSum / groupSize : 0;
    const lowerMean = groupSize > 0 ? lowerSum / groupSize : 0;
    const discriminationIndex =
      Math.round(((upperMean - lowerMean) / span) * 1000) / 1000;
    const discriminationCategory =
      classifyUraianDiscrimination(discriminationIndex);

    const denom = Math.sqrt(
      (N * sumX2 - sumX * sumX) * (N * sumY2 - sumY * sumY),
    );
    const correlationR =
      denom > 0
        ? Math.round(((N * sumXY - sumX * sumY) / denom) * 1000) / 1000
        : 0;
    const validityStatus: 'Valid' | 'Tidak Valid' =
      rTable !== null && correlationR >= rTable ? 'Valid' : 'Tidak Valid';

    if (validityStatus === 'Valid') summaryCounts.valid++;
    else summaryCounts.invalid++;

    if (difficultyCategory === 'Mudah / Tinggi') summaryCounts.easy++;
    else if (difficultyCategory === 'Sedang') summaryCounts.medium++;
    else summaryCounts.hard++;

    let finalDecision: 'Dipakai' | 'Revisi' | 'Dibuang';
    if (
      discriminationIndex < 0 ||
      (validityStatus === 'Tidak Valid' && discriminationIndex < 0.2)
    ) {
      finalDecision = 'Dibuang';
      summaryCounts.discard++;
    } else if (validityStatus === 'Valid' && discriminationIndex >= 0.2) {
      finalDecision = 'Dipakai';
      summaryCounts.usable++;
    } else {
      finalDecision = 'Revisi';
      summaryCounts.revise++;
    }

    const sortedFreqs = Array.from(freqMap.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(0, 6)
      .map(([val, cnt]) => `${val}:${cnt}`)
      .join(' · ');

    items.push({
      itemNumber: qIdx + 1,
      minScore: scaleMin,
      maxScore: itemMax,
      meanScore: Math.round(meanScore * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      difficultyIndex,
      difficultyCategory,
      upperMean: Math.round(upperMean * 100) / 100,
      lowerMean: Math.round(lowerMean * 100) / 100,
      discriminationIndex,
      discriminationCategory,
      correlationR,
      validityStatus,
      distributionText: sortedFreqs,
      finalDecision,
    });
  }

  let cronbachAlpha: number | null = null;
  if (k > 1 && varianceTotal > 0) {
    cronbachAlpha = (k / (k - 1)) * (1 - sumItemVariance / varianceTotal);
    cronbachAlpha = Math.round(cronbachAlpha * 1000) / 1000;
  }

  return {
    hasSufficientData: true,
    reasonIfInsufficient: '',
    subMode,
    scaleMin,
    groupSize,
    reliability: {
      cronbachAlpha,
      category: classifyAlpha(cronbachAlpha),
      itemCount: k,
      studentCount: N,
      meanTotalScore: Math.round(meanTotalScore * 100) / 100,
      varianceTotal: Math.round(varianceTotal * 100) / 100,
      sumItemVariance: Math.round(sumItemVariance * 1000) / 1000,
      rTable,
    },
    rankedStudents,
    items,
    summaryCounts,
  };
}

export function buildUraianExcelWorkbookData(payload: {
  rows: UraianStudentRow[];
  itemCount: number;
  examTitle: string;
  subMode: SurveySubMode;
  scaleMin: number;
  itemMaxScores: number[];
}): ExcelPreviewWorkbook {
  const { rows, itemCount, examTitle, subMode, scaleMin, itemMaxScores } = payload;
  const normMax = normalizeMaxScores(
    itemMaxScores,
    itemCount,
    subMode === 'angket-4' ? 4 : subMode === 'angket-5' ? 5 : 10,
    scaleMin,
  );

  const mainHeaders: (string | number)[] = ['No', 'Nama Siswa / Responden', 'Kelas'];
  for (let i = 1; i <= itemCount; i++) {
    mainHeaders.push(`B${i}`);
  }
  mainHeaders.push('Terisi', 'Total Skor', 'Skor Maks', 'Rata-rata', 'Capaian (%)');

  const mainRows: (string | number)[][] = [];
  const maxRefRow: (string | number)[] = ['-', 'SKOR MAKSIMUM', '-'];
  let sumMax = 0;
  for (let i = 0; i < itemCount; i++) {
    maxRefRow.push(normMax[i]);
    sumMax += normMax[i];
  }
  maxRefRow.push(itemCount, sumMax, sumMax, '-', 100);
  mainRows.push(maxRefRow);

  rows.forEach((row, idx) => {
    const scores = normalizeScores(row.scores, itemCount, scaleMin, normMax);
    const stats = computeUraianStudentStats(scores, itemCount, normMax);
    const line: (string | number)[] = [
      idx + 1,
      row.nama || `Peserta ${idx + 1}`,
      row.kelas || '-',
    ];
    for (let i = 0; i < itemCount; i++) {
      const v = scores[i];
      line.push(v === null ? '' : v);
    }
    line.push(
      stats.filled,
      stats.totalScore,
      stats.maxPossible,
      stats.averageScore ?? '-',
      stats.percentScore ?? '-',
    );
    mainRows.push(line);
  });

  const mainSheet: ExcelSheetPreview = {
    name: subMode === 'uraian' ? 'Skor Uraian' : 'Skor Angket',
    headers: mainHeaders,
    rows: mainRows,
  };

  const report = computeFullUraianAnalysis(
    rows,
    itemCount,
    subMode,
    scaleMin,
    normMax,
  );

  const summaryRows: (string | number)[][] = [
    ['Judul Instrumen', examTitle.trim() || 'Angket / Uraian'],
    ['Jenis Instrumen', subMode === 'uraian' ? 'Soal Uraian / Esai' : 'Angket / Skala Likert'],
    ['Skor Minimum Skala', scaleMin],
    ['Jumlah Butir', itemCount],
    ['Jumlah Peserta / Responden', rows.length],
    ['Rata-rata Skor Total', report.reliability.meanTotalScore],
    [
      'Reliabilitas (Alpha Cronbach)',
      report.reliability.cronbachAlpha !== null
        ? `${report.reliability.cronbachAlpha} (${report.reliability.category})`
        : '-',
    ],
  ];

  const summarySheet: ExcelSheetPreview = {
    name: 'Ringkasan',
    headers: ['Keterangan', 'Nilai'],
    rows: summaryRows,
  };

  let analysisSheet: ExcelSheetPreview | null = null;
  let groupsSheet: ExcelSheetPreview | null = null;

  if (report.hasSufficientData) {
    analysisSheet = {
      name: 'Analisis Butir',
      headers: [
        'No Butir',
        'Skor Maks',
        'Rata-rata',
        'Korelasi (r)',
        'Validitas',
        'Indeks P',
        'Kategori P',
        'Daya Pembeda (D)',
        'Kategori DP',
        'Kualitas Akhir',
      ],
      rows: report.items.map((it) => [
        it.itemNumber,
        it.maxScore,
        it.meanScore,
        it.correlationR ?? 0,
        it.validityStatus,
        it.difficultyIndex,
        it.difficultyCategory,
        it.discriminationIndex,
        it.discriminationCategory,
        it.finalDecision,
      ]),
    };

    groupsSheet = {
      name: 'Kel. Unggul & Asor',
      headers: ['Peringkat', 'Nama', 'Kelas', 'Total Skor', 'Skor Maks', 'Capaian (%)', 'Kelompok'],
      rows: report.rankedStudents.map((st) => [
        st.rank,
        st.nama,
        st.kelas,
        st.score,
        st.maxScore,
        st.scorePercent,
        st.group === 'Unggul'
          ? 'Unggul (27% Atas)'
          : st.group === 'Asor'
            ? 'Asor (27% Bawah)'
            : 'Tengah',
      ]),
    };
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${subMode === 'uraian' ? 'rekap-uraian' : 'rekap-angket'}-${makeSlug(examTitle)}-${dateStr}.xlsx`;

  return {
    filename,
    hasKey: false,
    questionCount: itemCount,
    studentCount: rows.length,
    mainSheet,
    summarySheet,
    analysisSheet,
    groupsSheet,
  };
}

function appendSheetToWb(
  wb: XLSX.WorkBook,
  sheet: ExcelSheetPreview,
  minFirstColWidth = 14,
) {
  const aoa = [sheet.headers, ...sheet.rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = sheet.headers.map((_, i) => ({
    wch: i === 0 ? minFirstColWidth : i === 1 ? 24 : 14,
  }));
  if (aoa.length > 1) {
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: aoa.length - 1, c: sheet.headers.length - 1 },
      }),
    };
  }
  XLSX.utils.book_append_sheet(wb, ws, sheet.name);
}

export function downloadUraianExcelWorkbook(payload: {
  rows: UraianStudentRow[];
  itemCount: number;
  examTitle: string;
  subMode: SurveySubMode;
  scaleMin: number;
  itemMaxScores: number[];
}): string {
  const preview = buildUraianExcelWorkbookData(payload);
  const wb = XLSX.utils.book_new();
  appendSheetToWb(wb, preview.mainSheet, 6);
  appendSheetToWb(wb, preview.summarySheet, 26);
  if (preview.analysisSheet) appendSheetToWb(wb, preview.analysisSheet, 12);
  if (preview.groupsSheet) {
    const normMax = normalizeMaxScores(
      payload.itemMaxScores,
      payload.itemCount,
      payload.subMode === 'angket-4' ? 4 : payload.subMode === 'angket-5' ? 5 : 10,
      payload.scaleMin,
    );
    const fullReport = computeFullUraianAnalysis(
      payload.rows,
      payload.itemCount,
      payload.subMode,
      payload.scaleMin,
      normMax,
    );
    const aoa = buildDistinguishedUnggulAsorAOA({
      rankedStudents: fullReport.rankedStudents,
      groupSize: fullReport.groupSize,
      engineLabel: 'rekapinJx',
      modeLabel: payload.subMode === 'uraian' ? 'Soal Uraian' : 'Angket / Skala Likert',
      scoreHeader: 'Total Skor',
      percentHeader: 'Capaian (%)',
    });
    const wsGroups = XLSX.utils.aoa_to_sheet(aoa);
    wsGroups['!cols'] = [
      { wch: 18 },
      { wch: 28 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, wsGroups, preview.groupsSheet.name);
  }

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerFileDownload(blob, preview.filename);
  return preview.filename;
}

export function downloadUraianCsvFile(payload: {
  rows: UraianStudentRow[];
  itemCount: number;
  examTitle: string;
  subMode: SurveySubMode;
  scaleMin: number;
  itemMaxScores: number[];
}): string {
  const preview = buildUraianExcelWorkbookData(payload);
  const escape = (val: string | number) => {
    const s = String(val);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    preview.mainSheet.headers.map(escape).join(','),
    ...preview.mainSheet.rows.map((r) => r.map(escape).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const filename = preview.filename.replace(/\.xlsx$/, '.csv');
  triggerFileDownload(blob, filename);
  return filename;
}

export function buildUraianTsvText(payload: {
  rows: UraianStudentRow[];
  itemCount: number;
  examTitle: string;
  subMode: SurveySubMode;
  scaleMin: number;
  itemMaxScores: number[];
}): string {
  const preview = buildUraianExcelWorkbookData(payload);
  return [
    preview.mainSheet.headers.join('\t'),
    ...preview.mainSheet.rows.map((r) => r.join('\t')),
  ].join('\n');
}

function buildUraianAnalysisAOA(
  section: UraianAnalysisSectionId,
  report: FullUraianAnalysisReport,
): { sheetName: string; filePrefix: string; aoa: (string | number)[][] } {
  switch (section) {
    case 'reliabilitas':
      return {
        sheetName: 'Reliabilitas Alpha',
        filePrefix: 'reliabilitas-alpha',
        aoa: [
          ['Parameter Pengujian (Alpha Cronbach)', 'Nilai'],
          ['Jumlah Peserta / Responden (N)', report.reliability.studentCount],
          ['Jumlah Butir (k)', report.reliability.itemCount],
          ['Rata-rata Skor Total', report.reliability.meanTotalScore],
          ['Varians Skor Total (S^2t)', report.reliability.varianceTotal],
          ['Jumlah Varians Butir (Sum Si^2)', report.reliability.sumItemVariance],
          [
            'Koefisien Alpha Cronbach',
            report.reliability.cronbachAlpha !== null
              ? report.reliability.cronbachAlpha
              : '-',
          ],
          ['Interpretasi Reliabilitas', report.reliability.category],
          [
            'r Tabel (alpha = 5%)',
            report.reliability.rTable !== null ? report.reliability.rTable : '-',
          ],
        ],
      };

    case 'unggul-asor':
      return {
        sheetName: 'Kel. Unggul & Asor',
        filePrefix: 'kel-unggul-asor-uraian',
        aoa: buildDistinguishedUnggulAsorAOA({
          rankedStudents: report.rankedStudents,
          groupSize: report.groupSize,
          engineLabel: 'rekapinJx',
          modeLabel: report.subMode === 'uraian' ? 'Soal Uraian' : 'Angket / Skala Likert',
          scoreHeader: 'Total Skor',
          percentHeader: 'Capaian (%)',
        }),
      };

    case 'daya-pembeda':
      return {
        sheetName: 'Daya Pembeda',
        filePrefix: 'daya-pembeda-uraian',
        aoa: [
          [
            'No Butir',
            'Skor Maks',
            `Rata-rata Unggul (n=${report.groupSize})`,
            `Rata-rata Asor (n=${report.groupSize})`,
            'Selisih (U - A)',
            'Indeks DP (D)',
            'Tafsiran',
          ],
          ...report.items.map((it) => [
            it.itemNumber,
            it.maxScore,
            it.upperMean,
            it.lowerMean,
            Math.round((it.upperMean - it.lowerMean) * 100) / 100,
            it.discriminationIndex,
            it.discriminationCategory,
          ]),
        ],
      };

    case 'tingkat-kesukaran':
      return {
        sheetName: 'Tingkat Kesukaran',
        filePrefix: 'tingkat-capaian-uraian',
        aoa: [
          ['No Butir', 'Skor Min', 'Skor Maks', 'Rata-rata Skor', 'Indeks (P)', 'Capaian (%)', 'Tafsiran'],
          ...report.items.map((it) => [
            it.itemNumber,
            it.minScore,
            it.maxScore,
            it.meanScore,
            it.difficultyIndex,
            Math.round(it.difficultyIndex * 1000) / 10,
            it.difficultyCategory,
          ]),
        ],
      };

    case 'korelasi':
      return {
        sheetName: 'Korelasi Skor Butir',
        filePrefix: 'korelasi-uraian',
        aoa: [
          ['No Butir', 'Skor Maks', 'Korelasi (r hitung)', 'r Tabel (alpha=5%)', 'Validitas'],
          ...report.items.map((it) => [
            it.itemNumber,
            it.maxScore,
            it.correlationR ?? 0,
            report.reliability.rTable ?? '-',
            it.validityStatus,
          ]),
        ],
      };

    case 'distribusi':
      return {
        sheetName: 'Sebaran Skor Butir',
        filePrefix: 'sebaran-skor-uraian',
        aoa: [
          ['No Butir', 'Skor Min', 'Skor Maks', 'Rata-rata', 'Simpangan Baku', 'Distribusi (Skor:Jumlah)'],
          ...report.items.map((it) => [
            it.itemNumber,
            it.minScore,
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
        sheetName: 'Rekap Analisis Butir',
        filePrefix: 'rekap-analisis-uraian',
        aoa: [
          [
            'No Butir',
            'Skor Maks',
            'Rata-rata',
            'Korelasi (r)',
            'Validitas',
            'Indeks (P)',
            'Kategori P',
            'Daya Pembeda (D)',
            'Kategori DP',
            'Kualitas Akhir',
          ],
          ...report.items.map((it) => [
            it.itemNumber,
            it.maxScore,
            it.meanScore,
            it.correlationR ?? 0,
            it.validityStatus,
            it.difficultyIndex,
            it.difficultyCategory,
            it.discriminationIndex,
            it.discriminationCategory,
            it.finalDecision,
          ]),
        ],
      };
  }
}

export function exportUraianSingleAnalysisExcel(
  section: UraianAnalysisSectionId,
  report: FullUraianAnalysisReport,
  examTitle: string,
): string {
  const { sheetName, filePrefix, aoa } = buildUraianAnalysisAOA(section, report);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const colCount = aoa[0]?.length || 1;
  ws['!cols'] =
    section === 'unggul-asor'
      ? [
          { wch: 18 },
          { wch: 28 },
          { wch: 15 },
          { wch: 15 },
          { wch: 15 },
          { wch: 18 },
          { wch: 25 },
        ]
      : Array.from({ length: colCount }, (_, i) => ({
          wch: i === 0 ? 16 : i === 1 ? 22 : 16,
        }));
  if (section !== 'unggul-asor' && aoa.length > 1) {
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
  const filename = `${filePrefix}-${makeSlug(examTitle)}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  triggerFileDownload(blob, filename);
  return filename;
}

export function exportUraianAllAnalysesExcel(
  report: FullUraianAnalysisReport,
  examTitle: string,
): string {
  const wb = XLSX.utils.book_new();
  const sections: UraianAnalysisSectionId[] = [
    'rekap',
    'reliabilitas',
    'unggul-asor',
    'daya-pembeda',
    'tingkat-kesukaran',
    'korelasi',
    'distribusi',
  ];
  for (const sec of sections) {
    const { sheetName, aoa } = buildUraianAnalysisAOA(sec, report);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const colCount = aoa[0]?.length || 1;
    ws['!cols'] =
      sec === 'unggul-asor'
        ? [
            { wch: 18 },
            { wch: 28 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 18 },
            { wch: 25 },
          ]
        : Array.from({ length: colCount }, (_, i) => ({
            wch: i === 0 ? 16 : i === 1 ? 22 : 16,
          }));
    if (sec !== 'unggul-asor' && aoa.length > 1) {
      ws['!autofilter'] = {
        ref: XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: aoa.length - 1, c: colCount - 1 },
        }),
      };
    }
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const filename = `analisis-uraian-lengkap-${makeSlug(examTitle)}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  triggerFileDownload(blob, filename);
  return filename;
}

export function exportUraianSingleAnalysisText(
  section: UraianAnalysisSectionId,
  report: FullUraianAnalysisReport,
  examTitle: string,
): string {
  const { sheetName, filePrefix, aoa } = buildUraianAnalysisAOA(section, report);
  let content = '';
  if (section === 'unggul-asor') {
    content = buildDistinguishedUnggulAsorText({
      rankedStudents: report.rankedStudents,
      groupSize: report.groupSize,
      examTitle,
      engineLabel: 'rekapinJx (Angket / Uraian)',
      itemCount: report.reliability.itemCount,
      scoreLabel: 'Skor',
    });
  } else {
    const title = examTitle.trim() || 'Rekap Angket / Uraian';
    const headerLines = [
      `LAPORAN ${sheetName.toUpperCase()}`,
      `Instrumen     : ${title}`,
      `Peserta (N)   : ${report.reliability.studentCount}`,
      `Jumlah Butir  : ${report.reliability.itemCount}`,
      `Tanggal       : ${new Date().toISOString().slice(0, 10)}`,
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
    content = [...headerLines, ...tableLines].join('\r\n');
  }
  const blob = new Blob(['\uFEFF' + content], {
    type: 'text/plain;charset=utf-8',
  });
  const filename = `${filePrefix}-${makeSlug(examTitle)}-${new Date().toISOString().slice(0, 10)}.txt`;
  triggerFileDownload(blob, filename);
  return filename;
}

export function exportUraianProjectDataFile(payload: {
  examTitle: string;
  subMode: SurveySubMode;
  itemCount: number;
  scaleMin: number;
  defaultMaxScore: number;
  itemMaxScores: number[];
  rows: UraianStudentRow[];
}): string {
  const normMax = normalizeMaxScores(
    payload.itemMaxScores,
    payload.itemCount,
    payload.defaultMaxScore,
    payload.scaleMin,
  );
  const data: SavedUraianProjectData = {
    format: 'rekap-uraian-v1',
    savedAt: new Date().toISOString(),
    examTitle: payload.examTitle,
    subMode: payload.subMode,
    itemCount: payload.itemCount,
    scaleMin: payload.scaleMin,
    defaultMaxScore: payload.defaultMaxScore,
    itemMaxScores: normMax,
    rows: payload.rows,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const filename = `data-uraian-${makeSlug(payload.examTitle)}-${new Date().toISOString().slice(0, 10)}.json`;
  triggerFileDownload(blob, filename);
  return filename;
}

export function parseUraianProjectDataFile(rawText: string): {
  examTitle: string;
  subMode: SurveySubMode;
  itemCount: number;
  scaleMin: number;
  defaultMaxScore: number;
  itemMaxScores: number[];
  rows: UraianStudentRow[];
} {
  const parsed = JSON.parse(rawText) as Partial<SavedUraianProjectData>;
  if (!parsed || !Array.isArray(parsed.rows)) {
    throw new Error('Format file data uraian/angket tidak valid.');
  }
  const itemCount =
    typeof parsed.itemCount === 'number' &&
    parsed.itemCount >= 1 &&
    parsed.itemCount <= 100
      ? parsed.itemCount
      : 10;
  const scaleMin =
    typeof parsed.scaleMin === 'number' && Number.isFinite(parsed.scaleMin)
      ? parsed.scaleMin
      : 0;
  const defaultMaxScore =
    typeof parsed.defaultMaxScore === 'number' &&
    parsed.defaultMaxScore > scaleMin
      ? parsed.defaultMaxScore
      : 10;
  const subMode: SurveySubMode =
    parsed.subMode === 'angket-4' ||
    parsed.subMode === 'angket-5' ||
    parsed.subMode === 'custom'
      ? parsed.subMode
      : 'uraian';
  const itemMaxScores = normalizeMaxScores(
    Array.isArray(parsed.itemMaxScores) ? parsed.itemMaxScores : [],
    itemCount,
    defaultMaxScore,
    scaleMin,
  );
  const rows: UraianStudentRow[] = parsed.rows.map((r, idx) => ({
    id: typeof r.id === 'number' ? r.id : idx + 1,
    nama: typeof r.nama === 'string' ? r.nama : `Peserta ${idx + 1}`,
    kelas: typeof r.kelas === 'string' ? r.kelas : '',
    scores: Array.isArray(r.scores)
      ? normalizeScores(r.scores, itemCount, scaleMin, itemMaxScores)
      : new Array(itemCount).fill(null),
  }));

  return {
    examTitle: typeof parsed.examTitle === 'string' ? parsed.examTitle : '',
    subMode,
    itemCount,
    scaleMin,
    defaultMaxScore,
    itemMaxScores,
    rows,
  };
}
