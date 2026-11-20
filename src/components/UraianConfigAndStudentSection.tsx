import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type RefObject } from 'react';
import {
  Check,
  ChevronDown,
  FileSpreadsheet,
  FolderOpen,
  Lock,
  Minus,
  Pencil,
  Plus,
  Save,
  Trash2,
  Unlock,
  UserPlus,
  X,
} from 'lucide-react';
import type { SurveySubMode, UraianStudentRow } from '../types/sheet';
import { parseStudentListLines } from '../utils/answerParser';
import { normalizeMaxScores } from '../utils/uraianAnalysis';

type WeightConfigMode = 'all' | 'selected' | 'custom';

const WEIGHT_COLOR_PALETTE = [
  {
    chip: 'border-[#0E7490] bg-[#ECFEFF] text-[#155E75] hover:bg-[#CFFAFE] dark:border-[#22D3EE]/50 dark:bg-[#0E2B33] dark:text-[#A5F3FC] dark:hover:bg-[#153B45]',
    locked: 'border-[#0E7490]/60 bg-[#ECFEFF]/90 text-[#155E75] dark:border-[#22D3EE]/45 dark:bg-[#0E2B33]/85 dark:text-[#A5F3FC]',
    badge: 'border-[#0E7490]/40 bg-[#ECFEFF] text-[#155E75] dark:border-[#22D3EE]/40 dark:bg-[#0E2B33] dark:text-[#A5F3FC]',
    dot: 'bg-[#0891B2] dark:bg-[#22D3EE]',
  },
  {
    chip: 'border-[#B45309] bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A] dark:border-[#FBBF24]/50 dark:bg-[#33260D] dark:text-[#FDE68A] dark:hover:bg-[#443311]',
    locked: 'border-[#B45309]/60 bg-[#FEF3C7]/90 text-[#92400E] dark:border-[#FBBF24]/45 dark:bg-[#33260D]/85 dark:text-[#FDE68A]',
    badge: 'border-[#B45309]/40 bg-[#FEF3C7] text-[#92400E] dark:border-[#FBBF24]/40 dark:bg-[#33260D] dark:text-[#FDE68A]',
    dot: 'bg-[#D97706] dark:bg-[#FBBF24]',
  },
  {
    chip: 'border-[#6D28D9] bg-[#F3E8FF] text-[#5B21B6] hover:bg-[#E9D5FF] dark:border-[#A78BFA]/50 dark:bg-[#25173B] dark:text-[#DDD6FE] dark:hover:bg-[#311F4D]',
    locked: 'border-[#6D28D9]/60 bg-[#F3E8FF]/90 text-[#5B21B6] dark:border-[#A78BFA]/45 dark:bg-[#25173B]/85 dark:text-[#DDD6FE]',
    badge: 'border-[#6D28D9]/40 bg-[#F3E8FF] text-[#5B21B6] dark:border-[#A78BFA]/40 dark:bg-[#25173B] dark:text-[#DDD6FE]',
    dot: 'bg-[#7C3AED] dark:bg-[#A78BFA]',
  },
  {
    chip: 'border-[#BE185D] bg-[#FCE7F3] text-[#9D174D] hover:bg-[#FBCFE8] dark:border-[#F472B6]/50 dark:bg-[#361426] dark:text-[#FBCFE8] dark:hover:bg-[#471B32]',
    locked: 'border-[#BE185D]/60 bg-[#FCE7F3]/90 text-[#9D174D] dark:border-[#F472B6]/45 dark:bg-[#361426]/85 dark:text-[#FBCFE8]',
    badge: 'border-[#BE185D]/40 bg-[#FCE7F3] text-[#9D174D] dark:border-[#F472B6]/40 dark:bg-[#361426] dark:text-[#FBCFE8]',
    dot: 'bg-[#DB2777] dark:bg-[#F472B6]',
  },
  {
    chip: 'border-[#1D4ED8] bg-[#DBEAFE] text-[#1E40AF] hover:bg-[#BFDBFE] dark:border-[#60A5FA]/50 dark:bg-[#13223D] dark:text-[#BFDBFE] dark:hover:bg-[#1A2E52]',
    locked: 'border-[#1D4ED8]/60 bg-[#DBEAFE]/90 text-[#1E40AF] dark:border-[#60A5FA]/45 dark:bg-[#13223D]/85 dark:text-[#BFDBFE]',
    badge: 'border-[#1D4ED8]/40 bg-[#DBEAFE] text-[#1E40AF] dark:border-[#60A5FA]/40 dark:bg-[#13223D] dark:text-[#BFDBFE]',
    dot: 'bg-[#2563EB] dark:bg-[#60A5FA]',
  },
  {
    chip: 'border-[#047857] bg-[#D1FAE5] text-[#065F46] hover:bg-[#A7F3D0] dark:border-[#34D399]/50 dark:bg-[#102E24] dark:text-[#A7F3D0] dark:hover:bg-[#163D30]',
    locked: 'border-[#047857]/60 bg-[#D1FAE5]/90 text-[#065F46] dark:border-[#34D399]/45 dark:bg-[#102E24]/85 dark:text-[#A7F3D0]',
    badge: 'border-[#047857]/40 bg-[#D1FAE5] text-[#065F46] dark:border-[#34D399]/40 dark:bg-[#102E24] dark:text-[#A7F3D0]',
    dot: 'bg-[#059669] dark:bg-[#34D399]',
  },
  {
    chip: 'border-[#C2410C] bg-[#FFEDD5] text-[#9A3412] hover:bg-[#FED7AA] dark:border-[#FB923C]/50 dark:bg-[#381E10] dark:text-[#FED7AA] dark:hover:bg-[#4A2715]',
    locked: 'border-[#C2410C]/60 bg-[#FFEDD5]/90 text-[#9A3412] dark:border-[#FB923C]/45 dark:bg-[#381E10]/85 dark:text-[#FED7AA]',
    badge: 'border-[#C2410C]/40 bg-[#FFEDD5] text-[#9A3412] dark:border-[#FB923C]/40 dark:bg-[#381E10] dark:text-[#FED7AA]',
    dot: 'bg-[#EA580C] dark:bg-[#FB923C]',
  },
  {
    chip: 'border-[#4338CA] bg-[#E0E7FF] text-[#3730A3] hover:bg-[#C7D2FE] dark:border-[#818CF8]/50 dark:bg-[#1B1C3D] dark:text-[#C7D2FE] dark:hover:bg-[#242652]',
    locked: 'border-[#4338CA]/60 bg-[#E0E7FF]/90 text-[#3730A3] dark:border-[#818CF8]/45 dark:bg-[#1B1C3D]/85 dark:text-[#C7D2FE]',
    badge: 'border-[#4338CA]/40 bg-[#E0E7FF] text-[#3730A3] dark:border-[#818CF8]/40 dark:bg-[#1B1C3D] dark:text-[#C7D2FE]',
    dot: 'bg-[#4F46E5] dark:bg-[#818CF8]',
  },
] as const;

