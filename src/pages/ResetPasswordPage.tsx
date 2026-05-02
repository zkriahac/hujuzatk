import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apolloClient } from '../lib/apolloClient';
import { RESET_PASSWORD_MUTATION } from '../lib/graphql';
import { LockKey, CheckCircle } from 'phosphor-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 max-w-sm w-full text-center">
          <p className="text-red-600 font-bold text-sm">Invalid or missing reset link. Please request a new one.</p>
          <button onClick={() => navigate('/user')} className="mt-4 text-emerald-600 text-sm font-bold hover:underline">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    setError(null);
    try {
      await apolloClient.mutate({
        mutation: RESET_PASSWORD_MUTATION,
        variables: { token, newPassword: password },
      });
      setDone(true);
    } catch (err: any) {
      setError(err.graphQLErrors?.[0]?.message ?? err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
      <div className="bg-white/90 backdrop-blur shadow-xl rounded-2xl max-w-md w-full p-8 border border-emerald-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 shrink-0">
            <LockKey size={22} weight="bold" />
          </div>
          <div>
            <div className="font-bold text-lg">Hujuzatk PMS</div>
            <div className="text-xs text-gray-500">Set a new password</div>
          </div>
        </div>

        {done ? (
          <div className="text-center py-4">
            <CheckCircle size={48} weight="fill" className="text-emerald-500 mx-auto mb-4" />
            <p className="font-black text-slate-900 text-lg mb-2">Password updated!</p>
            <p className="text-sm text-slate-500 mb-6">You can now log in with your new password.</p>
            <button
              onClick={() => navigate('/user')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-[0.98]"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded p-3 font-semibold">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 bg-slate-50 border-slate-200"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 bg-slate-50 border-slate-200"
                placeholder="Repeat your new password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? 'Updating…' : 'Set New Password'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/user')}
              className="w-full text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors pt-1"
            >
              Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
