import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  GitCompare,
  Save,
} from 'lucide-react';
import type { AnswerLetter, StudentRow } from '../types/sheet';
import {
  exportAllAnalysesExcel,
  exportSingleAnalysisExcel,
  exportSingleAnalysisText,
  type AnalysisSectionId,
} from '../utils/analysisExport';
import {
  computeAnatesV4AbcReport,
  exportAnatesAbcAllExcel,
  exportAnatesAbcSingleExcel,
  exportAnatesAbcSingleText,
  type AnatesAbcSectionId,
  type AnalysisEngineMode,
} from '../utils/anatesV4Analysis';
import {
  computeFullItemAnalysis,
  detectOptionMode,
  type OptionCountMode,
} from '../utils/itemAnalysis';
import { exportAbcWordReport, type WordReportVariant } from '../utils/wordExport';

interface ItemAnalysisSectionProps {
  examTitle: string;
  rows: StudentRow[];
  questionCount: number;
  answerKey: AnswerLetter[];
  onLoadSampleData: () => void;
  onFocusConfig: () => void;
  onExportProjectData: () => void;
}

const ANALYSIS_TABS: Array<{ id: AnalysisSectionId; label: string }> = [
  { id: 'rekap', label: 'Rekap Analisis Butir' },
  { id: 'reliabilitas', label: 'Reliabilitas' },
  { id: 'unggul-asor', label: 'Kel. Unggul & Asor' },
  { id: 'daya-pembeda', label: 'Daya Pembeda' },
  { id: 'tingkat-kesukaran', label: 'Tingkat Kesukaran' },
  { id: 'korelasi', label: 'Korelasi Skor Butir' },
  { id: 'pengecoh', label: 'Kualitas Pengecoh' },
];

const ANATES_TABS: Array<{ id: AnatesAbcSectionId; label: string }> = [
  { id: 'rekap', label: 'Rekap Anates V4' },
  { id: 'reliabilitas', label: 'Reliabilitas (Belah Dua)' },
  { id: 'unggul-asor', label: 'Kel. Unggul & Asor' },
  { id: 'daya-pembeda', label: 'Daya Pembeda (%)' },
  { id: 'tingkat-kesukaran', label: 'Tingkat Kesukaran (%)' },
  { id: 'korelasi', label: 'Korelasi & Signifikansi' },
  { id: 'pengecoh', label: 'Kualitas Pengecoh' },
];

