import { Download, FileText, X } from 'lucide-react';
import type { CandidateInfo } from '../types/election';
import { CandidatePortrait } from './CandidatePortrait';

interface ManifestoModalProps {
  candidate: CandidateInfo | null;
  onClose: () => void;
}

export function ManifestoModal({ candidate, onClose }: ManifestoModalProps) {
  if (!candidate) return null;

  const hasText = Boolean(candidate.manifestoText && candidate.manifestoText.trim().length > 0);
  const hasFile = Boolean(candidate.manifestoUrl);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manifesto-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-[#0B1120] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-6">
          <div className="flex items-center gap-4">
            <CandidatePortrait
              name={candidate.name}
              photoUrl={candidate.photoUrl}
              ballotNumber={candidate.ballotNumber}
              size="sm"
            />
            <div>
              <p className="font-mono text-xs text-indigo-300 tabular-nums">
                Ballot #0{candidate.ballotNumber} · Candidate Manifesto
              </p>
              <h2 id="manifesto-dialog-title" className="mt-1 font-[Outfit] text-xl font-bold text-white">
                {candidate.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close manifesto dialog"
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {hasText ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
              {candidate.manifestoText}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-800 bg-[#060914] p-6 text-center text-sm text-slate-400">
              No written manifesto text has been published for this candidate yet.
            </div>
          )}

          {hasFile && candidate.manifestoUrl && (
            <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-[#060914] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 shrink-0 text-indigo-400" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">Uploaded Manifesto Document</p>
                  <p className="truncate font-mono text-xs text-slate-200">
                    {candidate.manifestoOriginalName || 'manifesto-document'}
                  </p>
                </div>
              </div>
              <a
                href={candidate.manifestoUrl}
                download={candidate.manifestoOriginalName || true}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-3.5 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/25 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Download Manifesto</span>
              </a>
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
