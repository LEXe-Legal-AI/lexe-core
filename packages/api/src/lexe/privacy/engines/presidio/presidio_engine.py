"""
Microsoft Presidio-based PII detection engine for Italian legal documents.

This engine uses Microsoft Presidio with custom Italian recognizers to detect
and anonymize PII in legal texts.

Features:
- Presidio analyzer with Italian support
- Custom recognizers (CF, P.IVA, legal entities)
- Configurable anonymization strategies
- Async API for performance

Example:
    from llsearch.privacy.engines.presidio import PresidioEngine

    engine = PresidioEngine()
    result = await engine.process(
        text="Mario Rossi, CF: RSSMRA85T10A562S",
        user_id='user123'
    )
"""

import asyncio
from typing import List, Dict, Any

from llsearch.privacy.pipeline.base_pipeline import (
    BasePipeline,
    DetectedEntity,
    EntityType,
    PipelineResult
)

from .analyzer import ItalianAnalyzer
from .anonymizer import ItalianAnonymizer


class PresidioEngine(BasePipeline):
    """
    Microsoft Presidio-based PII detection engine for Italian legal documents.

    This engine extends BasePipeline and uses Presidio for entity detection
    with custom Italian-specific recognizers.

    Args:
        model_name: spaCy model name for Italian (default: 'it_core_news_lg')
        confidence_threshold: Minimum confidence to keep entities (default: 0.7)
        anonymization_strategy: Strategy for anonymization (default: 'replace')
            Options: 'replace', 'mask', 'redact', 'hash'

    Example:
        engine = PresidioEngine(
            model_name='it_core_news_lg',
            confidence_threshold=0.7,
            anonymization_strategy='replace',
        )

        result = await engine.process(text, user_id='user123')
    """

    def __init__(
        self,
        model_name: str = 'it_core_news_lg',
        confidence_threshold: float = 0.7,
        anonymization_strategy: str = 'replace',
        **kwargs
    ):
        """Initialize Presidio engine."""
        super().__init__(name='presidio', version='2.2.0', **kwargs)

        self.model_name = model_name
        self.confidence_threshold = confidence_threshold
        self.anonymization_strategy = anonymization_strategy

        # Initialize analyzer and anonymizer
        self.analyzer = ItalianAnalyzer()
        self.anonymizer = ItalianAnonymizer(strategy=anonymization_strategy)

    async def detect_entities(self, text: str) -> List[DetectedEntity]:
        """
        Detect PII entities using Presidio analyzer + custom recognizers.

        This method runs Presidio's analyzer which includes:
        1. Standard Presidio recognizers (PERSON, EMAIL, PHONE, etc.)
        2. CF recognizer (Italian fiscal codes)
        3. P.IVA recognizer (Italian VAT numbers)
        4. Legal entity recognizer (courts, ministries)

        Args:
            text: Input text to analyze

        Returns:
            List of DetectedEntity objects
        """
        # Run Presidio analyzer (blocking operation)
        # Use asyncio.to_thread to avoid blocking event loop
        analyzer_results = await asyncio.to_thread(
            self.analyzer.analyze,
            text=text,
            language='it'
        )

        entities = []

        for result in analyzer_results:
            # Filter by confidence threshold
            if result.score < self.confidence_threshold:
                continue

            # Map Presidio entity type to EntityType
            try:
                entity_type = self._map_presidio_type_to_entity_type(result.entity_type)
            except ValueError:
                # Skip unknown entity types
                continue

            # Create DetectedEntity
            entity = DetectedEntity(
                type=entity_type,
                text=text[result.start:result.end],
                start=result.start,
                end=result.end,
                confidence=result.score,
                metadata={
                    'entity_type': result.entity_type,
                    'recognizer': result.recognition_metadata.get('recognizer_name'),
                    'engine': 'presidio',
                }
            )
            entities.append(entity)

        return entities

    def _map_presidio_type_to_entity_type(self, presidio_type: str) -> EntityType:
        """
        Map Presidio entity type to EntityType enum.

        Args:
            presidio_type: Presidio entity type string

        Returns:
            EntityType enum value

        Raises:
            ValueError: If type cannot be mapped
        """
        # Direct mapping for custom types
        if presidio_type == 'CF':
            return EntityType.FISCAL_CODE
        elif presidio_type == 'PIVA':
            return EntityType.VAT_NUMBER

        # Map Presidio standard types
        type_mapping = {
            'PERSON': EntityType.PERSON,
            'EMAIL_ADDRESS': EntityType.EMAIL,
            'PHONE_NUMBER': EntityType.PHONE,
            'LOCATION': EntityType.LOCATION,
            'GPE': EntityType.LOCATION,
            'ORG': EntityType.ORGANIZATION,
            'DATE_TIME': EntityType.DATE,
            # Add more mappings as needed
        }

        entity_type = type_mapping.get(presidio_type)
        if entity_type:
            return entity_type

        # Try direct conversion
        try:
            return EntityType(presidio_type)
        except ValueError:
            raise ValueError(f"Unknown Presidio entity type: {presidio_type}")

    async def anonymize(
        self,
        text: str,
        entities: List[DetectedEntity],
        metadata: Dict[str, Any] = None
    ) -> str:
        """
        Anonymize text using Presidio anonymizer.

        Converts DetectedEntity objects back to Presidio format and
        applies the configured anonymization strategy.

        Args:
            text: Original text
            entities: List of detected entities to anonymize
            metadata: Optional metadata (not used by Presidio engine)

        Returns:
            Anonymized text
        """
        # Convert DetectedEntity to Presidio RecognizerResult format
        analyzer_results = self._convert_to_presidio_format(entities)

        # Run anonymizer (blocking operation)
        anonymized = await asyncio.to_thread(
            self.anonymizer.anonymize,
            text=text,
            analyzer_results=analyzer_results
        )

        return anonymized

    def _convert_to_presidio_format(self, entities: List[DetectedEntity]):
        """
        Convert DetectedEntity list to Presidio RecognizerResult format.

        Args:
            entities: List of DetectedEntity objects

        Returns:
            List of Presidio RecognizerResult objects
        """
        from presidio_analyzer import RecognizerResult

        results = []
        for entity in entities:
            result = RecognizerResult(
                entity_type=entity.type.value,
                start=entity.start,
                end=entity.end,
                score=entity.confidence,
            )
            results.append(result)

        return results

    def get_pipeline_info(self) -> dict:
        """
        Get information about the Presidio pipeline configuration.

        Returns:
            Dict with model name, recognizers, and configuration
        """
        return {
            'engine': self.name,
            'version': self.version,
            'model': self.model_name,
            'recognizers': self.analyzer.get_recognizers(language='it'),
            'confidence_threshold': self.confidence_threshold,
            'anonymization_strategy': self.anonymization_strategy,
        }
