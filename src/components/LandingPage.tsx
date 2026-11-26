import { ArrowRight, CheckCircle2, Database, FileText, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { useState } from 'react';
import type { CandidateInfo, ElectionInfoResponse, RoutePath } from '../types/election';
import { DEFAULT_CANDIDATES, HERO_CHAMBER_IMAGE } from '../utils/election';
import { CandidatePortrait } from './CandidatePortrait';
import { ManifestoModal } from './ManifestoModal';

interface LandingPageProps {
  electionInfo: ElectionInfoResponse | null;
  onNavigate: (route: RoutePath, hash?: string) => void;
}

export function LandingPage({ electionInfo, onNavigate }: LandingPageProps) {
  const candidates: CandidateInfo[] = electionInfo?.candidates ?? DEFAULT_CANDIDATES;
  const status = electionInfo?.status ?? 'Open';
  const [activeManifesto, setActiveManifesto] = useState<CandidateInfo | null>(null);

  return (
    <div className="animate-page-enter">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-800/70">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.16),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(59,130,246,0.10),_transparent_55%)]"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-stretch">
            {/* Hero Copy */}
            <div className="flex flex-col justify-center lg:col-span-6 space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide text-indigo-300">
                <span>VOTIFY Electronic Ballot</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span>Every Voice Matters, Every Vote Counts</span>
              </div>

              <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]">
                Your Voice. Your Choice. Your Future.
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                Cast a verified ballot in seconds. Every submission is validated by our preserved Python voting engine,
                enforcing one vote per Voter ID with persistent tally integrity and administrator-only results access.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('/vote')}
                  className="inline-flex items-center gap-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/60 transition-all duration-150 hover:from-indigo-500 hover:to-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060914] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Start Voting</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>

                <a
                  href="#election-info"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('election-info')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/60 px-5 py-3.5 text-sm font-medium text-slate-200 transition-colors duration-150 hover:border-slate-500 hover:bg-slate-800/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 whitespace-nowrap shrink-0"
                >
                  View Election Information
                </a>
              </div>
            </div>

            {/* Hero Architectural Visual */}
            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[280px] overflow-hidden rounded-xl border border-slate-800/90 bg-[#0B1120]">
                <img
                  src={HERO_CHAMBER_IMAGE}
                  alt="VOTIFY digital civic voting chamber podium"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#060914]/90 via-[#060914]/25 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-300">Official Election Status</p>
                    <p className="mt-1 font-[Outfit] text-lg font-semibold text-white">
                      Polls {status} — Accepting Verified Ballots
                    </p>
                  </div>
                  <span className="font-mono text-xs text-indigo-300 tabular-nums whitespace-nowrap shrink-0">
                    {candidates.length} {candidates.length === 1 ? 'Candidate' : 'Candidates'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Election Information Strip */}
      <section id="election-info" className="border-b border-slate-800/70 bg-[#090E1D]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Election Information
              </h2>
              <p className="mt-1.5 text-sm text-slate-400">
                Key rules and operational status governing this voting session.
              </p>
            </div>
            <p className="font-mono text-xs text-slate-400 tabular-nums">
              Status: {status} · Single-Ballot Rule Active
            </p>
          </div>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-slate-800/90 bg-slate-800/70 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-[#0B1120] p-6">
              <p className="text-xs font-medium text-slate-400">Ballot Status</p>
              <p className="mt-2 font-[Outfit] text-xl font-semibold text-white">{status}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Voters may submit their selection once with a valid Voter ID.
              </p>
            </div>

            <div className="bg-[#0B1120] p-6">
              <p className="text-xs font-medium text-slate-400">Registered Candidates</p>
              <p className="mt-2 font-mono text-xl font-semibold text-white tabular-nums">
                {candidates.length}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Choose one candidate from the official ballot roster below.
              </p>
            </div>

            <div className="bg-[#0B1120] p-6">
              <p className="text-xs font-medium text-slate-400">Duplicate Protection</p>
              <p className="mt-2 font-[Outfit] text-xl font-semibold text-white">1 Vote / ID</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Whitespace-normalized Voter IDs are checked before recording any vote.
              </p>
            </div>

            <div className="bg-[#0B1120] p-6">
              <p className="text-xs font-medium text-slate-400">Tally Visibility</p>
              <p className="mt-2 font-[Outfit] text-xl font-semibold text-white">Admin Only</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Live counts, charts, and winner declarations require administrator sign-in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Candidate Preview Section */}
      <section className="border-b border-slate-800/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Official Candidates
              </h2>
              <p className="mt-1.5 text-sm text-slate-400">
                Review the registered candidates and manifestos appearing on the ballot.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/vote')}
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Proceed to Voting Booth</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {candidates.map((candidate) => {
              const hasManifesto = Boolean(candidate.manifestoText?.trim() || candidate.manifestoUrl);
              return (
                <article
                  key={candidate.id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-800/90 bg-[#0B1120] transition-colors duration-200 hover:border-indigo-500/40"
                >
                  <CandidatePortrait
                    name={candidate.name}
                    photoUrl={candidate.photoUrl}
                    ballotNumber={candidate.ballotNumber}
                    size="lg"
                  />
                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono tabular-nums">Candidate 0{candidate.ballotNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span>Official Ballot</span>
                      </div>
                      <h3 className="mt-2 font-[Outfit] text-xl font-semibold tracking-tight text-white">
                        {candidate.name}
                      </h3>
                      <p className="mt-2 text-sm text-slate-400 line-clamp-3">
                        {candidate.manifestoText?.trim()
                          ? candidate.manifestoText.trim()
                          : `Registered ballot choice #${candidate.ballotNumber} for the current VOTIFY election.`}
                      </p>
                    </div>

                    {hasManifesto && (
                      <div className="mt-5 border-t border-slate-800/80 pt-4">
                        <button
                          type="button"
                          onClick={() => setActiveManifesto(candidate)}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition-colors cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Read Candidate Manifesto</span>
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust & Transparency Section */}
      <section className="bg-[#080D1B]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5 space-y-4">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl text-balance">
                Built for Verifiable Integrity
              </h2>
              <p className="text-sm leading-relaxed text-slate-400 sm:text-base">
                VOTIFY wraps your original Python voting logic inside a secure web interface without altering a single
                line of its core rules.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('/admin/login')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Lock className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                  <span>Administrator Portal</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800/80 bg-[#0B1120] p-6">
                <UserCheck className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                <h3 className="mt-4 font-[Outfit] text-base font-semibold text-white">
                  01. Voter ID Verification
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Empty or whitespace-only Voter IDs are rejected before any ballot is recorded.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-[#0B1120] p-6">
                <ShieldCheck className="h-5 w-5 text-blue-400" aria-hidden="true" />
                <h3 className="mt-4 font-[Outfit] text-base font-semibold text-white">
                  02. One Vote Per Person
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Duplicate Voter ID submissions are blocked atomically with an explicit constraint in SQLite.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-[#0B1120] p-6">
                <Database className="h-5 w-5 text-violet-400" aria-hidden="true" />
                <h3 className="mt-4 font-[Outfit] text-base font-semibold text-white">
                  03. Preserved Python Core
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Original vote counting, tie detection, and admin verification remain faithfully preserved on the server.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-[#0B1120] p-6">
                <CheckCircle2 className="h-5 w-5 text-indigo-300" aria-hidden="true" />
                <h3 className="mt-4 font-[Outfit] text-base font-semibold text-white">
                  04. Restricted Results Access
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Tally totals and winner declarations are protected behind server-verified administrator sessions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ManifestoModal candidate={activeManifesto} onClose={() => setActiveManifesto(null)} />
    </div>
  );
}
