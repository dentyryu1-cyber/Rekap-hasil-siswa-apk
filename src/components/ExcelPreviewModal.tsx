import { useEffect, useState } from 'react';
import { FileSpreadsheet, X } from 'lucide-react';
import type { ExcelPreviewWorkbook } from '../utils/excelExport';

interface ExcelPreviewModalProps {
  isOpen: boolean;
  preview: ExcelPreviewWorkbook | null;
  onClose: () => void;
  onConfirmDownload: () => void;
}

export function ExcelPreviewModal({
  isOpen,
  preview,
  onClose,
  onConfirmDownload,
}: ExcelPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<
    'main' | 'summary' | 'analysis' | 'groups'
  >('main');

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('main');

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !preview) return null;

  const sheetCount =
    2 + (preview.analysisSheet ? 1 : 0) + (preview.groupsSheet ? 1 : 0);

  const activeSheet =
    activeTab === 'main'
      ? preview.mainSheet
      : activeTab === 'summary'
        ? preview.summarySheet
        : activeTab === 'analysis' && preview.analysisSheet
          ? preview.analysisSheet
          : activeTab === 'groups' && preview.groupsSheet
            ? preview.groupsSheet
            : preview.mainSheet;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="excel-preview-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[#D4DDD8] bg-white shadow-xl dark:border-[#28362F] dark:bg-[#161F1B]"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E3EAE6] px-5 py-4 sm:px-6 dark:border-[#24322B]">
          <div className="min-w-0">
            <h2
              id="excel-preview-title"
              className="text-lg font-bold text-[#14211C] dark:text-[#E6EEE9]"
            >
              Pratinjau Data Excel
            </h2>
            <p className="font-mono-tabular mt-0.5 truncate text-xs text-[#52635C] dark:text-[#9AAAA2]">
              {preview.filename} · {preview.studentCount} siswa ·{' '}
              {preview.questionCount} butir soal · {sheetCount} lembar kerja
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pratinjau"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#D4DDD8] bg-[#F8FAF9] text-[#52635C] transition-colors hover:bg-[#EAF2EE] hover:text-[#14211C] dark:border-[#28362F] dark:bg-[#1C2722] dark:text-[#9AAAA2] dark:hover:bg-[#24322B] dark:hover:text-[#E6EEE9]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Sheet Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3EAE6] bg-[#F8FAF9] px-5 py-2.5 sm:px-6 dark:border-[#24322B] dark:bg-[#121916]">
          <div
            role="tablist"
            aria-label="Pilih lembar kerja Excel"
            className="flex flex-wrap items-center gap-1 rounded-lg bg-[#E9EFEC] p-1 dark:bg-[#1B2520]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'main'}
              onClick={() => setActiveTab('main')}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'main'
                  ? 'bg-white text-[#14211C] shadow-xs dark:bg-[#24332C] dark:text-[#E6EEE9]'
                  : 'text-[#52635C] hover:text-[#14211C] dark:text-[#9AAAA2] dark:hover:text-[#E6EEE9]'
              }`}
            >
              Sheet 1: {preview.mainSheet.name}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'summary'}
              onClick={() => setActiveTab('summary')}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'summary'
                  ? 'bg-white text-[#14211C] shadow-xs dark:bg-[#24332C] dark:text-[#E6EEE9]'
                  : 'text-[#52635C] hover:text-[#14211C] dark:text-[#9AAAA2] dark:hover:text-[#E6EEE9]'
              }`}
            >
              Sheet 2: {preview.summarySheet.name}
            </button>
            {preview.analysisSheet && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'analysis'}
                onClick={() => setActiveTab('analysis')}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'analysis'
                    ? 'bg-white text-[#14211C] shadow-xs dark:bg-[#24332C] dark:text-[#E6EEE9]'
                    : 'text-[#52635C] hover:text-[#14211C] dark:text-[#9AAAA2] dark:hover:text-[#E6EEE9]'
                }`}
              >
                Sheet 3: {preview.analysisSheet.name}
              </button>
            )}
            {preview.groupsSheet && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'groups'}
                onClick={() => setActiveTab('groups')}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'groups'
                    ? 'bg-white text-[#14211C] shadow-xs dark:bg-[#24332C] dark:text-[#E6EEE9]'
                    : 'text-[#52635C] hover:text-[#14211C] dark:text-[#9AAAA2] dark:hover:text-[#E6EEE9]'
                }`}
              >
                Sheet 4: {preview.groupsSheet.name}
              </button>
            )}
          </div>
          <span className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
            Tampilan sesuai isi file `.xlsx` yang akan diunduh
          </span>
        </div>

        {/* Spreadsheet Table Body */}
        <div className="flex-1 overflow-auto p-5 sm:p-6">
          <div className="overflow-x-auto rounded-lg border border-[#D4DDD8] dark:border-[#28362F]">
            <table className="w-max min-w-full border-separate border-spacing-0 text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#EEF3F0] font-semibold text-[#2B3B35] dark:bg-[#121916] dark:text-[#C5D3CC]">
                  {activeSheet.headers.map((header, colIdx) => {
                    const isMainStickyNo = activeTab === 'main' && colIdx === 0;
                    const isMainStickyName =
                      activeTab === 'main' && colIdx === 1;
                    const isNumeric = typeof header === 'number';
                    return (
                      <th
                        key={colIdx}
                        className={`border-b border-r border-[#D4DDD8] px-2.5 py-2 whitespace-nowrap last:border-r-0 dark:border-[#28362F] ${
                          isMainStickyNo
                            ? 'sticky left-0 z-20 w-[46px] min-w-[46px] bg-[#EEF3F0] text-center dark:bg-[#121916]'
                            : isMainStickyName
                              ? 'sticky left-[46px] z-20 min-w-[170px] bg-[#EEF3F0] text-left dark:bg-[#121916]'
                              : isNumeric
                                ? 'font-mono-tabular min-w-[38px] text-center'
                                : colIdx === 0 ||
                                    (activeTab === 'main' && colIdx === 2)
                                  ? 'text-center'
                                  : activeTab === 'summary' && colIdx === 0
                                    ? 'text-left'
                                    : 'text-center'
                        }`}
                      >
                        {header}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {activeSheet.rows.map((row, rowIdx) => {
                  const isKeyRow =
                    activeTab === 'main' &&
                    rowIdx === 0 &&
                    ((preview.hasKey && row[1] === 'KUNCI JAWABAN') ||
                      row[1] === 'SKOR MAKSIMUM');

                  return (
                    <tr
                      key={rowIdx}
                      className={
                        isKeyRow
                          ? 'bg-[#EAF4EF] font-semibold text-[#144332] dark:bg-[#193026] dark:text-[#A6E8CE]'
                          : rowIdx % 2 === 1
                            ? 'bg-[#FAFBFB] dark:bg-[#131B17]'
                            : 'bg-white dark:bg-[#161F1B]'
                      }
                    >
                      {row.map((cell, colIdx) => {
                        const isMainStickyNo =
                          activeTab === 'main' && colIdx === 0;
                        const isMainStickyName =
                          activeTab === 'main' && colIdx === 1;
                        const isEmptyAnswer =
                          activeTab === 'main' &&
                          !isKeyRow &&
                          colIdx >= 3 &&
                          colIdx < 3 + preview.questionCount &&
                          cell === '';

                        const stickyBg = isKeyRow
                          ? 'bg-[#EAF4EF] dark:bg-[#193026]'
                          : rowIdx % 2 === 1
                            ? 'bg-[#FAFBFB] dark:bg-[#131B17]'
                            : 'bg-white dark:bg-[#161F1B]';

                        return (
                          <td
                            key={colIdx}
                            className={`border-b border-r border-[#E3EAE6] px-2.5 py-2 whitespace-nowrap last:border-r-0 dark:border-[#24322B] ${
                              isMainStickyNo
                                ? `font-mono-tabular sticky left-0 z-10 text-center ${stickyBg}`
                                : isMainStickyName
                                  ? `sticky left-[46px] z-10 text-left font-medium ${stickyBg}`
                                  : isEmptyAnswer
                                    ? 'bg-[#FEF6DC] text-center text-[#8A670B] dark:bg-[#3A2F14] dark:text-[#EBCB7A]'
                                    : typeof cell === 'number' ||
                                        (activeTab === 'main' && colIdx >= 3) ||
                                        (activeTab === 'summary' && colIdx >= 1)
                                      ? 'font-mono-tabular text-center'
                                      : 'text-left'
                            }`}
                          >
                            {cell === '' ? '—' : cell}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[#E3EAE6] px-5 py-3.5 sm:px-6 dark:border-[#24322B]">
          <button
            type="button"
            onClick={onClose}
            className="btn-gesture btn-surface-secondary min-h-[40px] cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onConfirmDownload}
            className="btn-gesture btn-surface-primary inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F]"
          >
            <FileSpreadsheet className="btn-nudge-up h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Unduh Excel (.xlsx)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
