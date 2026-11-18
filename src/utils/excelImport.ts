import * as XLSX from 'xlsx';
import type {
  AnswerLetter,
  ScoreValue,
  StudentRow,
  UraianStudentRow,
} from '../types/sheet';
import {
  normalizeAnswers,
  parseBulkAnswers,
  sanitizeAnswerChar,
} from './answerParser';
import { makeSlug, triggerFileDownload } from './excelExport';
import { clampScore, normalizeMaxScores } from './uraianAnalysis';

export interface LoadedExcelWorkbook {
  filename: string;
  sheetNames: string[];
  sheets: Record<string, unknown[][]>;
}

export interface ParsedAbcExcelImport {
  detectedQuestionCount: number;
  detectedAnswerKey: AnswerLetter[] | null;
  rows: Array<{ nama: string; kelas: string; jawaban: AnswerLetter[] }>;
  warnings: string[];
}

export interface ParsedUraianExcelImport {
  detectedItemCount: number;
  detectedMaxScores: number[] | null;
  inferredMinScore: number;
  inferredMaxScore: number;
  rows: Array<{ nama: string; kelas: string; scores: ScoreValue[] }>;
  warnings: string[];
}

const SUMMARY_HEADER_REGEX =
  /^(terisi|kosong|benar|salah|nilai(\s*\(%\))?|total(\s*skor)?|skor\s*(total|maks|maksimum)?|rata-?rata|capaian(\s*\(%\))?|persen(tase)?|ket(erangan)?|peringkat|rank|kelompok)$/i;

const NO_HEADER_REGEX = /^(no\.?|nomor|urut|#)$/i;
const NAME_HEADER_REGEX =
  /^(nama(\s*(lengkap|siswa|peserta|responden))?|siswa|peserta|responden|student(\s*name)?|name)$/i;
const CLASS_HEADER_REGEX =
  /^(kelas|kls|rombel|kelompok|group|class|jurusan)$/i;
const KEY_ROW_NAME_REGEX = /^kunci(\s*jawaban)?$/i;
const MAX_ROW_NAME_REGEX =
  /^(skor\s*maks(imum)?|bobot(\s*maks(imum)?)?|max\s*score)$/i;

function cellToString(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function parseNumericCell(val: unknown): number | null {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  const s = cellToString(val);
  if (!s || s === '-' || s === '_' || s === '—') return null;
  const num = Number(s.replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

function findHeaderRowIndex(rawRows: unknown[][]): number {
  const limit = Math.min(rawRows.length, 15);
  let bestIdx = -1;
  let bestScore = 0;

  for (let r = 0; r < limit; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;
    let score = 0;
    let itemHeaderHits = 0;

    for (const cell of row) {
      const s = cellToString(cell);
      if (!s) continue;
      if (NAME_HEADER_REGEX.test(s)) score += 6;
      if (CLASS_HEADER_REGEX.test(s)) score += 3;
      if (NO_HEADER_REGEX.test(s)) score += 2;
      if (/^(soal|no|butir|item|q|s|p|b)?\s*[-_.]?\s*\d{1,3}$/i.test(s)) {
        itemHeaderHits++;
      }
      if (SUMMARY_HEADER_REGEX.test(s)) score += 2;
    }

    score += Math.min(itemHeaderHits, 10);
    if (score > bestScore && score >= 5) {
      bestScore = score;
      bestIdx = r;
    }
  }

  return bestIdx;
}

function isItemHeaderLabel(header: string): number | null {
  const m = /^(?:soal|no\.?|butir|item|pertanyaan|q|s|p|b)?\s*[-_.]?\s*(\d{1,3})$/i.exec(
    header.trim(),
  );
  if (!m) return null;
  const num = parseInt(m[1], 10);
  return num >= 1 && num <= 200 ? num : null;
}

export async function readExcelFile(file: File): Promise<LoadedExcelWorkbook> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheets: Record<string, unknown[][]> = {};
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    sheets[name] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
      blankrows: false,
    }) as unknown[][];
  }
  return {
    filename: file.name,
    sheetNames: wb.SheetNames,
    sheets,
  };
}

