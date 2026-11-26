import tempfile
import unittest
from pathlib import Path

from python_app.votexa_bridge import (
    ORIGINAL_SCRIPT_PATH,
    add_candidate,
    cast_vote,
    change_admin_password,
    compute_winner_info,
    get_election_info,
    get_results,
    load_admin_password_from_original,
    remove_candidate,
    update_candidate,
    verify_admin,
)


class VotifyBridgeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_votify.db"

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_original_script_preserved_and_password_parsed(self) -> None:
        source = ORIGINAL_SCRIPT_PATH.read_text(encoding="utf-8")
        self.assertIn('ADMIN_PASSWORD = "999"', source)
        self.assertIn('print("WELCOME TO VOTIFY\\nEvery Voice Matters, Every Vote Counts.")', source)
        self.assertEqual(load_admin_password_from_original(), "999")

    def test_empty_voter_id_rejected(self) -> None:
        res1 = cast_vote("", "1", self.db_path)
        res2 = cast_vote("   ", "2", self.db_path)
        self.assertFalse(res1["ok"])
        self.assertEqual(res1["code"], "EMPTY_VOTER_ID")
        self.assertFalse(res2["ok"])
        self.assertEqual(res2["code"], "EMPTY_VOTER_ID")

    def test_invalid_candidate_rejected(self) -> None:
        res = cast_vote("VTF-001", "99", self.db_path)
        self.assertFalse(res["ok"])
        self.assertEqual(res["code"], "INVALID_COMMAND")

    def test_one_vote_per_voter_id_with_trim(self) -> None:
        first = cast_vote("  VTF-101  ", "1", self.db_path)
        self.assertTrue(first["ok"])
        self.assertEqual(first["message"], "VOTED SUCCESSFULLY")

        duplicate = cast_vote("VTF-101", "2", self.db_path)
        self.assertFalse(duplicate["ok"])
        self.assertEqual(duplicate["code"], "ALREADY_VOTED")

        results = get_results(self.db_path)
        self.assertEqual(results["totalVotes"], 1)
        self.assertEqual(results["candidates"][0]["votes"], 1)

    def test_add_update_and_remove_candidate_with_photo_and_manifesto(self) -> None:
        added = add_candidate(
            name="AMA MENSAH",
            manifesto_text="Transparent digital governance and fair representation.",
            photo_filename="photo_ama.png",
            manifesto_filename="manifesto_ama.pdf",
            manifesto_original_name="ama_manifesto.pdf",
            db_path=self.db_path,
        )
        self.assertTrue(added["ok"])
        cid = added["candidate"]["id"]
        self.assertEqual(added["candidate"]["photoUrl"], "/api/uploads/photos/photo_ama.png")
        self.assertEqual(added["candidate"]["manifestoUrl"], "/api/uploads/manifestos/manifesto_ama.pdf")

        vote_res = cast_vote("VTF-200", cid, self.db_path)
        self.assertTrue(vote_res["ok"])

        updated = update_candidate(
            candidate_id=cid,
            manifesto_text="Updated manifesto pledge.",
            db_path=self.db_path,
        )
        self.assertTrue(updated["ok"])
        self.assertEqual(updated["candidate"]["manifestoText"], "Updated manifesto pledge.")

        removed = remove_candidate(cid, self.db_path)
        self.assertTrue(removed["ok"])
        self.assertIn("photos/photo_ama.png", removed["removedFiles"])
        self.assertIn("manifestos/manifesto_ama.pdf", removed["removedFiles"])

        info = get_election_info(self.db_path)
        self.assertEqual(len(info["candidates"]), 3)
        self.assertFalse(any(c["id"] == cid for c in info["candidates"]))

    def test_winner_no_votes_tie_and_single_winner(self) -> None:
        no_votes = compute_winner_info([("JOHN ALI", 0), ("ASAAH YINEBISA", 0)])
        self.assertEqual(no_votes["status"], "no_votes")

        tie = compute_winner_info([("JOHN ALI", 2), ("ASAAH YINEBISA", 2), ("JOE-EDDIE", 1)])
        self.assertEqual(tie["status"], "tie")
        self.assertEqual(tie["winners"], ["JOHN ALI", "ASAAH YINEBISA"])

        winner = compute_winner_info([("JOHN ALI", 1), ("ASAAH YINEBISA", 3), ("JOE-EDDIE", 2)])
        self.assertEqual(winner["status"], "winner")
        self.assertEqual(winner["winners"], ["ASAAH YINEBISA"])

    def test_admin_password_verification_and_change(self) -> None:
        self.assertFalse(verify_admin("wrong", self.db_path)["ok"])
        self.assertTrue(verify_admin("999", self.db_path)["ok"])

        bad_current = change_admin_password("wrong", "newpass123", self.db_path)
        self.assertFalse(bad_current["ok"])
        self.assertEqual(bad_current["code"], "INVALID_CURRENT_PASSWORD")

        weak = change_admin_password("999", "12", self.db_path)
        self.assertFalse(weak["ok"])
        self.assertEqual(weak["code"], "WEAK_PASSWORD")

        changed = change_admin_password("999", "Votify@2026", self.db_path)
        self.assertTrue(changed["ok"])

        self.assertFalse(verify_admin("999", self.db_path)["ok"])
        self.assertTrue(verify_admin("Votify@2026", self.db_path)["ok"])

        results = get_results(self.db_path)
        self.assertEqual(results["passwordSource"], "custom")


if __name__ == "__main__":
    unittest.main()
