import {
  ArrowRight,
  CheckSquare,
  ClipboardList,
  Moon,
  Sun,
} from 'lucide-react';
import type { ActiveLayout, ButtonStyleMode } from '../types/sheet';
import { ButtonStylePicker } from './ButtonStylePicker';
import { PWAInstallBar } from './PWAInstallBar';

interface HomeBerandaSectionProps {
  abcRowsCount: number;
  abcQuestionCount: number;
  abcExamTitle: string;
  uraianRowsCount: number;
  uraianItemCount: number;
  uraianExamTitle: string;
  darkMode: boolean;
  buttonStyle: ButtonStyleMode;
  onToggleDarkMode: () => void;
  onChangeButtonStyle: (style: ButtonStyleMode) => void;
  onSelectLayout: (layout: Exclude<ActiveLayout, 'beranda'>) => void;
}

export function HomeBerandaSection({
  abcRowsCount,
  abcQuestionCount,
  abcExamTitle,
  uraianRowsCount,
  uraianItemCount,
  uraianExamTitle,
  darkMode,
  buttonStyle,
  onToggleDarkMode,
  onChangeButtonStyle,
  onSelectLayout,
}: HomeBerandaSectionProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Compact Header & Interactive Style Controls */}
      <div className="flex flex-col gap-4 border-b border-[#D4DDD8] pb-5 lg:flex-row lg:items-end lg:justify-between dark:border-[#28362F]">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-balance text-2xl font-bold tracking-tight text-[#14211C] sm:text-3xl dark:text-[#E6EEE9]">
            Pilih Mode Penilaian
          </h1>
          <p className="text-sm text-[#52635C] dark:text-[#9AAAA2]">
            Pilihan ganda (ABC) atau angket &amp; soal uraian.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ButtonStylePicker
            buttonStyle={buttonStyle}
            onChangeButtonStyle={onChangeButtonStyle}
          />
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="btn-gesture btn-surface-secondary inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
          >
            {darkMode ? (
              <Sun className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Moon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{darkMode ? 'Terang' : 'Gelap'}</span>
          </button>
          <PWAInstallBar />
        </div>
      </div>

      {/* Two Interactive Choice Cards (Minimal Text, High Clarity) */}
      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
        {/* Pilihan Ganda (ABC) */}
        <article className="group flex flex-col justify-between gap-6 rounded-2xl border border-[#D4DDD8] bg-white p-6 transition-transform duration-150 hover:-translate-y-0.5 sm:p-7 dark:border-[#28362F] dark:bg-[#161F1B]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1B6B4F] dark:text-[#58C49B]">
                Tata Letak 2 · Pilihan Ganda
              </span>
              <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-[#EAF4EF] text-[#1B6B4F] dark:bg-[#193026] dark:text-[#58C49B]">
                <CheckSquare className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-[#14211C] sm:text-2xl dark:text-[#E6EEE9]">
              Mode Pilihan Ganda (ABC)
            </h2>
            <p className="text-sm text-[#52635C] dark:text-[#9AAAA2]">
              Input cepat A–E · Kunci otomatis · Excel &amp; 7 analisis Anates.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E3EAE6] pt-4 dark:border-[#24322B]">
            <div className="font-mono-tabular flex items-center gap-2 text-xs text-[#52635C] dark:text-[#9AAAA2]">
              <span>{abcRowsCount} siswa</span>
              <span aria-hidden="true">·</span>
              <span>{abcQuestionCount} soal</span>
              {abcExamTitle.trim() && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="max-w-[140px] truncate">{abcExamTitle}</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => onSelectLayout('abc')}
              className="btn-gesture btn-surface-primary inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold whitespace-nowrap"
            >
              <span>Buka Mode ABC</span>
              <ArrowRight
                className="btn-nudge-right h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            </button>
          </div>
        </article>

        {/* Angket / Uraian */}
        <article className="group flex flex-col justify-between gap-6 rounded-2xl border border-[#D4DDD8] bg-white p-6 transition-transform duration-150 hover:-translate-y-0.5 sm:p-7 dark:border-[#28362F] dark:bg-[#161F1B]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8A511D] dark:text-[#E5B076]">
                Tata Letak 3 · Angket &amp; Esai
              </span>
              <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-[#F7ECE0] text-[#8A511D] dark:bg-[#332417] dark:text-[#E5B076]">
                <ClipboardList className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-[#14211C] sm:text-2xl dark:text-[#E6EEE9]">
              Mode Angket &amp; Uraian
            </h2>
            <p className="text-sm text-[#52635C] dark:text-[#9AAAA2]">
              Skala 1–4 / 1–5 &amp; bobot esai · Excel &amp; Alpha Cronbach.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E3EAE6] pt-4 dark:border-[#24322B]">
            <div className="font-mono-tabular flex items-center gap-2 text-xs text-[#52635C] dark:text-[#9AAAA2]">
              <span>{uraianRowsCount} responden</span>
              <span aria-hidden="true">·</span>
              <span>{uraianItemCount} butir</span>
              {uraianExamTitle.trim() && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="max-w-[140px] truncate">{uraianExamTitle}</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => onSelectLayout('uraian')}
              className="btn-gesture btn-surface-primary inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold whitespace-nowrap"
            >
              <span>Buka Angket / Uraian</span>
              <ArrowRight
                className="btn-nudge-right h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
