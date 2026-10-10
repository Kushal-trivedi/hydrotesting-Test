import pytest
from app.detection.plate_normalizer import IndianPlateNormalizer


def test_clean_standard_plate():
    norm, valid, err = IndianPlateNormalizer.normalize("GJ 01 AB 1234")
    assert valid is True
    assert norm == "GJ01AB1234"


def test_positional_digit_and_letter_fixes():
    # 0J O1 A8 I234 -> GJ 01 AB 1234
    # State: 0 -> O? Actually GJ has G. But if 'GJ O1 AB I234'
    norm, valid, err = IndianPlateNormalizer.normalize("GJ O1 AB I234")
    assert valid is True
    assert norm == "GJ01AB1234"


def test_series_letter_fix():
    # GJ 01 A8 1234 -> 8 in series should be B
    norm, valid, err = IndianPlateNormalizer.normalize("GJ 01 A8 1234")
    assert valid is True
    assert norm == "GJ01AB1234"


def test_last_digits_letter_fixes():
    # GJ06GH34S6 -> S in last 4 should be 5
    norm, valid, err = IndianPlateNormalizer.normalize("GJ 06 GH 34S6")
    assert valid is True
    assert norm == "GJ06GH3456"


def test_invalid_state_code():
    norm, valid, err = IndianPlateNormalizer.normalize("ZZ 01 AB 1234")
    assert valid is False
    assert "state code" in err.lower()
