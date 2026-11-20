import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { AnswerLetter, StudentRow, SurveySubMode, UraianStudentRow } from '../types/sheet';
import { normalizeAnswers } from './answerParser';
import { makeSlug, triggerFileDownload } from './excelExport';
import {
  computeFullItemAnalysis,
  detectOptionMode,
  type FullItemAnalysisReport,
} from './itemAnalysis';
import {
  computeFullUraianAnalysis,
  computeUraianStudentStats,
  normalizeMaxScores,
  normalizeScores,
  type FullUraianAnalysisReport,
} from './uraianAnalysis';

export interface WordChartPoint {
  nama: string;
  kelas: string;
  rawScore: number;
  maxScore: number;
  percentScore: number;
}

interface RenderedPng {
  data: Uint8Array;
  width: number;
  height: number;
}

const BRAND_PRIMARY = '1B6B4F';
const BRAND_PRIMARY_LIGHT = 'EAF4EF';
const BRAND_SURFACE_ALT = 'F7FAF8';
const BORDER_HEX = 'CFDAD4';
const TEXT_DARK = '14211C';
const TEXT_MUTED = '52635C';

const CELL_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: BORDER_HEX,
} as const;

const TABLE_BORDERS = {
  top: CELL_BORDER,
  bottom: CELL_BORDER,
  left: CELL_BORDER,
  right: CELL_BORDER,
  insideHorizontal: CELL_BORDER,
  insideVertical: CELL_BORDER,
} as const;

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function renderClassAverageChartPng(
  students: WordChartPoint[],
): RenderedPng {
  const cssW = 580;
  const cssH = 270;
  const dpr = 2;
  const canvas = document.createElement('canvas');
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { data: new Uint8Array(), width: cssW, height: cssH };
  }
  ctx.scale(dpr, dpr);

  // Light paper card background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.strokeStyle = '#D4DDD8';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

  const classMap = new Map<string, WordChartPoint[]>();
  let totalPercent = 0;
  for (const s of students) {
    const key = s.kelas.trim() || 'Tanpa Kelas';
    const arr = classMap.get(key);
    if (arr) arr.push(s);
    else classMap.set(key, [s]);
    totalPercent += s.percentScore;
  }

  const groups = Array.from(classMap.entries()).map(([kelas, list]) => {
    const avg =
      list.reduce((acc, item) => acc + item.percentScore, 0) / list.length;
    return {
      kelas,
      count: list.length,
      avg: Math.round(avg * 10) / 10,
    };
  });
  const overallAvg =
    students.length > 0
      ? Math.round((totalPercent / students.length) * 10) / 10
      : 0;

  // Title & subtitle
  ctx.fillStyle = '#14211C';
  ctx.font = '700 13px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Rata-rata Nilai per Kelas (%)', 18, 26);

  ctx.fillStyle = '#9C5718';
  ctx.font = '600 11px "Segoe UI", Arial, sans-serif';
  const refLabel = `Garis putus: rata-rata umum (${overallAvg}%)`;
  const refW = ctx.measureText(refLabel).width;
  ctx.fillText(refLabel, cssW - refW - 18, 26);

  const padLeft = 48;
  const padRight = 22;
  const padTop = 48;
  const padBottom = 48;
  const plotW = cssW - padLeft - padRight;
  const plotH = cssH - padTop - padBottom;

  // Gridlines 0..100
  const ticks = [0, 25, 50, 75, 100];
  ctx.font = '500 10px "Segoe UI", Arial, sans-serif';
  for (const tick of ticks) {
    const y = padTop + plotH - (tick / 100) * plotH;
    ctx.strokeStyle = tick === 0 ? '#C7D4CD' : '#E6ECE8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(padLeft + plotW, y);
    ctx.stroke();

    ctx.fillStyle = '#52635C';
    const label = `${tick}%`;
    const lw = ctx.measureText(label).width;
    ctx.fillText(label, padLeft - lw - 8, y + 3.5);
  }

  // Bars
  const slotW = groups.length > 0 ? plotW / groups.length : plotW;
  const barW = Math.min(54, Math.max(18, slotW * 0.56));
  groups.forEach((g, idx) => {
    const cx = padLeft + idx * slotW + slotW / 2;
    const x = cx - barW / 2;
    const barH = Math.max(2, (g.avg / 100) * plotH);
    const y = padTop + plotH - barH;

    ctx.fillStyle = '#1B6B4F';
    drawRoundedRect(ctx, x, y, barW, barH, 5);
    ctx.fill();

    // Value label
    ctx.fillStyle = '#14211C';
    ctx.font = '700 10px "Segoe UI", Arial, sans-serif';
    const valStr = `${g.avg}%`;
    const vw = ctx.measureText(valStr).width;
    ctx.fillText(valStr, cx - vw / 2, Math.max(padTop - 4, y - 5));

    // X-axis label
    ctx.fillStyle = '#14211C';
    ctx.font = '600 10px "Segoe UI", Arial, sans-serif';
    const nameStr =
      g.kelas.length > 14 ? `${g.kelas.slice(0, 12)}…` : g.kelas;
    const nw = ctx.measureText(nameStr).width;
    ctx.fillText(nameStr, cx - nw / 2, padTop + plotH + 16);

    ctx.fillStyle = '#52635C';
    ctx.font = '500 9.5px "Segoe UI", Arial, sans-serif';
    const countStr = `(${g.count} siswa)`;
    const cw = ctx.measureText(countStr).width;
    ctx.fillText(countStr, cx - cw / 2, padTop + plotH + 30);
  });

  // Overall average reference dashed line
  const refY = padTop + plotH - (overallAvg / 100) * plotH;
  ctx.save();
  ctx.strokeStyle = '#9C5718';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(padLeft, refY);
  ctx.lineTo(padLeft + plotW, refY);
  ctx.stroke();
  ctx.restore();

  return {
    data: dataUrlToUint8Array(canvas.toDataURL('image/png')),
    width: 500,
    height: Math.round((cssH / cssW) * 500),
  };
}