export function pickBestSheetName(
  sheetNames: string[],
  mode: 'abc' | 'uraian',
): string {
  if (sheetNames.length === 0) return '';
  const preferred =
    mode === 'abc'
      ? ['jawaban siswa', 'jawaban', 'data', 'sheet1']
      : ['skor uraian', 'skor angket', 'skor', 'data', 'sheet1'];

  for (const target of preferred) {
    const found = sheetNames.find((n) => n.toLowerCase().includes(target));
    if (found) return found;
  }
  return sheetNames[0];
}

export function parseAbcExcelSheet(
  rawRows: unknown[][],
  fallbackQuestionCount: number,
): ParsedAbcExcelImport {
  const warnings: string[] = [];
  if (!rawRows || rawRows.length === 0) {
    return {
      detectedQuestionCount: fallbackQuestionCount,
      detectedAnswerKey: null,
      rows: [],
      warnings: ['Lembar kerja kosong.'],
    };
  }

  const headerIdx = findHeaderRowIndex(rawRows);
  const hasHeader = headerIdx >= 0;
  const headerRow = hasHeader
    ? rawRows[headerIdx].map(cellToString)
    : [];
  const dataStartIdx = hasHeader ? headerIdx + 1 : 0;

  const maxCols = rawRows.reduce(
    (acc, r) => Math.max(acc, Array.isArray(r) ? r.length : 0),
    headerRow.length,
  );

  let noCol = -1;
  let nameCol = -1;
  let classCol = -1;
  let singleAnswerCol = -1;
  const itemCols: number[] = [];

  if (hasHeader) {
    for (let c = 0; c < maxCols; c++) {
      const h = headerRow[c] || '';
      if (!h) continue;
      if (noCol < 0 && NO_HEADER_REGEX.test(h)) {
        noCol = c;
      } else if (nameCol < 0 && NAME_HEADER_REGEX.test(h)) {
        nameCol = c;
      } else if (classCol < 0 && CLASS_HEADER_REGEX.test(h)) {
        classCol = c;
      } else if (singleAnswerCol < 0 && /^jawaban$/i.test(h)) {
        singleAnswerCol = c;
      } else if (!SUMMARY_HEADER_REGEX.test(h) && isItemHeaderLabel(h) !== null) {
        itemCols.push(c);
      }
    }
  }

  // Fallback column inference if no explicit header or item columns found
  if (nameCol < 0) {
    // Pick first column that isn't purely sequential integers
    for (let c = 0; c < Math.min(maxCols, 4); c++) {
      if (c === noCol || c === classCol) continue;
      const sample = rawRows
        .slice(dataStartIdx, dataStartIdx + 8)
        .map((r) => cellToString(r?.[c]));
      const looksLikeNo = sample.every((v, idx) => {
        if (!v) return true;
        const n = Number(v);
        return Number.isInteger(n) && n >= 1 && n <= rawRows.length + 5 && idx < 8;
      });
      if (looksLikeNo && noCol < 0 && c === 0 && maxCols > 1) {
        noCol = c;
        continue;
      }
      if (sample.some((v) => v.length > 1 && !/^[A-E]$/i.test(v))) {
        nameCol = c;
        break;
      }
    }
    if (nameCol < 0) {
      nameCol = noCol === 0 && maxCols > 1 ? 1 : 0;
    }
  }

  if (itemCols.length === 0 && singleAnswerCol < 0) {
    // Infer item columns after name/class columns if values look like A-E or blank
    const startSearchCol = Math.max(nameCol, classCol, noCol) + 1;
    for (let c = startSearchCol; c < maxCols; c++) {
      const h = headerRow[c] || '';
      if (SUMMARY_HEADER_REGEX.test(h)) break;
      const colVals = rawRows
        .slice(dataStartIdx, dataStartIdx + 15)
        .map((r) => cellToString(r?.[c]));
      const nonEmpty = colVals.filter((v) => v && v !== '-' && v !== '_');
      if (
        nonEmpty.length > 0 &&
        nonEmpty.every((v) => /^[A-Ea-e]$/.test(v))
      ) {
        itemCols.push(c);
      }
    }
  }

  const detectedQuestionCount =
    itemCols.length > 0
      ? Math.min(200, Math.max(1, itemCols.length))
      : fallbackQuestionCount;

  let detectedAnswerKey: AnswerLetter[] | null = null;
  const rows: Array<{ nama: string; kelas: string; jawaban: AnswerLetter[] }> = [];

  for (let r = dataStartIdx; r < rawRows.length; r++) {
    const rawRow = rawRows[r];
    if (!Array.isArray(rawRow)) continue;

    const nama = cellToString(rawRow[nameCol]);
    const kelasRaw = classCol >= 0 ? cellToString(rawRow[classCol]) : '';
    const kelas = kelasRaw === '-' ? '' : kelasRaw;

    // Check if entire row is empty
    const hasAnyValue = rawRow.some((cell) => cellToString(cell) !== '');
    if (!hasAnyValue) continue;

    // Detect KUNCI JAWABAN row
    if (nama && KEY_ROW_NAME_REGEX.test(nama)) {
      if (itemCols.length > 0) {
        const keyArr = itemCols
          .slice(0, 200)
          .map((c) => sanitizeAnswerChar(cellToString(rawRow[c])));
        if (keyArr.some((k) => k !== '')) {
          detectedAnswerKey = keyArr;
        }
      } else if (singleAnswerCol >= 0) {
        const parsed = parseBulkAnswers(
          cellToString(rawRow[singleAnswerCol]),
          detectedQuestionCount,
        );
        if (parsed.some((k) => k !== '')) {
          detectedAnswerKey = parsed;
        }
      }
      continue;
    }

    if (!nama) continue;

    let jawaban: AnswerLetter[];
    if (itemCols.length > 0) {
      jawaban = itemCols
        .slice(0, 200)
        .map((c) => sanitizeAnswerChar(cellToString(rawRow[c])));
    } else if (singleAnswerCol >= 0) {
      jawaban = parseBulkAnswers(
        cellToString(rawRow[singleAnswerCol]),
        detectedQuestionCount,
      );
    } else {
      jawaban = new Array(detectedQuestionCount).fill('');
    }

    rows.push({
      nama,
      kelas,
      jawaban: normalizeAnswers(jawaban, detectedQuestionCount),
    });
  }

  if (rows.length === 0) {
    warnings.push(
      'Tidak ditemukan baris siswa yang valid. Pastikan kolom Nama dan jawaban (A–E) tersedia.',
    );
  } else if (itemCols.length === 0 && singleAnswerCol < 0) {
    warnings.push(
      'Kolom nomor soal (1, 2, 3...) tidak ditemukan; hanya daftar nama & kelas yang akan diimpor.',
    );
  }

  return {
    detectedQuestionCount,
    detectedAnswerKey,
    rows,
    warnings,
  };
}

