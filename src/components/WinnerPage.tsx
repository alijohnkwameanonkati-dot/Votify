import { ArrowLeft, BarChart3, Scale, Vote } from 'lucide-react';
import type { AdminWinnerResponse, RoutePath } from '../types/election';
import { WINNER_TROPHY_IMAGE, formatVoteCount } from '../utils/election';

interface WinnerPageProps {
  winnerData: AdminWinnerResponse | null;
  loading: boolean;
  onNavigate: (route: RoutePath) => void;
}

export function WinnerPage({ winnerData, loading, onNavigate }: WinnerPageProps) {
  if (loading && !winnerData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="h-96 rounded-2xl border border-slate-800 bg-[#0B1120] animate-pulse" />
      </div>
    );
  }

  if (!winnerData) return null;

  const { winnerInfo, totalVotes, candidates } = winnerData;

  return (
    <div className="animate-page-enter mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onNavigate('/admin')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Admin Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/admin/results')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 hover:text-indigo-200 transition-colors cursor-pointer"
        >
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>View Detailed Results</span>
        </button>
      </div>

      {/* State 1: No Votes Cast */}
      {winnerInfo.status === 'no_votes' && (
        <section className="rounded-2xl border border-slate-800/90 bg-[#0B1120] p-10 text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300">
            <Vote className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="font-[Outfit] text-3xl font-bold tracking-tight text-white">
            No Votes Have Been Cast Yet
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400">
            A winner cannot be declared while total votes equal zero. Return to the voting booth to cast the first
            verified ballot.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/vote')}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-indigo-500 hover:to-blue-500 cursor-pointer"
            >
              Go to Voting Booth
            </button>
          </div>
        </section>
      )}

      {/* State 2: Tie Announcement */}
      {winnerInfo.status === 'tie' && (
        <section className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-b from-[#161526] to-[#0B1120] p-8 sm:p-12 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/10 text-amber-300">
            <Scale className="h-8 w-8" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <p className="font-mono text-xs tracking-wider text-amber-300 uppercase">
              Official Tie Determination
            </p>
            <h1 className="font-[Outfit] text-4xl font-bold tracking-tight text-white sm:text-5xl">
              IT&apos;S A TIE
            </h1>
            <p className="text-sm text-slate-300">
              Multiple candidates received the highest tally of{' '}
              <span className="font-mono font-semibold text-amber-200 tabular-nums">
                {formatVoteCount(winnerInfo.topVotes)}
              </span>{' '}
              each.
            </p>
          </div>

          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 pt-2">
            {winnerInfo.winners.map((tiedName) => (
              <div
                key={tiedName}
                className="rounded-xl border border-amber-500/30 bg-[#0B1120]/90 p-5 text-center"
              >
                <p className="font-[Outfit] text-lg font-bold text-white">{tiedName}</p>
                <p className="mt-1 font-mono text-xs text-amber-300 tabular-nums">
                  {formatVoteCount(winnerInfo.topVotes)}
                </p>
              </div>
            ))}
          </div>

          <p className="font-mono text-xs text-slate-400 tabular-nums">
            Total Ballots Cast: {totalVotes}
          </p>
        </section>
      )}

      {/* State 3: Clear Winner Announcement */}
      {winnerInfo.status === 'winner' && (
        <section className="relative overflow-hidden rounded-2xl border border-indigo-500/40 bg-[#0B1120] p-8 sm:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.22),_transparent_60%)]"
          />

          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-12 md:items-center">
            <div className="md:col-span-5">
              <div className="overflow-hidden rounded-xl border border-indigo-500/30 bg-[#060914] shadow-2xl">
                <img
                  src={WINNER_TROPHY_IMAGE}
                  alt="VOTIFY Official Election Winner Trophy"
                  referrerPolicy="no-referrer"
                  className="aspect-square w-full object-cover"
                />
              </div>
            </div>

            <div className="md:col-span-7 space-y-5 text-center md:text-left">
              <p className="text-xs font-medium tracking-wider text-indigo-300 uppercase">
                Official Winner Declaration
              </p>

              <h1 className="font-[Outfit] text-4xl font-bold tracking-tight text-white sm:text-5xl text-balance">
                {winnerInfo.winners[0]}
              </h1>

              <p className="text-base leading-relaxed text-slate-300">
                Declared the official leader of this VOTIFY election with{' '}
                <span className="font-mono font-semibold text-white tabular-nums">
                  {formatVoteCount(winnerInfo.topVotes)}
                </span>{' '}
                out of{' '}
                <span className="font-mono font-semibold text-slate-200 tabular-nums">
                  {totalVotes}
                </span>{' '}
                total ballots cast.
              </p>

              <div className="grid grid-cols-1 gap-3 border-t border-slate-800/80 pt-5 sm:grid-cols-3">
                {candidates.map((c) => (
                  <div key={c.id} className="rounded-lg border border-slate-800 bg-[#060914] p-3">
                    <p className="truncate text-xs font-medium text-slate-300">{c.name}</p>
                    <p className="mt-1 font-mono text-lg font-bold text-white tabular-nums">{c.votes}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
