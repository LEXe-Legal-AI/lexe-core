"""
Italian Codice Fiscale (CF) recognizer for spaCy.

The Codice Fiscale is a 16-character alphanumeric code used to uniquely
identify Italian citizens and residents for tax and administrative purposes.

Format: RSSMRA85T10A562S
- 6 letters: Surname (3) + Name (3)
- 2 digits: Year of birth
- 1 letter: Month of birth (A-E = Jan-May, H-P = Jun-Oct, R-T = Nov-Dec)
- 2 digits: Day of birth (+ 40 for females)
- 4 characters: Municipality code (1 letter + 3 digits)
- 1 letter: Checksum

This recognizer:
1. Uses regex to find potential CF codes
2. Validates the checksum algorithm
3. Adds validated entities to spaCy doc
"""

import re
from typing import List
from spacy.language import Language
from spacy.tokens import Doc, Span


class CFRecognizer:
    """
    Italian Codice Fiscale recognizer with checksum validation.

    This component can be added to a spaCy pipeline to detect and validate
    Italian fiscal codes in text.

    Example:
        nlp = spacy.load('it_core_news_lg')
        nlp.add_pipe('cf_recognizer', after='ner')

        doc = nlp("Mario Rossi, CF: RSSMRA85T10A562S")
        for ent in doc.ents:
            if ent.label_ == 'CF':
                print(f"Found CF: {ent.text}")
    """

    # Regex pattern for Italian Codice Fiscale
    # Format: [A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]
    PATTERN = re.compile(
        r'\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b',
        re.IGNORECASE
    )

    # Checksum calculation tables
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

    def __init__(self, confidence: float = 0.95):
        """
        Initialize CF recognizer.

        Args:
            confidence: Confidence score for validated CF codes (default: 0.95)
        """
        self.confidence = confidence
        self.label = 'CF'

    def __call__(self, doc: Doc) -> Doc:
        """
        Process document and add CF entities.

        Args:
            doc: spaCy Doc object

        Returns:
            Doc with CF entities added
        """
        matches = self._find_matches(doc.text)
        new_ents = []

        for start_char, end_char, cf_text in matches:
            # Create span for this entity
            span = doc.char_span(start_char, end_char, label=self.label)

            if span is not None:
                # Set custom attributes if needed
                span._.confidence = self.confidence
                new_ents.append(span)

        # Merge new entities with existing ones
        # Filter out overlapping entities (keep CF with higher confidence)
        doc.ents = self._merge_entities(list(doc.ents), new_ents)

        return doc

    def _find_matches(self, text: str) -> List[tuple]:
        """
        Find and validate CF codes in text.

        Args:
            text: Input text

        Returns:
            List of (start, end, cf_text) tuples for validated CF codes
        """
        matches = []

        for match in self.PATTERN.finditer(text):
            cf_text = match.group().upper()

            # Validate checksum
            if self._validate_checksum(cf_text):
                matches.append((match.start(), match.end(), cf_text))

        return matches

    def _validate_checksum(self, cf: str) -> bool:
        """
        Validate Italian CF checksum.

        The checksum is calculated as follows:
        1. For each character at odd position (1-indexed), get value from ODD_MAP
        2. For each character at even position, get value from EVEN_MAP
        3. Sum all values
        4. Take modulo 26
        5. Convert to letter (A=0, B=1, ..., Z=25)
        6. Compare with last character of CF

        Args:
            cf: Codice Fiscale string (16 chars, uppercase)

        Returns:
            True if checksum is valid, False otherwise
        """
        if len(cf) != 16:
            return False

        # Calculate checksum
        total = 0

        # Process first 15 characters
        for i, char in enumerate(cf[:15]):
            if i % 2 == 0:  # Odd position (0-indexed, so even index)
                total += self.ODD_MAP.get(char, 0)
            else:  # Even position
                total += self.EVEN_MAP.get(char, 0)

        # Get expected checksum letter
        checksum_index = total % 26
        expected_checksum = self.CHECKSUM_LETTERS[checksum_index]

        # Compare with actual checksum (last character)
        return cf[15] == expected_checksum

    def _merge_entities(
        self,
        existing: List[Span],
        new: List[Span]
    ) -> tuple:
        """
        Merge new entities with existing ones, resolving overlaps.

        Strategy:
        - If entities overlap, keep the one with higher confidence
        - CF entities have high confidence (0.95)

        Args:
            existing: Existing entities from doc.ents
            new: New CF entities to add

        Returns:
            Merged tuple of entities, sorted by start position
        """
        all_ents = []

        # Add all entities to a list with their spans
        for ent in existing:
            all_ents.append((ent.start_char, ent.end_char, ent))

        for ent in new:
            all_ents.append((ent.start_char, ent.end_char, ent))

        # Sort by start position
        all_ents.sort(key=lambda x: x[0])

        # Remove overlaps (keep entity with higher confidence)
        filtered = []
        for i, (start, end, ent) in enumerate(all_ents):
            # Check for overlap with previous entity
            if filtered and start < filtered[-1].end_char:
                # Overlap detected
                prev_ent = filtered[-1]

                # Compare confidence
                prev_conf = getattr(prev_ent._, 'confidence', 0.8)
                curr_conf = getattr(ent._, 'confidence', 0.8)

                if curr_conf > prev_conf:
                    # Replace previous entity
                    filtered[-1] = ent
                # else: keep previous entity (do nothing)
            else:
                # No overlap, add entity
                filtered.append(ent)

        return tuple(filtered)


# Register custom attributes
if not Span.has_extension('confidence'):
    Span.set_extension('confidence', default=0.8)


@Language.factory('cf_recognizer')
def create_cf_recognizer(nlp, name):
    """
    Factory function to create CF recognizer component.

    This allows the recognizer to be added to spaCy pipelines using:
        nlp.add_pipe('cf_recognizer', after='ner')

    Args:
        nlp: spaCy Language object
        name: Name of the component

    Returns:
        CFRecognizer instance
    """
    return CFRecognizer()
