import type { RankedStudent } from './itemAnalysis';

export interface GroupRangeSummary {
  count: number;
  percentOfTotal: number;
  minScore: number | null;
  maxScore: number | null;
  minPercent: number | null;
  maxPercent: number | null;
}

export interface UnggulAsorBreakdown {
  total: number;
  upper: RankedStudent[];
  middle: RankedStudent[];
  lower: RankedStudent[];
  upperSummary: GroupRangeSummary;
  middleSummary: GroupRangeSummary;
  lowerSummary: GroupRangeSummary;
}

function summarizeSlice(
  list: RankedStudent[],
  total: number,
): GroupRangeSummary {
  if (list.length === 0) {
    return {
      count: 0,
      percentOfTotal: 0,
      minScore: null,
      maxScore: null,
      minPercent: null,
      maxPercent: null,
    };
  }
  let minScore = list[0].score;
  let maxScore = list[0].score;
  let minPercent = list[0].scorePercent;
  let maxPercent = list[0].scorePercent;
  for (const st of list) {
    if (st.score < minScore) minScore = st.score;
    if (st.score > maxScore) maxScore = st.score;
    if (st.scorePercent < minPercent) minPercent = st.scorePercent;
    if (st.scorePercent > maxPercent) maxPercent = st.scorePercent;
  }
  return {
    count: list.length,
    percentOfTotal: total > 0 ? Math.round((list.length / total) * 1000) / 10 : 0,
    minScore,
    maxScore,
    minPercent,
    maxPercent,
  };
}

export function splitUnggulAsorGroups(
  rankedStudents: RankedStudent[],
): UnggulAsorBreakdown {
  const total = rankedStudents.length;
  const upper = rankedStudents.filter((s) => s.group === 'Unggul');
  const middle = rankedStudents.filter((s) => s.group === 'Tengah');
  const lower = rankedStudents.filter((s) => s.group === 'Asor');
  return {
    total,
    upper,
    middle,
    lower,
    upperSummary: summarizeSlice(upper, total),
    middleSummary: summarizeSlice(middle, total),
    lowerSummary: summarizeSlice(lower, total),
  };
}

export function formatScoreRange(summary: GroupRangeSummary): string {
  if (summary.count === 0 || summary.minScore === null || summary.maxScore === null) {
    return '—';
  }
  if (summary.minScore === summary.maxScore) {
    return `${summary.minScore} (${summary.minPercent}%)`;
  }
  return `${summary.minScore} – ${summary.maxScore} (${summary.minPercent}% – ${summary.maxPercent}%)`;
}

export function buildDistinguishedUnggulAsorAOA(params: {
  rankedStudents: RankedStudent[];
  groupSize: number;
  engineLabel: string;
  modeLabel: string;
  scoreHeader?: string;
  percentHeader?: string;
}): (string | number)[][] {
  const {
    rankedStudents,
    groupSize,
    engineLabel,
    modeLabel,
    scoreHeader = 'Skor',
    percentHeader = 'Nilai (%)',
  } = params;

  const breakdown = splitUnggulAsorGroups(rankedStudents);
  const aoa: (string | number)[][] = [
    ['ANALISIS KHUSUS KELOMPOK UNGGUL & ASOR (METODE 27%)', '', '', '', '', '', ''],
    [
      'Standar / Mode',
      `${engineLabel} · ${modeLabel}`,
      'Total Peserta',
      breakdown.total,
      'Ukuran Kelompok (27%)',
      `${groupSize} siswa/kelompok`,
      '',
    ],
    [],
    [
      'Ringkasan Pengelompokan 27%',
      'Jumlah Siswa',
      'Proporsi (%)',
      'Skor Terendah',
      'Skor Tertinggi',
      'Nilai Min (%)',
      'Nilai Maks (%)',
    ],
    [
      'Kelompok Unggul (27% Atas)',
      breakdown.upperSummary.count,
      `${breakdown.upperSummary.percentOfTotal}%`,
      breakdown.upperSummary.minScore ?? '-',
      breakdown.upperSummary.maxScore ?? '-',
      breakdown.upperSummary.minPercent ?? '-',
      breakdown.upperSummary.maxPercent ?? '-',
    ],
    [
      'Kelompok Tengah',
      breakdown.middleSummary.count,
      `${breakdown.middleSummary.percentOfTotal}%`,
      breakdown.middleSummary.minScore ?? '-',
      breakdown.middleSummary.maxScore ?? '-',
      breakdown.middleSummary.minPercent ?? '-',
      breakdown.middleSummary.maxPercent ?? '-',
    ],
    [
      'Kelompok Asor (27% Bawah)',
      breakdown.lowerSummary.count,
      `${breakdown.lowerSummary.percentOfTotal}%`,
      breakdown.lowerSummary.minScore ?? '-',
      breakdown.lowerSummary.maxScore ?? '-',
      breakdown.lowerSummary.minPercent ?? '-',
      breakdown.lowerSummary.maxPercent ?? '-',
    ],
    [],
    ['[A] DAFTAR KELOMPOK UNGGUL (27% ATAS)', '', '', '', '', '', ''],
    ['Peringkat', 'Nama Siswa / Responden', 'Kelas', scoreHeader, 'Skor Maks', percentHeader, 'Status Kelompok'],
    ...breakdown.upper.map((st) => [
      st.rank,
      st.nama,
      st.kelas,
      st.score,
      st.maxScore,
      st.scorePercent,
      'UNGGUL (27% Atas)',
    ]),
    [],
    ['[B] DAFTAR KELOMPOK ASOR (27% BAWAH)', '', '', '', '', '', ''],
    ['Peringkat', 'Nama Siswa / Responden', 'Kelas', scoreHeader, 'Skor Maks', percentHeader, 'Status Kelompok'],
    ...breakdown.lower.map((st) => [
      st.rank,
      st.nama,
      st.kelas,
      st.score,
      st.maxScore,
      st.scorePercent,
      'ASOR (27% Bawah)',
    ]),
  ];

  if (breakdown.middle.length > 0) {
    aoa.push(
      [],
      ['[C] DAFTAR KELOMPOK TENGAH', '', '', '', '', '', ''],
      ['Peringkat', 'Nama Siswa / Responden', 'Kelas', scoreHeader, 'Skor Maks', percentHeader, 'Status Kelompok'],
      ...breakdown.middle.map((st) => [
        st.rank,
        st.nama,
        st.kelas,
        st.score,
        st.maxScore,
        st.scorePercent,
        'Tengah',
      ]),
    );
  }

  return aoa;
}

