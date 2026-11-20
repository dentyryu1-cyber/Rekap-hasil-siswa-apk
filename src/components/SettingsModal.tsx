import { useEffect } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Cloud,
  CloudDownload,
  CloudUpload,
  LogOut,
  Moon,
  RefreshCw,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import type { ButtonStyleMode } from '../types/sheet';
import { ButtonStylePicker } from './ButtonStylePicker';

export interface CloudConflictSummary {
  localAbcCount: number;
  localUraianCount: number;
  cloudAbcCount: number;
  cloudUraianCount: number;
  cloudUpdatedAtIso: string | null;
}

interface SettingsModalProps {
  isOpen: boolean;
  user: User | null;
  authLoading: boolean;
  authError: string;
  syncState: 'idle' | 'syncing' | 'synced' | 'error';
  syncMessage: string;
  lastSyncedAt: string | null;
  pendingConflict: CloudConflictSummary | null;
  darkMode: boolean;
  buttonStyle: ButtonStyleMode;
  onClose: () => void;
  onSignInGoogle: () => void;
  onSignOut: () => void;
  onPushLocalToCloud: () => void;
  onPullCloudToLocal: () => void;
  onToggleDarkMode: () => void;
  onChangeButtonStyle: (style: ButtonStyleMode) => void;
}

function GoogleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fill="#EA4335"
        d="M12 5.04c1.68 0 3.19.58 4.38 1.71l3.28-3.28C17.67 1.63 15.05.6 12 .6 7.36.6 3.37 3.26 1.43 7.13l3.82 2.96C6.15 7.33 8.84 5.04 12 5.04z"
      />
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.44c-.28 1.5-1.12 2.77-2.38 3.62l3.72 2.89c2.17-2 3.71-4.95 3.71-8.7z"
      />
      <path
        fill="#FBBC05"
        d="M5.25 14.91a7.14 7.14 0 0 1 0-4.82L1.43 7.13A11.4 11.4 0 0 0 .6 12c0 1.84.44 3.58 1.23 5.13l3.42-2.22z"
      />
      <path
        fill="#34A853"
        d="M12 23.4c3.05 0 5.61-1.01 7.48-2.73l-3.72-2.89c-1.03.69-2.35 1.1-3.76 1.1-3.16 0-5.85-2.29-6.75-5.05l-3.42 2.22C3.77 20.74 7.57 23.4 12 23.4z"
      />
    </svg>
  );
}

