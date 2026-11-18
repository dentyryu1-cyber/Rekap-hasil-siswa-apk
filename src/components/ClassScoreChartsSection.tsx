import { useMemo, useState } from 'react';
import { BarChart2, Database } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ChartStudentPoint {
  id: number;
  nama: string;
  kelas: string;
  rawScore: number;
  maxScore: number;
  percentScore: number;
}

interface ClassScoreChartsSectionProps {
  id: string;
  mode: 'abc' | 'uraian';
  darkMode: boolean;
  students: ChartStudentPoint[];
  hasScoreData: boolean;
  emptyReason: string;
  onLoadSampleData?: () => void;
}

interface ClassAverageDatum {
  kelas: string;
  studentCount: number;
  avgPercent: number;
  avgRaw: number;
  minPercent: number;
  maxPercent: number;
}

interface DistributionBucketDatum {
  range: string;
  label: string;
  count: number;
  sharePercent: number;
  colorLight: string;
  colorDark: string;
}

const SCORE_BUCKETS: Array<{
  range: string;
  label: string;
  min: number;
  max: number;
  colorLight: string;
  colorDark: string;
}> = [
  {
    range: '0–20',
    label: 'Sangat Rendah (0–20)',
    min: -Infinity,
    max: 20,
    colorLight: '#B42318',
    colorDark: '#F97066',
  },
  {
    range: '21–40',
    label: 'Rendah (21–40)',
    min: 20,
    max: 40,
    colorLight: '#C47425',
    colorDark: '#E69F52',
  },
  {
    range: '41–60',
    label: 'Cukup (41–60)',
    min: 40,
    max: 60,
    colorLight: '#B0851A',
    colorDark: '#EBCB7A',
  },
  {
    range: '61–80',
    label: 'Baik (61–80)',
    min: 60,
    max: 80,
    colorLight: '#2B8C68',
    colorDark: '#58C49B',
  },
  {
    range: '81–100',
    label: 'Sangat Baik (81–100)',
    min: 80,
    max: Infinity,
    colorLight: '#1B6B4F',
    colorDark: '#38B284',
  },
];

function ClassTooltip({
  active,
  payload,
  metricMode,
}: {
  active?: boolean;
  payload?: Array<{ payload: ClassAverageDatum }>;
  metricMode: 'percent' | 'raw';
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#D4DDD8] bg-white px-3 py-2.5 text-xs shadow-md dark:border-[#28362F] dark:bg-[#161F1B]">
      <div className="font-bold text-[#14211C] dark:text-[#E6EEE9]">
        Kelas {item.kelas}
      </div>
      <div className="font-mono-tabular mt-1.5 flex flex-col gap-1 text-[#394A43] dark:text-[#C5D3CC]">
        <div>
          Rata-rata:{' '}
          <strong className="text-[#1B6B4F] dark:text-[#58C49B]">
            {metricMode === 'percent'
              ? `${item.avgPercent}%`
              : `${item.avgRaw} poin`}
          </strong>{' '}
          <span className="text-[#52635C] dark:text-[#9AAAA2]">
            ({metricMode === 'percent' ? `${item.avgRaw} poin` : `${item.avgPercent}%`})
          </span>
        </div>
        <div>Jumlah peserta: {item.studentCount}</div>
        <div>
          Rentang nilai: {item.minPercent}% – {item.maxPercent}%
        </div>
      </div>
    </div>
  );
}

function DistributionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DistributionBucketDatum }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#D4DDD8] bg-white px-3 py-2.5 text-xs shadow-md dark:border-[#28362F] dark:bg-[#161F1B]">
      <div className="font-bold text-[#14211C] dark:text-[#E6EEE9]">
        {item.label}
      </div>
      <div className="font-mono-tabular mt-1.5 flex flex-col gap-1 text-[#394A43] dark:text-[#C5D3CC]">
        <div>
          Jumlah peserta:{' '}
          <strong className="text-[#1B6B4F] dark:text-[#58C49B]">
            {item.count}
          </strong>
        </div>
        <div>Proporsi: {item.sharePercent}% dari total</div>
      </div>
    </div>
  );
}

