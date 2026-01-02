"""
Custom Presidio recognizers for Italian PII entities.

Recognizers:
- ItalianCFRecognizer: Italian Codice Fiscale with checksum validation
- ItalianPIVARecognizer: Italian Partita IVA with checksum validation
- ItalianLegalEntityRecognizer: Italian legal entities (courts, ministries)
"""

from .cf_recognizer import ItalianCFRecognizer
from .piva_recognizer import ItalianPIVARecognizer
from .legal_entity_recognizer import ItalianLegalEntityRecognizer

__all__ = [
    'ItalianCFRecognizer',
    'ItalianPIVARecognizer',
    'ItalianLegalEntityRecognizer',
]
