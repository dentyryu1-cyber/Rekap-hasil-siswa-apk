import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  GitCompare,
  RefreshCw,
  Save,
} from 'lucide-react';
import type { SurveySubMode, UraianStudentRow } from '../types/sheet';
import {
  computeAnatesV4UraianReport,
  exportAnatesUraianAllExcel,
  exportAnatesUraianSingleExcel,
  exportAnatesUraianSingleText,
  type AnatesUraianSectionId,
  type AnalysisEngineMode,
} from '../utils/anatesV4Analysis';
import type { RankedStudent } from '../utils/itemAnalysis';
import { formatScoreRange, splitUnggulAsorGroups } from '../utils/unggulAsorFormat';
import {
  computeFullUraianAnalysis,
  exportUraianAllAnalysesExcel,
  exportUraianSingleAnalysisExcel,
  exportUraianSingleAnalysisText,
  type UraianAnalysisSectionId,
} from '../utils/uraianAnalysis';
import {
  exportUraianWordReport,
  type WordReportVariant,
} from '../utils/wordExport';

interface UraianAnalysisSectionProps {
  examTitle: string;
  rows: UraianStudentRow[];
  itemCount: number;
  subMode: SurveySubMode;
  scaleMin: number;
  defaultMaxScore?: number;
  itemMaxScores: number[];
  onLoadSampleData: () => void;
  onExportProjectData: () => void;
}

const URAIAN_TABS: Array<{ id: UraianAnalysisSectionId; label: string }> = [
  { id: 'rekap', label: 'Rekap Analisis Butir' },
  { id: 'reliabilitas', label: 'Reliabilitas (Alpha)' },
  { id: 'unggul-asor', label: 'Kel. Unggul & Asor' },
  { id: 'daya-pembeda', label: 'Daya Pembeda' },
  { id: 'tingkat-kesukaran', label: 'Kesukaran / Capaian' },
  { id: 'korelasi', label: 'Korelasi Skor Butir' },
  { id: 'distribusi', label: 'Sebaran Skor Butir' },
];

const ANATES_URAIAN_TABS: Array<{
  id: AnatesUraianSectionId;
  label: string;
}> = [
  { id: 'rekap', label: 'Rekap Anates V4' },
  { id: 'reliabilitas', label: 'Konsistensi Tes (Reliabilitas)' },
  { id: 'unggul-asor', label: 'Kel. Unggul & Asor' },
  { id: 'daya-pembeda', label: 'Daya Pembeda (%)' },
  { id: 'tingkat-kesukaran', label: 'Tingkat Kesulitan (%)' },
  { id: 'korelasi', label: 'Kelayakan Butir (Validitas)' },
  { id: 'distribusi', label: 'Sebaran Skor Butir' },
];