export function ClassScoreChartsSection({
  id,
  mode,
  darkMode,
  students,
  hasScoreData,
  emptyReason,
  onLoadSampleData,
}: ClassScoreChartsSectionProps) {
  const [metricMode, setMetricMode] = useState<'percent' | 'raw'>('percent');

  const analytics = useMemo(() => {
    if (!hasScoreData || students.length === 0) {
      return {
        classData: [] as ClassAverageDatum[],
        distributionData: [] as DistributionBucketDatum[],
        overallAvgPercent: 0,
        overallAvgRaw: 0,
        highestPercent: 0,
        lowestPercent: 0,
        classCount: 0,
      };
    }

    const classMap = new Map<string, ChartStudentPoint[]>();
    let totalPercent = 0;
    let totalRaw = 0;
    let highestPercent = -Infinity;
    let lowestPercent = Infinity;

    for (const s of students) {
      const className = s.kelas.trim() || 'Tanpa Kelas';
      const list = classMap.get(className);
      if (list) list.push(s);
      else classMap.set(className, [s]);

      totalPercent += s.percentScore;
      totalRaw += s.rawScore;
      if (s.percentScore > highestPercent) highestPercent = s.percentScore;
      if (s.percentScore < lowestPercent) lowestPercent = s.percentScore;
    }

    const classData: ClassAverageDatum[] = Array.from(classMap.entries()).map(
      ([kelas, group]) => {
        const sumP = group.reduce((acc, item) => acc + item.percentScore, 0);
        const sumR = group.reduce((acc, item) => acc + item.rawScore, 0);
        const minP = Math.min(...group.map((item) => item.percentScore));
        const maxP = Math.max(...group.map((item) => item.percentScore));
        return {
          kelas,
          studentCount: group.length,
          avgPercent: Math.round((sumP / group.length) * 10) / 10,
          avgRaw: Math.round((sumR / group.length) * 100) / 100,
          minPercent: Math.round(minP * 10) / 10,
          maxPercent: Math.round(maxP * 10) / 10,
        };
      },
    );

    const distributionData: DistributionBucketDatum[] = SCORE_BUCKETS.map(
      (bucket) => {
        const count = students.filter((s) => {
          if (bucket.range === '0–20') return s.percentScore <= 20;
          if (bucket.range === '81–100') return s.percentScore > 80;
          return s.percentScore > bucket.min && s.percentScore <= bucket.max;
        }).length;
        return {
          range: bucket.range,
          label: bucket.label,
          count,
          sharePercent: Math.round((count / students.length) * 1000) / 10,
          colorLight: bucket.colorLight,
          colorDark: bucket.colorDark,
        };
      },
    );

    return {
      classData,
      distributionData,
      overallAvgPercent:
        Math.round((totalPercent / students.length) * 10) / 10,
      overallAvgRaw: Math.round((totalRaw / students.length) * 100) / 100,
      highestPercent: Math.round(highestPercent * 10) / 10,
      lowestPercent: Math.round(lowestPercent * 10) / 10,
      classCount: classData.length,
    };
  }, [hasScoreData, students]);

  const gridStroke = darkMode ? '#24322B' : '#E3EAE6';
  const tickColor = darkMode ? '#9AAAA2' : '#52635C';
  const primaryBarColor = darkMode ? '#4AC294' : '#1B6B4F';
  const refLineColor = darkMode ? '#E5B076' : '#9C5718';

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="flex flex-col gap-5 rounded-xl border border-[#D4DDD8] bg-white p-5 sm:p-6 dark:border-[#28362F] dark:bg-[#161F1B]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1B6B4F] text-sm font-bold text-white dark:bg-[#4AC294] dark:text-[#0B1712]">
            6
          </span>
          <div>
            <h2
              id={`${id}-heading`}
              className="text-base font-bold text-[#14211C] dark:text-[#E6EEE9]"
            >
              Visualisasi ringkas rata-rata kelas &amp; distribusi nilai
            </h2>
            <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
              {mode === 'abc'
                ? 'Perbandingan capaian tiap kelas dan sebaran nilai (0–100) berdasarkan kunci jawaban'
                : 'Perbandingan rata-rata capaian antar kelas dan sebaran skor peserta'}
            </p>
          </div>
        </div>

        {hasScoreData && students.length > 0 && (
          <div
            role="group"
            aria-label="Satuan grafik rata-rata kelas"
            className="inline-flex w-fit items-center gap-1 rounded-xl border border-[#D4DDD8] bg-[#EFF3F1] p-1 dark:border-[#28362F] dark:bg-[#111915]"
          >
            <button
              type="button"
              onClick={() => setMetricMode('percent')}
              aria-pressed={metricMode === 'percent'}
              className={`btn-gesture min-h-[32px] cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                metricMode === 'percent'
                  ? 'btn-surface-primary'
                  : 'text-[#394A43] hover:bg-white/75 dark:text-[#C5D3CC] dark:hover:bg-[#1D2923]'
              }`}
            >
              Nilai (%)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('raw')}
              aria-pressed={metricMode === 'raw'}
              className={`btn-gesture min-h-[32px] cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                metricMode === 'raw'
                  ? 'btn-surface-primary'
                  : 'text-[#394A43] hover:bg-white/75 dark:text-[#C5D3CC] dark:hover:bg-[#1D2923]'
              }`}
            >
              Skor Mentah
            </button>
          </div>
        )}
      </div>

      {!hasScoreData || students.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#D4DDD8] bg-[#F8FAF9] px-5 py-9 text-center dark:border-[#28362F] dark:bg-[#121916]">
          <BarChart2
            className="h-8 w-8 text-[#52635C] dark:text-[#9AAAA2]"
            aria-hidden="true"
          />
          <p className="max-w-md text-sm text-[#52635C] dark:text-[#9AAAA2]">
            {emptyReason}
          </p>
          {onLoadSampleData && (
            <button
              type="button"
              onClick={onLoadSampleData}
              className="btn-gesture btn-surface-secondary inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap"
            >
              <Database className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Muat contoh data untuk lihat grafik</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Compact Quantitative Summary Strip */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#E3EAE6] bg-[#F8FAF9] p-3.5 sm:grid-cols-4 dark:border-[#24322B] dark:bg-[#121916]">
            <div>
              <div className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Rata-rata Keseluruhan
              </div>
              <div className="font-mono-tabular mt-0.5 text-lg font-bold text-[#1B6B4F] dark:text-[#58C49B]">
                {analytics.overallAvgPercent}%
                <span className="ml-1.5 text-xs font-medium text-[#52635C] dark:text-[#9AAAA2]">
                  ({analytics.overallAvgRaw} poin)
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Nilai Tertinggi
              </div>
              <div className="font-mono-tabular mt-0.5 text-lg font-bold text-[#14211C] dark:text-[#E6EEE9]">
                {analytics.highestPercent}%
              </div>
            </div>
            <div>
              <div className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Nilai Terendah
              </div>
              <div className="font-mono-tabular mt-0.5 text-lg font-bold text-[#14211C] dark:text-[#E6EEE9]">
                {analytics.lowestPercent}%
              </div>
            </div>
            <div>
              <div className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Cakupan Data
              </div>
              <div className="font-mono-tabular mt-0.5 text-lg font-bold text-[#14211C] dark:text-[#E6EEE9]">
                {students.length} peserta · {analytics.classCount} kelas
              </div>
            </div>
          </div>

          {/* Two Recharts Panels */}
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
            {/* Chart 1: Class Averages */}
            <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#E3EAE6] bg-[#FCFDFC] p-4 dark:border-[#24322B] dark:bg-[#121916]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-[#14211C] dark:text-[#E6EEE9]">
                  Rata-rata Skor per Kelas
                </h3>
                <span className="font-mono-tabular text-xs text-[#52635C] dark:text-[#9AAAA2]">
                  Garis putus: rata-rata umum (
                  {metricMode === 'percent'
                    ? `${analytics.overallAvgPercent}%`
                    : `${analytics.overallAvgRaw}`}
                  )
                </span>
              </div>

              <div className="h-[260px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.classData}
                    margin={{ top: 14, right: 16, left: -8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={gridStroke}
                    />
                    <XAxis
                      dataKey="kelas"
                      tick={{ fill: tickColor, fontSize: 12 }}
                      axisLine={{ stroke: gridStroke }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={metricMode === 'percent' ? [0, 100] : [0, 'auto']}
                      tick={{ fill: tickColor, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      unit={metricMode === 'percent' ? '%' : ''}
                    />
                    <Tooltip
                      cursor={{
                        fill: darkMode
                          ? 'rgba(88, 196, 155, 0.08)'
                          : 'rgba(27, 107, 79, 0.06)',
                      }}
                      content={<ClassTooltip metricMode={metricMode} />}
                    />
                    <ReferenceLine
                      y={
                        metricMode === 'percent'
                          ? analytics.overallAvgPercent
                          : analytics.overallAvgRaw
                      }
                      stroke={refLineColor}
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                    <Bar
                      dataKey={metricMode === 'percent' ? 'avgPercent' : 'avgRaw'}
                      name="Rata-rata"
                      fill={primaryBarColor}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={54}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Score Distribution */}
            <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#E3EAE6] bg-[#FCFDFC] p-4 dark:border-[#24322B] dark:bg-[#121916]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-[#14211C] dark:text-[#E6EEE9]">
                  Distribusi Nilai Siswa (0–100%)
                </h3>
                <span className="font-mono-tabular text-xs text-[#52635C] dark:text-[#9AAAA2]">
                  Total {students.length} peserta
                </span>
              </div>

              <div className="h-[260px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.distributionData}
                    margin={{ top: 14, right: 16, left: -12, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={gridStroke}
                    />
                    <XAxis
                      dataKey="range"
                      tick={{ fill: tickColor, fontSize: 12 }}
                      axisLine={{ stroke: gridStroke }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: tickColor, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{
                        fill: darkMode
                          ? 'rgba(88, 196, 155, 0.08)'
                          : 'rgba(27, 107, 79, 0.06)',
                      }}
                      content={<DistributionTooltip />}
                    />
                    <Bar
                      dataKey="count"
                      name="Jumlah Peserta"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={52}
                    >
                      {analytics.distributionData.map((entry) => (
                        <Cell
                          key={entry.range}
                          fill={darkMode ? entry.colorDark : entry.colorLight}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
