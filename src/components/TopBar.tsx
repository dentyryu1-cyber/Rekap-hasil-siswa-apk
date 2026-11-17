import { Download } from 'lucide-react';

interface TopBarProps {
  hasRows: boolean;
  onDownloadExcel: () => void;
}

export function TopBar({ hasRows, onDownloadExcel }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#D4DDD8] bg-white/95 backdrop-blur-sm dark:border-[#28362F] dark:bg-[#131B17]/95">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="shrink-0 whitespace-nowrap text-lg font-bold tracking-tight text-[#14211C] dark:text-[#E6EEE9]"
        >
          Rekap Lembar Jawaban
        </a>

        <nav
          aria-label="Navigasi bagian"
          className="hidden items-center gap-6 text-sm font-medium text-[#52635C] md:flex dark:text-[#9AAAA2]"
        >
          <a
            href="#pengaturan"
            className="shrink-0 whitespace-nowrap transition-colors hover:text-[#14211C] hover:underline hover:underline-offset-4 dark:hover:text-[#E6EEE9]"
          >
            Pengaturan
          </a>
          <a
            href="#siswa"
            className="shrink-0 whitespace-nowrap transition-colors hover:text-[#14211C] hover:underline hover:underline-offset-4 dark:hover:text-[#E6EEE9]"
          >
            Siswa
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
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onDownloadExcel}
            disabled={!hasRows}
            className="inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg bg-[#1B6B4F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#15563F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] disabled:cursor-not-allowed disabled:opacity-45 dark:bg-[#4AC294] dark:text-[#0B1712] dark:hover:bg-[#3BB084]"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Unduh Excel</span>
          </button>
        </div>
      </div>
    </header>
  );
}
