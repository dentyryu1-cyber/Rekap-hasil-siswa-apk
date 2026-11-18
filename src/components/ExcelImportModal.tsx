import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  X,
} from 'lucide-react';
import type { AnswerLetter, ScoreValue } from '../types/sheet';
import {
  downloadAbcExcelTemplate,
  downloadUraianExcelTemplate,
  parseAbcExcelSheet,
  parseUraianExcelSheet,
  pickBestSheetName,
  readExcelFile,
  type LoadedExcelWorkbook,
} from '../utils/excelImport';

export type ExcelImportApplyMode = 'replace' | 'append';

export interface AbcExcelImportPayload {
  mode: ExcelImportApplyMode;
  questionCount: number;
  applyKey: boolean;
  answerKey: AnswerLetter[] | null;
  rows: Array<{ nama: string; kelas: string; jawaban: AnswerLetter[] }>;
}

export interface UraianExcelImportPayload {
  mode: ExcelImportApplyMode;
  itemCount: number;
  applyMaxScores: boolean;
  maxScores: number[] | null;
  inferredMinScore: number;
  inferredMaxScore: number;
  rows: Array<{ nama: string; kelas: string; scores: ScoreValue[] }>;
}

interface ExcelImportModalProps {
  isOpen: boolean;
  targetMode: 'abc' | 'uraian';
  currentItemCount: number;
  currentScaleMin?: number;
  currentDefaultMax?: number;
  examTitle: string;
  hasExistingRows: boolean;
  onClose: () => void;
  onConfirmAbc?: (payload: AbcExcelImportPayload) => void;
  onConfirmUraian?: (payload: UraianExcelImportPayload) => void;
}

