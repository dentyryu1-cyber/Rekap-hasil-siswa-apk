import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
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
import {
  computeAnatesV4AbcReport,
  computeAnatesV4UraianReport,
  type FullAnatesV4AbcReport,
  type FullAnatesV4UraianReport,
} from './anatesV4Analysis';
import { normalizeAnswers } from './answerParser';
import { makeSlug, triggerFileDownload } from './excelExport';
import {
  computeFullItemAnalysis,
  detectOptionMode,
  type FullItemAnalysisReport,
  type RankedStudent,
} from './itemAnalysis';
import { formatScoreRange, splitUnggulAsorGroups } from './unggulAsorFormat';
import {
  computeFullUraianAnalysis,
  computeUraianStudentStats,
  normalizeMaxScores,
  normalizeScores,
  type FullUraianAnalysisReport,
} from './uraianAnalysis';

export type WordReportVariant = 'rekapinjx' | 'anatesv4' | 'both';

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
const ANATES_PRIMARY = '8A511D';
const ANATES_PRIMARY_LIGHT = 'FDF3E7';
const ANATES_SURFACE_ALT = 'FBF8F4';
const UNGGUL_PRIMARY = '1E3A5F';
const UNGGUL_ALT = 'F4F8FC';
const ASOR_PRIMARY = '912018';
const ASOR_ALT = 'FFF6F6';
const SLATE_PRIMARY = '475467';
const SLATE_ALT = 'F8FAFC';
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
  accentHex = '#1B6B4F',
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

  const slotW = groups.length > 0 ? plotW / groups.length : plotW;
  const barW = Math.min(54, Math.max(18, slotW * 0.56));
  groups.forEach((g, idx) => {
    const cx = padLeft + idx * slotW + slotW / 2;
    const x = cx - barW / 2;
    const barH = Math.max(2, (g.avg / 100) * plotH);
    const y = padTop + plotH - barH;

    ctx.fillStyle = accentHex;
    drawRoundedRect(ctx, x, y, barW, barH, 5);
    ctx.fill();

    ctx.fillStyle = '#14211C';
    ctx.font = '700 10px "Segoe UI", Arial, sans-serif';
    const valStr = `${g.avg}%`;
    const vw = ctx.measureText(valStr).width;
    ctx.fillText(valStr, cx - vw / 2, Math.max(padTop - 4, y - 5));

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
  ctx.fillText('Ringkasan Keputusan Kualitas Butir (Versi rekapinJx)', 18, 25);

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

function renderAnatesDifficultyChartPng(counts: {
  veryEasy: number;
  easy: number;
  medium: number;
  hard: number;
  veryHard: number;
}): RenderedPng {
  const cssW = 580;
  const cssH = 225;
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
  ctx.strokeStyle = '#E5D8C8';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

  const total = Math.max(
    1,
    counts.veryEasy +
      counts.easy +
      counts.medium +
      counts.hard +
      counts.veryHard,
  );
  const bars = [
    { label: 'Sangat Mudah (>85%)', count: counts.veryEasy, color: '#B0851A' },
    { label: 'Mudah (71–85%)', count: counts.easy, color: '#2B8C68' },
    { label: 'Sedang (31–70%)', count: counts.medium, color: '#1B6B4F' },
    { label: 'Sukar (16–30%)', count: counts.hard, color: '#C47425' },
    { label: 'Sangat Sukar (≤15%)', count: counts.veryHard, color: '#B42318' },
  ];

  ctx.fillStyle = '#14211C';
  ctx.font = '700 13px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Sebaran 5 Kategori Tingkat Kesukaran (Metode Anates V4)', 18, 25);

  const labelX = 18;
  const barX = 165;
  const maxBarW = cssW - barX - 95;
  const startY = 46;
  const rowGap = 33;

  bars.forEach((b, idx) => {
    const y = startY + idx * rowGap;
    ctx.fillStyle = '#14211C';
    ctx.font = '600 10.5px "Segoe UI", Arial, sans-serif';
    ctx.fillText(b.label, labelX, y + 14);

    ctx.fillStyle = '#F7F3EE';
    ctx.fillRect(barX, y, maxBarW, 18);

    const w = (b.count / total) * maxBarW;
    if (w > 0) {
      ctx.fillStyle = b.color;
      ctx.fillRect(barX, y, Math.max(4, w), 18);
    }

    const pct = Math.round((b.count / total) * 1000) / 10;
    ctx.fillStyle = '#14211C';
    ctx.font = '700 10.5px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`${b.count} butir (${pct}%)`, barX + maxBarW + 10, y + 13);
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
    headerFill?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    shading?: string;
    color?: string;
    widthPct?: number;
  },
): TableCell {
  const isHeader = Boolean(options?.header);
  const headerFill = options?.headerFill ?? BRAND_PRIMARY;
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    shading: isHeader
      ? { type: ShadingType.CLEAR, fill: headerFill, color: 'auto' }
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
            size: 18,
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
  theme?: { headerFill?: string; altRowFill?: string },
): Table {
  const headerFill = theme?.headerFill ?? BRAND_PRIMARY;
  const altRowFill = theme?.altRowFill ?? BRAND_SURFACE_ALT;

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h) =>
      makeCell(h.label, {
        header: true,
        headerFill,
        align: h.align ?? AlignmentType.LEFT,
        widthPct: h.widthPct,
      }),
    ),
  });

  const bodyRows = rows.map((row, rowIdx) => {
    const defaultShade = rowIdx % 2 === 1 ? altRowFill : undefined;
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
  if (
    decision === 'Dipakai' ||
    decision === 'Valid' ||
    decision === 'Sangat Signifikan' ||
    decision === 'Signifikan'
  ) {
    return { color: BRAND_PRIMARY, shading: BRAND_PRIMARY_LIGHT };
  }
  if (decision === 'Revisi') {
    return { color: '8A511D', shading: 'FDF3E7' };
  }
  if (
    decision === 'Dibuang' ||
    decision === 'Tidak Valid' ||
    decision === 'Tidak Signifikan'
  ) {
    return { color: 'B42318', shading: 'FDECEC' };
  }
  return { color: TEXT_DARK };
}

function makeSectionHeading(
  text: string,
  colorHex = BRAND_PRIMARY,
): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 25,
        color: colorHex,
        font: 'Calibri',
      }),
    ],
  });
}

