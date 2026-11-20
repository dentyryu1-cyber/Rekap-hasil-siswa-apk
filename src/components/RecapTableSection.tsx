import { useMemo, useState, type KeyboardEvent } from 'react';
import {
  Copy,
  Eye,
  FileSpreadsheet,
  FileText,
  Moon,
  Pencil,
  Search,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import type { AnswerLetter, StudentRow } from '../types/sheet';
import {
  computeStudentStats,
  normalizeAnswers,
  sanitizeAnswerChar,
} from '../utils/answerParser';

interface RecapTableSectionProps {
  rows: StudentRow[];
  questionCount: number;
  selectedId: number | null;
  answerKey: AnswerLetter[];
  darkMode: boolean;
  statusMessage: string;
  canUndoDelete: boolean;
  clipboardFallbackText: string;
  onToggleDarkMode: () => void;
  onSelectStudent: (id: number) => void;
  onUpdateRowMeta: (id: number, field: 'nama' | 'kelas', value: string) => void;
  onUpdateCell: (id: number, questionIdx: number, value: AnswerLetter) => void;
  onRemoveRow: (id: number) => void;
  onUndoDelete: () => void;
  onPreviewExcel: () => void;
  onDownloadExcel: () => void;
  onDownloadCsv: () => void;
  onCopyTable: () => void;
  onClearAll: () => void;
  onLoadSampleData: () => void;
}

export function RecapTableSection({
  rows,
  questionCount,
  selectedId,
  answerKey,
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
}: RecapTableSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const normKey = useMemo(
    () => normalizeAnswers(answerKey, questionCount),
    [answerKey, questionCount],
  );
  const hasKey = normKey.some((k) => k !== '');

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.nama.toLowerCase().includes(q) ||
        r.kelas.toLowerCase().includes(q),
    );
  }, [rows, searchQuery]);

  const questionIndices = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < questionCount; i++) arr.push(i);
    return arr;
  }, [questionCount]);

  const wrongCountPerQuestion = useMemo(() => {
    if (!hasKey) return [];
    return questionIndices.map((qIdx) => {
      const keyChar = normKey[qIdx];
      if (!keyChar) return 0;
      let count = 0;
      filteredRows.forEach((row) => {
        const ans = normalizeAnswers(row.jawaban, questionCount)[qIdx];
        if (ans !== '' && ans !== keyChar) count++;
      });
      return count;
    });
  }, [hasKey, questionIndices, normKey, filteredRows, questionCount]);

  function handleClearClick() {
    if (rows.length === 0) return;
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3500);
      return;
    }
    setConfirmClear(false);
    onClearAll();
  }

  function handleCellKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number,
  ) {
    let nextRow = rowIdx;
    let nextCol = colIdx;

    if (e.key === 'ArrowRight') nextCol = colIdx + 1;
    else if (e.key === 'ArrowLeft') nextCol = colIdx - 1;
    else if (e.key === 'ArrowDown' || e.key === 'Enter') nextRow = rowIdx + 1;
    else if (e.key === 'ArrowUp') nextRow = rowIdx - 1;
    else return;

    if (
      nextRow >= 0 &&
      nextRow < filteredRows.length &&
      nextCol >= 0 &&
      nextCol < questionCount
    ) {
      e.preventDefault();
      const target = document.querySelector<HTMLInputElement>(
        `input[data-cell="${nextRow}-${nextCol}"]`,
      );
      target?.focus();
      target?.select();
    }
  }

  return (
    <section
      id="tabel-data"
      aria-labelledby="heading-tabel"
      className="flex flex-col gap-4 rounded-xl border border-[#D4DDD8] bg-white p-5 sm:p-6 dark:border-[#28362F] dark:bg-[#161F1B]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1B6B4F] text-sm font-bold text-white dark:bg-[#4AC294] dark:text-[#0B1712]">
            4
          </span>
          <div>
            <h2
              id="heading-tabel"
              className="text-base font-bold text-[#14211C] dark:text-[#E6EEE9]"
            >
              Tabel rekap &amp; unduh Excel
            </h2>
            <p className="font-mono-tabular text-xs text-[#52635C] dark:text-[#9AAAA2]">
              {rows.length} siswa · {questionCount} butir soal
              {hasKey ? ' · Penilaian otomatis aktif' : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#6B7C75]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau kelas..."
              aria-label="Cari siswa berdasarkan nama atau kelas"
              className="h-10 w-full rounded-lg border border-[#D4DDD8] bg-[#F8FAF9] pr-3 pl-9 text-sm text-[#14211C] placeholder:text-[#7B8B84] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
            />
          </div>

          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            className="btn-gesture btn-surface-secondary inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-semibold whitespace-nowrap"
          >
            {darkMode ? (
              <>
                <Sun className="h-4 w-4" aria-hidden="true" />
                <span>Terang</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" aria-hidden="true" />
                <span>Gelap</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2.5 border-y border-[#E3EAE6] py-3.5 dark:border-[#24322B]">
        <button
          type="button"
          onClick={onPreviewExcel}
          disabled={rows.length === 0}
          className="btn-gesture btn-surface-secondary inline-flex min-h-[42px] shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Pratinjau Excel</span>
        </button>

        <button
          type="button"
          onClick={onDownloadExcel}
          disabled={rows.length === 0}
          className="btn-gesture btn-surface-primary inline-flex min-h-[42px] shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45"
        >
          <FileSpreadsheet className="btn-nudge-up h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Unduh Excel (.xlsx)</span>
        </button>

        <button
          type="button"
          onClick={onDownloadCsv}
          disabled={rows.length === 0}
          className="btn-gesture btn-surface-secondary inline-flex min-h-[42px] shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45"
        >
          <FileText className="btn-nudge-up h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Unduh CSV</span>
        </button>

        <button
          type="button"
          onClick={onCopyTable}
          disabled={rows.length === 0}
          className="btn-gesture btn-surface-secondary inline-flex min-h-[42px] shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Salin tabel</span>
        </button>

        <button
          type="button"
          onClick={handleClearClick}
          disabled={rows.length === 0}
          className={`btn-gesture btn-surface-danger inline-flex min-h-[42px] shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45 sm:ml-auto`}
        >
          <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {confirmClear ? 'Klik lagi untuk hapus semua' : 'Kosongkan semua'}
          </span>
        </button>
      </div>

      {/* Table or Empty State */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-[#C7D4CD] bg-[#F8FAF9] p-6 dark:border-[#2D3D35] dark:bg-[#121A16]">
          <p className="text-sm font-medium text-[#14211C] dark:text-[#E6EEE9]">
            Tabel rekap masih kosong.
          </p>
          <p className="max-w-xl text-sm text-[#52635C] dark:text-[#9AAAA2]">
            Tambahkan siswa di langkah 2 dan isi jawabannya di langkah 3, lalu
            unduh langsung menjadi file Excel (.xlsx) yang siap dicetak atau
            diolah lebih lanjut.
          </p>
          <button
            type="button"
            onClick={onLoadSampleData}
            className="btn-gesture btn-surface-primary min-h-[40px] cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Muat Contoh Data (40 Butir Soal)
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
            <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-[#F4F7F5] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                  <th className="sticky left-0 z-20 w-[44px] min-w-[44px] border-b border-[#D4DDD8] bg-[#F4F7F5] px-2 py-2.5 text-center dark:border-[#28362F] dark:bg-[#121916]">
                    No
                  </th>
                  <th className="sticky left-[44px] z-20 min-w-[170px] max-w-[190px] border-r border-b border-[#D4DDD8] bg-[#F4F7F5] px-3 py-2.5 text-left dark:border-[#28362F] dark:bg-[#121916]">
                    Nama Siswa
                  </th>
                  <th className="min-w-[74px] border-b border-[#D4DDD8] px-2 py-2.5 text-center dark:border-[#28362F]">
                    Kelas
                  </th>
                  {questionIndices.map((idx) => (
                    <th
                      key={idx}
                      className="font-mono-tabular w-[42px] min-w-[42px] border-b border-[#D4DDD8] px-1 py-2 text-center dark:border-[#28362F]"
                    >
                      <div className="flex flex-col items-center leading-tight">
                        <span>{idx + 1}</span>
                        {hasKey && (
                          <span
                            title={`Kunci soal ${idx + 1}: ${normKey[idx] || 'Belum diatur'}`}
                            className="mt-0.5 text-[10px] font-semibold text-[#1B6B4F] dark:text-[#58C49B]"
                          >
                            {normKey[idx] || '·'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="border-l border-b border-[#D4DDD8] px-2.5 py-2.5 text-right whitespace-nowrap dark:border-[#28362F]">
                    Terisi
                  </th>
                  <th className="border-b border-[#D4DDD8] px-2.5 py-2.5 text-right whitespace-nowrap dark:border-[#28362F]">
                    Kosong
                  </th>
                  {hasKey && (
                    <>
                      <th className="border-b border-[#D4DDD8] px-2.5 py-2.5 text-right whitespace-nowrap dark:border-[#28362F]">
                        Benar
                      </th>
                      <th className="border-b border-[#D4DDD8] px-2.5 py-2.5 text-right whitespace-nowrap dark:border-[#28362F]">
                        Salah
                      </th>
                      <th className="border-b border-[#D4DDD8] px-2.5 py-2.5 text-right whitespace-nowrap dark:border-[#28362F]">
                        Nilai
                      </th>
                    </>
                  )}
                  <th className="sticky right-0 z-20 w-[134px] min-w-[134px] border-b border-l border-[#D4DDD8] bg-[#F4F7F5] px-2 py-2.5 text-center dark:border-[#28362F] dark:bg-[#121916]">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={questionCount + (hasKey ? 9 : 6)}
                      className="px-4 py-6 text-center text-sm text-[#52635C] dark:text-[#9AAAA2]"
                    >
                      Tidak ada siswa yang cocok dengan kata kunci &ldquo;
                      {searchQuery}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, visibleIdx) => {
                    const realIndex = rows.findIndex((r) => r.id === row.id);
                    const normAns = normalizeAnswers(row.jawaban, questionCount);
                    const stats = computeStudentStats(
                      row,
                      questionCount,
                      normKey,
                    );
                    const isSelected = row.id === selectedId;
                    const rowBg = isSelected
                      ? 'bg-[#EAF4EF] dark:bg-[#193026]'
                      : 'bg-white hover:bg-[#F8FAF9] dark:bg-[#161F1B] dark:hover:bg-[#1B2621]';

                    return (
                      <tr key={row.id} className={rowBg}>
                        <td
                          className={`font-mono-tabular sticky left-0 z-10 border-b border-[#E3EAE6] px-2 py-1 text-center text-xs text-[#52635C] dark:border-[#24322B] dark:text-[#9AAAA2] ${
                            isSelected
                              ? 'bg-[#EAF4EF] dark:bg-[#193026]'
                              : 'bg-white dark:bg-[#161F1B]'
                          }`}
                        >
                          {realIndex + 1}
                        </td>
                        <td
                          className={`sticky left-[44px] z-10 border-r border-b border-[#E3EAE6] px-1.5 py-1 dark:border-[#24322B] ${
                            isSelected
                              ? 'bg-[#EAF4EF] dark:bg-[#193026]'
                              : 'bg-white dark:bg-[#161F1B]'
                          }`}
                        >
                          <input
                            type="text"
                            value={row.nama}
                            data-student-name={row.id}
                            onFocus={() => onSelectStudent(row.id)}
                            onChange={(e) =>
                              onUpdateRowMeta(row.id, 'nama', e.target.value)
                            }
                            aria-label={`Nama siswa baris ${realIndex + 1}`}
                            className="h-9 w-full rounded border border-transparent bg-transparent px-2 text-sm font-medium text-[#14211C] hover:border-[#D4DDD8] focus:border-[#1B6B4F] focus:bg-white focus:outline-none dark:text-[#E6EEE9] dark:hover:border-[#28362F] dark:focus:border-[#4AC294] dark:focus:bg-[#101815]"
                          />
                        </td>
                        <td className="border-b border-[#E3EAE6] px-1 py-1 dark:border-[#24322B]">
                          <input
                            type="text"
                            value={row.kelas}
                            onChange={(e) =>
                              onUpdateRowMeta(row.id, 'kelas', e.target.value)
                            }
                            aria-label={`Kelas siswa ${row.nama}`}
                            className="h-9 w-full rounded border border-transparent bg-transparent px-1.5 text-center text-sm text-[#14211C] hover:border-[#D4DDD8] focus:border-[#1B6B4F] focus:bg-white focus:outline-none dark:text-[#E6EEE9] dark:hover:border-[#28362F] dark:focus:border-[#4AC294] dark:focus:bg-[#101815]"
                          />
                        </td>

                        {questionIndices.map((qIdx) => {
                          const val = normAns[qIdx];
                          const isEmpty = val === '';
                          const isMatch =
                            hasKey && normKey[qIdx] && val === normKey[qIdx];
                          const isWrong =
                            hasKey &&
                            normKey[qIdx] &&
                            val !== '' &&
                            val !== normKey[qIdx];

                          return (
                            <td
                              key={qIdx}
                              className="border-b border-[#E3EAE6] px-0.5 py-1 text-center dark:border-[#24322B]"
                            >
                              <input
                                type="text"
                                maxLength={1}
                                autoCapitalize="characters"
                                value={val}
                                data-cell={`${visibleIdx}-${qIdx}`}
                                title={
                                  isEmpty
                                    ? `Soal ${qIdx + 1}: Belum diisi`
                                    : isWrong
                                      ? `Soal ${qIdx + 1}: Salah (Kunci ${normKey[qIdx]})`
                                      : `Soal ${qIdx + 1}: ${val}`
                                }
                                aria-label={
                                  isWrong
                                    ? `${row.nama}, soal ${qIdx + 1}, salah, kunci ${normKey[qIdx]}`
                                    : `${row.nama}, soal ${qIdx + 1}`
                                }
                                data-wrong={isWrong ? 'true' : undefined}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) =>
                                  handleCellKeyDown(e, visibleIdx, qIdx)
                                }
                                onChange={(e) =>
                                  onUpdateCell(
                                    row.id,
                                    qIdx,
                                    sanitizeAnswerChar(e.target.value),
                                  )
                                }
                                className={`font-mono-tabular h-9 w-9 rounded text-center text-sm font-semibold uppercase focus:outline-2 focus:outline-[#1B6B4F] ${
                                  isEmpty
                                    ? 'border border-dashed border-[#A1740A] bg-[#FEF6DC] text-[#7A5A06] dark:border-[#8C6D1F] dark:bg-[#3A2F14] dark:text-[#F0CF7B]'
                                    : isWrong
                                      ? 'border-2 border-[#D92D20] bg-[#FEE4E2] font-bold text-[#912018] dark:border-[#F97066] dark:bg-[#4A1C1A] dark:text-[#FECACA]'
                                      : isMatch
                                        ? 'border border-[#B7DFCC] bg-[#ECF8F2] text-[#14533C] dark:border-[#285A45] dark:bg-[#193529] dark:text-[#75DFB5]'
                                        : 'border border-transparent bg-transparent text-[#14211C] hover:border-[#D4DDD8] dark:text-[#E6EEE9] dark:hover:border-[#28362F]'
                                }`}
                              />
                            </td>
                          );
                        })}

                        <td className="font-mono-tabular border-l border-b border-[#E3EAE6] px-2.5 py-1 text-right text-xs font-semibold text-[#14211C] dark:border-[#24322B] dark:text-[#E6EEE9]">
                          {stats.filled}
                        </td>
                        <td className="font-mono-tabular border-b border-[#E3EAE6] px-2.5 py-1 text-right text-xs text-[#52635C] dark:border-[#24322B] dark:text-[#9AAAA2]">
                          {stats.empty}
                        </td>
                        {hasKey && (
                          <>
                            <td className="font-mono-tabular border-b border-[#E3EAE6] px-2.5 py-1 text-right text-xs font-semibold text-[#1B6B4F] dark:border-[#24322B] dark:text-[#58C49B]">
                              {stats.correct}
                            </td>
                            <td className="font-mono-tabular border-b border-[#E3EAE6] px-2.5 py-1 text-right text-xs font-semibold text-[#B42318] dark:border-[#24322B] dark:text-[#FDA29B]">
                              {stats.wrong}
                            </td>
                            <td className="font-mono-tabular border-b border-[#E3EAE6] px-2.5 py-1 text-right text-xs font-bold text-[#14211C] dark:border-[#24322B] dark:text-[#E6EEE9]">
                              {stats.scorePercent !== null
                                ? stats.scorePercent
                                : 0}
                            </td>
                          </>
                        )}
                        <td
                          className={`sticky right-0 z-10 border-b border-l border-[#E3EAE6] px-1.5 py-1 text-center dark:border-[#24322B] ${
                            isSelected
                              ? 'bg-[#EAF4EF] dark:bg-[#193026]'
                              : 'bg-white dark:bg-[#161F1B]'
                          }`}
                        >
                          <div className="inline-flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectStudent(row.id);
                                const el = document.querySelector<HTMLInputElement>(
                                  `input[data-student-name="${row.id}"]`,
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
                              onClick={() => onRemoveRow(row.id)}
                              aria-label={`Hapus ${row.nama}`}
                              className="inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded px-2 text-xs font-semibold text-[#B42318] transition-colors hover:bg-[#FEE4E2] dark:text-[#FDA29B] dark:hover:bg-[#3A1E1C]"
                            >
                              <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {hasKey && filteredRows.length > 0 && (
                <tfoot>
                  <tr className="bg-[#FAFBFB] text-xs font-semibold text-[#52635C] dark:bg-[#121916] dark:text-[#9AAAA2]">
                    <td className="sticky left-0 z-10 border-t border-[#D4DDD8] bg-[#FAFBFB] px-2 py-2 text-center dark:border-[#28362F] dark:bg-[#121916]">
                      —
                    </td>
                    <td className="sticky left-[44px] z-10 border-t border-r border-[#D4DDD8] bg-[#FAFBFB] px-3 py-2 text-left dark:border-[#28362F] dark:bg-[#121916]">
                      Jumlah salah
                    </td>
                    <td className="border-t border-[#D4DDD8] px-2 py-2 text-center dark:border-[#28362F]">
                      —
                    </td>
                    {wrongCountPerQuestion.map((wrongCount, qIdx) => {
                      const highError =
                        filteredRows.length > 0 &&
                        wrongCount / filteredRows.length >= 0.5;
                      return (
                        <td
                          key={qIdx}
                          title={`Soal ${qIdx + 1}: ${wrongCount} dari ${filteredRows.length} siswa salah`}
                          className={`font-mono-tabular border-t border-[#D4DDD8] px-1 py-2 text-center dark:border-[#28362F] ${
                            highError
                              ? 'bg-[#FEE4E2] font-bold text-[#912018] dark:bg-[#4A1C1A] dark:text-[#FECACA]'
                              : wrongCount > 0
                                ? 'text-[#B42318] dark:text-[#FDA29B]'
                                : 'text-[#52635C] dark:text-[#9AAAA2]'
                          }`}
                        >
                          {wrongCount}
                        </td>
                      );
                    })}
                    <td
                      colSpan={5}
                      className="border-t border-l border-[#D4DDD8] px-2.5 py-2 text-left text-[11px] font-normal dark:border-[#28362F]"
                    >
                      Total salah per butir soal
                    </td>
                    <td className="sticky right-0 z-10 border-t border-l border-[#D4DDD8] bg-[#FAFBFB] px-2 py-2 dark:border-[#28362F] dark:bg-[#121916]" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#52635C] dark:text-[#9AAAA2]">
            <p>
              Ketuk sel mana saja untuk mengedit langsung. Kotak kuning
              bergaris putus menandakan jawaban masih kosong
              {hasKey
                ? '; kotak merah menandakan jawaban tidak sesuai kunci dan kotak hijau menandakan benar.'
                : '.'}
            </p>
            {questionCount > 15 && (
              <p className="font-medium">
                Geser tabel ke kanan untuk melihat nomor soal hingga{' '}
                {questionCount}.
              </p>
            )}
          </div>
        </>
      )}

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#C5D8CF] bg-[#EDF5F1] px-3.5 py-2.5 text-sm font-medium text-[#144332] dark:border-[#2B463B] dark:bg-[#193026] dark:text-[#A6E8CE]"
        >
          <span>{statusMessage}</span>
          {canUndoDelete && (
            <button
              type="button"
              onClick={onUndoDelete}
              className="shrink-0 cursor-pointer rounded-md border border-[#1B6B4F] bg-white px-3 py-1 text-xs font-semibold text-[#1B6B4F] transition-colors hover:bg-[#DCEEE6] dark:border-[#4AC294] dark:bg-[#121D18] dark:text-[#58C49B] dark:hover:bg-[#1F3A2F]"
            >
              Urungkan hapus
            </button>
          )}
        </div>
      )}

      {clipboardFallbackText && (
        <textarea
          readOnly
          value={clipboardFallbackText}
          onFocus={(e) => e.target.select()}
          aria-label="Teks tabel siap salin ke Excel"
          rows={4}
          className="font-mono-tabular w-full rounded-lg border border-[#D4DDD8] bg-[#F8FAF9] p-3 text-xs text-[#14211C] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
        />
      )}
    </section>
  );
}
