import { useState } from 'react';
import {
  Copy,
  Eye,
  FileSpreadsheet,
  FileText,
  Moon,
  Pencil,
  RotateCcw,
  Sun,
  Trash2,
} from 'lucide-react';
import type { ScoreValue, UraianStudentRow } from '../types/sheet';
import {
  clampScore,
  computeUraianStudentStats,
  normalizeMaxScores,
  normalizeScores,
} from '../utils/uraianAnalysis';

interface UraianRecapTableSectionProps {
  rows: UraianStudentRow[];
  itemCount: number;
  scaleMin: number;
  defaultMaxScore: number;
  itemMaxScores: number[];
  selectedId: number | null;
  darkMode: boolean;
  statusMessage: string;
  canUndoDelete: boolean;
  clipboardFallbackText: string;
  onToggleDarkMode: () => void;
  onSelectStudent: (id: number) => void;
  onUpdateRowMeta: (id: number, field: 'nama' | 'kelas', value: string) => void;
  onUpdateCell: (id: number, itemIdx: number, value: ScoreValue) => void;
  onRemoveRow: (id: number) => void;
  onUndoDelete: () => void;
  onPreviewExcel: () => void;
  onDownloadExcel: () => void;
  onDownloadCsv: () => void;
  onCopyTable: () => void;
  onClearAll: () => void;
  onLoadSampleData: () => void;
}

