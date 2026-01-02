"""
Microsoft Presidio-based PII detection engine for Italian legal documents.

Components:
- PresidioEngine: Main engine implementation
- ItalianAnalyzer: Presidio analyzer configured for Italian
- ItalianAnonymizer: Anonymizer with Italian-aware strategies
- Custom recognizers: CF, P.IVA, legal entities, etc.
"""

from .presidio_engine import PresidioEngine

__all__ = ['PresidioEngine']