function renderScoreDistributionChartPng(
  students: WordChartPoint[],
): RenderedPng {
  const cssW = 580;
  const cssH = 260;
  const dpr = 2;
  const canvas = document.createElement('canvas');
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { data: new Uint8Array(), width: cssW, height: cssH };
  }
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.strokeStyle = '#D4DDD8';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

  const buckets = [
    { range: '0–20%', min: -Infinity, max: 20, color: '#B42318' },
    { range: '21–40%', min: 20, max: 40, color: '#C47425' },
    { range: '41–60%', min: 40, max: 60, color: '#B0851A' },
    { range: '61–80%', min: 60, max: 80, color: '#2B8C68' },
    { range: '81–100%', min: 80, max: Infinity, color: '#1B6B4F' },
  ].map((b) => {
    const count = students.filter((s) => {
      if (b.range === '0–20%') return s.percentScore <= 20;
      if (b.range === '81–100%') return s.percentScore > 80;
      return s.percentScore > b.min && s.percentScore <= b.max;
    }).length;
    const pct =
      students.length > 0
        ? Math.round((count / students.length) * 1000) / 10
        : 0;
    return { ...b, count, pct };
  });

  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const yCeiling = Math.ceil(maxCount * 1.2);

  ctx.fillStyle = '#14211C';
  ctx.font = '700 13px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Distribusi Nilai Peserta (Rentang 0–100%)', 18, 26);

  ctx.fillStyle = '#52635C';
  ctx.font = '600 11px "Segoe UI", Arial, sans-serif';
  const totalStr = `Total ${students.length} peserta`;
  const tw = ctx.measureText(totalStr).width;
  ctx.fillText(totalStr, cssW - tw - 18, 26);

  const padLeft = 42;
  const padRight = 22;
  const padTop = 48;
  const padBottom = 42;
  const plotW = cssW - padLeft - padRight;
  const plotH = cssH - padTop - padBottom;

  const step = Math.max(1, Math.ceil(yCeiling / 4));
  ctx.font = '500 10px "Segoe UI", Arial, sans-serif';
  for (let val = 0; val <= yCeiling; val += step) {
    const y = padTop + plotH - (val / yCeiling) * plotH;
    ctx.strokeStyle = val === 0 ? '#C7D4CD' : '#E6ECE8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(padLeft + plotW, y);
    ctx.stroke();

    ctx.fillStyle = '#52635C';
    const label = `${val}`;
    const lw = ctx.measureText(label).width;
    ctx.fillText(label, padLeft - lw - 8, y + 3.5);
  }

  const slotW = plotW / buckets.length;
  const barW = Math.min(58, slotW * 0.56);
  buckets.forEach((b, idx) => {
    const cx = padLeft + idx * slotW + slotW / 2;
    const x = cx - barW / 2;
    const barH = b.count > 0 ? Math.max(4, (b.count / yCeiling) * plotH) : 0;
    const y = padTop + plotH - barH;

    if (barH > 0) {
      ctx.fillStyle = b.color;
      drawRoundedRect(ctx, x, y, barW, barH, 5);
      ctx.fill();
    }

    ctx.fillStyle = '#14211C';
    ctx.font = '700 10px "Segoe UI", Arial, sans-serif';
    const valStr = `${b.count} (${b.pct}%)`;
    const vw = ctx.measureText(valStr).width;
    ctx.fillText(valStr, cx - vw / 2, Math.max(padTop - 4, y - 5));

    ctx.fillStyle = '#14211C';
    ctx.font = '600 10.5px "Segoe UI", Arial, sans-serif';
    const rw = ctx.measureText(b.range).width;
    ctx.fillText(b.range, cx - rw / 2, padTop + plotH + 18);
  });

  return {
    data: dataUrlToUint8Array(canvas.toDataURL('image/png')),
    width: 500,
    height: Math.round((cssH / cssW) * 500),
  };
}

