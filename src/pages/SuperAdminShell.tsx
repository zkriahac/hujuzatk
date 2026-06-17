import { useEffect, useState } from 'react';
import { authService, type SessionUser } from '../lib/authService';
import { type Language } from '../lib/i18n';
import AdminView from '../components/AdminView';

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
        {/* Global defaults live in AdminView's "Defaults" tab — no separate panel. */}
        <AdminView lang={lang} tz={tz} superadmin />
      </main>
    </div>
  );
}