export function ExcelImportModal({
  isOpen,
  targetMode,
  currentItemCount,
  currentScaleMin = 0,
  currentDefaultMax = 10,
  examTitle,
  hasExistingRows,
  onClose,
  onConfirmAbc,
  onConfirmUraian,
}: ExcelImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [workbook, setWorkbook] = useState<LoadedExcelWorkbook | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [applyMode, setApplyMode] = useState<ExcelImportApplyMode>(
    hasExistingRows ? 'replace' : 'replace',
  );
  const [applyMetadataRow, setApplyMetadataRow] = useState<boolean>(true);
  const [isReading, setIsReading] = useState<boolean>(false);
  const [readError, setReadError] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setApplyMode(hasExistingRows ? 'append' : 'replace');
    setApplyMetadataRow(true);
    setReadError('');

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasExistingRows, onClose]);

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsReading(true);
    setReadError('');
    try {
      const loaded = await readExcelFile(file);
      if (loaded.sheetNames.length === 0) {
        setReadError('File Excel tidak memiliki lembar kerja.');
        setWorkbook(null);
      } else {
        setWorkbook(loaded);
        setSelectedSheet(pickBestSheetName(loaded.sheetNames, targetMode));
      }
    } catch {
      setReadError(
        'Gagal membaca file. Pastikan file berformat .xlsx, .xls, atau .csv yang valid.',
      );
      setWorkbook(null);
    } finally {
      setIsReading(false);
    }
  }

  const parsedAbc = useMemo(() => {
    if (!workbook || targetMode !== 'abc') return null;
    const rawRows = workbook.sheets[selectedSheet] || [];
    return parseAbcExcelSheet(rawRows, currentItemCount);
  }, [workbook, selectedSheet, targetMode, currentItemCount]);

  const parsedUraian = useMemo(() => {
    if (!workbook || targetMode !== 'uraian') return null;
    const rawRows = workbook.sheets[selectedSheet] || [];
    return parseUraianExcelSheet(
      rawRows,
      currentItemCount,
      currentScaleMin,
      currentDefaultMax,
    );
  }, [
    workbook,
    selectedSheet,
    targetMode,
    currentItemCount,
    currentScaleMin,
    currentDefaultMax,
  ]);

  if (!isOpen) return null;

  const detectedCount =
    targetMode === 'abc'
      ? (parsedAbc?.rows.length ?? 0)
      : (parsedUraian?.rows.length ?? 0);
  const detectedItemCount =
    targetMode === 'abc'
      ? (parsedAbc?.detectedQuestionCount ?? currentItemCount)
      : (parsedUraian?.detectedItemCount ?? currentItemCount);
  const hasMetadataRow =
    targetMode === 'abc'
      ? Boolean(parsedAbc?.detectedAnswerKey)
      : Boolean(parsedUraian?.detectedMaxScores);
  const warnings =
    targetMode === 'abc'
      ? (parsedAbc?.warnings ?? [])
      : (parsedUraian?.warnings ?? []);

  const previewColumns = Math.min(8, detectedItemCount);

  function handleConfirm() {
    if (targetMode === 'abc' && parsedAbc && onConfirmAbc) {
      onConfirmAbc({
        mode: applyMode,
        questionCount: parsedAbc.detectedQuestionCount,
        applyKey: applyMetadataRow && parsedAbc.detectedAnswerKey !== null,
        answerKey: parsedAbc.detectedAnswerKey,
        rows: parsedAbc.rows,
      });
      setWorkbook(null);
      onClose();
      return;
    }

    if (targetMode === 'uraian' && parsedUraian && onConfirmUraian) {
      onConfirmUraian({
        mode: applyMode,
        itemCount: parsedUraian.detectedItemCount,
        applyMaxScores:
          applyMetadataRow && parsedUraian.detectedMaxScores !== null,
        maxScores: parsedUraian.detectedMaxScores,
        inferredMinScore: parsedUraian.inferredMinScore,
        inferredMaxScore: parsedUraian.inferredMaxScore,
        rows: parsedUraian.rows,
      });
      setWorkbook(null);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="excel-import-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#D4DDD8] bg-white shadow-xl dark:border-[#28362F] dark:bg-[#161F1B]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E3EAE6] px-5 py-4 sm:px-6 dark:border-[#24322B]">
          <div>
            <h2
              id="excel-import-title"
              className="text-lg font-bold text-[#14211C] dark:text-[#E6EEE9]"
            >
              Impor Data dari Excel (.xlsx / .xls / .csv)
            </h2>
            <p className="mt-0.5 text-xs text-[#52635C] dark:text-[#9AAAA2]">
              {targetMode === 'abc'
                ? 'Baca daftar siswa, kelas, kunci jawaban, dan jawaban A–E langsung dari lembar Excel.'
                : 'Baca daftar peserta, kelas, skor per butir, dan baris skor maksimum langsung dari Excel.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog impor Excel"
            className="btn-gesture btn-surface-secondary inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6">
          {/* File Drop/Select & Template Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-[#D4DDD8] bg-[#F8FAF9] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#28362F] dark:bg-[#121916]">
            <div className="flex items-center gap-3">
              <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EAF4EF] text-[#1B6B4F] dark:bg-[#193026] dark:text-[#58C49B]">
                <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[#14211C] dark:text-[#E6EEE9]">
                  {workbook ? workbook.filename : 'Belum ada file dipilih'}
                </div>
                <div className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                  Mendukung format .xlsx, .xls, dan .csv
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (targetMode === 'abc') {
                    downloadAbcExcelTemplate(currentItemCount, examTitle);
                  } else {
                    downloadUraianExcelTemplate(
                      currentItemCount,
                      currentDefaultMax,
                      examTitle,
                    );
                  }
                }}
                className="btn-gesture btn-surface-secondary inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                <Download className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Unduh Template</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReading}
                className="btn-gesture btn-surface-primary inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-semibold whitespace-nowrap disabled:opacity-50"
              >
                <Upload className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{workbook ? 'Ganti File Excel' : 'Pilih File Excel'}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={handleFileSelect}
                className="sr-only"
                aria-label="Pilih file Excel untuk diimpor"
              />
            </div>
          </div>

          {readError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-[#F3C6C2] bg-[#FEF3F2] px-4 py-3 text-xs font-medium text-[#B42318] dark:border-[#5C2B27] dark:bg-[#241515] dark:text-[#F97066]"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{readError}</span>
            </div>
          )}

          {!workbook && !readError && (
            <div className="rounded-xl border border-dashed border-[#D4DDD8] bg-[#FCFDFC] p-5 text-xs text-[#52635C] dark:border-[#28362F] dark:bg-[#121916] dark:text-[#9AAAA2]">
              <p className="font-semibold text-[#14211C] dark:text-[#E6EEE9]">
                Format kolom yang dikenali otomatis:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  Kolom <strong className="text-[#14211C] dark:text-[#E6EEE9]">Nama</strong> (atau{' '}
                  <code>Nama Siswa</code> / <code>Peserta</code>) dan opsional{' '}
                  <strong className="text-[#14211C] dark:text-[#E6EEE9]">Kelas</strong>.
                </li>
                <li>
                  {targetMode === 'abc'
                    ? 'Kolom nomor soal (1, 2, 3... atau Soal 1, Q1) berisi huruf jawaban A–E, atau satu kolom "Jawaban" berisi deretan huruf.'
                    : 'Kolom butir skor (1, 2, 3... atau B1, B2...) berisi angka skor tiap nomor.'}
                </li>
                <li>
                  {targetMode === 'abc'
                    ? 'Baris bernama "KUNCI JAWABAN" akan otomatis terdeteksi sebagai kunci.'
                    : 'Baris bernama "SKOR MAKSIMUM" akan otomatis terdeteksi sebagai bobot maksimal tiap butir.'}
                </li>
              </ul>
            </div>
          )}

          {workbook && (
            <>
              {/* Sheet selector + Import Options */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="excel-sheet-select"
                    className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
                  >
                    Lembar kerja (Sheet)
                  </label>
                  <select
                    id="excel-sheet-select"
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className="h-10 rounded-xl border border-[#D4DDD8] bg-white px-3 text-sm font-medium text-[#14211C] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
                  >
                    {workbook.sheetNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]">
                    Cara pengisian data
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setApplyMode('replace')}
                      className={`btn-gesture min-h-[40px] cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        applyMode === 'replace'
                          ? 'btn-surface-primary'
                          : 'btn-surface-secondary'
                      }`}
                    >
                      Ganti Data Lama
                    </button>
                    <button
                      type="button"
                      onClick={() => setApplyMode('append')}
                      disabled={!hasExistingRows}
                      className={`btn-gesture min-h-[40px] cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45 ${
                        applyMode === 'append'
                          ? 'btn-surface-primary'
                          : 'btn-surface-secondary'
                      }`}
                    >
                      Tambahkan ke Tabel
                    </button>
                  </div>
                </div>
              </div>

              {/* Detection Summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE8E1] bg-[#EDF5F1] px-4 py-3 text-xs text-[#144332] dark:border-[#284739] dark:bg-[#152920] dark:text-[#A6E8CE]">
                <div className="font-mono-tabular flex flex-wrap items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{detectedCount} peserta terdeteksi</span>
                  <span aria-hidden="true">·</span>
                  <span>{detectedItemCount} butir</span>
                  {hasMetadataRow && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {targetMode === 'abc'
                          ? 'Kunci jawaban ditemukan'
                          : 'Skor maksimum ditemukan'}
                      </span>
                    </>
                  )}
                </div>

                {hasMetadataRow && (
                  <label className="flex cursor-pointer items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={applyMetadataRow}
                      onChange={(e) => setApplyMetadataRow(e.target.checked)}
                      className="h-4 w-4 accent-[#1B6B4F]"
                    />
                    <span>
                      {targetMode === 'abc'
                        ? 'Terapkan kunci jawaban dari Excel'
                        : 'Terapkan bobot skor maksimum'}
                    </span>
                  </label>
                )}
              </div>

              {warnings.length > 0 && (
                <div className="flex flex-col gap-1 rounded-xl border border-[#F0CF7B] bg-[#FEF6DC] px-4 py-2.5 text-xs text-[#7A5A06] dark:border-[#8C6D1F] dark:bg-[#3A2F14] dark:text-[#F0CF7B]">
                  {warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Data Preview Table */}
              {detectedCount > 0 && (
                <div className="overflow-x-auto rounded-xl border border-[#D4DDD8] dark:border-[#28362F]">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#EEF3F0] text-[#2B3B35] dark:bg-[#121916] dark:text-[#C5D3CC]">
                        <th className="border-b border-[#D4DDD8] px-3 py-2 text-center font-semibold dark:border-[#28362F]">
                          No
                        </th>
                        <th className="border-b border-[#D4DDD8] px-3 py-2 text-left font-semibold dark:border-[#28362F]">
                          Nama
                        </th>
                        <th className="border-b border-[#D4DDD8] px-3 py-2 text-left font-semibold dark:border-[#28362F]">
                          Kelas
                        </th>
                        {Array.from({ length: previewColumns }, (_, i) => (
                          <th
                            key={i}
                            className="font-mono-tabular border-b border-[#D4DDD8] px-2.5 py-2 text-center font-semibold dark:border-[#28362F]"
                          >
                            {targetMode === 'abc' ? i + 1 : `B${i + 1}`}
                          </th>
                        ))}
                        {detectedItemCount > previewColumns && (
                          <th className="border-b border-[#D4DDD8] px-2.5 py-2 text-center font-semibold dark:border-[#28362F]">
                            ...
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3EAE6] dark:divide-[#24322B]">
                      {targetMode === 'abc' &&
                        parsedAbc?.rows.slice(0, 8).map((row, idx) => (
                          <tr key={idx}>
                            <td className="font-mono-tabular px-3 py-2 text-center text-[#52635C] dark:text-[#9AAAA2]">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 font-medium text-[#14211C] dark:text-[#E6EEE9]">
                              {row.nama}
                            </td>
                            <td className="px-3 py-2 text-[#52635C] dark:text-[#9AAAA2]">
                              {row.kelas || '—'}
                            </td>
                            {Array.from({ length: previewColumns }, (_, i) => (
                              <td
                                key={i}
                                className="font-mono-tabular px-2.5 py-2 text-center font-semibold text-[#14211C] dark:text-[#E6EEE9]"
                              >
                                {row.jawaban[i] || '—'}
                              </td>
                            ))}
                            {detectedItemCount > previewColumns && (
                              <td className="px-2.5 py-2 text-center text-[#8D9D95]">
                                ...
                              </td>
                            )}
                          </tr>
                        ))}

                      {targetMode === 'uraian' &&
                        parsedUraian?.rows.slice(0, 8).map((row, idx) => (
                          <tr key={idx}>
                            <td className="font-mono-tabular px-3 py-2 text-center text-[#52635C] dark:text-[#9AAAA2]">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 font-medium text-[#14211C] dark:text-[#E6EEE9]">
                              {row.nama}
                            </td>
                            <td className="px-3 py-2 text-[#52635C] dark:text-[#9AAAA2]">
                              {row.kelas || '—'}
                            </td>
                            {Array.from({ length: previewColumns }, (_, i) => (
                              <td
                                key={i}
                                className="font-mono-tabular px-2.5 py-2 text-center font-semibold text-[#14211C] dark:text-[#E6EEE9]"
                              >
                                {row.scores[i] !== null ? row.scores[i] : '—'}
                              </td>
                            ))}
                            {detectedItemCount > previewColumns && (
                              <td className="px-2.5 py-2 text-center text-[#8D9D95]">
                                ...
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {detectedCount > 8 && (
                    <div className="border-t border-[#E3EAE6] bg-[#F8FAF9] px-3 py-1.5 text-center text-[11px] text-[#52635C] dark:border-[#24322B] dark:bg-[#121916] dark:text-[#9AAAA2]">
                      Menampilkan 8 dari {detectedCount} peserta yang akan diimpor
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[#E3EAE6] px-5 py-3.5 sm:px-6 dark:border-[#24322B]">
          <button
            type="button"
            onClick={onClose}
            className="btn-gesture btn-surface-secondary min-h-[40px] cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!workbook || detectedCount === 0}
            className="btn-gesture btn-surface-primary inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Upload className="btn-nudge-up h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Impor {detectedCount > 0 ? `${detectedCount} Peserta` : 'Data'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
