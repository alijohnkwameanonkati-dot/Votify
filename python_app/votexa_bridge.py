"""
Non-invasive Python integration bridge for /python_app/voting_system.py.

Preserves voting_system.py completely untouched, parses its ADMIN_PASSWORD
directly via Python's AST module, enforces the exact voter ID verification,
one-vote-per-ID, vote counting, and winner/tie rules from voting_system.py,
and persists candidates (with photos & manifestos) and ballots safely in SQLite.
"""

from __future__ import annotations

import ast
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent
ORIGINAL_SCRIPT_PATH = Path(__file__).resolve().parent / "voting_system.py"
DEFAULT_DB_PATH = BASE_DIR / "data" / "votexa.db"

DEFAULT_SEED_CANDIDATES = (
    ("1", "JOHN ALI", 1),
    ("2", "ASAAH YINEBISA", 2),
    ("3", "JOE-EDDIE", 3),
)


def get_db_path() -> Path:
    env_path = os.environ.get("VOTEXA_DB_PATH", "").strip()
    if env_path:
        return Path(env_path)
    return DEFAULT_DB_PATH


def load_admin_password_from_original() -> str:
    """Read ADMIN_PASSWORD directly from voting_system.py via AST without executing its loop."""
    env_override = os.environ.get("VOTEXA_ADMIN_PASSWORD", "")
    if env_override:
        return env_override

    source = ORIGINAL_SCRIPT_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(ORIGINAL_SCRIPT_PATH))
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "ADMIN_PASSWORD":
                    if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                        return node.value.value
    raise RuntimeError("ADMIN_PASSWORD not found in original voting_system.py")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_connection(db_path: Path | None = None) -> sqlite3.Connection:
    resolved_path = db_path or get_db_path()
    resolved_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(resolved_path), timeout=10.0, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS app_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS candidates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            ballot_number INTEGER NOT NULL UNIQUE,
            photo_filename TEXT,
            manifesto_text TEXT NOT NULL DEFAULT '',
            manifesto_filename TEXT,
            manifesto_original_name TEXT,
            created_at TEXT NOT NULL
        );
        """
    )

    # Check if an older votes table has the hardcoded CHECK (candidate_id IN ('1', '2', '3'))
    votes_table_row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='votes'"
    ).fetchone()
    if votes_table_row is None:
        conn.execute(
            """
            CREATE TABLE votes (
                voter_id TEXT PRIMARY KEY,
                candidate_id TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
    elif "IN ('1', '2', '3')" in (votes_table_row["sql"] or ""):
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute("ALTER TABLE votes RENAME TO votes_legacy;")
        conn.execute(
            """
            CREATE TABLE votes (
                voter_id TEXT PRIMARY KEY,
                candidate_id TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
        conn.execute(
            "INSERT INTO votes (voter_id, candidate_id, created_at) SELECT voter_id, candidate_id, created_at FROM votes_legacy;"
        )
        conn.execute("DROP TABLE votes_legacy;")
        conn.execute("COMMIT;")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            message TEXT NOT NULL,
            candidate_id TEXT,
            created_at TEXT NOT NULL
        );
        """
    )

    # Seed initial candidates once if never seeded
    seeded = conn.execute("SELECT value FROM app_meta WHERE key = 'candidates_seeded'").fetchone()
    if seeded is None:
        ts = now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        for cid, cname, bnum in DEFAULT_SEED_CANDIDATES:
            conn.execute(
                """
                INSERT OR IGNORE INTO candidates (
                    id, name, ballot_number, photo_filename, manifesto_text, manifesto_filename, manifesto_original_name, created_at
                ) VALUES (?, ?, ?, NULL, '', NULL, NULL, ?)
                """,
                (cid, cname, bnum, ts),
            )
        conn.execute(
            "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('candidates_seeded', '1')"
        )
        conn.execute("COMMIT;")

    return conn


def mask_voter_id(voter_id: str) -> str:
    if len(voter_id) <= 2:
        return "*" * len(voter_id)
    return f"{voter_id[0]}{'*' * (len(voter_id) - 2)}{voter_id[-1]}"


def serialize_candidate_row(row: sqlite3.Row) -> dict[str, Any]:
    photo_fn = row["photo_filename"]
    manifesto_fn = row["manifesto_filename"]
    return {
        "id": str(row["id"]),
        "name": str(row["name"]),
        "ballotNumber": int(row["ballot_number"]),
        "photoUrl": f"/api/uploads/photos/{photo_fn}" if photo_fn else None,
        "photoFilename": photo_fn,
        "manifestoText": str(row["manifesto_text"] or ""),
        "manifestoUrl": f"/api/uploads/manifestos/{manifesto_fn}" if manifesto_fn else None,
        "manifestoFilename": manifesto_fn,
        "manifestoOriginalName": row["manifesto_original_name"],
    }


def fetch_candidates(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT id, name, ballot_number, photo_filename, manifesto_text, manifesto_filename, manifesto_original_name
        FROM candidates
        ORDER BY ballot_number ASC
        """
    ).fetchall()
    return [serialize_candidate_row(r) for r in rows]


def get_election_info(db_path: Path | None = None) -> dict[str, Any]:
    conn = get_connection(db_path)
    try:
        candidates = fetch_candidates(conn)
        return {
            "brand": "VOTIFY",
            "tagline": "Every Voice Matters, Every Vote Counts.",
            "status": "Open",
            "candidates": candidates,
            "rules": {
                "oneVotePerVoterId": True,
                "whitespaceTrimmed": True,
                "resultsRestrictedToAdmin": True,
            },
        }
    finally:
        conn.close()


def cast_vote(raw_voter_id: str, raw_candidate_id: str, db_path: Path | None = None) -> dict[str, Any]:
    voter_id = (raw_voter_id or "").strip()
    candidate_chosen = (raw_candidate_id or "").strip()

    conn = get_connection(db_path)
    try:
        conn.execute("BEGIN IMMEDIATE;")
        existing = conn.execute(
            "SELECT voter_id FROM votes WHERE voter_id = ?",
            (voter_id,),
        ).fetchone()

        if existing is not None:
            conn.execute(
                "INSERT INTO activity_log (event_type, message, candidate_id, created_at) VALUES (?, ?, ?, ?)",
                (
                    "duplicate_blocked",
                    f"Duplicate vote blocked for Voter ID {mask_voter_id(voter_id)}",
                    None,
                    now_iso(),
                ),
            )
            conn.execute("COMMIT;")
            return {
                "ok": False,
                "code": "ALREADY_VOTED",
                "message": "YOU HAVE ALREADY VOTED. ONE VOTE PER PERSON.",
                "httpStatus": 409,
            }

        if voter_id == "":
            conn.execute("ROLLBACK;")
            return {
                "ok": False,
                "code": "EMPTY_VOTER_ID",
                "message": "Voter ID cannot be empty.",
                "httpStatus": 400,
            }

        cand_row = conn.execute(
            """
            SELECT id, name, ballot_number, photo_filename, manifesto_text, manifesto_filename, manifesto_original_name
            FROM candidates WHERE id = ?
            """,
            (candidate_chosen,),
        ).fetchone()

        if cand_row is None:
            conn.execute("ROLLBACK;")
            return {
                "ok": False,
                "code": "INVALID_COMMAND",
                "message": "Invalid Command",
                "httpStatus": 400,
            }

        ts = now_iso()
        conn.execute(
            "INSERT INTO votes (voter_id, candidate_id, created_at) VALUES (?, ?, ?)",
            (voter_id, candidate_chosen, ts),
        )
        candidate = serialize_candidate_row(cand_row)
        conn.execute(
            "INSERT INTO activity_log (event_type, message, candidate_id, created_at) VALUES (?, ?, ?, ?)",
            (
                "vote_cast",
                f"Verified ballot recorded for {candidate['name']} (ID {mask_voter_id(voter_id)})",
                candidate_chosen,
                ts,
            ),
        )
        conn.execute("COMMIT;")
        return {
            "ok": True,
            "code": "VOTED_SUCCESSFULLY",
            "message": "VOTED SUCCESSFULLY",
            "candidate": candidate,
            "voterId": voter_id,
            "timestamp": ts,
            "httpStatus": 200,
        }
    except sqlite3.IntegrityError:
        conn.execute("ROLLBACK;")
        return {
            "ok": False,
            "code": "ALREADY_VOTED",
            "message": "YOU HAVE ALREADY VOTED. ONE VOTE PER PERSON.",
            "httpStatus": 409,
        }
    finally:
        conn.close()


def add_candidate(
    name: str,
    manifesto_text: str = "",
    photo_filename: str | None = None,
    manifesto_filename: str | None = None,
    manifesto_original_name: str | None = None,
    db_path: Path | None = None,
) -> dict[str, Any]:
    clean_name = (name or "").strip()
    if not clean_name:
        return {
            "ok": False,
            "code": "INVALID_NAME",
            "message": "Candidate name cannot be empty.",
            "httpStatus": 400,
        }

    conn = get_connection(db_path)
    try:
        conn.execute("BEGIN IMMEDIATE;")
        dup = conn.execute(
            "SELECT id FROM candidates WHERE LOWER(name) = LOWER(?)",
            (clean_name,),
        ).fetchone()
        if dup is not None:
            conn.execute("ROLLBACK;")
            return {
                "ok": False,
                "code": "DUPLICATE_CANDIDATE",
                "message": "A candidate with this name is already on the ballot.",
                "httpStatus": 409,
            }

        max_num_row = conn.execute("SELECT COALESCE(MAX(ballot_number), 0) AS max_num FROM candidates").fetchone()
        next_ballot = int(max_num_row["max_num"]) + 1

        # Pick next unused numeric string ID
        existing_ids = {
            str(r["id"]) for r in conn.execute("SELECT id FROM candidates").fetchall()
        }
        next_id_int = max([int(i) for i in existing_ids if i.isdigit()] + [0]) + 1
        next_id = str(next_id_int)

        ts = now_iso()
        conn.execute(
            """
            INSERT INTO candidates (
                id, name, ballot_number, photo_filename, manifesto_text, manifesto_filename, manifesto_original_name, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                next_id,
                clean_name,
                next_ballot,
                photo_filename,
                (manifesto_text or "").strip(),
                manifesto_filename,
                manifesto_original_name,
                ts,
            ),
        )
        conn.execute(
            "INSERT INTO activity_log (event_type, message, candidate_id, created_at) VALUES (?, ?, ?, ?)",
            ("candidate_added", f"Candidate added to ballot: {clean_name}", next_id, ts),
        )
        row = conn.execute(
            """
            SELECT id, name, ballot_number, photo_filename, manifesto_text, manifesto_filename, manifesto_original_name
            FROM candidates WHERE id = ?
            """,
            (next_id,),
        ).fetchone()
        conn.execute("COMMIT;")
        return {
            "ok": True,
            "candidate": serialize_candidate_row(row),
            "httpStatus": 201,
        }
    finally:
        conn.close()


def update_candidate(
    candidate_id: str,
    name: str | None = None,
    manifesto_text: str | None = None,
    photo_filename: str | None = None,
    clear_photo: bool = False,
    manifesto_filename: str | None = None,
    manifesto_original_name: str | None = None,
    clear_manifesto_file: bool = False,
    db_path: Path | None = None,
) -> dict[str, Any]:
    cid = (candidate_id or "").strip()
    conn = get_connection(db_path)
    try:
        conn.execute("BEGIN IMMEDIATE;")
        existing = conn.execute(
            """
            SELECT id, name, ballot_number, photo_filename, manifesto_text, manifesto_filename, manifesto_original_name
            FROM candidates WHERE id = ?
            """,
            (cid,),
        ).fetchone()
        if existing is None:
            conn.execute("ROLLBACK;")
            return {
                "ok": False,
                "code": "NOT_FOUND",
                "message": "Candidate not found.",
                "httpStatus": 404,
            }

        new_name = existing["name"] if name is None else name.strip()
        if not new_name:
            conn.execute("ROLLBACK;")
            return {
                "ok": False,
                "code": "INVALID_NAME",
                "message": "Candidate name cannot be empty.",
                "httpStatus": 400,
            }

        dup = conn.execute(
            "SELECT id FROM candidates WHERE LOWER(name) = LOWER(?) AND id != ?",
            (new_name, cid),
        ).fetchone()
        if dup is not None:
            conn.execute("ROLLBACK;")
            return {
                "ok": False,
                "code": "DUPLICATE_CANDIDATE",
                "message": "Another candidate already uses this name.",
                "httpStatus": 409,
            }

        removed_files: list[str] = []
        if clear_photo:
            if existing["photo_filename"]:
                removed_files.append(f"photos/{existing['photo_filename']}")
            new_photo = None
        elif photo_filename is not None:
            if existing["photo_filename"] and existing["photo_filename"] != photo_filename:
                removed_files.append(f"photos/{existing['photo_filename']}")
            new_photo = photo_filename
        else:
            new_photo = existing["photo_filename"]

        if clear_manifesto_file:
            if existing["manifesto_filename"]:
                removed_files.append(f"manifestos/{existing['manifesto_filename']}")
            new_mfile = None
            new_morig = None
        elif manifesto_filename is not None:
            if existing["manifesto_filename"] and existing["manifesto_filename"] != manifesto_filename:
                removed_files.append(f"manifestos/{existing['manifesto_filename']}")
            new_mfile = manifesto_filename
            new_morig = manifesto_original_name
        else:
            new_mfile = existing["manifesto_filename"]
            new_morig = existing["manifesto_original_name"]

        new_mtext = existing["manifesto_text"] if manifesto_text is None else manifesto_text.strip()

        conn.execute(
            """
            UPDATE candidates
            SET name = ?, photo_filename = ?, manifesto_text = ?, manifesto_filename = ?, manifesto_original_name = ?
            WHERE id = ?
            """,
            (new_name, new_photo, new_mtext, new_mfile, new_morig, cid),
        )
        conn.execute(
            "INSERT INTO activity_log (event_type, message, candidate_id, created_at) VALUES (?, ?, ?, ?)",
            ("candidate_updated", f"Updated profile & manifesto for {new_name}", cid, now_iso()),
        )
        updated = conn.execute(
            """
            SELECT id, name, ballot_number, photo_filename, manifesto_text, manifesto_filename, manifesto_original_name
            FROM candidates WHERE id = ?
            """,
            (cid,),
        ).fetchone()
        conn.execute("COMMIT;")
        return {
            "ok": True,
            "candidate": serialize_candidate_row(updated),
            "removedFiles": removed_files,
            "httpStatus": 200,
        }
    finally:
        conn.close()


def remove_candidate(candidate_id: str, db_path: Path | None = None) -> dict[str, Any]:
    cid = (candidate_id or "").strip()
    conn = get_connection(db_path)
    try:
        conn.execute("BEGIN IMMEDIATE;")
        existing = conn.execute(
            "SELECT id, name, photo_filename, manifesto_filename FROM candidates WHERE id = ?",
            (cid,),
        ).fetchone()
        if existing is None:
            conn.execute("ROLLBACK;")
            return {
                "ok": False,
                "code": "NOT_FOUND",
                "message": "Candidate not found.",
                "httpStatus": 404,
            }

        removed_files: list[str] = []
        if existing["photo_filename"]:
            removed_files.append(f"photos/{existing['photo_filename']}")
        if existing["manifesto_filename"]:
            removed_files.append(f"manifestos/{existing['manifesto_filename']}")

        conn.execute("DELETE FROM votes WHERE candidate_id = ?", (cid,))
        conn.execute("DELETE FROM candidates WHERE id = ?", (cid,))
        conn.execute(
            "INSERT INTO activity_log (event_type, message, candidate_id, created_at) VALUES (?, ?, ?, ?)",
            ("candidate_removed", f"Candidate removed from ballot: {existing['name']}", cid, now_iso()),
        )
        conn.execute("COMMIT;")
        return {
            "ok": True,
            "removedCandidateName": existing["name"],
            "removedFiles": removed_files,
            "httpStatus": 200,
        }
    finally:
        conn.close()


def hash_password_scrypt(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1, dklen=32)
    return f"scrypt${salt.hex()}${derived.hex()}"


def verify_scrypt_hash(password: str, stored: str) -> bool:
    try:
        scheme, salt_hex, hash_hex = stored.split("$", 2)
        if scheme != "scrypt":
            return False
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
        derived = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1, dklen=len(expected))
        return hmac.compare_digest(derived, expected)
    except Exception:
        return False


