"""Canonical, conservative comparison keys for usernames.

Usernames remain displayable as entered (apart from ordinary outer whitespace).
This module only defines the internal lookup/uniqueness key and must never be
used for passwords.
"""

import unicodedata


_PERSIAN_EQUIVALENTS = str.maketrans({
    "\u064a": "\u06cc",  # Arabic Yeh -> Persian Yeh
    "\u0643": "\u06a9",  # Arabic Kaf -> Persian Keheh
})

# These characters are invisible formatting controls, not meaningful username
# characters. The deliberately short, explicit set avoids changing ordinary
# Persian/Dari letters or applying broad case folding.
_IGNORABLE_FORMATTING_CHARACTERS = frozenset({
    "\u00ad",  # soft hyphen
    "\u061c",  # Arabic letter mark
    "\u200b",  # zero-width space
    "\u200c",  # zero-width non-joiner
    "\u200d",  # zero-width joiner
    "\u200e",  # left-to-right mark
    "\u200f",  # right-to-left mark
    "\u2060",  # word joiner
    "\ufeff",  # zero-width no-break space / BOM
    *[chr(codepoint) for codepoint in range(0x202A, 0x202F)],  # bidi embeddings/overrides
    *[chr(codepoint) for codepoint in range(0x2066, 0x206A)],  # bidi isolates
})


def normalize_username(value: str) -> str:
    """Return a stable username comparison key without altering passwords."""
    normalized = unicodedata.normalize("NFKC", value).translate(_PERSIAN_EQUIVALENTS)
    return "".join(character for character in normalized if character not in _IGNORABLE_FORMATTING_CHARACTERS).strip()