export function parseUraianExcelSheet(
  rawRows: unknown[][],
  fallbackItemCount: number,
  fallbackMinScore: number,
  fallbackMaxScore: number,
): ParsedUraianExcelImport {
  const warnings: string[] = [];
  if (!rawRows || rawRows.length === 0) {
    return {
      detectedItemCount: fallbackItemCount,
      detectedMaxScores: null,
      inferredMinScore: fallbackMinScore,
      inferredMaxScore: fallbackMaxScore,
      rows: [],
      warnings: ['Lembar kerja kosong.'],
    };
  }

  const headerIdx = findHeaderRowIndex(rawRows);
  const hasHeader = headerIdx >= 0;
  const headerRow = hasHeader ? rawRows[headerIdx].map(cellToString) : [];
  const dataStartIdx = hasHeader ? headerIdx + 1 : 0;

  const maxCols = rawRows.reduce(
    (acc, r) => Math.max(acc, Array.isArray(r) ? r.length : 0),
    headerRow.length,
  );

  let noCol = -1;
  let nameCol = -1;
  let classCol = -1;
  const itemCols: number[] = [];

  if (hasHeader) {
    for (let c = 0; c < maxCols; c++) {
      const h = headerRow[c] || '';
      if (!h) continue;
      if (noCol < 0 && NO_HEADER_REGEX.test(h)) {
        noCol = c;
      } else if (nameCol < 0 && NAME_HEADER_REGEX.test(h)) {
        nameCol = c;
      } else if (classCol < 0 && CLASS_HEADER_REGEX.test(h)) {
        classCol = c;
      } else if (!SUMMARY_HEADER_REGEX.test(h) && isItemHeaderLabel(h) !== null) {
        itemCols.push(c);
      }
    }
  }

  if (nameCol < 0) {
    for (let c = 0; c < Math.min(maxCols, 4); c++) {
      if (c === noCol || c === classCol) continue;
      const sample = rawRows
        .slice(dataStartIdx, dataStartIdx + 8)
        .map((r) => cellToString(r?.[c]));
      const looksLikeNo = sample.every((v, idx) => {
        if (!v) return true;
        const n = Number(v);
        return Number.isInteger(n) && n >= 1 && n <= rawRows.length + 5 && idx < 8;
      });
      if (looksLikeNo && noCol < 0 && c === 0 && maxCols > 1) {
        noCol = c;
        continue;
      }
      if (sample.some((v) => v.length > 0 && parseNumericCell(v) === null)) {
        nameCol = c;
        break;
      }
    }
    if (nameCol < 0) {
      nameCol = noCol === 0 && maxCols > 1 ? 1 : 0;
    }
  }

  if (itemCols.length === 0) {
    const startSearchCol = Math.max(nameCol, classCol, noCol) + 1;
    for (let c = startSearchCol; c < maxCols; c++) {
      const h = headerRow[c] || '';
      if (SUMMARY_HEADER_REGEX.test(h)) break;
      const colVals = rawRows
        .slice(dataStartIdx, dataStartIdx + 15)
        .map((r) => r?.[c]);
      const nonEmpty = colVals.filter((v) => cellToString(v) !== '');
      if (
        nonEmpty.length > 0 &&
        nonEmpty.every(
          (v) => parseNumericCell(v) !== null || cellToString(v) === '-',
        )
      ) {
        itemCols.push(c);
      }
    }
  }

  const detectedItemCount =
    itemCols.length > 0
      ? Math.min(100, Math.max(1, itemCols.length))
      : fallbackItemCount;

  let detectedMaxScores: number[] | null = null;
  const rawParsedRows: Array<{
    nama: string;
    kelas: string;
    rawScores: ScoreValue[];
  }> = [];

  let observedMin = Infinity;
  let observedMax = -Infinity;

  for (let r = dataStartIdx; r < rawRows.length; r++) {
    const rawRow = rawRows[r];
    if (!Array.isArray(rawRow)) continue;

    const nama = cellToString(rawRow[nameCol]);
    const kelasRaw = classCol >= 0 ? cellToString(rawRow[classCol]) : '';
    const kelas = kelasRaw === '-' ? '' : kelasRaw;

    const hasAnyValue = rawRow.some((cell) => cellToString(cell) !== '');
    if (!hasAnyValue) continue;

    if (nama && MAX_ROW_NAME_REGEX.test(nama)) {
      if (itemCols.length > 0) {
        const maxArr = itemCols.slice(0, 100).map((c) => {
          const num = parseNumericCell(rawRow[c]);
          return num !== null && num > 0 ? num : fallbackMaxScore;
        });
        detectedMaxScores = maxArr;
      }
      continue;
    }

    if (!nama) continue;

    const rawScores: ScoreValue[] =
      itemCols.length > 0
        ? itemCols.slice(0, detectedItemCount).map((c) => {
            const num = parseNumericCell(rawRow[c]);
            if (num !== null) {
              if (num < observedMin) observedMin = num;
              if (num > observedMax) observedMax = num;
            }
            return num;
          })
        : new Array(detectedItemCount).fill(null);

    rawParsedRows.push({ nama, kelas, rawScores });
  }

  const inferredMinScore =
    observedMin !== Infinity && observedMin < fallbackMinScore
      ? Math.max(0, Math.floor(observedMin))
      : fallbackMinScore;

  const maxFromDetected = detectedMaxScores
    ? Math.max(...detectedMaxScores)
    : 0;
  const inferredMaxScore = Math.max(
    fallbackMaxScore,
    observedMax !== -Infinity ? Math.ceil(observedMax) : fallbackMaxScore,
    maxFromDetected,
  );

  const normMax = detectedMaxScores
    ? normalizeMaxScores(
        detectedMaxScores,
        detectedItemCount,
        inferredMaxScore,
        inferredMinScore,
      )
    : new Array(detectedItemCount).fill(inferredMaxScore);

  const rows = rawParsedRows.map((item) => ({
    nama: item.nama,
    kelas: item.kelas,
    scores: item.rawScores.map((v, idx) =>
      v === null ? null : clampScore(v, inferredMinScore, normMax[idx]),
    ),
  }));

  if (rows.length === 0) {
    warnings.push(
      'Tidak ditemukan baris peserta yang valid. Pastikan kolom Nama dan skor numerik tersedia.',
    );
  } else if (itemCols.length === 0) {
    warnings.push(
      'Kolom skor butir (1, 2, 3... atau B1, B2...) tidak ditemukan; hanya daftar nama & kelas yang akan diimpor.',
    );
  }

  return {
    detectedItemCount,
    detectedMaxScores,
    inferredMinScore,
    inferredMaxScore,
    rows,
    warnings,
  };
}