def get_password_source(conn: sqlite3.Connection) -> str:
    row = conn.execute("SELECT value FROM app_meta WHERE key = 'admin_password_hash'").fetchone()
    if row is not None and str(row["value"]):
        return "custom"
    if os.environ.get("VOTEXA_ADMIN_PASSWORD", ""):
        return "env"
    return "default"


def check_admin_password_against_store(provided: str, conn: sqlite3.Connection) -> bool:
    row = conn.execute("SELECT value FROM app_meta WHERE key = 'admin_password_hash'").fetchone()
    if row is not None and str(row["value"]):
        return verify_scrypt_hash(provided, str(row["value"]))

    env_override = os.environ.get("VOTEXA_ADMIN_PASSWORD", "")
    if env_override:
        return hmac.compare_digest(provided.encode("utf-8"), env_override.encode("utf-8"))

    expected = load_admin_password_from_original()
    return hmac.compare_digest(provided.encode("utf-8"), expected.encode("utf-8"))


def verify_admin(password: str, db_path: Path | None = None) -> dict[str, Any]:
    provided = password if isinstance(password, str) else ""

    conn = get_connection(db_path)
    try:
        granted = check_admin_password_against_store(provided, conn)
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "INSERT INTO activity_log (event_type, message, candidate_id, created_at) VALUES (?, ?, ?, ?)",
            (
                "admin_login_success" if granted else "admin_login_denied",
                "Administrator session authenticated" if granted else "Administrator login denied",
                None,
                now_iso(),
            ),
        )
        conn.execute("COMMIT;")
    finally:
        conn.close()

    if granted:
        return {"ok": True, "code": "ACCESS_GRANTED", "message": "ACCESS GRANTED", "httpStatus": 200}
    return {"ok": False, "code": "ACCESS_DENIED", "message": "ACCESS DENIED", "httpStatus": 401}