function formatAnalysisTime(): string {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function UraianAnalysisSection({
  examTitle,
  rows,
  itemCount,
  subMode,
  scaleMin,
  defaultMaxScore,
  itemMaxScores,
  onLoadSampleData,
  onExportProjectData,
}: UraianAnalysisSectionProps) {
  const [engineMode, setEngineMode] = useState<AnalysisEngineMode>('rekapinjx');
  const [activeTab, setActiveTab] = useState<UraianAnalysisSectionId>('rekap');
  const [anatesTab, setAnatesTab] = useState<AnatesUraianSectionId>('rekap');
  const [exportNotice, setExportNotice] = useState('');
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => formatAnalysisTime());
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setLastUpdatedAt(formatAnalysisTime());
  }, [rows, itemCount, subMode, scaleMin, defaultMaxScore, itemMaxScores]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  function handleRefreshAnalysis() {
    setRefreshTick((t) => t + 1);
    setLastUpdatedAt(formatAnalysisTime());
    setIsRefreshing(true);
    setExportNotice(
      'Data analisis rekapinJx & Anates V4 telah dihitung ulang sesuai data terbaru.',
    );
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  }

  const report = useMemo(() => {
    void refreshTick;
    return computeFullUraianAnalysis(
      rows,
      itemCount,
      subMode,
      scaleMin,
      itemMaxScores,
      defaultMaxScore,
    );
  }, [rows, itemCount, subMode, scaleMin, defaultMaxScore, itemMaxScores, refreshTick]);

  const anatesReport = useMemo(() => {
    void refreshTick;
    return computeAnatesV4UraianReport(
      rows,
      itemCount,
      subMode,
      scaleMin,
      itemMaxScores,
      defaultMaxScore,
    );
  }, [rows, itemCount, subMode, scaleMin, defaultMaxScore, itemMaxScores, refreshTick]);

  const activeTabLabel =
    URAIAN_TABS.find((t) => t.id === activeTab)?.label ?? 'Rekap Analisis Butir';
  const activeAnatesTabLabel =
    ANATES_URAIAN_TABS.find((t) => t.id === anatesTab)?.label ??
    'Rekap Anates V4';

  function handleExportCurrentExcel() {
    const filename = exportUraianSingleAnalysisExcel(
      activeTab,
      report,
      examTitle,
    );
    setExportNotice(
      `Excel rekapinJx (${activeTabLabel}) disimpan sebagai "${filename}".`,
    );
  }

  function handleExportCurrentText() {
    const filename = exportUraianSingleAnalysisText(
      activeTab,
      report,
      examTitle,
    );
    setExportNotice(
      `Laporan teks rekapinJx (${activeTabLabel}) disimpan sebagai "${filename}".`,
    );
  }

  function handleExportAllExcel() {
    const filename = exportUraianAllAnalysesExcel(report, examTitle);
    setExportNotice(
      `Buku kerja rekapinJx 7 sheet disimpan sebagai "${filename}".`,
    );
  }

  function handleExportAnatesExcel() {
    const filename = exportAnatesUraianSingleExcel(
      anatesTab,
      anatesReport,
      examTitle,
    );
    setExportNotice(
      `Excel Anates V4 (${activeAnatesTabLabel}) disimpan sebagai "${filename}".`,
    );
  }

  function handleExportAnatesText() {
    const filename = exportAnatesUraianSingleText(
      anatesTab,
      anatesReport,
      examTitle,
    );
    setExportNotice(
      `Laporan teks Anates V4 (${activeAnatesTabLabel}) disimpan sebagai "${filename}".`,
    );
  }

  function handleExportAnatesAllExcel() {
    const filename = exportAnatesUraianAllExcel(anatesReport, examTitle);
    setExportNotice(
      `Buku kerja lengkap 7 sheet Anates V4 disimpan sebagai "${filename}".`,
    );
  }

  async function handleExportWord(variant: WordReportVariant) {
    if (isExportingWord) return;
    setIsExportingWord(true);
    try {
      const resolvedMax =
        defaultMaxScore ??
        Math.max(
          scaleMin + 1,
          itemMaxScores[0] ??
            (subMode === 'angket-4' ? 4 : subMode === 'angket-5' ? 5 : 10),
        );
      const filename = await exportUraianWordReport({
        examTitle,
        rows,
        itemCount,
        subMode,
        scaleMin,
        defaultMaxScore: resolvedMax,
        itemMaxScores,
        reportVariant: variant,
      });
      const label =
        variant === 'anatesv4'
          ? 'Word Anates V4'
          : variant === 'both'
            ? 'Word Gabungan (rekapinJx + Anates V4)'
            : 'Word rekapinJx';
      setExportNotice(
        `Laporan ${label} (grafik & tabel) disimpan sebagai "${filename}".`,
      );
    } catch (error) {
      setExportNotice(
        error instanceof Error
          ? error.message
          : 'Gagal membuat laporan Word (.docx).',
      );
    } finally {
      setIsExportingWord(false);
    }
  }

  function renderDistinguishedUnggulAsor(cfg: {
    rankedStudents: RankedStudent[];
    groupSize: number;
    scoreHeader: string;
    engineNote: string;
  }) {
    const breakdown = splitUnggulAsorGroups(cfg.rankedStudents);
    const renderGroupRows = (
      list: RankedStudent[],
      badgeText: string,
      badgeClass: string,
    ) =>
      list.map((st) => (
        <tr
          key={st.id}
          className="bg-white hover:bg-[#F8FAFC] dark:bg-[#141D19] dark:hover:bg-[#1B2722]"
        >
          <td className="font-mono-tabular border-b border-[#E5EBF1] px-2.5 py-2 text-center font-semibold dark:border-[#24322B]">
            {st.rank}
          </td>
          <td className="border-b border-[#E5EBF1] px-2.5 py-2 font-medium text-[#14211C] dark:border-[#24322B] dark:text-[#E6EEE9]">
            {st.nama}
          </td>
          <td className="border-b border-[#E5EBF1] px-2.5 py-2 text-center text-[#52635C] dark:border-[#24322B] dark:text-[#9AAAA2]">
            {st.kelas}
          </td>
          <td className="font-mono-tabular border-b border-[#E5EBF1] px-2.5 py-2 text-right font-semibold dark:border-[#24322B]">
            {st.score}/{st.maxScore}
          </td>
          <td className="font-mono-tabular border-b border-[#E5EBF1] px-2.5 py-2 text-right dark:border-[#24322B]">
            {st.scorePercent.toFixed(1)}%
          </td>
          <td className="border-b border-[#E5EBF1] px-2.5 py-2 text-center dark:border-[#24322B]">
            <span
              className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}
            >
              {badgeText}
            </span>
          </td>
        </tr>
      ));

    return (
      <div className="flex flex-col gap-4 rounded-xl border-2 border-[#B8CCE0] bg-[#F4F8FC] p-4 dark:border-[#2C4766] dark:bg-[#101D2D]">
        {/* Distinguished Royal Navy Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#1E3A5F] px-4 py-3 text-white dark:bg-[#162C46]">
          <div>
            <h3 className="text-sm font-bold">
              Analisis Khusus Kelompok Unggul &amp; Asor (Metode 27%) ·{' '}
              {cfg.engineNote}
            </h3>
            <p className="text-xs text-[#D6E4F3]">
              Dipisahkan dari tabel analisis butir agar pengelompokan 27% atas
              (Unggul) dan 27% bawah (Asor) terlihat jelas.
            </p>
          </div>
          <span className="font-mono-tabular rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold whitespace-nowrap">
            n = {cfg.groupSize} peserta/kelompok · Total N = {breakdown.total}
          </span>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-[#BFE0D2] bg-[#ECF8F2] p-3.5 dark:border-[#244A3B] dark:bg-[#132920]">
            <div className="text-xs font-bold text-[#14533C] dark:text-[#75DFB5]">
              Kelompok Unggul (27% Atas)
            </div>
            <div className="font-mono-tabular mt-1 text-lg font-bold text-[#14211C] dark:text-[#E6EEE9]">
              {breakdown.upperSummary.count} peserta (
              {breakdown.upperSummary.percentOfTotal}%)
            </div>
            <div className="font-mono-tabular mt-0.5 text-xs text-[#394A43] dark:text-[#A9C4B8]">
              Rentang skor: {formatScoreRange(breakdown.upperSummary)}
            </div>
          </div>

          <div className="rounded-lg border border-[#CBD5E1] bg-white p-3.5 dark:border-[#334155] dark:bg-[#16212C]">
            <div className="text-xs font-bold text-[#475467] dark:text-[#CBD5E1]">
              Kelompok Tengah (Netral)
            </div>
            <div className="font-mono-tabular mt-1 text-lg font-bold text-[#14211C] dark:text-[#E6EEE9]">
              {breakdown.middleSummary.count} peserta (
              {breakdown.middleSummary.percentOfTotal}%)
            </div>
            <div className="font-mono-tabular mt-0.5 text-xs text-[#475467] dark:text-[#94A3B8]">
              Rentang skor: {formatScoreRange(breakdown.middleSummary)}
            </div>
          </div>

          <div className="rounded-lg border border-[#F5C2C0] bg-[#FEF2F2] p-3.5 dark:border-[#5C2422] dark:bg-[#2A1414]">
            <div className="text-xs font-bold text-[#912018] dark:text-[#FDA29B]">
              Kelompok Asor (27% Bawah)
            </div>
            <div className="font-mono-tabular mt-1 text-lg font-bold text-[#14211C] dark:text-[#E6EEE9]">
              {breakdown.lowerSummary.count} peserta (
              {breakdown.lowerSummary.percentOfTotal}%)
            </div>
            <div className="font-mono-tabular mt-0.5 text-xs text-[#7A271A] dark:text-[#FECACA]">
              Rentang skor: {formatScoreRange(breakdown.lowerSummary)}
            </div>
          </div>
        </div>

        {/* Separated Side-by-Side Unggul & Asor Panels */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Panel A: Unggul */}
          <div className="overflow-hidden rounded-lg border border-[#BFE0D2] bg-white dark:border-[#244A3B] dark:bg-[#141D19]">
            <div className="flex items-center justify-between bg-[#1B6B4F] px-3.5 py-2.5 text-white dark:bg-[#15523C]">
              <span className="text-xs font-bold sm:text-sm">
                [A] Kelompok Unggul (27% Atas)
              </span>
              <span className="font-mono-tabular text-xs font-semibold">
                {breakdown.upper.length} peserta
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-xs">
                <thead>
                  <tr className="bg-[#EAF4EF] font-semibold text-[#14533C] dark:bg-[#132920] dark:text-[#75DFB5]">
                    <th className="border-b border-[#CFE5DA] px-2.5 py-2 text-center dark:border-[#244A3B]">
                      Rank
                    </th>
                    <th className="border-b border-[#CFE5DA] px-2.5 py-2 text-left dark:border-[#244A3B]">
                      Nama Peserta
                    </th>
                    <th className="border-b border-[#CFE5DA] px-2.5 py-2 text-center dark:border-[#244A3B]">
                      Kelas
                    </th>
                    <th className="border-b border-[#CFE5DA] px-2.5 py-2 text-right dark:border-[#244A3B]">
                      {cfg.scoreHeader}
                    </th>
                    <th className="border-b border-[#CFE5DA] px-2.5 py-2 text-right dark:border-[#244A3B]">
                      Capaian (%)
                    </th>
                    <th className="border-b border-[#CFE5DA] px-2.5 py-2 text-center dark:border-[#244A3B]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {renderGroupRows(
                    breakdown.upper,
                    'Unggul',
                    'bg-[#ECF8F2] text-[#14533C] dark:bg-[#193529] dark:text-[#75DFB5]',
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel B: Asor */}
          <div className="overflow-hidden rounded-lg border border-[#F5C2C0] bg-white dark:border-[#5C2422] dark:bg-[#141D19]">
            <div className="flex items-center justify-between bg-[#912018] px-3.5 py-2.5 text-white dark:bg-[#7A1C16]">
              <span className="text-xs font-bold sm:text-sm">
                [B] Kelompok Asor (27% Bawah)
              </span>
              <span className="font-mono-tabular text-xs font-semibold">
                {breakdown.lower.length} peserta
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-xs">
                <thead>
                  <tr className="bg-[#FEF2F2] font-semibold text-[#912018] dark:bg-[#2A1414] dark:text-[#FDA29B]">
                    <th className="border-b border-[#F5D0CE] px-2.5 py-2 text-center dark:border-[#5C2422]">
                      Rank
                    </th>
                    <th className="border-b border-[#F5D0CE] px-2.5 py-2 text-left dark:border-[#5C2422]">
                      Nama Peserta
                    </th>
                    <th className="border-b border-[#F5D0CE] px-2.5 py-2 text-center dark:border-[#5C2422]">
                      Kelas
                    </th>
                    <th className="border-b border-[#F5D0CE] px-2.5 py-2 text-right dark:border-[#5C2422]">
                      {cfg.scoreHeader}
                    </th>
                    <th className="border-b border-[#F5D0CE] px-2.5 py-2 text-right dark:border-[#5C2422]">
                      Capaian (%)
                    </th>
                    <th className="border-b border-[#F5D0CE] px-2.5 py-2 text-center dark:border-[#5C2422]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {renderGroupRows(
                    breakdown.lower,
                    'Asor',
                    'bg-[#FEE4E2] text-[#912018] dark:bg-[#4A1C1A] dark:text-[#FECACA]',
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Panel C: Kelompok Tengah */}
        {breakdown.middle.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-[#CBD5E1] bg-white dark:border-[#334155] dark:bg-[#141D19]">
            <div className="flex items-center justify-between bg-[#475467] px-3.5 py-2 text-white dark:bg-[#334155]">
              <span className="text-xs font-bold">
                [C] Kelompok Tengah (Tidak Masuk Hitungan DP 27%)
              </span>
              <span className="font-mono-tabular text-xs font-semibold">
                {breakdown.middle.length} peserta
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] font-semibold text-[#475467] dark:bg-[#1E293B] dark:text-[#CBD5E1]">
                    <th className="border-b border-[#E2E8F0] px-2.5 py-2 text-center dark:border-[#334155]">
                      Rank
                    </th>
                    <th className="border-b border-[#E2E8F0] px-2.5 py-2 text-left dark:border-[#334155]">
                      Nama Peserta
                    </th>
                    <th className="border-b border-[#E2E8F0] px-2.5 py-2 text-center dark:border-[#334155]">
                      Kelas
                    </th>
                    <th className="border-b border-[#E2E8F0] px-2.5 py-2 text-right dark:border-[#334155]">
                      {cfg.scoreHeader}
                    </th>
                    <th className="border-b border-[#E2E8F0] px-2.5 py-2 text-right dark:border-[#334155]">
                      Capaian (%)
                    </th>
                    <th className="border-b border-[#E2E8F0] px-2.5 py-2 text-center dark:border-[#334155]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {renderGroupRows(
                    breakdown.middle,
                    'Tengah',
                    'bg-[#F1F5F9] text-[#475467] dark:bg-[#273449] dark:text-[#CBD5E1]',
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section
      id="uraian-analisis"
      aria-labelledby="heading-uraian-analisis"
      className="flex flex-col gap-5 rounded-xl border border-[#D4DDD8] bg-white p-5 sm:p-6 dark:border-[#28362F] dark:bg-[#161F1B]"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1B6B4F] text-sm font-bold text-white dark:bg-[#4AC294] dark:text-[#0B1712]">
            5
          </span>
          <div>
            <h2
              id="heading-uraian-analisis"
              className="text-base font-bold text-[#14211C] dark:text-[#E6EEE9]"
            >
              Olah data &amp; analisis butir angket / uraian
            </h2>
            <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
              Otomatis mengikuti perubahan data &amp; bobot. Pilih sumber hasil:
              standar <strong>rekapinJx</strong>, standar{' '}
              <strong>Anates V4</strong>, atau perbandingan keduanya.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono-tabular rounded-lg border border-[#DCE5E0] bg-[#F8FAF9] px-2.5 py-1.5 text-[11px] font-medium text-[#52635C] dark:border-[#28362F] dark:bg-[#111915] dark:text-[#9AAAA2]">
            Sinkron otomatis · {lastUpdatedAt}
          </span>
          <button
            type="button"
            onClick={handleRefreshAnalysis}
            className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Refresh Analisis</span>
          </button>
        </div>
      </div>

      {/* Engine Switcher */}
      <div className="flex flex-col gap-2 rounded-xl border border-[#D4DDD8] bg-[#F7FAF8] p-2 sm:flex-row sm:items-center sm:justify-between dark:border-[#28362F] dark:bg-[#111915]">
        <div
          role="tablist"
          aria-label="Pilih metode olah data angket dan uraian"
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={engineMode === 'rekapinjx'}
            onClick={() => {
              setEngineMode('rekapinjx');
              setExportNotice('');
            }}
            className={`btn-gesture cursor-pointer rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap sm:text-sm ${
              engineMode === 'rekapinjx'
                ? 'bg-[#1B6B4F] text-white shadow-xs dark:bg-[#4AC294] dark:text-[#0B1712]'
                : 'text-[#394A43] hover:bg-white dark:text-[#C5D3CC] dark:hover:bg-[#1D2923]'
            }`}
          >
            Hasil rekapinJx (Alpha)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={engineMode === 'anatesv4'}
            onClick={() => {
              setEngineMode('anatesv4');
              setExportNotice('');
            }}
            className={`btn-gesture cursor-pointer rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap sm:text-sm ${
              engineMode === 'anatesv4'
                ? 'bg-[#8A511D] text-white shadow-xs dark:bg-[#E5B076] dark:text-[#231407]'
                : 'text-[#394A43] hover:bg-white dark:text-[#C5D3CC] dark:hover:bg-[#1D2923]'
            }`}
          >
            Hasil Anates V4
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={engineMode === 'compare'}
            onClick={() => {
              setEngineMode('compare');
              setExportNotice('');
            }}
            className={`btn-gesture inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap sm:text-sm ${
              engineMode === 'compare'
                ? 'bg-[#14211C] text-white shadow-xs dark:bg-[#E6EEE9] dark:text-[#0E1713]'
                : 'text-[#394A43] hover:bg-white dark:text-[#C5D3CC] dark:hover:bg-[#1D2923]'
            }`}
          >
            <GitCompare className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Bandingkan Keduanya</span>
          </button>
        </div>

        <span className="px-2 text-xs font-medium text-[#52635C] dark:text-[#9AAAA2]">
          {engineMode === 'rekapinjx'
            ? 'Aktif: Standar Analisis rekapinJx'
            : engineMode === 'anatesv4'
              ? 'Aktif: Standar Asli Anates V4'
              : 'Aktif: Perbandingan Terpisah'}
        </span>
      </div>

      {!report.hasSufficientData ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-[#C7D4CD] bg-[#F8FAF9] p-6 dark:border-[#2D3D35] dark:bg-[#121A16]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#14211C] dark:text-[#E6EEE9]">
            <BarChart3
              className="h-4 w-4 text-[#1B6B4F] dark:text-[#58C49B]"
              aria-hidden="true"
            />
            <span>Analisis angket &amp; uraian siap menghitung otomatis</span>
          </div>
          <p className="max-w-2xl text-sm text-[#52635C] dark:text-[#9AAAA2]">
            {report.reasonIfInsufficient}
          </p>
          <button
            type="button"
            onClick={onLoadSampleData}
            className="btn-gesture btn-surface-primary min-h-[40px] cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Muat Contoh Data Angket / Uraian (12 Peserta, 10 Butir)
          </button>
        </div>
      ) : engineMode === 'rekapinjx' ? (
        /* ============================================================== */
        /* ENGINE 1: HASIL REKAPINJX                                      */
        /* ============================================================== */
        <div className="flex flex-col gap-5">
          {/* Summary KPI strip */}
          <div className="grid grid-cols-2 divide-y divide-[#E3EAE6] rounded-lg border border-[#D4DDD8] bg-[#FAFBFB] sm:grid-cols-4 sm:divide-x sm:divide-y-0 dark:divide-[#24322B] dark:border-[#28362F] dark:bg-[#111915]">
            <div className="flex flex-col gap-1 p-4">
              <span className="text-xs font-medium text-[#52635C] dark:text-[#9AAAA2]">
                Reliabilitas (Alpha Cronbach)
              </span>
              <span className="font-mono-tabular text-xl font-bold text-[#14211C] dark:text-[#E6EEE9]">
                {report.reliability.cronbachAlpha !== null
                  ? report.reliability.cronbachAlpha.toFixed(3)
                  : '—'}
              </span>
              <span className="text-xs font-semibold text-[#1B6B4F] dark:text-[#58C49B]">
                {report.reliability.category}
              </span>
            </div>

            <div className="flex flex-col gap-1 p-4">
              <span className="text-xs font-medium text-[#52635C] dark:text-[#9AAAA2]">
                Kel. Unggul &amp; Asor (27%)
              </span>
              <span className="font-mono-tabular text-xl font-bold text-[#14211C] dark:text-[#E6EEE9]">
                {report.groupSize} &amp; {report.groupSize} peserta
              </span>
              <span className="font-mono-tabular text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Total responden: {report.reliability.studentCount}
              </span>
            </div>

            <div className="flex flex-col gap-1 p-4">
              <span className="text-xs font-medium text-[#52635C] dark:text-[#9AAAA2]">
                Validitas Butir (r tabel:{' '}
                {report.reliability.rTable !== null
                  ? report.reliability.rTable.toFixed(3)
                  : '—'}
                )
              </span>
              <span className="font-mono-tabular text-xl font-bold text-[#14211C] dark:text-[#E6EEE9]">
                {report.summaryCounts.valid} / {report.items.length} valid
              </span>
              <span className="font-mono-tabular text-xs text-[#52635C] dark:text-[#9AAAA2]">
                {report.summaryCounts.invalid} tidak valid
              </span>
            </div>

            <div className="flex flex-col gap-1 p-4">
              <span className="text-xs font-medium text-[#52635C] dark:text-[#9AAAA2]">
                Kualitas Akhir Butir
              </span>
              <span className="font-mono-tabular text-xl font-bold text-[#14211C] dark:text-[#E6EEE9]">
                {report.summaryCounts.usable} dipakai
              </span>
              <span className="font-mono-tabular text-xs text-[#52635C] dark:text-[#9AAAA2]">
                {report.summaryCounts.revise} revisi ·{' '}
                {report.summaryCounts.discard} dibuang
              </span>
            </div>
          </div>

          {/* 7 Tabs */}
          <div
            role="tablist"
            aria-label="Menu olah data angket dan uraian rekapinJx"
            className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#EFF3F1] p-1.5 dark:bg-[#111915]"
          >
            {URAIAN_TABS.map((tab) => {
              const isUnggulTab = tab.id === 'unggul-asor';
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setExportNotice('');
                  }}
                  className={`btn-gesture cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap sm:text-sm ${
                    isSelected
                      ? isUnggulTab
                        ? 'bg-[#1E3A5F] text-white shadow-xs dark:bg-[#2F639D] dark:text-white'
                        : 'btn-surface-primary'
                      : isUnggulTab
                        ? 'border border-[#B8CCE0] bg-[#EEF4FA] text-[#1E3A5F] hover:bg-[#E1ECF7] dark:border-[#2C4766] dark:bg-[#132233] dark:text-[#93C5FD] dark:hover:bg-[#1B314A]'
                        : 'text-[#52635C] hover:bg-white/70 hover:text-[#14211C] dark:text-[#9AAAA2] dark:hover:bg-[#1D2923] dark:hover:text-[#E6EEE9]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Per-analysis & full-workbook export toolbar */}
          <div className="flex flex-col gap-2.5 rounded-lg border border-[#D4DDD8] bg-[#F8FAF9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#28362F] dark:bg-[#111915]">
            <div className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
              <span className="font-semibold text-[#1B6B4F] dark:text-[#58C49B]">
                Versi rekapinJx · {activeTabLabel}
              </span>{' '}
              — simpan hasil analisis ini atau ekspor 7 sheet sekaligus.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleExportWord('rekapinjx')}
                disabled={isExportingWord}
                className="btn-gesture btn-surface-primary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap disabled:opacity-60"
              >
                <FileDown className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {isExportingWord
                    ? 'Membuat Word...'
                    : 'Unduh Word rekapinJx (.docx)'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleExportCurrentExcel}
                className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                <FileSpreadsheet className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Simpan Excel Analisis Ini</span>
              </button>
              <button
                type="button"
                onClick={handleExportCurrentText}
                className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                <FileText className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Simpan Teks (.txt)</span>
              </button>
              <button
                type="button"
                onClick={handleExportAllExcel}
                className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                <Download className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Simpan 7 Sheet (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onExportProjectData();
                  setExportNotice('File data angket/uraian (.json) disimpan.');
                }}
                className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                <Save className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Simpan Data (.json)</span>
              </button>
            </div>
          </div>

          {exportNotice && (
            <p
              role="status"
              aria-live="polite"
              className="text-xs font-medium text-[#1B6B4F] dark:text-[#58C49B]"
            >
              {exportNotice}
            </p>
          )}

          {/* Tab 1: Rekap Analisis Butir */}
          {activeTab === 'rekap' && (
            <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
              <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                      No
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Skor Maks
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Rata-rata
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Korelasi (r)
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                      Validitas
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Indeks (P)
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                      Kesukaran / Capaian
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Daya Pembeda (D)
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                      Kategori DP
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                      Kualitas Akhir
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((item) => (
                    <tr
                      key={item.itemNumber}
                      className="bg-white hover:bg-[#F8FAF9] dark:bg-[#161F1B] dark:hover:bg-[#1B2621]"
                    >
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-semibold dark:border-[#24322B]">
                        {item.itemNumber}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {item.maxScore}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {item.meanScore.toFixed(2)}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {item.correlationR !== null
                          ? item.correlationR.toFixed(3)
                          : '—'}
                      </td>
                      <td
                        className={`border-b border-[#E3EAE6] px-3 py-2 font-semibold dark:border-[#24322B] ${
                          item.validityStatus === 'Valid'
                            ? 'text-[#1B6B4F] dark:text-[#58C49B]'
                            : 'text-[#B42318] dark:text-[#FDA29B]'
                        }`}
                      >
                        {item.validityStatus}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {item.difficultyIndex.toFixed(3)}
                      </td>
                      <td className="border-b border-[#E3EAE6] px-3 py-2 dark:border-[#24322B]">
                        {item.difficultyCategory}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {item.discriminationIndex.toFixed(3)}
                      </td>
                      <td className="border-b border-[#E3EAE6] px-3 py-2 dark:border-[#24322B]">
                        {item.discriminationCategory}
                      </td>
                      <td
                        className={`border-b border-[#E3EAE6] px-3 py-2 font-bold dark:border-[#24322B] ${
                          item.finalDecision === 'Dipakai'
                            ? 'bg-[#ECF8F2] text-[#14533C] dark:bg-[#193529] dark:text-[#75DFB5]'
                            : item.finalDecision === 'Revisi'
                              ? 'bg-[#FEF6DC] text-[#7A5A06] dark:bg-[#3A2F14] dark:text-[#F0CF7B]'
                              : 'bg-[#FEE4E2] text-[#912018] dark:bg-[#4A1C1A] dark:text-[#FECACA]'
                        }`}
                      >
                        {item.finalDecision}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Reliabilitas Alpha Cronbach */}
          {activeTab === 'reliabilitas' && (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                      <th className="border-b border-[#D4DDD8] px-4 py-2.5 text-left dark:border-[#28362F]">
                        Parameter Pengujian Reliabilitas (Alpha Cronbach)
                      </th>
                      <th className="border-b border-[#D4DDD8] px-4 py-2.5 text-right dark:border-[#28362F]">
                        Hasil Perhitungan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3EAE6] dark:divide-[#24322B]">
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Jumlah Peserta / Responden (N)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {report.reliability.studentCount}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Jumlah Butir (k)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {report.reliability.itemCount}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Rata-rata Skor Total
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {report.reliability.meanTotalScore.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Varians Skor Total (S²t)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {report.reliability.varianceTotal.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Jumlah Varians Skor Butir (Σ Si²)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {report.reliability.sumItemVariance.toFixed(3)}
                      </td>
                    </tr>
                    <tr className="bg-[#EDF5F1] dark:bg-[#193026]">
                      <td className="px-4 py-3 font-bold text-[#144332] dark:text-[#A6E8CE]">
                        Koefisien Alpha Cronbach (α)
                      </td>
                      <td className="font-mono-tabular px-4 py-3 text-right text-base font-bold text-[#144332] dark:text-[#A6E8CE]">
                        {report.reliability.cronbachAlpha !== null
                          ? report.reliability.cronbachAlpha.toFixed(3)
                          : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Interpretasi Reliabilitas
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#1B6B4F] dark:text-[#58C49B]">
                        {report.reliability.category}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Rumus Alpha Cronbach: α = (k / (k − 1)) × (1 − (Σ Si² / S²t)).
                Instrumen angket atau soal uraian dinyatakan reliabel bila α ≥
                0,60.
              </p>
            </div>
          )}

          {/* Tab 3: Kelompok Unggul & Asor — Format Khusus Terpisah */}
          {activeTab === 'unggul-asor' &&
            renderDistinguishedUnggulAsor({
              rankedStudents: report.rankedStudents,
              groupSize: report.groupSize,
              scoreHeader: 'Total Skor',
              engineNote: 'Versi rekapinJx',
            })}

          {/* Tab 4: Daya Pembeda */}
          {activeTab === 'daya-pembeda' && (
            <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
              <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                      No Butir
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Skor Maks
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Rata-rata Unggul (n={report.groupSize})
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Rata-rata Asor (n={report.groupSize})
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Selisih (U − A)
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Indeks DP (D)
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                      Tafsiran
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((item) => (
                    <tr
                      key={item.itemNumber}
                      className="bg-white hover:bg-[#F8FAF9] dark:bg-[#161F1B] dark:hover:bg-[#1B2621]"
                    >
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-semibold dark:border-[#24322B]">
                        {item.itemNumber}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {item.maxScore}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {item.upperMean.toFixed(2)}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {item.lowerMean.toFixed(2)}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {(item.upperMean - item.lowerMean).toFixed(2)}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right font-semibold dark:border-[#24322B]">
                        {item.discriminationIndex.toFixed(3)}
                      </td>
                      <td
                        className={`border-b border-[#E3EAE6] px-3 py-2 font-semibold dark:border-[#24322B] ${
                          item.discriminationIndex >= 0.4
                            ? 'text-[#1B6B4F] dark:text-[#58C49B]'
                            : item.discriminationIndex >= 0.2
                              ? 'text-[#14211C] dark:text-[#E6EEE9]'
                              : 'text-[#B42318] dark:text-[#FDA29B]'
                        }`}
                      >
                        {item.discriminationCategory}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 5: Tingkat Kesukaran / Capaian */}
          {activeTab === 'tingkat-kesukaran' && (
            <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
              <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                      No Butir
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Rentang Skor
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Rata-rata Skor
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Indeks (P)
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Capaian (%)
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                      Tafsiran
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((item) => (
                    <tr
                      key={item.itemNumber}
                      className="bg-white hover:bg-[#F8FAF9] dark:bg-[#161F1B] dark:hover:bg-[#1B2621]"
                    >
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-semibold dark:border-[#24322B]">
                        {item.itemNumber}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {item.minScore}–{item.maxScore}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {item.meanScore.toFixed(2)}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right font-semibold dark:border-[#24322B]">
                        {item.difficultyIndex.toFixed(3)}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {(item.difficultyIndex * 100).toFixed(1)}%
                      </td>
                      <td className="border-b border-[#E3EAE6] px-3 py-2 font-semibold dark:border-[#24322B]">
                        {item.difficultyCategory}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 6: Korelasi Skor Butir */}
          {activeTab === 'korelasi' && (
            <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
              <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                      No Butir
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Skor Maks
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Korelasi (r hitung)
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      r Tabel (α = 5%)
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                      Signifikansi / Validitas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((item) => (
                    <tr
                      key={item.itemNumber}
                      className="bg-white hover:bg-[#F8FAF9] dark:bg-[#161F1B] dark:hover:bg-[#1B2621]"
                    >
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-semibold dark:border-[#24322B]">
                        {item.itemNumber}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {item.maxScore}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right font-semibold dark:border-[#24322B]">
                        {item.correlationR !== null
                          ? item.correlationR.toFixed(3)
                          : '—'}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right text-[#52635C] dark:border-[#24322B] dark:text-[#9AAAA2]">
                        {report.reliability.rTable !== null
                          ? report.reliability.rTable.toFixed(3)
                          : '—'}
                      </td>
                      <td
                        className={`border-b border-[#E3EAE6] px-3 py-2 font-semibold dark:border-[#24322B] ${
                          item.validityStatus === 'Valid'
                            ? 'bg-[#ECF8F2] text-[#14533C] dark:bg-[#193529] dark:text-[#75DFB5]'
                            : 'bg-[#FEE4E2] text-[#912018] dark:bg-[#4A1C1A] dark:text-[#FECACA]'
                        }`}
                      >
                        {item.validityStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 7: Sebaran Skor Butir */}
          {activeTab === 'distribusi' && (
            <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
              <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                      No Butir
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Skor Min–Maks
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Rata-rata
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Simpangan Baku
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                      Frekuensi Sebaran (Skor : Jumlah)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((item) => (
                    <tr
                      key={item.itemNumber}
                      className="bg-white hover:bg-[#F8FAF9] dark:bg-[#161F1B] dark:hover:bg-[#1B2621]"
                    >
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-semibold dark:border-[#24322B]">
                        {item.itemNumber}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {item.minScore}–{item.maxScore}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right font-semibold dark:border-[#24322B]">
                        {item.meanScore.toFixed(2)}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {item.stdDev.toFixed(2)}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-xs dark:border-[#24322B]">
                        {item.distributionText}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : engineMode === 'anatesv4' ? (
        /* ============================================================== */
        /* ENGINE 2: HASIL ANATES V4 (URAIAN / ANGKET)                    */
        /* ============================================================== */
        <div className="flex flex-col gap-5">
          <div className="rounded-lg border border-[#E5CFB6] bg-[#FDF8F2] px-4 py-3 text-xs text-[#6B3F15] dark:border-[#4A321C] dark:bg-[#23170D] dark:text-[#EED0AE]">
            <strong>Standar Anates V4 (Uraian):</strong> Mengukur{' '}
            <strong>Konsistensi Tes</strong> dari keterkaitan skor butir ganjil
            &amp; genap, <strong>Tingkat Kesulitan (%)</strong> = (Rata-rata /
            Skor Maks) × 100% (5 kategori), <strong>Daya Pembeda (%)</strong> =
            ((Rata-rata Unggul − Rata-rata Asor) / Skor Maks) × 100%, serta
            kelayakan tiap butir pada batas standar{' '}
            <strong>5% &amp; 1%</strong>.
          </div>

          <div className="grid grid-cols-2 divide-y divide-[#EADFD3] rounded-lg border border-[#E5CFB6] bg-[#FDF8F2] sm:grid-cols-4 sm:divide-x sm:divide-y-0 dark:divide-[#3E2A17] dark:border-[#4A321C] dark:bg-[#1E140B]">
            <div className="flex flex-col gap-1 p-4">
              <span className="text-xs font-medium text-[#7C532B] dark:text-[#C9A47C]">
                Konsistensi Tes (Reliabilitas)
              </span>
              <span className="font-mono-tabular text-xl font-bold text-[#3D220A] dark:text-[#F6E4CE]">
                {anatesReport.reliability.spearmanBrownR !== null
                  ? anatesReport.reliability.spearmanBrownR.toFixed(3)
                  : '—'}
              </span>
              <span className="text-xs font-semibold text-[#8A511D] dark:text-[#E5B076]">
                {anatesReport.reliability.category} · Kecocokan ganjil-genap:{' '}
                {anatesReport.reliability.splitHalfR !== null
                  ? anatesReport.reliability.splitHalfR.toFixed(3)
                  : '—'}
              </span>
            </div>

            <div className="flex flex-col gap-1 p-4">
              <span className="text-xs font-medium text-[#7C532B] dark:text-[#C9A47C]">
                Kel. Unggul &amp; Asor (27%)
              </span>
              <span className="font-mono-tabular text-xl font-bold text-[#3D220A] dark:text-[#F6E4CE]">
                {anatesReport.groupSize} &amp; {anatesReport.groupSize} peserta
              </span>
              <span className="font-mono-tabular text-xs text-[#7C532B] dark:text-[#C9A47C]">
                Total N = {anatesReport.reliability.studentCount} ·{' '}
                {anatesReport.reliability.itemCount} butir
              </span>
            </div>

            <div className="flex flex-col gap-1 p-4">
              <span className="text-xs font-medium text-[#7C532B] dark:text-[#C9A47C]">
                Kelayakan Butir (Batas{' '}
                {anatesReport.reliability.rTable5?.toFixed(3) ?? '—'} /{' '}
                {anatesReport.reliability.rTable1?.toFixed(3) ?? '—'})
              </span>
              <span className="font-mono-tabular text-xl font-bold text-[#3D220A] dark:text-[#F6E4CE]">
                {anatesReport.summaryCounts.significant} /{' '}
                {anatesReport.items.length} layak
              </span>
              <span className="font-mono-tabular text-xs text-[#7C532B] dark:text-[#C9A47C]">
                {anatesReport.summaryCounts.notSignificant} perlu ditinjau ulang
              </span>
            </div>

            <div className="flex flex-col gap-1 p-4">
              <span className="text-xs font-medium text-[#7C532B] dark:text-[#C9A47C]">
                Rata-rata &amp; Sebaran Nilai
              </span>
              <span className="font-mono-tabular text-xl font-bold text-[#3D220A] dark:text-[#F6E4CE]">
                {anatesReport.reliability.meanScore.toFixed(2)}
              </span>
              <span className="font-mono-tabular text-xs text-[#7C532B] dark:text-[#C9A47C]">
                Keragaman nilai (SD) ={' '}
                {anatesReport.reliability.stdDev.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 7 Anates Tabs */}
          <div
            role="tablist"
            aria-label="Menu hasil Anates V4 angket dan uraian"
            className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#F5EFE8] p-1.5 dark:bg-[#1B130B]"
          >
            {ANATES_URAIAN_TABS.map((tab) => {
              const isUnggulTab = tab.id === 'unggul-asor';
              const isSelected = anatesTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    setAnatesTab(tab.id);
                    setExportNotice('');
                  }}
                  className={`btn-gesture cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap sm:text-sm ${
                    isSelected
                      ? isUnggulTab
                        ? 'bg-[#1E3A5F] text-white shadow-xs dark:bg-[#2F639D] dark:text-white'
                        : 'bg-[#8A511D] text-white shadow-xs dark:bg-[#E5B076] dark:text-[#231407]'
                      : isUnggulTab
                        ? 'border border-[#B8CCE0] bg-[#EEF4FA] text-[#1E3A5F] hover:bg-[#E1ECF7] dark:border-[#2C4766] dark:bg-[#132233] dark:text-[#93C5FD] dark:hover:bg-[#1B314A]'
                        : 'text-[#6B4A2B] hover:bg-white/80 hover:text-[#3D220A] dark:text-[#C9A47C] dark:hover:bg-[#2A1D12] dark:hover:text-[#F6E4CE]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Anates Export Toolbar */}
          <div className="flex flex-col gap-2.5 rounded-lg border border-[#E5CFB6] bg-[#FDF8F2] px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#4A321C] dark:bg-[#1E140B]">
            <div className="text-xs text-[#6B4A2B] dark:text-[#C9A47C]">
              <span className="font-semibold text-[#8A511D] dark:text-[#E5B076]">
                Versi Anates V4 · {activeAnatesTabLabel}
              </span>{' '}
              — ekspor hasil khusus Anates V4.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleExportWord('anatesv4')}
                disabled={isExportingWord}
                className="btn-gesture inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl bg-[#8A511D] px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white hover:bg-[#744215] disabled:opacity-60 dark:bg-[#E5B076] dark:text-[#231407] dark:hover:bg-[#EEC391]"
              >
                <FileDown className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {isExportingWord
                    ? 'Membuat Word...'
                    : 'Unduh Word Anates V4 (.docx)'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleExportAnatesExcel}
                className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                <FileSpreadsheet className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Simpan Excel Anates V4</span>
              </button>
              <button
                type="button"
                onClick={handleExportAnatesText}
                className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                <FileText className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Simpan Teks Anates V4 (.txt)</span>
              </button>
              <button
                type="button"
                onClick={handleExportAnatesAllExcel}
                className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                <Download className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Simpan 7 Sheet Anates V4 (.xlsx)</span>
              </button>
            </div>
          </div>

          {exportNotice && (
            <p
              role="status"
              aria-live="polite"
              className="text-xs font-medium text-[#8A511D] dark:text-[#E5B076]"
            >
              {exportNotice}
            </p>
          )}

          {/* Anates Tab 1: Rekap */}
          {anatesTab === 'rekap' && (
            <div className="flex flex-col gap-2.5">
              <div className="overflow-x-auto rounded-lg border border-[#E5CFB6] dark:border-[#4A321C]">
                <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#F9F2EA] text-xs font-semibold text-[#6B4A2B] dark:bg-[#23170D] dark:text-[#D8B68F]">
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                        No Butir
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                        Skor Maks
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                        Rata-rata
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                        Daya Pembeda (%)
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                        Tingkat Kesulitan (%)
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-left dark:border-[#4A321C]">
                        Kategori Kesulitan
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                        Skor Kesesuaian (r)
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-left dark:border-[#4A321C]">
                        Status Kelayakan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {anatesReport.items.map((it) => (
                      <tr
                        key={it.itemNumber}
                        className="bg-white hover:bg-[#FDF8F2] dark:bg-[#161F1B] dark:hover:bg-[#23170D]"
                      >
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-semibold dark:border-[#3A2717]">
                          {it.itemNumber}
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                          {it.maxScore}
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                          {it.meanScore.toFixed(2)}
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                          {it.discriminationPercent.toFixed(2)}%
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                          {it.difficultyPercent.toFixed(2)}%
                        </td>
                        <td className="border-b border-[#EFE3D6] px-3 py-2 dark:border-[#3A2717]">
                          {it.difficultyCategory}
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                          {it.correlationR !== null
                            ? it.correlationR.toFixed(3)
                            : '—'}
                        </td>
                        <td
                          className={`border-b border-[#EFE3D6] px-3 py-2 font-semibold dark:border-[#3A2717] ${
                            it.significance === 'Sangat Signifikan' ||
                            it.significance === 'Signifikan'
                              ? 'text-[#1B6B4F] dark:text-[#58C49B]'
                              : 'text-[#B42318] dark:text-[#FDA29B]'
                          }`}
                        >
                          {it.significance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                <strong>Status Kelayakan:</strong> <em>Sangat Signifikan / Signifikan</em> berarti butir layak dan cocok mengukur kemampuan peserta; <em>Tidak Signifikan</em> berarti butir sebaiknya diperbaiki atau ditinjau ulang.
              </p>
            </div>
          )}

          {/* Anates Tab 2: Konsistensi Tes */}
          {anatesTab === 'reliabilitas' && (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-lg border border-[#E5CFB6] dark:border-[#4A321C]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F9F2EA] text-xs font-semibold text-[#6B4A2B] dark:bg-[#23170D] dark:text-[#D8B68F]">
                      <th className="border-b border-[#E5CFB6] px-4 py-2.5 text-left dark:border-[#4A321C]">
                        Parameter Pengujian Konsistensi Tes (Anates V4)
                      </th>
                      <th className="border-b border-[#E5CFB6] px-4 py-2.5 text-right dark:border-[#4A321C]">
                        Hasil Perhitungan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE3D6] dark:divide-[#3A2717]">
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Jumlah Peserta / Responden (N)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {anatesReport.reliability.studentCount}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Jumlah Butir (k)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {anatesReport.reliability.itemCount}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Rata-rata Skor Total
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {anatesReport.reliability.meanScore.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Keragaman Nilai (Simpangan Baku / SD)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {anatesReport.reliability.stdDev.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Kecocokan Butir Ganjil &amp; Genap (XY)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {anatesReport.reliability.splitHalfR !== null
                          ? anatesReport.reliability.splitHalfR.toFixed(3)
                          : '—'}
                      </td>
                    </tr>
                    <tr className="bg-[#FDF3E7] dark:bg-[#2E1E10]">
                      <td className="px-4 py-3 font-bold text-[#8A511D] dark:text-[#F6E4CE]">
                        Nilai Konsistensi Instrumen Keseluruhan
                      </td>
                      <td className="font-mono-tabular px-4 py-3 text-right text-base font-bold text-[#8A511D] dark:text-[#F6E4CE]">
                        {anatesReport.reliability.spearmanBrownR !== null
                          ? anatesReport.reliability.spearmanBrownR.toFixed(3)
                          : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Kesimpulan Konsistensi Tes
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#8A511D] dark:text-[#E5B076]">
                        {anatesReport.reliability.category}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Batas Minimal Valid (Standar 5% / Standar 1%)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {anatesReport.reliability.rTable5?.toFixed(3) ?? '—'} /{' '}
                        {anatesReport.reliability.rTable1?.toFixed(3) ?? '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Anates V4 mengukur konsistensi instrumen dengan membandingkan keterkaitan skor butir ganjil dan genap lalu menyesuaikannya untuk keseluruhan tes, sedangkan rekapinJx menghitung konsistensi langsung dari variasi skor tiap butir.
              </p>
            </div>
          )}

          {/* Anates Tab 3: Unggul Asor — Format Khusus Terpisah */}
          {anatesTab === 'unggul-asor' &&
            renderDistinguishedUnggulAsor({
              rankedStudents: anatesReport.rankedStudents,
              groupSize: anatesReport.groupSize,
              scoreHeader: 'Total Skor',
              engineNote: 'Versi Anates V4',
            })}

          {/* Anates Tab 4: Daya Pembeda (%) */}
          {anatesTab === 'daya-pembeda' && (
            <div className="overflow-x-auto rounded-lg border border-[#E5CFB6] dark:border-[#4A321C]">
              <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F9F2EA] text-xs font-semibold text-[#6B4A2B] dark:bg-[#23170D] dark:text-[#D8B68F]">
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                      No Butir
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      Skor Maks
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      Rata2 Unggul (n={anatesReport.groupSize})
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      Rata2 Asor (n={anatesReport.groupSize})
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      Selisih (U − A)
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      Daya Pembeda (%)
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-left dark:border-[#4A321C]">
                      Kategori
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {anatesReport.items.map((it) => (
                    <tr
                      key={it.itemNumber}
                      className="bg-white hover:bg-[#FDF8F2] dark:bg-[#161F1B] dark:hover:bg-[#23170D]"
                    >
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-semibold dark:border-[#3A2717]">
                        {it.itemNumber}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                        {it.maxScore}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                        {it.upperMean.toFixed(2)}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                        {it.lowerMean.toFixed(2)}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                        {(it.upperMean - it.lowerMean).toFixed(2)}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right font-semibold dark:border-[#3A2717]">
                        {it.discriminationPercent.toFixed(2)}%
                      </td>
                      <td className="border-b border-[#EFE3D6] px-3 py-2 font-semibold dark:border-[#3A2717]">
                        {it.discriminationCategory}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Anates Tab 5: Tingkat Kesulitan (%) */}
          {anatesTab === 'tingkat-kesukaran' && (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto rounded-lg border border-[#E5CFB6] dark:border-[#4A321C]">
                <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#F9F2EA] text-xs font-semibold text-[#6B4A2B] dark:bg-[#23170D] dark:text-[#D8B68F]">
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                        No Butir
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                        Skor Maks
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                        Rata-rata
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                        Tingkat Kesulitan (%)
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-left dark:border-[#4A321C]">
                        Kategori Kesulitan (5 Tingkat)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {anatesReport.items.map((it) => (
                      <tr
                        key={it.itemNumber}
                        className="bg-white hover:bg-[#FDF8F2] dark:bg-[#161F1B] dark:hover:bg-[#23170D]"
                      >
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-semibold dark:border-[#3A2717]">
                          {it.itemNumber}
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                          {it.maxScore}
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                          {it.meanScore.toFixed(2)}
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right font-semibold dark:border-[#3A2717]">
                          {it.difficultyPercent.toFixed(2)}%
                        </td>
                        <td className="border-b border-[#EFE3D6] px-3 py-2 font-semibold dark:border-[#3A2717]">
                          {it.difficultyCategory}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Anates V4 Uraian menghitung Tingkat Kesulitan (%) = (Rata-rata / Skor Maks) × 100%:
                ≤15% Sangat Sukar · 16–30% Sukar · 31–70% Sedang · 71–85% Mudah
                · &gt;85% Sangat Mudah.
              </p>
            </div>
          )}

          {/* Anates Tab 6: Kelayakan Butir (Validitas) */}
          {anatesTab === 'korelasi' && (
            <div className="flex flex-col gap-2.5">
              <div className="overflow-x-auto rounded-lg border border-[#E5CFB6] dark:border-[#4A321C]">
                <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#F9F2EA] text-xs font-semibold text-[#6B4A2B] dark:bg-[#23170D] dark:text-[#D8B68F]">
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                        No Butir
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                        Skor Maks
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                        Skor Kesesuaian (r)
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                        Batas Minimal 5%
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                        Batas Minimal 1%
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-left dark:border-[#4A321C]">
                        Status Kelayakan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {anatesReport.items.map((it) => (
                      <tr
                        key={it.itemNumber}
                        className="bg-white hover:bg-[#FDF8F2] dark:bg-[#161F1B] dark:hover:bg-[#23170D]"
                      >
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-semibold dark:border-[#3A2717]">
                          {it.itemNumber}
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                          {it.maxScore}
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right font-semibold dark:border-[#3A2717]">
                          {it.correlationR !== null
                            ? it.correlationR.toFixed(3)
                            : '—'}
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right text-[#52635C] dark:border-[#3A2717] dark:text-[#9AAAA2]">
                          {anatesReport.reliability.rTable5?.toFixed(3) ?? '—'}
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right text-[#52635C] dark:border-[#3A2717] dark:text-[#9AAAA2]">
                          {anatesReport.reliability.rTable1?.toFixed(3) ?? '—'}
                        </td>
                        <td
                          className={`border-b border-[#EFE3D6] px-3 py-2 font-semibold dark:border-[#3A2717] ${
                            it.significance === 'Sangat Signifikan' ||
                            it.significance === 'Signifikan'
                              ? 'bg-[#ECF8F2] text-[#14533C] dark:bg-[#193529] dark:text-[#75DFB5]'
                              : 'bg-[#FEE4E2] text-[#912018] dark:bg-[#4A1C1A] dark:text-[#FECACA]'
                          }`}
                        >
                          {it.significance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Butir dinyatakan <strong>Signifikan / Sangat Signifikan</strong> (layak dipakai) bila skor kesesuaiannya melewati batas minimal standar 5% atau 1%.
              </p>
            </div>
          )}

          {/* Anates Tab 7: Sebaran Skor */}
          {anatesTab === 'distribusi' && (
            <div className="overflow-x-auto rounded-lg border border-[#E5CFB6] dark:border-[#4A321C]">
              <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F9F2EA] text-xs font-semibold text-[#6B4A2B] dark:bg-[#23170D] dark:text-[#D8B68F]">
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                      No Butir
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      Skor Maks
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      Rata-rata
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      Simpangan Baku
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-left dark:border-[#4A321C]">
                      Frekuensi Sebaran (Skor : Jumlah)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {anatesReport.items.map((it) => (
                    <tr
                      key={it.itemNumber}
                      className="bg-white hover:bg-[#FDF8F2] dark:bg-[#161F1B] dark:hover:bg-[#23170D]"
                    >
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-semibold dark:border-[#3A2717]">
                        {it.itemNumber}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                        {it.maxScore}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right font-semibold dark:border-[#3A2717]">
                        {it.meanScore.toFixed(2)}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                        {it.stdDev.toFixed(2)}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-xs dark:border-[#3A2717]">
                        {it.distributionText}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* ENGINE 3: BANDINGKAN KEDUANYA (URAIAN / ANGKET)                */
        /* ============================================================== */
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 rounded-lg border border-[#D4DDD8] bg-[#F8FAF9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#28362F] dark:bg-[#111915]">
            <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
              Perbandingan langsung tanpa mencampur angka: kolom hijau dari{' '}
              <strong className="text-[#1B6B4F] dark:text-[#58C49B]">
                rekapinJx
              </strong>{' '}
              dan kolom cokelat dari{' '}
              <strong className="text-[#8A511D] dark:text-[#E5B076]">
                Anates V4
              </strong>
              .
            </p>
            <button
              type="button"
              onClick={() => void handleExportWord('both')}
              disabled={isExportingWord}
              className="btn-gesture btn-surface-primary inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap disabled:opacity-60"
            >
              <FileDown className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {isExportingWord
                  ? 'Membuat Word...'
                  : 'Unduh Word Gabungan (rekapinJx + Anates V4)'}
              </span>
            </button>
          </div>

          {exportNotice && (
            <p
              role="status"
              aria-live="polite"
              className="text-xs font-medium text-[#1B6B4F] dark:text-[#58C49B]"
            >
              {exportNotice}
            </p>
          )}

          {/* Side-by-side summary cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-xl border border-[#BFE0D2] bg-[#F5FBF8] p-4 dark:border-[#244A3B] dark:bg-[#11201A]">
              <h3 className="text-sm font-bold text-[#1B6B4F] dark:text-[#58C49B]">
                Ringkasan Versi rekapinJx
              </h3>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-[#52635C] dark:text-[#9AAAA2]">
                    Alpha Cronbach (α)
                  </dt>
                  <dd className="font-mono-tabular text-base font-bold text-[#14211C] dark:text-[#E6EEE9]">
                    {report.reliability.cronbachAlpha?.toFixed(3) ?? '—'} (
                    {report.reliability.category})
                  </dd>
                </div>
                <div>
                  <dt className="text-[#52635C] dark:text-[#9AAAA2]">
                    Validitas (α = 5%)
                  </dt>
                  <dd className="font-mono-tabular text-base font-bold text-[#14211C] dark:text-[#E6EEE9]">
                    {report.summaryCounts.valid} / {report.items.length} Valid
                  </dd>
                </div>
                <div>
                  <dt className="text-[#52635C] dark:text-[#9AAAA2]">
                    Rumus Indeks P
                  </dt>
                  <dd className="font-semibold">
                    (Mean − Min) / (Maks − Min)
                  </dd>
                </div>
                <div>
                  <dt className="text-[#52635C] dark:text-[#9AAAA2]">
                    Keputusan Akhir
                  </dt>
                  <dd className="font-mono-tabular font-semibold">
                    {report.summaryCounts.usable} Dipakai ·{' '}
                    {report.summaryCounts.revise} Revisi ·{' '}
                    {report.summaryCounts.discard} Dibuang
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-[#E5CFB6] bg-[#FDF8F2] p-4 dark:border-[#4A321C] dark:bg-[#1E140B]">
              <h3 className="text-sm font-bold text-[#8A511D] dark:text-[#E5B076]">
                Ringkasan Versi Anates V4
              </h3>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-[#7C532B] dark:text-[#C9A47C]">
                    Konsistensi Tes Keseluruhan
                  </dt>
                  <dd className="font-mono-tabular text-base font-bold text-[#3D220A] dark:text-[#F6E4CE]">
                    {anatesReport.reliability.spearmanBrownR?.toFixed(3) ?? '—'}{' '}
                    ({anatesReport.reliability.category})
                  </dd>
                </div>
                <div>
                  <dt className="text-[#7C532B] dark:text-[#C9A47C]">
                    Kelayakan Butir (5% &amp; 1%)
                  </dt>
                  <dd className="font-mono-tabular text-base font-bold text-[#3D220A] dark:text-[#F6E4CE]">
                    {anatesReport.summaryCounts.significant} /{' '}
                    {anatesReport.items.length} Layak
                  </dd>
                </div>
                <div>
                  <dt className="text-[#7C532B] dark:text-[#C9A47C]">
                    Cara Hitung Kesulitan
                  </dt>
                  <dd className="font-semibold">(Rata-rata / Skor Maks) × 100%</dd>
                </div>
                <div>
                  <dt className="text-[#7C532B] dark:text-[#C9A47C]">
                    Tingkat Kesulitan (5 Kategori)
                  </dt>
                  <dd className="font-mono-tabular font-semibold">
                    {anatesReport.summaryCounts.veryEasy} SM ·{' '}
                    {anatesReport.summaryCounts.easy} M ·{' '}
                    {anatesReport.summaryCounts.medium} Sdg ·{' '}
                    {anatesReport.summaryCounts.hard} Skr ·{' '}
                    {anatesReport.summaryCounts.veryHard} SS
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Per-item comparison table */}
          <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
            <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    className="border-b border-[#D4DDD8] bg-[#F4F7F5] px-3 py-2 text-center font-semibold dark:border-[#28362F] dark:bg-[#121916]"
                  >
                    No
                  </th>
                  <th
                    rowSpan={2}
                    className="border-b border-[#D4DDD8] bg-[#F4F7F5] px-3 py-2 text-right font-semibold dark:border-[#28362F] dark:bg-[#121916]"
                  >
                    Maks
                  </th>
                  <th
                    colSpan={4}
                    className="border-b border-[#BFE0D2] bg-[#EAF4EF] px-3 py-1.5 text-center text-xs font-bold text-[#1B6B4F] dark:border-[#244A3B] dark:bg-[#142A21] dark:text-[#58C49B]"
                  >
                    Versi rekapinJx
                  </th>
                  <th
                    colSpan={4}
                    className="border-b border-[#E5CFB6] bg-[#FDF3E7] px-3 py-1.5 text-center text-xs font-bold text-[#8A511D] dark:border-[#4A321C] dark:bg-[#26190D] dark:text-[#E5B076]"
                  >
                    Versi Anates V4
                  </th>
                </tr>
                <tr className="text-xs font-semibold">
                  <th className="border-b border-[#D4DDD8] bg-[#F5FBF8] px-3 py-2 text-right dark:border-[#28362F] dark:bg-[#11201A]">
                    P
                  </th>
                  <th className="border-b border-[#D4DDD8] bg-[#F5FBF8] px-3 py-2 text-right dark:border-[#28362F] dark:bg-[#11201A]">
                    DP (D)
                  </th>
                  <th className="border-b border-[#D4DDD8] bg-[#F5FBF8] px-3 py-2 text-left dark:border-[#28362F] dark:bg-[#11201A]">
                    Validitas
                  </th>
                  <th className="border-b border-[#D4DDD8] bg-[#F5FBF8] px-3 py-2 text-left dark:border-[#28362F] dark:bg-[#11201A]">
                    Keputusan
                  </th>
                  <th className="border-b border-[#E5CFB6] bg-[#FDF8F2] px-3 py-2 text-right dark:border-[#4A321C] dark:bg-[#1E140B]">
                    TK (%)
                  </th>
                  <th className="border-b border-[#E5CFB6] bg-[#FDF8F2] px-3 py-2 text-right dark:border-[#4A321C] dark:bg-[#1E140B]">
                    DP (%)
                  </th>
                  <th className="border-b border-[#E5CFB6] bg-[#FDF8F2] px-3 py-2 text-left dark:border-[#4A321C] dark:bg-[#1E140B]">
                    Kategori Kesulitan
                  </th>
                  <th className="border-b border-[#E5CFB6] bg-[#FDF8F2] px-3 py-2 text-left dark:border-[#4A321C] dark:bg-[#1E140B]">
                    Status Kelayakan
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((it, idx) => {
                  const an = anatesReport.items[idx];
                  return (
                    <tr
                      key={it.itemNumber}
                      className="bg-white hover:bg-[#F8FAF9] dark:bg-[#161F1B] dark:hover:bg-[#1B2621]"
                    >
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-semibold dark:border-[#24322B]">
                        {it.itemNumber}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {it.maxScore}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {it.difficultyIndex.toFixed(2)}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                        {it.discriminationIndex.toFixed(2)}
                      </td>
                      <td className="border-b border-[#E3EAE6] px-3 py-2 font-medium dark:border-[#24322B]">
                        {it.validityStatus}
                      </td>
                      <td className="border-b border-[#E3EAE6] px-3 py-2 font-bold dark:border-[#24322B]">
                        {it.finalDecision}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                        {an ? `${an.difficultyPercent.toFixed(1)}%` : '—'}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                        {an ? `${an.discriminationPercent.toFixed(1)}%` : '—'}
                      </td>
                      <td className="border-b border-[#EFE3D6] px-3 py-2 dark:border-[#3A2717]">
                        {an?.difficultyCategory ?? '—'}
                      </td>
                      <td className="border-b border-[#EFE3D6] px-3 py-2 font-medium dark:border-[#3A2717]">
                        {an?.significance ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
