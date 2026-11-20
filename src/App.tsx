import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { ArrowLeft, Settings } from 'lucide-react';
import { AnswerEntrySection } from './components/AnswerEntrySection';
import { ButtonStylePicker } from './components/ButtonStylePicker';
import {
  ClassScoreChartsSection,
  type ChartStudentPoint,
} from './components/ClassScoreChartsSection';
import { ConfigAndStudentSection } from './components/ConfigAndStudentSection';
import {
  ExcelImportModal,
  type AbcExcelImportPayload,
  type UraianExcelImportPayload,
} from './components/ExcelImportModal';
import { ExcelPreviewModal } from './components/ExcelPreviewModal';
import { HomeBerandaSection } from './components/HomeBerandaSection';
import { ItemAnalysisSection } from './components/ItemAnalysisSection';
import { PWAInstallBar } from './components/PWAInstallBar';
import { RecapTableSection } from './components/RecapTableSection';
import {
  SettingsModal,
  type CloudConflictSummary,
} from './components/SettingsModal';
import { SplashIntro } from './components/SplashIntro';
import { TopBar } from './components/TopBar';
import { UraianAnalysisSection } from './components/UraianAnalysisSection';
import { UraianConfigAndStudentSection } from './components/UraianConfigAndStudentSection';
import { UraianEntrySection } from './components/UraianEntrySection';
import { UraianRecapTableSection } from './components/UraianRecapTableSection';
import {
  auth,
  signInWithGoogle,
  signOutFromGoogle,
} from './firebase';
import {
  ensureUserProfile,
  loadCloudUserBundle,
  saveAbcWorkspaceToCloud,
  saveUraianWorkspaceToCloud,
  saveUserPreferencesToCloud,
  type CloudUserBundle,
} from './services/cloudSync';
import type {
  ActiveLayout,
  AnswerLetter,
  ButtonStyleMode,
  ScoreValue,
  StudentRow,
  SurveySubMode,
  UraianStudentRow,
} from './types/sheet';
import { firstEmptyIndex, normalizeAnswers } from './utils/answerParser';
import {
  exportProjectDataFile,
  parseProjectDataFile,
} from './utils/analysisExport';
import {
  buildExcelWorkbookData,
  buildTsvText,
  downloadCsvFile,
  downloadExcelWorkbook,
} from './utils/excelExport';
import {
  buildImportedStudentRows,
  buildImportedUraianRows,
} from './utils/excelImport';
import {
  buildUraianExcelWorkbookData,
  buildUraianTsvText,
  computeUraianStudentStats,
  downloadUraianCsvFile,
  downloadUraianExcelWorkbook,
  exportUraianProjectDataFile,
  firstEmptyScoreIndex,
  normalizeMaxScores,
  normalizeScores,
  parseUraianProjectDataFile,
} from './utils/uraianAnalysis';
import {
  exportAbcWordReport,
  exportUraianWordReport,
} from './utils/wordExport';

const STORAGE_KEY_ABC = 'rekap-lembar-jawaban-v1';
const STORAGE_KEY_URAIAN = 'rekap-lembar-jawaban-uraian-v1';
const THEME_STORAGE_KEY = 'rekap-lembar-jawaban-theme';
const BTN_STYLE_STORAGE_KEY = 'rekap-lembar-jawaban-btn-style';

interface PersistedAbcState {
  questionCount: number;
  examTitle: string;
  answerKey: AnswerLetter[];
  rows: StudentRow[];
  seq: number;
}

interface PersistedUraianState {
  itemCount: number;
  examTitle: string;
  subMode: SurveySubMode;
  scaleMin: number;
  defaultMaxScore: number;
  itemMaxScores: number[];
  rows: UraianStudentRow[];
  seq: number;
}

function loadInitialAbcState(): PersistedAbcState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ABC);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedAbcState>;
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