function formatTextTable(rows: (string | number)[][]): string[] {
  if (rows.length === 0) return [];
  const colWidths = rows[0].map((_, colIdx) =>
    Math.max(...rows.map((r) => String(r[colIdx] ?? '').length), 4),
  );
  return rows.map((row, idx) => {
    const line = row
      .map((cell, cIdx) => String(cell ?? '').padEnd(colWidths[cIdx] + 2))
      .join('');
    if (idx === 0) {
      return `${line}\r\n${'-'.repeat(Math.min(120, line.length))}`;
    }
    return line;
  });
}

export function buildDistinguishedUnggulAsorText(params: {
  rankedStudents: RankedStudent[];
  groupSize: number;
  examTitle: string;
  engineLabel: string;
  itemCount: number;
  scoreLabel?: string;
}): string {
  const {
    rankedStudents,
    groupSize,
    examTitle,
    engineLabel,
    itemCount,
    scoreLabel = 'Skor',
  } = params;
  const breakdown = splitUnggulAsorGroups(rankedStudents);
  const title = examTitle.trim() || 'Rekap Lembar Jawaban';

  const summaryTable = formatTextTable([
    ['Kelompok', 'Jumlah', 'Proporsi', 'Rentang Skor'],
    [
      'Kelompok Unggul (27% Atas)',
      `${breakdown.upperSummary.count} siswa`,
      `${breakdown.upperSummary.percentOfTotal}%`,
      formatScoreRange(breakdown.upperSummary),
    ],
    [
      'Kelompok Tengah',
      `${breakdown.middleSummary.count} siswa`,
      `${breakdown.middleSummary.percentOfTotal}%`,
      formatScoreRange(breakdown.middleSummary),
    ],
    [
      'Kelompok Asor (27% Bawah)',
      `${breakdown.lowerSummary.count} siswa`,
      `${breakdown.lowerSummary.percentOfTotal}%`,
      formatScoreRange(breakdown.lowerSummary),
    ],
  ]);

  const toRows = (list: RankedStudent[]) => [
    ['Rank', 'Nama', 'Kelas', scoreLabel, 'Maks', 'Nilai (%)'],
    ...list.map((st) => [
      st.rank,
      st.nama,
      st.kelas,
      st.score,
      st.maxScore,
      `${st.scorePercent}%`,
    ]),
  ];

  const lines: string[] = [
    `LAPORAN KHUSUS KELOMPOK UNGGUL & ASOR (METODE 27%) — ${engineLabel.toUpperCase()}`,
    `Ujian / Instrumen : ${title}`,
    `Total Peserta (N) : ${breakdown.total} · Butir (k): ${itemCount} · Ukuran Kel. (n): ${groupSize}`,
    `Tanggal           : ${new Date().toISOString().slice(0, 10)}`,
    '='.repeat(78),
    '',
    '[RINGKASAN PENGELOMPOKAN 27%]',
    ...summaryTable,
    '',
    `[A] KELOMPOK UNGGUL — 27% ATAS (${breakdown.upper.length} peserta)`,
    ...formatTextTable(toRows(breakdown.upper)),
    '',
    `[B] KELOMPOK ASOR — 27% BAWAH (${breakdown.lower.length} peserta)`,
    ...formatTextTable(toRows(breakdown.lower)),
  ];

  if (breakdown.middle.length > 0) {
    lines.push(
      '',
      `[C] KELOMPOK TENGAH (${breakdown.middle.length} peserta)`,
      ...formatTextTable(toRows(breakdown.middle)),
    );
  }

  return lines.join('\r\n');
}
