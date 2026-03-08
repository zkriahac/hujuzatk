import { useLocation } from 'react-router-dom';
import { LandingPage, PrivacyPolicy, TermsOfService } from './pages/LandingPage';
import { UserAuthShell, WorkspaceShell } from './pages/AuthShell';
import { SuperAdminShell } from './pages/SuperAdminShell';

export function App() {
  const location = useLocation();
  const path = location.pathname || '/';

  if (path === '/') return <LandingPage />;
  if (path === '/privacy') return <PrivacyPolicy />;
  if (path === '/terms') return <TermsOfService />;
  if (path.startsWith('/user')) return <UserAuthShell />;
  if (path.startsWith('/superadmin')) return <SuperAdminShell />;

  const username = decodeURIComponent(path.slice(1).split('/')[0] || 'workspace');
  return <WorkspaceShell username={username} />;
}
