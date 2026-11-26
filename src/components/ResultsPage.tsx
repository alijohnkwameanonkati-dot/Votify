import { ArrowLeft, RefreshCw, Trophy } from 'lucide-react';
import type { AdminResultsResponse, RoutePath } from '../types/election';
import { formatPercentage, formatVoteCount, sortCandidatesByVotes } from '../utils/election';
import { CandidatePortrait } from './CandidatePortrait';

interface ResultsPageProps {
  results: AdminResultsResponse | null;
  loading: boolean;
  onRefresh: () => void;
  onNavigate: (route: RoutePath) => void;
}

export function ResultsPage({ results, loading, onRefresh, onNavigate }: ResultsPageProps) {
  if (loading && !results) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 space-y-6">
        <div className="h-10 w-56 rounded-lg bg-slate-800/60 animate-pulse" />
        <div className="h-80 rounded-xl border border-slate-800 bg-[#0B1120] animate-pulse" />
      </div>
    );
  }

  if (!results) return null;

  const sorted = sortCandidatesByVotes(results.candidates);
  const maxVotes = Math.max(...results.candidates.map((c) => c.votes), 0);

  return (
    <div className="animate-page-enter mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14 space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('/admin')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Admin Dashboard</span>
          </button>
          <h1 className="mt-2 font-[Outfit] text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Official Election Results
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Election Status: {results.electionStatus} · Total Ballots Recorded:{' '}
            <span className="font-mono text-slate-200 tabular-nums">{results.totalVotes}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/admin/winner')}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-500 hover:to-blue-500 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Trophy className="h-4 w-4" aria-hidden="true" />
            <span>Winner Announcement</span>
          </button>
        </div>
      </div>

      {/* Candidate Breakdown Cards */}
      <div className="space-y-4">
        {sorted.map((candidate, index) => {
          const isTop = results.winnerInfo.topVotes > 0 && candidate.votes === results.winnerInfo.topVotes;
          const barWidth = maxVotes > 0 ? (candidate.votes / maxVotes) * 100 : 0;

          return (
            <div
              key={candidate.id}
              className={`rounded-xl border p-5 sm:p-6 transition-colors ${
                isTop ? 'border-indigo-500/50 bg-[#101830]' : 'border-slate-800/90 bg-[#0B1120]'
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <CandidatePortrait
                    name={candidate.name}
                    photoUrl={candidate.photoUrl}
                    ballotNumber={candidate.ballotNumber}
                    size="sm"
                  />
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono tabular-nums">Rank #{index + 1}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">Ballot #{candidate.ballotNumber}</span>
                      {isTop && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-indigo-300 font-medium">
                            {results.winnerInfo.status === 'tie' ? 'Tied for First' : 'Leading'}
                          </span>
                        </>
                      )}
                    </div>
                    <h2 className="mt-1 font-[Outfit] text-xl font-bold text-white">{candidate.name}</h2>
                  </div>
                </div>

                <div className="flex items-baseline gap-4 sm:text-right font-mono tabular-nums">
                  <div>
                    <p className="text-2xl font-bold text-white">{candidate.votes}</p>
                    <p className="text-xs text-slate-400">{formatVoteCount(candidate.votes)}</p>
                  </div>
                  <div className="border-l border-slate-800 pl-4">
                    <p className="text-xl font-semibold text-indigo-300">
                      {formatPercentage(candidate.percentage)}
                    </p>
                    <p className="text-xs text-slate-400">Vote share</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 h-2.5 w-full overflow-hidden rounded-md bg-slate-900 border border-slate-800">
                <div
                  className="h-full rounded-md bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state guidance if 0 votes */}
      {results.totalVotes === 0 && (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#0B1120] p-8 text-center">
          <p className="text-base font-medium text-slate-200">No votes have been cast yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Vote totals and percentage shares will populate as soon as verified ballots are submitted.
          </p>
        </div>
      )}
    </div>
  );
}
