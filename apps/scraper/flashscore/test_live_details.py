"""Cached HTML must never reopen a live or completed event for betting."""
import os
import sys
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from flashscore import matches
from flashscore.fetch import FlashscoreUpstreamError
import unittest


def assert_live_core_overrides_scheduled_html(bucket, stage, expected):
    page = {"sport_id": 1, "common_feed": [{"DA": 1, "DB": 1, "DC": "1792166400"}]}
    live = {"DA": str(bucket), "DB": str(stage), "DC": "1792166400", "DG": "2", "DH": "1"}
    with patch.object(matches, "get_page", return_value="cached"), \
            patch.object(matches.P, "page_environment", return_value=page), \
            patch.object(matches, "_core", return_value=live):
        result = matches.get_details("2ga2mkwo")
    assert result["status"] == expected
    assert result["home_score"] == 2
    assert result["away_score"] == 1


def test_missing_live_core_fails_instead_of_using_scheduled_html():
    page = {"sport_id": 1, "common_feed": [{"DA": 1, "DC": "1792166400"}]}
    with patch.object(matches, "get_page", return_value="cached"), \
            patch.object(matches.P, "page_environment", return_value=page), \
            patch.object(matches, "_core", return_value={}):
        with unittest.TestCase().assertRaises(FlashscoreUpstreamError):
            matches.get_details("2ga2mkwo")


class LiveDetailsTests(unittest.TestCase):
    def test_live_core_overrides_cached_html(self):
        for case in [(2, 13, "live"), (3, 3, "finished")]:
            with self.subTest(status=case[2]):
                assert_live_core_overrides_scheduled_html(*case)

    def test_missing_core_fails_closed(self):
        test_missing_live_core_fails_instead_of_using_scheduled_html()


if __name__ == "__main__":
    unittest.main()
