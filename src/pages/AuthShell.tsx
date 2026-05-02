import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService, type SessionUser } from '../lib/authService';
import { type AuthMode } from '../utils/constants';
import { cn } from '../utils/cn';
import { Sparkle, EnvelopeSimple, CheckCircle } from 'phosphor-react';
import { t, getDir, type Language } from '../lib/i18n';
import { trackLogin, trackRegister } from '../lib/analytics';
import { addAccount } from '../lib/accountStore';
import TenantApp from '../components/TenantApp';
import { apolloClient } from '../lib/apolloClient';
import { REQUEST_PASSWORD_RESET_MUTATION } from '../lib/graphql';

// Save the freshly-authenticated session into the multi-account switcher store
function rememberAccount(s: SessionUser) {
  const token = localStorage.getItem('authToken');
  const refreshToken = localStorage.getItem('refreshToken');
  if (!token || !refreshToken) return;
  try {
    addAccount({
      tenantId: s.tenantId,
      name: s.tenant.name,
      email: s.tenant.email,
      slug: (s.tenant.name || 'workspace').replace(/\s+/g, '-'),
      token,
      refreshToken,
    });
  } catch {}
}

function detectLang(): Language {
  try {
    const stored = localStorage.getItem('landing-lang');
    if (stored === 'en' || stored === 'ar' || stored === 'tr') return stored;
  } catch {}
  if (navigator.language?.startsWith('ar')) return 'ar';
  if (navigator.language?.startsWith('tr')) return 'tr';
  return 'en';
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
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
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

    // Forgot-password flow
    if (mode === 'forgot') {
      try {
        await apolloClient.mutate({
          mutation: REQUEST_PASSWORD_RESET_MUTATION,
          variables: { email },
        });
        setForgotSent(true);
      } catch { /* always show success to avoid email enumeration */ setForgotSent(true); }
      finally { setLoading(false); }
      return;
    }

    try {
      if (mode === 'register') {
        let defaults: any = {};
        try { defaults = JSON.parse(localStorage.getItem('admin-defaults') || '{}'); } catch {}
        const s = await authService.registerLocalTenant({
          email, name: name || email, password, phone,
          language: defaults.language,
          currency: defaults.currency,
          timezone: defaults.timezone,
        });
        if (defaults.rooms?.length) {
          try { await authService.updateTenantConfig(s.tenantId, { rooms: defaults.rooms }); } catch {}
        }
        trackRegister(name || email);
        rememberAccount(s);
        onLoggedIn(s);
      } else {
        const s = await authService.loginLocal(email, password);
        trackLogin('email');
        rememberAccount(s);
        onLoggedIn(s);
      }
    } catch (err: any) {
      setError(err.message ?? 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const LABELS = {
    en: { forgot: 'Forgot password?', forgotTitle: 'Reset Password', forgotSub: 'Enter your account email and we will send a reset link.', forgotBtn: 'Send Reset Link', forgotSentTitle: 'Check your email', forgotSentSub: 'If that address is registered, a reset link has been sent. Check your spam folder too.', backLogin: 'Back to login' },
    ar: { forgot: 'نسيت كلمة المرور؟', forgotTitle: 'إعادة تعيين كلمة المرور', forgotSub: 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.', forgotBtn: 'إرسال رابط الإعادة', forgotSentTitle: 'تحقق من بريدك', forgotSentSub: 'إذا كان العنوان مسجلاً، فقد تم إرسال رابط إعادة التعيين. تحقق من مجلد الرسائل غير المرغوب فيها أيضاً.', backLogin: 'العودة لتسجيل الدخول' },
    tr: { forgot: 'Şifremi unuttum', forgotTitle: 'Şifre Sıfırla', forgotSub: 'E-posta adresinizi girin, sıfırlama bağlantısı gönderelim.', forgotBtn: 'Sıfırlama Bağlantısı Gönder', forgotSentTitle: 'E-postanı kontrol et', forgotSentSub: 'Bu adres kayıtlıysa sıfırlama bağlantısı gönderildi. Spam klasörünü de kontrol et.', backLogin: 'Girişe dön' },
  }[lang];

  const header = (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-200 shrink-0">
        <div className="flex items-center justify-center w-full h-full rounded-xl">
          <img src="/logo.svg" alt="Plus Logo" style={{ width: 40, height: 40 }} />
        </div>
      </div>
      <div>
        <div className="font-bold text-lg">Hujuzatk PMS</div>
        <div className="text-xs text-gray-500">
          {workspaceLabel ? `Workspace: ${workspaceLabel}` : ({ ar: 'إدارة الحجوزات الاحترافية', tr: 'Profesyonel Mülk Yönetimi', en: 'Professional Property Management' }[lang])}
        </div>
      </div>
    </div>
  );

  // ---- Forgot password screen ----
  if (mode === 'forgot') {
    return (
      <div className="bg-white/90 backdrop-blur shadow-xl rounded-2xl max-w-md w-full p-8 border border-emerald-100" dir={dir}>
        {header}
        {forgotSent ? (
          <div className="text-center py-2">
            <CheckCircle size={44} weight="fill" className="text-emerald-500 mx-auto mb-3" />
            <p className="font-black text-slate-900 mb-2">{LABELS.forgotSentTitle}</p>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{LABELS.forgotSentSub}</p>
            <button
              type="button"
              onClick={() => { setForgotSent(false); onModeChange('login'); }}
              className="text-emerald-600 text-sm font-black hover:underline"
            >
              {LABELS.backLogin}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <p className="font-black text-slate-900 text-base">{LABELS.forgotTitle}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{LABELS.forgotSub}</p>
            </div>
            {error && <div className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded p-3 font-semibold">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">{t(lang, 'auth.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 bg-slate-50 border-slate-200"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <EnvelopeSimple size={16} weight="bold" />
                {loading ? ({ ar: 'جاري الإرسال...', tr: 'Gönderiliyor...', en: 'Sending…' }[lang]) : LABELS.forgotBtn}
              </button>
              <button
                type="button"
                onClick={() => onModeChange('login')}
                className="w-full text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors"
              >
                {LABELS.backLogin}
              </button>
            </form>
          </>
        )}
      </div>
    );
  }

  // ---- Login / Register screen ----
  return (
    <div className="bg-white/90 backdrop-blur shadow-xl rounded-2xl max-w-md w-full p-8 border border-emerald-100" dir={dir}>
      {header}

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
          <>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">{t(lang, 'auth.companyName')}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 bg-slate-50 border-slate-200"
                placeholder={{ ar: 'مثال: شقق النور', tr: 'ör. Noor Apartmanları', en: 'e.g. Al Noor Apartments' }[lang]}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">{{ ar: 'رقم الهاتف', tr: 'Telefon Numarası', en: 'Phone Number' }[lang]}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 bg-slate-50 border-slate-200"
                placeholder={lang === 'ar' ? '+966 5X XXX XXXX' : '+966 5X XXX XXXX'}
                required
                dir="ltr"
              />
            </div>
          </>
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
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-600">{t(lang, 'auth.password')}</label>
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => { setError(null); onModeChange('forgot'); }}
                className="text-[11px] font-bold text-emerald-600 hover:underline"
              >
                {LABELS.forgot}
              </button>
            )}
          </div>
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
          {loading ? ({ ar: 'جاري المعالجة...', tr: 'İşleniyor...', en: 'Processing...' }[lang]) : mode === 'login' ? t(lang, 'auth.loginBtn') : t(lang, 'auth.createAccount')}
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
              <div className="text-xs text-gray-500">{{ ar: 'أنت مسجّل دخول حالياً', tr: 'Oturum açık', en: 'Currently signed in' }[lang]}</div>
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
              onClick={() => navigate(`/${slug}/calendar`)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Sparkle size={18} weight="fill" />
              {{ ar: `متابعة بوصفك ${currentSession.tenant.name || currentSession.tenant.email}`, tr: `${currentSession.tenant.name || currentSession.tenant.email} olarak devam et`, en: `Continue as ${currentSession.tenant.name || currentSession.tenant.email}` }[lang]}
            </button>
            <button
              onClick={async () => {
                await authService.logout();
                setCurrentSession(null);
              }}
              className="w-full border-2 border-slate-200 text-slate-500 font-black py-3 rounded-xl hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-all text-sm"
            >
              {{ ar: 'تبديل الحساب', tr: 'Hesap Değiştir', en: 'Switch Account' }[lang]}
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
            navigate(`/${slug}/calendar`);
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
    // Bare spinner — no branded header. Avoids the visible swap from the
    // "Hujuzatk · Workspace: foo" header to TenantApp's clean header
    // when session hydration finishes.
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
