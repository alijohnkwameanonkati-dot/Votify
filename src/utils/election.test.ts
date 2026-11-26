import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatPercentage,
  formatVoteCount,
  getCandidateInitials,
  getWinnerHeadline,
  normalizeVoterId,
  parseRoutePath,
  sortCandidatesByVotes,
  validateVoteSelection,
} from './election';

test('normalizeVoterId trims leading and trailing whitespace like Python strip()', () => {
  assert.equal(normalizeVoterId('  VTF-104  '), 'VTF-104');
  assert.equal(normalizeVoterId('   '), '');
});

test('getCandidateInitials builds clean initials for multi-word and hyphenated names', () => {
  assert.equal(getCandidateInitials('JOHN ALI'), 'JA');
  assert.equal(getCandidateInitials('JOE-EDDIE'), 'JE');
  assert.equal(getCandidateInitials('ASAAH'), 'AS');
});

test('validateVoteSelection rejects empty voter IDs and checks dynamic candidate IDs', () => {
  const emptyRes = validateVoteSelection('   ', '1', ['1', '2', '3']);
  assert.equal(emptyRes.valid, false);
  if (!emptyRes.valid) {
    assert.equal(emptyRes.message, 'Voter ID cannot be empty.');
  }

  const badCandidate = validateVoteSelection('VTF-101', '9', ['1', '2', '3']);
  assert.equal(badCandidate.valid, false);

  const dynamicCandidate = validateVoteSelection(' VTF-101 ', '4', ['1', '2', '4']);
  assert.deepEqual(dynamicCandidate, { valid: true, voterId: 'VTF-101', candidateId: '4' });
});

test('formatVoteCount and formatPercentage format singular/plural and decimals cleanly', () => {
  assert.equal(formatVoteCount(0), '0 votes');
  assert.equal(formatVoteCount(1), '1 vote');
  assert.equal(formatVoteCount(12), '12 votes');
  assert.equal(formatPercentage(50), '50.0%');
  assert.equal(formatPercentage(33.3), '33.3%');
});

test('sortCandidatesByVotes sorts descending by votes and preserves ballot order on ties', () => {
  const sorted = sortCandidatesByVotes([
    { id: '1', name: 'JOHN ALI', ballotNumber: 1, votes: 2, percentage: 40, photoUrl: null, manifestoText: '', manifestoUrl: null },
    { id: '2', name: 'ASAAH YINEBISA', ballotNumber: 2, votes: 2, percentage: 40, photoUrl: null, manifestoText: '', manifestoUrl: null },
    { id: '3', name: 'JOE-EDDIE', ballotNumber: 3, votes: 1, percentage: 20, photoUrl: null, manifestoText: '', manifestoUrl: null },
  ]);
  assert.deepEqual(
    sorted.map((c) => c.id),
    ['1', '2', '3'],
  );
});

test('getWinnerHeadline handles no_votes, tie, and winner states', () => {
  assert.equal(
    getWinnerHeadline({ status: 'no_votes', winners: [], topVotes: 0, message: 'No votes have been cast yet.' }),
    'No Votes Recorded Yet',
  );
  assert.equal(
    getWinnerHeadline({ status: 'tie', winners: ['JOHN ALI', 'JOE-EDDIE'], topVotes: 3, message: 'Tie' }),
    "It's a Tie",
  );
  assert.equal(
    getWinnerHeadline({ status: 'winner', winners: ['ASAAH YINEBISA'], topVotes: 5, message: 'Winner' }),
    'ASAAH YINEBISA',
  );
});

test('parseRoutePath resolves public and admin routes cleanly', () => {
  assert.equal(parseRoutePath('/'), '/');
  assert.equal(parseRoutePath('/vote'), '/vote');
  assert.equal(parseRoutePath('/admin/login'), '/admin/login');
  assert.equal(parseRoutePath('/admin'), '/admin');
  assert.equal(parseRoutePath('/results'), '/admin/results');
  assert.equal(parseRoutePath('/winner'), '/admin/winner');
});