function renderItemQualityChartPng(counts: {
  usable: number;
  revise: number;
  discard: number;
}): RenderedPng {
  const cssW = 580;
  const cssH = 170;
  const dpr = 2;
  const canvas = document.createElement('canvas');
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { data: new Uint8Array(), width: cssW, height: cssH };
  }
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.strokeStyle = '#D4DDD8';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

  const total = Math.max(1, counts.usable + counts.revise + counts.discard);
  const bars = [
    { label: 'Dipakai', count: counts.usable, color: '#1B6B4F' },
    { label: 'Revisi', count: counts.revise, color: '#C47425' },
    { label: 'Dibuang', count: counts.discard, color: '#B42318' },
  ];

  ctx.fillStyle = '#14211C';
  ctx.font = '700 13px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Ringkasan Keputusan Kualitas Butir Soal', 18, 25);

  const labelX = 18;
  const barX = 100;
  const maxBarW = cssW - barX - 95;
  const startY = 48;
  const rowGap = 36;

  bars.forEach((b, idx) => {
    const y = startY + idx * rowGap;
    ctx.fillStyle = '#14211C';
    ctx.font = '600 11px "Segoe UI", Arial, sans-serif';
    ctx.fillText(b.label, labelX, y + 14);

    // Track background
    ctx.fillStyle = '#EFF3F1';
    ctx.fillRect(barX, y, maxBarW, 20);

    const w = (b.count / total) * maxBarW;
    if (w > 0) {
      ctx.fillStyle = b.color;
      ctx.fillRect(barX, y, Math.max(4, w), 20);
    }

    const pct = Math.round((b.count / total) * 1000) / 10;
    ctx.fillStyle = '#14211C';
    ctx.font = '700 11px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`${b.count} butir (${pct}%)`, barX + maxBarW + 10, y + 14);
  });

  return {
    data: dataUrlToUint8Array(canvas.toDataURL('image/png')),
    width: 500,
    height: Math.round((cssH / cssW) * 500),
  };
}

function makeCell(
  text: string | number,
  options?: {
    bold?: boolean;
    header?: boolean;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    shading?: string;
    color?: string;
    widthPct?: number;
  },
): TableCell {
  const isHeader = Boolean(options?.header);
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    shading: isHeader
      ? { type: ShadingType.CLEAR, fill: BRAND_PRIMARY, color: 'auto' }
      : options?.shading
        ? { type: ShadingType.CLEAR, fill: options.shading, color: 'auto' }
        : undefined,
    width: options?.widthPct
      ? { size: options.widthPct, type: WidthType.PERCENTAGE }
      : undefined,
    margins: {
      top: 85,
      bottom: 85,
      left: 110,
      right: 110,
    },
    children: [
      new Paragraph({
        alignment: options?.align ?? AlignmentType.LEFT,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text: String(text),
            bold: isHeader || Boolean(options?.bold),
            size: isHeader ? 18 : 18,
            color: isHeader ? 'FFFFFF' : options?.color ?? TEXT_DARK,
            font: 'Calibri',
          }),
        ],
      }),
    ],
  });
}