def change_admin_password(
    current_password: str,
    new_password: str,
    db_path: Path | None = None,
) -> dict[str, Any]:
    if not isinstance(new_password, str) or len(new_password) < 4 or not new_password.strip():
        return {
            "ok": False,
            "code": "WEAK_PASSWORD",
            "message": "New password must be at least 4 characters long.",
            "httpStatus": 400,
        }

    conn = get_connection(db_path)
    try:
        if not check_admin_password_against_store(current_password or "", conn):
            return {
                "ok": False,
                "code": "INVALID_CURRENT_PASSWORD",
                "message": "Current password is incorrect.",
                "httpStatus": 401,
            }

        hashed = hash_password_scrypt(new_password)
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('admin_password_hash', ?)",
            (hashed,),
        )
        conn.execute(
            "INSERT INTO activity_log (event_type, message, candidate_id, created_at) VALUES (?, ?, ?, ?)",
            ("admin_password_changed", "Administrator login password updated", None, now_iso()),
        )
        conn.execute("COMMIT;")
        return {
            "ok": True,
            "code": "PASSWORD_UPDATED",
            "message": "Administrator password updated successfully.",
            "httpStatus": 200,
        }
    finally:
        conn.close()


def compute_winner_info(candidate_tallies: list[tuple[str, int]]) -> dict[str, Any]:
    """
    Mirrors choice == '3' from voting_system.py dynamically across active candidates:
      winner = max(counts)
      winners = [name for name, count in candidate_tallies if count == winner]
    """
    if not candidate_tallies:
        return {
            "status": "no_votes",
            "winners": [],
            "topVotes": 0,
            "message": "No votes have been cast yet.",
        }

    winner = max(count for _, count in candidate_tallies)
    if winner == 0:
        return {
            "status": "no_votes",
            "winners": [],
            "topVotes": 0,
            "message": "No votes have been cast yet.",
        }

    winners = [name for name, count in candidate_tallies if count == winner]
    if len(winners) > 1:
        return {
            "status": "tie",
            "winners": winners,
            "topVotes": winner,
            "message": f"IT'S A TIE between: {', '.join(winners)} with {winner} votes each",
        }
    return {
        "status": "winner",
        "winners": winners,
        "topVotes": winner,
        "message": f"THE WINNER OF THIS ELECTION IS {winners[0]} with: {winner} votes",
    }


