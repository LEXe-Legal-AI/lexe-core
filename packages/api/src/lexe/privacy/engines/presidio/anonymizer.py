"""
Italian Anonymizer for Microsoft Presidio.

Configures Presidio's AnonymizerEngine with Italian-aware anonymization
strategies.
"""

from typing import Dict, List
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig


class ItalianAnonymizer:
    """
    Presidio anonymizer with Italian-aware strategies.

    Supports multiple anonymization strategies:
    - replace: Replace with placeholder (e.g., PERSON_1, CF_1)
    - mask: Mask with characters (e.g., ***, XXX)
    - redact: Remove completely
    - hash: Replace with hash value

    Example:
        anonymizer = ItalianAnonymizer(strategy='replace')
        result = anonymizer.anonymize(
            text="Mario Rossi, CF: RSSMRA85T10A562S",
            analyzer_results=results
        )
    """

    def __init__(self, strategy: str = 'replace'):
        """
        Initialize Italian anonymizer.

        Args:
            strategy: Anonymization strategy ('replace', 'mask', 'redact', 'hash')
        """
        self.engine = AnonymizerEngine()
        self.strategy = strategy
        self.operators = self._configure_operators(strategy)

    def _configure_operators(self, strategy: str) -> Dict:
        """
        Configure anonymization operators for each entity type.

        Args:
            strategy: Strategy name

        Returns:
            Dict mapping entity types to OperatorConfig
        """
        if strategy == 'replace':
            return {
                "PERSON": OperatorConfig("replace", {"new_value": "PERSON_<ENTITY_INDEX>"}),
                "CF": OperatorConfig("replace", {"new_value": "CF_<ENTITY_INDEX>"}),
                "PIVA": OperatorConfig("replace", {"new_value": "PIVA_<ENTITY_INDEX>"}),
                "EMAIL_ADDRESS": OperatorConfig("replace", {"new_value": "EMAIL_<ENTITY_INDEX>"}),
                "PHONE_NUMBER": OperatorConfig("replace", {"new_value": "PHONE_<ENTITY_INDEX>"}),
                "ORG": OperatorConfig("replace", {"new_value": "ORG_<ENTITY_INDEX>"}),
                "LOCATION": OperatorConfig("replace", {"new_value": "LOC_<ENTITY_INDEX>"}),
                "GPE": OperatorConfig("replace", {"new_value": "LOC_<ENTITY_INDEX>"}),
            }

        elif strategy == 'mask':
            return {
                "PERSON": OperatorConfig("mask", {"masking_char": "*", "chars_to_mask": 10}),
                "CF": OperatorConfig("mask", {"masking_char": "X", "chars_to_mask": 16}),
                "PIVA": OperatorConfig("mask", {"masking_char": "X", "chars_to_mask": 11}),
                "EMAIL_ADDRESS": OperatorConfig("mask", {"masking_char": "*", "chars_to_mask": 10}),
                "PHONE_NUMBER": OperatorConfig("mask", {"masking_char": "*", "chars_to_mask": 10}),
            }

        elif strategy == 'redact':
            # Redact removes the text completely
            return {
                "DEFAULT": OperatorConfig("redact", {}),
            }

        elif strategy == 'hash':
            return {
                "DEFAULT": OperatorConfig("hash", {"hash_type": "sha256"}),
            }

        else:
            # Default to replace
            return self._configure_operators('replace')

    def anonymize(self, text: str, analyzer_results: List):
        """
        Anonymize text using configured operators.

        Args:
            text: Original text
            analyzer_results: List of RecognizerResult from analyzer

        Returns:
            Anonymized text (string)
        """
        result = self.engine.anonymize(
            text=text,
            analyzer_results=analyzer_results,
            operators=self.operators
        )
        return result.text

    def get_supported_operators(self):
        """
        Get list of supported operators.

        Returns:
            List of operator names
        """
        return list(self.engine.get_anonymizers().keys())
