import type { RoutePath } from '../types/election';
import { VotexaLogo } from './VotexaLogo';

interface FooterProps {
  isAdminAuthenticated: boolean;
  onNavigate: (route: RoutePath, hash?: string) => void;
}

export function Footer({ isAdminAuthenticated, onNavigate }: FooterProps) {
  const go = (e: React.MouseEvent, route: RoutePath, hash?: string) => {
    e.preventDefault();
    onNavigate(route, hash);
  };

  return (
    <footer className="border-t border-slate-800/80 bg-[#050811]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-3">
            <VotexaLogo />
            <p className="text-sm text-slate-400">Every Voice Matters, Every Vote Counts.</p>
            <p className="text-xs leading-relaxed text-slate-500">
              Powered by an audited Python voting core with persistent SQLite ballot integrity and
              administrator-restricted tally verification.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-14 text-sm">
            <div className="space-y-2.5">
              <h2 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">Ballot</h2>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a href="/" onClick={(e) => go(e, '/')} className="hover:text-white transition-colors">
                    Overview
                  </a>
                </li>
                <li>
                  <a href="/vote" onClick={(e) => go(e, '/vote')} className="hover:text-white transition-colors">
                    Cast Ballot
                  </a>
                </li>
                <li>
                  <a
                    href="/#election-info"
                    onClick={(e) => go(e, '/', 'election-info')}
                    className="hover:text-white transition-colors"
                  >
                    Election Info
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h2 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">Administration</h2>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a
                    href={isAdminAuthenticated ? '/admin' : '/admin/login'}
                    onClick={(e) => go(e, isAdminAuthenticated ? '/admin' : '/admin/login')}
                    className="hover:text-white transition-colors"
                  >
                    {isAdminAuthenticated ? 'Admin Dashboard' : 'Admin Login'}
                  </a>
                </li>
                <li>
                  <a
                    href="/admin/results"
                    onClick={(e) => go(e, '/admin/results')}
                    className="hover:text-white transition-colors"
                  >
                    Official Results
                  </a>
                </li>
                <li>
                  <a
                    href="/admin/winner"
                    onClick={(e) => go(e, '/admin/winner')}
                    className="hover:text-white transition-colors"
                  >
                    Winner Declaration
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800/70 pt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} VOTIFY Electronic Voting Platform.</p>
          <p>One vote per verified Voter ID · Results restricted to authenticated administrators.</p>
        </div>
      </div>
    </footer>
  );
}
