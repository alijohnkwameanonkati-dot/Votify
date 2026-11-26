import { useCallback, useEffect, useState } from 'react';
import { AdminDashboardPage } from './components/AdminDashboardPage';
import { AdminLoginPage } from './components/AdminLoginPage';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { ResultsPage } from './components/ResultsPage';
import { VotingPage } from './components/VotingPage';
import { WinnerPage } from './components/WinnerPage';
import type {
  AdminResultsResponse,
  AdminWinnerResponse,
  ElectionInfoResponse,
  RoutePath,
} from './types/election';
import { parseRoutePath } from './utils/election';

export default function App() {
  const [route, setRoute] = useState<RoutePath>(() => parseRoutePath(window.location.pathname));
  const [electionInfo, setElectionInfo] = useState<ElectionInfoResponse | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminResults, setAdminResults] = useState<AdminResultsResponse | null>(null);
  const [adminWinner, setAdminWinner] = useState<AdminWinnerResponse | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [postLoginRoute, setPostLoginRoute] = useState<RoutePath>(() => {
    const initial = parseRoutePath(window.location.pathname);
    return initial === '/admin/results' || initial === '/admin/winner' ? initial : '/admin';
  });

  const navigate = useCallback((nextRoute: RoutePath, hash?: string) => {
    setRoute(nextRoute);
    const targetUrl = hash ? `${nextRoute === '/' ? '' : nextRoute}#${hash}` : nextRoute;
    if (window.location.pathname + window.location.hash !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }

    if (hash) {
      window.requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRoutePath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const loadElectionInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/election/info');
      if (res.ok) {
        const data = (await res.json()) as ElectionInfoResponse;
        setElectionInfo(data);
      }
    } catch {
      // Fallback defaults handle temporary network interruptions cleanly
    }
  }, []);

  useEffect(() => {
    void loadElectionInfo();
  }, [loadElectionInfo]);

  const fetchAdminData = useCallback(async (token: string) => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [resultsRes, winnerRes] = await Promise.all([
        fetch('/api/admin/results', { headers }),
        fetch('/api/admin/winner', { headers }),
      ]);

      if (resultsRes.status === 401 || winnerRes.status === 401) {
        setAdminToken(null);
        setAdminResults(null);
        setAdminWinner(null);
        setRoute('/admin/login');
        return;
      }

      if (!resultsRes.ok || !winnerRes.ok) {
        throw new Error('Failed to load election data from Python backend.');
      }

      const resultsData = (await resultsRes.json()) as AdminResultsResponse;
      const winnerData = (await winnerRes.json()) as AdminWinnerResponse;
      setAdminResults(resultsData);
      setAdminWinner(winnerData);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to fetch administrator data.');
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const handleRefreshAll = useCallback(
    async (token: string) => {
      await Promise.all([fetchAdminData(token), loadElectionInfo()]);
    },
    [fetchAdminData, loadElectionInfo],
  );

  useEffect(() => {
    if (adminToken && (route === '/admin' || route === '/admin/results' || route === '/admin/winner')) {
      void fetchAdminData(adminToken);
    }
  }, [adminToken, route, fetchAdminData]);

  const handleAdminLoginSuccess = (token: string) => {
    setAdminToken(token);
    const target = postLoginRoute === '/admin/login' ? '/admin' : postLoginRoute;
    setPostLoginRoute('/admin');
    navigate(target);
  };

  const handleLogout = async () => {
    const token = adminToken;
    setAdminToken(null);
    setAdminResults(null);
    setAdminWinner(null);
    setPostLoginRoute('/admin');
    navigate('/admin/login');
    if (token) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Session cleared client-side regardless
      }
    }
  };

  const handleProtectedNavigate = (nextRoute: RoutePath, hash?: string) => {
    if ((nextRoute === '/admin' || nextRoute === '/admin/results' || nextRoute === '/admin/winner') && !adminToken) {
      setPostLoginRoute(nextRoute);
      navigate('/admin/login');
      return;
    }
    navigate(nextRoute, hash);
  };

  const isAdminRoute = route === '/admin' || route === '/admin/results' || route === '/admin/winner';

  return (
    <div className="flex min-h-screen flex-col bg-[#060914] text-slate-100">
      <Navbar
        currentRoute={route}
        isAdminAuthenticated={Boolean(adminToken)}
        onNavigate={handleProtectedNavigate}
      />

      <main className="flex-1">
        {route === '/' && <LandingPage electionInfo={electionInfo} onNavigate={handleProtectedNavigate} />}

        {route === '/vote' && <VotingPage electionInfo={electionInfo} onNavigate={handleProtectedNavigate} />}

        {(route === '/admin/login' || (isAdminRoute && !adminToken)) && (
          <AdminLoginPage
            redirectNotice={
              isAdminRoute && !adminToken
                ? 'To View Results, You Must Be An Admin. Enter your administrator password to continue.'
                : undefined
            }
            onLoginSuccess={handleAdminLoginSuccess}
            onNavigate={handleProtectedNavigate}
          />
        )}

        {route === '/admin' && adminToken && (
          <AdminDashboardPage
            adminToken={adminToken}
            results={adminResults}
            loading={adminLoading}
            error={adminError}
            onRefresh={() => handleRefreshAll(adminToken)}
            onLogout={() => void handleLogout()}
            onNavigate={handleProtectedNavigate}
          />
        )}

        {route === '/admin/results' && adminToken && (
          <ResultsPage
            results={adminResults}
            loading={adminLoading}
            onRefresh={() => void handleRefreshAll(adminToken)}
            onNavigate={handleProtectedNavigate}
          />
        )}

        {route === '/admin/winner' && adminToken && (
          <WinnerPage
            winnerData={adminWinner}
            loading={adminLoading}
            onNavigate={handleProtectedNavigate}
          />
        )}
      </main>

      <Footer isAdminAuthenticated={Boolean(adminToken)} onNavigate={handleProtectedNavigate} />
    </div>
  );
}
