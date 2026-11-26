import { AlertCircle, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { useState } from 'react';
import type { RoutePath } from '../types/election';

interface AdminLoginPageProps {
  redirectNotice?: string;
  onLoginSuccess: (token: string) => void;
  onNavigate: (route: RoutePath) => void;
}

export function AdminLoginPage({ redirectNotice, onLoginSuccess, onNavigate }: AdminLoginPageProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!password) {
      setErrorMessage('Please enter the administrator password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { ok?: boolean; token?: string; message?: string };

      if (response.ok && data.ok && data.token) {
        setPassword('');
        onLoginSuccess(data.token);
      } else {
        setErrorMessage(data.message || 'ACCESS DENIED');
      }
    } catch {
      setErrorMessage('Unable to verify administrator credentials. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-page-enter mx-auto flex min-h-[calc(100vh-14rem)] max-w-md items-center px-4 py-14 sm:px-6">
      <div className="w-full rounded-xl border border-slate-800/90 bg-[#0B1120] p-7 shadow-2xl sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </div>

        <h1 className="mt-5 font-[Outfit] text-2xl font-bold tracking-tight text-white">
          Administrator Portal
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
          {redirectNotice || 'To View Results, You Must Be An Admin. Sign in to access election tallies and winner declarations.'}
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-100"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
            <div>
              <span className="font-semibold">{errorMessage}</span>
              <p className="mt-0.5 text-xs text-rose-200/80">
                Verify your administrator password and try again.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          <div>
            <label htmlFor="admin-password-input" className="block text-sm font-medium text-slate-200">
              Admin Password
            </label>
            <div className="relative mt-2">
              <input
                id="admin-password-input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter administrator password"
                className="w-full rounded-lg border border-slate-700 bg-[#060914] py-3 pl-4 pr-12 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-1 flex items-center justify-center rounded-md px-3 text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/60 transition-all duration-150 hover:from-indigo-500 hover:to-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            <span>{isSubmitting ? 'Verifying...' : 'Sign In as Administrator'}</span>
          </button>
        </form>

        <div className="mt-6 border-t border-slate-800 pt-5 text-center">
          <button
            type="button"
            onClick={() => onNavigate('/vote')}
            className="text-xs font-medium text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            Return to Voter Ballot Booth
          </button>
        </div>
      </div>
    </div>
  );
}
