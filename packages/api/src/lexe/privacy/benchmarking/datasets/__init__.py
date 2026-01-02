"""
Test datasets for benchmarking PII detection engines.

This package provides annotated legal documents for benchmarking.
"""

from .loader import load_legal_corpus, load_sample_dataset

__all__ = ['load_legal_corpus', 'load_sample_dataset']