function buildStyledTable(
  headers: Array<{
    label: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    widthPct?: number;
  }>,
  rows: Array<
    Array<{
      text: string | number;
      bold?: boolean;
      align?: (typeof AlignmentType)[keyof typeof AlignmentType];
      color?: string;
      shading?: string;
    }>
  >,
): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h) =>
      makeCell(h.label, {
        header: true,
        align: h.align ?? AlignmentType.LEFT,
        widthPct: h.widthPct,
      }),
    ),
  });

  const bodyRows = rows.map((row, rowIdx) => {
    const defaultShade = rowIdx % 2 === 1 ? BRAND_SURFACE_ALT : undefined;
    return new TableRow({
      cantSplit: true,
      children: row.map((cell, colIdx) =>
        makeCell(cell.text, {
          bold: cell.bold,
          align: cell.align ?? headers[colIdx]?.align ?? AlignmentType.LEFT,
          color: cell.color,
          shading: cell.shading ?? defaultShade,
          widthPct: headers[colIdx]?.widthPct,
        }),
      ),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: [headerRow, ...bodyRows],
  });
}

function decisionColor(decision: string): { color: string; shading?: string } {
  if (decision === 'Dipakai' || decision === 'Valid') {
    return { color: BRAND_PRIMARY, shading: BRAND_PRIMARY_LIGHT };
  }
  if (decision === 'Revisi') {
    return { color: '8A511D', shading: 'FDF3E7' };
  }
  if (decision === 'Dibuang' || decision === 'Tidak Valid') {
    return { color: 'B42318', shading: 'FDECEC' };
  }
  return { color: TEXT_DARK };
}

function makeSectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 26,
        color: BRAND_PRIMARY,
        font: 'Calibri',
      }),
    ],
  });
}

function makeChartParagraph(img: RenderedPng, caption: string): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [
        new ImageRun({
          type: 'png',
          data: img.data,
          transformation: {
            width: img.width,
            height: img.height,
          },
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 160 },
      children: [
        new TextRun({
          text: caption,
          italics: true,
          size: 18,
          color: TEXT_MUTED,
          font: 'Calibri',
        }),
      ],
    }),
  ];
}

function makeDocHeaderAndFooter(titleText: string) {
  return {
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `rekapinJx · ${titleText}`,
                size: 16,
                color: TEXT_MUTED,
                font: 'Calibri',
              }),
            ],
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Laporan Hasil Pengolahan Data rekapinJx · Halaman ',
                size: 16,
                color: TEXT_MUTED,
                font: 'Calibri',
              }),
              new TextRun({
                children: [PageNumber.CURRENT],
                size: 16,
                color: TEXT_MUTED,
                font: 'Calibri',
              }),
              new TextRun({
                text: ' dari ',
                size: 16,
                color: TEXT_MUTED,
                font: 'Calibri',
              }),
              new TextRun({
                children: [PageNumber.TOTAL_PAGES],
                size: 16,
                color: TEXT_MUTED,
                font: 'Calibri',
              }),
            ],
          }),
        ],
      }),
    },
  };
}

