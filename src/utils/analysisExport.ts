import * as XLSX from 'xlsx';
import type { AnswerLetter, StudentRow } from '../types/sheet';
import { normalizeAnswers } from './answerParser';
import { makeSlug, triggerFileDownload } from './excelExport';
import type { FullItemAnalysisReport } from './itemAnalysis';
import {
  buildDistinguishedUnggulAsorAOA,
  buildDistinguishedUnggulAsorText,
} from './unggulAsorFormat';

export type AnalysisSectionId =
  | 'rekap'
  | 'reliabilitas'
  | 'unggul-asor'
  | 'daya-pembeda'
  | 'tingkat-kesukaran'
  | 'korelasi'
  | 'pengecoh';

export interface SavedProjectData {
  format: 'rekap-anates-v1';
  savedAt: string;
  examTitle: string;
  questionCount: number;
  answerKey: AnswerLetter[];
  rows: StudentRow[];
}

export function exportProjectDataFile(payload: {
  examTitle: string;
  questionCount: number;
  answerKey: AnswerLetter[];
  rows: StudentRow[];
}): string {
  const data: SavedProjectData = {
    format: 'rekap-anates-v1',
    savedAt: new Date().toISOString(),
    examTitle: payload.examTitle,
    questionCount: payload.questionCount,
    answerKey: normalizeAnswers(payload.answerKey, payload.questionCount),
    rows: payload.rows,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `data-tes-${makeSlug(payload.examTitle)}-${dateStr}.json`;
  triggerFileDownload(blob, filename);
  return filename;
}

export function parseProjectDataFile(rawText: string): {
  examTitle: string;
  questionCount: number;
  answerKey: AnswerLetter[];
  rows: StudentRow[];
} {
  const parsed = JSON.parse(rawText) as Partial<SavedProjectData>;
  if (!parsed || !Array.isArray(parsed.rows)) {
    throw new Error('Format file data tidak dikenali.');
  }
  const questionCount =
    typeof parsed.questionCount === 'number' &&
    parsed.questionCount >= 1 &&
    parsed.questionCount <= 200
      ? parsed.questionCount
      : 30;
  const answerKey = Array.isArray(parsed.answerKey)
    ? normalizeAnswers(parsed.answerKey, questionCount)
    : [];
  const rows: StudentRow[] = parsed.rows.map((r, idx) => ({
    id: typeof r.id === 'number' ? r.id : idx + 1,
    nama: typeof r.nama === 'string' ? r.nama : `Siswa ${idx + 1}`,
    kelas: typeof r.kelas === 'string' ? r.kelas : '',
    jawaban: Array.isArray(r.jawaban)
      ? normalizeAnswers(r.jawaban, questionCount)
      : new Array(questionCount).fill(''),
  }));
  return {
    examTitle: typeof parsed.examTitle === 'string' ? parsed.examTitle : '',
    questionCount,
    answerKey,
    rows,
  };
}

function buildAnalysisAOA(
  section: AnalysisSectionId,
  report: FullItemAnalysisReport,
): { sheetName: string; filePrefix: string; aoa: (string | number)[][] } {
  const keyedItems = report.items.filter((it) => it.hasKey);
  const optLetters =
    report.optionMode === 5
      ? ['A', 'B', 'C', 'D', 'E']
      : ['A', 'B', 'C', 'D'];

  switch (section) {
    case 'reliabilitas': {
      return {
        sheetName: 'Reliabilitas',
        filePrefix: 'reliabilitas',
        aoa: [
          ['Parameter Pengujian', 'Nilai'],
          ['Jumlah Peserta (N)', report.reliability.studentCount],
          ['Jumlah Butir Berkunci (k)', report.reliability.keyedItemCount],
          ['Rata-rata Skor Benar', report.reliability.meanScore],
          ['Varians Skor Total (S^2t)', report.reliability.varianceTotal],
          ['Jumlah Varians Butir (Sum pq)', report.reliability.sumPQ],
          [
            'Koefisien Reliabilitas (KR-20 / r11)',
            report.reliability.kr20 !== null ? report.reliability.kr20 : '-',
          ],
          ['Interpretasi Reliabilitas', report.reliability.category],
          [
            'r Tabel (alpha = 5%)',
            report.reliability.rTable !== null ? report.reliability.rTable : '-',
          ],
        ],
      };
    }

    case 'unggul-asor': {
      return {
        sheetName: 'Kel. Unggul & Asor',
        filePrefix: 'kel-unggul-asor',
        aoa: buildDistinguishedUnggulAsorAOA({
          rankedStudents: report.rankedStudents,
          groupSize: report.groupSize,
          engineLabel: 'rekapinJx',
          modeLabel: 'Pilihan Ganda (ABC)',
          scoreHeader: 'Skor Benar',
          percentHeader: 'Nilai (%)',
        }),
      };
    }

    case 'daya-pembeda': {
      return {
        sheetName: 'Daya Pembeda',
        filePrefix: 'daya-pembeda',
        aoa: [
          [
            'No Butir',
            'Kunci',
            `Benar Unggul (n=${report.groupSize})`,
            `Benar Asor (n=${report.groupSize})`,
            'Beda (U - A)',
            'Indeks DP (D)',
            'DP (%)',
            'Tafsiran',
          ],
          ...keyedItems.map((it) => [
            it.questionNumber,
            it.key,
            it.upperCorrect,
            it.lowerCorrect,
            it.upperCorrect - it.lowerCorrect,
            it.discriminationIndex,
            Math.round(it.discriminationIndex * 1000) / 10,
            it.discriminationCategory,
          ]),
        ],
      };
    }

    case 'tingkat-kesukaran': {
      return {
        sheetName: 'Tingkat Kesukaran',
        filePrefix: 'tingkat-kesukaran',
        aoa: [
          [
            'No Butir',
            'Kunci',
            `Jumlah Benar (N=${report.reliability.studentCount})`,
            'Indeks Kesukaran (P)',
            'Persentase Benar (%)',
            'Tafsiran',
          ],
          ...keyedItems.map((it) => [
            it.questionNumber,
            it.key,
            it.correctCount,
            it.difficultyIndex,
            Math.round(it.difficultyIndex * 1000) / 10,
            it.difficultyCategory,
          ]),
        ],
      };
    }

    case 'korelasi': {
      return {
        sheetName: 'Korelasi Skor Butir',
        filePrefix: 'korelasi-skor-butir',
        aoa: [
          [
            'No Butir',
            'Kunci',
            'Korelasi (r hitung)',
            'r Tabel (alpha = 5%)',
            'Signifikansi / Validitas',
          ],
          ...keyedItems.map((it) => [
            it.questionNumber,
            it.key,
            it.correlationR !== null ? it.correlationR : 0,
            report.reliability.rTable !== null ? report.reliability.rTable : '-',
            it.validityStatus,
          ]),
        ],
      };
    }

    case 'pengecoh': {
      const headers: (string | number)[] = ['No Butir', 'Kunci'];
      for (const opt of optLetters) {
        headers.push(`Opsi ${opt} (Jml)`, `Opsi ${opt} (%)`, `Status ${opt}`);
      }
      headers.push('Ringkasan Pengecoh');

      const rows: (string | number)[][] = keyedItems.map((it) => {
        const line: (string | number)[] = [it.questionNumber, it.key];
        for (const d of it.distractors) {
          line.push(d.count, `${d.percent}%`, d.status);
        }
        line.push(it.distractorSummary);
        return line;
      });

      return {
        sheetName: 'Kualitas Pengecoh',
        filePrefix: 'kualitas-pengecoh',
        aoa: [headers, ...rows],
      };
    }

    case 'rekap':
    default: {
      return {
        sheetName: 'Rekap Analisis Butir',
        filePrefix: 'rekap-analisis-butir',
        aoa: [
          [
            'No Butir',
            'Kunci',
            'Korelasi (r)',
            'Validitas',
            'Kesukaran (P)',
            'Tingkat Kesukaran',
            'Daya Pembeda (D)',
            'Kategori DP',
            'Kualitas Pengecoh',
            'Kualitas Akhir',
          ],
          ...keyedItems.map((it) => [
            it.questionNumber,
            it.key,
            it.correlationR !== null ? it.correlationR : 0,
            it.validityStatus,
            it.difficultyIndex,
            it.difficultyCategory,
            it.discriminationIndex,
            it.discriminationCategory,
            it.distractorSummary,
            it.finalDecision,
          ]),
        ],
      };
    }
  }
}

export function exportSingleAnalysisExcel(
  section: AnalysisSectionId,
  report: FullItemAnalysisReport,
  examTitle: string,
): string {
  const { sheetName, filePrefix, aoa } = buildAnalysisAOA(section, report);
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
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${filePrefix}-${makeSlug(examTitle)}-${dateStr}.xlsx`;
  triggerFileDownload(blob, filename);
  return filename;
}

export function exportAllAnalysesExcel(
  report: FullItemAnalysisReport,
  examTitle: string,
): string {
  const wb = XLSX.utils.book_new();
  const sections: AnalysisSectionId[] = [
    'rekap',
    'reliabilitas',
    'unggul-asor',
    'daya-pembeda',
    'tingkat-kesukaran',
    'korelasi',
    'pengecoh',
  ];

  for (const sec of sections) {
    const { sheetName, aoa } = buildAnalysisAOA(sec, report);
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
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `analisis-lengkap-${makeSlug(examTitle)}-${dateStr}.xlsx`;
  triggerFileDownload(blob, filename);
  return filename;
}

export function exportSingleAnalysisText(
  section: AnalysisSectionId,
  report: FullItemAnalysisReport,
  examTitle: string,
): string {
  const { sheetName, filePrefix, aoa } = buildAnalysisAOA(section, report);
  let content = '';

  if (section === 'unggul-asor') {
    content = buildDistinguishedUnggulAsorText({
      rankedStudents: report.rankedStudents,
      groupSize: report.groupSize,
      examTitle,
      engineLabel: 'rekapinJx (Pilihan Ganda ABC)',
      itemCount: report.reliability.keyedItemCount,
      scoreLabel: 'Benar',
    });
  } else {
    const title = examTitle.trim() || 'Rekap Lembar Jawaban';
    const headerLines = [
      `LAPORAN ${sheetName.toUpperCase()}`,
      `Ujian / Mapel : ${title}`,
      `Peserta (N)   : ${report.reliability.studentCount} siswa`,
      `Butir Berkunci: ${report.reliability.keyedItemCount} soal`,
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
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${filePrefix}-${makeSlug(examTitle)}-${dateStr}.txt`;
  triggerFileDownload(blob, filename);
  return filename;
}
