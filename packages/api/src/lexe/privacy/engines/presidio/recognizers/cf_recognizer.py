"""
Italian Codice Fiscale recognizer for Microsoft Presidio.

This recognizer uses Presidio's PatternRecognizer with custom validation
to detect and validate Italian fiscal codes.
"""

from typing import List, Optional
from presidio_analyzer import Pattern, PatternRecognizer


class ItalianCFRecognizer(PatternRecognizer):
    """
    Presidio recognizer for Italian Codice Fiscale with checksum validation.

    Format: RSSMRA85T10A562S (16 characters)
    - 6 letters: Surname (3) + Name (3)
    - 2 digits: Year of birth
    - 1 letter: Month of birth
    - 2 digits: Day of birth (+ 40 for females)
    - 4 characters: Municipality code
    - 1 letter: Checksum

    Example:
        from presidio_analyzer import AnalyzerEngine

        analyzer = AnalyzerEngine()
        analyzer.registry.add_recognizer(ItalianCFRecognizer())

        results = analyzer.analyze(
            text="Mario Rossi, CF: RSSMRA85T10A562S",
            language="it"
        )
    """

    # Checksum tables (same as spaCy version)
    ODD_MAP = {
        '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
        'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
        'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
        'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
    }

    EVEN_MAP = {
        '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
        'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
        'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18,
        'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
    }

    CHECKSUM_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

    # Regex patterns for CF detection
    PATTERNS = [
        Pattern(
            name="cf_pattern",
            regex=r"\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b",
            score=0.9  # High score, will be adjusted by validation
        ),
    ]

    # Context keywords that indicate CF
    CONTEXT = [
        "codice fiscale",
        "c.f.",
        "cf",
        "nato a",
        "nata a",
        "residente in",
        "domiciliato in",
    ]

    def __init__(self):
        """Initialize Italian CF recognizer for Presidio."""
        super().__init__(
            supported_entity="CF",
            patterns=self.PATTERNS,
            context=self.CONTEXT,
            supported_language="it",
        )

    def validate_result(self, pattern_text: str) -> Optional[bool]:
        """
        Validate CF checksum.

        This method is called by Presidio after regex match to perform
        additional validation.

        Args:
            pattern_text: Matched CF string

        Returns:
            True if valid, False if invalid, None if validation not applicable
        """
        return self._validate_cf_checksum(pattern_text.upper())

    def _validate_cf_checksum(self, cf: str) -> bool:
        """
        Validate Italian CF checksum algorithm.

        Args:
            cf: Codice Fiscale (16 chars, uppercase)

        Returns:
            True if checksum is valid
        """
        if len(cf) != 16:
            return False

        total = 0

        # Calculate checksum for first 15 characters
        for i, char in enumerate(cf[:15]):
            if i % 2 == 0:  # Odd position (1-indexed)
                total += self.ODD_MAP.get(char, 0)
            else:  # Even position
                total += self.EVEN_MAP.get(char, 0)

        # Calculate expected checksum
        checksum_index = total % 26
        expected_checksum = self.CHECKSUM_LETTERS[checksum_index]

        return cf[15] == expected_checksum
