"""
Privacy utilities and helpers
"""

from .language_detector import (
    detect_language,
    get_spacy_model_for_language,
    is_language_supported,
    get_supported_languages,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
)

from .confidence_scorer import (
    calculate_entity_confidence,
    calculate_aggregate_confidence,
    meets_confidence_threshold,
    boost_confidence_with_context,
    ConfidenceMetrics,
    ENTITY_TYPE_RELIABILITY,
    CONTEXT_KEYWORDS,
)

__all__ = [
    # Language detection
    'detect_language',
    'get_spacy_model_for_language',
    'is_language_supported',
    'get_supported_languages',
    'SUPPORTED_LANGUAGES',
    'DEFAULT_LANGUAGE',
    # Confidence scoring
    'calculate_entity_confidence',
    'calculate_aggregate_confidence',
    'meets_confidence_threshold',
    'boost_confidence_with_context',
    'ConfidenceMetrics',
    'ENTITY_TYPE_RELIABILITY',
    'CONTEXT_KEYWORDS',
]
