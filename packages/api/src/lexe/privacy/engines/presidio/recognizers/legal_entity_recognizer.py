"""
Italian Legal Entity recognizer for Microsoft Presidio.
"""

from typing import List, Optional
from presidio_analyzer import Pattern, PatternRecognizer


class ItalianLegalEntityRecognizer(PatternRecognizer):
    """
    Presidio recognizer for Italian legal entities (courts, ministries, authorities).
    """

    PATTERNS = [
        # Courts
        Pattern(
            name="tribunale",
            regex=r"\bTribunale\s+di\s+[A-Z][a-z]+\b",
            score=0.9
        ),
        Pattern(
            name="corte_appello",
            regex=r"\bCorte\s+d['''']Appello\s+di\s+[A-Z][a-z]+\b",
            score=0.9
        ),
        Pattern(
            name="corte_cassazione",
            regex=r"\bCorte\s+di\s+Cassazione\b",
            score=0.95
        ),
        Pattern(
            name="tar",
            regex=r"\bTAR\s+[A-Z][a-z]+\b",
            score=0.9
        ),
        Pattern(
            name="consiglio_stato",
            regex=r"\bConsiglio\s+di\s+Stato\b",
            score=0.95
        ),
        # Ministries
        Pattern(
            name="ministero",
            regex=r"\bMinistero\s+dell[ae]\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b",
            score=0.9
        ),
        # Authorities
        Pattern(
            name="agenzia_entrate",
            regex=r"\bAgenzia\s+delle\s+Entrate\b",
            score=0.95
        ),
        Pattern(
            name="inps",
            regex=r"\bINPS\b",
            score=0.9
        ),
        Pattern(
            name="gdf",
            regex=r"\bGuardia\s+di\s+Finanza\b",
            score=0.9
        ),
    ]

    def __init__(self):
        """Initialize Italian legal entity recognizer."""
        super().__init__(
            supported_entity="ORG",  # Map to ORG type
            patterns=self.PATTERNS,
            context=[],  # Patterns are self-contained
            supported_language="it",
        )
