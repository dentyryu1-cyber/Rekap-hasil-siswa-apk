import { useEffect, useState } from 'react';
import { BrandLogo } from './BrandLogo';

interface SplashIntroProps {
  onComplete?: () => void;
}

export function SplashIntro({ onComplete }: SplashIntroProps) {
  const [phase, setPhase] = useState<'enter' | 'exit' | 'done'>(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return 'done';
    }
    return 'enter';
  });

  useEffect(() => {
    if (phase === 'done') {
      onComplete?.();
      return;
    }

    if (phase === 'enter') {
      const exitTimer = window.setTimeout(() => {
        setPhase('exit');
      }, 1450);
      return () => window.clearTimeout(exitTimer);
    }

    const doneTimer = window.setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, 360);

    return () => window.clearTimeout(doneTimer);
  }, [phase, onComplete]);

  useEffect(() => {
    if (phase === 'done') return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        setPhase('exit');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  if (phase === 'done') return null;

  function handleSkip() {
    if (phase === 'enter') {
      setPhase('exit');
    }
  }

  return (
    <div
      role="status"
      aria-label="Memuat rekapinJx"
      onClick={handleSkip}
      className={`fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-[#F4F6F5] px-6 select-none dark:bg-[#0E1411] ${
        phase === 'exit' ? 'splash-screen-exit' : ''
      }`}
    >
      {/* Subtle radial emerald & warm-wood ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(27,107,79,0.14),transparent_58%)] dark:bg-[radial-gradient(circle_at_50%_42%,rgba(88,196,155,0.14),transparent_58%)]"
      />

      <div className="relative flex flex-col items-center gap-5 text-center">
        <div className="splash-logo-wrap">
          <BrandLogo size={92} animated />
        </div>

        <div className="splash-title-reveal flex flex-col items-center gap-1.5">
          <div className="text-3xl font-bold tracking-tight text-[#14211C] sm:text-4xl dark:text-[#E6EEE9]">
            <span>rekapin</span>
            <span className="bg-gradient-to-br from-[#C47425] via-[#985D27] to-[#653810] bg-clip-text text-transparent dark:from-[#F5C97B] dark:to-[#D68B3A]">
              Jx
            </span>
          </div>
          <p className="text-xs font-medium tracking-wide text-[#52635C] sm:text-sm dark:text-[#9AAAA2]">
            Rekap &amp; Analisis Lembar Jawaban
          </p>
        </div>

        {/* Sleek compositor progress bar */}
        <div className="h-1.5 w-44 overflow-hidden rounded-full bg-[#DCE4DF] dark:bg-[#1E2B24]">
          <div className="splash-progress-bar h-full w-full origin-left rounded-full bg-gradient-to-r from-[#1B6B4F] via-[#2B8C68] to-[#B86E28] dark:from-[#4AC294] dark:to-[#E5A95D]" />
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleSkip();
        }}
        className="splash-skip-hint absolute bottom-8 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-[#52635C] transition-colors hover:text-[#14211C] dark:text-[#9AAAA2] dark:hover:text-[#E6EEE9]"
      >
        Ketuk untuk lewati
      </button>
    </div>
  );
}