def get_results(db_path: Path | None = None) -> dict[str, Any]:
    conn = get_connection(db_path)
    try:
        candidates = fetch_candidates(conn)
        rows = conn.execute(
            "SELECT candidate_id, COUNT(*) AS count FROM votes GROUP BY candidate_id"
        ).fetchall()
        counts_by_id = {str(r["candidate_id"]): int(r["count"]) for r in rows}

        total_votes = sum(counts_by_id.get(c["id"], 0) for c in candidates)
        tallies: list[tuple[str, int]] = []
        candidates_breakdown = []

        for c in candidates:
            votes_for_candidate = counts_by_id.get(c["id"], 0)
            tallies.append((c["name"], votes_for_candidate))
            pct = round((votes_for_candidate / total_votes) * 100, 1) if total_votes > 0 else 0.0
            candidates_breakdown.append(
                {
                    **c,
                    "votes": votes_for_candidate,
                    "percentage": pct,
                }
            )

        activity_rows = conn.execute(
            "SELECT id, event_type, message, candidate_id, created_at FROM activity_log ORDER BY id DESC LIMIT 15"
        ).fetchall()
        recent_activity = [
            {
                "id": int(r["id"]),
                "eventType": r["event_type"],
                "message": r["message"],
                "candidateId": r["candidate_id"],
                "createdAt": r["created_at"],
            }
            for r in activity_rows
        ]

        winner_info = compute_winner_info(tallies)
        password_source = get_password_source(conn)
        return {
            "ok": True,
            "electionStatus": "Open",
            "passwordSource": password_source,
            "totalVotes": total_votes,
            "uniqueVoters": total_votes,
            "candidates": candidates_breakdown,
            "winnerInfo": winner_info,
            "recentActivity": recent_activity,
        }
    finally:
        conn.close()


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "message": "Missing action"}))
        return 1

    action = sys.argv[1]
    raw_input = sys.stdin.read().strip()
    payload: dict[str, Any] = json.loads(raw_input) if raw_input else {}

    if action == "info":
        result = get_election_info()
    elif action == "vote":
        result = cast_vote(
            str(payload.get("voterId", "")),
            str(payload.get("candidateId", "")),
        )
    elif action == "verify_admin":
        result = verify_admin(str(payload.get("password", "")))
    elif action == "results":
        result = get_results()
    elif action == "winner":
        res = get_results()
        result = {
            "ok": True,
            "totalVotes": res["totalVotes"],
            "candidates": res["candidates"],
            "winnerInfo": res["winnerInfo"],
        }
    elif action == "add_candidate":
        result = add_candidate(
            name=str(payload.get("name", "")),
            manifesto_text=str(payload.get("manifestoText", "")),
            photo_filename=payload.get("photoFilename"),
            manifesto_filename=payload.get("manifestoFilename"),
            manifesto_original_name=payload.get("manifestoOriginalName"),
        )
    elif action == "update_candidate":
        result = update_candidate(
            candidate_id=str(payload.get("candidateId", "")),
            name=payload.get("name"),
            manifesto_text=payload.get("manifestoText"),
            photo_filename=payload.get("photoFilename"),
            clear_photo=bool(payload.get("clearPhoto", False)),
            manifesto_filename=payload.get("manifestoFilename"),
            manifesto_original_name=payload.get("manifestoOriginalName"),
            clear_manifesto_file=bool(payload.get("clearManifestoFile", False)),
        )
    elif action == "remove_candidate":
        result = remove_candidate(candidate_id=str(payload.get("candidateId", "")))
    elif action == "change_admin_password":
        result = change_admin_password(
            current_password=str(payload.get("currentPassword", "")),
            new_password=str(payload.get("newPassword", "")),
        )
    else:
        result = {"ok": False, "message": "Unknown action"}
        print(json.dumps(result))
        return 1

    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