export function buildImportedStudentRows(
  parsed: Array<{ nama: string; kelas: string; jawaban: AnswerLetter[] }>,
  startSeq: number,
  questionCount: number,
): StudentRow[] {
  let seq = startSeq;
  return parsed.map((p) => {
    seq += 1;
    return {
      id: seq,
      nama: p.nama,
      kelas: p.kelas,
      jawaban: normalizeAnswers(p.jawaban, questionCount),
    };
  });
}

export function buildImportedUraianRows(
  parsed: Array<{ nama: string; kelas: string; scores: ScoreValue[] }>,
  startSeq: number,
  itemCount: number,
): UraianStudentRow[] {
  let seq = startSeq;
  return parsed.map((p) => {
    seq += 1;
    return {
      id: seq,
      nama: p.nama,
      kelas: p.kelas,
      scores: Array.from({ length: itemCount }, (_, i) => p.scores[i] ?? null),
    };
  });
}

export function downloadAbcExcelTemplate(
  questionCount: number,
  examTitle: string,
): string {
  const count = Math.min(200, Math.max(1, questionCount));
  const headers: (string | number)[] = ['No', 'Nama Siswa', 'Kelas'];
  for (let i = 1; i <= count; i++) headers.push(i);

  const opts = ['A', 'B', 'C', 'D', 'E'];
  const keyRow: (string | number)[] = [
    '-',
    'KUNCI JAWABAN',
    '-',
    ...Array.from({ length: count }, (_, i) => opts[i % 4]),
  ];
  const sample1: (string | number)[] = [
    1,
    'Ahmad Fauzi',
    'VIII-A',
    ...Array.from({ length: count }, (_, i) => opts[i % 4]),
  ];
  const sample2: (string | number)[] = [
    2,
    'Siti Nurhaliza',
    'VIII-A',
    ...Array.from({ length: count }, (_, i) => opts[(i + 1) % 4]),
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, keyRow, sample1, sample2]);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 24 },
    { wch: 10 },
    ...Array.from({ length: count }, () => ({ wch: 4.5 })),
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Jawaban Siswa');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const filename = `template-impor-abc-${makeSlug(examTitle)}.xlsx`;
  triggerFileDownload(blob, filename);
  return filename;
}

