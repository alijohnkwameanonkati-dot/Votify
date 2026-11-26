import { User } from 'lucide-react';
import { getCandidateInitials } from '../utils/election';

interface CandidatePortraitProps {
  name: string;
  photoUrl: string | null;
  ballotNumber: number;
  size?: 'sm' | 'md' | 'lg';
}

export function CandidatePortrait({ name, photoUrl, ballotNumber, size = 'lg' }: CandidatePortraitProps) {
  const initials = getCandidateInitials(name);

  if (photoUrl) {
    if (size === 'sm') {
      return (
        <img
          src={photoUrl}
          alt={`Photo of ${name}`}
          referrerPolicy="no-referrer"
          className="h-14 w-14 rounded-lg border border-slate-700/80 object-cover shrink-0 bg-[#070B16]"
        />
      );
    }
    if (size === 'md') {
      return (
        <img
          src={photoUrl}
          alt={`Photo of ${name}`}
          referrerPolicy="no-referrer"
          className="h-16 w-16 rounded-xl border border-slate-700/80 object-cover shrink-0 bg-[#070B16]"
        />
      );
    }
    return (
      <div className="aspect-[4/3] w-full overflow-hidden bg-[#070B16] relative">
        <img
          src={photoUrl}
          alt={`Photo of ${name}`}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#0B1120]/80 via-transparent to-transparent"
        />
      </div>
    );
  }

  if (size === 'sm') {
    return (
      <div
        aria-hidden="true"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-gradient-to-br from-[#0F172A] to-[#080D1B] font-[Outfit] text-base font-bold text-indigo-200"
      >
        {initials}
      </div>
    );
  }

  if (size === 'md') {
    return (
      <div
        aria-hidden="true"
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-gradient-to-br from-[#0F172A] to-[#080D1B] font-[Outfit] text-lg font-bold text-indigo-200"
      >
        {initials}
      </div>
    );
  }

  return (
    <div className="aspect-[4/3] w-full bg-gradient-to-br from-[#0E162B] via-[#090F1E] to-[#060914] relative flex flex-col items-center justify-center border-b border-slate-800/70">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-indigo-400/25 bg-[#0B1120]/90 shadow-inner">
        <span className="font-[Outfit] text-2xl font-bold tracking-wide text-indigo-200">
          {initials}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
        <User className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
        <span className="font-mono tabular-nums">No Photo Uploaded · #{ballotNumber}</span>
      </div>
    </div>
  );
}
