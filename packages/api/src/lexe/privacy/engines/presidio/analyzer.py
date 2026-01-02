"""
Multi-Language Analyzer for Microsoft Presidio.

Configures Presidio's AnalyzerEngine with support for multiple languages:
- Italian (it) - it_core_news_lg
- English (en) - en_core_web_lg  
- French (fr) - fr_core_news_lg
- German (de) - de_core_news_lg
- Spanish (es) - es_core_news_lg
- Portuguese (pt) - pt_core_news_lg
"""

from typing import List, Optional
from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider

from .recognizers import (
    ItalianCFRecognizer,
    ItalianPIVARecognizer,
    ItalianLegalEntityRecognizer,
)


# Language to spaCy model mapping
LANGUAGE_MODELS = {
    'it': 'it_core_news_lg',
    'en': 'en_core_web_lg',
    'fr': 'fr_core_news_lg',
    'de': 'de_core_news_lg',
    'es': 'es_core_news_lg',
    'pt': 'pt_core_news_lg',
}

SUPPORTED_LANGUAGES = list(LANGUAGE_MODELS.keys())


class MultiLanguageAnalyzer:
    """
    Presidio analyzer configured for multiple languages.

    Supports Italian, English, French, German, Spanish, and Portuguese
    with language-specific NLP models and custom Italian recognizers.

    Example:
        analyzer = MultiLanguageAnalyzer()
        results = analyzer.analyze(
            text="Mario Rossi, CF: RSSMRA85T10A562S",
            language="it"
        )
        
        # English text
        results = analyzer.analyze(
            text="John Smith lives at 123 Main St",
            language="en"
        )
    """

    def __init__(self, languages: Optional[List[str]] = None):
        """
        Initialize multi-language analyzer.

        Args:
            languages: List of language codes to support (default: all 6)
        """
        self.languages = languages or SUPPORTED_LANGUAGES
        self._analyzers = {}
        self._loaded_languages = set()
        
        # Load Italian by default (primary use case)
        self._load_language('it')

    def _load_language(self, lang_code: str) -> bool:
        """
        Lazily load analyzer for a specific language.
        
        Args:
            lang_code: Language code (it, en, fr, de, es, pt)
            
        Returns:
            True if loaded successfully, False otherwise
        """
        if lang_code in self._loaded_languages:
            return True
            
        if lang_code not in LANGUAGE_MODELS:
            return False
            
        try:
            model_name = LANGUAGE_MODELS[lang_code]
            
            # Configure NLP engine for this language
            configuration = {
                "nlp_engine_name": "spacy",
                "models": [
                    {
                        "lang_code": lang_code,
                        "model_name": model_name
                    }
                ],
            }

            # Create NLP engine provider
            provider = NlpEngineProvider(nlp_configuration=configuration)
            nlp_engine = provider.create_engine()

            # Create analyzer with language support
            analyzer = AnalyzerEngine(
                nlp_engine=nlp_engine,
                supported_languages=[lang_code]
            )

            # Register Italian-specific recognizers for Italian
            if lang_code == 'it':
                analyzer.registry.add_recognizer(ItalianCFRecognizer())
                analyzer.registry.add_recognizer(ItalianPIVARecognizer())
                analyzer.registry.add_recognizer(ItalianLegalEntityRecognizer())

            self._analyzers[lang_code] = analyzer
            self._loaded_languages.add(lang_code)
            return True
            
        except Exception as e:
            print(f"Warning: Failed to load language {lang_code}: {e}")
            return False

    def analyze(
        self,
        text: str,
        language: str = "it",
        entities: Optional[List[str]] = None,
        return_decision_process: bool = False
    ):
        """
        Analyze text for PII entities.

        Args:
            text: Input text to analyze
            language: Language code (default: 'it')
            entities: List of entity types to detect (None = all)
            return_decision_process: Return decision details (default: False)

        Returns:
            List of RecognizerResult objects
        """
        # Ensure language is loaded
        if language not in self._loaded_languages:
            if not self._load_language(language):
                # Fall back to Italian if language not available
                language = 'it'
                if not self._load_language('it'):
                    return []
        
        analyzer = self._analyzers.get(language)
        if not analyzer:
            return []
            
        return analyzer.analyze(
            text=text,
            language=language,
            entities=entities,
            return_decision_process=return_decision_process,
        )

    def get_recognizers(self, language: str = "it") -> List[str]:
        """
        Get list of recognizers for specified language.

        Args:
            language: Language code (default: 'it')

        Returns:
            List of recognizer names
        """
        if language not in self._loaded_languages:
            self._load_language(language)
            
        analyzer = self._analyzers.get(language)
        if not analyzer:
            return []
            
        recognizers = analyzer.get_recognizers(language=language)
        return [r.name for r in recognizers]
    
    def get_supported_languages(self) -> List[str]:
        """Get list of supported language codes."""
        return SUPPORTED_LANGUAGES
    
    def is_language_loaded(self, language: str) -> bool:
        """Check if a language model is loaded."""
        return language in self._loaded_languages


# Backwards compatibility alias
ItalianAnalyzer = MultiLanguageAnalyzer
