import { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallBar() {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } =
    usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showGuide, setShowGuide] = useState(false);

  return (
    <>
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-lg border border-[#A1740A] bg-[#FEF6DC] px-3.5 py-2 text-xs font-semibold text-[#7A5A06] shadow-md dark:border-[#8C6D1F] dark:bg-[#3A2F14] dark:text-[#F0CF7B]"
        >
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Mode Offline — Data tersimpan lokal di perangkat</span>
        </div>
      )}

      {!isInstalled && (
        <div className="flex flex-wrap items-center gap-2">
          {isInstallable ? (
            <button
              type="button"
              onClick={install}
              className="btn-gesture btn-surface-secondary inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F]"
            >
              <Download className="btn-nudge-up h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Instal Aplikasi</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="btn-gesture btn-surface-secondary inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F]"
            >
              <Smartphone className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {isIOS
                  ? 'Instal di iPhone / iPad'
                  : isAndroid
                    ? 'Pasang di Android'
                    : 'Pasang Aplikasi'}
              </span>
            </button>
          )}
        </div>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-guide-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-[#D4DDD8] bg-white p-5 shadow-xl dark:border-[#28362F] dark:bg-[#161F1B]"
          >
            <div className="flex items-start justify-between gap-3">
              <h3
                id="install-guide-title"
                className="text-base font-bold text-[#14211C] dark:text-[#E6EEE9]"
              >
                {isIOS
                  ? 'Instal di iPhone / iPad'
                  : 'Pasang di Android atau Ekspor APK'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Tutup panduan"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#52635C] hover:bg-[#EAF2EE] dark:text-[#9AAAA2] dark:hover:bg-[#24322B]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[#394A43] dark:text-[#B9C7C0]">
                <li>
                  Buka halaman ini menggunakan <strong>Safari</strong>.
                </li>
                <li>
                  Ketuk tombol <strong>Bagikan (Share)</strong> di bilah bawah
                  atau atas.
                </li>
                <li>
                  Pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
                </li>
              </ol>
            ) : (
              <div className="mt-3 space-y-3 text-sm text-[#394A43] dark:text-[#B9C7C0]">
                <p>
                  Aplikasi ini sudah mendukung <strong>PWA (WebAPK)</strong>{' '}
                  yang bisa langsung dipasang di HP Android dan dipakai offline:
                </p>
                <ol className="list-decimal space-y-1.5 pl-5">
                  <li>
                    Buka URL aplikasi di <strong>Google Chrome</strong> Android
                    (di tab baru, bukan di dalam frame pratinjau).
                  </li>
                  <li>
                    Ketuk ikon menu <strong>⋮</strong> di kanan atas, lalu pilih{' '}
                    <strong>Instal aplikasi</strong> atau{' '}
                    <strong>Tambahkan ke layar utama</strong>.
                  </li>
                </ol>
                <p className="border-t border-[#E3EAE6] pt-2.5 text-xs text-[#52635C] dark:border-[#24322B] dark:text-[#9AAAA2]">
                  Untuk file <strong>.apk</strong> terpisah, proyek PWA ini juga
                  bisa dikemas lewat <strong>PWABuilder</strong> atau{' '}
                  <strong>Capacitor Android</strong> di komputer dengan Android
                  SDK.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="btn-gesture btn-surface-primary mt-4 min-h-[40px] w-full cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
