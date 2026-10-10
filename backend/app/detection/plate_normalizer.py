import re
from typing import Tuple, Optional

# Valid Indian State and Union Territory codes
VALID_INDIAN_STATE_CODES = {
    "AN", "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN", "GA",
    "GJ", "HP", "HR", "JH", "JK", "KA", "KL", "LA", "LD", "MH", "ML",
    "MN", "MP", "MZ", "NL", "OD", "PB", "PY", "RJ", "SK", "TN", "TR",
    "TS", "UK", "UP", "WB", "BH"  # BH = Bharat series
}

# OCR character confusion mappings
CHAR_TO_DIGIT = {
    "O": "0", "o": "0", "D": "0", "Q": "0",
    "I": "1", "i": "1", "l": "1", "L": "1", "|": "1",
    "Z": "2", "z": "2",
    "E": "3",
    "A": "4",
    "S": "5", "s": "5",
    "G": "6", "b": "6",
    "T": "7", "J": "7",
    "B": "8",
    "g": "9", "q": "9"
}

CHAR_TO_LETTER = {
    "0": "D",
    "1": "I",
    "2": "Z",
    "4": "A",
    "5": "S",
    "6": "G",
    "7": "T",
    "8": "B"
}

# Standard noise tokens in camera/web scans that are not license numbers
NOISE_WORDS = {
    "IND", "INDIA", "IN", "DECCAN", "HERALD", "AMAZON", "GOOGLE", "VISIT",
    "FLIPKART", "SEARCH", "HTTP", "HTTPS", "WWW", "COM", "GOV", "PLATE",
    "VEHICLE", "CONFIRM", "CHECK", "READ", "WE", "WEREAD", "HIGH", "CONFIDENCE",
    "OTHER", "GUESSES", "FRAMES", "AMAZONIN"
}


class IndianPlateNormalizer:
    """
    Normalizes and validates Indian vehicle registration numbers (SS DD LL NNNN).
    Corrects common OCR character confusions based on character position.
    Strips HSRP country prefixes (IND / INDIA) and discards camera/web noise tokens.
    """

    @classmethod
    def clean_text(cls, raw_text: str) -> str:
        """Removes spaces, punctuation, special symbols, and converts to uppercase."""
        if not raw_text:
            return ""
        cleaned = re.sub(r"[^A-Za-z0-9]", "", raw_text).upper()
        # Strip HSRP international country badge if attached
        if cleaned.startswith("IND") and len(cleaned) >= 11:
            cleaned = cleaned[3:]
        elif cleaned.startswith("INDIA") and len(cleaned) >= 13:
            cleaned = cleaned[5:]
        return cleaned

    @classmethod
    def normalize(cls, raw_text: str) -> Tuple[str, bool, Optional[str]]:
        """
        Normalizes raw OCR text into standard Indian license plate format.
        
        Returns:
            (normalized_plate, is_valid, error_reason)
        """
        cleaned = cls.clean_text(raw_text)
        if not cleaned:
            return "", False, "Empty plate text"

        if cleaned in NOISE_WORDS:
            return cleaned, False, "Known noise token (not a registration plate)"

        # Check standard Indian plate length: usually 8 to 11 characters
        # e.g., GJ01AB1234 (10 chars), DL1C1234 (8 chars), GJ1AB1234 (9 chars)
        if len(cleaned) < 8 or len(cleaned) > 12:
            return cleaned, False, f"Invalid plate length ({len(cleaned)} chars)"

        chars = list(cleaned)

        # 1. Position 1 & 2: State letters (Expect letters)
        if len(chars) >= 2:
            chars[0] = CHAR_TO_LETTER.get(chars[0], chars[0])
            chars[1] = CHAR_TO_LETTER.get(chars[1], chars[1])

        state_code = "".join(chars[:2])
        if state_code not in VALID_INDIAN_STATE_CODES:
            # Common state OCR fixes
            if chars[0] in ["6", "C"] and chars[1] == "J":
                chars[0] = "G"
                state_code = "GJ"
            elif chars[0] in ["T", "W", "N"] and chars[1] == "H":
                chars[0] = "M"
                state_code = "MH"
            elif chars[0] == "U" and chars[1] in ["R", "0", "O"]:
                chars[1] = "P"
                state_code = "UP"
            elif chars[0] in ["0", "D", "Q"] and chars[1] in ["I", "1", "L"]:
                chars[0], chars[1] = "D", "L"
                state_code = "DL"

        # 2. Last 4 characters: Registration digits (Expect digits)
        last_digits_len = 4
        if len(chars) >= 4:
            for i in range(len(chars) - last_digits_len, len(chars)):
                chars[i] = CHAR_TO_DIGIT.get(chars[i], chars[i])

        # 3. Middle section: district code (1-2 digits) + series code (1-3 letters)
        middle = chars[2 : len(chars) - last_digits_len]
        if len(middle) == 2:
            # 1 digit district + 1 letter series OR 2 digit district
            middle[0] = CHAR_TO_DIGIT.get(middle[0], middle[0])
            middle[1] = CHAR_TO_LETTER.get(middle[1], middle[1])
        elif len(middle) == 3:
            # 2 digits + 1 letter (e.g. 01A) or 1 digit + 2 letters (e.g. 1AB)
            middle[0] = CHAR_TO_DIGIT.get(middle[0], middle[0])
            if middle[0].isdigit():
                middle[1] = CHAR_TO_DIGIT.get(middle[1], middle[1])
                middle[2] = CHAR_TO_LETTER.get(middle[2], middle[2])
        elif len(middle) >= 4:
            # 2 digits + 2+ letters (e.g. 27AD)
            middle[0] = CHAR_TO_DIGIT.get(middle[0], middle[0])
            middle[1] = CHAR_TO_DIGIT.get(middle[1], middle[1])
            for m_idx in range(2, len(middle)):
                middle[m_idx] = CHAR_TO_LETTER.get(middle[m_idx], middle[m_idx])

        chars[2 : len(chars) - last_digits_len] = middle

        normalized = "".join(chars)

        # Standard Indian plate regex check:
        # ^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$
        is_format_valid = bool(re.match(r"^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$", normalized))
        has_valid_state = normalized[:2] in VALID_INDIAN_STATE_CODES

        if is_format_valid and has_valid_state:
            return normalized, True, None

        # Fallback check: if plate was 10 chars with trailing screw noise (e.g. 02071 -> 0207)
        if not (is_format_valid and has_valid_state) and len(cleaned) == 10:
            alt_norm, alt_valid, _ = cls.normalize(cleaned[:-1])
            if alt_valid:
                return alt_norm, True, None

        if not has_valid_state:
            return normalized, False, f"Unknown Indian state code: {normalized[:2]}"

        return normalized, False, "Failed standard Indian plate syntax"
