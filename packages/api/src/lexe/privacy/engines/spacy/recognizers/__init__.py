"""
Custom spaCy recognizers for Italian PII entities.

Recognizers:
- CFRecognizer: Italian Codice Fiscale with checksum validation
- PIVARecognizer: Italian Partita IVA with checksum validation
- LegalEntityRecognizer: Italian legal entities (courts, ministries)
- EmailPhoneRecognizer: Email addresses and phone numbers
- AddressRecognizer: Italian addresses
"""

from .cf_recognizer import CFRecognizer, create_cf_recognizer
from .piva_recognizer import PIVARecognizer, create_piva_recognizer

__all__ = [
    'CFRecognizer',
    'create_cf_recognizer',
    'PIVARecognizer',
    'create_piva_recognizer',
]
