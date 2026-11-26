import { AlertTriangle, Award, BarChart3, LogOut, RefreshCw, Trophy, Users, Vote } from 'lucide-react';
import type { AdminResultsResponse, RoutePath } from '../types/election';
import { formatPercentage, formatTimestamp, formatVoteCount, getWinnerHeadline, sortCandidatesByVotes } from '../utils/election';
import { AdminSecurityCard } from './AdminSecurityCard';
import { CandidateManager } from './CandidateManager';

interface AdminDashboardPageProps {
  adminToken: string;
  results: AdminResultsResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void> | void;
  onLogout: () => void;
  onNavigate: (route: RoutePath) => void;
}

export function AdminDashboardPage({
  adminToken,
  results,
  loading,
  error,
  onRefresh,
  onLogout,
  onNavigate,
}: AdminDashboardPageProps) {
  if (loading && !results) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-6">
        <div className="h-10 w-64 rounded-lg bg-slate-800/60 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 rounded-xl border border-slate-800 bg-[#0B1120] animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-xl border border-slate-800 bg-[#0B1120] animate-pulse" />
      </div>
    );
  }

  if (error && !results) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-6 text-rose-100">
          <h1 className="font-[Outfit] text-xl font-semibold">Unable to Load Dashboard</h1>
          <p className="mt-2 text-sm text-rose-200/80">{error}</p>
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const data = results;
  if (!data) return null;

  const sortedCandidates = sortCandidatesByVotes(data.candidates);
  const maxVotes = Math.max(...data.candidates.map((c) => c.votes), 0);
  const winnerSummary = getWinnerHeadline(data.winnerInfo);

  return (
    <div className="animate-page-enter mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-indigo-300">
            VOTIFY Administrator Session · Live SQLite Ledger
          </p>
          <h1 className="mt-1 font-[Outfit] text-3xl font-bold tracking-tight text-white">
            Election Control Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Refresh Data</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/admin/results')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer whitespace-nowrap shrink-0"
          >
            <BarChart3 className="h-4 w-4 text-indigo-400" aria-hidden="true" />
            <span>Results View</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/admin/winner')}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-500 hover:to-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Trophy className="h-4 w-4" aria-hidden="true" />
            <span>Winner Screen</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/20 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer whitespace-nowrap shrink-0"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <section aria-label="Election summary statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-6">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Votes Cast</span>
            <Vote className="h-4 w-4 text-indigo-400" aria-hidden="true" />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold text-white tabular-nums">
            {data.totalVotes.toLocaleString()}
          </p>
          <p className="mt-1.5 text-xs text-slate-400">Verified ballots recorded</p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-6">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Unique Voter IDs</span>
            <Users className="h-4 w-4 text-blue-400" aria-hidden="true" />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold text-white tabular-nums">
            {data.uniqueVoters.toLocaleString()}
          </p>
          <p className="mt-1.5 text-xs text-slate-400">1:1 voter participation</p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-6">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Current Standing</span>
            <Award className="h-4 w-4 text-violet-400" aria-hidden="true" />
          </div>
          <p className="mt-3 font-[Outfit] text-xl font-bold text-white truncate" title={winnerSummary}>
            {winnerSummary}
          </p>
          <p className="mt-2 font-mono text-xs text-slate-400 tabular-nums">
            {data.winnerInfo.status === 'no_votes'
              ? '0 votes recorded'
              : data.winnerInfo.status === 'tie'
                ? `${data.winnerInfo.winners.length} tied · ${formatVoteCount(data.winnerInfo.topVotes)} each`
                : `Leading with ${formatVoteCount(data.winnerInfo.topVotes)}`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-6">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Ballot Status</span>
            <BarChart3 className="h-4 w-4 text-indigo-300" aria-hidden="true" />
          </div>
          <p className="mt-3 font-[Outfit] text-2xl font-bold text-white">
            {data.electionStatus}
          </p>
          <p className="mt-1.5 font-mono text-xs text-slate-400 tabular-nums">
            {data.candidates.length} active candidates
          </p>
        </div>
      </section>

      {/* Tie Notification Banner */}
      {data.winnerInfo.status === 'tie' && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-950/25 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
            <div>
              <h2 className="font-[Outfit] text-base font-semibold text-amber-100">
                Tie Detected Across Leading Candidates
              </h2>
              <p className="mt-0.5 text-sm text-amber-200/85">
                {data.winnerInfo.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/admin/winner')}
            className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/25 cursor-pointer whitespace-nowrap shrink-0"
          >
            View Tie Announcement
          </button>
        </div>
      )}

      {/* Charts & Vote Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7 rounded-xl border border-slate-800/90 bg-[#0B1120] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-[Outfit] text-lg font-semibold text-white">
                Candidate Vote Comparison
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Live tallies directly from the Python SQLite voting engine.
              </p>
            </div>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              Total: {data.totalVotes}
            </span>
          </div>

          <div className="mt-6 space-y-5">
            {data.candidates.map((candidate, idx) => {
              const widthPct = maxVotes > 0 ? Math.max((candidate.votes / maxVotes) * 100, candidate.votes > 0 ? 4 : 0) : 0;
              const barGradients = [
                'from-blue-500 to-indigo-500',
                'from-violet-500 to-purple-500',
                'from-indigo-400 to-blue-400',
              ];
              const barClass = barGradients[idx % barGradients.length];

              return (
                <div key={candidate.id} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-slate-500 tabular-nums">0{candidate.ballotNumber}</span>
                      <span className="font-semibold text-white truncate">{candidate.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs tabular-nums shrink-0">
                      <span className="text-slate-300 font-semibold">{formatVoteCount(candidate.votes)}</span>
                      <span className="text-slate-400 w-14 text-right">{formatPercentage(candidate.percentage)}</span>
                    </div>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-md bg-slate-900 border border-slate-800/80">
                    <div
                      className={`h-full rounded-md bg-gradient-to-r ${barClass} transition-all duration-500 ease-out`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-5 rounded-xl border border-slate-800/90 bg-[#0B1120] p-6">
          <h2 className="font-[Outfit] text-lg font-semibold text-white">
            Vote Distribution
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Ranked standing by total ballots received.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-2.5 font-medium">Candidate</th>
                  <th className="py-2.5 text-right font-medium">Votes</th>
                  <th className="py-2.5 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {sortedCandidates.map((c) => {
                  const isLeader = data.winnerInfo.topVotes > 0 && c.votes === data.winnerInfo.topVotes;
                  return (
                    <tr key={c.id} className="hover:bg-slate-900/50">
                      <td className="py-3 pr-3">
                        <span className="font-medium text-white">{c.name}</span>
                        {isLeader && (
                          <span className="ml-2 font-mono text-xs text-indigo-300">
                            {data.winnerInfo.status === 'tie' ? '· Tied' : '· Leader'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-200 tabular-nums">{c.votes}</td>
                      <td className="py-3 text-right font-mono text-slate-400 tabular-nums">
                        {formatPercentage(c.percentage)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Candidate Management (Add, Remove, Photos, Manifestos) */}
      <CandidateManager
        adminToken={adminToken}
        candidates={data.candidates}
        onChanged={onRefresh}
      />

      {/* Administrator Password Management */}
      <AdminSecurityCard
        adminToken={adminToken}
        passwordSource={data.passwordSource}
        onUpdated={onRefresh}
      />

      {/* Recent Election Activity Overview */}
      <section className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-[Outfit] text-lg font-semibold text-white">
              Election Activity Overview
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Chronological audit log of recorded ballots, candidate changes, duplicate blocks, and admin sign-ins.
            </p>
          </div>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            {data.recentActivity.length} recent events
          </span>
        </div>

        {data.recentActivity.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-800 bg-[#060914] p-8 text-center">
            <p className="text-sm font-medium text-slate-300">No election activity recorded yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              Verified votes and security checks will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Event</th>
                  <th className="py-2.5 pr-4 font-medium">Details</th>
                  <th className="py-2.5 text-right font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {data.recentActivity.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/40">
                    <td className="py-3 pr-4 font-mono text-xs text-indigo-300 whitespace-nowrap">
                      {item.eventType}
                    </td>
                    <td className="py-3 pr-4 text-slate-200">{item.message}</td>
                    <td className="py-3 text-right font-mono text-xs text-slate-400 tabular-nums whitespace-nowrap">
                      {formatTimestamp(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
