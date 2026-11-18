import { useRef, useState, type ChangeEvent, type FormEvent, type RefObject } from 'react';
import {
  ChevronDown,
  FileSpreadsheet,
  FolderOpen,
  Minus,
  Plus,
  Save,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { SurveySubMode, UraianStudentRow } from '../types/sheet';
import { parseStudentListLines } from '../utils/answerParser';
import { normalizeMaxScores } from '../utils/uraianAnalysis';

interface UraianConfigAndStudentSectionProps {
  itemCount: number;
  examTitle: string;
  subMode: SurveySubMode;
  scaleMin: number;
  defaultMaxScore: number;
  itemMaxScores: number[];
  rows: UraianStudentRow[];
  selectedId: number | null;
  nameInputRef: RefObject<HTMLInputElement | null>;
  onChangeItemCount: (nextCount: number) => void;
  onChangeExamTitle: (title: string) => void;
  onSelectPresetMode: (
    mode: SurveySubMode,
    min: number,
    defaultMax: number,
  ) => void;
  onChangeDefaultMaxScore: (nextMax: number) => void;
  onChangeItemMaxScore: (itemIdx: number, nextMax: number) => void;
  onAddStudent: (nama: string, kelas: string) => void;
  onAddMultipleStudents: (items: Array<{ nama: string; kelas: string }>) => void;
  onSelectStudent: (id: number) => void;
  onRemoveStudent: (id: number) => void;
  onExportProjectData: () => void;
  onImportProjectData: (rawText: string) => void;
  onOpenExcelImport: () => void;
}

const ITEM_PRESETS = [5, 10, 15, 20, 25, 30, 40, 50];

export function UraianConfigAndStudentSection({
  itemCount,
  examTitle,
  subMode,
  scaleMin,
  defaultMaxScore,
  itemMaxScores,
  rows,
  selectedId,
  nameInputRef,
  onChangeItemCount,
  onChangeExamTitle,
  onSelectPresetMode,
  onChangeDefaultMaxScore,
  onChangeItemMaxScore,
  onAddStudent,
  onAddMultipleStudents,
  onSelectStudent,
  onRemoveStudent,
  onExportProjectData,
  onImportProjectData,
  onOpenExcelImport,
}: UraianConfigAndStudentSectionProps) {
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [formError, setFormError] = useState('');

  const [showBulkStudents, setShowBulkStudents] = useState(false);
  const [bulkStudentText, setBulkStudentText] = useState('');
  const [bulkDefaultClass, setBulkDefaultClass] = useState('');
  const [showWeightPanel, setShowWeightPanel] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const normMaxScores = normalizeMaxScores(
    itemMaxScores,
    itemCount,
    defaultMaxScore,
    scaleMin,
  );
  const totalMaxPossible = normMaxScores.reduce((acc, v) => acc + v, 0);

  function handleNumericCountChange(raw: string) {
    if (raw === '') return;
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    onChangeItemCount(Math.min(100, Math.max(1, parsed)));
  }

  function handleSingleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanName = nama.trim();
    if (!cleanName) {
      setFormError('Isi nama siswa / responden terlebih dahulu.');
      nameInputRef.current?.focus();
      return;
    }
    setFormError('');
    onAddStudent(cleanName, kelas.trim());
    setNama('');
    nameInputRef.current?.focus();
  }

  function handleBulkStudentAdd() {
    const parsed = parseStudentListLines(bulkStudentText, bulkDefaultClass.trim());
    if (parsed.length === 0) return;
    onAddMultipleStudents(parsed);
    setBulkStudentText('');
    setShowBulkStudents(false);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportProjectData(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Step 1: Pengaturan Angket / Uraian */}
      <section
        id="uraian-pengaturan"
        aria-labelledby="heading-uraian-pengaturan"
        className="flex flex-col gap-5 rounded-xl border border-[#D4DDD8] bg-white p-5 sm:p-6 lg:col-span-5 dark:border-[#28362F] dark:bg-[#161F1B]"
      >
        <div className="flex items-center gap-3">
          <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1B6B4F] text-sm font-bold text-white dark:bg-[#4AC294] dark:text-[#0B1712]">
            1
          </span>
          <div>
            <h2
              id="heading-uraian-pengaturan"
              className="text-base font-bold text-[#14211C] dark:text-[#E6EEE9]"
            >
              Jenis instrumen &amp; skala skor
            </h2>
            <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
              Pilih format Uraian / Esai atau Angket skala Likert (1–100 butir)
            </p>
          </div>
        </div>

        {/* Preset sub-mode selector */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]">
            Jenis penilaian
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  id: 'uraian',
                  label: 'Uraian (0–10)',
                  min: 0,
                  max: 10,
                },
                {
                  id: 'angket-4',
                  label: 'Angket Skala 1–4',
                  min: 1,
                  max: 4,
                },
                {
                  id: 'angket-5',
                  label: 'Angket Skala 1–5',
                  min: 1,
                  max: 5,
                },
                {
                  id: 'custom',
                  label: 'Skor Kustom',
                  min: 0,
                  max: defaultMaxScore > 0 ? defaultMaxScore : 20,
                },
              ] as const
            ).map((preset) => {
              const active = subMode === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    onSelectPresetMode(preset.id, preset.min, preset.max)
                  }
                  className={`btn-gesture min-h-[38px] cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                    active ? 'btn-surface-primary' : 'btn-surface-secondary'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="uraian-item-count"
              className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
            >
              Jumlah butir soal / angket
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onChangeItemCount(Math.max(1, itemCount - 5))}
                aria-label="Kurangi 5 butir"
                className="btn-gesture btn-surface-secondary inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <input
                id="uraian-item-count"
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={itemCount}
                onChange={(e) => handleNumericCountChange(e.target.value)}
                className="font-mono-tabular h-11 w-full min-w-[60px] rounded-lg border border-[#D4DDD8] bg-white px-3 text-center text-base font-semibold text-[#14211C] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
              />
              <button
                type="button"
                onClick={() => onChangeItemCount(Math.min(100, itemCount + 5))}
                aria-label="Tambah 5 butir"
                className="btn-gesture btn-surface-secondary inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="uraian-default-max"
              className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
            >
              Skor maks bawaan per butir
            </label>
            <input
              id="uraian-default-max"
              type="number"
              min={scaleMin + 1}
              max={100}
              value={defaultMaxScore}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v > scaleMin) {
                  onChangeDefaultMaxScore(v);
                }
              }}
              className="font-mono-tabular h-11 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-sm font-semibold text-[#14211C] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="uraian-exam-title"
            className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
          >
            Nama ujian / angket (opsional)
          </label>
          <input
            id="uraian-exam-title"
            type="text"
            value={examTitle}
            onChange={(e) => onChangeExamTitle(e.target.value)}
            placeholder="Misal: Uraian IPA Bab 3 / Angket Motivasi Belajar"
            className="h-11 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-sm text-[#14211C] placeholder:text-[#7B8B84] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9] dark:placeholder:text-[#6D7E76]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ITEM_PRESETS.map((preset) => {
            const active = itemCount === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => onChangeItemCount(preset)}
                className={`btn-gesture font-mono-tabular min-h-[34px] shrink-0 cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                  active ? 'btn-surface-primary' : 'btn-surface-secondary'
                }`}
              >
                {preset} butir
              </button>
            );
          })}
        </div>

        {/* Optional per-item max score drawer (very useful for essay weights) */}
        <div className="border-t border-[#E3EAE6] pt-3 dark:border-[#24322B]">
          <button
            type="button"
            onClick={() => setShowWeightPanel((v) => !v)}
            aria-expanded={showWeightPanel}
            className="flex w-full cursor-pointer items-center justify-between py-1 text-left text-sm font-semibold text-[#14211C] dark:text-[#E6EEE9]"
          >
            <span>
              Bobot skor maks tiap butir{' '}
              <span className="font-mono-tabular font-normal text-[#52635C] dark:text-[#9AAAA2]">
                (Total maks: {totalMaxPossible})
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-[#52635C] transition-transform duration-150 dark:text-[#9AAAA2] ${
                showWeightPanel ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {showWeightPanel && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Atur skor maksimal berbeda untuk tiap nomor soal uraian (misal
                soal 1 maks 5, soal 2 maks 15).
              </p>
              <div className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
                {normMaxScores.map((maxVal, idx) => (
                  <label
                    key={idx}
                    className="flex flex-col gap-1 text-[11px] text-[#52635C] dark:text-[#9AAAA2]"
                  >
                    <span className="font-mono-tabular font-semibold">
                      No {idx + 1}
                    </span>
                    <input
                      type="number"
                      min={scaleMin + 1}
                      max={100}
                      value={maxVal}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v > scaleMin) {
                          onChangeItemMaxScore(idx, v);
                        }
                      }}
                      className="font-mono-tabular h-8 w-full rounded-md border border-[#D4DDD8] bg-white px-2 text-center text-xs font-semibold text-[#14211C] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Project Save/Open (.json) */}
        <div className="border-t border-[#E3EAE6] pt-3 dark:border-[#24322B]">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]">
              Berkas data angket / uraian
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExportProjectData}
                className="btn-gesture btn-surface-secondary inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                <Save className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Simpan File Data (.json)</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-gesture btn-surface-secondary inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                <FolderOpen className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Buka File Data</span>
              </button>
              <button
                type="button"
                onClick={onOpenExcelImport}
                className="btn-gesture btn-surface-primary inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              >
                <FileSpreadsheet className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Impor Excel (.xlsx)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Pilih file data uraian atau angket JSON"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Step 2: Tambah Siswa / Responden */}
      <section
        id="uraian-siswa"
        aria-labelledby="heading-uraian-siswa"
        className="flex flex-col gap-5 rounded-xl border border-[#D4DDD8] bg-white p-5 sm:p-6 lg:col-span-7 dark:border-[#28362F] dark:bg-[#161F1B]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1B6B4F] text-sm font-bold text-white dark:bg-[#4AC294] dark:text-[#0B1712]">
              2
            </span>
            <div>
              <h2
                id="heading-uraian-siswa"
                className="text-base font-bold text-[#14211C] dark:text-[#E6EEE9]"
              >
                Tambah siswa / responden
              </h2>
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Tambahkan peserta satu per satu, tempel daftar, atau impor Excel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenExcelImport}
            className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
          >
            <FileSpreadsheet className="btn-nudge-up h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Impor dari Excel</span>
          </button>
        </div>

        <form onSubmit={handleSingleSubmit} noValidate className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
            <div className="flex flex-col gap-1.5 sm:col-span-6">
              <label
                htmlFor="uraian-student-name"
                className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
              >
                Nama siswa / responden
              </label>
              <input
                ref={nameInputRef}
                id="uraian-student-name"
                type="text"
                value={nama}
                onChange={(e) => {
                  setNama(e.target.value);
                  if (formError) setFormError('');
                }}
                placeholder="Nama peserta atau kode responden"
                className="h-11 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-sm text-[#14211C] placeholder:text-[#7B8B84] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9] dark:placeholder:text-[#6D7E76]"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-3">
              <label
                htmlFor="uraian-student-class"
                className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
              >
                Kelas / Kelompok
              </label>
              <input
                id="uraian-student-class"
                type="text"
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                placeholder="Misal: VIII-A"
                className="h-11 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-sm text-[#14211C] placeholder:text-[#7B8B84] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9] dark:placeholder:text-[#6D7E76]"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                className="btn-gesture btn-surface-primary inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap"
              >
                <UserPlus className="btn-nudge-up h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Tambah</span>
              </button>
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-xs font-medium text-[#B42318] dark:text-[#F97066]">
              {formError}
            </p>
          )}
        </form>

        <div className="border-t border-[#E3EAE6] pt-3 dark:border-[#24322B]">
          <button
            type="button"
            onClick={() => setShowBulkStudents((v) => !v)}
            aria-expanded={showBulkStudents}
            className="flex w-full cursor-pointer items-center justify-between py-1 text-left text-sm font-semibold text-[#14211C] dark:text-[#E6EEE9]"
          >
            <span>Tempel daftar banyak peserta sekaligus</span>
            <ChevronDown
              className={`h-4 w-4 text-[#52635C] transition-transform duration-150 dark:text-[#9AAAA2] ${
                showBulkStudents ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {showBulkStudents && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <textarea
                  rows={4}
                  value={bulkStudentText}
                  onChange={(e) => setBulkStudentText(e.target.value)}
                  placeholder={'Aulia Rahman, VIII-A\nNadia Kusuma, VIII-A\nRafi Pratama, VIII-B'}
                  className="w-full rounded-lg border border-[#D4DDD8] bg-white p-3 text-sm text-[#14211C] placeholder:text-[#7B8B84] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
                />
              </div>
              <div className="flex flex-col justify-between gap-2 sm:col-span-4">
                <input
                  type="text"
                  value={bulkDefaultClass}
                  onChange={(e) => setBulkDefaultClass(e.target.value)}
                  placeholder="Kelas bawaan"
                  className="h-10 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-sm text-[#14211C] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
                />
                <button
                  type="button"
                  onClick={handleBulkStudentAdd}
                  disabled={!bulkStudentText.trim()}
                  className="btn-gesture btn-surface-primary h-10 w-full cursor-pointer rounded-xl px-3 text-xs font-semibold whitespace-nowrap disabled:opacity-40"
                >
                  Tambahkan Daftar
                </button>
              </div>
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <div className="border-t border-[#E3EAE6] pt-3 dark:border-[#24322B]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]">
                Daftar peserta ({rows.length})
              </span>
              <span className="text-xs text-[#6B7C75] dark:text-[#8E9F97]">
                Klik nama untuk mengisi skor
              </span>
            </div>
            <ul className="max-h-48 divide-y divide-[#E3EAE6] overflow-y-auto rounded-lg border border-[#D4DDD8] bg-[#F8FAF9] dark:divide-[#24322B] dark:border-[#28362F] dark:bg-[#101815]">
              {rows.map((row, idx) => {
                const isSelected = row.id === selectedId;
                return (
                  <li
                    key={row.id}
                    className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${
                      isSelected ? 'bg-[#EAF4EF] dark:bg-[#193026]' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectStudent(row.id)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                    >
                      <span className="font-mono-tabular w-6 shrink-0 text-xs text-[#6B7C75] dark:text-[#8E9F97]">
                        {idx + 1}.
                      </span>
                      <span className="truncate font-medium text-[#14211C] dark:text-[#E6EEE9]">
                        {row.nama || `Peserta ${idx + 1}`}
                      </span>
                      {row.kelas && (
                        <>
                          <span aria-hidden="true" className="text-xs text-[#8D9D95]">
                            ·
                          </span>
                          <span className="shrink-0 text-xs text-[#52635C] dark:text-[#9AAAA2]">
                            {row.kelas}
                          </span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveStudent(row.id)}
                      aria-label={`Hapus ${row.nama || `Peserta ${idx + 1}`}`}
                      className="btn-gesture btn-surface-danger inline-flex min-h-[32px] shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>Hapus</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