export function SettingsModal({
  isOpen,
  user,
  authLoading,
  authError,
  syncState,
  syncMessage,
  lastSyncedAt,
  pendingConflict,
  darkMode,
  buttonStyle,
  onClose,
  onSignInGoogle,
  onSignOut,
  onPushLocalToCloud,
  onPullCloudToLocal,
  onToggleDarkMode,
  onChangeButtonStyle,
}: SettingsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formattedLastSync = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#D4DDD8] bg-white shadow-2xl dark:border-[#28362F] dark:bg-[#161F1B]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#D4DDD8] px-5 py-4 dark:border-[#28362F]">
          <div className="flex items-center gap-2.5">
            <span className="inline-grid h-9 w-9 place-items-center rounded-xl bg-[#EAF4EF] text-[#1B6B4F] dark:bg-[#193026] dark:text-[#58C49B]">
              <Settings className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="settings-modal-title"
                className="text-base font-bold text-[#14211C] dark:text-[#E6EEE9]"
              >
                Pengaturan &amp; Akun Google
              </h2>
              <p className="text-xs text-[#52635C] dark:text-[#9AAAA2]">
                Sinkronisasi data lintas perangkat dan gaya tampilan aplikasi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan"
            className="btn-gesture inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-[#52635C] hover:bg-[#EAF2EE] dark:text-[#9AAAA2] dark:hover:bg-[#24322B]"
          >
            <X className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 overflow-y-auto p-5">
          {/* Section 1: Google Account & Cloud Sync */}
          <section
            aria-labelledby="settings-account-heading"
            className="flex flex-col gap-3.5 rounded-xl border border-[#D4DDD8] bg-[#F8FAF9] p-4 dark:border-[#28362F] dark:bg-[#111915]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cloud
                  className="h-4 w-4 text-[#1B6B4F] dark:text-[#58C49B]"
                  aria-hidden="true"
                />
                <h3
                  id="settings-account-heading"
                  className="text-sm font-bold text-[#14211C] dark:text-[#E6EEE9]"
                >
                  Akun Google &amp; Simpan Cloud
                </h3>
              </div>

              {user && (
                <span className="font-mono-tabular inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B6B4F] dark:text-[#58C49B]">
                  {syncState === 'syncing' ? (
                    <RefreshCw
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {syncState === 'syncing'
                      ? 'Menyinkronkan...'
                      : syncState === 'error'
                        ? 'Gangguan Sinkron'
                        : 'Terhubung'}
                  </span>
                </span>
              )}
            </div>

            {!user ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs leading-relaxed text-[#52635C] dark:text-[#9AAAA2]">
                  Masuk dengan akun Google agar data rekap pilihan ganda (ABC),
                  angket/uraian, dan preferensi tombol Anda tersimpan aman di
                  cloud dan dapat dibuka kembali dari perangkat lain.
                </p>

                <button
                  type="button"
                  onClick={onSignInGoogle}
                  disabled={authLoading}
                  className="btn-gesture btn-surface-primary inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GoogleMark />
                  <span>
                    {authLoading
                      ? 'Membuka Login Google...'
                      : 'Masuk dengan Akun Google'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {/* User Identity Row */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E3EAE6] bg-white p-3 dark:border-[#24322B] dark:bg-[#161F1B]">
                  <div className="flex min-w-0 items-center gap-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Foto profil Google'}
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 shrink-0 rounded-full border border-[#D4DDD8] object-cover dark:border-[#28362F]"
                      />
                    ) : (
                      <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1B6B4F] text-sm font-bold text-white dark:bg-[#4AC294] dark:text-[#0B1712]">
                        {(user.displayName || user.email || 'G')
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[#14211C] dark:text-[#E6EEE9]">
                        {user.displayName || 'Pengguna Google'}
                      </div>
                      <div className="truncate text-xs text-[#52635C] dark:text-[#9AAAA2]">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onSignOut}
                    disabled={authLoading}
                    className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                  >
                    <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Keluar</span>
                  </button>
                </div>

                {/* Initial Cloud vs Local Conflict Choice */}
                {pendingConflict && (
                  <div className="flex flex-col gap-2.5 rounded-xl border border-[#C47425]/45 bg-[#FDF3E7] p-3.5 text-xs dark:border-[#E69F52]/40 dark:bg-[#2E2114]">
                    <div className="font-bold text-[#8A511D] dark:text-[#F0C188]">
                      Ditemukan data lokal dan data tersimpan di akun Google
                    </div>
                    <div className="font-mono-tabular flex flex-col gap-1 text-[#523A24] dark:text-[#E3C7A6]">
                      <div>
                        Data perangkat ini: {pendingConflict.localAbcCount} siswa
                        ABC · {pendingConflict.localUraianCount} peserta
                        Angket/Uraian
                      </div>
                      <div>
                        Data akun Google: {pendingConflict.cloudAbcCount} siswa
                        ABC · {pendingConflict.cloudUraianCount} peserta
                        Angket/Uraian
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={onPullCloudToLocal}
                        disabled={syncState === 'syncing'}
                        className="btn-gesture btn-surface-primary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                      >
                        <CloudDownload
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>Muat Data Google</span>
                      </button>
                      <button
                        type="button"
                        onClick={onPushLocalToCloud}
                        disabled={syncState === 'syncing'}
                        className="btn-gesture btn-surface-secondary inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                      >
                        <CloudUpload
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>Simpan Data Lokal ke Google</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual Sync Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onPushLocalToCloud}
                    disabled={syncState === 'syncing'}
                    className="btn-gesture btn-surface-secondary inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap disabled:opacity-50"
                  >
                    <CloudUpload
                      className="btn-nudge-up h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>Simpan ke Google Sekarang</span>
                  </button>
                  <button
                    type="button"
                    onClick={onPullCloudToLocal}
                    disabled={syncState === 'syncing'}
                    className="btn-gesture btn-surface-secondary inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap disabled:opacity-50"
                  >
                    <CloudDownload
                      className="btn-nudge-up h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>Ambil Data dari Google</span>
                  </button>
                </div>

                {(syncMessage || formattedLastSync) && (
                  <p className="font-mono-tabular text-[11px] text-[#52635C] dark:text-[#9AAAA2]">
                    {syncMessage}
                    {syncMessage && formattedLastSync ? ' · ' : ''}
                    {formattedLastSync
                      ? `Sinkron terakhir: ${formattedLastSync}`
                      : ''}
                  </p>
                )}
              </div>
            )}

            {authError && (
              <p
                role="alert"
                className="text-xs font-medium text-[#B42318] dark:text-[#F97066]"
              >
                {authError}
              </p>
            )}
          </section>

          {/* Section 2: Appearance & Interactive Button Style */}
          <section
            aria-labelledby="settings-appearance-heading"
            className="flex flex-col gap-3.5 rounded-xl border border-[#D4DDD8] bg-[#F8FAF9] p-4 dark:border-[#28362F] dark:bg-[#111915]"
          >
            <h3
              id="settings-appearance-heading"
              className="text-sm font-bold text-[#14211C] dark:text-[#E6EEE9]"
            >
              Tampilan &amp; Gaya Tombol
            </h3>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[#14211C] dark:text-[#E6EEE9]">
                  Tema Layar
                </div>
                <div className="text-[11px] text-[#52635C] dark:text-[#9AAAA2]">
                  {darkMode ? 'Mode Gelap aktif' : 'Mode Terang aktif'}
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleDarkMode}
                className="btn-gesture btn-surface-secondary inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
              >
                {darkMode ? (
                  <Sun className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Moon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>{darkMode ? 'Ubah ke Terang' : 'Ubah ke Gelap'}</span>
              </button>
            </div>

            <div className="border-t border-[#E3EAE6] pt-3 dark:border-[#24322B]">
              <ButtonStylePicker
                buttonStyle={buttonStyle}
                onChangeButtonStyle={onChangeButtonStyle}
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-[#D4DDD8] px-5 py-3.5 dark:border-[#28362F]">
          <button
            type="button"
            onClick={onClose}
            className="btn-gesture btn-surface-primary min-h-[40px] cursor-pointer rounded-xl px-5 py-2 text-sm font-semibold"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
