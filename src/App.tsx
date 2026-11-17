import { useEffect, useMemo, useRef, useState } from 'react';
import { AnswerEntrySection } from './components/AnswerEntrySection';
import { ConfigAndStudentSection } from './components/ConfigAndStudentSection';
import { ExcelPreviewModal } from './components/ExcelPreviewModal';
import { PWAInstallBar } from './components/PWAInstallBar';
import { RecapTableSection } from './components/RecapTableSection';
import { TopBar } from './components/TopBar';
import type { AnswerLetter, StudentRow } from './types/sheet';
import { firstEmptyIndex, normalizeAnswers } from './utils/answerParser';
import {
  buildExcelWorkbookData,
  buildTsvText,
  downloadCsvFile,
  downloadExcelWorkbook,
} from './utils/excelExport';

const STORAGE_KEY = 'rekap-lembar-jawaban-v1';
const THEME_STORAGE_KEY = 'rekap-lembar-jawaban-theme';

interface PersistedState {
  questionCount: number;
  examTitle: string;
  answerKey: AnswerLetter[];
  rows: StudentRow[];
  seq: number;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      const questionCount =
        typeof parsed.questionCount === 'number' &&
        parsed.questionCount >= 1 &&
        parsed.questionCount <= 200
          ? parsed.questionCount
          : 30;
      const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
      const maxId = rows.reduce((acc, r) => Math.max(acc, r.id || 0), 0);
      return {
        questionCount,
        examTitle: typeof parsed.examTitle === 'string' ? parsed.examTitle : '',
        answerKey: Array.isArray(parsed.answerKey) ? parsed.answerKey : [],
        rows,
        seq: typeof parsed.seq === 'number' ? Math.max(parsed.seq, maxId) : maxId,
      };
    }
  } catch {
    // Ignore malformed storage
  }
  return {
    questionCount: 30,
    examTitle: '',
    answerKey: [],
    rows: [],
    seq: 0,
  };
}

function loadInitialTheme(): boolean {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    // Ignore storage read error
  }
  return false;
}

