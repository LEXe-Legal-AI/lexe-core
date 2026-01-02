"""
Italian Partita IVA recognizer for Microsoft Presidio.
"""

from typing import Optional
from presidio_analyzer import Pattern, PatternRecognizer


class ItalianPIVARecognizer(PatternRecognizer):
    """
    Presidio recognizer for Italian Partita IVA with checksum validation.

    Format: 12345678901 (11 digits)
    """

    PATTERNS = [
        Pattern(
            name="piva_pattern",
            regex=r"\b\d{11}\b",
            score=0.8  # Lower initial score, needs context + validation
        ),
    ]

    CONTEXT = [
        "p.iva",
        "p. iva",
        "partita iva",
        "vat",
        "vat number",
        "p.i.",
    ]

    def __init__(self):
        """Initialize Italian P.IVA recognizer."""
        super().__init__(
            supported_entity="PIVA",
            patterns=self.PATTERNS,
            context=self.CONTEXT,
            supported_language="it",
        )

    def validate_result(self, pattern_text: str) -> Optional[bool]:
        """Validate P.IVA checksum."""
        # Skip if starts with 0
        if pattern_text[0] == '0':
            return False

        return self._validate_piva_checksum(pattern_text)

    def _validate_piva_checksum(self, piva: str) -> bool:
        """
        Validate Italian P.IVA checksum (Luhn variant).

        Args:
            piva: 11-digit VAT number

        Returns:
            True if checksum is valid
        """
        if len(piva) != 11 or not piva.isdigit():
            return False

        digits = [int(d) for d in piva[:10]]
        check_digit = int(piva[10])

        total = 0
        for i, digit in enumerate(digits):
            if i % 2 == 0:  # Odd position
                total += digit
            else:  # Even position
                doubled = digit * 2
                total += doubled - 9 if doubled > 9 else doubled

        expected_check = (10 - (total % 10)) % 10
        return check_digit == expected_check
