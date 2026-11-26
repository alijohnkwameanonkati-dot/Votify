export type RoutePath =
  | '/'
  | '/vote'
  | '/admin/login'
  | '/admin'
  | '/admin/results'
  | '/admin/winner';

export interface CandidateInfo {
  id: string;
  name: string;
  ballotNumber: number;
  photoUrl: string | null;
  photoFilename?: string | null;
  manifestoText: string;
  manifestoUrl: string | null;
  manifestoFilename?: string | null;
  manifestoOriginalName?: string | null;
}

export interface ElectionInfoResponse {
  brand: string;
  tagline: string;
  status: string;
  candidates: CandidateInfo[];
  rules: {
    oneVotePerVoterId: boolean;
    whitespaceTrimmed: boolean;
    resultsRestrictedToAdmin: boolean;
  };
}

export interface VoteResponse {
  ok: boolean;
  code: 'VOTED_SUCCESSFULLY' | 'ALREADY_VOTED' | 'EMPTY_VOTER_ID' | 'INVALID_COMMAND' | 'INVALID_REQUEST' | 'SERVER_ERROR';
  message: string;
  candidate?: CandidateInfo;
  voterId?: string;
  timestamp?: string;
}

export interface CandidateResult extends CandidateInfo {
  votes: number;
  percentage: number;
}

export interface WinnerInfo {
  status: 'no_votes' | 'tie' | 'winner';
  winners: string[];
  topVotes: number;
  message: string;
}

export interface ActivityEntry {
  id: number;
  eventType: string;
  message: string;
  candidateId: string | null;
  createdAt: string;
}

export interface AdminResultsResponse {
  ok: boolean;
  electionStatus: string;
  passwordSource?: 'env' | 'custom' | 'default';
  totalVotes: number;
  uniqueVoters: number;
  candidates: CandidateResult[];
  winnerInfo: WinnerInfo;
  recentActivity: ActivityEntry[];
}

export interface AdminWinnerResponse {
  ok: boolean;
  totalVotes: number;
  candidates: CandidateResult[];
  winnerInfo: WinnerInfo;
}
