import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { ScoreValue, UraianStudentRow } from '../types/sheet';
import {
  computeUraianStudentStats,
  countReadableScoreTokens,
  normalizeMaxScores,
  normalizeScores,
  parseBulkScores,
} from '../utils/uraianAnalysis';

interface UraianEntrySectionProps {
  rows: UraianStudentRow[];
  itemCount: number;
  scaleMin: number;
  defaultMaxScore: number;
  itemMaxScores: number[];
  selectedId: number | null;
  currentItemIdx: number;
  onSelectStudent: (id: number) => void;
  onSelectItem: (itemIdx: number) => void;
  onSetScore: (score: ScoreValue) => void;
  onApplyBulkScores: (scores: ScoreValue[]) => void;
  onRemoveStudent: (id: number) => void;
  onFocusAddStudent: () => void;
}

export function UraianEntrySection({
  rows,
  itemCount,
  scaleMin,
  defaultMaxScore,
  itemMaxScores,
  selectedId,
  currentItemIdx,
  onSelectStudent,
  onSelectItem,
  onSetScore,
  onApplyBulkScores,
  onRemoveStudent,
  onFocusAddStudent,
}: UraianEntrySectionProps) {
  const [bulkText, setBulkText] = useState('');

  const normMax = normalizeMaxScores(
    itemMaxScores,
    itemCount,
    defaultMaxScore,
    scaleMin,
  );

  const selectedStudent = rows.find((r) => r.id === selectedId) ?? null;
  const studentScores = selectedStudent
    ? normalizeScores(selectedStudent.scores, itemCount, scaleMin, normMax)
    : [];
  const stats = selectedStudent
    ? computeUraianStudentStats(studentScores, itemCount, normMax)
    : null;

  const activeMax = normMax[currentItemIdx] ?? defaultMaxScore;
  const currentScore = selectedStudent ? studentScores[currentItemIdx] : null;

  const quickButtons: number[] = [];
  if (activeMax - scaleMin <= 15) {
    for (let v = scaleMin; v <= Math.floor(activeMax); v++) {
      quickButtons.push(v);
    }
  } else {
    // Provide intuitive steps for larger essay max scores (e.g., 0..20 or 0..25)
    const step = activeMax <= 20 ? 2 : 5;
    for (let v = scaleMin; v <= activeMax; v += step) {
      quickButtons.push(v);
    }
    if (quickButtons[quickButtons.length - 1] !== activeMax) {
      quickButtons.push(activeMax);
    }
  }

  function handleBulkApply() {
    if (!selectedStudent || !bulkText.trim()) return;
    const parsed = parseBulkScores(bulkText, itemCount, scaleMin, normMax);
    onApplyBulkScores(parsed);
    setBulkText('');
  }

  return (
    <section
      id="uraian-input"
      aria-labelledby="heading-uraian-input"
      className="flex flex-col gap-5 rounded-xl border border-[#D4DDD8] bg-white p-5 sm:p-6 dark:border-[#28362F] dark:bg-[#161F1B]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1B6B4F] text-sm font-bold text-white dark:bg-[#4AC294] dark:text-[#0B1712]">
            3
          </span>
          <div>
            <h2
              id="heading-uraian-input"
              className="text-base font-bold text-[#14211C] dark:text-[#E6EEE9]"
            >
              Input skor butir angket / uraian
            </h2>
            <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
              Ketuk skor angka cepat atau tempel deretan skor per responden
            </p>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="uraian-active-student" className="sr-only">
              Pilih peserta aktif
            </label>
            <select
              id="uraian-active-student"
              value={selectedId ?? ''}
              onChange={(e) => onSelectStudent(Number(e.target.value))}
              className="h-10 max-w-xs rounded-lg border border-[#D4DDD8] bg-white px-3 text-sm font-medium text-[#14211C] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
            >
              {rows.map((r, idx) => (
                <option key={r.id} value={r.id}>
                  {idx + 1}. {r.nama} {r.kelas ? `(${r.kelas})` : ''}
                </option>
              ))}
            </select>
            {selectedStudent && (
              <button
                type="button"
                onClick={() => onRemoveStudent(selectedStudent.id)}
                className="btn-gesture btn-surface-danger inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-semibold whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Hapus</span>
              </button>
            )}
          </div>
        )}
      </div>

      {!selectedStudent ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-[#C7D4CD] bg-[#F8FAF9] p-6 dark:border-[#2D3D35] dark:bg-[#121A16]">
          <p className="text-sm text-[#52635C] dark:text-[#9AAAA2]">
            Belum ada siswa / responden yang ditambahkan. Tambahkan peserta di
            Langkah 2 untuk mulai menginput skor.
          </p>
          <button
            type="button"
            onClick={onFocusAddStudent}
            className="btn-gesture btn-surface-primary inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <UserPlus className="btn-nudge-up h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Tambah Peserta Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Quick Score Pad */}
          <div className="flex flex-col gap-4 lg:col-span-6">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E3EAE6] bg-[#F8FAF9] px-4 py-3 dark:border-[#24322B] dark:bg-[#111915]">
              <div>
                <div className="text-sm font-bold text-[#14211C] dark:text-[#E6EEE9]">
                  Butir ke-{currentItemIdx + 1} dari {itemCount}
                </div>
                <div className="font-mono-tabular text-xs text-[#52635C] dark:text-[#9AAAA2]">
                  Rentang skor: {scaleMin} s.d. {activeMax} · Terisi:{' '}
                  {stats?.filled}/{itemCount} · Total: {stats?.totalScore}/
                  {stats?.maxPossible}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentItemIdx === 0}
                  onClick={() => onSelectItem(Math.max(0, currentItemIdx - 1))}
                  aria-label="Butir sebelumnya"
                  className="btn-gesture btn-surface-secondary inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl disabled:opacity-40"
                >
                  <ChevronLeft className="btn-nudge-left h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={currentItemIdx >= itemCount - 1}
                  onClick={() =>
                    onSelectItem(Math.min(itemCount - 1, currentItemIdx + 1))
                  }
                  aria-label="Butir berikutnya"
                  className="btn-gesture btn-surface-secondary inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl disabled:opacity-40"
                >
                  <ChevronRight className="btn-nudge-right h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {quickButtons.map((val) => {
                const isSelected = currentScore === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onSetScore(val)}
                    className={`btn-gesture font-mono-tabular inline-flex h-11 min-w-[46px] cursor-pointer items-center justify-center rounded-xl px-3 text-sm font-bold ${
                      isSelected
                        ? 'btn-surface-primary ring-2 ring-[#D99B4E]/60'
                        : 'btn-surface-primary'
                    }`}
                  >
                    {val}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => onSetScore(null)}
                className="btn-gesture btn-surface-secondary inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-semibold"
              >
                <Eraser className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Kosongkan</span>
              </button>
            </div>

            {/* Bulk score paste */}
            <div className="flex flex-col gap-2 border-t border-[#E3EAE6] pt-3 dark:border-[#24322B]">
              <label
                htmlFor="uraian-bulk-scores"
                className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
              >
                Tempel seluruh skor sekaligus (pisah spasi, koma, atau tab)
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="uraian-bulk-scores"
                  type="text"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Contoh: 4 5 3 4 5 atau 8, 7, 9, 10"
                  className="font-mono-tabular h-10 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-sm text-[#14211C] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
                />
                <button
                  type="button"
                  onClick={handleBulkApply}
                  disabled={!bulkText.trim()}
                  className="btn-gesture btn-surface-primary h-10 shrink-0 cursor-pointer rounded-xl px-4 text-xs font-semibold whitespace-nowrap disabled:opacity-40"
                >
                  Terapkan
                </button>
              </div>
              {bulkText.trim() && (
                <p className="font-mono-tabular text-xs text-[#52635C] dark:text-[#9AAAA2]">
                  Terbaca {countReadableScoreTokens(bulkText)} dari {itemCount}{' '}
                  butir
                </p>
              )}
            </div>
          </div>

          {/* Right: Item Grid Navigator */}
          <div className="flex flex-col gap-2 lg:col-span-6">
            <span className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]">
              Peta skor butir ({selectedStudent.nama})
            </span>
            <div className="grid max-h-64 grid-cols-5 gap-1.5 overflow-y-auto rounded-lg border border-[#E3EAE6] bg-[#F8FAF9] p-3 sm:grid-cols-8 md:grid-cols-10 dark:border-[#24322B] dark:bg-[#111915]">
              {Array.from({ length: itemCount }, (_, idx) => {
                const val = studentScores[idx];
                const isCurrent = idx === currentItemIdx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectItem(idx)}
                    className={`font-mono-tabular flex flex-col items-center justify-center rounded-md border py-1.5 text-xs transition-colors ${
                      isCurrent
                        ? 'border-[#1B6B4F] bg-[#1B6B4F] text-white dark:border-[#4AC294] dark:bg-[#4AC294] dark:text-[#0B1712]'
                        : val !== null
                          ? 'border-[#C9DDD3] bg-white font-semibold text-[#14211C] hover:bg-[#EAF2EE] dark:border-[#2D3E35] dark:bg-[#1B2621] dark:text-[#E6EEE9]'
                          : 'border-[#E3EAE6] bg-[#FAFBFB] text-[#7B8B84] hover:bg-[#EAF2EE] dark:border-[#24322B] dark:bg-[#141C18] dark:text-[#75867E]'
                    }`}
                  >
                    <span className="text-[10px] opacity-75">{idx + 1}</span>
                    <span className="font-bold">
                      {val !== null ? val : '·'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