export function UraianRecapTableSection({
  rows,
  itemCount,
  scaleMin,
  defaultMaxScore,
  itemMaxScores,
  selectedId,
  darkMode,
  statusMessage,
  canUndoDelete,
  clipboardFallbackText,
  onToggleDarkMode,
  onSelectStudent,
  onUpdateRowMeta,
  onUpdateCell,
  onRemoveRow,
  onUndoDelete,
  onPreviewExcel,
  onDownloadExcel,
  onDownloadCsv,
  onCopyTable,
  onClearAll,
  onLoadSampleData,
}: UraianRecapTableSectionProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  const normMax = normalizeMaxScores(
    itemMaxScores,
    itemCount,
    defaultMaxScore,
    scaleMin,
  );
  const totalMaxPossible = normMax.reduce((acc, v) => acc + v, 0);

  return (
    <section
      id="uraian-tabel"
      aria-labelledby="heading-uraian-tabel"
      className="flex flex-col gap-5 rounded-xl border border-[#D4DDD8] bg-white p-5 sm:p-6 dark:border-[#28362F] dark:bg-[#161F1B]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1B6B4F] text-sm font-bold text-white dark:bg-[#4AC294] dark:text-[#0B1712]">
            4
          </span>
          <div>
            <h2
              id="heading-uraian-tabel"
              className="text-base font-bold text-[#14211C] dark:text-[#E6EEE9]"
            >
              Tabel rekap skor &amp; ekspor Excel
            </h2>
            <p className="font-mono-tabular text-xs text-[#52635C] dark:text-[#9AAAA2]">
              {rows.length} peserta · {itemCount} butir · Skor maks total:{' '}
              {totalMaxPossible}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="btn-gesture btn-surface-secondary inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
          >
            {darkMode ? (
              <Sun className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Moon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{darkMode ? 'Terang' : 'Gelap'}</span>
          </button>

          <button
            type="button"
            onClick={onPreviewExcel}
            disabled={rows.length === 0}
            className="btn-gesture btn-surface-secondary inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap disabled:opacity-40"
          >
            <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Pratinjau Excel</span>
          </button>

          <button
            type="button"
            onClick={onDownloadExcel}
            disabled={rows.length === 0}
            className="btn-gesture btn-surface-primary inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap disabled:opacity-40"
          >
            <FileSpreadsheet className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Unduh Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={onDownloadCsv}
            disabled={rows.length === 0}
            className="btn-gesture btn-surface-secondary inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap disabled:opacity-40"
          >
            <FileText className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Unduh CSV</span>
          </button>

          <button
            type="button"
            onClick={onCopyTable}
            disabled={rows.length === 0}
            className="btn-gesture btn-surface-secondary inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap disabled:opacity-40"
          >
            <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Salin Tabel</span>
          </button>

          {rows.length > 0 && !confirmClear && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="btn-gesture btn-surface-danger inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Kosongkan</span>
            </button>
          )}

          {confirmClear && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setConfirmClear(false);
                }}
                className="btn-gesture btn-surface-danger min-h-[38px] cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                Ya, Hapus Semua
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="btn-gesture btn-surface-secondary min-h-[38px] cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      {(statusMessage || canUndoDelete) && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#CFE0D7] bg-[#F2F8F5] px-4 py-2.5 text-xs text-[#144332] dark:border-[#263C32] dark:bg-[#13231C] dark:text-[#A6E8CE]"
        >
          <span>{statusMessage}</span>
          {canUndoDelete && (
            <button
              type="button"
              onClick={onUndoDelete}
              className="inline-flex cursor-pointer items-center gap-1 font-semibold underline underline-offset-2"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Batalkan Hapus</span>
            </button>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-[#C7D4CD] bg-[#F8FAF9] p-6 dark:border-[#2D3D35] dark:bg-[#121A16]">
          <p className="text-sm text-[#52635C] dark:text-[#9AAAA2]">
            Belum ada data skor angket atau uraian. Tambahkan peserta pada
            Langkah 2 atau muat contoh data untuk mencoba perhitungan otomatis.
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
        <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
          <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                <th className="sticky left-0 z-20 w-[44px] min-w-[44px] border-b border-r border-[#D4DDD8] bg-[#F4F7F5] px-2 py-2.5 text-center dark:border-[#28362F] dark:bg-[#121916]">
                  No
                </th>
                <th className="sticky left-[44px] z-20 min-w-[170px] border-b border-r border-[#D4DDD8] bg-[#F4F7F5] px-3 py-2.5 text-left dark:border-[#28362F] dark:bg-[#121916]">
                  Nama Siswa / Responden
                </th>
                <th className="border-b border-r border-[#D4DDD8] px-3 py-2.5 text-center dark:border-[#28362F]">
                  Kelas
                </th>
                {Array.from({ length: itemCount }, (_, i) => (
                  <th
                    key={i}
                    className="font-mono-tabular min-w-[54px] border-b border-r border-[#D4DDD8] px-2 py-2.5 text-center dark:border-[#28362F]"
                  >
                    B{i + 1}
                  </th>
                ))}
                <th className="border-b border-r border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                  Terisi
                </th>
                <th className="border-b border-r border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                  Total Skor
                </th>
                <th className="border-b border-r border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                  Rata-rata
                </th>
                <th className="border-b border-r border-[#D4DDD8] px-3 py-2.5 text-right dark:border-[#28362F]">
                  Capaian (%)
                </th>
                <th className="sticky right-0 z-20 min-w-[126px] border-b border-l border-[#D4DDD8] bg-[#F4F7F5] px-2 py-2.5 text-center dark:border-[#28362F] dark:bg-[#121916]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Reference Max Score Row */}
              <tr className="bg-[#EAF4EF] font-semibold text-[#144332] dark:bg-[#193026] dark:text-[#A6E8CE]">
                <td className="font-mono-tabular sticky left-0 z-10 border-b border-r border-[#D4DDD8] bg-[#EAF4EF] px-2 py-2 text-center dark:border-[#28362F] dark:bg-[#193026]">
                  —
                </td>
                <td className="sticky left-[44px] z-10 border-b border-r border-[#D4DDD8] bg-[#EAF4EF] px-3 py-2 text-left dark:border-[#28362F] dark:bg-[#193026]">
                  SKOR MAKSIMUM
                </td>
                <td className="border-b border-r border-[#D4DDD8] px-3 py-2 text-center dark:border-[#28362F]">
                  Min {scaleMin}
                </td>
                {normMax.map((maxVal, idx) => (
                  <td
                    key={idx}
                    className="font-mono-tabular border-b border-r border-[#D4DDD8] px-2 py-2 text-center dark:border-[#28362F]"
                  >
                    {maxVal}
                  </td>
                ))}
                <td className="font-mono-tabular border-b border-r border-[#D4DDD8] px-3 py-2 text-right dark:border-[#28362F]">
                  {itemCount}
                </td>
                <td className="font-mono-tabular border-b border-r border-[#D4DDD8] px-3 py-2 text-right dark:border-[#28362F]">
                  {totalMaxPossible}
                </td>
                <td className="border-b border-r border-[#D4DDD8] px-3 py-2 text-right dark:border-[#28362F]">
                  —
                </td>
                <td className="font-mono-tabular border-b border-r border-[#D4DDD8] px-3 py-2 text-right dark:border-[#28362F]">
                  100%
                </td>
                <td className="sticky right-0 z-10 border-b border-l border-[#D4DDD8] bg-[#EAF4EF] px-2 py-2 text-center dark:border-[#28362F] dark:bg-[#193026]">
                  —
                </td>
              </tr>

              {rows.map((row, rowIdx) => {
                const isSelected = row.id === selectedId;
                const scores = normalizeScores(
                  row.scores,
                  itemCount,
                  scaleMin,
                  normMax,
                );
                const stats = computeUraianStudentStats(
                  scores,
                  itemCount,
                  normMax,
                );
                const rowBg = isSelected
                  ? 'bg-[#F0F7F4] dark:bg-[#172820]'
                  : 'bg-white dark:bg-[#161F1B]';

                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelectStudent(row.id)}
                    className={rowBg}
                  >
                    <td
                      className={`font-mono-tabular sticky left-0 z-10 border-b border-r border-[#E3EAE6] px-2 py-1.5 text-center dark:border-[#24322B] ${rowBg}`}
                    >
                      {rowIdx + 1}
                    </td>
                    <td
                      className={`sticky left-[44px] z-10 border-b border-r border-[#E3EAE6] px-2 py-1.5 dark:border-[#24322B] ${rowBg}`}
                    >
                      <input
                        type="text"
                        value={row.nama}
                        data-uraian-student-name={row.id}
                        aria-label={`Nama peserta baris ${rowIdx + 1}`}
                        onChange={(e) =>
                          onUpdateRowMeta(row.id, 'nama', e.target.value)
                        }
                        className="w-full min-w-[150px] rounded bg-transparent px-1.5 py-1 text-sm font-medium text-[#14211C] focus:bg-white focus:outline-2 focus:outline-[#1B6B4F] dark:text-[#E6EEE9] dark:focus:bg-[#101815]"
                      />
                    </td>
                    <td className="border-b border-r border-[#E3EAE6] px-2 py-1.5 dark:border-[#24322B]">
                      <input
                        type="text"
                        value={row.kelas}
                        aria-label={`Kelas peserta baris ${rowIdx + 1}`}
                        onChange={(e) =>
                          onUpdateRowMeta(row.id, 'kelas', e.target.value)
                        }
                        className="w-20 rounded bg-transparent px-1.5 py-1 text-center text-xs text-[#52635C] focus:bg-white focus:outline-2 focus:outline-[#1B6B4F] dark:text-[#9AAAA2] dark:focus:bg-[#101815]"
                      />
                    </td>
                    {scores.map((val, itemIdx) => {
                      const isEmpty = val === null;
                      const itemMax = normMax[itemIdx] ?? defaultMaxScore;
                      return (
                        <td
                          key={itemIdx}
                          className={`border-b border-r border-[#E3EAE6] p-1 text-center dark:border-[#24322B] ${
                            isEmpty
                              ? 'bg-[#FEF6DC] dark:bg-[#3A2F14]'
                              : ''
                          }`}
                        >
                          <input
                            type="number"
                            step="1"
                            min={scaleMin}
                            max={itemMax}
                            value={val === null ? '' : val}
                            aria-label={`Skor butir ${itemIdx + 1} untuk ${row.nama}`}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                onUpdateCell(row.id, itemIdx, null);
                                return;
                              }
                              const num = Number(raw);
                              if (Number.isFinite(num)) {
                                onUpdateCell(
                                  row.id,
                                  itemIdx,
                                  clampScore(num, scaleMin, itemMax),
                                );
                              }
                            }}
                            className="font-mono-tabular h-8 w-12 rounded bg-transparent text-center text-xs font-semibold text-[#14211C] focus:bg-white focus:outline-2 focus:outline-[#1B6B4F] dark:text-[#E6EEE9] dark:focus:bg-[#101815]"
                          />
                        </td>
                      );
                    })}
                    <td className="font-mono-tabular border-b border-r border-[#E3EAE6] px-3 py-1.5 text-right dark:border-[#24322B]">
                      {stats.filled}/{itemCount}
                    </td>
                    <td className="font-mono-tabular border-b border-r border-[#E3EAE6] px-3 py-1.5 text-right font-bold dark:border-[#24322B]">
                      {stats.totalScore}
                    </td>
                    <td className="font-mono-tabular border-b border-r border-[#E3EAE6] px-3 py-1.5 text-right dark:border-[#24322B]">
                      {stats.averageScore !== null
                        ? stats.averageScore.toFixed(2)
                        : '—'}
                    </td>
                    <td className="font-mono-tabular border-b border-r border-[#E3EAE6] px-3 py-1.5 text-right font-semibold text-[#1B6B4F] dark:border-[#24322B] dark:text-[#58C49B]">
                      {stats.percentScore !== null
                        ? `${stats.percentScore}%`
                        : '—'}
                    </td>
                    <td
                      className={`sticky right-0 z-10 border-b border-l border-[#E3EAE6] px-1.5 py-1.5 text-center dark:border-[#24322B] ${rowBg}`}
                    >
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStudent(row.id);
                            const el = document.querySelector<HTMLInputElement>(
                              `input[data-uraian-student-name="${row.id}"]`,
                            );
                            el?.focus();
                            el?.select();
                          }}
                          aria-label={`Edit data ${row.nama}`}
                          className="inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded px-2 text-xs font-semibold text-[#1B6B4F] transition-colors hover:bg-[#EAF4EF] dark:text-[#58C49B] dark:hover:bg-[#1B3328]"
                        >
                          <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRow(row.id);
                          }}
                          aria-label={`Hapus ${row.nama}`}
                          className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md px-1.5 text-[#B42318] transition-colors hover:bg-[#FEE4E2] dark:text-[#F97066] dark:hover:bg-[#4A1C1A]"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {clipboardFallbackText && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="uraian-tsv-fallback"
            className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
          >
            Salin manual teks di bawah lalu tempel ke Excel:
          </label>
          <textarea
            id="uraian-tsv-fallback"
            readOnly
            rows={4}
            value={clipboardFallbackText}
            onFocus={(e) => e.target.select()}
            className="font-mono-tabular w-full rounded-lg border border-[#D4DDD8] bg-[#F8FAF9] p-3 text-xs dark:border-[#28362F] dark:bg-[#101815]"
          />
        </div>
      )}
    </section>
  );
}
