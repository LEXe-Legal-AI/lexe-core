"""
Italian Partita IVA (P.IVA) recognizer for spaCy.

The Partita IVA is an 11-digit number used to identify Italian businesses
and self-employed individuals for VAT (Value Added Tax) purposes.

Format: 12345678901 (11 digits)
- First 7 digits: Company identifier
- Next 3 digits: Province code (001-100, 120-121 for special cases)
- Last digit: Checksum (calculated using Luhn-like algorithm)

This recognizer:
1. Uses regex to find 11-digit numbers
2. Validates format (must start with digits, no leading zeros)
3. Validates checksum using Italian P.IVA algorithm
4. Adds validated entities to spaCy doc
"""

import re
from typing import List
from spacy.language import Language
from spacy.tokens import Doc, Span


class PIVARecognizer:
    """
    Italian Partita IVA recognizer with checksum validation.

    This component can be added to a spaCy pipeline to detect and validate
    Italian VAT numbers in text.

    Example:
        nlp = spacy.load('it_core_news_lg')
        nlp.add_pipe('piva_recognizer', after='cf_recognizer')

        doc = nlp("Azienda ABC S.r.l., P.IVA: 12345678901")
        for ent in doc.ents:
            if ent.label_ == 'PIVA':
                print(f"Found P.IVA: {ent.text}")
    """

    # Regex pattern for 11-digit numbers (potential P.IVA)
    # Must be preceded/followed by word boundary or specific context
    PATTERN = re.compile(
        r'\b\d{11}\b'
    )

    # Context patterns that indicate P.IVA
    CONTEXT_PATTERNS = [
        r'p\.?\s*iva',
        r'partita\s+iva',
        r'vat\s+number',
        r'vat\s*:',
    ]

    def __init__(self, confidence: float = 0.95, require_context: bool = True):
        """
        Initialize P.IVA recognizer.

        Args:
            confidence: Confidence score for validated P.IVA codes (default: 0.95)
            require_context: If True, only accept P.IVA with context keywords (default: True)
        """
        self.confidence = confidence
        self.require_context = require_context
        self.label = 'PIVA'

        # Compile context patterns
        self.context_regex = re.compile(
            '|'.join(self.CONTEXT_PATTERNS),
            re.IGNORECASE
        )

    def __call__(self, doc: Doc) -> Doc:
        """
        Process document and add P.IVA entities.

        Args:
            doc: spaCy Doc object

        Returns:
            Doc with P.IVA entities added
        """
        matches = self._find_matches(doc.text)
        new_ents = []

        for start_char, end_char, piva_text in matches:
            # Create span for this entity
            span = doc.char_span(start_char, end_char, label=self.label)

            if span is not None:
                # Set custom attributes
                span._.confidence = self.confidence
                new_ents.append(span)

        # Merge new entities with existing ones
        doc.ents = self._merge_entities(list(doc.ents), new_ents)

        return doc

    def _find_matches(self, text: str) -> List[tuple]:
        """
        Find and validate P.IVA codes in text.

        Args:
            text: Input text

        Returns:
            List of (start, end, piva_text) tuples for validated P.IVA codes
        """
        matches = []

        for match in self.PATTERN.finditer(text):
            piva_text = match.group()

            # Skip if starts with 0 (invalid)
            if piva_text[0] == '0':
                continue

            # Check context if required
            if self.require_context:
                # Look for context keywords within 50 characters before match
                context_start = max(0, match.start() - 50)
                context_text = text[context_start:match.start()]

                if not self.context_regex.search(context_text):
                    continue  # No context found, skip

            # Validate checksum
            if self._validate_piva(piva_text):
                matches.append((match.start(), match.end(), piva_text))

        return matches

    def _validate_piva(self, piva: str) -> bool:
        """
        Validate Italian P.IVA checksum.

        The checksum algorithm is a variant of the Luhn algorithm:
        1. Sum odd-position digits (1st, 3rd, 5th, ..., 9th) - unchanged
        2. For even-position digits (2nd, 4th, ..., 10th):
           - If digit is even: sum += digit
           - If digit is odd: sum += (digit * 2) % 9
              (Note: if digit * 2 == 9, add 9 instead of 0)
        3. Calculate check digit: (10 - (sum % 10)) % 10
        4. Compare with 11th digit

        Args:
            piva: P.IVA string (11 digits)

        Returns:
            True if checksum is valid, False otherwise
        """
        if len(piva) != 11 or not piva.isdigit():
            return False

        # Extract first 10 digits and checksum
        digits = [int(d) for d in piva[:10]]
        check_digit = int(piva[10])

        # Calculate sum
        total = 0

        for i, digit in enumerate(digits):
            if i % 2 == 0:  # Odd position (1-indexed), even index (0-indexed)
                # Add digit unchanged
                total += digit
            else:  # Even position (1-indexed), odd index (0-indexed)
                # Double the digit
                doubled = digit * 2

                if doubled > 9:
                    # If doubled > 9, subtract 9 (equivalent to summing digits)
                    total += doubled - 9
                else:
                    total += doubled

        # Calculate expected check digit
        expected_check = (10 - (total % 10)) % 10

        return check_digit == expected_check

    def _merge_entities(
        self,
        existing: List[Span],
        new: List[Span]
    ) -> tuple:
        """
        Merge new entities with existing ones, resolving overlaps.

        Strategy:
        - If entities overlap, keep the one with higher confidence
        - P.IVA entities have high confidence (0.95)

        Args:
            existing: Existing entities from doc.ents
            new: New P.IVA entities to add

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
        for start, end, ent in all_ents:
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


# Register custom attributes (shared with CF recognizer)
if not Span.has_extension('confidence'):
    Span.set_extension('confidence', default=0.8)


@Language.factory('piva_recognizer')
def create_piva_recognizer(nlp, name):
    """
    Factory function to create P.IVA recognizer component.

    This allows the recognizer to be added to spaCy pipelines using:
        nlp.add_pipe('piva_recognizer', after='cf_recognizer')

    Args:
        nlp: spaCy Language object
        name: Name of the component

    Returns:
        PIVARecognizer instance
    """
    return PIVARecognizer()
