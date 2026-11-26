import type { CandidateInfo, CandidateResult, RoutePath, WinnerInfo } from '../types/election';

export const HERO_CHAMBER_IMAGE = '/src/assets/images/hero_votexa_chamber_1795678636782.jpg';
export const WINNER_TROPHY_IMAGE = '/src/assets/images/trophy_votexa_winner_1795678642907.jpg';

export const DEFAULT_CANDIDATES: CandidateInfo[] = [
  {
    id: '1',
    name: 'JOHN ALI',
    ballotNumber: 1,
    photoUrl: null,
    manifestoText: '',
    manifestoUrl: null,
  },
  {
    id: '2',
    name: 'ASAAH YINEBISA',
    ballotNumber: 2,
    photoUrl: null,
    manifestoText: '',
    manifestoUrl: null,
  },
  {
    id: '3',
    name: 'JOE-EDDIE',
    ballotNumber: 3,
    photoUrl: null,
    manifestoText: '',
    manifestoUrl: null,
  },
];

export function normalizeVoterId(raw: string): string {
  return raw.trim();
}

export function getCandidateInitials(name: string): string {
  const words = name
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function validateVoteSelection(
  rawVoterId: string,
  candidateId: string,
  validCandidateIds?: string[],
): { valid: true; voterId: string; candidateId: string } | { valid: false; message: string } {
  const voterId = normalizeVoterId(rawVoterId);
  if (voterId === '') {
    return { valid: false, message: 'Voter ID cannot be empty.' };
  }
  const trimmedCandidateId = candidateId.trim();
  const allowed = validCandidateIds ?? ['1', '2', '3'];
  if (!trimmedCandidateId || !allowed.includes(trimmedCandidateId)) {
    return { valid: false, message: 'Please select a valid candidate before continuing.' };
  }
  return { valid: true, voterId, candidateId: trimmedCandidateId };
}

export function formatVoteCount(count: number): string {
  return count === 1 ? '1 vote' : `${count.toLocaleString()} votes`;
}

export function formatPercentage(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export function sortCandidatesByVotes(candidates: CandidateResult[]): CandidateResult[] {
  return [...candidates].sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return a.ballotNumber - b.ballotNumber;
  });
}

export function getWinnerHeadline(winnerInfo: WinnerInfo): string {
  if (winnerInfo.status === 'no_votes') {
    return 'No Votes Recorded Yet';
  }
  if (winnerInfo.status === 'tie') {
    return "It's a Tie";
  }
  return winnerInfo.winners[0] || 'Winner';
}

export function parseRoutePath(pathname: string): RoutePath {
  switch (pathname) {
    case '/vote':
      return '/vote';
    case '/admin/login':
      return '/admin/login';
    case '/admin':
      return '/admin';
    case '/admin/results':
    case '/results':
      return '/admin/results';
    case '/admin/winner':
    case '/winner':
      return '/admin/winner';
    default:
      return '/';
  }
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
