import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Monitor,
  WifiOff,
  X,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallBar() {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } =
    usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showGuide, setShowGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const currentUrl =
    typeof window !== 'undefined' ? window.location.href : '';

  async function handleCopyUrl() {
    if (!currentUrl || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      setCopiedUrl(false);
    }
  }

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
              <span>Tambah ke Desktop (Chrome PC)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="btn-gesture btn-surface-secondary inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B6B4F]"
            >
              <Monitor className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {isIOS ? 'Instal di iPhone / iPad' : 'Jalankan di Chrome PC'}
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
                  : 'Jalankan di Chrome PC & Tambah ke Desktop'}
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
                  Pilih{' '}
                  <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
                </li>
              </ol>
            ) : (
              <div className="mt-3 space-y-3 text-sm text-[#394A43] dark:text-[#B9C7C0]">
                <p>
                  Aplikasi ini dapat dijalankan langsung lewat{' '}
                  <strong>Google Chrome di PC / Laptop</strong> dan ditambahkan
                  sebagai ikon aplikasi di <strong>Desktop</strong>:
                </p>

                {currentUrl && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#DCE5E0] bg-[#F8FAF9] p-2.5 dark:border-[#28362F] dark:bg-[#101815]">
                    {isInIframe && (
                      <a
                        href={currentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-gesture btn-surface-primary inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>Buka di Tab Chrome Baru</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="btn-gesture btn-surface-secondary inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold"
                    >
                      {copiedUrl ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#1B6B4F] dark:text-[#58C49B]" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      )}
                      <span>
                        {copiedUrl ? 'Link Tersalin' : 'Salin Link Aplikasi'}
                      </span>
                    </button>
                  </div>
                )}

                <ol className="list-decimal space-y-2 pl-5">
                  <li>
                    Buka alamat aplikasi di tab utama{' '}
                    <strong>Google Chrome PC</strong> (bukan di dalam jendela
                    pratinjau).
                  </li>
                  <li>
                    Klik ikon <strong>Instal</strong> (layar dengan panah ke
                    bawah) di ujung kanan kolom alamat Chrome, atau klik menu{' '}
                    <strong>⋮</strong> →{' '}
                    <strong>Cast, simpan, dan bagikan</strong> →{' '}
                    <strong>Instal halaman sebagai aplikasi...</strong> (atau{' '}
                    <strong>Buat pintasan...</strong>).
                  </li>
                  <li>
                    Centang <strong>Buka sebagai jendela</strong> /{' '}
                    <strong>Buat pintasan di Desktop</strong> lalu klik{' '}
                    <strong>Instal</strong>. Ikon aplikasi langsung muncul di{' '}
                    <strong>Desktop PC</strong> dan bisa dijalankan kapan saja,
                    termasuk saat offline.
                  </li>
                </ol>
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
