import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Trash2,
} from 'lucide-react';
import type { AnswerLetter, StudentRow } from '../types/sheet';
import {
  countReadableTokens,
  normalizeAnswers,
  parseBulkAnswers,
} from '../utils/answerParser';

interface AnswerEntrySectionProps {
  rows: StudentRow[];
  questionCount: number;
  selectedId: number | null;
  currentQuestionIdx: number;
  onSelectStudent: (id: number) => void;
  onSelectQuestion: (idx: number) => void;
  onSetAnswer: (letter: AnswerLetter) => void;
  onApplyBulkAnswers: (answers: AnswerLetter[]) => void;
  onRemoveStudent: (id: number) => void;
  onFocusAddStudent: () => void;
}

const OPTIONS: Array<Exclude<AnswerLetter, ''>> = ['A', 'B', 'C', 'D', 'E'];

export function AnswerEntrySection({
  rows,
  questionCount,
  selectedId,
  currentQuestionIdx,
  onSelectStudent,
  onSelectQuestion,
  onSetAnswer,
  onApplyBulkAnswers,
  onRemoveStudent,
  onFocusAddStudent,
}: AnswerEntrySectionProps) {
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [rangeFilter, setRangeFilter] = useState<'all' | 'empty' | number>('all');

  const selectedIndex = rows.findIndex((r) => r.id === selectedId);
  const activeStudent = selectedIndex >= 0 ? rows[selectedIndex] : null;
  const safeQuestionIdx = Math.min(
    Math.max(0, currentQuestionIdx),
    Math.max(0, questionCount - 1),
  );

  const normAnswers = useMemo(
    () =>
      activeStudent
        ? normalizeAnswers(activeStudent.jawaban, questionCount)
        : [],
    [activeStudent, questionCount],
  );

  const filledCount = normAnswers.filter((a) => a !== '').length;
  const emptyCount = questionCount - filledCount;

  // Build pagination chunks of 30 when questionCount > 30
  const chunks = useMemo(() => {
    if (questionCount <= 30) return [];
    const list: Array<{ start: number; end: number; label: string }> = [];
    for (let start = 0; start < questionCount; start += 30) {
      const end = Math.min(questionCount - 1, start + 29);
      list.push({
        start,
        end,
        label: `${start + 1}–${end + 1}`,
      });
    }
    return list;
  }, [questionCount]);

  useEffect(() => {
    if (questionCount <= 30 && typeof rangeFilter === 'number') {
      setRangeFilter('all');
    } else if (
      typeof rangeFilter === 'number' &&
      rangeFilter >= questionCount
    ) {
      setRangeFilter('all');
    }
  }, [questionCount, rangeFilter]);

  const visibleIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < questionCount; i++) {
      if (rangeFilter === 'empty') {
        if (!normAnswers[i]) indices.push(i);
      } else if (typeof rangeFilter === 'number') {
        if (i >= rangeFilter && i < rangeFilter + 30) indices.push(i);
      } else {
        indices.push(i);
      }
    }
    return indices;
  }, [questionCount, rangeFilter, normAnswers]);

  function handleKeyboardEntry(e: KeyboardEvent<HTMLElement>) {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT')
    ) {
      return;
    }
    if (!activeStudent) return;

    const key = e.key.toUpperCase();
    if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
      e.preventDefault();
      onSetAnswer(key as AnswerLetter);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      onSetAnswer('');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSelectQuestion(Math.min(questionCount - 1, safeQuestionIdx + 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSelectQuestion(Math.max(0, safeQuestionIdx - 1));
    }
  }

  function handleApplyBulk() {
    if (!activeStudent) return;
    const parsed = parseBulkAnswers(bulkInput, questionCount);
    onApplyBulkAnswers(parsed);
    setBulkInput('');
  }

  const studentLabel = activeStudent
    ? activeStudent.nama || `Siswa ${selectedIndex + 1}`
    : '';

  return (
    <section
      id="isi-jawaban"
      aria-labelledby="heading-isi-jawaban"
      onKeyDown={handleKeyboardEntry}
      className="flex flex-col gap-5 rounded-xl border border-[#D4DDD8] bg-white p-5 sm:p-6 dark:border-[#28362F] dark:bg-[#161F1B]"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1B6B4F] text-sm font-bold text-white dark:bg-[#4AC294] dark:text-[#0B1712]">
            3
          </span>
          <div>
            <h2
              id="heading-isi-jawaban"
              className="text-base font-bold text-[#14211C] dark:text-[#E6EEE9]"
            >
              Isi jawaban siswa
            </h2>
            <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
              Pilih nomor soal lalu ketuk huruf jawaban atau tekan tombol A–E
              pada keyboard
            </p>
          </div>
        </div>

        {activeStudent && (
          <div className="font-mono-tabular flex items-center gap-2 text-xs text-[#52635C] dark:text-[#9AAAA2]">
            <span>
              {filledCount}/{questionCount} terisi
            </span>
            <span aria-hidden="true">·</span>
            <span>{emptyCount} kosong</span>
          </div>
        )}
      </div>

      {!activeStudent ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-[#C7D4CD] bg-[#F8FAF9] p-5 dark:border-[#2D3D35] dark:bg-[#121A16]">
          <p className="text-sm text-[#52635C] dark:text-[#9AAAA2]">
            Belum ada siswa yang dipilih. Tambahkan siswa pada langkah 2 untuk
            mulai mengisi lembar jawaban.
          </p>
          <button
            type="button"
            onClick={onFocusAddStudent}
            className="btn-gesture btn-surface-primary min-h-[40px] cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Tambah Siswa Pertama
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Student switcher */}
          <div className="flex flex-col gap-3 border-b border-[#E3EAE6] pb-4 sm:flex-row sm:items-end sm:justify-between dark:border-[#24322B]">
            <div className="flex w-full flex-col gap-1.5 sm:max-w-md">
              <label
                htmlFor="active-student-select"
                className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
              >
                Siswa yang sedang diisi
              </label>
              <select
                id="active-student-select"
                value={activeStudent.id}
                onChange={(e) => onSelectStudent(Number(e.target.value))}
                className="h-11 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-sm font-medium text-[#14211C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
              >
                {rows.map((row, idx) => (
                  <option key={row.id} value={row.id}>
                    {idx + 1}. {row.nama || `Siswa ${idx + 1}`}
                    {row.kelas ? ` (${row.kelas})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={selectedIndex <= 0}
                onClick={() =>
                  selectedIndex > 0 && onSelectStudent(rows[selectedIndex - 1].id)
                }
                className="btn-gesture btn-surface-secondary inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="btn-nudge-left h-4 w-4" aria-hidden="true" />
                <span>Siswa Sebelumnya</span>
              </button>
              <button
                type="button"
                disabled={selectedIndex >= rows.length - 1}
                onClick={() =>
                  selectedIndex < rows.length - 1 &&
                  onSelectStudent(rows[selectedIndex + 1].id)
                }
                className="btn-gesture btn-surface-secondary inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>Siswa Berikutnya</span>
                <ChevronRight className="btn-nudge-right h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onRemoveStudent(activeStudent.id)}
                className="btn-gesture btn-surface-danger inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Hapus siswa</span>
              </button>
            </div>
          </div>

          {/* 2-column entry layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            {/* Question chip matrix */}
            <div className="flex flex-col gap-3 lg:col-span-7">
              {questionCount > 30 && (
                <div
                  role="tablist"
                  aria-label="Filter rentang nomor soal"
                  className="flex flex-wrap items-center gap-1 rounded-lg bg-[#EFF3F1] p-1 dark:bg-[#111915]"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rangeFilter === 'all'}
                    onClick={() => setRangeFilter('all')}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                      rangeFilter === 'all'
                        ? 'bg-white text-[#14211C] shadow-xs dark:bg-[#1D2923] dark:text-[#E6EEE9]'
                        : 'text-[#52635C] hover:text-[#14211C] dark:text-[#9AAAA2] dark:hover:text-[#E6EEE9]'
                    }`}
                  >
                    Semua ({questionCount})
                  </button>
                  {chunks.map((chunk) => (
                    <button
                      key={chunk.start}
                      type="button"
                      role="tab"
                      aria-selected={rangeFilter === chunk.start}
                      onClick={() => {
                        setRangeFilter(chunk.start);
                        if (
                          safeQuestionIdx < chunk.start ||
                          safeQuestionIdx > chunk.end
                        ) {
                          onSelectQuestion(chunk.start);
                        }
                      }}
                      className={`font-mono-tabular cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                        rangeFilter === chunk.start
                          ? 'bg-white text-[#14211C] shadow-xs dark:bg-[#1D2923] dark:text-[#E6EEE9]'
                          : 'text-[#52635C] hover:text-[#14211C] dark:text-[#9AAAA2] dark:hover:text-[#E6EEE9]'
                      }`}
                    >
                      {chunk.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rangeFilter === 'empty'}
                    onClick={() => setRangeFilter('empty')}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                      rangeFilter === 'empty'
                        ? 'bg-white text-[#14211C] shadow-xs dark:bg-[#1D2923] dark:text-[#E6EEE9]'
                        : 'text-[#52635C] hover:text-[#14211C] dark:text-[#9AAAA2] dark:hover:text-[#E6EEE9]'
                    }`}
                  >
                    Belum Diisi ({emptyCount})
                  </button>
                </div>
              )}

              {visibleIndices.length === 0 ? (
                <p className="rounded-lg border border-[#E3EAE6] bg-[#F8FAF9] p-4 text-sm text-[#52635C] dark:border-[#24322B] dark:bg-[#121A16] dark:text-[#9AAAA2]">
                  Semua nomor soal untuk siswa ini sudah terisi.
                </p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1.5">
                  {visibleIndices.map((idx) => {
                    const ans = normAnswers[idx];
                    const isCurrent = idx === safeQuestionIdx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onSelectQuestion(idx)}
                        aria-pressed={isCurrent}
                        aria-label={`Nomor ${idx + 1}${ans ? `, jawaban ${ans}` : ', belum diisi'}`}
                        className={`font-mono-tabular flex min-h-[50px] cursor-pointer flex-col items-center justify-center rounded-lg border px-1 py-1 leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] ${
                          isCurrent
                            ? 'border-2 border-[#1B6B4F] bg-[#DCEEE6] text-[#10291F] dark:border-[#4AC294] dark:bg-[#1F3D31] dark:text-[#E6EEE9]'
                            : ans
                              ? 'border-[#C5D8CF] bg-[#EDF5F1] text-[#14211C] hover:border-[#1B6B4F]/60 dark:border-[#2B463B] dark:bg-[#1A2F26] dark:text-[#E6EEE9]'
                              : 'border-[#D4DDD8] bg-white text-[#14211C] hover:border-[#1B6B4F]/50 dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]'
                        }`}
                      >
                        <span
                          className={`text-[11px] ${
                            isCurrent
                              ? 'font-semibold text-[#1B6B4F] dark:text-[#58C49B]'
                              : 'text-[#5E7068] dark:text-[#8E9F97]'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-base font-bold">{ans || '·'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active answer keypad & bulk input */}
            <div className="flex flex-col gap-4 border-t border-[#E3EAE6] pt-4 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6 dark:border-[#24322B]">
              <div>
                <p className="text-xs font-medium text-[#52635C] dark:text-[#9AAAA2]">
                  Siswa: <strong className="text-[#14211C] dark:text-[#E6EEE9]">{studentLabel}</strong>
                </p>
                <p
                  aria-live="polite"
                  className="mt-1 text-base font-bold text-[#14211C] dark:text-[#E6EEE9]"
                >
                  Nomor{' '}
                  <span className="font-mono-tabular text-[#1B6B4F] dark:text-[#58C49B]">
                    {safeQuestionIdx + 1}
                  </span>{' '}
                  dari {questionCount}
                </p>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {OPTIONS.map((opt) => {
                  const isPicked = normAnswers[safeQuestionIdx] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onSetAnswer(opt)}
                      className={`btn-gesture font-mono-tabular min-h-[56px] cursor-pointer rounded-xl text-xl font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] ${
                        isPicked
                          ? 'btn-surface-primary ring-2 ring-[#D99B4E]/60'
                          : 'btn-surface-primary'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => onSetAnswer('')}
                className="btn-gesture btn-surface-secondary inline-flex min-h-[42px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F]"
              >
                <Eraser className="h-4 w-4" aria-hidden="true" />
                <span>Kosongkan nomor {safeQuestionIdx + 1}</span>
              </button>

              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Pintasan papan ketik: tekan huruf A–E untuk mengisi otomatis dan
                lanjut ke nomor berikutnya, atau panah kiri/kanan untuk
                berpindah soal.
              </p>

              <div className="border-t border-[#E3EAE6] pt-3 dark:border-[#24322B]">
                <button
                  type="button"
                  onClick={() => setShowBulkPanel((v) => !v)}
                  aria-expanded={showBulkPanel}
                  className="flex w-full cursor-pointer items-center justify-between py-1 text-left text-sm font-semibold text-[#14211C] dark:text-[#E6EEE9]"
                >
                  <span>Ketik atau tempel semua jawaban sekaligus</span>
                  <ChevronDown
                    className={`h-4 w-4 text-[#52635C] transition-transform duration-150 dark:text-[#9AAAA2] ${
                      showBulkPanel ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {showBulkPanel && (
                  <div className="mt-3 flex flex-col gap-2.5">
                    <textarea
                      rows={3}
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      autoCapitalize="characters"
                      aria-label="Jawaban berurutan untuk siswa ini"
                      placeholder={`Tempel hingga ${questionCount} huruf (contoh: BCADD... atau 1.A 2.B ... 40.D). Gunakan tanda minus (-) jika kosong.`}
                      className="font-mono-tabular w-full rounded-lg border border-[#D4DDD8] bg-white p-3 text-sm uppercase tracking-wider text-[#14211C] placeholder:normal-case placeholder:tracking-normal placeholder:text-[#7B8B84] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tabular text-xs text-[#52635C] dark:text-[#9AAAA2]">
                        Terbaca {countReadableTokens(bulkInput)} dari{' '}
                        {questionCount} butir
                      </span>
                      <button
                        type="button"
                        onClick={handleApplyBulk}
                        disabled={!bulkInput.trim()}
                        className="btn-gesture btn-surface-primary min-h-[38px] shrink-0 cursor-pointer rounded-xl px-3.5 text-xs font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Terapkan ke Siswa Ini
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
