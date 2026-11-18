import type { ButtonStyleMode } from '../types/sheet';

interface ButtonStylePickerProps {
  buttonStyle: ButtonStyleMode;
  onChangeButtonStyle: (style: ButtonStyleMode) => void;
  compact?: boolean;
}

const STYLE_OPTIONS: Array<{
  id: ButtonStyleMode;
  label: string;
  swatchClass: string;
}> = [
  {
    id: 'wood',
    label: 'Kayu',
    swatchClass:
      'bg-gradient-to-b from-[#985d27] to-[#653810] border-[#3f2006] shadow-[0_2px_0_#3f2006]',
  },
  {
    id: 'tactile',
    label: '3D Taktil',
    swatchClass:
      'bg-gradient-to-b from-[#21805f] to-[#176148] border-[#0d3a2a] shadow-[0_2px_0_#0d3a2a]',
  },
  {
    id: 'flat',
    label: 'Datar',
    swatchClass: 'bg-[#1B6B4F] border-[#15563F]',
  },
  {
    id: 'glass',
    label: 'Kaca',
    swatchClass:
      'bg-gradient-to-br from-[#238864]/90 to-[#14533C]/95 border-white/50 shadow-xs',
  },
];

export function ButtonStylePicker({
  buttonStyle,
  onChangeButtonStyle,
  compact = false,
}: ButtonStylePickerProps) {
  return (
    <div
      role="group"
      aria-label="Pilih bentuk tombol"
      className={`inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-[#D4DDD8] bg-[#EFF3F1] p-1 dark:border-[#28362F] dark:bg-[#111915] ${
        compact ? '' : 'w-fit'
      }`}
    >
      <span className="px-2 text-xs font-semibold whitespace-nowrap text-[#52635C] dark:text-[#9AAAA2]">
        Tombol:
      </span>
      {STYLE_OPTIONS.map((opt) => {
        const active = buttonStyle === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChangeButtonStyle(opt.id)}
            className={`btn-gesture inline-flex min-h-[34px] shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
              active
                ? 'btn-surface-primary'
                : 'border border-transparent text-[#2B3B35] hover:bg-white/80 dark:text-[#C5D3CC] dark:hover:bg-[#1D2923]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-3.5 w-3.5 shrink-0 rounded border ${opt.swatchClass}`}
            />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
