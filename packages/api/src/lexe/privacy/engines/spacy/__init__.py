"""
spaCy-based PII detection engine for Italian legal documents.

Components:
- SpacyEngine: Main engine implementation
- Custom recognizers: CF, P.IVA, legal entities, etc.
- NER model trainer: Fine-tuning on legal corpus
"""

from .spacy_engine import SpacyEngine

__all__ = ['SpacyEngine']
