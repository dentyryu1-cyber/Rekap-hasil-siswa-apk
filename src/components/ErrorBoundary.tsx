import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Terjadi kesalahan pada aplikasi.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F4F6F5] p-6 text-[#14211C] dark:bg-[#0E1411] dark:text-[#E6EEE9]">
          <div className="w-full max-w-md rounded-2xl border border-[#D4DDD8] bg-white p-6 shadow-lg dark:border-[#28362F] dark:bg-[#161F1B]">
            <div className="flex items-center gap-3 text-[#B42318] dark:text-[#F97066]">
              <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden="true" />
              <h1 className="text-lg font-bold">
                Terjadi Gangguan pada Aplikasi
              </h1>
            </div>
            <p className="mt-3 text-sm text-[#52635C] dark:text-[#9AAAA2]">
              Data lokal Anda tetap aman di perangkat. Muat ulang halaman untuk
              melanjutkan pekerjaan.
            </p>
            {this.state.errorMessage && (
              <pre className="mt-3 max-h-32 overflow-auto rounded-lg border border-[#E3EAE6] bg-[#F8FAF9] p-2.5 text-[11px] text-[#52635C] dark:border-[#24322B] dark:bg-[#111915] dark:text-[#9AAAA2]">
                {this.state.errorMessage}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="btn-gesture btn-surface-primary mt-5 inline-flex min-h-[42px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Muat Ulang Aplikasi</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
