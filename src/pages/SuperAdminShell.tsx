import { useEffect, useState } from 'react';
import { Database } from 'phosphor-react';
import { authService, type SessionUser } from '../lib/authService';
import { type Language } from '../lib/i18n';
import AdminView from '../components/AdminView';

function SuperAdminConfigPanel() {
  const [trialDays, setTrialDays] = useState(14);
  const [calendarYears, setCalendarYears] = useState(5);

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-700 shadow-xl p-4 text-sm text-slate-100">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Database size={18} className="text-emerald-400" />
        Global Configuration
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Free trial period (days)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={trialDays}
            onChange={(e) => setTrialDays(parseInt(e.target.value) || 14)}
            className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Calendar window (years)</label>
          <input
            type="number"
            min={1}
            max={5}
            value={calendarYears}
            onChange={(e) => setCalendarYears(parseInt(e.target.value) || 5)}
            className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Supported languages</label>
          <div className="flex gap-2 text-xs mt-1">
            <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-100 border border-emerald-400/40">EN</span>
            <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-100 border border-emerald-400/40">AR</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SuperAdminShell() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user?.isAdmin) setSession(user);
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const s = await authService.loginLocal(email, password);
      if (!s.isAdmin) {
        setError('This user is not a superadmin.');
        return;
      }
      setSession(s);
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium">Loading superadmin…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="bg-slate-900/80 border border-emerald-500/40 rounded-2xl shadow-2xl max-w-md w-full p-8">
          <h1 className="text-xl font-bold mb-2">Superadmin Login</h1>
          <p className="text-xs text-slate-300 mb-4">
            Enter your credentials to manage global Hujuzatk PMS settings.
          </p>
          {error && (
            <div className="mb-3 text-xs text-red-300 bg-red-900/40 border border-red-500/40 rounded px-2 py-1.5">{error}</div>
          )}
          <form onSubmit={handleLogin} className="space-y-3 text-sm">
            <div>
              <label className="block text-[11px] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold py-2 rounded"
            >
              Login as Superadmin
            </button>
          </form>
        </div>
      </div>
    );
  }

  const lang = (session.tenant.language as Language) || 'en';
  const tz = session.tenant.timezone || 'Asia/Muscat';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="h-14 border-b border-emerald-500/40 bg-slate-900/90 backdrop-blur flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center font-bold text-xs text-center">
            SA
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">Superadmin Dashboard</span>
            <span className="text-[10px] text-emerald-200">Global System Management</span>
          </div>
        </div>
        <button
          onClick={async () => {
            await authService.logout();
            window.location.href = '/';
          }}
          className="text-[11px] text-emerald-200 hover:text-emerald-100 underline underline-offset-2"
        >
          Logout
        </button>
      </header>
      <main className="flex-1 p-4 space-y-4 max-w-6xl mx-auto w-full">
        <SuperAdminConfigPanel />
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 shadow-xl p-4">
          <AdminView lang={lang} tz={tz} superadmin />
        </div>
      </main>
    </div>
  );
}
