import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService, type SessionUser } from '../lib/authService';
import { type AuthMode } from '../utils/constants';
import { cn } from '../utils/cn';
import { Sparkle } from 'phosphor-react';
import { t, getDir, type Language } from '../lib/i18n';
import TenantApp from '../components/TenantApp';

function detectLang(): Language {
  try {
    const stored = localStorage.getItem('landing-lang');
    if (stored === 'en' || stored === 'ar') return stored;
  } catch {}
  return navigator.language?.startsWith('ar') ? 'ar' : 'en';
}

// ---------- AUTH SCREEN ----------

interface AuthScreenProps {
  mode: AuthMode;
  onModeChange: (m: AuthMode) => void;
  onLoggedIn: (s: SessionUser) => void;
  error: string | null;
  setError: (v: string | null) => void;
  workspaceLabel?: string;
  initialWorkspace?: string;
  lang: Language;
}

export function AuthScreen({ mode, onModeChange, onLoggedIn, error, setError, workspaceLabel, initialWorkspace, lang }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState(initialWorkspace || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dir = getDir(lang);

  useEffect(() => {
    if (initialWorkspace && mode === 'register') {
      setName(initialWorkspace);
    }
  }, [initialWorkspace, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'register') {
        let defaults: any = {};
        try { defaults = JSON.parse(localStorage.getItem('admin-defaults') || '{}'); } catch {}
        const s = await authService.registerLocalTenant({
          email, name: name || email, password,
          language: defaults.language,
          currency: defaults.currency,
          timezone: defaults.timezone,
        });
        if (defaults.rooms?.length) {
          try { await authService.updateTenantConfig(s.tenantId, { rooms: defaults.rooms }); } catch {}
        }
        onLoggedIn(s);
      } else {
        const s = await authService.loginLocal(email, password);
        onLoggedIn(s);
      }
    } catch (err: any) {
      setError(err.message ?? 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur shadow-xl rounded-2xl max-w-md w-full p-8 border border-emerald-100" dir={dir}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-200 shrink-0">
          <div className="flex items-center justify-center w-full h-full rounded-xl">
            <img src="/logo.svg" alt="Plus Logo" style={{ width: 40, height: 40 }} />
          </div>
        </div>
        <div>
          <div className="font-bold text-lg">Hujuzatk PMS</div>
          <div className="text-xs text-gray-500">
            {workspaceLabel ? `Workspace: ${workspaceLabel}` : (lang === 'ar' ? 'إدارة العقارات الاحترافية' : 'Professional Property Management')}
          </div>
        </div>
      </div>

      <div className="flex mb-6 bg-slate-100 rounded-lg p-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => onModeChange('login')}
          className={cn('flex-1 py-2 rounded-md transition-all', mode === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-500')}
        >
          {t(lang, 'auth.login')}
        </button>
        <button
          type="button"
          onClick={() => onModeChange('register')}
          className={cn('flex-1 py-2 rounded-md transition-all', mode === 'register' ? 'bg-white shadow text-slate-900' : 'text-slate-500')}
        >
          {t(lang, 'auth.registerFree')}
        </button>
      </div>

      {error && <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded p-3 font-semibold">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {mode === 'register' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">{t(lang, 'auth.companyName')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 bg-slate-50 border-slate-200"
              placeholder={lang === 'ar' ? 'مثال: شقق النور' : 'e.g. Al Noor Apartments'}
              required
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">{t(lang, 'auth.email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 bg-slate-50 border-slate-200"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">{t(lang, 'auth.password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 bg-slate-50 border-slate-200"
            placeholder="••••••••"
            required
          />
        </div>
        {mode === 'register' && (
          <p className="text-[11px] text-slate-400 text-center">{t(lang, 'auth.freeTrial')}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (lang === 'ar' ? 'جاري المعالجة...' : 'Processing...') : mode === 'login' ? t(lang, 'auth.loginBtn') : t(lang, 'auth.createAccount')}
        </button>
      </form>
    </div>
  );
}

// ---------- USER AUTH SHELL (/user) ----------

export function UserAuthShell() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialWorkspace = searchParams.get('workspace') || '';
  const initialTab = (searchParams.get('tab') as AuthMode) || 'login';

  const [lang] = useState<Language>(detectLang);
  const [authMode, setAuthMode] = useState<AuthMode>(initialTab);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionUser | null | 'loading'>('loading');

  useEffect(() => {
    authService.getCurrentUser().then(setCurrentSession);
  }, []);

  if (currentSession === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-emerald-50 to-blue-50">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If logged in, show "Continue as" banner instead of immediately redirecting
  if (currentSession) {
    const slug = encodeURIComponent((currentSession.tenant.name || 'workspace').replace(/\s+/g, '-'));
    const dir = getDir(lang);
    return (
      <div className="min-h-screen flex flex-col bg-linear-to-br from-emerald-50 to-blue-50 items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur shadow-xl rounded-2xl max-w-md w-full p-8 border border-emerald-100" dir={dir}>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0">
              <img src="/logo.svg" alt="Logo" style={{ width: 40, height: 40 }} />
            </div>
            <div>
              <div className="font-bold text-lg">Hujuzatk PMS</div>
              <div className="text-xs text-gray-500">{lang === 'ar' ? 'أنت مسجّل دخول حالياً' : 'Currently signed in'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-emerald-50 rounded-2xl p-4 mb-6 border border-emerald-100">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-sm shrink-0">
              {currentSession.tenant.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="font-black text-slate-900">{currentSession.tenant.name || currentSession.tenant.email}</div>
              <div className="text-xs text-slate-500">{currentSession.tenant.email}</div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/${slug}`)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Sparkle size={18} weight="fill" />
              {lang === 'ar'
                ? `متابعة بوصفك ${currentSession.tenant.name || currentSession.tenant.email}`
                : `Continue as ${currentSession.tenant.name || currentSession.tenant.email}`}
            </button>
            <button
              onClick={async () => {
                await authService.logout();
                setCurrentSession(null);
              }}
              className="w-full border-2 border-slate-200 text-slate-500 font-black py-3 rounded-xl hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-all text-sm"
            >
              {lang === 'ar' ? 'تبديل الحساب' : 'Switch Account'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-emerald-50 to-blue-50">
      <div className="flex-1 flex items-center justify-center p-4">
        <AuthScreen
          mode={authMode}
          onModeChange={setAuthMode}
          onLoggedIn={(s) => {
            const slug = encodeURIComponent((s.tenant.name || 'workspace').replace(/\s+/g, '-'));
            navigate(`/${slug}`);
          }}
          error={authError}
          setError={setAuthError}
          initialWorkspace={initialWorkspace}
          lang={lang}
        />
      </div>
    </div>
  );
}

// ---------- WORKSPACE HEADER ----------

export function WorkspaceHeader({ username }: { username: string }) {
  const navigate = useNavigate();
  const niceName = username === 'my-hotel' ? 'My Hotel' : username;
  return (
    <header className="h-14 border-b bg-white/90 backdrop-blur flex items-center justify-between px-4 shadow-sm fixed top-0 w-full z-50 text-slate-900">
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate('/')}
          className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs"
        >
          <div className="flex items-center justify-center w-full h-full rounded-xl">
            <img src="/logo.svg" alt="Plus Logo" style={{ width: 40, height: 40 }} />
          </div>
        </button>
        <div className="flex flex-col">
          <span className="font-semibold text-xs sm:text-sm">Hujuzatk</span>
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Workspace: {niceName}</span>
        </div>
      </div>
    </header>
  );
}

// ---------- WORKSPACE SHELL (/:username) ----------

interface WorkspaceShellProps {
  username: string;
}

export function WorkspaceShell({ username }: WorkspaceShellProps) {
  const [lang] = useState<Language>(detectLang);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const user = await authService.getCurrentUser();
        setSession(user);
      } finally {
        setAuthLoading(false);
      }
    };
    void bootstrap();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <WorkspaceHeader username={username} />
        <div className="flex-1 flex items-center justify-center text-gray-700">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium">{t(lang, 'auth.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col bg-linear-to-br from-emerald-50 to-blue-50">
        <WorkspaceHeader username={username} />
        <div className="flex-1 flex items-center justify-center p-4">
          <AuthScreen
            mode={authMode}
            onModeChange={setAuthMode}
            onLoggedIn={setSession}
            error={authError}
            setError={setAuthError}
            workspaceLabel={username}
            initialWorkspace={username}
            lang={lang}
          />
        </div>
      </div>
    );
  }

  return <TenantApp session={session} onSessionChange={setSession} />;
}
