import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as XLSX from 'xlsx';
import type { AnswerLetter, StudentRow } from '../types/sheet';
import { computeStudentStats, normalizeAnswers } from './answerParser';
import { computeFullItemAnalysis, detectOptionMode } from './itemAnalysis';
import { buildDistinguishedUnggulAsorAOA } from './unggulAsorFormat';

export interface ExportPayload {
  rows: StudentRow[];
  questionCount: number;
  examTitle: string;
  answerKey: AnswerLetter[];
}

export interface ExcelSheetPreview {
  name: string;
  headers: (string | number)[];
  rows: (string | number)[][];
}

export interface ExcelPreviewWorkbook {
  filename: string;
  hasKey: boolean;
  questionCount: number;
  studentCount: number;
  mainSheet: ExcelSheetPreview;
  summarySheet: ExcelSheetPreview;
  analysisSheet: ExcelSheetPreview | null;
  groupsSheet: ExcelSheetPreview | null;
}

export function makeSlug(title: string): string {
  const clean = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || 'jawaban-siswa';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function triggerFileDownload(blob: Blob, filename: string): void {
  if (Capacitor.isNativePlatform()) {
    void (async () => {
      try {
        const base64Data = await blobToBase64(blob);
        const saved = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
        });
        await Share.share({
          title: filename,
          url: saved.uri,
          dialogTitle: `Simpan atau bagikan ${filename}`,
        });
      } catch {
        // Fallback to browser anchor download if Capacitor share fails
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 1500);
      }
    })();
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1500);
}

