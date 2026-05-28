import { lazy, Suspense, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LandingPage, PrivacyPolicy, TermsOfService } from './pages/LandingPage';
import { trackPageView, setAnalyticsUser } from './lib/analytics';
import { ConsentBanner } from './components/ConsentBanner';

// Every non-landing route is lazy-loaded so a `/` visitor downloads only the
// landing chunk + React/Router vendor — not the workspace app, super-admin,
// xlsx export, etc. Cut roughly two-thirds off the bundle gzip on initial paint.
const UserAuthShell    = lazy(() => import('./pages/AuthShell').then(m => ({ default: m.UserAuthShell })));
const WorkspaceShell   = lazy(() => import('./pages/AuthShell').then(m => ({ default: m.WorkspaceShell })));
const SuperAdminShell  = lazy(() => import('./pages/SuperAdminShell').then(m => ({ default: m.SuperAdminShell })));
const ResetPasswordPage= lazy(() => import('./pages/ResetPasswordPage'));
const StoryPage        = lazy(() => import('./pages/StoryPage').then(m => ({ default: m.StoryPage })));
const AboutPage        = lazy(() => import('./pages/AboutPage'));
const ContactPage      = lazy(() => import('./pages/ContactPage'));
const NotFound         = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

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
  // if a session exists, redirect after the in-flight check resolves.
  // authService is dynamic-imported so Apollo + Dexie stay out of the landing
  // critical bundle — they only load when there's a token to validate.
  useEffect(() => {
    let cancelled = false;
    import('./lib/authService').then(({ authService }) => {
      if (cancelled) return;
      return authService.getCurrentUser();
    }).then((s) => {
      if (cancelled || !s) return;
      // Identify the user for analytics (kept from the contractor's GA4 setup).
      setAnalyticsUser({
        user_id: s.tenantId,
        tenant_id: s.tenantId,
        plan: s.tenant.plan,
        subscription_status: s.tenant.subscriptionStatus,
        language: s.tenant.language,
        is_admin: s.isAdmin,
      });
      const slug = encodeURIComponent((s.tenant.name || 'workspace').replace(/\s+/g, '-'));
      navigate(`/${slug}`, { replace: true });
    }).catch(() => { /* unauth → stay on landing */ });
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

  const isStaticPublic =
    STATIC_PUBLIC_PREFIXES.some((p) => path.startsWith(p)) ||
    STATIC_PUBLIC_EXACT.includes(path);

  useEffect(() => {
    if (isStaticPublic) {
      if (typeof window !== 'undefined') window.location.assign(path);
      return;
    }
    trackPageView(path);
  }, [path, isStaticPublic]);

  if (isStaticPublic) return null;

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
