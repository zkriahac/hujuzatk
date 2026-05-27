import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LandingPage, PrivacyPolicy, TermsOfService } from './pages/LandingPage';
import { UserAuthShell, WorkspaceShell } from './pages/AuthShell';
import { SuperAdminShell } from './pages/SuperAdminShell';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { StoryPage } from './pages/StoryPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import { NotFound } from './pages/NotFound';
import { trackPageView, setAnalyticsUser } from './lib/analytics';
import { ConsentBanner } from './components/ConsentBanner';
import { authService, type SessionUser } from './lib/authService';

function RootRedirect() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [session, setSession] = useState<SessionUser | null>(null);

  useEffect(() => {
    authService.getCurrentUser().then((s) => {
      setSession(s);
      setChecked(true);
      if (s) {
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
      }
    });
  }, []);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-emerald-50 to-blue-50">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <LandingPage />;
  return null;
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
    if (path === '/') return <RootRedirect />;
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
    <>
      {route}
      <ConsentBanner />
    </>
  );
}
