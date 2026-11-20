import type { User } from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  AnswerLetter,
  ButtonStyleMode,
  ScoreValue,
  StudentRow,
  SurveySubMode,
  UraianStudentRow,
} from '../types/sheet';
import { normalizeAnswers } from '../utils/answerParser';
import { normalizeMaxScores, normalizeScores } from '../utils/uraianAnalysis';

// Blueprint-synchronized volumetric limits
const MAX_EMAIL_LEN = 200;
const MAX_DISPLAY_NAME_LEN = 120;
const MAX_PHOTO_URL_LEN = 500;
const MAX_TITLE_LEN = 200;
const MAX_ABC_QUESTIONS = 200;
const MAX_URAIAN_ITEMS = 100;
const MAX_ROWS = 500;
const MAX_SEQ = 1_000_000;
const VALID_BUTTON_STYLES: ButtonStyleMode[] = [
  'wood',
  'tactile',
  'flat',
  'glass',
];
const VALID_SUB_MODES: SurveySubMode[] = [
  'uraian',
  'angket-4',
  'angket-5',
  'custom',
];

export interface CloudAbcPayload {
  examTitle: string;
  questionCount: number;
  answerKey: AnswerLetter[];
  rows: StudentRow[];
  seq: number;
  updatedAtIso: string | null;
}

export interface CloudUraianPayload {
  subMode: SurveySubMode;
  examTitle: string;
  itemCount: number;
  scaleMin: number;
  defaultMaxScore: number;
  itemMaxScores: number[];
  rows: UraianStudentRow[];
  seq: number;
  updatedAtIso: string | null;
}

export interface CloudPreferencesPayload {
  darkMode: boolean;
  buttonStyle: ButtonStyleMode;
  updatedAtIso: string | null;
}

export interface CloudUserBundle {
  preferences: CloudPreferencesPayload | null;
  abc: CloudAbcPayload | null;
  uraian: CloudUraianPayload | null;
}

function timestampToIso(value: unknown): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function sanitizeAbcPayload(data: {
  examTitle: string;
  questionCount: number;
  answerKey: AnswerLetter[];
  rows: StudentRow[];
  seq: number;
}) {
  const questionCount = Math.max(
    1,
    Math.min(MAX_ABC_QUESTIONS, Math.round(data.questionCount || 30)),
  );
  const answerKey = normalizeAnswers(data.answerKey, questionCount).slice(
    0,
    MAX_ABC_QUESTIONS,
  );
  const rows = data.rows.slice(0, MAX_ROWS).map((r, idx) => ({
    id: Math.max(0, Math.round(r.id || idx + 1)),
    nama: String(r.nama ?? '').slice(0, 120),
    kelas: String(r.kelas ?? '').slice(0, 60),
    jawaban: normalizeAnswers(
      Array.isArray(r.jawaban) ? r.jawaban : [],
      questionCount,
    ),
  }));
  const maxId = rows.reduce((acc, r) => Math.max(acc, r.id), 0);
  const seq = Math.max(
    maxId,
    Math.min(MAX_SEQ, Math.round(data.seq || maxId)),
  );

  return {
    examTitle: String(data.examTitle ?? '').slice(0, MAX_TITLE_LEN),
    questionCount,
    answerKey,
    rows,
    seq,
  };
}

function sanitizeUraianPayload(data: {
  subMode: SurveySubMode;
  examTitle: string;
  itemCount: number;
  scaleMin: number;
  defaultMaxScore: number;
  itemMaxScores: number[];
  rows: UraianStudentRow[];
  seq: number;
}) {
  const subMode: SurveySubMode = VALID_SUB_MODES.includes(data.subMode)
    ? data.subMode
    : 'uraian';
  const itemCount = Math.max(
    1,
    Math.min(MAX_URAIAN_ITEMS, Math.round(data.itemCount || 10)),
  );
  const scaleMin = Math.max(
    -100,
    Math.min(1000, Number.isFinite(data.scaleMin) ? data.scaleMin : 0),
  );
  const defaultMaxScore = Math.max(
    scaleMin + 1,
    Math.min(
      10000,
      Number.isFinite(data.defaultMaxScore) ? data.defaultMaxScore : 10,
    ),
  );
  const itemMaxScores = normalizeMaxScores(
    data.itemMaxScores,
    itemCount,
    defaultMaxScore,
    scaleMin,
  ).slice(0, MAX_URAIAN_ITEMS);

  const rows = data.rows.slice(0, MAX_ROWS).map((r, idx) => ({
    id: Math.max(0, Math.round(r.id || idx + 1)),
    nama: String(r.nama ?? '').slice(0, 120),
    kelas: String(r.kelas ?? '').slice(0, 60),
    scores: normalizeScores(
      Array.isArray(r.scores) ? r.scores : [],
      itemCount,
      scaleMin,
      itemMaxScores,
    ),
  }));
  const maxId = rows.reduce((acc, r) => Math.max(acc, r.id), 0);
  const seq = Math.max(
    maxId,
    Math.min(MAX_SEQ, Math.round(data.seq || maxId)),
  );

  return {
    subMode,
    examTitle: String(data.examTitle ?? '').slice(0, MAX_TITLE_LEN),
    itemCount,
    scaleMin,
    defaultMaxScore,
    itemMaxScores,
    rows,
    seq,
  };
}

