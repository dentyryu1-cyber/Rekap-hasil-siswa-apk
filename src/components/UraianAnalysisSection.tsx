import { useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Save,
} from 'lucide-react';
import type { SurveySubMode, UraianStudentRow } from '../types/sheet';
import {
  computeFullUraianAnalysis,
  exportUraianAllAnalysesExcel,
  exportUraianSingleAnalysisExcel,
  exportUraianSingleAnalysisText,
  type UraianAnalysisSectionId,
} from '../utils/uraianAnalysis';

interface UraianAnalysisSectionProps {
  examTitle: string;
  rows: UraianStudentRow[];
  itemCount: number;
  subMode: SurveySubMode;
  scaleMin: number;
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

export function UraianAnalysisSection({
  examTitle,
  rows,
  itemCount,
  subMode,
  scaleMin,
  itemMaxScores,
  onLoadSampleData,
  onExportProjectData,
}: UraianAnalysisSectionProps) {
  const [activeTab, setActiveTab] = useState<UraianAnalysisSectionId>('rekap');
  const [exportNotice, setExportNotice] = useState('');

  const report = useMemo(
    () =>
      computeFullUraianAnalysis(
        rows,
        itemCount,
        subMode,
        scaleMin,
        itemMaxScores,
      ),
    [rows, itemCount, subMode, scaleMin, itemMaxScores],
  );

  const activeTabLabel =
    URAIAN_TABS.find((t) => t.id === activeTab)?.label ?? 'Rekap Analisis Butir';

  function handleExportCurrentExcel() {
    const filename = exportUraianSingleAnalysisExcel(
      activeTab,
      report,
      examTitle,
    );
    setExportNotice(
      `Excel ${activeTabLabel} disimpan sebagai "${filename}".`,
    );
  }

  function handleExportCurrentText() {
    const filename = exportUraianSingleAnalysisText(
      activeTab,
      report,
      examTitle,
    );
    setExportNotice(
      `Laporan teks ${activeTabLabel} disimpan sebagai "${filename}".`,
    );
  }

  function handleExportAllExcel() {
    const filename = exportUraianAllAnalysesExcel(report, examTitle);
    setExportNotice(
      `Buku kerja lengkap 7 analisis disimpan sebagai "${filename}".`,
    );
  }

  return (
    <section
      id="uraian-analisis"
      aria-labelledby="heading-uraian-analisis"
      className="flex flex-col gap-5 rounded-xl border border-[#D4DDD8] bg-white p-5 sm:p-6 dark:border-[#28362F] dark:bg-[#161F1B]"
    >
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
            Alpha Cronbach, Kelompok Unggul-Asor (27%), Daya Pembeda, Tingkat
            Kesukaran/Capaian, Korelasi Validitas, dan Sebaran Skor
          </p>
        </div>
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
      ) : (
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
            aria-label="Menu olah data angket dan uraian"
            className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#EFF3F1] p-1.5 dark:bg-[#111915]"
          >
            {URAIAN_TABS.map((tab) => (
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
              <span className="font-semibold text-[#14211C] dark:text-[#E6EEE9]">
                {activeTabLabel}
              </span>{' '}
              — simpan hasil analisis ini atau ekspor 7 sheet sekaligus.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportCurrentExcel}
                className="btn-gesture btn-surface-primary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
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
                <span>Simpan Laporan Teks (.txt)</span>
              </button>
              <button
                type="button"
                onClick={handleExportAllExcel}
                className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                <Download className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Simpan Semua Analisis (.xlsx)</span>
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
                <span>Simpan File Data (.json)</span>
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

          {/* Tab 3: Kelompok Unggul & Asor */}
          {activeTab === 'unggul-asor' && (
            <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
              <table className="w-full border-separate border-spacing-0 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                      Peringkat
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-left dark:border-[#28362F]">
                      Nama
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                      Kelas
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Total Skor
                    </th>
                    <th className="border-b border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                      Capaian (%)
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
                        {st.scorePercent}%
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
          )}

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
      )}
    </section>
  );
}
