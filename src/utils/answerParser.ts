import type { AnswerLetter, StudentRow, StudentStats } from '../types/sheet';

const VALID_OPTION = /^[A-E]$/;

export function sanitizeAnswerChar(raw: string): AnswerLetter {
  const upper = raw.toUpperCase().replace(/[^A-E]/g, '');
  if (!upper) return '';
  const ch = upper.slice(-1);
  return VALID_OPTION.test(ch) ? (ch as AnswerLetter) : '';
}

export function normalizeAnswers(
  answers: AnswerLetter[] | string[],
  count: number,
): AnswerLetter[] {
  const out: AnswerLetter[] = new Array(count).fill('');
  for (let i = 0; i < count; i++) {
    const val = (answers[i] ?? '').toUpperCase();
    out[i] = VALID_OPTION.test(val) ? (val as AnswerLetter) : '';
  }
  return out;
}

export function parseBulkAnswers(text: string, count: number): AnswerLetter[] {
  const upper = String(text || '').toUpperCase();
  const out: AnswerLetter[] = new Array(count).fill('');

  // Support numbered format such as "1.A 2.B ... 45.C" or "31: D"
  const pairs = upper.match(/\d{1,3}\s*[-.):=]\s*[A-E-]/g) || [];
  if (pairs.length >= 2) {
    for (const pair of pairs) {
      const m = /(\d{1,3})\s*[-.):=]\s*([A-E-])/.exec(pair);
      if (!m) continue;
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < count) {
        out[idx] = VALID_OPTION.test(m[2]) ? (m[2] as AnswerLetter) : '';
      }
    }
    return out;
  }

  // Continuous string format, e.g. "ABCDE-ABCD..." (dash/dot/underscore = blank)
  const chars = upper
    .replace(/[\s,;]/g, '')
    .split('')
    .filter(Boolean);

  for (let i = 0; i < count && i < chars.length; i++) {
    out[i] = VALID_OPTION.test(chars[i]) ? (chars[i] as AnswerLetter) : '';
  }
  return out;
}

export function countReadableTokens(text: string): number {
  const upper = String(text || '').toUpperCase();
  const pairs = upper.match(/\d{1,3}\s*[-.):=]\s*[A-E-]/g) || [];
  if (pairs.length >= 2) return pairs.length;
  return upper.replace(/[\s,;]/g, '').length;
}

export function firstEmptyIndex(answers: AnswerLetter[], count: number): number {
  const norm = normalizeAnswers(answers, count);
  const idx = norm.indexOf('');
  return idx < 0 ? 0 : idx;
}

export function computeStudentStats(
  row: StudentRow,
  questionCount: number,
  answerKey: AnswerLetter[],
): StudentStats {
  const answers = normalizeAnswers(row.jawaban, questionCount);
  const key = normalizeAnswers(answerKey, questionCount);
  const activeKeyCount = key.filter((k) => k !== '').length;
  const hasKey = activeKeyCount > 0;

  let filled = 0;
  let empty = 0;
  let correct = 0;
  let wrong = 0;

  for (let i = 0; i < questionCount; i++) {
    const ans = answers[i];
    if (ans) {
      filled++;
    } else {
      empty++;
    }
    if (hasKey && key[i]) {
      if (ans === key[i]) {
        correct++;
      } else if (ans) {
        wrong++;
      }
    }
  }

  const scorePercent =
    hasKey && activeKeyCount > 0
      ? Math.round((correct / activeKeyCount) * 1000) / 10
      : null;

  return { filled, empty, correct, wrong, scorePercent, hasKey };
}

export function parseStudentListLines(
  rawText: string,
  defaultClass: string,
): Array<{ nama: string; kelas: string }> {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Allow "1. Nama Siswa, Kelas" or "Nama Siswa\tKelas" or "Nama Siswa ; Kelas"
      const cleaned = line.replace(/^\d+[.)]\s*/, '');
      const parts = cleaned.split(/[\t,;]/).map((p) => p.trim());
      if (parts.length >= 2 && parts[0]) {
        return { nama: parts[0], kelas: parts[1] || defaultClass };
      }
      return { nama: cleaned, kelas: defaultClass };
    })
    .filter((item) => item.nama.length > 0);
}
