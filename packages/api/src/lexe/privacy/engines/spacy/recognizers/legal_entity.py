"""
Italian Legal Entity recognizer for spaCy.

Recognizes Italian legal entities such as:
- Courts (Tribunale, Corte d'Appello, Corte di Cassazione, TAR)
- Ministries (Ministero della Giustizia, etc.)
- Public authorities (Agenzia delle Entrate, INPS, etc.)
"""

import re
from typing import List, Pattern
from spacy.language import Language
from spacy.tokens import Doc, Span
from spacy.matcher import Matcher


class LegalEntityRecognizer:
    """
    Recognizer for Italian legal entities using pattern matching.
    """

    # Court patterns
    COURT_PATTERNS = [
        [{"LOWER": "tribunale"}, {"LOWER": "di"}, {"IS_TITLE": True}],  # Tribunale di Milano
        [{"LOWER": "corte"}, {"LOWER": "di"}, {"LOWER": "appello"}, {"LOWER": "di"}, {"IS_TITLE": True}],  # Corte d'Appello di Roma
        [{"LOWER": "corte"}, {"LOWER": "d'"}, {"LOWER": "appello"}, {"LOWER": "di"}, {"IS_TITLE": True}],  # Alternate form
        [{"LOWER": "corte"}, {"LOWER": "di"}, {"LOWER": "cassazione"}],  # Corte di Cassazione
        [{"LOWER": "corte"}, {"LOWER": "costituzionale"}],  # Corte Costituzionale
        [{"TEXT": {"REGEX": "TAR"}}, {"IS_TITLE": True}],  # TAR Lazio
        [{"LOWER": "consiglio"}, {"LOWER": "di"}, {"LOWER": "stato"}],  # Consiglio di Stato
    ]

    # Ministry patterns
    MINISTRY_PATTERNS = [
        [{"LOWER": "ministero"}, {"LOWER": {"IN": ["della", "del", "degli", "delle"]}}, {"IS_TITLE": True}],  # Ministero della Giustizia
        [{"LOWER": "ministero"}, {"LOWER": {"IN": ["della", "del", "degli", "delle"]}}, {"IS_TITLE": True}, {"IS_TITLE": True}],  # Two-word ministry
    ]

    # Public authority patterns
    AUTHORITY_PATTERNS = [
        [{"LOWER": "agenzia"}, {"LOWER": "delle"}, {"LOWER": "entrate"}],  # Agenzia delle Entrate
        [{"TEXT": {"REGEX": "INPS"}}],  # INPS
        [{"TEXT": {"REGEX": "INAIL"}}],  # INAIL
        [{"LOWER": "guardia"}, {"LOWER": "di"}, {"LOWER": "finanza"}],  # Guardia di Finanza
    ]

    def __init__(self, confidence: float = 0.90):
        """
        Initialize Legal Entity recognizer.

        Args:
            confidence: Confidence score for matched entities (default: 0.90)
        """
        self.confidence = confidence
        self.label = 'ORG'  # Use ORG label (compatible with spaCy)

    def __call__(self, doc: Doc) -> Doc:
        """
        Process document and add legal entity entities.

        Args:
            doc: spaCy Doc object

        Returns:
            Doc with legal entities added
        """
        # Initialize matcher
        matcher = Matcher(doc.vocab)

        # Add patterns
        matcher.add("COURT", self.COURT_PATTERNS)
        matcher.add("MINISTRY", self.MINISTRY_PATTERNS)
        matcher.add("AUTHORITY", self.AUTHORITY_PATTERNS)

        # Find matches
        matches = matcher(doc)
        new_ents = []

        for match_id, start, end in matches:
            span = doc[start:end]
            span._.confidence = self.confidence
            new_ents.append(span)

        # Merge with existing entities
        doc.ents = self._merge_entities(list(doc.ents), new_ents)

        return doc

    def _merge_entities(
        self,
        existing: List[Span],
        new: List[Span]
    ) -> tuple:
        """Merge entities, keeping highest confidence on overlaps."""
        all_ents = []

        for ent in existing:
            all_ents.append((ent.start_char, ent.end_char, ent))

        for ent in new:
            all_ents.append((ent.start_char, ent.end_char, ent))

        all_ents.sort(key=lambda x: x[0])

        filtered = []
        for start, end, ent in all_ents:
            if filtered and start < filtered[-1].end_char:
                prev_ent = filtered[-1]
                prev_conf = getattr(prev_ent._, 'confidence', 0.8)
                curr_conf = getattr(ent._, 'confidence', 0.8)

                if curr_conf > prev_conf:
                    filtered[-1] = ent
            else:
                filtered.append(ent)

        return tuple(filtered)


if not Span.has_extension('confidence'):
    Span.set_extension('confidence', default=0.8)


@Language.factory('legal_entity_recognizer')
def create_legal_entity_recognizer(nlp, name):
    """Factory to create legal entity recognizer."""
    return LegalEntityRecognizer()
