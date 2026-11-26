import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { RoutePath } from '../types/election';
import { VotexaLogo } from './VotexaLogo';

interface NavbarProps {
  currentRoute: RoutePath;
  isAdminAuthenticated: boolean;
  onNavigate: (route: RoutePath, hash?: string) => void;
}

export function Navbar({ currentRoute, isAdminAuthenticated, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLink = (e: React.MouseEvent, route: RoutePath, hash?: string) => {
    e.preventDefault();
    setMobileOpen(false);
    onNavigate(route, hash);
  };

  const navLinkClass = (active: boolean) =>
    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-sm px-1 py-1 border-b-2 ${
      active
        ? 'text-white border-indigo-400'
        : 'text-slate-300 border-transparent hover:text-white hover:border-slate-600'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#060914]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => handleLink(e, '/')}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-md"
        >
          <VotexaLogo />
        </a>

        {/* Zone 2: Primary Navigation Links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
          <a href="/" onClick={(e) => handleLink(e, '/')} className={navLinkClass(currentRoute === '/')}>
            Home
          </a>
          <a href="/vote" onClick={(e) => handleLink(e, '/vote')} className={navLinkClass(currentRoute === '/vote')}>
            Vote
          </a>
          <a
            href="/#election-info"
            onClick={(e) => handleLink(e, '/', 'election-info')}
            className={navLinkClass(false)}
          >
            Election Info
          </a>
          <a
            href={isAdminAuthenticated ? '/admin' : '/admin/login'}
            onClick={(e) => handleLink(e, isAdminAuthenticated ? '/admin' : '/admin/login')}
            className={navLinkClass(currentRoute === '/admin' || currentRoute === '/admin/login')}
          >
            Admin Portal
          </a>
          {isAdminAuthenticated && (
            <>
              <a
                href="/admin/results"
                onClick={(e) => handleLink(e, '/admin/results')}
                className={navLinkClass(currentRoute === '/admin/results')}
              >
                Results
              </a>
              <a
                href="/admin/winner"
                onClick={(e) => handleLink(e, '/admin/winner')}
                className={navLinkClass(currentRoute === '/admin/winner')}
              >
                Winner
              </a>
            </>
          )}
        </nav>

        {/* Zone 3: Single Primary Action + Mobile Drawer Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onNavigate('/vote');
            }}
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-950/50 transition-all duration-150 hover:from-indigo-500 hover:to-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060914] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Start Voting
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-slate-800/80 bg-[#080d1c] px-4 py-4 space-y-1"
        >
          <a
            href="/"
            onClick={(e) => handleLink(e, '/')}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800/60"
          >
            Home
          </a>
          <a
            href="/vote"
            onClick={(e) => handleLink(e, '/vote')}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800/60"
          >
            Vote
          </a>
          <a
            href="/#election-info"
            onClick={(e) => handleLink(e, '/', 'election-info')}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800/60"
          >
            Election Info
          </a>
          <a
            href={isAdminAuthenticated ? '/admin' : '/admin/login'}
            onClick={(e) => handleLink(e, isAdminAuthenticated ? '/admin' : '/admin/login')}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800/60"
          >
            Admin Portal
          </a>
          {isAdminAuthenticated && (
            <>
              <a
                href="/admin/results"
                onClick={(e) => handleLink(e, '/admin/results')}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800/60"
              >
                Results
              </a>
              <a
                href="/admin/winner"
                onClick={(e) => handleLink(e, '/admin/winner')}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800/60"
              >
                Winner
              </a>
            </>
          )}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onNavigate('/vote');
              }}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white cursor-pointer"
            >
              Start Voting
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
