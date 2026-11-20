import { useRef, useState, type ChangeEvent, type FormEvent, type RefObject } from 'react';
import {
  Check,
  ChevronDown,
  FileSpreadsheet,
  FolderOpen,
  Minus,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import type { AnswerLetter, StudentRow } from '../types/sheet';
import {
  countReadableTokens,
  normalizeAnswers,
  parseBulkAnswers,
  parseStudentListLines,
} from '../utils/answerParser';

interface ConfigAndStudentSectionProps {
  questionCount: number;
  examTitle: string;
  answerKey: AnswerLetter[];
  rows: StudentRow[];
  selectedId: number | null;
  nameInputRef: RefObject<HTMLInputElement | null>;
  onChangeQuestionCount: (nextCount: number) => void;
  onChangeExamTitle: (title: string) => void;
  onChangeAnswerKey: (nextKey: AnswerLetter[]) => void;
  onAddStudent: (nama: string, kelas: string) => void;
  onAddMultipleStudents: (items: Array<{ nama: string; kelas: string }>) => void;
  onSelectStudent: (id: number) => void;
  onUpdateStudent: (id: number, nama: string, kelas: string) => void;
  onRemoveStudent: (id: number) => void;
  onExportProjectData: () => void;
  onImportProjectData: (rawText: string) => void;
  onOpenExcelImport: () => void;
}

const QUESTION_PRESETS = [20, 25, 30, 35, 40, 45, 50, 60, 100];

export function ConfigAndStudentSection({
  questionCount,
  examTitle,
  answerKey,
  rows,
  selectedId,
  nameInputRef,
  onChangeQuestionCount,
  onChangeExamTitle,
  onChangeAnswerKey,
  onAddStudent,
  onAddMultipleStudents,
  onSelectStudent,
  onUpdateStudent,
  onRemoveStudent,
  onExportProjectData,
  onImportProjectData,
  onOpenExcelImport,
}: ConfigAndStudentSectionProps) {
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [formError, setFormError] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editError, setEditError] = useState('');

  const [showBulkStudents, setShowBulkStudents] = useState(false);
  const [bulkStudentText, setBulkStudentText] = useState('');
  const [bulkDefaultClass, setBulkDefaultClass] = useState('');

  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [keyInputText, setKeyInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const normKey = normalizeAnswers(answerKey, questionCount);
  const activeKeyCount = normKey.filter((k) => k !== '').length;

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

  function handleNumericCountChange(raw: string) {
    if (raw === '') return;
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    onChangeQuestionCount(Math.min(200, Math.max(1, parsed)));
  }

  function handleSingleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanName = nama.trim();
    if (!cleanName) {
      setFormError('Isi nama siswa terlebih dahulu.');
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

  function handleApplyAnswerKey() {
    const parsed = parseBulkAnswers(keyInputText, questionCount);
    onChangeAnswerKey(parsed);
    setKeyInputText('');
  }

  function startEditStudent(row: StudentRow) {
    setEditingId(row.id);
    setEditNama(row.nama);
    setEditKelas(row.kelas);
    setEditError('');
  }

  function cancelEditStudent() {
    setEditingId(null);
    setEditNama('');
    setEditKelas('');
    setEditError('');
  }

  function saveEditStudent(id: number) {
    const clean = editNama.trim();
    if (!clean) {
      setEditError('Nama siswa tidak boleh kosong.');
      return;
    }
    onUpdateStudent(id, clean, editKelas.trim());
    cancelEditStudent();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Step 1: Jumlah Soal & Pengaturan */}
      <section
        id="pengaturan"
        aria-labelledby="heading-pengaturan"
        className="flex flex-col gap-5 rounded-xl border border-[#D4DDD8] bg-white p-5 sm:p-6 lg:col-span-5 dark:border-[#28362F] dark:bg-[#161F1B]"
      >
        <div className="flex items-center gap-3">
          <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1B6B4F] text-sm font-bold text-white dark:bg-[#4AC294] dark:text-[#0B1712]">
            1
          </span>
          <div>
            <h2
              id="heading-pengaturan"
              className="text-base font-bold text-[#14211C] dark:text-[#E6EEE9]"
            >
              Jumlah soal &amp; pengaturan
            </h2>
            <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
              Mendukung 1 hingga 200 butir soal
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="question-count"
              className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
            >
              Banyak butir soal
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onChangeQuestionCount(Math.max(1, questionCount - 5))
                }
                aria-label="Kurangi 5 soal"
                className="btn-gesture btn-surface-secondary inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F]"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <input
                id="question-count"
                type="number"
                inputMode="numeric"
                min={1}
                max={200}
                value={questionCount}
                onChange={(e) => handleNumericCountChange(e.target.value)}
                className="font-mono-tabular h-11 w-full min-w-[68px] rounded-lg border border-[#D4DDD8] bg-white px-3 text-center text-base font-semibold text-[#14211C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
              />
              <button
                type="button"
                onClick={() =>
                  onChangeQuestionCount(Math.min(200, questionCount + 5))
                }
                aria-label="Tambah 5 soal"
                className="btn-gesture btn-surface-secondary inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="exam-title"
              className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
            >
              Nama ujian / mapel (opsional)
            </label>
            <input
              id="exam-title"
              type="text"
              value={examTitle}
              onChange={(e) => onChangeExamTitle(e.target.value)}
              placeholder="Misal: PAS Bahasa Indonesia"
              className="h-11 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-sm text-[#14211C] placeholder:text-[#7B8B84] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9] dark:placeholder:text-[#6D7E76]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]">
            Pilihan cepat jumlah butir
          </span>
          <div
            role="group"
            aria-label="Pilihan cepat jumlah soal"
            className="flex flex-wrap gap-1.5"
          >
            {QUESTION_PRESETS.map((preset) => {
              const active = questionCount === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChangeQuestionCount(preset)}
                  className={`btn-gesture font-mono-tabular min-h-[36px] shrink-0 cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] ${
                    active ? 'btn-surface-primary' : 'btn-surface-secondary'
                  }`}
                >
                  {preset} butir
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-[#E3EAE6] pt-3 dark:border-[#24322B]">
          <button
            type="button"
            onClick={() => setShowKeyPanel((v) => !v)}
            aria-expanded={showKeyPanel}
            className="flex w-full cursor-pointer items-center justify-between py-1 text-left text-sm font-semibold text-[#14211C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] dark:text-[#E6EEE9]"
          >
            <span>
              Kunci jawaban otomatis{' '}
              <span className="font-normal text-[#52635C] dark:text-[#9AAAA2]">
                {activeKeyCount > 0
                  ? `(${activeKeyCount}/${questionCount} terisi)`
                  : '(opsional)'}
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-[#52635C] transition-transform duration-150 dark:text-[#9AAAA2] ${
                showKeyPanel ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {showKeyPanel && (
            <div className="mt-3 flex flex-col gap-2.5">
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Jika diisi, kolom Benar, Salah, dan Nilai (%) akan ikut dihitung
                otomatis di tabel dan file Excel.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={keyInputText}
                  onChange={(e) => setKeyInputText(e.target.value)}
                  placeholder={`Tempel ${questionCount} huruf kunci (misal: ABCD... atau 1.A 2.B...)`}
                  aria-label="Masukkan kunci jawaban"
                  className="font-mono-tabular h-10 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-sm uppercase text-[#14211C] placeholder:normal-case placeholder:text-[#7B8B84] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
                />
                <button
                  type="button"
                  onClick={handleApplyAnswerKey}
                  disabled={!keyInputText.trim()}
                  className="btn-gesture btn-surface-primary h-10 shrink-0 cursor-pointer rounded-xl px-3.5 text-xs font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Simpan Kunci
                </button>
              </div>
              {keyInputText.trim() && (
                <p className="font-mono-tabular text-xs text-[#52635C] dark:text-[#9AAAA2]">
                  Terbaca {countReadableTokens(keyInputText)} dari{' '}
                  {questionCount} butir
                </p>
              )}
              {activeKeyCount > 0 && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono-tabular truncate text-[#1B6B4F] dark:text-[#58C49B]">
                    Kunci aktif:{' '}
                    {normKey.map((k) => k || '-').join('').slice(0, 40)}
                    {questionCount > 40 ? '...' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => onChangeAnswerKey([])}
                    className="shrink-0 cursor-pointer font-medium text-[#B42318] hover:underline dark:text-[#F97066]"
                  >
                    Hapus kunci
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-[#E3EAE6] pt-3 dark:border-[#24322B]">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]">
              Berkas data tes (seperti Anates V4)
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
                aria-label="Pilih file data tes JSON"
              />
            </div>
            <p className="text-[11px] text-[#6B7C75] dark:text-[#8E9F97]">
              Simpan kunci, daftar siswa, dan seluruh jawaban ke satu file agar
              bisa dibuka kembali kapan saja.
            </p>
          </div>
        </div>
      </section>

      {/* Step 2: Tambah Siswa */}
      <section
        id="siswa"
        aria-labelledby="heading-siswa"
        className="flex flex-col gap-5 rounded-xl border border-[#D4DDD8] bg-white p-5 sm:p-6 lg:col-span-7 dark:border-[#28362F] dark:bg-[#161F1B]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1B6B4F] text-sm font-bold text-white dark:bg-[#4AC294] dark:text-[#0B1712]">
              2
            </span>
            <div>
              <h2
                id="heading-siswa"
                className="text-base font-bold text-[#14211C] dark:text-[#E6EEE9]"
              >
                Tambah siswa
              </h2>
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Masukkan satu per satu, tempel daftar, atau impor dari file Excel
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
                htmlFor="student-name"
                className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
              >
                Nama siswa
              </label>
              <input
                ref={nameInputRef}
                id="student-name"
                type="text"
                value={nama}
                onChange={(e) => {
                  setNama(e.target.value);
                  if (formError) setFormError('');
                }}
                placeholder="Nama lengkap siswa"
                className="h-11 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-sm text-[#14211C] placeholder:text-[#7B8B84] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9] dark:placeholder:text-[#6D7E76]"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-3">
              <label
                htmlFor="student-class"
                className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
              >
                Kelas
              </label>
              <input
                id="student-class"
                type="text"
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                placeholder="Misal: VII-A"
                className="h-11 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-sm text-[#14211C] placeholder:text-[#7B8B84] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9] dark:placeholder:text-[#6D7E76]"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                className="btn-gesture btn-surface-primary inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F]"
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
            className="flex w-full cursor-pointer items-center justify-between py-1 text-left text-sm font-semibold text-[#14211C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] dark:text-[#E6EEE9]"
          >
            <span>Tempel daftar banyak siswa sekaligus</span>
            <ChevronDown
              className={`h-4 w-4 text-[#52635C] transition-transform duration-150 dark:text-[#9AAAA2] ${
                showBulkStudents ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {showBulkStudents && (
            <div className="mt-3 flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="sm:col-span-8">
                  <label
                    htmlFor="bulk-students"
                    className="mb-1 block text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
                  >
                    Satu siswa per baris (boleh sertakan koma untuk kelas)
                  </label>
                  <textarea
                    id="bulk-students"
                    rows={4}
                    value={bulkStudentText}
                    onChange={(e) => setBulkStudentText(e.target.value)}
                    placeholder={'Ahmad Fauzi, VII-A\nSiti Nurhaliza, VII-A\nBudi Santoso, VII-B'}
                    className="w-full rounded-lg border border-[#D4DDD8] bg-white p-3 text-sm text-[#14211C] placeholder:text-[#7B8B84] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
                  />
                </div>
                <div className="flex flex-col justify-between gap-2 sm:col-span-4">
                  <div>
                    <label
                      htmlFor="bulk-default-class"
                      className="mb-1 block text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
                    >
                      Kelas bawaan
                    </label>
                    <input
                      id="bulk-default-class"
                      type="text"
                      value={bulkDefaultClass}
                      onChange={(e) => setBulkDefaultClass(e.target.value)}
                      placeholder="Misal: VII-A"
                      className="h-10 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-sm text-[#14211C] dark:border-[#28362F] dark:bg-[#101815] dark:text-[#E6EEE9]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleBulkStudentAdd}
                    disabled={!bulkStudentText.trim()}
                    className="btn-gesture btn-surface-primary h-10 w-full cursor-pointer rounded-xl px-3 text-xs font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Tambahkan Daftar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <div className="border-t border-[#E3EAE6] pt-3 dark:border-[#24322B]">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]">
                Daftar siswa ({rows.length})
              </span>
              <span className="text-xs text-[#6B7C75] dark:text-[#8E9F97]">
                Klik nama untuk mengisi, Edit untuk ubah nama/kelas, atau Hapus
              </span>
            </div>
            <ul className="max-h-52 divide-y divide-[#E3EAE6] overflow-y-auto rounded-lg border border-[#D4DDD8] bg-[#F8FAF9] dark:divide-[#24322B] dark:border-[#28362F] dark:bg-[#101815]">
              {rows.map((row, idx) => {
                const isSelected = row.id === selectedId;
                const isEditing = editingId === row.id;
                return (
                  <li
                    key={row.id}
                    className={`px-3 py-2 text-sm ${
                      isSelected ? 'bg-[#EAF4EF] dark:bg-[#193026]' : ''
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <span className="font-mono-tabular w-6 shrink-0 text-xs text-[#6B7C75] dark:text-[#8E9F97]">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={editNama}
                            autoFocus
                            onChange={(e) => {
                              setEditNama(e.target.value);
                              if (editError) setEditError('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveEditStudent(row.id);
                              } else if (e.key === 'Escape') {
                                cancelEditStudent();
                              }
                            }}
                            placeholder="Nama lengkap siswa"
                            aria-label={`Ubah nama siswa ${idx + 1}`}
                            className="h-9 min-w-0 flex-1 rounded-lg border border-[#1B6B4F] bg-white px-2.5 text-sm font-medium text-[#14211C] focus:outline-none dark:border-[#4AC294] dark:bg-[#161F1B] dark:text-[#E6EEE9]"
                          />
                          <input
                            type="text"
                            value={editKelas}
                            onChange={(e) => setEditKelas(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveEditStudent(row.id);
                              } else if (e.key === 'Escape') {
                                cancelEditStudent();
                              }
                            }}
                            placeholder="Kelas"
                            aria-label={`Ubah kelas siswa ${idx + 1}`}
                            className="h-9 w-full rounded-lg border border-[#D4DDD8] bg-white px-2.5 text-sm text-[#14211C] focus:border-[#1B6B4F] focus:outline-none sm:w-28 dark:border-[#28362F] dark:bg-[#161F1B] dark:text-[#E6EEE9]"
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => saveEditStudent(row.id)}
                              className="btn-gesture btn-surface-primary inline-flex min-h-[34px] shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
                            >
                              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span>Simpan</span>
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditStudent}
                              className="btn-gesture btn-surface-secondary inline-flex min-h-[34px] shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
                            >
                              <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span>Batal</span>
                            </button>
                          </div>
                        </div>
                        {editError && (
                          <p role="alert" className="pl-8 text-xs font-medium text-[#B42318] dark:text-[#F97066]">
                            {editError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectStudent(row.id)}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F]"
                        >
                          <span className="font-mono-tabular w-6 shrink-0 text-xs text-[#6B7C75] dark:text-[#8E9F97]">
                            {idx + 1}.
                          </span>
                          <span className="truncate font-medium text-[#14211C] dark:text-[#E6EEE9]">
                            {row.nama || `Siswa ${idx + 1}`}
                          </span>
                          {row.kelas && (
                            <>
                              <span
                                aria-hidden="true"
                                className="text-xs text-[#8D9D95]"
                              >
                                ·
                              </span>
                              <span className="shrink-0 text-xs text-[#52635C] dark:text-[#9AAAA2]">
                                {row.kelas}
                              </span>
                            </>
                          )}
                        </button>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEditStudent(row)}
                            aria-label={`Edit data siswa ${row.nama || `Siswa ${idx + 1}`}`}
                            className="btn-gesture btn-surface-secondary inline-flex min-h-[32px] shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
                          >
                            <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveStudent(row.id)}
                            aria-label={`Hapus siswa ${row.nama || `Siswa ${idx + 1}`}`}
                            className="btn-gesture btn-surface-danger inline-flex min-h-[32px] shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
                          >
                            <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    )}
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