function makeChapterBanner(
  chapterTitle: string,
  subtitle: string,
  accentHex: string,
): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 240, after: 40 },
      children: [
        new TextRun({
          text: chapterTitle,
          bold: true,
          size: 30,
          color: accentHex,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 140 },
      children: [
        new TextRun({
          text: subtitle,
          italics: true,
          size: 19,
          color: TEXT_MUTED,
          font: 'Calibri',
        }),
      ],
    }),
  ];
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

function makeDocHeaderAndFooter(titleText: string, variantLabel: string) {
  return {
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `${variantLabel} · ${titleText}`,
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
                text: `Laporan Pengolahan Data (${variantLabel}) · Halaman `,
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

function buildAbbreviationLegendBlocks(
  mode: 'abc' | 'uraian',
): Array<Paragraph | Table> {
  const pairs: Array<[string, string, string, string]> =
    mode === 'abc'
      ? [
          ['N', 'Jumlah seluruh peserta tes', 'k', 'Jumlah soal berkunci yang dianalisis'],
          ['P', 'Tingkat Kesulitan versi rekapinJx (0,00 – 1,00)', 'TK (%)', 'Persentase Tingkat Kesulitan versi Anates V4'],
          ['D / DP / DP (%)', 'Daya Pembeda (selisih capaian Unggul vs Asor)', 'r / r hitung', 'Skor kesesuaian tiap soal terhadap total nilai'],
          ['r tabel', 'Batas minimal skor kelayakan soal (5% & 1%)', 'r₁₁', 'Nilai konsistensi (keajegan) tes keseluruhan'],
          ['KR-20', 'Ukuran konsistensi soal pilihan ganda (rekapinJx)', 'XY', 'Nilai kecocokan antara soal ganjil dan soal genap'],
          ['SD / S²t', 'Keragaman nilai siswa (Simpangan Baku & Varians)', 'U / A (27%)', 'Kelompok Unggul (27% tertinggi) & Asor (27% terendah)'],
          ['SM / M / Sdg / Skr / SS', 'Sangat Mudah / Mudah / Sedang / Sukar / Sgt Sukar', '*** / ++ / + / - / -- / ---', 'Kode pengecoh Anates V4 (Kunci / Sgt Baik / Baik / Kurang / Buruk / 0)'],
        ]
      : [
          ['N', 'Jumlah seluruh peserta / responden', 'k', 'Jumlah butir soal / angket yang dianalisis'],
          ['α (Alpha)', 'Ukuran konsistensi soal uraian/angket & batas standar (5% / 1%)', 'r₁₁', 'Nilai konsistensi (keajegan) instrumen keseluruhan'],
          ['P', 'Tingkat Kesulitan versi rekapinJx (0,00 – 1,00)', 'TK (%)', 'Persentase Tingkat Kesulitan versi Anates V4'],
          ['D / DP / DP (%)', 'Daya Pembeda (selisih capaian Unggul vs Asor)', 'r / r hitung', 'Skor kesesuaian tiap butir terhadap total skor'],
          ['r tabel', 'Batas minimal skor kelayakan butir (5% & 1%)', 'XY', 'Nilai kecocokan antara butir ganjil dan butir genap'],
          ['SD / S²t', 'Keragaman nilai peserta (Simpangan Baku & Varians)', 'Mean / Maks', 'Rata-rata skor butir & skor maksimal butir'],
          ['U / A (27%)', 'Kelompok Unggul (27% tertinggi) & Asor (27% terendah)', 'SM / M / Sdg / Skr / SS', 'Sangat Mudah / Mudah / Sedang / Sukar / Sgt Sukar'],
        ];

  const legendTable = buildStyledTable(
    [
      { label: 'Singkatan', widthPct: 16 },
      { label: 'Arti / Keterangan', widthPct: 34 },
      { label: 'Singkatan', widthPct: 16 },
      { label: 'Arti / Keterangan', widthPct: 34 },
    ],
    pairs.map(([k1, v1, k2, v2]) => [
      { text: k1, bold: true, color: UNGGUL_PRIMARY },
      { text: v1 },
      { text: k2, bold: true, color: UNGGUL_PRIMARY },
      { text: v2 },
    ]),
    { headerFill: UNGGUL_PRIMARY, altRowFill: UNGGUL_ALT },
  );

  return [
    makeSectionHeading('Keterangan Singkatan & Istilah Analisis', UNGGUL_PRIMARY),
    new Paragraph({
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({
          text: 'Daftar istilah dan singkatan berikut berlaku untuk seluruh tabel statistik pada dokumen ini:',
          italics: true,
          size: 18,
          color: TEXT_MUTED,
          font: 'Calibri',
        }),
      ],
    }),
    legendTable,
  ];
}

function buildUnggulAsorWordBlocks(params: {
  heading: string;
  rankedStudents: RankedStudent[];
  groupSize: number;
  scoreLabel: string;
  percentLabel: string;
  participantLabel: string;
}): Array<Paragraph | Table> {
  const {
    heading,
    rankedStudents,
    groupSize,
    scoreLabel,
    percentLabel,
    participantLabel,
  } = params;
  const breakdown = splitUnggulAsorGroups(rankedStudents);

  const summaryTable = buildStyledTable(
    [
      { label: 'Kelompok (Metode 27%)', widthPct: 36 },
      { label: 'Jumlah Peserta', align: AlignmentType.CENTER, widthPct: 18 },
      { label: 'Proporsi', align: AlignmentType.CENTER, widthPct: 16 },
      { label: 'Rentang Skor & Capaian (%)', align: AlignmentType.RIGHT, widthPct: 30 },
    ],
    [
      [
        { text: 'Kelompok Unggul (27% Atas)', bold: true, color: BRAND_PRIMARY },
        { text: `${breakdown.upperSummary.count} peserta`, bold: true },
        { text: `${breakdown.upperSummary.percentOfTotal}%` },
        { text: formatScoreRange(breakdown.upperSummary), bold: true },
      ],
      [
        { text: 'Kelompok Tengah', bold: true, color: SLATE_PRIMARY },
        { text: `${breakdown.middleSummary.count} peserta` },
        { text: `${breakdown.middleSummary.percentOfTotal}%` },
        { text: formatScoreRange(breakdown.middleSummary) },
      ],
      [
        { text: 'Kelompok Asor (27% Bawah)', bold: true, color: ASOR_PRIMARY },
        { text: `${breakdown.lowerSummary.count} peserta`, bold: true },
        { text: `${breakdown.lowerSummary.percentOfTotal}%` },
        { text: formatScoreRange(breakdown.lowerSummary), bold: true },
      ],
    ],
    { headerFill: UNGGUL_PRIMARY, altRowFill: UNGGUL_ALT },
  );

  const makeGroupTable = (
    list: RankedStudent[],
    headerFill: string,
    altRowFill: string,
    tag: string,
    tagColor: string,
  ) =>
    buildStyledTable(
      [
        { label: 'Rank', align: AlignmentType.CENTER, widthPct: 8 },
        { label: participantLabel, widthPct: 34 },
        { label: 'Kelas', align: AlignmentType.CENTER, widthPct: 14 },
        { label: scoreLabel, align: AlignmentType.RIGHT, widthPct: 12 },
        { label: percentLabel, align: AlignmentType.RIGHT, widthPct: 14 },
        { label: 'Status Kelompok', align: AlignmentType.CENTER, widthPct: 18 },
      ],
      list.map((st) => [
        { text: st.rank, bold: true },
        { text: st.nama, bold: true },
        { text: st.kelas },
        { text: `${st.score}/${st.maxScore}` },
        { text: `${st.scorePercent.toFixed(1)}%`, bold: true },
        { text: tag, bold: true, color: tagColor },
      ]),
      { headerFill, altRowFill },
    );

  const makeSubLabel = (label: string, colorHex: string) =>
    new Paragraph({
      spacing: { before: 160, after: 70 },
      children: [
        new TextRun({
          text: label,
          bold: true,
          size: 21,
          color: colorHex,
          font: 'Calibri',
        }),
      ],
    });

  const blocks: Array<Paragraph | Table> = [
    makeSectionHeading(heading, UNGGUL_PRIMARY),
    new Paragraph({
      spacing: { before: 0, after: 100 },
      children: [
        new TextRun({
          text: `Format khusus terpisah dari tabel analisis butir (n = ${groupSize} peserta per kelompok unggul/asor dari total N = ${breakdown.total} peserta).`,
          italics: true,
          size: 18,
          color: TEXT_MUTED,
          font: 'Calibri',
        }),
      ],
    }),
    summaryTable,
    makeSubLabel(
      `A. Kelompok Unggul — 27% Atas (${breakdown.upper.length} peserta)`,
      BRAND_PRIMARY,
    ),
    makeGroupTable(
      breakdown.upper,
      BRAND_PRIMARY,
      BRAND_SURFACE_ALT,
      'Unggul (27% Atas)',
      BRAND_PRIMARY,
    ),
    makeSubLabel(
      `B. Kelompok Asor — 27% Bawah (${breakdown.lower.length} peserta)`,
      ASOR_PRIMARY,
    ),
    makeGroupTable(
      breakdown.lower,
      ASOR_PRIMARY,
      ASOR_ALT,
      'Asor (27% Bawah)',
      ASOR_PRIMARY,
    ),
  ];

  if (breakdown.middle.length > 0) {
    blocks.push(
      makeSubLabel(
        `C. Kelompok Tengah (${breakdown.middle.length} peserta)`,
        SLATE_PRIMARY,
      ),
      makeGroupTable(
        breakdown.middle,
        SLATE_PRIMARY,
        SLATE_ALT,
        'Tengah',
        SLATE_PRIMARY,
      ),
    );
  }

  return blocks;
}

function buildAbcRekapinjxBlocks(params: {
  report: FullItemAnalysisReport;
  questionCount: number;
  optionMode: 4 | 5;
  overallAvgPct: number;
  classChart: RenderedPng;
  distChart: RenderedPng;
  qualityChart: RenderedPng;
  sectionPrefix: string;
}): Array<Paragraph | Table> {
  const {
    report,
    questionCount,
    optionMode,
    overallAvgPct,
    classChart,
    distChart,
    qualityChart,
    sectionPrefix,
  } = params;

  const summaryTable = buildStyledTable(
    [
      { label: 'Parameter Pengolahan Data (Versi rekapinJx)', widthPct: 52 },
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
      { label: 'Pengecoh Efektif (≥5%)', align: AlignmentType.CENTER, widthPct: 22 },
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

  return [
    makeSectionHeading(`${sectionPrefix}1. Ringkasan Statistik & Reliabilitas KR-20 (rekapinJx)`),
    summaryTable,
    makeSectionHeading(`${sectionPrefix}2. Grafik Visualisasi Kelas & Keputusan Butir`),
    ...makeChartParagraph(
      classChart,
      'Perbandingan rata-rata nilai per kelas dibandingkan rata-rata umum.',
    ),
    ...makeChartParagraph(
      distChart,
      'Distribusi perolehan nilai siswa pada rentang 0–100%.',
    ),
    ...makeChartParagraph(
      qualityChart,
      'Ringkasan keputusan kelayakan butir soal versi rekapinJx (Dipakai, Revisi, Dibuang).',
    ),
    ...buildUnggulAsorWordBlocks({
      heading: `${sectionPrefix}3. Analisis Khusus Kelompok Unggul & Asor (Metode 27%)`,
      rankedStudents: report.rankedStudents,
      groupSize: report.groupSize,
      scoreLabel: 'Benar',
      percentLabel: 'Nilai (%)',
      participantLabel: 'Nama Siswa',
    }),
    makeSectionHeading(`${sectionPrefix}4. Rekap Analisis Butir Soal Lengkap (rekapinJx)`),
    itemTable,
    makeSectionHeading(`${sectionPrefix}5. Sebaran Jawaban & Kualitas Pengecoh (≥5%)`),
    distractorTable,
  ];
}

function buildAbcAnatesBlocks(params: {
  anates: FullAnatesV4AbcReport;
  questionCount: number;
  optionMode: 4 | 5;
  overallAvgPct: number;
  classChart?: RenderedPng;
  distChart?: RenderedPng;
  anatesDiffChart: RenderedPng;
  sectionPrefix: string;
}): Array<Paragraph | Table> {
  const {
    anates,
    questionCount,
    optionMode,
    overallAvgPct,
    classChart,
    distChart,
    anatesDiffChart,
    sectionPrefix,
  } = params;

  const anatesTheme = {
    headerFill: ANATES_PRIMARY,
    altRowFill: ANATES_SURFACE_ALT,
  };

  const relTable = buildStyledTable(
    [
      { label: 'Parameter Konsistensi Tes (Anates V4)', widthPct: 52 },
      { label: 'Hasil Nilai', align: AlignmentType.RIGHT, widthPct: 24 },
      { label: 'Keterangan / Kategori', widthPct: 24 },
    ],
    [
      [
        { text: 'Jumlah Siswa (N)', bold: true },
        { text: anates.reliability.studentCount },
        { text: `Unggul/Asor: ${anates.groupSize} siswa/kel.` },
      ],
      [
        { text: 'Jumlah Soal Berkunci (k)', bold: true },
        { text: `${anates.reliability.itemCount} dari ${questionCount}` },
        { text: `${optionMode} pilihan (A–${optionMode === 5 ? 'E' : 'D'})` },
      ],
      [
        { text: 'Rata-rata & Keragaman Nilai', bold: true },
        { text: `${anates.reliability.meanScore} (${overallAvgPct}%)` },
        { text: `Simpangan baku (SD): ${anates.reliability.stdDev}` },
      ],
      [
        { text: 'Kecocokan Soal Ganjil vs Genap (XY)', bold: true },
        {
          text:
            anates.reliability.splitHalfR !== null
              ? anates.reliability.splitHalfR.toFixed(3)
              : '—',
        },
        { text: 'Perbandingan soal ganjil & genap' },
      ],
      [
        { text: 'Nilai Konsistensi Tes Keseluruhan', bold: true },
        {
          text:
            anates.reliability.spearmanBrownR !== null
              ? anates.reliability.spearmanBrownR.toFixed(3)
              : '—',
          bold: true,
        },
        { text: anates.reliability.category, bold: true, color: ANATES_PRIMARY },
      ],
      [
        { text: 'Batas Minimal Valid (Standar 5% & 1%)', bold: true },
        {
          text: `${anates.reliability.rTable5?.toFixed(3) ?? '—'} / ${anates.reliability.rTable1?.toFixed(3) ?? '—'}`,
        },
        {
          text: `${anates.summaryCounts.significant} layak · ${anates.summaryCounts.notSignificant} perlu ditinjau`,
        },
      ],
    ],
    anatesTheme,
  );

  const keyed = anates.items.filter((it) => it.hasKey);
  const rekapTable = buildStyledTable(
    [
      { label: 'No', align: AlignmentType.CENTER, widthPct: 6 },
      { label: 'Kunci', align: AlignmentType.CENTER, widthPct: 7 },
      { label: 'Unggul', align: AlignmentType.RIGHT, widthPct: 8 },
      { label: 'Asor', align: AlignmentType.RIGHT, widthPct: 7 },
      { label: 'DP (%)', align: AlignmentType.RIGHT, widthPct: 9 },
      { label: 'TK (%)', align: AlignmentType.RIGHT, widthPct: 9 },
      { label: 'Kategori TK', align: AlignmentType.CENTER, widthPct: 13 },
      { label: 'Skor r', align: AlignmentType.RIGHT, widthPct: 9 },
      { label: 'Status Kelayakan', align: AlignmentType.CENTER, widthPct: 16 },
      { label: 'Pengecoh', align: AlignmentType.LEFT, widthPct: 16 },
    ],
    keyed.map((it) => {
      const sigStyle = decisionColor(it.significance);
      return [
        { text: it.questionNumber, bold: true },
        { text: it.key, bold: true },
        { text: it.upperCorrect },
        { text: it.lowerCorrect },
        { text: `${it.discriminationPercent.toFixed(1)}%` },
        { text: `${it.difficultyPercent.toFixed(1)}%` },
        { text: it.difficultyCategory },
        { text: it.correlationR !== null ? it.correlationR.toFixed(3) : '—' },
        { text: it.significance, bold: true, ...sigStyle },
        { text: it.distractorSummary },
      ];
    }),
    anatesTheme,
  );

  const optionLetters = optionMode === 5 ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];
  const distractorTable = buildStyledTable(
    [
      { label: 'No', align: AlignmentType.CENTER, widthPct: 7 },
      { label: 'Kunci', align: AlignmentType.CENTER, widthPct: 8 },
      { label: 'Ideal', align: AlignmentType.RIGHT, widthPct: 9 },
      ...optionLetters.map((opt) => ({
        label: `Opsi ${opt}`,
        align: AlignmentType.CENTER,
        widthPct: optionMode === 5 ? 15 : 19,
      })),
    ],
    keyed.map((it) => [
      { text: it.questionNumber, bold: true },
      { text: it.key, bold: true, color: ANATES_PRIMARY },
      { text: it.distractors[0]?.idealCount ?? 0 },
      ...it.distractors.map((d) => ({
        text: `${d.count} (${d.code})`,
        bold: d.isKey,
        shading: d.isKey ? ANATES_PRIMARY_LIGHT : undefined,
        color: d.isKey ? ANATES_PRIMARY : TEXT_DARK,
      })),
    ]),
    anatesTheme,
  );

  const charts: Array<Paragraph | Table> = [];
  if (classChart && distChart) {
    charts.push(
      makeSectionHeading(
        `${sectionPrefix}2. Grafik Visualisasi Kelas & Kategori TK Anates V4`,
        ANATES_PRIMARY,
      ),
      ...makeChartParagraph(
        classChart,
        'Perbandingan rata-rata nilai per kelas dibandingkan rata-rata umum.',
      ),
      ...makeChartParagraph(
        distChart,
        'Distribusi perolehan nilai siswa pada rentang 0–100%.',
      ),
      ...makeChartParagraph(
        anatesDiffChart,
        'Sebaran 5 kategori Tingkat Kesukaran versi Anates V4.',
      ),
    );
  } else {
    charts.push(
      makeSectionHeading(
        `${sectionPrefix}2. Grafik Sebaran 5 Kategori Tingkat Kesukaran (Anates V4)`,
        ANATES_PRIMARY,
      ),
      ...makeChartParagraph(
        anatesDiffChart,
        'Sebaran 5 kategori Tingkat Kesukaran versi Anates V4.',
      ),
    );
  }

  return [
    makeSectionHeading(
      `${sectionPrefix}1. Konsistensi Tes Keseluruhan (Metode Anates V4)`,
      ANATES_PRIMARY,
    ),
    relTable,
    ...charts,
    ...buildUnggulAsorWordBlocks({
      heading: `${sectionPrefix}3. Analisis Khusus Kelompok Unggul & Asor (Metode 27%)`,
      rankedStudents: anates.rankedStudents,
      groupSize: anates.groupSize,
      scoreLabel: 'Skor',
      percentLabel: 'Nilai (%)',
      participantLabel: 'Nama Siswa',
    }),
    makeSectionHeading(
      `${sectionPrefix}4. Rekap Analisis Butir Versi Anates V4 (DP %, TK %, Kelayakan)`,
      ANATES_PRIMARY,
    ),
    rekapTable,
    makeSectionHeading(
      `${sectionPrefix}5. Kualitas Pengecoh Versi Anates V4 (Kode ***, ++, +, -, --, ---)`,
      ANATES_PRIMARY,
    ),
    distractorTable,
    new Paragraph({
      spacing: { before: 80, after: 140 },
      children: [
        new TextRun({
          text: 'Keterangan pengecoh Anates V4 (dibanding rata-rata pemilih salah ideal): *** = Kunci Jawaban · ++ = Sangat Baik · + = Baik · - = Kurang Baik · -- = Buruk · --- = Sangat Buruk (0 pemilih). Status Kelayakan: Signifikan / Sangat Signifikan = soal layak dipakai; Tidak Signifikan = perlu ditinjau ulang.',
          italics: true,
          size: 17,
          color: TEXT_MUTED,
          font: 'Calibri',
        }),
      ],
    }),
  ];
}

function buildUraianRekapinjxBlocks(params: {
  report: FullUraianAnalysisReport;
  modeLabel: string;
  overallAvgPct: number;
  classChart: RenderedPng;
  distChart: RenderedPng;
  qualityChart: RenderedPng;
  sectionPrefix: string;
}): Array<Paragraph | Table> {
  const {
    report,
    modeLabel,
    overallAvgPct,
    classChart,
    distChart,
    qualityChart,
    sectionPrefix,
  } = params;

  const summaryTable = buildStyledTable(
    [
      { label: 'Parameter Pengolahan Data (Versi rekapinJx)', widthPct: 52 },
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

  return [
    makeSectionHeading(`${sectionPrefix}1. Ringkasan Statistik & Alpha Cronbach (rekapinJx)`),
    summaryTable,
    makeSectionHeading(`${sectionPrefix}2. Grafik Visualisasi Data Kelas & Kualitas Butir`),
    ...makeChartParagraph(
      classChart,
      'Perbandingan rata-rata capaian per kelas dibandingkan rata-rata umum.',
    ),
    ...makeChartParagraph(
      distChart,
      'Distribusi capaian peserta pada rentang 0–100%.',
    ),
    ...makeChartParagraph(
      qualityChart,
      'Ringkasan keputusan kualitas butir instrumen versi rekapinJx (Dipakai, Revisi, Dibuang).',
    ),
    ...buildUnggulAsorWordBlocks({
      heading: `${sectionPrefix}3. Analisis Khusus Kelompok Unggul & Asor (Metode 27%)`,
      rankedStudents: report.rankedStudents,
      groupSize: report.groupSize,
      scoreLabel: 'Skor Total',
      percentLabel: 'Capaian (%)',
      participantLabel: 'Nama Peserta',
    }),
    makeSectionHeading(`${sectionPrefix}4. Rekap Analisis Butir Angket / Uraian (rekapinJx)`),
    itemTable,
    makeSectionHeading(`${sectionPrefix}5. Sebaran Skor per Nomor Butir`),
    distTable,
  ];
}

function buildUraianAnatesBlocks(params: {
  anates: FullAnatesV4UraianReport;
  modeLabel: string;
  overallAvgPct: number;
  classChart?: RenderedPng;
  distChart?: RenderedPng;
  anatesDiffChart: RenderedPng;
  sectionPrefix: string;
}): Array<Paragraph | Table> {
  const {
    anates,
    modeLabel,
    overallAvgPct,
    classChart,
    distChart,
    anatesDiffChart,
    sectionPrefix,
  } = params;

  const anatesTheme = {
    headerFill: ANATES_PRIMARY,
    altRowFill: ANATES_SURFACE_ALT,
  };

  const relTable = buildStyledTable(
    [
      { label: 'Parameter Konsistensi Tes (Anates V4)', widthPct: 52 },
      { label: 'Hasil Nilai', align: AlignmentType.RIGHT, widthPct: 24 },
      { label: 'Keterangan / Kategori', widthPct: 24 },
    ],
    [
      [
        { text: 'Jumlah Peserta / Responden (N)', bold: true },
        { text: anates.reliability.studentCount },
        { text: `Unggul/Asor: ${anates.groupSize} peserta/kel.` },
      ],
      [
        { text: 'Jumlah Butir (k)', bold: true },
        { text: anates.reliability.itemCount },
        { text: modeLabel },
      ],
      [
        { text: 'Rata-rata & Keragaman Nilai', bold: true },
        { text: `${anates.reliability.meanScore} (${overallAvgPct}%)` },
        { text: `Simpangan baku (SD): ${anates.reliability.stdDev}` },
      ],
      [
        { text: 'Kecocokan Butir Ganjil vs Genap (XY)', bold: true },
        {
          text:
            anates.reliability.splitHalfR !== null
              ? anates.reliability.splitHalfR.toFixed(3)
              : '—',
        },
        { text: 'Perbandingan butir ganjil & genap' },
      ],
      [
        { text: 'Nilai Konsistensi Tes Keseluruhan', bold: true },
        {
          text:
            anates.reliability.spearmanBrownR !== null
              ? anates.reliability.spearmanBrownR.toFixed(3)
              : '—',
          bold: true,
        },
        { text: anates.reliability.category, bold: true, color: ANATES_PRIMARY },
      ],
      [
        { text: 'Batas Minimal Valid (Standar 5% & 1%)', bold: true },
        {
          text: `${anates.reliability.rTable5?.toFixed(3) ?? '—'} / ${anates.reliability.rTable1?.toFixed(3) ?? '—'}`,
        },
        {
          text: `${anates.summaryCounts.significant} layak · ${anates.summaryCounts.notSignificant} perlu ditinjau`,
        },
      ],
    ],
    anatesTheme,
  );

  const rekapTable = buildStyledTable(
    [
      { label: 'No', align: AlignmentType.CENTER, widthPct: 6 },
      { label: 'Maks', align: AlignmentType.RIGHT, widthPct: 8 },
      { label: 'Mean', align: AlignmentType.RIGHT, widthPct: 9 },
      { label: 'Unggul', align: AlignmentType.RIGHT, widthPct: 9 },
      { label: 'Asor', align: AlignmentType.RIGHT, widthPct: 9 },
      { label: 'DP (%)', align: AlignmentType.RIGHT, widthPct: 10 },
      { label: 'TK (%)', align: AlignmentType.RIGHT, widthPct: 10 },
      { label: 'Kategori TK', align: AlignmentType.CENTER, widthPct: 14 },
      { label: 'Skor r', align: AlignmentType.RIGHT, widthPct: 9 },
      { label: 'Status Kelayakan', align: AlignmentType.CENTER, widthPct: 16 },
    ],
    anates.items.map((it) => {
      const sigStyle = decisionColor(it.significance);
      return [
        { text: it.itemNumber, bold: true },
        { text: it.maxScore },
        { text: it.meanScore.toFixed(2) },
        { text: it.upperMean.toFixed(2) },
        { text: it.lowerMean.toFixed(2) },
        { text: `${it.discriminationPercent.toFixed(1)}%` },
        { text: `${it.difficultyPercent.toFixed(1)}%` },
        { text: it.difficultyCategory },
        { text: it.correlationR !== null ? it.correlationR.toFixed(3) : '—' },
        { text: it.significance, bold: true, ...sigStyle },
      ];
    }),
    anatesTheme,
  );

  const charts: Array<Paragraph | Table> = [];
  if (classChart && distChart) {
    charts.push(
      makeSectionHeading(
        `${sectionPrefix}2. Grafik Visualisasi Kelas & Kategori TK Anates V4`,
        ANATES_PRIMARY,
      ),
      ...makeChartParagraph(
        classChart,
        'Perbandingan rata-rata capaian per kelas dibandingkan rata-rata umum.',
      ),
      ...makeChartParagraph(
        distChart,
        'Distribusi capaian peserta pada rentang 0–100%.',
      ),
      ...makeChartParagraph(
        anatesDiffChart,
        'Sebaran 5 kategori Tingkat Kesukaran versi Anates V4.',
      ),
    );
  } else {
    charts.push(
      makeSectionHeading(
        `${sectionPrefix}2. Grafik Sebaran 5 Kategori Tingkat Kesukaran (Anates V4)`,
        ANATES_PRIMARY,
      ),
      ...makeChartParagraph(
        anatesDiffChart,
        'Sebaran 5 kategori Tingkat Kesukaran versi Anates V4.',
      ),
    );
  }

  return [
    makeSectionHeading(
      `${sectionPrefix}1. Konsistensi Tes Keseluruhan (Metode Anates V4)`,
      ANATES_PRIMARY,
    ),
    relTable,
    ...charts,
    ...buildUnggulAsorWordBlocks({
      heading: `${sectionPrefix}3. Analisis Khusus Kelompok Unggul & Asor (Metode 27%)`,
      rankedStudents: anates.rankedStudents,
      groupSize: anates.groupSize,
      scoreLabel: 'Skor Total',
      percentLabel: 'Capaian (%)',
      participantLabel: 'Nama Peserta',
    }),
    makeSectionHeading(
      `${sectionPrefix}4. Rekap Analisis Butir Angket / Uraian Versi Anates V4`,
      ANATES_PRIMARY,
    ),
    rekapTable,
    new Paragraph({
      spacing: { before: 80, after: 140 },
      children: [
        new TextRun({
          text: 'Keterangan Status Kelayakan: Signifikan / Sangat Signifikan = butir layak & sesuai mengukur kemampuan peserta; Tidak Signifikan = perlu diperbaiki atau ditinjau ulang.',
          italics: true,
          size: 17,
          color: TEXT_MUTED,
          font: 'Calibri',
        }),
      ],
    }),
  ];
}

export async function exportAbcWordReport(params: {
  examTitle: string;
  rows: StudentRow[];
  questionCount: number;
  answerKey: AnswerLetter[];
  reportVariant?: WordReportVariant;
}): Promise<string> {
  const {
    examTitle,
    rows,
    questionCount,
    answerKey,
    reportVariant = 'rekapinjx',
  } = params;
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
  const anatesReport = computeAnatesV4AbcReport(
    rows,
    questionCount,
    answerKey,
    optionMode,
  );

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

  const classChart = renderClassAverageChartPng(
    chartStudents,
    reportVariant === 'anatesv4' ? '#8A511D' : '#1B6B4F',
  );
  const distChart = renderScoreDistributionChartPng(chartStudents);
  const qualityChart = renderItemQualityChartPng(report.summaryCounts);
  const anatesDiffChart = renderAnatesDifficultyChartPng(
    anatesReport.summaryCounts,
  );

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

  const variantLabel =
    reportVariant === 'anatesv4'
      ? 'Anates V4 (via rekapinJx)'
      : reportVariant === 'both'
        ? 'rekapinJx + Anates V4'
        : 'rekapinJx';

  const headerColor =
    reportVariant === 'anatesv4' ? ANATES_PRIMARY : BRAND_PRIMARY;

  const docChildren: Array<Paragraph | Table> = [
    new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({
          text:
            reportVariant === 'anatesv4'
              ? 'LAPORAN ANALISIS BUTIR SOAL (METODE ANATES V4)'
              : reportVariant === 'both'
                ? 'LAPORAN ANALISIS BUTIR TERPISAH (rekapinJx & ANATES V4)'
                : 'LAPORAN HASIL PENGOLAHAN DATA & ANALISIS BUTIR',
          bold: true,
          size: 32,
          color: headerColor,
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
          text: `Mode: Pilihan Ganda (ABC) · Mesin: ${variantLabel} · Tanggal Ekspor: ${dateLabel}`,
          size: 19,
          color: TEXT_MUTED,
          font: 'Calibri',
        }),
      ],
    }),
    ...buildAbbreviationLegendBlocks('abc'),
  ];

  if (reportVariant === 'rekapinjx') {
    docChildren.push(
      ...buildAbcRekapinjxBlocks({
        report,
        questionCount,
        optionMode,
        overallAvgPct,
        classChart,
        distChart,
        qualityChart,
        sectionPrefix: '',
      }),
    );
  } else if (reportVariant === 'anatesv4') {
    docChildren.push(
      ...buildAbcAnatesBlocks({
        anates: anatesReport,
        questionCount,
        optionMode,
        overallAvgPct,
        classChart,
        distChart,
        anatesDiffChart,
        sectionPrefix: '',
      }),
    );
  } else {
    const compareTable = buildStyledTable(
      [
        { label: 'Aspek Perbandingan', widthPct: 36 },
        { label: 'Hasil rekapinJx', align: AlignmentType.CENTER, widthPct: 32 },
        { label: 'Hasil Anates V4', align: AlignmentType.CENTER, widthPct: 32 },
      ],
      [
        [
          { text: 'Cara Ukur Konsistensi Tes', bold: true },
          { text: 'Konsistensi internal semua soal (KR-20)' },
          { text: 'Perbandingan kecocokan soal ganjil & genap (Anates V4)' },
        ],
        [
          { text: 'Nilai Konsistensi Tes', bold: true },
          {
            text: `${report.reliability.kr20 !== null ? report.reliability.kr20.toFixed(3) : '—'} (${report.reliability.category})`,
            bold: true,
            color: BRAND_PRIMARY,
          },
          {
            text: `${anatesReport.reliability.spearmanBrownR !== null ? anatesReport.reliability.spearmanBrownR.toFixed(3) : '—'} (${anatesReport.reliability.category})`,
            bold: true,
            color: ANATES_PRIMARY,
          },
        ],
        [
          { text: 'Kelayakan Tiap Soal', bold: true },
          {
            text: `${report.summaryCounts.valid} Valid · ${report.summaryCounts.invalid} Tidak Valid (standar 5%)`,
          },
          {
            text: `${anatesReport.summaryCounts.significant} Layak (Signifikan) · ${anatesReport.summaryCounts.notSignificant} Perlu Ditinjau`,
          },
        ],
        [
          { text: 'Kategori Tingkat Kesulitan', bold: true },
          {
            text: `3 Kategori: ${report.summaryCounts.easy} Mudah · ${report.summaryCounts.medium} Sedang · ${report.summaryCounts.hard} Sukar`,
          },
          {
            text: `5 Kategori: ${anatesReport.summaryCounts.veryEasy} Sgt Mudah · ${anatesReport.summaryCounts.easy} Mudah · ${anatesReport.summaryCounts.medium} Sedang · ${anatesReport.summaryCounts.hard} Sukar · ${anatesReport.summaryCounts.veryHard} Sgt Sukar`,
          },
        ],
        [
          { text: 'Penilaian Pilihan Pengecoh', bold: true },
          { text: 'Minimal dipilih ≥ 5% siswa' },
          { text: 'Kode ***, ++, +, -, --, --- (dibanding jumlah pemilih ideal)' },
        ],
      ],
    );

    docChildren.push(
      makeSectionHeading('Ringkasan Perbedaan Metode (rekapinJx vs Anates V4)'),
      compareTable,
      ...makeChapterBanner(
        'BAGIAN A — HASIL OLAH DATA VERSI rekapinJx',
        'Menggunakan KR-20, 3 kategori kesulitan (P), pengecoh ≥ 5%, dan keputusan akhir soal.',
        BRAND_PRIMARY,
      ),
      ...buildAbcRekapinjxBlocks({
        report,
        questionCount,
        optionMode,
        overallAvgPct,
        classChart,
        distChart,
        qualityChart,
        sectionPrefix: 'A.',
      }),
      new Paragraph({ children: [new PageBreak()] }),
      ...makeChapterBanner(
        'BAGIAN B — HASIL OLAH DATA VERSI ANATES V4',
        'Menggunakan perbandingan konsistensi soal ganjil–genap, Tingkat Kesulitan 5 kategori (%), Daya Pembeda (%), kelayakan soal (5%/1%), dan kode pengecoh Anates V4.',
        ANATES_PRIMARY,
      ),
      ...buildAbcAnatesBlocks({
        anates: anatesReport,
        questionCount,
        optionMode,
        overallAvgPct,
        anatesDiffChart,
        sectionPrefix: 'B.',
      }),
    );
  }

  const doc = new Document({
    ...makeDocHeaderAndFooter(safeTitle, variantLabel),
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1000, bottom: 1080, left: 1000 },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename =
    reportVariant === 'anatesv4'
      ? `laporan-anatesv4-abc-${makeSlug(examTitle)}-${dateStr}.docx`
      : reportVariant === 'both'
        ? `laporan-lengkap-rekapinjx-anatesv4-abc-${makeSlug(examTitle)}-${dateStr}.docx`
        : `laporan-analisis-abc-${makeSlug(examTitle)}-${dateStr}.docx`;
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
  reportVariant?: WordReportVariant;
}): Promise<string> {
  const {
    examTitle,
    rows,
    itemCount,
    subMode,
    scaleMin,
    defaultMaxScore,
    itemMaxScores,
    reportVariant = 'rekapinjx',
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
  const anatesReport = computeAnatesV4UraianReport(
    rows,
    itemCount,
    subMode,
    scaleMin,
    normMax,
  );

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

  const classChart = renderClassAverageChartPng(
    chartStudents,
    reportVariant === 'anatesv4' ? '#8A511D' : '#1B6B4F',
  );
  const distChart = renderScoreDistributionChartPng(chartStudents);
  const qualityChart = renderItemQualityChartPng(report.summaryCounts);
  const anatesDiffChart = renderAnatesDifficultyChartPng(
    anatesReport.summaryCounts,
  );

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

  const variantLabel =
    reportVariant === 'anatesv4'
      ? 'Anates V4 (via rekapinJx)'
      : reportVariant === 'both'
        ? 'rekapinJx + Anates V4'
        : 'rekapinJx';

  const headerColor =
    reportVariant === 'anatesv4' ? ANATES_PRIMARY : BRAND_PRIMARY;

  const docChildren: Array<Paragraph | Table> = [
    new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({
          text:
            reportVariant === 'anatesv4'
              ? 'LAPORAN ANALISIS ANGKET / URAIAN (METODE ANATES V4)'
              : reportVariant === 'both'
                ? 'LAPORAN ANALISIS TERPISAH (rekapinJx & ANATES V4)'
                : 'LAPORAN HASIL PENGOLAHAN DATA & ANALISIS BUTIR',
          bold: true,
          size: 32,
          color: headerColor,
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
          text: `Mode: ${modeLabel} · Mesin: ${variantLabel} · Tanggal Ekspor: ${dateLabel}`,
          size: 19,
          color: TEXT_MUTED,
          font: 'Calibri',
        }),
      ],
    }),
    ...buildAbbreviationLegendBlocks('uraian'),
  ];

  if (reportVariant === 'rekapinjx') {
    docChildren.push(
      ...buildUraianRekapinjxBlocks({
        report,
        modeLabel,
        overallAvgPct,
        classChart,
        distChart,
        qualityChart,
        sectionPrefix: '',
      }),
    );
  } else if (reportVariant === 'anatesv4') {
    docChildren.push(
      ...buildUraianAnatesBlocks({
        anates: anatesReport,
        modeLabel,
        overallAvgPct,
        classChart,
        distChart,
        anatesDiffChart,
        sectionPrefix: '',
      }),
    );
  } else {
    const compareTable = buildStyledTable(
      [
        { label: 'Aspek Perbandingan', widthPct: 36 },
        { label: 'Hasil rekapinJx', align: AlignmentType.CENTER, widthPct: 32 },
        { label: 'Hasil Anates V4', align: AlignmentType.CENTER, widthPct: 32 },
      ],
      [
        [
          { text: 'Cara Ukur Konsistensi Tes', bold: true },
          { text: 'Konsistensi variasi skor tiap butir (Alpha Cronbach)' },
          { text: 'Perbandingan kecocokan butir ganjil & genap (Anates V4)' },
        ],
        [
          { text: 'Nilai Konsistensi Tes', bold: true },
          {
            text: `${report.reliability.cronbachAlpha !== null ? report.reliability.cronbachAlpha.toFixed(3) : '—'} (${report.reliability.category})`,
            bold: true,
            color: BRAND_PRIMARY,
          },
          {
            text: `${anatesReport.reliability.spearmanBrownR !== null ? anatesReport.reliability.spearmanBrownR.toFixed(3) : '—'} (${anatesReport.reliability.category})`,
            bold: true,
            color: ANATES_PRIMARY,
          },
        ],
        [
          { text: 'Kelayakan Tiap Butir', bold: true },
          {
            text: `${report.summaryCounts.valid} Valid · ${report.summaryCounts.invalid} Tidak Valid (standar 5%)`,
          },
          {
            text: `${anatesReport.summaryCounts.significant} Layak (Signifikan) · ${anatesReport.summaryCounts.notSignificant} Perlu Ditinjau`,
          },
        ],
        [
          { text: 'Cara Hitung Tingkat Kesulitan', bold: true },
          { text: 'Dihitung dari rentang skor terendah ke tertinggi' },
          { text: '(Rata-rata / Skor Maks) × 100% (5 kategori)' },
        ],
      ],
    );

    docChildren.push(
      makeSectionHeading('Ringkasan Perbedaan Metode (rekapinJx vs Anates V4)'),
      compareTable,
      ...makeChapterBanner(
        'BAGIAN A — HASIL OLAH DATA VERSI rekapinJx',
        'Menggunakan Alpha Cronbach, perhitungan rentang skala terendah–tertinggi, dan keputusan akhir butir.',
        BRAND_PRIMARY,
      ),
      ...buildUraianRekapinjxBlocks({
        report,
        modeLabel,
        overallAvgPct,
        classChart,
        distChart,
        qualityChart,
        sectionPrefix: 'A.',
      }),
      new Paragraph({ children: [new PageBreak()] }),
      ...makeChapterBanner(
        'BAGIAN B — HASIL OLAH DATA VERSI ANATES V4',
        'Menggunakan perbandingan konsistensi butir ganjil–genap, Tingkat Kesulitan = (Rata-rata / Skor Maks) × 100%, Daya Pembeda (%), dan status kelayakan butir (5%/1%).',
        ANATES_PRIMARY,
      ),
      ...buildUraianAnatesBlocks({
        anates: anatesReport,
        modeLabel,
        overallAvgPct,
        anatesDiffChart,
        sectionPrefix: 'B.',
      }),
    );
  }

  const doc = new Document({
    ...makeDocHeaderAndFooter(safeTitle, variantLabel),
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1000, bottom: 1080, left: 1000 },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename =
    reportVariant === 'anatesv4'
      ? `laporan-anatesv4-uraian-${makeSlug(examTitle)}-${dateStr}.docx`
      : reportVariant === 'both'
        ? `laporan-lengkap-rekapinjx-anatesv4-uraian-${makeSlug(examTitle)}-${dateStr}.docx`
        : `laporan-analisis-uraian-${makeSlug(examTitle)}-${dateStr}.docx`;
  triggerFileDownload(blob, filename);
  return filename;
}