function parseItemNumberRanges(raw: string, itemCount: number): number[] {
  const picked = new Set<number>();
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const tok of tokens) {
    const rangeMatch = tok.match(/^(\d+)\s*(?:-|–|s\.?d\.?|\.\.)\s*(\d+)$/i);
    if (rangeMatch) {
      const a = Number(rangeMatch[1]);
      const b = Number(rangeMatch[2]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        const start = Math.max(1, Math.min(a, b));
        const end = Math.min(itemCount, Math.max(a, b));
        for (let n = start; n <= end; n++) {
          picked.add(n - 1);
        }
      }
      continue;
    }

    const single = Number(tok);
    if (Number.isInteger(single) && single >= 1 && single <= itemCount) {
      picked.add(single - 1);
    }
  }

  return Array.from(picked).sort((a, b) => a - b);
}

function formatItemNumberRanges(indices: number[]): string {
  if (indices.length === 0) return '';
  const sorted = [...indices].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      parts.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`);
      start = sorted[i];
      prev = sorted[i];
    }
  }
  parts.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`);
  return parts.join(', ');
}

function WeightNumberInput({
  id,
  value,
  min,
  max,
  onCommit,
  className,
}: {
  id?: string;
  value: number;
  min: number;
  max: number;
  onCommit: (nextVal: number) => void;
  className: string;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function tryCommit(raw: string, snapIfInvalid: boolean) {
    const parsed = Number(raw.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
      const clean = Math.round(parsed * 100) / 100;
      if (clean !== value) {
        onCommit(clean);
      }
      if (snapIfInvalid) {
        setDraft(String(clean));
      }
    } else if (snapIfInvalid) {
      setDraft(String(value));
    }
  }

  return (
    <input
      id={id}
      type="number"
      min={min}
      max={max}
      value={draft}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw.trim() !== '') {
          tryCommit(raw, false);
        }
      }}
      onBlur={() => tryCommit(draft, true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          tryCommit(draft, true);
        }
      }}
      className={className}
    />
  );
}

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
  onApplyItemMaxScores: (nextScores: number[], nextDefaultMax?: number) => void;
  onAddStudent: (nama: string, kelas: string) => void;
  onAddMultipleStudents: (items: Array<{ nama: string; kelas: string }>) => void;
  onSelectStudent: (id: number) => void;
  onUpdateStudent: (id: number, nama: string, kelas: string) => void;
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
  onApplyItemMaxScores,
  onAddStudent,
  onAddMultipleStudents,
  onSelectStudent,
  onUpdateStudent,
  onRemoveStudent,
  onExportProjectData,
  onImportProjectData,
  onOpenExcelImport,
}: UraianConfigAndStudentSectionProps) {
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
  const [showWeightPanel, setShowWeightPanel] = useState(false);
  const [weightMode, setWeightMode] = useState<WeightConfigMode>('all');
  const [allWeightInput, setAllWeightInput] = useState<string>(String(defaultMaxScore));
  const [rangeText, setRangeText] = useState<string>('1-5');
  const [selectedWeightInput, setSelectedWeightInput] = useState<string>(
    String(defaultMaxScore),
  );
  const [lockedSelectedIndices, setLockedSelectedIndices] = useState<number[]>(
    [],
  );
  const [weightNotice, setWeightNotice] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const normMaxScores = normalizeMaxScores(
    itemMaxScores,
    itemCount,
    defaultMaxScore,
    scaleMin,
  );
  const totalMaxPossible = normMaxScores.reduce((acc, v) => acc + v, 0);

  useEffect(() => {
    setAllWeightInput(String(defaultMaxScore));
    setSelectedWeightInput(String(defaultMaxScore));
    setLockedSelectedIndices([]);
  }, [defaultMaxScore, subMode]);

  useEffect(() => {
    setLockedSelectedIndices((prev) => prev.filter((idx) => idx < itemCount));
  }, [itemCount]);

  const minItemWeight = Math.min(...normMaxScores);
  const maxItemWeight = Math.max(...normMaxScores);
  const isUniformWeight = minItemWeight === maxItemWeight;

  const weightGroups = useMemo(() => {
    const counts = new Map<number, number>();
    for (const w of normMaxScores) {
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([weight, count], idx) => ({
        weight,
        count,
        color: WEIGHT_COLOR_PALETTE[idx % WEIGHT_COLOR_PALETTE.length],
      }));
  }, [normMaxScores]);

  const weightColorMap = useMemo(() => {
    const map = new Map<number, (typeof WEIGHT_COLOR_PALETTE)[number]>();
    for (const g of weightGroups) {
      map.set(g.weight, g.color);
    }
    return map;
  }, [weightGroups]);

  const lockedIndexSet = useMemo(
    () => new Set(lockedSelectedIndices.filter((idx) => idx < itemCount)),
    [lockedSelectedIndices, itemCount],
  );

  const rawParsedIndices = useMemo(
    () => parseItemNumberRanges(rangeText, itemCount),
    [rangeText, itemCount],
  );
  const selectedIndices = useMemo(
    () => rawParsedIndices.filter((idx) => !lockedIndexSet.has(idx)),
    [rawParsedIndices, lockedIndexSet],
  );
  const skippedLockedCount = rawParsedIndices.length - selectedIndices.length;
  const selectedIndexSet = useMemo(
    () => new Set(selectedIndices),
    [selectedIndices],
  );
  const unlockedCount = itemCount - lockedIndexSet.size;

  const quickWeightPresets = useMemo(
    () => [3, 4, 5, 10, 15, 20].filter((v) => v > scaleMin),
    [scaleMin],
  );

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

  function startEditStudent(row: UraianStudentRow) {
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
      setEditError('Nama peserta tidak boleh kosong.');
      return;
    }
    onUpdateStudent(id, clean, editKelas.trim());
    cancelEditStudent();
  }

  function applyWeightToAll(targetVal?: number) {
    const parsed = targetVal ?? Number(allWeightInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= scaleMin || parsed > 100) {
      setWeightNotice(
        `Masukkan bobot antara ${scaleMin + 1} sampai 100.`,
      );
      return;
    }
    const cleanVal = Math.round(parsed * 100) / 100;
    setAllWeightInput(String(cleanVal));
    setLockedSelectedIndices([]);
    onApplyItemMaxScores(new Array(itemCount).fill(cleanVal), cleanVal);
    setWeightNotice(
      `Bobot skor ${cleanVal} diterapkan ke semua soal/butir (No 1–${itemCount}).`,
    );
  }

  function toggleSelectedItemChip(idx: number) {
    if (lockedIndexSet.has(idx)) return;
    const next = new Set(selectedIndexSet);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setRangeText(formatItemNumberRanges(Array.from(next)));
    setWeightNotice('');
  }

  function applyWeightToSelected(targetVal?: number) {
    if (selectedIndices.length === 0) {
      setWeightNotice(
        unlockedCount === 0
          ? 'Semua nomor sudah ditentukan bobotnya. Tekan Buka Kunci jika ingin mengatur ulang.'
          : 'Pilih minimal 1 nomor soal yang belum ditentukan terlebih dahulu.',
      );
      return;
    }
    const parsed = targetVal ?? Number(selectedWeightInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= scaleMin || parsed > 100) {
      setWeightNotice(
        `Masukkan bobot antara ${scaleMin + 1} sampai 100.`,
      );
      return;
    }
    const cleanVal = Math.round(parsed * 100) / 100;
    setSelectedWeightInput(String(cleanVal));
    const next = [...normMaxScores];
    for (const idx of selectedIndices) {
      next[idx] = cleanVal;
    }
    const appliedRange = formatItemNumberRanges(selectedIndices);
    const nextLocked = Array.from(
      new Set([...lockedSelectedIndices, ...selectedIndices]),
    ).sort((a, b) => a - b);
    setLockedSelectedIndices(nextLocked);
    setRangeText('');
    onApplyItemMaxScores(next);
    setWeightNotice(
      `Bobot skor ${cleanVal} diterapkan ke ${selectedIndices.length} nomor (${appliedRange}). Nomor tersebut dikunci untuk penentuan selanjutnya.`,
    );
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
            <WeightNumberInput
              id="uraian-default-max"
              min={scaleMin + 1}
              max={100}
              value={defaultMaxScore}
              onCommit={(v) => {
                setLockedSelectedIndices([]);
                onChangeDefaultMaxScore(v);
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

        {/* Pengaturan Bobot Skor Angket / Butir: Semua Soal, Nomor Tertentu, atau Atur Sendiri */}
        <div className="border-t border-[#E3EAE6] pt-3 dark:border-[#24322B]">
          <button
            type="button"
            onClick={() => setShowWeightPanel((v) => !v)}
            aria-expanded={showWeightPanel}
            className="flex w-full cursor-pointer items-center justify-between gap-2 py-1 text-left text-sm font-semibold text-[#14211C] dark:text-[#E6EEE9]"
          >
            <div className="flex flex-col gap-0.5">
              <span>
                Bobot skor angket / butir{' '}
                <span className="font-mono-tabular font-normal text-[#52635C] dark:text-[#9AAAA2]">
                  ({isUniformWeight ? `Semua: ${minItemWeight}` : `Bervariasi: ${minItemWeight}–${maxItemWeight}`} · Total maks: {totalMaxPossible})
                </span>
              </span>
              <span className="text-xs font-normal text-[#52635C] dark:text-[#9AAAA2]">
                Pilih atur semua soal sekaligus, nomor tertentu, atau atur sendiri tiap nomor
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-[#52635C] transition-transform duration-150 dark:text-[#9AAAA2] ${
                showWeightPanel ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {showWeightPanel && (
            <div className="mt-3 flex flex-col gap-3 rounded-xl border border-[#DCE5E0] bg-[#F8FAF9] p-3.5 dark:border-[#28362F] dark:bg-[#101815]">
              {/* 3 Pilihan Mode Bobot */}
              <div
                role="tablist"
                aria-label="Pilih cara atur bobot skor angket atau butir"
                className="grid grid-cols-3 gap-1.5 rounded-lg bg-[#EAF0ED] p-1 dark:bg-[#16211C]"
              >
                {(
                  [
                    { id: 'all', label: 'Semua Soal' },
                    { id: 'selected', label: 'Nomor Tertentu' },
                    { id: 'custom', label: 'Atur Sendiri' },
                  ] as const
                ).map((modeOption) => {
                  const active = weightMode === modeOption.id;
                  return (
                    <button
                      key={modeOption.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setWeightMode(modeOption.id);
                        setWeightNotice('');
                      }}
                      className={`btn-gesture cursor-pointer rounded-md px-2 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        active
                          ? 'bg-[#1B6B4F] text-white shadow-xs dark:bg-[#4AC294] dark:text-[#0B1712]'
                          : 'text-[#394A43] hover:bg-white/70 dark:text-[#C5D3CC] dark:hover:bg-[#1F2D27]'
                      }`}
                    >
                      {modeOption.label}
                    </button>
                  );
                })}
              </div>

              {/* Mode 1: Semua Soal Sama */}
              {weightMode === 'all' && (
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                    Terapkan satu bobot skor maksimal yang sama untuk seluruh{' '}
                    <strong>{itemCount} soal/butir</strong> (No 1 s.d. {itemCount}).
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="weight-all-input" className="sr-only">
                      Bobot skor untuk semua soal
                    </label>
                    <input
                      id="weight-all-input"
                      type="number"
                      min={scaleMin + 1}
                      max={100}
                      value={allWeightInput}
                      onChange={(e) => {
                        setAllWeightInput(e.target.value);
                        if (weightNotice) setWeightNotice('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyWeightToAll();
                        }
                      }}
                      className="font-mono-tabular h-10 w-24 rounded-lg border border-[#D4DDD8] bg-white px-2.5 text-center text-sm font-bold text-[#14211C] dark:border-[#28362F] dark:bg-[#161F1B] dark:text-[#E6EEE9]"
                    />
                    <button
                      type="button"
                      onClick={() => applyWeightToAll()}
                      className="btn-gesture btn-surface-primary min-h-[40px] cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
                    >
                      Terapkan ke Semua ({itemCount} Soal)
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-[#52635C] dark:text-[#9AAAA2]">
                      Pilihan cepat:
                    </span>
                    {quickWeightPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => applyWeightToAll(preset)}
                        className="btn-gesture btn-surface-secondary font-mono-tabular min-h-[28px] cursor-pointer rounded-lg px-2.5 py-0.5 text-xs font-semibold"
                      >
                        Bobot {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode 2: Tentukan Nomor Tertentu */}
              {weightMode === 'selected' && (
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                    Ketik nomor soal/butir tertentu (misal{' '}
                    <span className="font-mono-tabular font-semibold">
                      1-5, 8, 10-12
                    </span>
                    ) atau ketuk nomor di bawah. Nomor yang sudah ditentukan
                    terkunci dan dibedakan warnanya per bobot.
                  </p>

                  {/* Warna pembeda setiap bobot */}
                  {(weightGroups.length > 1 || lockedIndexSet.size > 0) && (
                    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#DCE5E0] bg-white px-2.5 py-2 dark:border-[#28362F] dark:bg-[#161F1B]">
                      <span className="text-[11px] font-semibold text-[#52635C] dark:text-[#9AAAA2]">
                        Warna bobot:
                      </span>
                      {weightGroups.map((group) => (
                        <span
                          key={group.weight}
                          className={`font-mono-tabular inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${group.color.badge}`}
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${group.color.dot}`}
                            aria-hidden="true"
                          />
                          <span>
                            Bobot {group.weight} ({group.count})
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label
                        htmlFor="weight-range-input"
                        className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
                      >
                        Dipilih: {selectedIndices.length} · Sisa tersedia:{' '}
                        {unlockedCount}
                      </label>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          disabled={unlockedCount === 0}
                          onClick={() => {
                            const available = Array.from(
                              { length: itemCount },
                              (_, i) => i,
                            ).filter((i) => !lockedIndexSet.has(i));
                            setRangeText(formatItemNumberRanges(available));
                          }}
                          className="cursor-pointer rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-[#394A43] ring-1 ring-[#D4DDD8] hover:bg-[#EAF4EF] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#161F1B] dark:text-[#C5D3CC] dark:ring-[#28362F]"
                        >
                          Semua
                        </button>
                        <button
                          type="button"
                          disabled={unlockedCount === 0}
                          onClick={() => {
                            const odd = Array.from(
                              { length: itemCount },
                              (_, i) => i,
                            ).filter(
                              (i) =>
                                (i + 1) % 2 === 1 && !lockedIndexSet.has(i),
                            );
                            setRangeText(formatItemNumberRanges(odd));
                          }}
                          className="cursor-pointer rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-[#394A43] ring-1 ring-[#D4DDD8] hover:bg-[#EAF4EF] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#161F1B] dark:text-[#C5D3CC] dark:ring-[#28362F]"
                        >
                          Ganjil
                        </button>
                        <button
                          type="button"
                          disabled={unlockedCount === 0}
                          onClick={() => {
                            const even = Array.from(
                              { length: itemCount },
                              (_, i) => i,
                            ).filter(
                              (i) =>
                                (i + 1) % 2 === 0 && !lockedIndexSet.has(i),
                            );
                            setRangeText(formatItemNumberRanges(even));
                          }}
                          className="cursor-pointer rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-[#394A43] ring-1 ring-[#D4DDD8] hover:bg-[#EAF4EF] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#161F1B] dark:text-[#C5D3CC] dark:ring-[#28362F]"
                        >
                          Genap
                        </button>
                        <button
                          type="button"
                          onClick={() => setRangeText('')}
                          className="cursor-pointer rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-[#7B8B84] ring-1 ring-[#D4DDD8] hover:bg-[#FEE4E2] hover:text-[#B42318] dark:bg-[#161F1B] dark:text-[#9AAAA2] dark:ring-[#28362F]"
                        >
                          Kosongkan
                        </button>
                        {lockedIndexSet.size > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setLockedSelectedIndices([]);
                              setWeightNotice(
                                'Semua nomor dibuka kembali dan dapat dipilih ulang.',
                              );
                            }}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-[#FEF6DC] px-2 py-0.5 text-[11px] font-semibold text-[#8A5A00] ring-1 ring-[#D9B86C] hover:bg-[#FDECB8] dark:bg-[#3A2F14] dark:text-[#F0CF7B] dark:ring-[#8C6D1F]"
                          >
                            <Unlock className="h-3 w-3" aria-hidden="true" />
                            <span>Buka Kunci ({lockedIndexSet.size})</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      id="weight-range-input"
                      type="text"
                      value={rangeText}
                      onChange={(e) => {
                        setRangeText(e.target.value);
                        if (weightNotice) setWeightNotice('');
                      }}
                      placeholder={
                        unlockedCount === 0
                          ? 'Semua nomor sudah ditentukan — klik Buka Kunci untuk ubah'
                          : 'Contoh: 1-5, 8, 12-15'
                      }
                      disabled={unlockedCount === 0}
                      className="font-mono-tabular h-10 w-full rounded-lg border border-[#D4DDD8] bg-white px-3 text-sm text-[#14211C] placeholder:text-[#7B8B84] disabled:opacity-50 dark:border-[#28362F] dark:bg-[#161F1B] dark:text-[#E6EEE9]"
                    />
                    {skippedLockedCount > 0 && (
                      <p className="text-[11px] text-[#8A5A00] dark:text-[#F0CF7B]">
                        {skippedLockedCount} nomor yang sudah ditentukan dilewati
                        karena tidak dapat dipilih lagi.
                      </p>
                    )}
                  </div>

                  {/* Clickable number chips */}
                  <div className="grid max-h-40 grid-cols-5 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-6">
                    {normMaxScores.map((maxVal, idx) => {
                      const isLocked = lockedIndexSet.has(idx);
                      const isPicked = selectedIndexSet.has(idx);
                      const weightColor =
                        weightColorMap.get(maxVal) ?? WEIGHT_COLOR_PALETTE[0];
                      const showDistinctColor =
                        weightGroups.length > 1 || lockedIndexSet.size > 0;

                      const chipClass = isPicked
                        ? 'cursor-pointer border-[#1B6B4F] bg-[#1B6B4F] text-white ring-2 ring-[#1B6B4F]/35 dark:border-[#4AC294] dark:bg-[#4AC294] dark:text-[#0B1712] dark:ring-[#4AC294]/35'
                        : isLocked
                          ? `cursor-not-allowed border-dashed opacity-95 ${weightColor.locked}`
                          : showDistinctColor
                            ? `cursor-pointer ${weightColor.chip}`
                            : 'cursor-pointer border-[#D4DDD8] bg-white text-[#14211C] hover:bg-[#EAF4EF] dark:border-[#28362F] dark:bg-[#161F1B] dark:text-[#E6EEE9] dark:hover:bg-[#1E2B25]';

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isLocked}
                          onClick={() => toggleSelectedItemChip(idx)}
                          aria-pressed={isPicked}
                          title={
                            isLocked
                              ? `No ${idx + 1} sudah ditentukan (bobot ${maxVal}) dan tidak dapat dipilih lagi`
                              : `Pilih No ${idx + 1} (bobot saat ini ${maxVal})`
                          }
                          className={`font-mono-tabular relative flex flex-col items-center justify-center rounded-lg border py-1 text-[11px] transition-colors ${chipClass}`}
                        >
                          <span className="inline-flex items-center gap-0.5 font-bold">
                            {isLocked && (
                              <Lock
                                className="h-2.5 w-2.5 shrink-0 opacity-85"
                                aria-hidden="true"
                              />
                            )}
                            <span>No {idx + 1}</span>
                          </span>
                          <span className="text-[10px] opacity-85">
                            bobot {maxVal}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-[#DCE5E0] pt-2.5 dark:border-[#24322B]">
                    <label
                      htmlFor="weight-selected-input"
                      className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]"
                    >
                      Bobot skor:
                    </label>
                    <input
                      id="weight-selected-input"
                      type="number"
                      min={scaleMin + 1}
                      max={100}
                      value={selectedWeightInput}
                      disabled={unlockedCount === 0}
                      onChange={(e) => {
                        setSelectedWeightInput(e.target.value);
                        if (weightNotice) setWeightNotice('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyWeightToSelected();
                        }
                      }}
                      className="font-mono-tabular h-9 w-20 rounded-lg border border-[#D4DDD8] bg-white px-2 text-center text-sm font-bold text-[#14211C] disabled:opacity-50 dark:border-[#28362F] dark:bg-[#161F1B] dark:text-[#E6EEE9]"
                    />
                    <button
                      type="button"
                      onClick={() => applyWeightToSelected()}
                      disabled={selectedIndices.length === 0}
                      className="btn-gesture btn-surface-primary min-h-[36px] cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap disabled:opacity-40"
                    >
                      Terapkan ke {selectedIndices.length} Nomor
                    </button>
                  </div>
                </div>
              )}

              {/* Mode 3: Atur Sendiri Tiap Nomor */}
              {weightMode === 'custom' && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                      Atur sendiri bobot skor tiap nomor secara langsung (misal
                      No 1 bobot 4, No 2 bobot 5).
                    </p>
                    {!isUniformWeight && (
                      <button
                        type="button"
                        onClick={() => {
                          setLockedSelectedIndices([]);
                          onChangeDefaultMaxScore(defaultMaxScore);
                          setWeightNotice(
                            `Semua butir disamakan kembali ke bobot bawaan (${defaultMaxScore}).`,
                          );
                        }}
                        className="btn-gesture btn-surface-secondary min-h-[28px] cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
                      >
                        Samakan ke Bawaan ({defaultMaxScore})
                      </button>
                    )}
                  </div>
                  {weightGroups.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#DCE5E0] bg-white px-2.5 py-2 dark:border-[#28362F] dark:bg-[#161F1B]">
                      <span className="text-[11px] font-semibold text-[#52635C] dark:text-[#9AAAA2]">
                        Warna bobot:
                      </span>
                      {weightGroups.map((group) => (
                        <span
                          key={group.weight}
                          className={`font-mono-tabular inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${group.color.badge}`}
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${group.color.dot}`}
                            aria-hidden="true"
                          />
                          <span>
                            Bobot {group.weight} ({group.count})
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
                    {normMaxScores.map((maxVal, idx) => {
                      const weightColor =
                        weightColorMap.get(maxVal) ?? WEIGHT_COLOR_PALETTE[0];
                      return (
                        <label
                          key={idx}
                          className={`flex flex-col gap-1 rounded-lg border p-1.5 text-[11px] ${
                            weightGroups.length > 1
                              ? weightColor.badge
                              : 'border-transparent text-[#52635C] dark:text-[#9AAAA2]'
                          }`}
                        >
                          <span className="font-mono-tabular font-semibold">
                            No {idx + 1}
                          </span>
                          <WeightNumberInput
                            min={scaleMin + 1}
                            max={100}
                            value={maxVal}
                            onCommit={(v) => onChangeItemMaxScore(idx, v)}
                            className="font-mono-tabular h-8 w-full rounded-md border border-[#D4DDD8] bg-white px-2 text-center text-xs font-semibold text-[#14211C] dark:border-[#28362F] dark:bg-[#161F1B] dark:text-[#E6EEE9]"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {weightNotice && (
                <p
                  role="status"
                  aria-live="polite"
                  className="text-xs font-medium text-[#1B6B4F] dark:text-[#58C49B]"
                >
                  {weightNotice}
                </p>
              )}
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
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#52635C] dark:text-[#9AAAA2]">
                Daftar peserta ({rows.length})
              </span>
              <span className="text-xs text-[#6B7C75] dark:text-[#8E9F97]">
                Klik nama untuk mengisi skor, Edit untuk ubah nama/kelas, atau Hapus
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
                            placeholder="Nama peserta / responden"
                            aria-label={`Ubah nama peserta ${idx + 1}`}
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
                            aria-label={`Ubah kelas peserta ${idx + 1}`}
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
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEditStudent(row)}
                            aria-label={`Edit data ${row.nama || `Peserta ${idx + 1}`}`}
                            className="btn-gesture btn-surface-secondary inline-flex min-h-[32px] shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
                          >
                            <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Edit</span>
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