export default function App() {
  const [initial] = useState<PersistedState>(loadInitialState);
  const [questionCount, setQuestionCount] = useState<number>(
    initial.questionCount,
  );
  const [examTitle, setExamTitle] = useState<string>(initial.examTitle);
  const [answerKey, setAnswerKey] = useState<AnswerLetter[]>(initial.answerKey);
  const [rows, setRows] = useState<StudentRow[]>(initial.rows);
  const [seq, setSeq] = useState<number>(initial.seq);

  const [selectedId, setSelectedId] = useState<number | null>(
    initial.rows[0]?.id ?? null,
  );
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);

  const [darkMode, setDarkMode] = useState<boolean>(loadInitialTheme);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [clipboardFallbackText, setClipboardFallbackText] =
    useState<string>('');
  const [lastDeleted, setLastDeleted] = useState<{
    row: StudentRow;
    index: number;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const excelPreviewData = useMemo(() => {
    if (!isPreviewOpen || rows.length === 0) return null;
    return buildExcelWorkbookData({
      rows,
      questionCount,
      examTitle,
      answerKey,
    });
  }, [isPreviewOpen, rows, questionCount, examTitle, answerKey]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage write error
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      const payload: PersistedState = {
        questionCount,
        examTitle,
        answerKey,
        rows,
        seq,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }, [questionCount, examTitle, answerKey, rows, seq]);

  useEffect(() => {
    if (currentQuestionIdx >= questionCount) {
      setCurrentQuestionIdx(Math.max(0, questionCount - 1));
    }
  }, [questionCount, currentQuestionIdx]);

  function showStatus(msg: string) {
    setStatusMessage(msg);
  }

  function handleAddStudent(nama: string, kelas: string) {
    const nextId = seq + 1;
    const newRow: StudentRow = {
      id: nextId,
      nama,
      kelas,
      jawaban: new Array(questionCount).fill(''),
    };
    setSeq(nextId);
    setRows((prev) => [...prev, newRow]);
    setSelectedId(nextId);
    setCurrentQuestionIdx(0);
    setClipboardFallbackText('');
    setLastDeleted(null);
    showStatus(`Siswa "${nama}" ditambahkan.`);
  }

  function handleAddMultipleStudents(
    items: Array<{ nama: string; kelas: string }>,
  ) {
    let nextSeq = seq;
    const created: StudentRow[] = items.map((item) => {
      nextSeq += 1;
      return {
        id: nextSeq,
        nama: item.nama,
        kelas: item.kelas,
        jawaban: new Array(questionCount).fill(''),
      };
    });
    setSeq(nextSeq);
    setRows((prev) => [...prev, ...created]);
    if (created.length > 0) {
      setSelectedId(created[0].id);
      setCurrentQuestionIdx(0);
    }
    setClipboardFallbackText('');
    setLastDeleted(null);
    showStatus(`${created.length} siswa ditambahkan ke tabel.`);
  }

  function handleSelectStudent(id: number) {
    setSelectedId(id);
    const target = rows.find((r) => r.id === id);
    if (target) {
      setCurrentQuestionIdx(firstEmptyIndex(target.jawaban, questionCount));
    }
  }

  function handleSetAnswer(letter: AnswerLetter) {
    if (selectedId === null) return;
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== selectedId) return row;
        const nextAns = normalizeAnswers(
          row.jawaban,
          Math.max(row.jawaban.length, questionCount),
        );
        nextAns[currentQuestionIdx] = letter;
        return { ...row, jawaban: nextAns };
      }),
    );
    if (letter && currentQuestionIdx < questionCount - 1) {
      setCurrentQuestionIdx((i) => i + 1);
    }
  }

  function handleApplyBulkAnswers(answers: AnswerLetter[]) {
    if (selectedId === null) return;
    const targetRow = rows.find((r) => r.id === selectedId);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== selectedId) return row;
        return { ...row, jawaban: answers };
      }),
    );
    setCurrentQuestionIdx(firstEmptyIndex(answers, questionCount));
    showStatus(
      `Jawaban untuk ${targetRow?.nama || 'siswa terpilih'} berhasil diterapkan.`,
    );
  }

  function handleUpdateRowMeta(
    id: number,
    field: 'nama' | 'kelas',
    value: string,
  ) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  function handleUpdateCell(
    id: number,
    questionIdx: number,
    value: AnswerLetter,
  ) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const nextAns = normalizeAnswers(
          row.jawaban,
          Math.max(row.jawaban.length, questionCount),
        );
        nextAns[questionIdx] = value;
        return { ...row, jawaban: nextAns };
      }),
    );
  }

  function handleRemoveRow(id: number) {
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) return;
    const removed = rows[idx];
    const remaining = rows.filter((r) => r.id !== id);
    setRows(remaining);
    setLastDeleted({ row: removed, index: idx });

    if (selectedId === id) {
      const nextTarget = remaining[Math.min(idx, remaining.length - 1)] || null;
      setSelectedId(nextTarget ? nextTarget.id : null);
      setCurrentQuestionIdx(
        nextTarget ? firstEmptyIndex(nextTarget.jawaban, questionCount) : 0,
      );
    }
    showStatus(`Siswa "${removed.nama || `Siswa ${idx + 1}`}" dihapus.`);
  }

  function handleUndoDelete() {
    if (!lastDeleted) return;
    const { row, index } = lastDeleted;
    setRows((prev) => {
      const copy = [...prev];
      const insertAt = Math.min(Math.max(0, index), copy.length);
      copy.splice(insertAt, 0, row);
      return copy;
    });
    setSelectedId(row.id);
    setCurrentQuestionIdx(firstEmptyIndex(row.jawaban, questionCount));
    setLastDeleted(null);
    showStatus(`Siswa "${row.nama}" dikembalikan.`);
  }

  function handleClearAll() {
    setRows([]);
    setSelectedId(null);
    setCurrentQuestionIdx(0);
    setClipboardFallbackText('');
    setLastDeleted(null);
    showStatus('Semua data siswa telah dikosongkan.');
  }

  function handleOpenPreview() {
    if (rows.length === 0) {
      showStatus('Tambahkan minimal satu siswa sebelum melihat pratinjau Excel.');
      return;
    }
    setIsPreviewOpen(true);
  }

  function handleDownloadExcel() {
    if (rows.length === 0) {
      showStatus('Tambahkan minimal satu siswa sebelum mengunduh Excel.');
      return;
    }
    try {
      const filename = downloadExcelWorkbook({
        rows,
        questionCount,
        examTitle,
        answerKey,
      });
      setIsPreviewOpen(false);
      setClipboardFallbackText('');
      showStatus(`File Excel "${filename}" berhasil diunduh.`);
    } catch {
      showStatus('Gagal membuat file Excel. Gunakan Unduh CSV atau Salin tabel.');
    }
  }

  function handleDownloadCsv() {
    if (rows.length === 0) {
      showStatus('Tambahkan minimal satu siswa sebelum mengunduh CSV.');
      return;
    }
    const filename = downloadCsvFile({
      rows,
      questionCount,
      examTitle,
      answerKey,
    });
    setClipboardFallbackText('');
    showStatus(`File CSV "${filename}" berhasil diunduh.`);
  }

  async function handleCopyTable() {
    if (rows.length === 0) {
      showStatus('Belum ada data untuk disalin.');
      return;
    }
    const tsv = buildTsvText(rows, questionCount, answerKey);
    try {
      await navigator.clipboard.writeText(tsv);
      setClipboardFallbackText('');
      showStatus(
        'Tabel berhasil disalin. Tempel (Ctrl+V) di sel A1 pada Excel atau Google Sheets.',
      );
    } catch {
      setClipboardFallbackText(tsv);
      showStatus(
        'Salin otomatis dibatasi browser. Salin teks dari kotak di bawah lalu tempel di Excel.',
      );
    }
  }

  function handleLoadSampleData() {
    const sampleCount = Math.max(questionCount, 40);
    const sampleKey: AnswerLetter[] = Array.from({ length: sampleCount }, (_, i) => {
      const opts: Array<Exclude<AnswerLetter, ''>> = ['A', 'B', 'C', 'D', 'E'];
      return opts[(i * 3 + 1) % 5];
    });
    const sampleStudents: Array<{ nama: string; kelas: string; jawaban: AnswerLetter[] }> = [
      {
        nama: 'Aulia Rahman',
        kelas: 'VIII-A',
        jawaban: sampleKey.map((k, i) => (i % 9 === 0 ? 'B' : k)),
      },
      {
        nama: 'Bagus Pratama',
        kelas: 'VIII-A',
        jawaban: sampleKey.map((k, i) => (i === 34 ? '' : i % 6 === 0 ? 'D' : k)),
      },
      {
        nama: 'Citra Dewi Lestari',
        kelas: 'VIII-B',
        jawaban: sampleKey.map((k, i) => (i % 11 === 0 ? 'C' : k)),
      },
    ];

    let nextId = seq;
    const created: StudentRow[] = sampleStudents.map((s) => {
      nextId += 1;
      return {
        id: nextId,
        nama: s.nama,
        kelas: s.kelas,
        jawaban: s.jawaban,
      };
    });

    setQuestionCount(sampleCount);
    setExamTitle((prev) => prev || 'Try Out Matematika');
    setAnswerKey(sampleKey);
    setSeq(nextId);
    setRows(created);
    setSelectedId(created[0].id);
    setCurrentQuestionIdx(firstEmptyIndex(created[0].jawaban, sampleCount));
    showStatus(`Contoh data ${sampleCount} butir soal berhasil dimuat.`);
  }

  return (
    <div id="top" className="min-h-screen bg-[#F4F6F5] text-[#14211C] dark:bg-[#0E1411] dark:text-[#E6EEE9]">
      <TopBar hasRows={rows.length > 0} onDownloadExcel={handleDownloadExcel} />

      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-balance text-2xl font-bold tracking-tight text-[#14211C] sm:text-3xl dark:text-[#E6EEE9]">
              Rekap Lembar Jawaban Siswa
            </h1>
            <p className="max-w-2xl text-sm text-[#52635C] sm:text-base dark:text-[#9AAAA2]">
              Atur jumlah butir soal hingga lebih dari 30 nomor, masukkan nama
              siswa beserta jawabannya, lalu unduh hasilnya langsung sebagai
              file Excel (.xlsx).
            </p>
          </div>
          <PWAInstallBar />
        </div>

        <ConfigAndStudentSection
          questionCount={questionCount}
          examTitle={examTitle}
          answerKey={answerKey}
          rows={rows}
          selectedId={selectedId}
          nameInputRef={nameInputRef}
          onChangeQuestionCount={setQuestionCount}
          onChangeExamTitle={setExamTitle}
          onChangeAnswerKey={setAnswerKey}
          onAddStudent={handleAddStudent}
          onAddMultipleStudents={handleAddMultipleStudents}
          onSelectStudent={handleSelectStudent}
          onRemoveStudent={handleRemoveRow}
        />

        <AnswerEntrySection
          rows={rows}
          questionCount={questionCount}
          selectedId={selectedId}
          currentQuestionIdx={currentQuestionIdx}
          onSelectStudent={handleSelectStudent}
          onSelectQuestion={setCurrentQuestionIdx}
          onSetAnswer={handleSetAnswer}
          onApplyBulkAnswers={handleApplyBulkAnswers}
          onRemoveStudent={handleRemoveRow}
          onFocusAddStudent={() => nameInputRef.current?.focus()}
        />

        <RecapTableSection
          rows={rows}
          questionCount={questionCount}
          selectedId={selectedId}
          answerKey={answerKey}
          darkMode={darkMode}
          statusMessage={statusMessage}
          canUndoDelete={lastDeleted !== null}
          clipboardFallbackText={clipboardFallbackText}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
          onSelectStudent={handleSelectStudent}
          onUpdateRowMeta={handleUpdateRowMeta}
          onUpdateCell={handleUpdateCell}
          onRemoveRow={handleRemoveRow}
          onUndoDelete={handleUndoDelete}
          onPreviewExcel={handleOpenPreview}
          onDownloadExcel={handleDownloadExcel}
          onDownloadCsv={handleDownloadCsv}
          onCopyTable={handleCopyTable}
          onClearAll={handleClearAll}
          onLoadSampleData={handleLoadSampleData}
        />
      </main>

      <ExcelPreviewModal
        isOpen={isPreviewOpen}
        preview={excelPreviewData}
        onClose={() => setIsPreviewOpen(false)}
        onConfirmDownload={handleDownloadExcel}
      />
    </div>
  );
}
