# VOTIFY — Online Voting Platform

**Every Voice Matters, Every Vote Counts.**

VOTIFY transforms the preserved Python voting application (`python_app/voting_system.py`) into a modern, responsive web application while keeping the original Python source completely untouched.

---

## Architecture & Original Python Preservation

- **Original Python Source (`python_app/voting_system.py`)**: Preserved byte-for-byte without modifying any variables, candidate names, loops, conditions, or password logic.
- **Python Integration Bridge (`python_app/votexa_bridge.py`)**: Because `voting_system.py` is an interactive blocking console loop (`while True:` + `input()` + in-memory `set`), a web server cannot directly invoke it per HTTP request without hanging on `stdin` or losing state between requests. To solve this cleanly without altering `voting_system.py`, `votexa_bridge.py`:
  1. Reads `ADMIN_PASSWORD` directly from `python_app/voting_system.py` via Python's `ast` module (with optional `VOTEXA_ADMIN_PASSWORD` environment override).
  2. Mirrors the exact voter ID trimming (`strip()`), empty ID rejection, one-vote-per-Voter-ID check, vote counting, and winner/tie logic.
  3. Persists dynamic candidate profiles (names, uploaded photos, manifestos), votes, and audit events safely in SQLite (`data/votexa.db`).
- **Express & Vite Server (`server.ts`)**: Exposes `/api/election/info`, `/api/vote`, `/api/admin/login`, `/api/admin/logout`, `/api/admin/results`, `/api/admin/winner`, and protected candidate management endpoints (`/api/admin/candidates`) with magic-byte validated photo (`PNG`/`JPG`/`WEBP`) and manifesto (`PDF`/`TXT`/`MD`) uploads.
- **React + Tailwind Frontend (`src/`)**: Deep midnight-navy interface with Landing, Voting Booth, Admin Login, Admin Dashboard (including Candidate, Photo & Manifesto management), Official Results, and Winner Announcement views.

---

## Running & Testing

### 1. Install Dependencies
```bash
npm install
```
*(Requires Node.js 22+ and Python 3.10+ with built-in `sqlite3`.)*

### 2. Run Unit Tests
```bash
npm test
```
Runs both the TypeScript pure-logic tests (`src/utils/election.test.ts`) and the Python bridge parity tests (`python_app/test_votexa_bridge.py`).

### 3. Run in Development
```bash
npm run dev
```
Starts the Express + Vite server on `http://localhost:3000`.

### 4. Testing Voting, Candidates, Photos & Manifestos
- **Vote**: Open `/vote`, enter a Voter ID (e.g., `VTF-101`), select any candidate (and optionally view their manifesto), and confirm. Re-submitting `VTF-101` is rejected with `YOU HAVE ALREADY VOTED. ONE VOTE PER PERSON.`
- **Admin Dashboard / Candidate Management**: Open `/admin/login` and sign in using `ADMIN_PASSWORD` from `python_app/voting_system.py` (or `VOTEXA_ADMIN_PASSWORD` if configured). From the dashboard, add or remove candidates, upload candidate photos, and publish or upload candidate manifestos.

### 5. Build & Deploy
```bash
npm run build
NODE_ENV=production npm start
```
