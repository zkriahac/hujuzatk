import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LandingPage, PrivacyPolicy, TermsOfService } from './pages/LandingPage';
import { trackPageView, setAnalyticsUser } from './lib/analytics';
import { ConsentBanner } from './components/ConsentBanner';

// When a deploy ships, returning visitors still have the old index.html in
// memory referencing old hashed chunk filenames. Clicking a route that triggers
// React.lazy() requests e.g. /assets/AuthShell-OLDHASH.js which no longer
// exists on the server — the browser receives index.html (HTML), tries to
// parse as a JS module, throws a MIME error and the screen goes blank.
//
// `lazyWithRetry` catches the dynamic-import failure and force-reloads the page
// once. The reload fetches fresh index.html with the current chunk hashes, and
// the user's click works. A sessionStorage flag prevents an infinite loop if
// the reload itself doesn't fix the issue (e.g. genuinely broken deploy).
function lazyWithRetry<T extends ComponentType<any>>(loader: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await loader();
    } catch (err) {
      const KEY = 'hujuzatk_chunk_reload_at';
      const last = Number(sessionStorage.getItem(KEY) || '0');
      // Reload at most once every 60 seconds — beyond that we surface the
      // error to the ErrorBoundary / Suspense so it's debuggable.
      if (Date.now() - last > 60_000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
        // Return a promise that never resolves; the reload tears down the page first.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}

// Every non-landing route is lazy-loaded so a `/` visitor downloads only the
// landing chunk + React/Router vendor — not the workspace app, super-admin,
// xlsx export, etc. Cut roughly two-thirds off the bundle gzip on initial paint.
const UserAuthShell    = lazyWithRetry(() => import('./pages/AuthShell').then(m => ({ default: m.UserAuthShell })));
const WorkspaceShell   = lazyWithRetry(() => import('./pages/AuthShell').then(m => ({ default: m.WorkspaceShell })));
const SuperAdminShell  = lazyWithRetry(() => import('./pages/SuperAdminShell').then(m => ({ default: m.SuperAdminShell })));
const ResetPasswordPage= lazyWithRetry(() => import('./pages/ResetPasswordPage'));
const StoryPage        = lazyWithRetry(() => import('./pages/StoryPage').then(m => ({ default: m.StoryPage })));
const AboutPage        = lazyWithRetry(() => import('./pages/AboutPage'));
const ContactPage      = lazyWithRetry(() => import('./pages/ContactPage'));
const NotFound         = lazyWithRetry(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-emerald-50 to-blue-50">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function RootRoute() {
  const navigate = useNavigate();
  // Don't block initial paint on the session check. Render LandingPage immediately;
  // if a session exists, redirect after the in-flight check resolves. Worst case is
  // a brief flash of the landing for already-logged-in users — much better than the
  // previous 1-2s spinner that gated everything.
  //
  // authService is dynamic-imported so Apollo + Dexie don't ship in the landing
  // critical bundle — they only load if the user actually has a token to validate.
  useEffect(() => {
    let cancelled = false;
    import('./lib/authService').then(({ authService }) => {
      if (cancelled) return;
      return authService.getCurrentUser();
    }).then((s) => {
      if (cancelled || !s) return;
      setAnalyticsUser({
        user_id: s.tenantId,
        tenant_id: s.tenantId,
        plan: s.tenant.plan,
        subscription_status: s.tenant.subscriptionStatus,
        language: s.tenant.language,
        is_admin: s.isAdmin,
      });
      // Admins have no workspace/calendar — send them straight to the superadmin dashboard.
      if (s.isAdmin) {
        navigate('/superadmin', { replace: true });
        return;
      }
      const slug = encodeURIComponent((s.tenant.name || 'workspace').replace(/\s+/g, '-'));
      navigate(`/${slug}`, { replace: true });
    }).catch(() => { /* unauth → stay on landing, or stale-chunk reload kicked in */ });
    return () => { cancelled = true; };
  }, [navigate]);
  return <LandingPage />;
}

// Paths served as standalone static HTML from /public — never owned by the SPA.
// If the SPA somehow ends up controlling one (e.g., service-worker cached shell
// or in-app navigation), hard-navigate so the browser fetches the real file.
const STATIC_PUBLIC_PREFIXES = ['/ar/', '/en/', '/about/'];
const STATIC_PUBLIC_EXACT = ['/about'];

export function App() {
  const location = useLocation();
  const path = location.pathname || '/';

  if (
    STATIC_PUBLIC_PREFIXES.some((p) => path.startsWith(p)) ||
    STATIC_PUBLIC_EXACT.includes(path)
  ) {
    if (typeof window !== 'undefined') window.location.assign(path);
    return null;
  }

  useEffect(() => {
    trackPageView(path);
  }, [path]);

  const route = (() => {
    if (path === '/') return <RootRoute />;
    if (path === '/story') return <StoryPage />;
    if (path === '/about') return <AboutPage />;
    if (path === '/contact') return <ContactPage />;
    if (path === '/privacy') return <PrivacyPolicy />;
    if (path === '/terms') return <TermsOfService />;
    if (path === '/404') return <NotFound />;
    if (path === '/reset-password') return <ResetPasswordPage />;
    if (path.startsWith('/user')) return <UserAuthShell />;
    if (path.startsWith('/superadmin')) return <SuperAdminShell />;
    const username = decodeURIComponent(path.slice(1).split('/')[0] || 'workspace');
    return <WorkspaceShell username={username} />;
  })();

  return (
    <Suspense fallback={<Spinner />}>
      {route}
      <ConsentBanner />
    </Suspense>
  );
}