export async function ensureUserProfile(
  user: User,
  prefs: { darkMode: boolean; buttonStyle: ButtonStyleMode },
): Promise<void> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const safeStyle: ButtonStyleMode = VALID_BUTTON_STYLES.includes(
    prefs.buttonStyle,
  )
    ? prefs.buttonStyle
    : 'wood';

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const profileFields = {
    email: (user.email ?? '').slice(0, MAX_EMAIL_LEN),
    displayName: (user.displayName ?? 'Pengguna Google').slice(
      0,
      MAX_DISPLAY_NAME_LEN,
    ),
    photoURL: (user.photoURL ?? '').slice(0, MAX_PHOTO_URL_LEN),
    darkMode: Boolean(prefs.darkMode),
    buttonStyle: safeStyle,
  };

  if (!snap.exists()) {
    try {
      await setDoc(userRef, {
        uid: user.uid,
        ...profileFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(userRef, {
        ...profileFields,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

export async function saveUserPreferencesToCloud(
  uid: string,
  prefs: { darkMode: boolean; buttonStyle: ButtonStyleMode },
): Promise<void> {
  const path = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  const safeStyle: ButtonStyleMode = VALID_BUTTON_STYLES.includes(
    prefs.buttonStyle,
  )
    ? prefs.buttonStyle
    : 'wood';

  try {
    await updateDoc(userRef, {
      darkMode: Boolean(prefs.darkMode),
      buttonStyle: safeStyle,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveAbcWorkspaceToCloud(
  user: User,
  prefs: { darkMode: boolean; buttonStyle: ButtonStyleMode },
  data: {
    examTitle: string;
    questionCount: number;
    answerKey: AnswerLetter[];
    rows: StudentRow[];
    seq: number;
  },
): Promise<void> {
  const path = `users/${user.uid}/abc_workspaces/default`;
  const ref = doc(db, 'users', user.uid, 'abc_workspaces', 'default');

  // Ensure parent user doc exists (Master Gate requirement in firestore.rules)
  const userRef = doc(db, 'users', user.uid);
  let userSnap;
  try {
    userSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
  }
  if (!userSnap.exists()) {
    await ensureUserProfile(user, prefs);
  }

  let snap;
  try {
    snap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const sanitized = sanitizeAbcPayload(data);

  if (!snap.exists()) {
    try {
      await setDoc(ref, {
        ownerId: user.uid,
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(ref, {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

export async function saveUraianWorkspaceToCloud(
  user: User,
  prefs: { darkMode: boolean; buttonStyle: ButtonStyleMode },
  data: {
    subMode: SurveySubMode;
    examTitle: string;
    itemCount: number;
    scaleMin: number;
    defaultMaxScore: number;
    itemMaxScores: number[];
    rows: UraianStudentRow[];
    seq: number;
  },
): Promise<void> {
  const path = `users/${user.uid}/uraian_workspaces/default`;
  const ref = doc(db, 'users', user.uid, 'uraian_workspaces', 'default');

  const userRef = doc(db, 'users', user.uid);
  let userSnap;
  try {
    userSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
  }
  if (!userSnap.exists()) {
    await ensureUserProfile(user, prefs);
  }

  let snap;
  try {
    snap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const sanitized = sanitizeUraianPayload(data);

  if (!snap.exists()) {
    try {
      await setDoc(ref, {
        ownerId: user.uid,
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(ref, {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

export async function loadCloudUserBundle(
  uid: string,
): Promise<CloudUserBundle> {
  const userPath = `users/${uid}`;
  const abcPath = `users/${uid}/abc_workspaces/default`;
  const uraianPath = `users/${uid}/uraian_workspaces/default`;

  let userSnap;
  try {
    userSnap = await getDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  let abcSnap;
  try {
    abcSnap = await getDoc(doc(db, 'users', uid, 'abc_workspaces', 'default'));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, abcPath);
  }

  let uraianSnap;
  try {
    uraianSnap = await getDoc(
      doc(db, 'users', uid, 'uraian_workspaces', 'default'),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, uraianPath);
  }

  let preferences: CloudPreferencesPayload | null = null;
  if (userSnap.exists()) {
    const raw = userSnap.data();
    preferences = {
      darkMode: Boolean(raw.darkMode),
      buttonStyle: VALID_BUTTON_STYLES.includes(raw.buttonStyle as ButtonStyleMode)
        ? (raw.buttonStyle as ButtonStyleMode)
        : 'wood',
      updatedAtIso: timestampToIso(raw.updatedAt),
    };
  }

  let abc: CloudAbcPayload | null = null;
  if (abcSnap.exists()) {
    const raw = abcSnap.data();
    const questionCount =
      typeof raw.questionCount === 'number' &&
      raw.questionCount >= 1 &&
      raw.questionCount <= MAX_ABC_QUESTIONS
        ? Math.round(raw.questionCount)
        : 30;
    const rawRows = Array.isArray(raw.rows) ? (raw.rows as Partial<StudentRow>[]) : [];
    const rows: StudentRow[] = rawRows.map((r, idx) => ({
      id: typeof r.id === 'number' ? r.id : idx + 1,
      nama: typeof r.nama === 'string' ? r.nama : '',
      kelas: typeof r.kelas === 'string' ? r.kelas : '',
      jawaban: Array.isArray(r.jawaban)
        ? normalizeAnswers(r.jawaban as AnswerLetter[], questionCount)
        : new Array(questionCount).fill(''),
    }));
    const maxId = rows.reduce((acc, r) => Math.max(acc, r.id), 0);
    abc = {
      examTitle: typeof raw.examTitle === 'string' ? raw.examTitle : '',
      questionCount,
      answerKey: Array.isArray(raw.answerKey)
        ? normalizeAnswers(raw.answerKey as AnswerLetter[], questionCount)
        : [],
      rows,
      seq: typeof raw.seq === 'number' ? Math.max(raw.seq, maxId) : maxId,
      updatedAtIso: timestampToIso(raw.updatedAt),
    };
  }

  let uraian: CloudUraianPayload | null = null;
  if (uraianSnap.exists()) {
    const raw = uraianSnap.data();
    const itemCount =
      typeof raw.itemCount === 'number' &&
      raw.itemCount >= 1 &&
      raw.itemCount <= MAX_URAIAN_ITEMS
        ? Math.round(raw.itemCount)
        : 10;
    const scaleMin =
      typeof raw.scaleMin === 'number' && Number.isFinite(raw.scaleMin)
        ? raw.scaleMin
        : 0;
    const defaultMaxScore =
      typeof raw.defaultMaxScore === 'number' && raw.defaultMaxScore > scaleMin
        ? raw.defaultMaxScore
        : 10;
    const subMode: SurveySubMode = VALID_SUB_MODES.includes(
      raw.subMode as SurveySubMode,
    )
      ? (raw.subMode as SurveySubMode)
      : 'uraian';
    const itemMaxScores = normalizeMaxScores(
      Array.isArray(raw.itemMaxScores) ? (raw.itemMaxScores as number[]) : [],
      itemCount,
      defaultMaxScore,
      scaleMin,
    );
    const rawRows = Array.isArray(raw.rows)
      ? (raw.rows as Partial<UraianStudentRow>[])
      : [];
    const rows: UraianStudentRow[] = rawRows.map((r, idx) => ({
      id: typeof r.id === 'number' ? r.id : idx + 1,
      nama: typeof r.nama === 'string' ? r.nama : '',
      kelas: typeof r.kelas === 'string' ? r.kelas : '',
      scores: Array.isArray(r.scores)
        ? normalizeScores(
            r.scores as ScoreValue[],
            itemCount,
            scaleMin,
            itemMaxScores,
          )
        : new Array(itemCount).fill(null),
    }));
    const maxId = rows.reduce((acc, r) => Math.max(acc, r.id), 0);
    uraian = {
      subMode,
      examTitle: typeof raw.examTitle === 'string' ? raw.examTitle : '',
      itemCount,
      scaleMin,
      defaultMaxScore,
      itemMaxScores,
      rows,
      seq: typeof raw.seq === 'number' ? Math.max(raw.seq, maxId) : maxId,
      updatedAtIso: timestampToIso(raw.updatedAt),
    };
  }

  return { preferences, abc, uraian };
}