export function buildExcelWorkbookData({
  rows,
  questionCount,
  examTitle,
  answerKey,
}: ExportPayload): ExcelPreviewWorkbook {
  const normKey = normalizeAnswers(answerKey, questionCount);
  const hasKey = normKey.some((k) => k !== '');

  // Sheet 1: Jawaban Siswa
  const mainHeaders: (string | number)[] = ['No', 'Nama Siswa', 'Kelas'];
  for (let i = 1; i <= questionCount; i++) {
    mainHeaders.push(i);
  }
  mainHeaders.push('Terisi', 'Kosong');
  if (hasKey) {
    mainHeaders.push('Benar', 'Salah', 'Nilai (%)');
  }

  const mainRows: (string | number)[][] = [];

  if (hasKey) {
    const keyRow: (string | number)[] = ['-', 'KUNCI JAWABAN', '-'];
    for (let i = 0; i < questionCount; i++) {
      keyRow.push(normKey[i] || '-');
    }
    const keyFilled = normKey.filter((k) => k !== '').length;
    keyRow.push(keyFilled, questionCount - keyFilled, keyFilled, 0, 100);
    mainRows.push(keyRow);
  }

  rows.forEach((row, index) => {
    const normAns = normalizeAnswers(row.jawaban, questionCount);
    const stats = computeStudentStats(row, questionCount, normKey);
    const line: (string | number)[] = [
      index + 1,
      row.nama,
      row.kelas || '-',
      ...normAns,
      stats.filled,
      stats.empty,
    ];
    if (hasKey) {
      line.push(
        stats.correct,
        stats.wrong,
        stats.scorePercent !== null ? stats.scorePercent : 0,
      );
    }
    mainRows.push(line);
  });

  // Sheet 2: Ringkasan per Butir Soal
  const summaryHeaders: (string | number)[] = [
    'No Soal',
    ...(hasKey ? ['Kunci'] : []),
    'A',
    'B',
    'C',
    'D',
    'E',
    'Kosong',
    'Total Terisi',
    ...(hasKey ? ['Jumlah Benar', '% Benar'] : []),
  ];
  const summaryRows: (string | number)[][] = [];

  for (let q = 0; q < questionCount; q++) {
    const counts = { A: 0, B: 0, C: 0, D: 0, E: 0, empty: 0 };
    let correctCount = 0;

    rows.forEach((row) => {
      const normAns = normalizeAnswers(row.jawaban, questionCount);
      const val = normAns[q];
      if (val && val in counts) {
        counts[val as keyof Omit<typeof counts, 'empty'>]++;
      } else {
        counts.empty++;
      }
      if (hasKey && normKey[q] && val === normKey[q]) {
        correctCount++;
      }
    });

    const totalFilled = rows.length - counts.empty;
    const pctCorrect =
      rows.length > 0 ? Math.round((correctCount / rows.length) * 1000) / 10 : 0;

    summaryRows.push([
      `Soal ${q + 1}`,
      ...(hasKey ? [normKey[q] || '-'] : []),
      counts.A,
      counts.B,
      counts.C,
      counts.D,
      counts.E,
      counts.empty,
      totalFilled,
      ...(hasKey ? [correctCount, pctCorrect] : []),
    ]);
  }

  const optionMode = detectOptionMode(rows, questionCount, answerKey);
  const analysis = computeFullItemAnalysis(
    rows,
    questionCount,
    answerKey,
    optionMode,
  );

  let analysisSheet: ExcelSheetPreview | null = null;
  let groupsSheet: ExcelSheetPreview | null = null;

  if (analysis.hasSufficientData) {
    const analysisHeaders: (string | number)[] = [
      'No Soal',
      'Kunci',
      'Jml Benar',
      'Kesukaran (P)',
      'Tingkat Kesukaran',
      'Benar Unggul',
      'Benar Asor',
      'Daya Pembeda (D)',
      'Kategori DP',
      'Korelasi (r)',
      'r tabel',
      'Validitas',
      'Kualitas Pengecoh',
      'Kualitas Akhir',
    ];
    const analysisRows: (string | number)[][] = analysis.items
      .filter((it) => it.hasKey)
      .map((it) => [
        it.questionNumber,
        it.key,
        it.correctCount,
        it.difficultyIndex,
        it.difficultyCategory,
        it.upperCorrect,
        it.lowerCorrect,
        it.discriminationIndex,
        it.discriminationCategory,
        it.correlationR !== null ? it.correlationR : 0,
        analysis.reliability.rTable !== null ? analysis.reliability.rTable : '-',
        it.validityStatus,
        it.distractorSummary,
        it.finalDecision,
      ]);

    analysisRows.push([
      'RELIABILITAS KR-20',
      analysis.reliability.kr20 !== null ? analysis.reliability.kr20 : '-',
      analysis.reliability.category,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);

    analysisSheet = {
      name: 'Analisis Butir',
      headers: analysisHeaders,
      rows: analysisRows,
    };

    groupsSheet = {
      name: 'Kel. Unggul & Asor',
      headers: [
        'Peringkat',
        'Nama Siswa',
        'Kelas',
        'Skor Benar',
        'Skor Maks',
        'Nilai (%)',
        'Kelompok (27%)',
      ],
      rows: analysis.rankedStudents.map((st) => [
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
  const filename = `rekap-${makeSlug(examTitle)}-${dateStr}.xlsx`;

  return {
    filename,
    hasKey,
    questionCount,
    studentCount: rows.length,
    mainSheet: {
      name: 'Jawaban Siswa',
      headers: mainHeaders,
      rows: mainRows,
    },
    summarySheet: {
      name: 'Ringkasan Butir',
      headers: summaryHeaders,
      rows: summaryRows,
    },
    analysisSheet,
    groupsSheet,
  };
}

export function downloadExcelWorkbook(payload: ExportPayload): string {
  const data = buildExcelWorkbookData(payload);

  const wsMain = XLSX.utils.aoa_to_sheet([
    data.mainSheet.headers,
    ...data.mainSheet.rows,
  ]);
  const cols: XLSX.ColInfo[] = [{ wch: 5 }, { wch: 28 }, { wch: 10 }];
  for (let i = 0; i < data.questionCount; i++) {
    cols.push({ wch: 4.5 });
  }
  cols.push({ wch: 8 }, { wch: 8 });
  if (data.hasKey) {
    cols.push({ wch: 8 }, { wch: 8 }, { wch: 10 });
  }
  wsMain['!cols'] = cols;
  if (data.mainSheet.rows.length > 0) {
    wsMain['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: {
          r: data.mainSheet.rows.length,
          c: data.mainSheet.headers.length - 1,
        },
      }),
    };
  }

  const wsSummary = XLSX.utils.aoa_to_sheet([
    data.summarySheet.headers,
    ...data.summarySheet.rows,
  ]);
  wsSummary['!cols'] = [
    { wch: 11 },
    ...(data.hasKey ? [{ wch: 8 }] : []),
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 6 },
    { wch: 9 },
    { wch: 12 },
    ...(data.hasKey ? [{ wch: 13 }, { wch: 10 }] : []),
  ];
  if (data.summarySheet.rows.length > 0) {
    wsSummary['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: {
          r: data.summarySheet.rows.length,
          c: data.summarySheet.headers.length - 1,
        },
      }),
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsMain, data.mainSheet.name);
  XLSX.utils.book_append_sheet(wb, wsSummary, data.summarySheet.name);

  if (data.analysisSheet) {
    const wsAnalysis = XLSX.utils.aoa_to_sheet([
      data.analysisSheet.headers,
      ...data.analysisSheet.rows,
    ]);
    wsAnalysis['!cols'] = [
      { wch: 18 },
      { wch: 8 },
      { wch: 11 },
      { wch: 14 },
      { wch: 17 },
      { wch: 13 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 13 },
      { wch: 17 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsAnalysis, data.analysisSheet.name);
  }

  if (data.groupsSheet) {
    const optionMode = detectOptionMode(
      payload.rows,
      payload.questionCount,
      payload.answerKey,
    );
    const analysis = computeFullItemAnalysis(
      payload.rows,
      payload.questionCount,
      payload.answerKey,
      optionMode,
    );
    const aoa = buildDistinguishedUnggulAsorAOA({
      rankedStudents: analysis.rankedStudents,
      groupSize: analysis.groupSize,
      engineLabel: 'rekapinJx',
      modeLabel: 'Pilihan Ganda (ABC)',
      scoreHeader: 'Skor Benar',
      percentHeader: 'Nilai (%)',
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
    XLSX.utils.book_append_sheet(wb, wsGroups, data.groupsSheet.name);
  }

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerFileDownload(blob, data.filename);
  return data.filename;
}

export function downloadCsvFile({
  rows,
  questionCount,
  examTitle,
  answerKey,
}: ExportPayload): string {
  const normKey = normalizeAnswers(answerKey, questionCount);
  const hasKey = normKey.some((k) => k !== '');

  const escapeCsv = (val: string | number) => {
    const str = String(val);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header: (string | number)[] = ['No', 'Nama Siswa', 'Kelas'];
  for (let i = 1; i <= questionCount; i++) {
    header.push(i);
  }
  header.push('Terisi', 'Kosong');
  if (hasKey) {
    header.push('Benar', 'Salah', 'Nilai (%)');
  }

  const lines: string[] = [header.map(escapeCsv).join(',')];

  rows.forEach((row, idx) => {
    const normAns = normalizeAnswers(row.jawaban, questionCount);
    const stats = computeStudentStats(row, questionCount, normKey);
    const cols: (string | number)[] = [
      idx + 1,
      row.nama,
      row.kelas || '-',
      ...normAns,
      stats.filled,
      stats.empty,
    ];
    if (hasKey) {
      cols.push(
        stats.correct,
        stats.wrong,
        stats.scorePercent !== null ? stats.scorePercent : 0,
      );
    }
    lines.push(cols.map(escapeCsv).join(','));
  });

  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `rekap-${makeSlug(examTitle)}-${dateStr}.csv`;
  triggerFileDownload(blob, filename);
  return filename;
}

export function buildTsvText(
  rows: StudentRow[],
  questionCount: number,
  answerKey: AnswerLetter[],
): string {
  const normKey = normalizeAnswers(answerKey, questionCount);
  const hasKey = normKey.some((k) => k !== '');

  const header: (string | number)[] = ['No', 'Nama Siswa', 'Kelas'];
  for (let i = 1; i <= questionCount; i++) {
    header.push(i);
  }
  header.push('Terisi', 'Kosong');
  if (hasKey) {
    header.push('Benar', 'Salah', 'Nilai (%)');
  }

  const lines: string[] = [header.join('\t')];
  rows.forEach((row, idx) => {
    const normAns = normalizeAnswers(row.jawaban, questionCount);
    const stats = computeStudentStats(row, questionCount, normKey);
    const cols: (string | number)[] = [
      idx + 1,
      row.nama,
      row.kelas || '-',
      ...normAns,
      stats.filled,
      stats.empty,
    ];
    if (hasKey) {
      cols.push(
        stats.correct,
        stats.wrong,
        stats.scorePercent !== null ? stats.scorePercent : 0,
      );
    }
    lines.push(cols.join('\t'));
  });
  return lines.join('\n');
}