export function ItemAnalysisSection({
  examTitle,
  rows,
  questionCount,
  answerKey,
  onLoadSampleData,
  onFocusConfig,
  onExportProjectData,
}: ItemAnalysisSectionProps) {
  const [engineMode, setEngineMode] = useState<AnalysisEngineMode>('rekapinjx');
  const [activeTab, setActiveTab] = useState<AnalysisSectionId>('rekap');
  const [anatesTab, setAnatesTab] = useState<AnatesAbcSectionId>('rekap');

  const detectedMode = useMemo(
    () => detectOptionMode(rows, questionCount, answerKey),
    [rows, questionCount, answerKey],
  );
  const [optionMode, setOptionMode] = useState<OptionCountMode>(detectedMode);
  const [manualMode, setManualMode] = useState(false);
  const [exportNotice, setExportNotice] = useState('');
  const [isExportingWord, setIsExportingWord] = useState(false);

  useEffect(() => {
    if (!manualMode) {
      setOptionMode(detectedMode);
    }
  }, [detectedMode, manualMode]);

  const report = useMemo(
    () => computeFullItemAnalysis(rows, questionCount, answerKey, optionMode),
    [rows, questionCount, answerKey, optionMode],
  );

  const anatesReport = useMemo(
    () => computeAnatesV4AbcReport(rows, questionCount, answerKey, optionMode),
    [rows, questionCount, answerKey, optionMode],
  );

  const keyedItems = useMemo(
    () => report.items.filter((it) => it.hasKey),
    [report.items],
  );

  const anatesKeyedItems = useMemo(
    () => anatesReport.items.filter((it) => it.hasKey),
    [anatesReport.items],
  );

  const activeTabLabel =
    ANALYSIS_TABS.find((t) => t.id === activeTab)?.label ?? 'Rekap Analisis Butir';
  const activeAnatesTabLabel =
    ANATES_TABS.find((t) => t.id === anatesTab)?.label ?? 'Rekap Anates V4';

  function handleExportCurrentExcel() {
    const filename = exportSingleAnalysisExcel(activeTab, report, examTitle);
    setExportNotice(
      `Excel rekapinJx (${activeTabLabel}) disimpan sebagai "${filename}".`,
    );
  }

  function handleExportCurrentText() {
    const filename = exportSingleAnalysisText(activeTab, report, examTitle);
    setExportNotice(
      `Laporan teks rekapinJx (${activeTabLabel}) disimpan sebagai "${filename}".`,
    );
  }

  function handleExportAllExcel() {
    const filename = exportAllAnalysesExcel(report, examTitle);
    setExportNotice(
      `Buku kerja rekapinJx 7 sheet disimpan sebagai "${filename}".`,
    );
  }

  function handleExportAnatesExcel() {
    const filename = exportAnatesAbcSingleExcel(
      anatesTab,
      anatesReport,
      examTitle,
    );
    setExportNotice(
      `Excel Anates V4 (${activeAnatesTabLabel}) disimpan sebagai "${filename}".`,
    );
  }

  function handleExportAnatesText() {
    const filename = exportAnatesAbcSingleText(
      anatesTab,
      anatesReport,
      examTitle,
    );
    setExportNotice(
      `Laporan teks Anates V4 (${activeAnatesTabLabel}) disimpan sebagai "${filename}".`,
    );
  }

  function handleExportAnatesAllExcel() {
    const filename = exportAnatesAbcAllExcel(anatesReport, examTitle);
    setExportNotice(
      `Buku kerja lengkap 7 sheet Anates V4 disimpan sebagai "${filename}".`,
    );
  }

  async function handleExportWord(variant: WordReportVariant) {
    if (isExportingWord) return;
    setIsExportingWord(true);
    try {
      const filename = await exportAbcWordReport({
        examTitle,
        rows,
        questionCount,
        answerKey,
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

  return (
    <section
      id="analisis-butir"
      aria-labelledby="heading-analisis"
      className="flex flex-col gap-5 rounded-xl border border-[#D4DDD8] bg-white p-5 sm:p-6 dark:border-[#28362F] dark:bg-[#161F1B]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1B6B4F] text-sm font-bold text-white dark:bg-[#4AC294] dark:text-[#0B1712]">
            5
          </span>
          <div>
            <h2
              id="heading-analisis"
              className="text-base font-bold text-[#14211C] dark:text-[#E6EEE9]"
            >
              Olah data &amp; analisis butir soal
            </h2>
            <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
              Pilih sumber hasil secara terpisah: standar{' '}
              <strong>rekapinJx</strong>, standar <strong>Anates V4</strong>,
              atau perbandingan keduanya.
            </p>
          </div>
        </div>

        <div
          role="group"
          aria-label="Jumlah opsi pilihan jawaban"
          className="flex w-fit items-center gap-1 rounded-lg bg-[#EFF3F1] p-1 dark:bg-[#111915]"
        >
          <button
            type="button"
            onClick={() => {
              setManualMode(true);
              setOptionMode(4);
            }}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              optionMode === 4
                ? 'bg-white text-[#14211C] shadow-xs dark:bg-[#1D2923] dark:text-[#E6EEE9]'
                : 'text-[#52635C] hover:text-[#14211C] dark:text-[#9AAAA2] dark:hover:text-[#E6EEE9]'
            }`}
          >
            4 Pilihan (A–D)
          </button>
          <button
            type="button"
            onClick={() => {
              setManualMode(true);
              setOptionMode(5);
            }}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              optionMode === 5
                ? 'bg-white text-[#14211C] shadow-xs dark:bg-[#1D2923] dark:text-[#E6EEE9]'
                : 'text-[#52635C] hover:text-[#14211C] dark:text-[#9AAAA2] dark:hover:text-[#E6EEE9]'
            }`}
          >
            5 Pilihan (A–E)
          </button>
        </div>
      </div>

      {/* Engine Switcher: Separate rekapinJx vs Anates V4 vs Compare */}
      <div className="flex flex-col gap-2 rounded-xl border border-[#D4DDD8] bg-[#F7FAF8] p-2 sm:flex-row sm:items-center sm:justify-between dark:border-[#28362F] dark:bg-[#111915]">
        <div
          role="tablist"
          aria-label="Pilih metode olah data"
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
            Hasil rekapinJx (KR-20)
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
            Hasil Anates V4 (Belah Dua)
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
            ? 'Aktif: Standar Psikometri rekapinJx'
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
            <span>Analisis butir soal siap menghitung otomatis</span>
          </div>
          <p className="max-w-2xl text-sm text-[#52635C] dark:text-[#9AAAA2]">
            {report.reasonIfInsufficient}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onFocusConfig}
              className="btn-gesture btn-surface-secondary min-h-[40px] cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold"
            >
              Atur Kunci Jawaban di Langkah 1
            </button>
            <button
              type="button"
              onClick={onLoadSampleData}
              className="btn-gesture btn-surface-primary min-h-[40px] cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold"
            >
              Muat Contoh Data (12 Siswa, 40 Soal)
            </button>
          </div>
        </div>
      ) : engineMode === 'rekapinjx' ? (
        /* ============================================================== */
        /* ENGINE 1: HASIL REKAPINJX                                      */
        /* ============================================================== */
        <div className="flex flex-col gap-5">
          {/* Top summary metrics strip */}
          <div className="grid grid-cols-2 divide-y divide-[#E3EAE6] rounded-lg border border-[#D4DDD8] bg-[#FAFBFB] sm:grid-cols-4 sm:divide-x sm:divide-y-0 dark:divide-[#24322B] dark:border-[#28362F] dark:bg-[#111915]">
            <div className="flex flex-col gap-1 p-4">
              <span className="text-xs font-medium text-[#52635C] dark:text-[#9AAAA2]">
                Reliabilitas Tes (KR-20)
              </span>
              <span className="font-mono-tabular text-xl font-bold text-[#14211C] dark:text-[#E6EEE9]">
                {report.reliability.kr20 !== null
                  ? report.reliability.kr20.toFixed(3)
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
                {report.groupSize} &amp; {report.groupSize} siswa
              </span>
              <span className="font-mono-tabular text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Total peserta: {report.reliability.studentCount} siswa
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
                {report.summaryCounts.valid} / {keyedItems.length} valid
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

          {/* 7 Individual Analysis Tabs */}
          <div
            role="tablist"
            aria-label="Menu olah data analisis butir rekapinJx"
            className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#EFF3F1] p-1.5 dark:bg-[#111915]"
          >
            {ANALYSIS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setExportNotice('');
                }}
                className={`btn-gesture cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap sm:text-sm ${
                  activeTab === tab.id
                    ? 'btn-surface-primary'
                    : 'text-[#52635C] hover:bg-white/70 hover:text-[#14211C] dark:text-[#9AAAA2] dark:hover:bg-[#1D2923] dark:hover:text-[#E6EEE9]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Per-analysis & full-workbook export toolbar */}
          <div className="flex flex-col gap-2.5 rounded-lg border border-[#D4DDD8] bg-[#F8FAF9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#28362F] dark:bg-[#111915]">
            <div className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
              <span className="font-semibold text-[#1B6B4F] dark:text-[#58C49B]">
                Versi rekapinJx · {activeTabLabel}
              </span>{' '}
              — simpan tampilan ini atau ekspor seluruh 7 analisis.
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
                  setExportNotice('File data tes (.json) berhasil disimpan.');
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
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
                <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                        No
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                        Kunci
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                        Korelasi (r)
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                        Validitas
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                        Kesukaran (P)
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                        Tingkat Kesukaran
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                        Daya Pembeda (D)
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                        Kategori DP
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                        Kualitas Pengecoh
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                        Kualitas Akhir
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyedItems.map((item) => (
                      <tr
                        key={item.questionNumber}
                        className="bg-white hover:bg-[#F8FAF9] dark:bg-[#161F1B] dark:hover:bg-[#1B2621]"
                      >
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-semibold dark:border-[#24322B]">
                          {item.questionNumber}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-bold text-[#1B6B4F] dark:border-[#24322B] dark:text-[#58C49B]">
                          {item.key}
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
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-xs dark:border-[#24322B]">
                          {item.distractorSummary}
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
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Kriteria keputusan rekapinJx: <strong>Dipakai</strong> (valid &amp;
                daya pembeda ≥ 0,20), <strong>Revisi</strong> (perlu perbaikan
                pengecoh/kesukaran), <strong>Dibuang</strong> (tidak valid &amp;
                daya pembeda &lt; 0,20 atau negatif).
              </p>
            </div>
          )}

          {/* Tab 2: Reliabilitas (KR-20) */}
          {activeTab === 'reliabilitas' && (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                      <th className="border-b border-[#D4DDD8] px-4 py-2.5 text-left dark:border-[#28362F]">
                        Parameter Pengujian Reliabilitas (KR-20)
                      </th>
                      <th className="border-b border-[#D4DDD8] px-4 py-2.5 text-right dark:border-[#28362F]">
                        Hasil Perhitungan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3EAE6] dark:divide-[#24322B]">
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Jumlah Peserta Tes (N)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {report.reliability.studentCount} siswa
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Jumlah Butir Berkunci (k)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {report.reliability.keyedItemCount} soal
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Rata-rata Skor Benar (Mean)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {report.reliability.meanScore.toFixed(2)}
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
                        Jumlah Varians Butir (Σ pq)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {report.reliability.sumPQ.toFixed(3)}
                      </td>
                    </tr>
                    <tr className="bg-[#EDF5F1] dark:bg-[#193026]">
                      <td className="px-4 py-3 font-bold text-[#144332] dark:text-[#A6E8CE]">
                        Koefisien Reliabilitas Tes (KR-20 / r₁₁)
                      </td>
                      <td className="font-mono-tabular px-4 py-3 text-right text-base font-bold text-[#144332] dark:text-[#A6E8CE]">
                        {report.reliability.kr20 !== null
                          ? report.reliability.kr20.toFixed(3)
                          : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Interpretasi Konsistensi Tes
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#1B6B4F] dark:text-[#58C49B]">
                        {report.reliability.category}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Nilai r Tabel Pembanding (α = 5%)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {report.reliability.rTable !== null
                          ? report.reliability.rTable.toFixed(3)
                          : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Rumus KR-20 = (k / (k − 1)) × ((S²t − Σ pq) / S²t). Tes
                dinyatakan reliabel (konsisten) apabila koefisien r₁₁ ≥ 0,60.
              </p>
            </div>
          )}

          {/* Tab 3: Kelompok Unggul dan Asor (27%) */}
          {activeTab === 'unggul-asor' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#52635C] dark:text-[#9AAAA2]">
                <span>
                  Peringkat seluruh peserta diurutkan dari skor tertinggi ke
                  terendah (27% teratas = Kelompok Unggul, 27% terbawah =
                  Kelompok Asor).
                </span>
                <span className="font-mono-tabular font-semibold text-[#14211C] dark:text-[#E6EEE9]">
                  n = {report.groupSize} siswa per kelompok
                </span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
                <table className="w-full border-separate border-spacing-0 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                        Peringkat
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                        Nama Siswa
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                        Kelas
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                        Skor Benar
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                        Nilai (%)
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                        Kelompok (27%)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rankedStudents.map((st) => (
                      <tr
                        key={st.id}
                        className="bg-white hover:bg-[#F8FAF9] dark:bg-[#161F1B] dark:hover:bg-[#1B2621]"
                      >
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-semibold dark:border-[#24322B]">
                          {st.rank}
                        </td>
                        <td className="border-b border-[#E3EAE6] px-3 py-2 font-medium dark:border-[#24322B]">
                          {st.nama}
                        </td>
                        <td className="border-b border-[#E3EAE6] px-3 py-2 text-center text-[#52635C] dark:border-[#24322B] dark:text-[#9AAAA2]">
                          {st.kelas}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right font-semibold dark:border-[#24322B]">
                          {st.score}/{st.maxScore}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                          {st.scorePercent}
                        </td>
                        <td
                          className={`border-b border-[#E3EAE6] px-3 py-2 font-semibold dark:border-[#24322B] ${
                            st.group === 'Unggul'
                              ? 'bg-[#ECF8F2] text-[#14533C] dark:bg-[#193529] dark:text-[#75DFB5]'
                              : st.group === 'Asor'
                                ? 'bg-[#FEE4E2] text-[#912018] dark:bg-[#4A1C1A] dark:text-[#FECACA]'
                                : 'text-[#52635C] dark:text-[#9AAAA2]'
                          }`}
                        >
                          {st.group === 'Unggul'
                            ? 'Kelompok Unggul (27% Atas)'
                            : st.group === 'Asor'
                              ? 'Kelompok Asor (27% Bawah)'
                              : 'Kelompok Tengah'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Daya Pembeda */}
          {activeTab === 'daya-pembeda' && (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
                <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                        No Butir
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                        Kunci
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                        Benar Unggul (n={report.groupSize})
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                        Benar Asor (n={report.groupSize})
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                        Beda (U − A)
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                        Indeks DP (D)
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                        DP (%)
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                        Tafsiran
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyedItems.map((item) => (
                      <tr
                        key={item.questionNumber}
                        className="bg-white hover:bg-[#F8FAF9] dark:bg-[#161F1B] dark:hover:bg-[#1B2621]"
                      >
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-semibold dark:border-[#24322B]">
                          {item.questionNumber}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-bold text-[#1B6B4F] dark:border-[#24322B] dark:text-[#58C49B]">
                          {item.key}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                          {item.upperCorrect}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                          {item.lowerCorrect}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                          {item.upperCorrect - item.lowerCorrect}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right font-semibold dark:border-[#24322B]">
                          {item.discriminationIndex.toFixed(3)}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                          {(item.discriminationIndex * 100).toFixed(1)}%
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
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Daya Pembeda D = (B_Unggul / n) − (B_Asor / n). Kriteria: ≥ 0,70
                Baik Sekali · 0,40–0,69 Baik · 0,20–0,39 Cukup · 0,00–0,19 Jelek
                · &lt; 0,00 Negatif.
              </p>
            </div>
          )}

          {/* Tab 5: Tingkat Kesukaran */}
          {activeTab === 'tingkat-kesukaran' && (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
                <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                        No Butir
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                        Kunci
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                        Jumlah Benar (N={report.reliability.studentCount})
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                        Indeks Kesukaran (P)
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                        Persentase Benar (%)
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                        Tafsiran
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyedItems.map((item) => (
                      <tr
                        key={item.questionNumber}
                        className="bg-white hover:bg-[#F8FAF9] dark:bg-[#161F1B] dark:hover:bg-[#1B2621]"
                      >
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-semibold dark:border-[#24322B]">
                          {item.questionNumber}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-bold text-[#1B6B4F] dark:border-[#24322B] dark:text-[#58C49B]">
                          {item.key}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                          {item.correctCount} / {report.reliability.studentCount}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right font-semibold dark:border-[#24322B]">
                          {item.difficultyIndex.toFixed(3)}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-right dark:border-[#24322B]">
                          {(item.difficultyIndex * 100).toFixed(1)}%
                        </td>
                        <td
                          className={`border-b border-[#E3EAE6] px-3 py-2 font-semibold dark:border-[#24322B] ${
                            item.difficultyCategory === 'Sedang'
                              ? 'text-[#1B6B4F] dark:text-[#58C49B]'
                              : item.difficultyCategory === 'Mudah'
                                ? 'text-[#7A5A06] dark:text-[#F0CF7B]'
                                : 'text-[#B42318] dark:text-[#FDA29B]'
                          }`}
                        >
                          {item.difficultyCategory}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Indeks Kesukaran P = Jumlah Siswa Benar / Jumlah Peserta.
                Tafsiran: Mudah (P &gt; 0,70) · Sedang (0,30 ≤ P ≤ 0,70) · Sukar
                (P &lt; 0,30). Ringkasan: {report.summaryCounts.easy} mudah,{' '}
                {report.summaryCounts.medium} sedang,{' '}
                {report.summaryCounts.hard} sukar.
              </p>
            </div>
          )}

          {/* Tab 6: Korelasi Skor Butir dengan Skor Total */}
          {activeTab === 'korelasi' && (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
                <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                        No Butir
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                        Kunci
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
                    {keyedItems.map((item) => (
                      <tr
                        key={item.questionNumber}
                        className="bg-white hover:bg-[#F8FAF9] dark:bg-[#161F1B] dark:hover:bg-[#1B2621]"
                      >
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-semibold dark:border-[#24322B]">
                          {item.questionNumber}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-bold text-[#1B6B4F] dark:border-[#24322B] dark:text-[#58C49B]">
                          {item.key}
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
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Validitas butir dihitung menggunakan korelasi Pearson product
                moment antara skor butir (0/1) dan skor total siswa. Butir
                dinyatakan <strong>Valid</strong> bila r hitung ≥ r tabel (α =
                0,05).
              </p>
            </div>
          )}

          {/* Tab 7: Kualitas Pengecoh */}
          {activeTab === 'pengecoh' && (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
                <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                        No
                      </th>
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                        Kunci
                      </th>
                      {(optionMode === 5
                        ? ['A', 'B', 'C', 'D', 'E']
                        : ['A', 'B', 'C', 'D']
                      ).map((opt) => (
                        <th
                          key={opt}
                          className="min-w-[120px] border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]"
                        >
                          Pilihan {opt}
                        </th>
                      ))}
                      <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                        Ringkasan Pengecoh
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyedItems.map((item) => (
                      <tr
                        key={item.questionNumber}
                        className="bg-white hover:bg-[#F8FAF9] dark:bg-[#161F1B] dark:hover:bg-[#1B2621]"
                      >
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-semibold dark:border-[#24322B]">
                          {item.questionNumber}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-bold text-[#1B6B4F] dark:border-[#24322B] dark:text-[#58C49B]">
                          {item.key}
                        </td>
                        {item.distractors.map((d) => (
                          <td
                            key={d.option}
                            className={`border-b border-[#E3EAE6] px-2.5 py-2 text-center dark:border-[#24322B] ${
                              d.isKey
                                ? 'bg-[#ECF8F2] dark:bg-[#193529]'
                                : d.status === 'Tidak Dipilih'
                                  ? 'bg-[#FEE4E2] dark:bg-[#4A1C1A]'
                                  : d.status === 'Kurang Efektif'
                                    ? 'bg-[#FEF6DC] dark:bg-[#3A2F14]'
                                    : ''
                            }`}
                          >
                            <div className="font-mono-tabular flex flex-col items-center gap-0.5 text-xs">
                              <span className="font-semibold text-[#14211C] dark:text-[#E6EEE9]">
                                {d.count} ({d.percent}%)
                              </span>
                              <span className="text-[11px] text-[#52635C] dark:text-[#9AAAA2]">
                                U:{d.upperCount} · A:{d.lowerCount}
                              </span>
                              <span
                                className={`text-[11px] font-semibold ${
                                  d.isKey
                                    ? 'text-[#14533C] dark:text-[#75DFB5]'
                                    : d.status === 'Berfungsi'
                                      ? 'text-[#1B6B4F] dark:text-[#58C49B]'
                                      : d.status === 'Kurang Efektif'
                                        ? 'text-[#7A5A06] dark:text-[#F0CF7B]'
                                        : 'text-[#912018] dark:text-[#FECACA]'
                                }`}
                              >
                                {d.status}
                              </span>
                            </div>
                          </td>
                        ))}
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 font-semibold dark:border-[#24322B]">
                          {item.distractorSummary}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Pengecoh (pilihan salah) dinilai <strong>Berfungsi</strong> jika
                dipilih minimal 5% dari seluruh peserta tes (U = pemilih di
                Kelompok Unggul, A = pemilih di Kelompok Asor).
              </p>
            </div>
          )}
        </div>
      ) : engineMode === 'anatesv4' ? (
        /* ============================================================== */
        /* ENGINE 2: HASIL ANATES V4 (TERPISAH)                           */
        /* ============================================================== */
        <div className="flex flex-col gap-5">
          {/* Anates V4 Notice Banner */}
          <div className="rounded-lg border border-[#E5CFB6] bg-[#FDF8F2] px-4 py-3 text-xs text-[#6B3F15] dark:border-[#4A321C] dark:bg-[#23170D] dark:text-[#EED0AE]">
            <strong>Standar Asli Anates V4:</strong> Reliabilitas dihitung dengan{' '}
            <em>Belah Dua Ganjil–Genap (Spearman-Brown r₁₁)</em>, Tingkat
            Kesukaran 5 kategori (%), Daya Pembeda (%), uji signifikansi{' '}
            <strong>5% &amp; 1%</strong>, dan kualitas pengecoh dengan kode{' '}
            <span className="font-mono-tabular font-bold">
              ***, ++, +, -, --, ---
            </span>
            .
          </div>

          {/* Anates V4 KPI Strip */}
          <div className="grid grid-cols-2 divide-y divide-[#EADFD3] rounded-lg border border-[#E5CFB6] bg-[#FDF8F2] sm:grid-cols-4 sm:divide-x sm:divide-y-0 dark:divide-[#3E2A17] dark:border-[#4A321C] dark:bg-[#1E140B]">
            <div className="flex flex-col gap-1 p-4">
              <span className="text-xs font-medium text-[#7C532B] dark:text-[#C9A47C]">
                Reliabilitas Belah Dua (r₁₁)
              </span>
              <span className="font-mono-tabular text-xl font-bold text-[#3D220A] dark:text-[#F6E4CE]">
                {anatesReport.reliability.spearmanBrownR !== null
                  ? anatesReport.reliability.spearmanBrownR.toFixed(3)
                  : '—'}
              </span>
              <span className="text-xs font-semibold text-[#8A511D] dark:text-[#E5B076]">
                {anatesReport.reliability.category} (XY:{' '}
                {anatesReport.reliability.splitHalfR !== null
                  ? anatesReport.reliability.splitHalfR.toFixed(3)
                  : '—'}
                )
              </span>
            </div>

            <div className="flex flex-col gap-1 p-4">
              <span className="text-xs font-medium text-[#7C532B] dark:text-[#C9A47C]">
                Kel. Unggul &amp; Asor (27%)
              </span>
              <span className="font-mono-tabular text-xl font-bold text-[#3D220A] dark:text-[#F6E4CE]">
                {anatesReport.groupSize} &amp; {anatesReport.groupSize} siswa
              </span>
              <span className="font-mono-tabular text-xs text-[#7C532B] dark:text-[#C9A47C]">
                N = {anatesReport.reliability.studentCount} · k ={' '}
                {anatesReport.reliability.itemCount} soal
              </span>
            </div>

            <div className="flex flex-col gap-1 p-4">
              <span className="text-xs font-medium text-[#7C532B] dark:text-[#C9A47C]">
                Signifikansi (r₅%:{' '}
                {anatesReport.reliability.rTable5?.toFixed(3) ?? '—'} · r₁%:{' '}
                {anatesReport.reliability.rTable1?.toFixed(3) ?? '—'})
              </span>
              <span className="font-mono-tabular text-xl font-bold text-[#3D220A] dark:text-[#F6E4CE]">
                {anatesReport.summaryCounts.significant} /{' '}
                {anatesKeyedItems.length} signif.
              </span>
              <span className="font-mono-tabular text-xs text-[#7C532B] dark:text-[#C9A47C]">
                {anatesReport.summaryCounts.notSignificant} tidak signifikan
              </span>
            </div>

            <div className="flex flex-col gap-1 p-4">
              <span className="text-xs font-medium text-[#7C532B] dark:text-[#C9A47C]">
                Rata-rata &amp; Simpangan Baku
              </span>
              <span className="font-mono-tabular text-xl font-bold text-[#3D220A] dark:text-[#F6E4CE]">
                {anatesReport.reliability.meanScore.toFixed(2)}
              </span>
              <span className="font-mono-tabular text-xs text-[#7C532B] dark:text-[#C9A47C]">
                SD = {anatesReport.reliability.stdDev.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 7 Anates Tabs */}
          <div
            role="tablist"
            aria-label="Menu hasil Anates V4"
            className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#F5EFE8] p-1.5 dark:bg-[#1B130B]"
          >
            {ANATES_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={anatesTab === tab.id}
                onClick={() => {
                  setAnatesTab(tab.id);
                  setExportNotice('');
                }}
                className={`btn-gesture cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap sm:text-sm ${
                  anatesTab === tab.id
                    ? 'bg-[#8A511D] text-white shadow-xs dark:bg-[#E5B076] dark:text-[#231407]'
                    : 'text-[#6B4A2B] hover:bg-white/80 hover:text-[#3D220A] dark:text-[#C9A47C] dark:hover:bg-[#2A1D12] dark:hover:text-[#F6E4CE]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Anates V4 Export Toolbar */}
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
            <div className="overflow-x-auto rounded-lg border border-[#E5CFB6] dark:border-[#4A321C]">
              <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F9F2EA] text-xs font-semibold text-[#6B4A2B] dark:bg-[#23170D] dark:text-[#D8B68F]">
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                      No Butir
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                      Kunci
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      DP (%)
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      TK (%)
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-left dark:border-[#4A321C]">
                      Tafsiran TK (Anates V4)
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      Korelasi (r)
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-left dark:border-[#4A321C]">
                      Signifikansi
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-left dark:border-[#4A321C]">
                      Kode Pengecoh
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {anatesKeyedItems.map((it) => (
                    <tr
                      key={it.questionNumber}
                      className="bg-white hover:bg-[#FDF8F2] dark:bg-[#161F1B] dark:hover:bg-[#23170D]"
                    >
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-semibold dark:border-[#3A2717]">
                        {it.questionNumber}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-bold text-[#8A511D] dark:border-[#3A2717] dark:text-[#E5B076]">
                        {it.key}
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
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-xs dark:border-[#3A2717]">
                        {it.distractorSummary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Anates Tab 2: Reliabilitas Belah Dua */}
          {anatesTab === 'reliabilitas' && (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-lg border border-[#E5CFB6] dark:border-[#4A321C]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F9F2EA] text-xs font-semibold text-[#6B4A2B] dark:bg-[#23170D] dark:text-[#D8B68F]">
                      <th className="border-b border-[#E5CFB6] px-4 py-2.5 text-left dark:border-[#4A321C]">
                        Parameter Pengujian Reliabilitas (Anates V4)
                      </th>
                      <th className="border-b border-[#E5CFB6] px-4 py-2.5 text-right dark:border-[#4A321C]">
                        Hasil Perhitungan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE3D6] dark:divide-[#3A2717]">
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Jumlah Subjek (N)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {anatesReport.reliability.studentCount} siswa
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Jumlah Butir Berkunci (k)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {anatesReport.reliability.itemCount} soal
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Rata-rata Skor
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {anatesReport.reliability.meanScore.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Simpangan Baku (SD)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {anatesReport.reliability.stdDev.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Korelasi XY (Belah Dua Ganjil–Genap)
                      </td>
                      <td className="font-mono-tabular px-4 py-2.5 text-right font-semibold">
                        {anatesReport.reliability.splitHalfR !== null
                          ? anatesReport.reliability.splitHalfR.toFixed(3)
                          : '—'}
                      </td>
                    </tr>
                    <tr className="bg-[#FDF3E7] dark:bg-[#2E1E10]">
                      <td className="px-4 py-3 font-bold text-[#8A511D] dark:text-[#F6E4CE]">
                        Reliabilitas Tes (Spearman-Brown r₁₁)
                      </td>
                      <td className="font-mono-tabular px-4 py-3 text-right text-base font-bold text-[#8A511D] dark:text-[#F6E4CE]">
                        {anatesReport.reliability.spearmanBrownR !== null
                          ? anatesReport.reliability.spearmanBrownR.toFixed(3)
                          : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        Interpretasi Reliabilitas
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#8A511D] dark:text-[#E5B076]">
                        {anatesReport.reliability.category}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52635C] dark:text-[#9AAAA2]">
                        r Tabel (α = 5% / α = 1%)
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
                Rumus Anates V4: r₁₁ = (2 × r_XY) / (1 + r_XY), dengan X =
                jumlah skor butir bernomor ganjil dan Y = jumlah skor butir
                bernomor genap.
              </p>
            </div>
          )}

          {/* Anates Tab 3: Unggul Asor */}
          {anatesTab === 'unggul-asor' && (
            <div className="overflow-x-auto rounded-lg border border-[#E5CFB6] dark:border-[#4A321C]">
              <table className="w-full border-separate border-spacing-0 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F9F2EA] text-xs font-semibold text-[#6B4A2B] dark:bg-[#23170D] dark:text-[#D8B68F]">
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                      Peringkat
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-left dark:border-[#4A321C]">
                      Nama Siswa
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                      Kelas
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      Skor
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      Nilai (%)
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-left dark:border-[#4A321C]">
                      Kelompok (27%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {anatesReport.rankedStudents.map((st) => (
                    <tr
                      key={st.id}
                      className="bg-white hover:bg-[#FDF8F2] dark:bg-[#161F1B] dark:hover:bg-[#23170D]"
                    >
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-semibold dark:border-[#3A2717]">
                        {st.rank}
                      </td>
                      <td className="border-b border-[#EFE3D6] px-3 py-2 font-medium dark:border-[#3A2717]">
                        {st.nama}
                      </td>
                      <td className="border-b border-[#EFE3D6] px-3 py-2 text-center text-[#52635C] dark:border-[#3A2717] dark:text-[#9AAAA2]">
                        {st.kelas}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right font-semibold dark:border-[#3A2717]">
                        {st.score}/{st.maxScore}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                        {st.scorePercent}%
                      </td>
                      <td
                        className={`border-b border-[#EFE3D6] px-3 py-2 font-semibold dark:border-[#3A2717] ${
                          st.group === 'Unggul'
                            ? 'bg-[#ECF8F2] text-[#14533C] dark:bg-[#193529] dark:text-[#75DFB5]'
                            : st.group === 'Asor'
                              ? 'bg-[#FEE4E2] text-[#912018] dark:bg-[#4A1C1A] dark:text-[#FECACA]'
                              : 'text-[#52635C] dark:text-[#9AAAA2]'
                        }`}
                      >
                        {st.group === 'Unggul'
                          ? 'Kelompok Unggul'
                          : st.group === 'Asor'
                            ? 'Kelompok Asor'
                            : 'Tengah'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Anates Tab 4: Daya Pembeda (%) */}
          {anatesTab === 'daya-pembeda' && (
            <div className="overflow-x-auto rounded-lg border border-[#E5CFB6] dark:border-[#4A321C]">
              <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F9F2EA] text-xs font-semibold text-[#6B4A2B] dark:bg-[#23170D] dark:text-[#D8B68F]">
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                      No Butir
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                      Kunci
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      Unggul (n={anatesReport.groupSize})
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      Asor (n={anatesReport.groupSize})
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      Beda (U − A)
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      DP (%)
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-left dark:border-[#4A321C]">
                      Tafsiran
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {anatesKeyedItems.map((it) => (
                    <tr
                      key={it.questionNumber}
                      className="bg-white hover:bg-[#FDF8F2] dark:bg-[#161F1B] dark:hover:bg-[#23170D]"
                    >
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-semibold dark:border-[#3A2717]">
                        {it.questionNumber}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-bold text-[#8A511D] dark:border-[#3A2717] dark:text-[#E5B076]">
                        {it.key}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                        {it.upperCorrect}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                        {it.lowerCorrect}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                        {it.upperCorrect - it.lowerCorrect}
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

          {/* Anates Tab 5: Tingkat Kesukaran (%) 5 Kategori */}
          {anatesTab === 'tingkat-kesukaran' && (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto rounded-lg border border-[#E5CFB6] dark:border-[#4A321C]">
                <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#F9F2EA] text-xs font-semibold text-[#6B4A2B] dark:bg-[#23170D] dark:text-[#D8B68F]">
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                        No Butir
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                        Kunci
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                        Jml Benar (N={anatesReport.reliability.studentCount})
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                        TK (%)
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-left dark:border-[#4A321C]">
                        Tafsiran 5 Kategori (Anates V4)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {anatesKeyedItems.map((it) => (
                      <tr
                        key={it.questionNumber}
                        className="bg-white hover:bg-[#FDF8F2] dark:bg-[#161F1B] dark:hover:bg-[#23170D]"
                      >
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-semibold dark:border-[#3A2717]">
                          {it.questionNumber}
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-bold text-[#8A511D] dark:border-[#3A2717] dark:text-[#E5B076]">
                          {it.key}
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right dark:border-[#3A2717]">
                          {it.correctCount}
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
                Rentang Anates V4: ≤15% Sangat Sukar · 16–30% Sukar · 31–70%
                Sedang · 71–85% Mudah · &gt;85% Sangat Mudah.
              </p>
            </div>
          )}

          {/* Anates Tab 6: Korelasi & Signifikansi */}
          {anatesTab === 'korelasi' && (
            <div className="overflow-x-auto rounded-lg border border-[#E5CFB6] dark:border-[#4A321C]">
              <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F9F2EA] text-xs font-semibold text-[#6B4A2B] dark:bg-[#23170D] dark:text-[#D8B68F]">
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                      No Butir
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                      Kunci
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      Korelasi (r)
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      r Tabel 5%
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                      r Tabel 1%
                    </th>
                    <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-left dark:border-[#4A321C]">
                      Signifikansi (Anates V4)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {anatesKeyedItems.map((it) => (
                    <tr
                      key={it.questionNumber}
                      className="bg-white hover:bg-[#FDF8F2] dark:bg-[#161F1B] dark:hover:bg-[#23170D]"
                    >
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-semibold dark:border-[#3A2717]">
                        {it.questionNumber}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-bold text-[#8A511D] dark:border-[#3A2717] dark:text-[#E5B076]">
                        {it.key}
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
          )}

          {/* Anates Tab 7: Kualitas Pengecoh Kode Anates V4 */}
          {anatesTab === 'pengecoh' && (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto rounded-lg border border-[#E5CFB6] dark:border-[#4A321C]">
                <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#F9F2EA] text-xs font-semibold text-[#6B4A2B] dark:bg-[#23170D] dark:text-[#D8B68F]">
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                        No
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]">
                        Kunci
                      </th>
                      <th className="border-b border-[#E5CFB6] px-3 py-2.5 text-right dark:border-[#4A321C]">
                        Ideal
                      </th>
                      {(optionMode === 5
                        ? ['A', 'B', 'C', 'D', 'E']
                        : ['A', 'B', 'C', 'D']
                      ).map((opt) => (
                        <th
                          key={opt}
                          className="min-w-[110px] border-b border-[#E5CFB6] px-3 py-2.5 text-center dark:border-[#4A321C]"
                        >
                          Opsi {opt}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {anatesKeyedItems.map((it) => (
                      <tr
                        key={it.questionNumber}
                        className="bg-white hover:bg-[#FDF8F2] dark:bg-[#161F1B] dark:hover:bg-[#23170D]"
                      >
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-semibold dark:border-[#3A2717]">
                          {it.questionNumber}
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-center font-bold text-[#8A511D] dark:border-[#3A2717] dark:text-[#E5B076]">
                          {it.key}
                        </td>
                        <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-right text-[#52635C] dark:border-[#3A2717] dark:text-[#9AAAA2]">
                          {it.distractors[0]?.idealCount ?? 0}
                        </td>
                        {it.distractors.map((d) => (
                          <td
                            key={d.option}
                            className={`border-b border-[#EFE3D6] px-2.5 py-2 text-center dark:border-[#3A2717] ${
                              d.isKey
                                ? 'bg-[#FDF3E7] dark:bg-[#2E1E10]'
                                : d.code === '---' || d.code === '--'
                                  ? 'bg-[#FEE4E2] dark:bg-[#4A1C1A]'
                                  : ''
                            }`}
                          >
                            <div className="font-mono-tabular flex flex-col items-center gap-0.5 text-xs">
                              <span className="font-bold text-[#14211C] dark:text-[#E6EEE9]">
                                {d.count} ({d.code})
                              </span>
                              <span className="text-[11px] text-[#52635C] dark:text-[#9AAAA2]">
                                {d.label}
                              </span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Kode Anates V4 berbasis nilai ideal = (N − Benar) / (Opsi − 1):{' '}
                <strong>***</strong> Kunci · <strong>++</strong> Sangat Baik ·{' '}
                <strong>+</strong> Baik · <strong>-</strong> Kurang Baik ·{' '}
                <strong>--</strong> Buruk · <strong>---</strong> Sangat Buruk (0
                pemilih).
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* ENGINE 3: BANDINGKAN KEDUANYA (TERPISAH BERDAMPINGAN)          */
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
                    Reliabilitas (KR-20)
                  </dt>
                  <dd className="font-mono-tabular text-base font-bold text-[#14211C] dark:text-[#E6EEE9]">
                    {report.reliability.kr20?.toFixed(3) ?? '—'} (
                    {report.reliability.category})
                  </dd>
                </div>
                <div>
                  <dt className="text-[#52635C] dark:text-[#9AAAA2]">
                    Validitas (α = 5%)
                  </dt>
                  <dd className="font-mono-tabular text-base font-bold text-[#14211C] dark:text-[#E6EEE9]">
                    {report.summaryCounts.valid} / {keyedItems.length} Valid
                  </dd>
                </div>
                <div>
                  <dt className="text-[#52635C] dark:text-[#9AAAA2]">
                    Kesukaran (3 Tingkat)
                  </dt>
                  <dd className="font-mono-tabular font-semibold">
                    {report.summaryCounts.easy} Mudah ·{' '}
                    {report.summaryCounts.medium} Sedang ·{' '}
                    {report.summaryCounts.hard} Sukar
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
                    Belah Dua (Spearman-Brown r₁₁)
                  </dt>
                  <dd className="font-mono-tabular text-base font-bold text-[#3D220A] dark:text-[#F6E4CE]">
                    {anatesReport.reliability.spearmanBrownR?.toFixed(3) ?? '—'}{' '}
                    ({anatesReport.reliability.category})
                  </dd>
                </div>
                <div>
                  <dt className="text-[#7C532B] dark:text-[#C9A47C]">
                    Signifikansi (5% &amp; 1%)
                  </dt>
                  <dd className="font-mono-tabular text-base font-bold text-[#3D220A] dark:text-[#F6E4CE]">
                    {anatesReport.summaryCounts.significant} /{' '}
                    {anatesKeyedItems.length} Signifikan
                  </dd>
                </div>
                <div>
                  <dt className="text-[#7C532B] dark:text-[#C9A47C]">
                    Kesukaran (5 Tingkat)
                  </dt>
                  <dd className="font-mono-tabular font-semibold">
                    {anatesReport.summaryCounts.veryEasy} SM ·{' '}
                    {anatesReport.summaryCounts.easy} M ·{' '}
                    {anatesReport.summaryCounts.medium} Sdg ·{' '}
                    {anatesReport.summaryCounts.hard} Skr ·{' '}
                    {anatesReport.summaryCounts.veryHard} SS
                  </dd>
                </div>
                <div>
                  <dt className="text-[#7C532B] dark:text-[#C9A47C]">
                    Penilaian Pengecoh
                  </dt>
                  <dd className="font-semibold">
                    Kode ***, ++, +, -, --, --- (Nilai Ideal)
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Per-item side-by-side table */}
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
                    className="border-b border-[#D4DDD8] bg-[#F4F7F5] px-3 py-2 text-center font-semibold dark:border-[#28362F] dark:bg-[#121916]"
                  >
                    Kunci
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
                    Signifikansi
                  </th>
                  <th className="border-b border-[#E5CFB6] bg-[#FDF8F2] px-3 py-2 text-left dark:border-[#4A321C] dark:bg-[#1E140B]">
                    Kode Pengecoh
                  </th>
                </tr>
              </thead>
              <tbody>
                {keyedItems.map((it, idx) => {
                  const an = anatesKeyedItems[idx];
                  return (
                    <tr
                      key={it.questionNumber}
                      className="bg-white hover:bg-[#F8FAF9] dark:bg-[#161F1B] dark:hover:bg-[#1B2621]"
                    >
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-semibold dark:border-[#24322B]">
                        {it.questionNumber}
                      </td>
                      <td className="font-mono-tabular border-b border-[#E3EAE6] px-3 py-2 text-center font-bold dark:border-[#24322B]">
                        {it.key}
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
                      <td className="border-b border-[#EFE3D6] px-3 py-2 font-medium dark:border-[#3A2717]">
                        {an?.significance ?? '—'}
                      </td>
                      <td className="font-mono-tabular border-b border-[#EFE3D6] px-3 py-2 text-xs dark:border-[#3A2717]">
                        {an?.distractorSummary ?? '—'}
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
