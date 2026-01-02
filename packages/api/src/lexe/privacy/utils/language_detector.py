"""
Language Detection for Multi-Language Privacy Protection

Detects document language to select appropriate PII recognizers.
Supports: Italian, English, French, Spanish, German, Portuguese
"""

from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Supported languages with their spaCy model codes
SUPPORTED_LANGUAGES = {
    'it': 'it_core_news_lg',  # Italian
    'en': 'en_core_web_lg',   # English
    'fr': 'fr_core_news_lg',  # French
    'es': 'es_core_news_lg',  # Spanish
    'de': 'de_core_news_lg',  # German
    'pt': 'pt_core_news_lg',  # Portuguese
}

DEFAULT_LANGUAGE = 'it'  # Italian is default for legal documents


def detect_language(text: str, fallback: str = DEFAULT_LANGUAGE) -> str:
    """
    Detect document language with fallback.

    Uses langdetect library for fast, reliable detection.
    Falls back to Italian if detection fails or language unsupported.

    Args:
        text: Text to analyze (min 20 chars recommended)
        fallback: Language code to use if detection fails

    Returns:
        ISO 639-1 language code (it, en, fr, es, de, pt)

    Example:
        >>> detect_language("Questo è un documento legale")
        'it'
        >>> detect_language("This is a legal document")
        'en'
    """
    try:
        # Import lazily to avoid startup overhead
        from langdetect import detect, LangDetectException

        # Need minimum text length for reliable detection
        if len(text.strip()) < 20:
            logger.warning(f"Text too short for detection ({len(text)} chars), using fallback: {fallback}")
            return fallback

        # Detect language
        detected = detect(text)

        # Verify it's supported
        if detected in SUPPORTED_LANGUAGES:
            logger.info(f"Detected language: {detected}")
            return detected
        else:
            logger.warning(f"Detected unsupported language '{detected}', using fallback: {fallback}")
            return fallback

    except ImportError:
        logger.error("langdetect library not installed, using fallback")
        return fallback
    except Exception as e:
        logger.error(f"Language detection failed: {e}, using fallback: {fallback}")
        return fallback


def get_spacy_model_for_language(lang_code: str) -> str:
    """
    Get spaCy model name for language code.

    Args:
        lang_code: ISO 639-1 language code

    Returns:
        spaCy model name (e.g., 'it_core_news_lg')

    Example:
        >>> get_spacy_model_for_language('it')
        'it_core_news_lg'
    """
    return SUPPORTED_LANGUAGES.get(lang_code, SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE])


def is_language_supported(lang_code: str) -> bool:
    """
    Check if language is supported.

    Args:
        lang_code: ISO 639-1 language code

    Returns:
        True if language has PII recognizers available
    """
    return lang_code in SUPPORTED_LANGUAGES


def get_supported_languages() -> list[str]:
    """
    Get list of supported language codes.

    Returns:
        List of ISO 639-1 codes: ['it', 'en', 'fr', 'es', 'de', 'pt']
    """
    return list(SUPPORTED_LANGUAGES.keys())