function loadInitialUraianState(): PersistedUraianState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_URAIAN);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedUraianState>;
      const itemCount =
        typeof parsed.itemCount === 'number' &&
        parsed.itemCount >= 1 &&
        parsed.itemCount <= 100
          ? parsed.itemCount
          : 10;
      const scaleMin =
        typeof parsed.scaleMin === 'number' && Number.isFinite(parsed.scaleMin)
          ? parsed.scaleMin
          : 0;
      const defaultMaxScore =
        typeof parsed.defaultMaxScore === 'number' &&
        parsed.defaultMaxScore > scaleMin
          ? parsed.defaultMaxScore
          : 10;
      const subMode: SurveySubMode =
        parsed.subMode === 'angket-4' ||
        parsed.subMode === 'angket-5' ||
        parsed.subMode === 'custom'
          ? parsed.subMode
          : 'uraian';
      const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
      const maxId = rows.reduce((acc, r) => Math.max(acc, r.id || 0), 0);
      return {
        itemCount,
        examTitle: typeof parsed.examTitle === 'string' ? parsed.examTitle : '',
        subMode,
        scaleMin,
        defaultMaxScore,
        itemMaxScores: normalizeMaxScores(
          Array.isArray(parsed.itemMaxScores) ? parsed.itemMaxScores : [],
          itemCount,
          defaultMaxScore,
          scaleMin,
        ),
        rows,
        seq: typeof parsed.seq === 'number' ? Math.max(parsed.seq, maxId) : maxId,
      };
    }
  } catch {
    // Ignore malformed storage
  }
  return {
    itemCount: 10,
    examTitle: '',
    subMode: 'uraian',
    scaleMin: 0,
    defaultMaxScore: 10,
    itemMaxScores: new Array(10).fill(10),
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

function loadInitialButtonStyle(): ButtonStyleMode {
  try {
    const saved = localStorage.getItem(BTN_STYLE_STORAGE_KEY);
    if (
      saved === 'wood' ||
      saved === 'tactile' ||
      saved === 'flat' ||
      saved === 'glass'
    ) {
      return saved;
    }
  } catch {
    // Ignore storage read error
  }
  return 'wood';
}

export default function App() {
  const [activeLayout, setActiveLayout] = useState<ActiveLayout>('beranda');
  const [darkMode, setDarkMode] = useState<boolean>(loadInitialTheme);
  const [buttonStyle, setButtonStyle] = useState<ButtonStyleMode>(
    loadInitialButtonStyle,
  );

  // ========================
  // Google Auth & Cloud Sync State
  // ========================
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [syncState, setSyncState] = useState<
    'idle' | 'syncing' | 'synced' | 'error'
  >('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [pendingCloudBundle, setPendingCloudBundle] =
    useState<CloudUserBundle | null>(null);
  const [isExportingAbcWord, setIsExportingAbcWord] = useState<boolean>(false);
  const [isExportingUraianWord, setIsExportingUraianWord] =
    useState<boolean>(false);
  const hasCheckedInitialCloudRef = useRef<boolean>(false);
  const skipNextAutoSyncRef = useRef<boolean>(false);

  // ========================
  // Layout 2: Pilihan Ganda (ABC) State
  // ========================
  const [initialAbc] = useState<PersistedAbcState>(loadInitialAbcState);
  const [questionCount, setQuestionCount] = useState<number>(
    initialAbc.questionCount,
  );
  const [examTitle, setExamTitle] = useState<string>(initialAbc.examTitle);
  const [answerKey, setAnswerKey] = useState<AnswerLetter[]>(
    initialAbc.answerKey,
  );
  const [rows, setRows] = useState<StudentRow[]>(initialAbc.rows);
  const [seq, setSeq] = useState<number>(initialAbc.seq);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialAbc.rows[0]?.id ?? null,
  );
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [clipboardFallbackText, setClipboardFallbackText] =
    useState<string>('');
  const [lastDeleted, setLastDeleted] = useState<{
    row: StudentRow;
    index: number;
  } | null>(null);
  const [isAbcPreviewOpen, setIsAbcPreviewOpen] = useState<boolean>(false);
  const [isAbcImportOpen, setIsAbcImportOpen] = useState<boolean>(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // ========================
  // Layout 3: Angket / Uraian State
  // ========================
  const [initialUraian] = useState<PersistedUraianState>(loadInitialUraianState);
  const [uraianItemCount, setUraianItemCount] = useState<number>(
    initialUraian.itemCount,
  );
  const [uraianExamTitle, setUraianExamTitle] = useState<string>(
    initialUraian.examTitle,
  );
  const [uraianSubMode, setUraianSubMode] = useState<SurveySubMode>(
    initialUraian.subMode,
  );
  const [uraianScaleMin, setUraianScaleMin] = useState<number>(
    initialUraian.scaleMin,
  );
  const [uraianDefaultMax, setUraianDefaultMax] = useState<number>(
    initialUraian.defaultMaxScore,
  );
  const [uraianItemMaxScores, setUraianItemMaxScores] = useState<number[]>(
    initialUraian.itemMaxScores,
  );
  const [uraianRows, setUraianRows] = useState<UraianStudentRow[]>(
    initialUraian.rows,
  );
  const [uraianSeq, setUraianSeq] = useState<number>(initialUraian.seq);
  const [uraianSelectedId, setUraianSelectedId] = useState<number | null>(
    initialUraian.rows[0]?.id ?? null,
  );
  const [uraianCurrentItemIdx, setUraianCurrentItemIdx] = useState<number>(0);
  const [uraianStatusMessage, setUraianStatusMessage] = useState<string>('');
  const [uraianClipboardFallback, setUraianClipboardFallback] =
    useState<string>('');
  const [uraianLastDeleted, setUraianLastDeleted] = useState<{
    row: UraianStudentRow;
    index: number;
  } | null>(null);
  const [isUraianPreviewOpen, setIsUraianPreviewOpen] = useState<boolean>(false);
  const [isUraianImportOpen, setIsUraianImportOpen] = useState<boolean>(false);
  const uraianNameInputRef = useRef<HTMLInputElement | null>(null);

  const abcExcelPreviewData = useMemo(() => {
    if (!isAbcPreviewOpen || rows.length === 0) return null;
    return buildExcelWorkbookData({
      rows,
      questionCount,
      examTitle,
      answerKey,
    });
  }, [isAbcPreviewOpen, rows, questionCount, examTitle, answerKey]);

  const uraianExcelPreviewData = useMemo(() => {
    if (!isUraianPreviewOpen || uraianRows.length === 0) return null;
    return buildUraianExcelWorkbookData({
      rows: uraianRows,
      itemCount: uraianItemCount,
      examTitle: uraianExamTitle,
      subMode: uraianSubMode,
      scaleMin: uraianScaleMin,
      itemMaxScores: uraianItemMaxScores,
    });
  }, [
    isUraianPreviewOpen,
    uraianRows,
    uraianItemCount,
    uraianExamTitle,
    uraianSubMode,
    uraianScaleMin,
    uraianItemMaxScores,
  ]);

  const abcChartData = useMemo<{
    hasScoreData: boolean;
    students: ChartStudentPoint[];
  }>(() => {
    const normKey = normalizeAnswers(answerKey, questionCount);
    const keyedIndices: number[] = [];
    for (let i = 0; i < questionCount; i++) {
      if (normKey[i] !== '') keyedIndices.push(i);
    }
    if (rows.length === 0 || keyedIndices.length === 0) {
      return { hasScoreData: false, students: [] };
    }
    const maxScore = keyedIndices.length;
    const students: ChartStudentPoint[] = rows.map((row, idx) => {
      const ans = normalizeAnswers(row.jawaban, questionCount);
      let correct = 0;
      for (const qIdx of keyedIndices) {
        if (ans[qIdx] === normKey[qIdx]) correct++;
      }
      return {
        id: row.id,
        nama: row.nama || `Siswa ${idx + 1}`,
        kelas: row.kelas || '',
        rawScore: correct,
        maxScore,
        percentScore: Math.round((correct / maxScore) * 1000) / 10,
      };
    });
    return { hasScoreData: true, students };
  }, [rows, questionCount, answerKey]);

  const uraianChartData = useMemo<{
    hasScoreData: boolean;
    students: ChartStudentPoint[];
  }>(() => {
    if (uraianRows.length === 0 || uraianItemCount < 1) {
      return { hasScoreData: false, students: [] };
    }
    const normMax = normalizeMaxScores(
      uraianItemMaxScores,
      uraianItemCount,
      uraianDefaultMax,
      uraianScaleMin,
    );
    const hasAnyFilled = uraianRows.some((r) =>
      r.scores.slice(0, uraianItemCount).some((v) => v !== null && v !== undefined),
    );
    if (!hasAnyFilled) {
      return { hasScoreData: false, students: [] };
    }
    const students: ChartStudentPoint[] = uraianRows.map((row, idx) => {
      const normScores = normalizeScores(
        row.scores,
        uraianItemCount,
        uraianScaleMin,
        normMax,
      );
      const stats = computeUraianStudentStats(
        normScores,
        uraianItemCount,
        normMax,
      );
      const pct =
        stats.maxPossible > 0
          ? Math.round((stats.totalScore / stats.maxPossible) * 1000) / 10
          : 0;
      return {
        id: row.id,
        nama: row.nama || `Peserta ${idx + 1}`,
        kelas: row.kelas || '',
        rawScore: stats.totalScore,
        maxScore: stats.maxPossible,
        percentScore: pct,
      };
    });
    return { hasScoreData: true, students };
  }, [
    uraianRows,
    uraianItemCount,
    uraianItemMaxScores,
    uraianDefaultMax,
    uraianScaleMin,
  ]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage write error
    }
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.dataset.btnStyle = buttonStyle;
    try {
      localStorage.setItem(BTN_STYLE_STORAGE_KEY, buttonStyle);
    } catch {
      // Ignore storage write error
    }
  }, [buttonStyle]);

  useEffect(() => {
    try {
      const payload: PersistedAbcState = {
        questionCount,
        examTitle,
        answerKey,
        rows,
        seq,
      };
      localStorage.setItem(STORAGE_KEY_ABC, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }, [questionCount, examTitle, answerKey, rows, seq]);

  useEffect(() => {
    try {
      const payload: PersistedUraianState = {
        itemCount: uraianItemCount,
        examTitle: uraianExamTitle,
        subMode: uraianSubMode,
        scaleMin: uraianScaleMin,
        defaultMaxScore: uraianDefaultMax,
        itemMaxScores: uraianItemMaxScores,
        rows: uraianRows,
        seq: uraianSeq,
      };
      localStorage.setItem(STORAGE_KEY_URAIAN, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }, [
    uraianItemCount,
    uraianExamTitle,
    uraianSubMode,
    uraianScaleMin,
    uraianDefaultMax,
    uraianItemMaxScores,
    uraianRows,
    uraianSeq,
  ]);

  useEffect(() => {
    if (currentQuestionIdx >= questionCount) {
      setCurrentQuestionIdx(Math.max(0, questionCount - 1));
    }
  }, [questionCount, currentQuestionIdx]);

  useEffect(() => {
    if (uraianCurrentItemIdx >= uraianItemCount) {
      setUraianCurrentItemIdx(Math.max(0, uraianItemCount - 1));
    }
  }, [uraianItemCount, uraianCurrentItemIdx]);

  // Keep latest state accessible in auth observer without re-subscribing
  const latestLocalSnapshotRef = useRef({
    darkMode,
    buttonStyle,
    examTitle,
    questionCount,
    answerKey,
    rows,
    seq,
    uraianSubMode,
    uraianExamTitle,
    uraianItemCount,
    uraianScaleMin,
    uraianDefaultMax,
    uraianItemMaxScores,
    uraianRows,
    uraianSeq,
  });
  latestLocalSnapshotRef.current = {
    darkMode,
    buttonStyle,
    examTitle,
    questionCount,
    answerKey,
    rows,
    seq,
    uraianSubMode,
    uraianExamTitle,
    uraianItemCount,
    uraianScaleMin,
    uraianDefaultMax,
    uraianItemMaxScores,
    uraianRows,
    uraianSeq,
  };

  function applyCloudBundleToLocal(bundle: CloudUserBundle) {
    skipNextAutoSyncRef.current = true;
    if (bundle.preferences) {
      setDarkMode(bundle.preferences.darkMode);
      setButtonStyle(bundle.preferences.buttonStyle);
    }
    if (bundle.abc) {
      setExamTitle(bundle.abc.examTitle);
      setQuestionCount(bundle.abc.questionCount);
      setAnswerKey(bundle.abc.answerKey);
      setRows(bundle.abc.rows);
      setSeq(bundle.abc.seq);
      setSelectedId(bundle.abc.rows[0]?.id ?? null);
      setCurrentQuestionIdx(
        bundle.abc.rows[0]
          ? firstEmptyIndex(
              bundle.abc.rows[0].jawaban,
              bundle.abc.questionCount,
            )
          : 0,
      );
      setLastDeleted(null);
      setClipboardFallbackText('');
    }
    if (bundle.uraian) {
      setUraianSubMode(bundle.uraian.subMode);
      setUraianExamTitle(bundle.uraian.examTitle);
      setUraianItemCount(bundle.uraian.itemCount);
      setUraianScaleMin(bundle.uraian.scaleMin);
      setUraianDefaultMax(bundle.uraian.defaultMaxScore);
      setUraianItemMaxScores(bundle.uraian.itemMaxScores);
      setUraianRows(bundle.uraian.rows);
      setUraianSeq(bundle.uraian.seq);
      setUraianSelectedId(bundle.uraian.rows[0]?.id ?? null);
      setUraianCurrentItemIdx(
        bundle.uraian.rows[0]
          ? firstEmptyScoreIndex(
              bundle.uraian.rows[0].scores,
              bundle.uraian.itemCount,
            )
          : 0,
      );
      setUraianLastDeleted(null);
      setUraianClipboardFallback('');
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthError('');

      if (!nextUser) {
        hasCheckedInitialCloudRef.current = false;
        setPendingCloudBundle(null);
        setSyncState('idle');
        setSyncMessage('');
        return;
      }

      hasCheckedInitialCloudRef.current = false;
      setSyncState('syncing');
      setSyncMessage('Memeriksa data tersimpan di akun Google...');

      try {
        const snap = latestLocalSnapshotRef.current;
        await ensureUserProfile(nextUser, {
          darkMode: snap.darkMode,
          buttonStyle: snap.buttonStyle,
        });

        const bundle = await loadCloudUserBundle(nextUser.uid);
        const cloudHasAbc = Boolean(
          bundle.abc &&
            (bundle.abc.rows.length > 0 ||
              bundle.abc.examTitle.trim() !== '' ||
              bundle.abc.answerKey.some((k) => k !== '')),
        );
        const cloudHasUraian = Boolean(
          bundle.uraian &&
            (bundle.uraian.rows.length > 0 ||
              bundle.uraian.examTitle.trim() !== ''),
        );
        const localHasAbc =
          snap.rows.length > 0 ||
          snap.examTitle.trim() !== '' ||
          snap.answerKey.some((k) => k !== '');
        const localHasUraian =
          snap.uraianRows.length > 0 || snap.uraianExamTitle.trim() !== '';

        if ((cloudHasAbc || cloudHasUraian) && (localHasAbc || localHasUraian)) {
          setPendingCloudBundle(bundle);
          setSyncState('idle');
          setSyncMessage(
            'Pilih apakah ingin memuat data akun Google atau menyimpan data lokal.',
          );
          return;
        }

        if (cloudHasAbc || cloudHasUraian) {
          applyCloudBundleToLocal(bundle);
          hasCheckedInitialCloudRef.current = true;
          setPendingCloudBundle(null);
          setSyncState('synced');
          setLastSyncedAt(new Date().toISOString());
          setSyncMessage('Data dari akun Google berhasil dimuat.');
          return;
        }

        // Cloud empty: upload current local data
        await saveAbcWorkspaceToCloud(
          nextUser,
          { darkMode: snap.darkMode, buttonStyle: snap.buttonStyle },
          {
            examTitle: snap.examTitle,
            questionCount: snap.questionCount,
            answerKey: snap.answerKey,
            rows: snap.rows,
            seq: snap.seq,
          },
        );
        await saveUraianWorkspaceToCloud(
          nextUser,
          { darkMode: snap.darkMode, buttonStyle: snap.buttonStyle },
          {
            subMode: snap.uraianSubMode,
            examTitle: snap.uraianExamTitle,
            itemCount: snap.uraianItemCount,
            scaleMin: snap.uraianScaleMin,
            defaultMaxScore: snap.uraianDefaultMax,
            itemMaxScores: snap.uraianItemMaxScores,
            rows: snap.uraianRows,
            seq: snap.uraianSeq,
          },
        );
        hasCheckedInitialCloudRef.current = true;
        setPendingCloudBundle(null);
        setSyncState('synced');
        setLastSyncedAt(new Date().toISOString());
        setSyncMessage('Data lokal berhasil dicadangkan ke akun Google.');
      } catch {
        setSyncState('error');
        setSyncMessage(
          'Gagal menghubungkan data ke cloud. Data lokal tetap aman.',
        );
      }
    });

    return () => unsubscribe();
  }, []);

  // Debounced auto-sync when signed in and no conflict is pending
  useEffect(() => {
    if (
      !user ||
      !hasCheckedInitialCloudRef.current ||
      pendingCloudBundle !== null
    ) {
      return;
    }
    if (skipNextAutoSyncRef.current) {
      skipNextAutoSyncRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        setSyncState('syncing');
        try {
          await saveUserPreferencesToCloud(user.uid, {
            darkMode,
            buttonStyle,
          });
          await saveAbcWorkspaceToCloud(
            user,
            { darkMode, buttonStyle },
            {
              examTitle,
              questionCount,
              answerKey,
              rows,
              seq,
            },
          );
          await saveUraianWorkspaceToCloud(
            user,
            { darkMode, buttonStyle },
            {
              subMode: uraianSubMode,
              examTitle: uraianExamTitle,
              itemCount: uraianItemCount,
              scaleMin: uraianScaleMin,
              defaultMaxScore: uraianDefaultMax,
              itemMaxScores: uraianItemMaxScores,
              rows: uraianRows,
              seq: uraianSeq,
            },
          );
          setSyncState('synced');
          setLastSyncedAt(new Date().toISOString());
          setSyncMessage('Tersinkron otomatis ke akun Google');
        } catch {
          setSyncState('error');
          setSyncMessage(
            'Sinkronisasi otomatis tertunda. Coba simpan manual di Pengaturan.',
          );
        }
      })();
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [
    user,
    pendingCloudBundle,
    darkMode,
    buttonStyle,
    examTitle,
    questionCount,
    answerKey,
    rows,
    seq,
    uraianSubMode,
    uraianExamTitle,
    uraianItemCount,
    uraianScaleMin,
    uraianDefaultMax,
    uraianItemMaxScores,
    uraianRows,
    uraianSeq,
  ]);

  const pendingConflict: CloudConflictSummary | null = useMemo(() => {
    if (!pendingCloudBundle) return null;
    return {
      localAbcCount: rows.length,
      localUraianCount: uraianRows.length,
      cloudAbcCount: pendingCloudBundle.abc?.rows.length ?? 0,
      cloudUraianCount: pendingCloudBundle.uraian?.rows.length ?? 0,
      cloudUpdatedAtIso:
        pendingCloudBundle.abc?.updatedAtIso ??
        pendingCloudBundle.uraian?.updatedAtIso ??
        null,
    };
  }, [pendingCloudBundle, rows.length, uraianRows.length]);

  async function handleSignInGoogle() {
    setAuthLoading(true);
    setAuthError('');
    try {
      await signInWithGoogle();
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: unknown }).code)
          : '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Jendela login Google ditutup sebelum selesai.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          'Browser memblokir popup login. Izinkan popup untuk melanjutkan.',
        );
      } else {
        setAuthError(
          'Gagal masuk dengan akun Google. Periksa koneksi internet Anda.',
        );
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOutGoogle() {
    setAuthLoading(true);
    setAuthError('');
    try {
      await signOutFromGoogle();
    } catch {
      setAuthError('Gagal keluar dari akun Google.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handlePushLocalToCloud() {
    if (!user) return;
    setSyncState('syncing');
    setSyncMessage('Menyimpan seluruh data lokal ke akun Google...');
    try {
      await ensureUserProfile(user, { darkMode, buttonStyle });
      await saveAbcWorkspaceToCloud(
        user,
        { darkMode, buttonStyle },
        {
          examTitle,
          questionCount,
          answerKey,
          rows,
          seq,
        },
      );
      await saveUraianWorkspaceToCloud(
        user,
        { darkMode, buttonStyle },
        {
          subMode: uraianSubMode,
          examTitle: uraianExamTitle,
          itemCount: uraianItemCount,
          scaleMin: uraianScaleMin,
          defaultMaxScore: uraianDefaultMax,
          itemMaxScores: uraianItemMaxScores,
          rows: uraianRows,
          seq: uraianSeq,
        },
      );
      hasCheckedInitialCloudRef.current = true;
      setPendingCloudBundle(null);
      setSyncState('synced');
      setLastSyncedAt(new Date().toISOString());
      setSyncMessage('Seluruh data berhasil disimpan ke akun Google.');
    } catch {
      setSyncState('error');
      setSyncMessage('Gagal menyimpan ke akun Google.');
    }
  }

  async function handlePullCloudToLocal() {
    if (!user) return;
    setSyncState('syncing');
    setSyncMessage('Mengambil data terbaru dari akun Google...');
    try {
      const bundle =
        pendingCloudBundle ?? (await loadCloudUserBundle(user.uid));
      applyCloudBundleToLocal(bundle);
      hasCheckedInitialCloudRef.current = true;
      setPendingCloudBundle(null);
      setSyncState('synced');
      setLastSyncedAt(new Date().toISOString());
      setSyncMessage('Data akun Google berhasil diterapkan ke perangkat ini.');
    } catch {
      setSyncState('error');
      setSyncMessage('Gagal mengambil data dari akun Google.');
    }
  }

  async function handleExportAbcWordFromCharts() {
    if (isExportingAbcWord) return;
    setIsExportingAbcWord(true);
    try {
      const filename = await exportAbcWordReport({
        examTitle,
        rows,
        questionCount,
        answerKey,
      });
      setStatusMessage(
        `Laporan Word lengkap (grafik & tabel) "${filename}" berhasil diunduh.`,
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Gagal membuat laporan Word (.docx).',
      );
    } finally {
      setIsExportingAbcWord(false);
    }
  }

  async function handleExportUraianWordFromCharts() {
    if (isExportingUraianWord) return;
    setIsExportingUraianWord(true);
    try {
      const filename = await exportUraianWordReport({
        examTitle: uraianExamTitle,
        rows: uraianRows,
        itemCount: uraianItemCount,
        subMode: uraianSubMode,
        scaleMin: uraianScaleMin,
        defaultMaxScore: uraianDefaultMax,
        itemMaxScores: uraianItemMaxScores,
      });
      setUraianStatusMessage(
        `Laporan Word lengkap (grafik & tabel) "${filename}" berhasil diunduh.`,
      );
    } catch (error) {
      setUraianStatusMessage(
        error instanceof Error
          ? error.message
          : 'Gagal membuat laporan Word (.docx).',
      );
    } finally {
      setIsExportingUraianWord(false);
    }
  }

  function handleNavigateLayout(nextLayout: ActiveLayout) {
    setActiveLayout(nextLayout);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ========================
  // ABC Handlers
  // ========================
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
    setStatusMessage(`Siswa "${nama}" ditambahkan.`);
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
    setStatusMessage(`${created.length} siswa ditambahkan ke tabel.`);
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
    setStatusMessage(
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
    setStatusMessage(`Siswa "${removed.nama || `Siswa ${idx + 1}`}" dihapus.`);
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
    setStatusMessage(`Siswa "${row.nama}" dikembalikan.`);
  }

  function handleClearAll() {
    setRows([]);
    setSelectedId(null);
    setCurrentQuestionIdx(0);
    setClipboardFallbackText('');
    setLastDeleted(null);
    setStatusMessage('Semua data siswa telah dikosongkan.');
  }

  function handleOpenPreview() {
    if (rows.length === 0) {
      setStatusMessage(
        'Tambahkan minimal satu siswa sebelum melihat pratinjau Excel.',
      );
      return;
    }
    setIsAbcPreviewOpen(true);
  }

  function handleDownloadExcel() {
    if (rows.length === 0) {
      setStatusMessage('Tambahkan minimal satu siswa sebelum mengunduh Excel.');
      return;
    }
    try {
      const filename = downloadExcelWorkbook({
        rows,
        questionCount,
        examTitle,
        answerKey,
      });
      setIsAbcPreviewOpen(false);
      setClipboardFallbackText('');
      setStatusMessage(`File Excel "${filename}" berhasil diunduh.`);
    } catch {
      setStatusMessage(
        'Gagal membuat file Excel. Gunakan Unduh CSV atau Salin tabel.',
      );
    }
  }

  function handleDownloadCsv() {
    if (rows.length === 0) {
      setStatusMessage('Tambahkan minimal satu siswa sebelum mengunduh CSV.');
      return;
    }
    const filename = downloadCsvFile({
      rows,
      questionCount,
      examTitle,
      answerKey,
    });
    setClipboardFallbackText('');
    setStatusMessage(`File CSV "${filename}" berhasil diunduh.`);
  }

  async function handleCopyTable() {
    if (rows.length === 0) {
      setStatusMessage('Belum ada data untuk disalin.');
      return;
    }
    const tsv = buildTsvText(rows, questionCount, answerKey);
    try {
      await navigator.clipboard.writeText(tsv);
      setClipboardFallbackText('');
      setStatusMessage(
        'Tabel berhasil disalin. Tempel (Ctrl+V) di sel A1 pada Excel atau Google Sheets.',
      );
    } catch {
      setClipboardFallbackText(tsv);
      setStatusMessage(
        'Salin otomatis dibatasi browser. Salin teks dari kotak di bawah lalu tempel di Excel.',
      );
    }
  }

  function handleExportProjectData() {
    const filename = exportProjectDataFile({
      examTitle,
      questionCount,
      answerKey,
      rows,
    });
    setStatusMessage(`File data tes "${filename}" berhasil disimpan.`);
  }

  function handleImportProjectData(rawText: string) {
    try {
      const loaded = parseProjectDataFile(rawText);
      const maxId = loaded.rows.reduce((acc, r) => Math.max(acc, r.id || 0), 0);
      setQuestionCount(loaded.questionCount);
      setExamTitle(loaded.examTitle);
      setAnswerKey(loaded.answerKey);
      setRows(loaded.rows);
      setSeq(maxId);
      setSelectedId(loaded.rows[0]?.id ?? null);
      setCurrentQuestionIdx(
        loaded.rows[0]
          ? firstEmptyIndex(loaded.rows[0].jawaban, loaded.questionCount)
          : 0,
      );
      setLastDeleted(null);
      setClipboardFallbackText('');
      setStatusMessage(
        `File data berhasil dibuka: ${loaded.rows.length} siswa × ${loaded.questionCount} soal.`,
      );
    } catch {
      setStatusMessage(
        'Gagal membuka file data. Pastikan file berformat .json hasil simpan aplikasi ini.',
      );
    }
  }

  function handleConfirmAbcExcelImport(payload: AbcExcelImportPayload) {
    const nextQuestionCount =
      payload.mode === 'replace'
        ? payload.questionCount
        : Math.max(questionCount, payload.questionCount);
    const startSeq = payload.mode === 'replace' ? 0 : seq;
    const importedRows = buildImportedStudentRows(
      payload.rows,
      startSeq,
      nextQuestionCount,
    );
    const nextSeq = startSeq + importedRows.length;

    setQuestionCount(nextQuestionCount);
    if (payload.applyKey && payload.answerKey) {
      setAnswerKey(normalizeAnswers(payload.answerKey, nextQuestionCount));
    }

    if (payload.mode === 'replace') {
      setRows(importedRows);
      setSelectedId(importedRows[0]?.id ?? null);
      setCurrentQuestionIdx(
        importedRows[0]
          ? firstEmptyIndex(importedRows[0].jawaban, nextQuestionCount)
          : 0,
      );
    } else {
      setRows((prev) => [...prev, ...importedRows]);
      if (selectedId === null && importedRows[0]) {
        setSelectedId(importedRows[0].id);
        setCurrentQuestionIdx(
          firstEmptyIndex(importedRows[0].jawaban, nextQuestionCount),
        );
      }
    }

    setSeq(nextSeq);
    setLastDeleted(null);
    setClipboardFallbackText('');
    setStatusMessage(
      `Berhasil mengimpor ${importedRows.length} siswa × ${nextQuestionCount} soal dari Excel.`,
    );
  }

  function handleLoadSampleData() {
    const sampleCount = Math.max(questionCount, 40);
    const opts: Array<Exclude<AnswerLetter, ''>> = ['A', 'B', 'C', 'D', 'E'];
    const sampleKey: AnswerLetter[] = Array.from(
      { length: sampleCount },
      (_, i) => opts[(i * 3 + 1) % 5],
    );

    const roster: Array<{ nama: string; kelas: string; accuracy: number }> = [
      { nama: 'Aulia Rahman', kelas: 'VIII-A', accuracy: 0.92 },
      { nama: 'Nadia Kusuma', kelas: 'VIII-A', accuracy: 0.88 },
      { nama: 'Rafi Pratama', kelas: 'VIII-A', accuracy: 0.85 },
      { nama: 'Citra Dewi Lestari', kelas: 'VIII-B', accuracy: 0.78 },
      { nama: 'Dimas Saputra', kelas: 'VIII-B', accuracy: 0.72 },
      { nama: 'Siti Nurhaliza', kelas: 'VIII-A', accuracy: 0.68 },
      { nama: 'Bagus Santoso', kelas: 'VIII-B', accuracy: 0.62 },
      { nama: 'Putri Maharani', kelas: 'VIII-B', accuracy: 0.55 },
      { nama: 'Hendra Wijaya', kelas: 'VIII-C', accuracy: 0.48 },
      { nama: 'Tari Melati', kelas: 'VIII-C', accuracy: 0.42 },
      { nama: 'Fajar Hidayat', kelas: 'VIII-C', accuracy: 0.35 },
      { nama: 'Rizky Maulana', kelas: 'VIII-C', accuracy: 0.28 },
    ];

    let nextId = seq;
    const created: StudentRow[] = roster.map((student, sIdx) => {
      nextId += 1;
      const jawaban: AnswerLetter[] = sampleKey.map((keyChar, qIdx) => {
        if (sIdx === 6 && qIdx === 34) return '';
        const itemFactor = (qIdx * 7 + sIdx * 13) % 100;
        const threshold = Math.round(student.accuracy * 100) - (qIdx % 5) * 4;
        if (itemFactor < threshold) {
          return keyChar;
        }
        const keyPos = opts.indexOf(keyChar as Exclude<AnswerLetter, ''>);
        const offset = 1 + ((sIdx + qIdx) % 4);
        return opts[(keyPos + offset) % 5];
      });
      return {
        id: nextId,
        nama: student.nama,
        kelas: student.kelas,
        jawaban,
      };
    });

    setQuestionCount(sampleCount);
    setExamTitle((prev) => prev || 'Try Out Matematika');
    setAnswerKey(sampleKey);
    setSeq(nextId);
    setRows(created);
    setSelectedId(created[0].id);
    setCurrentQuestionIdx(firstEmptyIndex(created[0].jawaban, sampleCount));
    setStatusMessage(
      `Contoh data ${created.length} siswa × ${sampleCount} butir soal berhasil dimuat.`,
    );
  }

  // ========================
  // Uraian / Angket Handlers
  // ========================
  function handleChangeUraianItemCount(nextCount: number) {
    setUraianItemCount(nextCount);
    setUraianItemMaxScores((prev) =>
      normalizeMaxScores(prev, nextCount, uraianDefaultMax, uraianScaleMin),
    );
  }

  function handleSelectUraianPresetMode(
    mode: SurveySubMode,
    min: number,
    defaultMax: number,
  ) {
    setUraianSubMode(mode);
    setUraianScaleMin(min);
    setUraianDefaultMax(defaultMax);
    setUraianItemMaxScores(new Array(uraianItemCount).fill(defaultMax));
  }

  function handleChangeUraianDefaultMax(nextMax: number) {
    setUraianDefaultMax(nextMax);
    setUraianItemMaxScores(new Array(uraianItemCount).fill(nextMax));
  }

  function handleChangeUraianItemMax(itemIdx: number, nextMax: number) {
    setUraianItemMaxScores((prev) => {
      const next = normalizeMaxScores(
        prev,
        uraianItemCount,
        uraianDefaultMax,
        uraianScaleMin,
      );
      next[itemIdx] = nextMax;
      return next;
    });
  }

  function handleAddUraianStudent(nama: string, kelas: string) {
    const nextId = uraianSeq + 1;
    const newRow: UraianStudentRow = {
      id: nextId,
      nama,
      kelas,
      scores: new Array(uraianItemCount).fill(null),
    };
    setUraianSeq(nextId);
    setUraianRows((prev) => [...prev, newRow]);
    setUraianSelectedId(nextId);
    setUraianCurrentItemIdx(0);
    setUraianClipboardFallback('');
    setUraianLastDeleted(null);
    setUraianStatusMessage(`Peserta "${nama}" ditambahkan.`);
  }

  function handleAddMultipleUraianStudents(
    items: Array<{ nama: string; kelas: string }>,
  ) {
    let nextSeq = uraianSeq;
    const created: UraianStudentRow[] = items.map((item) => {
      nextSeq += 1;
      return {
        id: nextSeq,
        nama: item.nama,
        kelas: item.kelas,
        scores: new Array(uraianItemCount).fill(null),
      };
    });
    setUraianSeq(nextSeq);
    setUraianRows((prev) => [...prev, ...created]);
    if (created.length > 0) {
      setUraianSelectedId(created[0].id);
      setUraianCurrentItemIdx(0);
    }
    setUraianClipboardFallback('');
    setUraianLastDeleted(null);
    setUraianStatusMessage(`${created.length} peserta ditambahkan.`);
  }

  function handleSelectUraianStudent(id: number) {
    setUraianSelectedId(id);
    const target = uraianRows.find((r) => r.id === id);
    if (target) {
      setUraianCurrentItemIdx(
        firstEmptyScoreIndex(target.scores, uraianItemCount),
      );
    }
  }

  function handleSetUraianScore(score: ScoreValue) {
    if (uraianSelectedId === null) return;
    const normMax = normalizeMaxScores(
      uraianItemMaxScores,
      uraianItemCount,
      uraianDefaultMax,
      uraianScaleMin,
    );
    setUraianRows((prev) =>
      prev.map((row) => {
        if (row.id !== uraianSelectedId) return row;
        const nextScores = normalizeScores(
          row.scores,
          Math.max(row.scores.length, uraianItemCount),
          uraianScaleMin,
          normMax,
        );
        nextScores[uraianCurrentItemIdx] = score;
        return { ...row, scores: nextScores };
      }),
    );
    if (score !== null && uraianCurrentItemIdx < uraianItemCount - 1) {
      setUraianCurrentItemIdx((i) => i + 1);
    }
  }

  function handleApplyBulkUraianScores(scores: ScoreValue[]) {
    if (uraianSelectedId === null) return;
    const target = uraianRows.find((r) => r.id === uraianSelectedId);
    setUraianRows((prev) =>
      prev.map((row) =>
        row.id === uraianSelectedId ? { ...row, scores } : row,
      ),
    );
    setUraianCurrentItemIdx(firstEmptyScoreIndex(scores, uraianItemCount));
    setUraianStatusMessage(
      `Skor untuk ${target?.nama || 'peserta terpilih'} berhasil diterapkan.`,
    );
  }

  function handleUpdateUraianRowMeta(
    id: number,
    field: 'nama' | 'kelas',
    value: string,
  ) {
    setUraianRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  function handleUpdateUraianCell(
    id: number,
    itemIdx: number,
    value: ScoreValue,
  ) {
    const normMax = normalizeMaxScores(
      uraianItemMaxScores,
      uraianItemCount,
      uraianDefaultMax,
      uraianScaleMin,
    );
    setUraianRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const nextScores = normalizeScores(
          row.scores,
          Math.max(row.scores.length, uraianItemCount),
          uraianScaleMin,
          normMax,
        );
        nextScores[itemIdx] = value;
        return { ...row, scores: nextScores };
      }),
    );
  }

  function handleRemoveUraianRow(id: number) {
    const idx = uraianRows.findIndex((r) => r.id === id);
    if (idx < 0) return;
    const removed = uraianRows[idx];
    const remaining = uraianRows.filter((r) => r.id !== id);
    setUraianRows(remaining);
    setUraianLastDeleted({ row: removed, index: idx });

    if (uraianSelectedId === id) {
      const nextTarget = remaining[Math.min(idx, remaining.length - 1)] || null;
      setUraianSelectedId(nextTarget ? nextTarget.id : null);
      setUraianCurrentItemIdx(
        nextTarget
          ? firstEmptyScoreIndex(nextTarget.scores, uraianItemCount)
          : 0,
      );
    }
    setUraianStatusMessage(
      `Peserta "${removed.nama || `Peserta ${idx + 1}`}" dihapus.`,
    );
  }

  function handleUndoUraianDelete() {
    if (!uraianLastDeleted) return;
    const { row, index } = uraianLastDeleted;
    setUraianRows((prev) => {
      const copy = [...prev];
      const insertAt = Math.min(Math.max(0, index), copy.length);
      copy.splice(insertAt, 0, row);
      return copy;
    });
    setUraianSelectedId(row.id);
    setUraianCurrentItemIdx(firstEmptyScoreIndex(row.scores, uraianItemCount));
    setUraianLastDeleted(null);
    setUraianStatusMessage(`Peserta "${row.nama}" dikembalikan.`);
  }

  function handleClearAllUraian() {
    setUraianRows([]);
    setUraianSelectedId(null);
    setUraianCurrentItemIdx(0);
    setUraianClipboardFallback('');
    setUraianLastDeleted(null);
    setUraianStatusMessage('Semua data angket / uraian dikosongkan.');
  }

  function handleDownloadUraianExcel() {
    if (uraianRows.length === 0) {
      setUraianStatusMessage(
        'Tambahkan minimal satu peserta sebelum mengunduh Excel.',
      );
      return;
    }
    try {
      const filename = downloadUraianExcelWorkbook({
        rows: uraianRows,
        itemCount: uraianItemCount,
        examTitle: uraianExamTitle,
        subMode: uraianSubMode,
        scaleMin: uraianScaleMin,
        itemMaxScores: uraianItemMaxScores,
      });
      setIsUraianPreviewOpen(false);
      setUraianClipboardFallback('');
      setUraianStatusMessage(`File Excel "${filename}" berhasil diunduh.`);
    } catch {
      setUraianStatusMessage('Gagal membuat file Excel.');
    }
  }

  function handleDownloadUraianCsv() {
    if (uraianRows.length === 0) return;
    const filename = downloadUraianCsvFile({
      rows: uraianRows,
      itemCount: uraianItemCount,
      examTitle: uraianExamTitle,
      subMode: uraianSubMode,
      scaleMin: uraianScaleMin,
      itemMaxScores: uraianItemMaxScores,
    });
    setUraianClipboardFallback('');
    setUraianStatusMessage(`File CSV "${filename}" berhasil diunduh.`);
  }

  async function handleCopyUraianTable() {
    if (uraianRows.length === 0) return;
    const tsv = buildUraianTsvText({
      rows: uraianRows,
      itemCount: uraianItemCount,
      examTitle: uraianExamTitle,
      subMode: uraianSubMode,
      scaleMin: uraianScaleMin,
      itemMaxScores: uraianItemMaxScores,
    });
    try {
      await navigator.clipboard.writeText(tsv);
      setUraianClipboardFallback('');
      setUraianStatusMessage(
        'Tabel berhasil disalin. Tempel (Ctrl+V) di Excel atau Google Sheets.',
      );
    } catch {
      setUraianClipboardFallback(tsv);
      setUraianStatusMessage('Salin teks dari kotak di bawah lalu tempel di Excel.');
    }
  }

  function handleExportUraianProjectData() {
    const filename = exportUraianProjectDataFile({
      examTitle: uraianExamTitle,
      subMode: uraianSubMode,
      itemCount: uraianItemCount,
      scaleMin: uraianScaleMin,
      defaultMaxScore: uraianDefaultMax,
      itemMaxScores: uraianItemMaxScores,
      rows: uraianRows,
    });
    setUraianStatusMessage(`File data "${filename}" berhasil disimpan.`);
  }

  function handleImportUraianProjectData(rawText: string) {
    try {
      const loaded = parseUraianProjectDataFile(rawText);
      const maxId = loaded.rows.reduce((acc, r) => Math.max(acc, r.id || 0), 0);
      setUraianExamTitle(loaded.examTitle);
      setUraianSubMode(loaded.subMode);
      setUraianItemCount(loaded.itemCount);
      setUraianScaleMin(loaded.scaleMin);
      setUraianDefaultMax(loaded.defaultMaxScore);
      setUraianItemMaxScores(loaded.itemMaxScores);
      setUraianRows(loaded.rows);
      setUraianSeq(maxId);
      setUraianSelectedId(loaded.rows[0]?.id ?? null);
      setUraianCurrentItemIdx(
        loaded.rows[0]
          ? firstEmptyScoreIndex(loaded.rows[0].scores, loaded.itemCount)
          : 0,
      );
      setUraianLastDeleted(null);
      setUraianClipboardFallback('');
      setUraianStatusMessage(
        `File data dibuka: ${loaded.rows.length} peserta × ${loaded.itemCount} butir.`,
      );
    } catch {
      setUraianStatusMessage(
        'Gagal membuka file data. Pastikan file berformat .json hasil simpan angket/uraian.',
      );
    }
  }

  function handleConfirmUraianExcelImport(payload: UraianExcelImportPayload) {
    const nextItemCount =
      payload.mode === 'replace'
        ? payload.itemCount
        : Math.max(uraianItemCount, payload.itemCount);
    const nextScaleMin =
      payload.mode === 'replace'
        ? payload.inferredMinScore
        : Math.min(uraianScaleMin, payload.inferredMinScore);
    const nextDefaultMax =
      payload.mode === 'replace'
        ? payload.inferredMaxScore
        : Math.max(uraianDefaultMax, payload.inferredMaxScore);

    const nextMaxScores =
      payload.applyMaxScores && payload.maxScores
        ? normalizeMaxScores(
            payload.maxScores,
            nextItemCount,
            nextDefaultMax,
            nextScaleMin,
          )
        : normalizeMaxScores(
            uraianItemMaxScores,
            nextItemCount,
            nextDefaultMax,
            nextScaleMin,
          );

    const startSeq = payload.mode === 'replace' ? 0 : uraianSeq;
    const importedRows = buildImportedUraianRows(
      payload.rows,
      startSeq,
      nextItemCount,
    );
    const nextSeq = startSeq + importedRows.length;

    setUraianItemCount(nextItemCount);
    setUraianScaleMin(nextScaleMin);
    setUraianDefaultMax(nextDefaultMax);
    setUraianItemMaxScores(nextMaxScores);

    if (payload.mode === 'replace') {
      setUraianRows(importedRows);
      setUraianSelectedId(importedRows[0]?.id ?? null);
      setUraianCurrentItemIdx(
        importedRows[0]
          ? firstEmptyScoreIndex(importedRows[0].scores, nextItemCount)
          : 0,
      );
    } else {
      setUraianRows((prev) => [...prev, ...importedRows]);
      if (uraianSelectedId === null && importedRows[0]) {
        setUraianSelectedId(importedRows[0].id);
        setUraianCurrentItemIdx(
          firstEmptyScoreIndex(importedRows[0].scores, nextItemCount),
        );
      }
    }

    setUraianSeq(nextSeq);
    setUraianLastDeleted(null);
    setUraianClipboardFallback('');
    setUraianStatusMessage(
      `Berhasil mengimpor ${importedRows.length} peserta × ${nextItemCount} butir dari Excel.`,
    );
  }

  function handleLoadSampleUraianData() {
    const count = 10;
    const minVal = uraianSubMode === 'angket-4' || uraianSubMode === 'angket-5' ? 1 : 0;
    const maxVal =
      uraianSubMode === 'angket-4'
        ? 4
        : uraianSubMode === 'angket-5'
          ? 5
          : 10;
    const maxList = new Array(count).fill(maxVal);

    const roster: Array<{ nama: string; kelas: string; level: number }> = [
      { nama: 'Aulia Rahman', kelas: 'VIII-A', level: 0.92 },
      { nama: 'Nadia Kusuma', kelas: 'VIII-A', level: 0.87 },
      { nama: 'Rafi Pratama', kelas: 'VIII-A', level: 0.82 },
      { nama: 'Citra Dewi Lestari', kelas: 'VIII-B', level: 0.78 },
      { nama: 'Dimas Saputra', kelas: 'VIII-B', level: 0.72 },
      { nama: 'Siti Nurhaliza', kelas: 'VIII-A', level: 0.66 },
      { nama: 'Bagus Santoso', kelas: 'VIII-B', level: 0.61 },
      { nama: 'Putri Maharani', kelas: 'VIII-B', level: 0.54 },
      { nama: 'Hendra Wijaya', kelas: 'VIII-C', level: 0.48 },
      { nama: 'Tari Melati', kelas: 'VIII-C', level: 0.42 },
      { nama: 'Fajar Hidayat', kelas: 'VIII-C', level: 0.36 },
      { nama: 'Rizky Maulana', kelas: 'VIII-C', level: 0.3 },
    ];

    let nextId = uraianSeq;
    const created: UraianStudentRow[] = roster.map((p, sIdx) => {
      nextId += 1;
      const scores: ScoreValue[] = Array.from({ length: count }, (_, qIdx) => {
        const span = maxVal - minVal;
        const jitter = ((sIdx * 3 + qIdx * 5) % 5) - 2;
        const raw = Math.round(minVal + p.level * span + jitter * 0.45);
        return Math.min(maxVal, Math.max(minVal, raw));
      });
      return {
        id: nextId,
        nama: p.nama,
        kelas: p.kelas,
        scores,
      };
    });

    setUraianItemCount(count);
    setUraianScaleMin(minVal);
    setUraianDefaultMax(maxVal);
    setUraianItemMaxScores(maxList);
    setUraianExamTitle(
      (prev) =>
        prev ||
        (uraianSubMode === 'uraian'
          ? 'Penilaian Uraian IPA'
          : 'Angket Motivasi Belajar'),
    );
    setUraianSeq(nextId);
    setUraianRows(created);
    setUraianSelectedId(created[0].id);
    setUraianCurrentItemIdx(firstEmptyScoreIndex(created[0].scores, count));
    setUraianStatusMessage(
      `Contoh data ${created.length} peserta × ${count} butir berhasil dimuat.`,
    );
  }

  return (
    <div
      id="top"
      className="min-h-screen bg-[#F4F6F5] text-[#14211C] dark:bg-[#0E1411] dark:text-[#E6EEE9]"
    >
      <SplashIntro />
      <TopBar
        activeLayout={activeLayout}
        hasRows={
          activeLayout === 'abc'
            ? rows.length > 0
            : activeLayout === 'uraian'
              ? uraianRows.length > 0
              : true
        }
        user={user}
        onSelectLayout={handleNavigateLayout}
        onDownloadExcel={
          activeLayout === 'uraian'
            ? handleDownloadUraianExcel
            : handleDownloadExcel
        }
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {activeLayout === 'beranda' && (
          <HomeBerandaSection
            abcRowsCount={rows.length}
            abcQuestionCount={questionCount}
            abcExamTitle={examTitle}
            uraianRowsCount={uraianRows.length}
            uraianItemCount={uraianItemCount}
            uraianExamTitle={uraianExamTitle}
            darkMode={darkMode}
            buttonStyle={buttonStyle}
            onToggleDarkMode={() => setDarkMode((d) => !d)}
            onChangeButtonStyle={setButtonStyle}
            onSelectLayout={handleNavigateLayout}
          />
        )}

        {activeLayout === 'abc' && (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleNavigateLayout('beranda')}
                    className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap"
                  >
                    <ArrowLeft className="btn-nudge-left h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Kembali ke Beranda</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigateLayout('uraian')}
                    className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap"
                  >
                    Pindah ke Mode Angket / Uraian
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap"
                  >
                    <Settings className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{user ? 'Akun & Pengaturan' : 'Pengaturan'}</span>
                  </button>
                </div>

                <h1 className="text-balance text-2xl font-bold tracking-tight text-[#14211C] sm:text-3xl dark:text-[#E6EEE9]">
                  Rekap Lembar Jawaban ABC (Pilihan Ganda)
                </h1>
                <p className="max-w-2xl text-sm text-[#52635C] sm:text-base dark:text-[#9AAAA2]">
                  Atur jumlah butir soal hingga 200 nomor, masukkan kunci dan
                  jawaban siswa, unduh Excel (.xlsx) atau Word (.docx), serta
                  lihat 7 hasil olah data butir soal.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <ButtonStylePicker
                  compact
                  buttonStyle={buttonStyle}
                  onChangeButtonStyle={setButtonStyle}
                />
                <PWAInstallBar />
              </div>
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
              onExportProjectData={handleExportProjectData}
              onImportProjectData={handleImportProjectData}
              onOpenExcelImport={() => setIsAbcImportOpen(true)}
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

            <ItemAnalysisSection
              examTitle={examTitle}
              rows={rows}
              questionCount={questionCount}
              answerKey={answerKey}
              onLoadSampleData={handleLoadSampleData}
              onFocusConfig={() => {
                document
                  .getElementById('pengaturan')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              onExportProjectData={handleExportProjectData}
            />

            <ClassScoreChartsSection
              id="visualisasi-ringkas"
              mode="abc"
              darkMode={darkMode}
              students={abcChartData.students}
              hasScoreData={abcChartData.hasScoreData}
              emptyReason="Tambahkan siswa dan atur Kunci Jawaban terlebih dahulu agar rata-rata skor per kelas dan distribusi nilai dapat ditampilkan."
              onLoadSampleData={handleLoadSampleData}
              onExportWord={handleExportAbcWordFromCharts}
              isExportingWord={isExportingAbcWord}
            />
          </>
        )}

        {activeLayout === 'uraian' && (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleNavigateLayout('beranda')}
                    className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap"
                  >
                    <ArrowLeft className="btn-nudge-left h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Kembali ke Beranda</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigateLayout('abc')}
                    className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap"
                  >
                    Pindah ke Mode Pilihan Ganda (ABC)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap"
                  >
                    <Settings className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{user ? 'Akun & Pengaturan' : 'Pengaturan'}</span>
                  </button>
                </div>

                <h1 className="text-balance text-2xl font-bold tracking-tight text-[#14211C] sm:text-3xl dark:text-[#E6EEE9]">
                  Rekap Skor Angket &amp; Soal Uraian
                </h1>
                <p className="max-w-2xl text-sm text-[#52635C] sm:text-base dark:text-[#9AAAA2]">
                  Kelola skor butir uraian (bobot per nomor) maupun angket skala
                  Likert (1–4, 1–5), ekspor Excel atau Word (.docx), dan hitung
                  reliabilitas Alpha Cronbach hingga validitas butir.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <ButtonStylePicker
                  compact
                  buttonStyle={buttonStyle}
                  onChangeButtonStyle={setButtonStyle}
                />
                <PWAInstallBar />
              </div>
            </div>

            <UraianConfigAndStudentSection
              itemCount={uraianItemCount}
              examTitle={uraianExamTitle}
              subMode={uraianSubMode}
              scaleMin={uraianScaleMin}
              defaultMaxScore={uraianDefaultMax}
              itemMaxScores={uraianItemMaxScores}
              rows={uraianRows}
              selectedId={uraianSelectedId}
              nameInputRef={uraianNameInputRef}
              onChangeItemCount={handleChangeUraianItemCount}
              onChangeExamTitle={setUraianExamTitle}
              onSelectPresetMode={handleSelectUraianPresetMode}
              onChangeDefaultMaxScore={handleChangeUraianDefaultMax}
              onChangeItemMaxScore={handleChangeUraianItemMax}
              onAddStudent={handleAddUraianStudent}
              onAddMultipleStudents={handleAddMultipleUraianStudents}
              onSelectStudent={handleSelectUraianStudent}
              onRemoveStudent={handleRemoveUraianRow}
              onExportProjectData={handleExportUraianProjectData}
              onImportProjectData={handleImportUraianProjectData}
              onOpenExcelImport={() => setIsUraianImportOpen(true)}
            />

            <UraianEntrySection
              rows={uraianRows}
              itemCount={uraianItemCount}
              scaleMin={uraianScaleMin}
              defaultMaxScore={uraianDefaultMax}
              itemMaxScores={uraianItemMaxScores}
              selectedId={uraianSelectedId}
              currentItemIdx={uraianCurrentItemIdx}
              onSelectStudent={handleSelectUraianStudent}
              onSelectItem={setUraianCurrentItemIdx}
              onSetScore={handleSetUraianScore}
              onApplyBulkScores={handleApplyBulkUraianScores}
              onRemoveStudent={handleRemoveUraianRow}
              onFocusAddStudent={() => uraianNameInputRef.current?.focus()}
            />

            <UraianRecapTableSection
              rows={uraianRows}
              itemCount={uraianItemCount}
              scaleMin={uraianScaleMin}
              defaultMaxScore={uraianDefaultMax}
              itemMaxScores={uraianItemMaxScores}
              selectedId={uraianSelectedId}
              darkMode={darkMode}
              statusMessage={uraianStatusMessage}
              canUndoDelete={uraianLastDeleted !== null}
              clipboardFallbackText={uraianClipboardFallback}
              onToggleDarkMode={() => setDarkMode((d) => !d)}
              onSelectStudent={handleSelectUraianStudent}
              onUpdateRowMeta={handleUpdateUraianRowMeta}
              onUpdateCell={handleUpdateUraianCell}
              onRemoveRow={handleRemoveUraianRow}
              onUndoDelete={handleUndoUraianDelete}
              onPreviewExcel={() => {
                if (uraianRows.length > 0) setIsUraianPreviewOpen(true);
              }}
              onDownloadExcel={handleDownloadUraianExcel}
              onDownloadCsv={handleDownloadUraianCsv}
              onCopyTable={handleCopyUraianTable}
              onClearAll={handleClearAllUraian}
              onLoadSampleData={handleLoadSampleUraianData}
            />

            <UraianAnalysisSection
              examTitle={uraianExamTitle}
              rows={uraianRows}
              itemCount={uraianItemCount}
              subMode={uraianSubMode}
              scaleMin={uraianScaleMin}
              defaultMaxScore={uraianDefaultMax}
              itemMaxScores={uraianItemMaxScores}
              onLoadSampleData={handleLoadSampleUraianData}
              onExportProjectData={handleExportUraianProjectData}
            />

            <ClassScoreChartsSection
              id="uraian-visualisasi"
              mode="uraian"
              darkMode={darkMode}
              students={uraianChartData.students}
              hasScoreData={uraianChartData.hasScoreData}
              emptyReason="Tambahkan peserta dan isi minimal satu skor butir agar rata-rata skor per kelas dan distribusi nilai dapat ditampilkan."
              onLoadSampleData={handleLoadSampleUraianData}
              onExportWord={handleExportUraianWordFromCharts}
              isExportingWord={isExportingUraianWord}
            />
          </>
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        user={user}
        authLoading={authLoading}
        authError={authError}
        syncState={syncState}
        syncMessage={syncMessage}
        lastSyncedAt={lastSyncedAt}
        pendingConflict={pendingConflict}
        darkMode={darkMode}
        buttonStyle={buttonStyle}
        onClose={() => setIsSettingsOpen(false)}
        onSignInGoogle={handleSignInGoogle}
        onSignOut={handleSignOutGoogle}
        onPushLocalToCloud={handlePushLocalToCloud}
        onPullCloudToLocal={handlePullCloudToLocal}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onChangeButtonStyle={setButtonStyle}
      />

      <ExcelPreviewModal
        isOpen={isAbcPreviewOpen}
        preview={abcExcelPreviewData}
        onClose={() => setIsAbcPreviewOpen(false)}
        onConfirmDownload={handleDownloadExcel}
      />

      <ExcelPreviewModal
        isOpen={isUraianPreviewOpen}
        preview={uraianExcelPreviewData}
        onClose={() => setIsUraianPreviewOpen(false)}
        onConfirmDownload={handleDownloadUraianExcel}
      />

      <ExcelImportModal
        isOpen={isAbcImportOpen}
        targetMode="abc"
        currentItemCount={questionCount}
        examTitle={examTitle}
        hasExistingRows={rows.length > 0}
        onClose={() => setIsAbcImportOpen(false)}
        onConfirmAbc={handleConfirmAbcExcelImport}
      />

      <ExcelImportModal
        isOpen={isUraianImportOpen}
        targetMode="uraian"
        currentItemCount={uraianItemCount}
        currentScaleMin={uraianScaleMin}
        currentDefaultMax={uraianDefaultMax}
        examTitle={uraianExamTitle}
        hasExistingRows={uraianRows.length > 0}
        onClose={() => setIsUraianImportOpen(false)}
        onConfirmUraian={handleConfirmUraianExcelImport}
      />
    </div>
  );
}