export async function exportAbcWordReport(params: {
  examTitle: string;
  rows: StudentRow[];
  questionCount: number;
  answerKey: AnswerLetter[];
}): Promise<string> {
  const { examTitle, rows, questionCount, answerKey } = params;
  const optionMode = detectOptionMode(rows, questionCount, answerKey);
  const report: FullItemAnalysisReport = computeFullItemAnalysis(
    rows,
    questionCount,
    answerKey,
    optionMode,
  );
  if (!report.hasSufficientData) {
    throw new Error(report.reasonIfInsufficient);
  }

  const normKey = normalizeAnswers(answerKey, questionCount);
  const keyedIndices: number[] = [];
  for (let i = 0; i < questionCount; i++) {
    if (normKey[i] !== '') keyedIndices.push(i);
  }
  const maxScore = Math.max(1, keyedIndices.length);
  const chartStudents: WordChartPoint[] = rows.map((row, idx) => {
    const ans = normalizeAnswers(row.jawaban, questionCount);
    let correct = 0;
    for (const qIdx of keyedIndices) {
      if (ans[qIdx] === normKey[qIdx]) correct++;
    }
    return {
      nama: row.nama || `Siswa ${idx + 1}`,
      kelas: row.kelas || '',
      rawScore: correct,
      maxScore,
      percentScore: Math.round((correct / maxScore) * 1000) / 10,
    };
  });

  const classChart = renderClassAverageChartPng(chartStudents);
  const distChart = renderScoreDistributionChartPng(chartStudents);
  const qualityChart = renderItemQualityChartPng(report.summaryCounts);

  const safeTitle = examTitle.trim() || 'Penilaian Pilihan Ganda (ABC)';
  const dateLabel = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const overallAvgPct =
    chartStudents.length > 0
      ? Math.round(
          (chartStudents.reduce((acc, s) => acc + s.percentScore, 0) /
            chartStudents.length) *
            10,
        ) / 10
      : 0;

  const summaryTable = buildStyledTable(
    [
      { label: 'Parameter Pengolahan Data', widthPct: 52 },
      { label: 'Hasil Nilai', align: AlignmentType.RIGHT, widthPct: 24 },
      { label: 'Keterangan / Kategori', widthPct: 24 },
    ],
    [
      [
        { text: 'Jumlah Peserta (N)', bold: true },
        { text: report.reliability.studentCount },
        { text: `Unggul/Asor: ${report.groupSize} siswa/kel.` },
      ],
      [
        { text: 'Jumlah Butir Berkunci (k)', bold: true },
        { text: `${report.reliability.keyedItemCount} dari ${questionCount}` },
        { text: `${optionMode} pilihan (A–${optionMode === 5 ? 'E' : 'D'})` },
      ],
      [
        { text: 'Rata-rata Skor Benar & Nilai (%)', bold: true },
        { text: `${report.reliability.meanScore} (${overallAvgPct}%)` },
        { text: `Varians total: ${report.reliability.varianceTotal}` },
      ],
      [
        { text: 'Reliabilitas Instrumen (KR-20 / r11)', bold: true },
        {
          text:
            report.reliability.kr20 !== null
              ? report.reliability.kr20.toFixed(3)
              : '—',
          bold: true,
        },
        { text: report.reliability.category, bold: true, color: BRAND_PRIMARY },
      ],
      [
        { text: 'Batas r Tabel (α = 5%) & Validitas', bold: true },
        {
          text:
            report.reliability.rTable !== null
              ? report.reliability.rTable.toFixed(3)
              : '—',
        },
        {
          text: `${report.summaryCounts.valid} valid · ${report.summaryCounts.invalid} tidak valid`,
        },
      ],
      [
        { text: 'Keputusan Kualitas Butir', bold: true },
        { text: `${report.summaryCounts.usable} dipakai` },
        {
          text: `${report.summaryCounts.revise} revisi · ${report.summaryCounts.discard} dibuang`,
        },
      ],
    ],
  );

  const studentTable = buildStyledTable(
    [
      { label: 'Rank', align: AlignmentType.CENTER, widthPct: 8 },
      { label: 'Nama Siswa', widthPct: 34 },
      { label: 'Kelas', align: AlignmentType.CENTER, widthPct: 14 },
      { label: 'Benar', align: AlignmentType.RIGHT, widthPct: 12 },
      { label: 'Nilai (%)', align: AlignmentType.RIGHT, widthPct: 14 },
      { label: 'Kelompok', align: AlignmentType.CENTER, widthPct: 18 },
    ],
    report.rankedStudents.map((st) => {
      const grpStyle =
        st.group === 'Unggul'
          ? { color: BRAND_PRIMARY, shading: BRAND_PRIMARY_LIGHT }
          : st.group === 'Asor'
            ? { color: '8A511D', shading: 'FDF3E7' }
            : { color: TEXT_MUTED };
      return [
        { text: st.rank },
        { text: st.nama, bold: true },
        { text: st.kelas },
        { text: `${st.score}/${st.maxScore}` },
        { text: `${st.scorePercent.toFixed(1)}%`, bold: true },
        { text: st.group, bold: st.group !== 'Tengah', ...grpStyle },
      ];
    }),
  );

  const keyedItems = report.items.filter((it) => it.hasKey);
  const itemTable = buildStyledTable(
    [
      { label: 'No', align: AlignmentType.CENTER, widthPct: 6 },
      { label: 'Kunci', align: AlignmentType.CENTER, widthPct: 7 },
      { label: 'Benar', align: AlignmentType.RIGHT, widthPct: 8 },
      { label: 'P', align: AlignmentType.RIGHT, widthPct: 8 },
      { label: 'Kesukaran', align: AlignmentType.CENTER, widthPct: 10 },
      { label: 'DP (D)', align: AlignmentType.RIGHT, widthPct: 9 },
      { label: 'Korelasi r', align: AlignmentType.RIGHT, widthPct: 10 },
      { label: 'Validitas', align: AlignmentType.CENTER, widthPct: 13 },
      { label: 'Pengecoh', align: AlignmentType.CENTER, widthPct: 14 },
      { label: 'Keputusan', align: AlignmentType.CENTER, widthPct: 15 },
    ],
    keyedItems.map((it) => {
      const valStyle = decisionColor(it.validityStatus);
      const decStyle = decisionColor(it.finalDecision);
      return [
        { text: it.questionNumber, bold: true },
        { text: it.key, bold: true },
        { text: it.correctCount },
        { text: it.difficultyIndex.toFixed(2) },
        { text: it.difficultyCategory },
        { text: it.discriminationIndex.toFixed(2) },
        { text: it.correlationR !== null ? it.correlationR.toFixed(3) : '—' },
        { text: it.validityStatus, bold: true, ...valStyle },
        { text: it.distractorSummary },
        { text: it.finalDecision, bold: true, ...decStyle },
      ];
    }),
  );

  const optionLetters = optionMode === 5 ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];
  const distractorTable = buildStyledTable(
    [
      { label: 'No', align: AlignmentType.CENTER, widthPct: 8 },
      { label: 'Kunci', align: AlignmentType.CENTER, widthPct: 10 },
      ...optionLetters.map((opt) => ({
        label: `Opsi ${opt}`,
        align: AlignmentType.CENTER,
        widthPct: optionMode === 5 ? 12 : 15,
      })),
      { label: 'Pengecoh Efektif', align: AlignmentType.CENTER, widthPct: 22 },
    ],
    keyedItems.map((it) => [
      { text: it.questionNumber, bold: true },
      { text: it.key, bold: true, color: BRAND_PRIMARY },
      ...it.distractors.map((d) => ({
        text: `${d.count} (${d.percent}%)`,
        bold: d.isKey,
        shading: d.isKey ? BRAND_PRIMARY_LIGHT : undefined,
        color: d.isKey ? BRAND_PRIMARY : TEXT_DARK,
      })),
      { text: it.distractorSummary },
    ]),
  );

  const doc = new Document({
    ...makeDocHeaderAndFooter(safeTitle),
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1000, bottom: 1080, left: 1000 },
          },
        },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 60 },
            children: [
              new TextRun({
                text: 'LAPORAN HASIL PENGOLAHAN DATA & ANALISIS BUTIR',
                bold: true,
                size: 32,
                color: BRAND_PRIMARY,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 40 },
            children: [
              new TextRun({
                text: safeTitle,
                bold: true,
                size: 24,
                color: TEXT_DARK,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 200 },
            children: [
              new TextRun({
                text: `Mode: Pilihan Ganda (ABC) · Tanggal Ekspor: ${dateLabel} · Dihasilkan oleh rekapinJx`,
                size: 19,
                color: TEXT_MUTED,
                font: 'Calibri',
              }),
            ],
          }),
          makeSectionHeading('1. Ringkasan Statistik & Reliabilitas Tes'),
          summaryTable,
          makeSectionHeading('2. Grafik Visualisasi Data Kelas & Kualitas Butir'),
          ...makeChartParagraph(
            classChart,
            'Gambar 1. Perbandingan rata-rata nilai per kelas dibandingkan rata-rata umum.',
          ),
          ...makeChartParagraph(
            distChart,
            'Gambar 2. Distribusi perolehan nilai siswa pada rentang 0–100%.',
          ),
          ...makeChartParagraph(
            qualityChart,
            'Gambar 3. Ringkasan keputusan kelayakan butir soal (Dipakai, Revisi, Dibuang).',
          ),
          makeSectionHeading(
            '3. Peringkat Nilai Siswa & Kelompok Unggul–Asor (27%)',
          ),
          studentTable,
          makeSectionHeading('4. Rekap Analisis Butir Soal Lengkap'),
          itemTable,
          makeSectionHeading('5. Sebaran Jawaban & Kualitas Pengecoh per Soal'),
          distractorTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `laporan-analisis-abc-${makeSlug(examTitle)}-${dateStr}.docx`;
  triggerFileDownload(blob, filename);
  return filename;
}

export async function exportUraianWordReport(params: {
  examTitle: string;
  rows: UraianStudentRow[];
  itemCount: number;
  subMode: SurveySubMode;
  scaleMin: number;
  defaultMaxScore: number;
  itemMaxScores: number[];
}): Promise<string> {
  const {
    examTitle,
    rows,
    itemCount,
    subMode,
    scaleMin,
    defaultMaxScore,
    itemMaxScores,
  } = params;

  const normMax = normalizeMaxScores(
    itemMaxScores,
    itemCount,
    defaultMaxScore,
    scaleMin,
  );
  const report: FullUraianAnalysisReport = computeFullUraianAnalysis(
    rows,
    itemCount,
    subMode,
    scaleMin,
    normMax,
  );
  if (!report.hasSufficientData) {
    throw new Error(report.reasonIfInsufficient);
  }

  const chartStudents: WordChartPoint[] = rows.map((row, idx) => {
    const normScores = normalizeScores(
      row.scores,
      itemCount,
      scaleMin,
      normMax,
    );
    const stats = computeUraianStudentStats(normScores, itemCount, normMax);
    const pct =
      stats.maxPossible > 0
        ? Math.round((stats.totalScore / stats.maxPossible) * 1000) / 10
        : 0;
    return {
      nama: row.nama || `Peserta ${idx + 1}`,
      kelas: row.kelas || '',
      rawScore: stats.totalScore,
      maxScore: stats.maxPossible,
      percentScore: pct,
    };
  });

  const classChart = renderClassAverageChartPng(chartStudents);
  const distChart = renderScoreDistributionChartPng(chartStudents);
  const qualityChart = renderItemQualityChartPng(report.summaryCounts);

  const modeLabel =
    subMode === 'angket-4'
      ? 'Angket Skala Likert 1–4'
      : subMode === 'angket-5'
        ? 'Angket Skala Likert 1–5'
        : subMode === 'custom'
          ? 'Angket / Esai Skala Kustom'
          : 'Soal Uraian (Esai)';

  const safeTitle = examTitle.trim() || `Pengolahan Data ${modeLabel}`;
  const dateLabel = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const overallAvgPct =
    chartStudents.length > 0
      ? Math.round(
          (chartStudents.reduce((acc, s) => acc + s.percentScore, 0) /
            chartStudents.length) *
            10,
        ) / 10
      : 0;

  const summaryTable = buildStyledTable(
    [
      { label: 'Parameter Pengolahan Data', widthPct: 52 },
      { label: 'Hasil Nilai', align: AlignmentType.RIGHT, widthPct: 24 },
      { label: 'Keterangan / Kategori', widthPct: 24 },
    ],
    [
      [
        { text: 'Jumlah Responden / Siswa (N)', bold: true },
        { text: report.reliability.studentCount },
        { text: `Unggul/Asor: ${report.groupSize} peserta/kel.` },
      ],
      [
        { text: 'Jumlah Butir Instrumen (k)', bold: true },
        { text: report.reliability.itemCount },
        { text: modeLabel },
      ],
      [
        { text: 'Rata-rata Skor Total & Capaian (%)', bold: true },
        { text: `${report.reliability.meanTotalScore} (${overallAvgPct}%)` },
        { text: `Varians total: ${report.reliability.varianceTotal}` },
      ],
      [
        { text: 'Reliabilitas (Alpha Cronbach)', bold: true },
        {
          text:
            report.reliability.cronbachAlpha !== null
              ? report.reliability.cronbachAlpha.toFixed(3)
              : '—',
          bold: true,
        },
        { text: report.reliability.category, bold: true, color: BRAND_PRIMARY },
      ],
      [
        { text: 'Batas r Tabel (α = 5%) & Validitas', bold: true },
        {
          text:
            report.reliability.rTable !== null
              ? report.reliability.rTable.toFixed(3)
              : '—',
        },
        {
          text: `${report.summaryCounts.valid} valid · ${report.summaryCounts.invalid} tidak valid`,
        },
      ],
      [
        { text: 'Keputusan Kualitas Butir', bold: true },
        { text: `${report.summaryCounts.usable} dipakai` },
        {
          text: `${report.summaryCounts.revise} revisi · ${report.summaryCounts.discard} dibuang`,
        },
      ],
    ],
  );

  const studentTable = buildStyledTable(
    [
      { label: 'Rank', align: AlignmentType.CENTER, widthPct: 8 },
      { label: 'Nama Peserta', widthPct: 34 },
      { label: 'Kelas', align: AlignmentType.CENTER, widthPct: 14 },
      { label: 'Skor Total', align: AlignmentType.RIGHT, widthPct: 14 },
      { label: 'Capaian (%)', align: AlignmentType.RIGHT, widthPct: 12 },
      { label: 'Kelompok', align: AlignmentType.CENTER, widthPct: 18 },
    ],
    report.rankedStudents.map((st) => {
      const grpStyle =
        st.group === 'Unggul'
          ? { color: BRAND_PRIMARY, shading: BRAND_PRIMARY_LIGHT }
          : st.group === 'Asor'
            ? { color: '8A511D', shading: 'FDF3E7' }
            : { color: TEXT_MUTED };
      return [
        { text: st.rank },
        { text: st.nama, bold: true },
        { text: st.kelas },
        { text: `${st.score}/${st.maxScore}` },
        { text: `${st.scorePercent.toFixed(1)}%`, bold: true },
        { text: st.group, bold: st.group !== 'Tengah', ...grpStyle },
      ];
    }),
  );

  const itemTable = buildStyledTable(
    [
      { label: 'No', align: AlignmentType.CENTER, widthPct: 6 },
      { label: 'Maks', align: AlignmentType.RIGHT, widthPct: 8 },
      { label: 'Mean', align: AlignmentType.RIGHT, widthPct: 9 },
      { label: 'SD', align: AlignmentType.RIGHT, widthPct: 9 },
      { label: 'P', align: AlignmentType.RIGHT, widthPct: 8 },
      { label: 'Kategori P', align: AlignmentType.CENTER, widthPct: 13 },
      { label: 'DP (D)', align: AlignmentType.RIGHT, widthPct: 9 },
      { label: 'Korelasi r', align: AlignmentType.RIGHT, widthPct: 10 },
      { label: 'Validitas', align: AlignmentType.CENTER, widthPct: 13 },
      { label: 'Keputusan', align: AlignmentType.CENTER, widthPct: 15 },
    ],
    report.items.map((it) => {
      const valStyle = decisionColor(it.validityStatus);
      const decStyle = decisionColor(it.finalDecision);
      return [
        { text: it.itemNumber, bold: true },
        { text: it.maxScore },
        { text: it.meanScore.toFixed(2) },
        { text: it.stdDev.toFixed(2) },
        { text: it.difficultyIndex.toFixed(2) },
        { text: it.difficultyCategory },
        { text: it.discriminationIndex.toFixed(2) },
        { text: it.correlationR !== null ? it.correlationR.toFixed(3) : '—' },
        { text: it.validityStatus, bold: true, ...valStyle },
        { text: it.finalDecision, bold: true, ...decStyle },
      ];
    }),
  );

  const distTable = buildStyledTable(
    [
      { label: 'No', align: AlignmentType.CENTER, widthPct: 8 },
      { label: 'Skala', align: AlignmentType.CENTER, widthPct: 14 },
      { label: 'Rata-rata', align: AlignmentType.RIGHT, widthPct: 12 },
      { label: 'Sebaran Skor Peserta', widthPct: 66 },
    ],
    report.items.map((it) => [
      { text: it.itemNumber, bold: true },
      { text: `${it.minScore} – ${it.maxScore}` },
      { text: it.meanScore.toFixed(2) },
      { text: it.distributionText },
    ]),
  );

  const doc = new Document({
    ...makeDocHeaderAndFooter(safeTitle),
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1000, bottom: 1080, left: 1000 },
          },
        },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 60 },
            children: [
              new TextRun({
                text: 'LAPORAN HASIL PENGOLAHAN DATA & ANALISIS BUTIR',
                bold: true,
                size: 32,
                color: BRAND_PRIMARY,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 40 },
            children: [
              new TextRun({
                text: safeTitle,
                bold: true,
                size: 24,
                color: TEXT_DARK,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 200 },
            children: [
              new TextRun({
                text: `Mode: ${modeLabel} · Tanggal Ekspor: ${dateLabel} · Dihasilkan oleh rekapinJx`,
                size: 19,
                color: TEXT_MUTED,
                font: 'Calibri',
              }),
            ],
          }),
          makeSectionHeading('1. Ringkasan Statistik & Reliabilitas Instrumen'),
          summaryTable,
          makeSectionHeading('2. Grafik Visualisasi Data Kelas & Kualitas Butir'),
          ...makeChartParagraph(
            classChart,
            'Gambar 1. Perbandingan rata-rata capaian per kelas dibandingkan rata-rata umum.',
          ),
          ...makeChartParagraph(
            distChart,
            'Gambar 2. Distribusi capaian peserta pada rentang 0–100%.',
          ),
          ...makeChartParagraph(
            qualityChart,
            'Gambar 3. Ringkasan keputusan kualitas butir instrumen (Dipakai, Revisi, Dibuang).',
          ),
          makeSectionHeading(
            '3. Peringkat Peserta & Kelompok Unggul–Asor (27%)',
          ),
          studentTable,
          makeSectionHeading('4. Rekap Analisis Butir Angket / Uraian Lengkap'),
          itemTable,
          makeSectionHeading('5. Sebaran Skor per Nomor Butir'),
          distTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `laporan-analisis-uraian-${makeSlug(examTitle)}-${dateStr}.docx`;
  triggerFileDownload(blob, filename);
  return filename;
}
