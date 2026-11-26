import { AlertCircle, ArrowLeft, CheckCircle2, FileText, Loader2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import type { CandidateInfo, ElectionInfoResponse, RoutePath, VoteResponse } from '../types/election';
import { DEFAULT_CANDIDATES, validateVoteSelection } from '../utils/election';
import { CandidatePortrait } from './CandidatePortrait';
import { ManifestoModal } from './ManifestoModal';

interface VotingPageProps {
  electionInfo: ElectionInfoResponse | null;
  onNavigate: (route: RoutePath) => void;
}

export function VotingPage({ electionInfo, onNavigate }: VotingPageProps) {
  const candidates: CandidateInfo[] = electionInfo?.candidates ?? DEFAULT_CANDIDATES;
  const validCandidateIds = candidates.map((c) => c.id);

  const [voterId, setVoterId] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeManifesto, setActiveManifesto] = useState<CandidateInfo | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'duplicate';
    title: string;
    message: string;
    candidateName?: string;
    recordedVoterId?: string;
  } | null>(null);

  const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId) ?? null;

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const validation = validateVoteSelection(voterId, selectedCandidateId, validCandidateIds);
    if (!validation.valid) {
      setFeedback({
        type: 'error',
        title: 'Ballot Validation Required',
        message: validation.message,
      });
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmVote = async () => {
    const validation = validateVoteSelection(voterId, selectedCandidateId, validCandidateIds);
    if (!validation.valid) {
      setIsConfirmOpen(false);
      setFeedback({
        type: 'error',
        title: 'Ballot Validation Required',
        message: validation.message,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterId: validation.voterId,
          candidateId: validation.candidateId,
        }),
      });

      const data = (await response.json()) as VoteResponse;
      setIsConfirmOpen(false);

      if (response.ok && data.ok) {
        setFeedback({
          type: 'success',
          title: 'VOTED SUCCESSFULLY',
          message: `Your ballot for ${data.candidate?.name ?? selectedCandidate?.name} has been recorded.`,
          candidateName: data.candidate?.name ?? selectedCandidate?.name,
          recordedVoterId: data.voterId ?? validation.voterId,
        });
        setVoterId('');
        setSelectedCandidateId('');
      } else if (data.code === 'ALREADY_VOTED') {
        setFeedback({
          type: 'duplicate',
          title: 'Duplicate Vote Rejected',
          message: data.message || 'YOU HAVE ALREADY VOTED. ONE VOTE PER PERSON.',
        });
      } else {
        setFeedback({
          type: 'error',
          title: 'Unable to Record Vote',
          message: data.message || 'Voter ID cannot be empty.',
        });
      }
    } catch {
      setIsConfirmOpen(false);
      setFeedback({
        type: 'error',
        title: 'Connection Error',
        message: 'Could not reach the voting server. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-page-enter mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Home</span>
          </button>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Official Ballot Booth
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Enter your unique Voter ID, select one candidate below, and confirm your ballot.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Rule: One vote per Voter ID
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role={feedback.type === 'success' ? 'status' : 'alert'}
          className={`mb-8 rounded-xl border p-5 transition-all ${
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100'
              : feedback.type === 'duplicate'
                ? 'border-amber-500/40 bg-amber-950/30 text-amber-100'
                : 'border-rose-500/40 bg-rose-950/30 text-rose-100'
          }`}
        >
          <div className="flex items-start gap-3.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
            ) : feedback.type === 'duplicate' ? (
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" aria-hidden="true" />
            )}
            <div className="space-y-1">
              <h2 className="font-[Outfit] text-base font-semibold tracking-tight">{feedback.title}</h2>
              <p className="text-sm opacity-90">{feedback.message}</p>
              {feedback.type === 'success' && feedback.recordedVoterId && (
                <p className="pt-1 font-mono text-xs text-emerald-300/90 tabular-nums">
                  Verified Voter ID: {feedback.recordedVoterId} · Candidate: {feedback.candidateName}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voting Instructions Strip */}
      <div className="mb-8 grid grid-cols-1 gap-4 rounded-xl border border-slate-800/80 bg-[#0B1120] p-5 sm:grid-cols-3">
        <div className="space-y-1">
          <p className="font-mono text-xs text-indigo-300">Step 01</p>
          <p className="text-sm font-medium text-white">Enter Voter ID</p>
          <p className="text-xs text-slate-400">Must be non-empty and not previously used.</p>
        </div>
        <div className="space-y-1">
          <p className="font-mono text-xs text-indigo-300">Step 02</p>
          <p className="text-sm font-medium text-white">Select Candidate</p>
          <p className="text-xs text-slate-400">Choose one candidate from the ballot roster.</p>
        </div>
        <div className="space-y-1">
          <p className="font-mono text-xs text-indigo-300">Step 03</p>
          <p className="text-sm font-medium text-white">Confirm Ballot</p>
          <p className="text-xs text-slate-400">Review your selection carefully before final submission.</p>
        </div>
      </div>

      <form onSubmit={handleReviewSubmit} noValidate className="space-y-8">
        {/* Voter ID Input */}
        <section className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-6">
          <label htmlFor="voter-id-input" className="block text-sm font-semibold text-white">
            Voter ID
          </label>
          <p className="mt-1 text-xs text-slate-400">
            Leading and trailing spaces are automatically trimmed. Each Voter ID may vote only once.
          </p>
          <input
            id="voter-id-input"
            name="voterId"
            type="text"
            autoComplete="off"
            value={voterId}
            onChange={(e) => {
              setVoterId(e.target.value);
              if (feedback?.type === 'error' || feedback?.type === 'duplicate') {
                setFeedback(null);
              }
            }}
            placeholder="Enter your Voter ID (e.g. VTF-101)"
            className="mt-3 w-full rounded-lg border border-slate-700 bg-[#060914] px-4 py-3 font-mono text-sm text-white placeholder:font-sans placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </section>

        {/* Candidate Selection Cards */}
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-white">
            Select Your Candidate
          </legend>
          {candidates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-[#0B1120] p-8 text-center text-sm text-slate-400">
              No candidates are currently available on the ballot.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {candidates.map((candidate) => {
                const isSelected = selectedCandidateId === candidate.id;
                const hasManifesto = Boolean(candidate.manifestoText?.trim() || candidate.manifestoUrl);

                return (
                  <label
                    key={candidate.id}
                    htmlFor={`candidate-radio-${candidate.id}`}
                    className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'border-indigo-400 bg-[#111A33] ring-2 ring-indigo-500/40'
                        : 'border-slate-800/90 bg-[#0B1120] hover:border-slate-600'
                    }`}
                  >
                    <CandidatePortrait
                      name={candidate.name}
                      photoUrl={candidate.photoUrl}
                      ballotNumber={candidate.ballotNumber}
                      size="lg"
                    />

                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-slate-400 tabular-nums">
                            Ballot #0{candidate.ballotNumber}
                          </span>
                          <input
                            id={`candidate-radio-${candidate.id}`}
                            type="radio"
                            name="candidate"
                            value={candidate.id}
                            checked={isSelected}
                            onChange={() => {
                              setSelectedCandidateId(candidate.id);
                              if (feedback?.type === 'error') {
                                setFeedback(null);
                              }
                            }}
                            className="h-4 w-4 accent-indigo-500 cursor-pointer"
                          />
                        </div>
                        <p className="mt-2 font-[Outfit] text-xl font-semibold tracking-tight text-white">
                          {candidate.name}
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-400 line-clamp-2">
                          {candidate.manifestoText?.trim()
                            ? candidate.manifestoText.trim()
                            : `Official ballot candidate #${candidate.ballotNumber}.`}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-xs font-medium">
                        <span className={isSelected ? 'text-indigo-300' : 'text-slate-400'}>
                          {isSelected ? 'Selected on ballot' : 'Select candidate'}
                        </span>
                        {hasManifesto && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveManifesto(candidate);
                            }}
                            className="inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200 cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Manifesto</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        {/* Submit Action */}
        <div className="flex flex-col gap-3 border-t border-slate-800/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            Votes are final once confirmed and cannot be modified.
          </p>
          <button
            type="submit"
            disabled={candidates.length === 0}
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/60 transition-all duration-150 hover:from-indigo-500 hover:to-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060914] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Review &amp; Submit Vote
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {isConfirmOpen && selectedCandidate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-ballot-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-700/80 bg-[#0B1120] p-6 shadow-2xl">
            <h2 id="confirm-ballot-title" className="font-[Outfit] text-xl font-bold text-white">
              Confirm Your Ballot
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Please verify your Voter ID and selected candidate. Once submitted, this ballot cannot be changed.
            </p>

            <dl className="mt-5 divide-y divide-slate-800 rounded-lg border border-slate-800 bg-[#060914]">
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <dt className="text-slate-400">Voter ID</dt>
                <dd className="font-mono font-medium text-white tabular-nums">{voterId.trim()}</dd>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <dt className="text-slate-400">Candidate</dt>
                <dd className="font-[Outfit] font-semibold text-indigo-300">{selectedCandidate.name}</dd>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <dt className="text-slate-400">Ballot Choice</dt>
                <dd className="font-mono text-slate-200 tabular-nums">#{selectedCandidate.ballotNumber}</dd>
              </div>
            </dl>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsConfirmOpen(false)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmVote}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-indigo-500 hover:to-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                <span>{isSubmitting ? 'Submitting...' : 'Confirm Vote'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ManifestoModal candidate={activeManifesto} onClose={() => setActiveManifesto(null)} />
    </div>
  );
}
