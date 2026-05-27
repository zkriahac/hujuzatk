import { lazy, Suspense, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LandingPage, PrivacyPolicy, TermsOfService } from './pages/LandingPage';
import { trackPageView } from './lib/analytics';
import { authService } from './lib/authService';

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
  // if a session exists, redirect after the in-flight check resolves. Worst case is
  // a brief flash of the landing for already-logged-in users — much better than the
  // previous 1-2s spinner that gated everything.
  useEffect(() => {
    let cancelled = false;
    authService.getCurrentUser().then((s) => {
      if (cancelled || !s) return;
      const slug = encodeURIComponent((s.tenant.name || 'workspace').replace(/\s+/g, '-'));
      navigate(`/${slug}`, { replace: true });
    }).catch(() => { /* unauth → stay on landing */ });
    return () => { cancelled = true; };
  }, [navigate]);
  return <LandingPage />;
}

export function App() {
  const location = useLocation();
  const path = location.pathname || '/';

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

  return <Suspense fallback={<Spinner />}>{route}</Suspense>;
}
