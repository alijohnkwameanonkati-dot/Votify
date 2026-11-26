import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface AdminSecurityCardProps {
  adminToken: string;
  passwordSource?: 'env' | 'custom' | 'default';
  onUpdated: () => Promise<void> | void;
}

export function AdminSecurityCard({ adminToken, passwordSource = 'default', onUpdated }: AdminSecurityCardProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isEnvLocked = passwordSource === 'env';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!currentPassword) {
      setFeedback({ type: 'error', text: 'Enter your current administrator password.' });
      return;
    }
    if (newPassword.length < 4 || !newPassword.trim()) {
      setFeedback({ type: 'error', text: 'New password must be at least 4 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setFeedback({ type: 'error', text: data.message || 'Could not update administrator password.' });
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({
        type: 'success',
        text: data.message || 'Administrator password updated. Use your new password on future logins.',
      });
      await onUpdated();
    } catch {
      setFeedback({ type: 'error', text: 'Network error while updating administrator password.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section aria-label="Administrator Security" className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-6 space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-[Outfit] text-lg font-semibold text-white">
              Administrator Password
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {passwordSource === 'custom'
                ? 'Custom scrypt-hashed administrator password is active.'
                : 'Using initial password from python_app/voting_system.py. Update it below to set a custom password.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowPasswords((prev) => !prev)}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
        >
          {showPasswords ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
          <span>{showPasswords ? 'Hide Passwords' : 'Show Passwords'}</span>
        </button>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'success' ? 'status' : 'alert'}
          className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100'
              : 'border-rose-500/40 bg-rose-950/30 text-rose-100'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="current-admin-password" className="block text-xs font-medium text-slate-300">
            Current Password
          </label>
          <input
            id="current-admin-password"
            type={showPasswords ? 'text' : 'password'}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#060914] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <div>
          <label htmlFor="new-admin-password" className="block text-xs font-medium text-slate-300">
            New Password
          </label>
          <input
            id="new-admin-password"
            type={showPasswords ? 'text' : 'password'}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 4 characters"
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#060914] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <div>
          <label htmlFor="confirm-admin-password" className="block text-xs font-medium text-slate-300">
            Confirm New Password
          </label>
          <input
            id="confirm-admin-password"
            type={showPasswords ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#060914] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <div className="md:col-span-3 flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:from-indigo-500 hover:to-blue-500 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            <span>{isSaving ? 'Updating Password...' : 'Update Admin Password'}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
