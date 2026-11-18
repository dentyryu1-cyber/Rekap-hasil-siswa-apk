import { ArrowRight, Download } from 'lucide-react';
import type { ActiveLayout } from '../types/sheet';
import { BrandLogo } from './BrandLogo';

interface TopBarProps {
  activeLayout: ActiveLayout;
  hasRows: boolean;
  onSelectLayout: (layout: ActiveLayout) => void;
  onDownloadExcel: () => void;
}

export function TopBar({
  activeLayout,
  hasRows,
  onSelectLayout,
  onDownloadExcel,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#D4DDD8] bg-white/95 backdrop-blur-sm dark:border-[#28362F] dark:bg-[#131B17]/95">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => onSelectLayout('beranda')}
          className="btn-gesture inline-flex shrink-0 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg text-left text-lg font-bold tracking-tight text-[#14211C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] dark:text-[#E6EEE9]"
        >
          <BrandLogo size={32} className="shrink-0" />
          <span>
            rekapin
            <span className="text-[#9C5718] dark:text-[#E6B16A]">Jx</span>
          </span>
        </button>

        {activeLayout === 'beranda' ? (
          <nav
            aria-label="Navigasi tata letak"
            className="hidden items-center gap-6 text-sm font-medium text-[#52635C] md:flex dark:text-[#9AAAA2]"
          >
            <button
              type="button"
              onClick={() => onSelectLayout('beranda')}
              className="shrink-0 cursor-pointer whitespace-nowrap font-semibold text-[#14211C] underline underline-offset-4 dark:text-[#E6EEE9]"
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => onSelectLayout('abc')}
              className="shrink-0 cursor-pointer whitespace-nowrap transition-colors hover:text-[#14211C] hover:underline hover:underline-offset-4 dark:hover:text-[#E6EEE9]"
            >
              Pilihan Ganda (ABC)
            </button>
            <button
              type="button"
              onClick={() => onSelectLayout('uraian')}
              className="shrink-0 cursor-pointer whitespace-nowrap transition-colors hover:text-[#14211C] hover:underline hover:underline-offset-4 dark:hover:text-[#E6EEE9]"
            >
              Angket &amp; Uraian
            </button>
          </nav>
        ) : activeLayout === 'abc' ? (
          <nav
            aria-label="Navigasi bagian pilihan ganda"
            className="hidden items-center gap-6 text-sm font-medium text-[#52635C] md:flex dark:text-[#9AAAA2]"
          >
            <button
              type="button"
              onClick={() => onSelectLayout('beranda')}
              className="shrink-0 cursor-pointer whitespace-nowrap transition-colors hover:text-[#14211C] hover:underline hover:underline-offset-4 dark:hover:text-[#E6EEE9]"
            >
              Beranda
            </button>
            <a
              href="#pengaturan"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-[#14211C] hover:underline hover:underline-offset-4 dark:hover:text-[#E6EEE9]"
            >
              Pengaturan
            </a>
            <a
              href="#isi-jawaban"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-[#14211C] hover:underline hover:underline-offset-4 dark:hover:text-[#E6EEE9]"
            >
              Isi Jawaban
            </a>
            <a
              href="#tabel-data"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-[#14211C] hover:underline hover:underline-offset-4 dark:hover:text-[#E6EEE9]"
            >
              Tabel Data
            </a>
            <a
              href="#analisis-butir"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-[#14211C] hover:underline hover:underline-offset-4 dark:hover:text-[#E6EEE9]"
            >
              Olah Data
            </a>
          </nav>
        ) : (
          <nav
            aria-label="Navigasi bagian angket dan uraian"
            className="hidden items-center gap-6 text-sm font-medium text-[#52635C] md:flex dark:text-[#9AAAA2]"
          >
            <button
              type="button"
              onClick={() => onSelectLayout('beranda')}
              className="shrink-0 cursor-pointer whitespace-nowrap transition-colors hover:text-[#14211C] hover:underline hover:underline-offset-4 dark:hover:text-[#E6EEE9]"
            >
              Beranda
            </button>
            <a
              href="#uraian-pengaturan"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-[#14211C] hover:underline hover:underline-offset-4 dark:hover:text-[#E6EEE9]"
            >
              Pengaturan
            </a>
            <a
              href="#uraian-input"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-[#14211C] hover:underline hover:underline-offset-4 dark:hover:text-[#E6EEE9]"
            >
              Input Skor
            </a>
            <a
              href="#uraian-tabel"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-[#14211C] hover:underline hover:underline-offset-4 dark:hover:text-[#E6EEE9]"
            >
              Tabel Skor
            </a>
            <a
              href="#uraian-analisis"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-[#14211C] hover:underline hover:underline-offset-4 dark:hover:text-[#E6EEE9]"
            >
              Olah Data
            </a>
          </nav>
        )}

        <div className="shrink-0">
          {activeLayout === 'beranda' ? (
            <button
              type="button"
              onClick={() => onSelectLayout('abc')}
              className="btn-gesture btn-surface-primary inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F]"
            >
              <span>Mulai Mode ABC</span>
              <ArrowRight className="btn-nudge-right h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onDownloadExcel}
              disabled={!hasRows}
              className="btn-gesture btn-surface-primary inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Download className="btn-nudge-up h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Unduh Excel</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