export function downloadUraianExcelTemplate(
  itemCount: number,
  defaultMaxScore: number,
  examTitle: string,
): string {
  const count = Math.min(100, Math.max(1, itemCount));
  const headers: (string | number)[] = ['No', 'Nama Siswa', 'Kelas'];
  for (let i = 1; i <= count; i++) headers.push(`B${i}`);

  const maxRow: (string | number)[] = [
    '-',
    'SKOR MAKSIMUM',
    '-',
    ...new Array(count).fill(defaultMaxScore),
  ];
  const sample1: (string | number)[] = [
    1,
    'Aulia Rahman',
    'VIII-A',
    ...Array.from({ length: count }, (_, i) =>
      Math.max(1, Math.round(defaultMaxScore * (0.75 + (i % 3) * 0.08))),
    ),
  ];
  const sample2: (string | number)[] = [
    2,
    'Nadia Kusuma',
    'VIII-B',
    ...Array.from({ length: count }, (_, i) =>
      Math.max(1, Math.round(defaultMaxScore * (0.65 + (i % 2) * 0.15))),
    ),
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, maxRow, sample1, sample2]);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 24 },
    { wch: 10 },
    ...Array.from({ length: count }, () => ({ wch: 6 })),
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Skor Uraian');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const filename = `template-impor-uraian-${makeSlug(examTitle)}.xlsx`;
  triggerFileDownload(blob, filename);
  return filename;
}
