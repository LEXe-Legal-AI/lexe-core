"""
spaCy-based PII detection engine for Italian legal documents.

This engine uses spaCy's NER capabilities combined with custom recognizers
to detect and anonymize PII in Italian legal texts.

Features:
- Fine-tuned spaCy model for Italian (it_core_news_lg)
- Custom recognizers (CF, P.IVA, legal entities)
- Configurable confidence thresholds
- Integration with replacement strategies
- Async API for performance

Example:
    from llsearch.privacy.engines.spacy import SpacyEngine

    engine = SpacyEngine()
    result = await engine.process(
        text="Mario Rossi, CF: RSSMRA85T10A562S, residente a Milano",
        user_id='user123'
    )

    print(result.anonymized_text)  # "PERSON_A, CF: CF_A, residente a LOCATION_A"
    print(f"Entities detected: {len(result.entities)}")
"""

import asyncio
from typing import List, Optional, Dict, Any
import spacy
from spacy.language import Language

from llsearch.privacy.pipeline.base_pipeline import (
    BasePipeline,
    DetectedEntity,
    EntityType,
    PipelineResult
)
from llsearch.privacy.pipeline.strategies import create_consistent_strategy


class SpacyEngine(BasePipeline):
    """
    spaCy-based PII detection engine for Italian legal documents.

    This engine extends BasePipeline and uses spaCy for entity detection
    with custom Italian-specific recognizers (CF, P.IVA, legal entities).

    Args:
        model_name: spaCy model name or path (default: 'it_core_news_lg')
        confidence_threshold: Minimum confidence to keep entities (default: 0.7)
        replacement_strategy: Strategy for anonymization (default: 'deterministic')
            Options: 'deterministic', 'synthetic', 'redact', 'hash'
        use_custom_recognizers: Enable CF, P.IVA, legal entity recognizers (default: True)

    Example:
        engine = SpacyEngine(
            model_name='it_core_news_lg',
            confidence_threshold=0.7,
            replacement_strategy='synthetic',
        )

        result = await engine.process(text, user_id='user123')
    """

    def __init__(
        self,
        model_name: str = 'it_core_news_lg',
        confidence_threshold: float = 0.7,
        replacement_strategy: str = 'deterministic',
        use_custom_recognizers: bool = True,
        **kwargs
    ):
        """Initialize spaCy engine."""
        super().__init__(name='spacy', version='1.0.0', **kwargs)

        self.model_name = model_name
        self.confidence_threshold = confidence_threshold
        self.use_custom_recognizers = use_custom_recognizers

        # Load spaCy model
        try:
            self.nlp = spacy.load(model_name)
        except OSError:
            # Fallback to base Italian model
            print(f"Warning: Model '{model_name}' not found. Falling back to 'it_core_news_lg'")
            try:
                self.nlp = spacy.load('it_core_news_lg')
            except OSError:
                raise RuntimeError(
                    "spaCy Italian model not found. Install with: "
                    "python -m spacy download it_core_news_lg"
                )

        # Add custom recognizers to pipeline
        if use_custom_recognizers:
            self._add_custom_recognizers()

        # Setup replacement strategy
        self.replacer = create_consistent_strategy(
            replacement_strategy,
            use_letters_for_names=True,
            locale='it_IT',
            seed=42,  # For reproducibility
        )

    def _add_custom_recognizers(self):
        """Add custom Italian recognizers to spaCy pipeline."""
        # Import recognizer factories
        from .recognizers.cf_recognizer import create_cf_recognizer
        from .recognizers.piva_recognizer import create_piva_recognizer
        from .recognizers.legal_entity import create_legal_entity_recognizer

        # Add CF recognizer after NER
        if 'cf_recognizer' not in self.nlp.pipe_names:
            if 'ner' in self.nlp.pipe_names:
                self.nlp.add_pipe('cf_recognizer', after='ner')
            else:
                self.nlp.add_pipe('cf_recognizer', last=True)

        # Add P.IVA recognizer after CF
        if 'piva_recognizer' not in self.nlp.pipe_names:
            self.nlp.add_pipe('piva_recognizer', after='cf_recognizer')

        # Add legal entity recognizer after P.IVA
        if 'legal_entity_recognizer' not in self.nlp.pipe_names:
            self.nlp.add_pipe('legal_entity_recognizer', after='piva_recognizer')

    async def detect_entities(self, text: str) -> List[DetectedEntity]:
        """
        Detect PII entities using spaCy NER + custom recognizers.

        This method runs spaCy's pipeline which includes:
        1. Standard NER (PERSON, ORG, LOC, etc.)
        2. CF recognizer (Italian fiscal codes)
        3. P.IVA recognizer (Italian VAT numbers)
        4. Legal entity recognizer (courts, ministries)

        Args:
            text: Input text to analyze

        Returns:
            List of DetectedEntity objects with type, text, position, confidence
        """
        # Run spaCy pipeline (blocking operation)
        # Use asyncio.to_thread to avoid blocking event loop
        doc = await asyncio.to_thread(self.nlp, text)

        entities = []

        for ent in doc.ents:
            # Map spaCy label to EntityType
            try:
                entity_type = self._map_label_to_entity_type(ent.label_)
            except ValueError:
                # Skip unknown entity types
                continue

            # Calculate confidence score
            confidence = self._calculate_confidence(ent)

            # Filter by confidence threshold
            if confidence < self.confidence_threshold:
                continue

            # Create DetectedEntity
            entity = DetectedEntity(
                type=entity_type,
                text=ent.text,
                start=ent.start_char,
                end=ent.end_char,
                confidence=confidence,
                metadata={
                    'label': ent.label_,
                    'lemma': ent.lemma_ if hasattr(ent, 'lemma_') else None,
                    'engine': 'spacy',
                }
            )
            entities.append(entity)

        return entities

    def _map_label_to_entity_type(self, label: str) -> EntityType:
        """
        Map spaCy entity label to EntityType enum.

        Args:
            label: spaCy entity label (e.g., 'PER', 'ORG', 'CF', etc.)

        Returns:
            EntityType enum value

        Raises:
            ValueError: If label cannot be mapped
        """
        # Direct mapping for custom labels
        if label == 'CF':
            return EntityType.FISCAL_CODE
        elif label == 'PIVA':
            return EntityType.VAT_NUMBER

        # Map spaCy standard labels
        label_mapping = {
            'PER': EntityType.PERSON,
            'PERSON': EntityType.PERSON,
            'ORG': EntityType.ORGANIZATION,
            'LOC': EntityType.LOCATION,
            'GPE': EntityType.LOCATION,
            'EMAIL': EntityType.EMAIL,
            'PHONE': EntityType.PHONE,
            # Add more mappings as needed
        }

        entity_type_str = label_mapping.get(label)
        if entity_type_str:
            return entity_type_str

        # Try direct conversion
        try:
            return EntityType(label)
        except ValueError:
            raise ValueError(f"Unknown entity label: {label}")

    def _calculate_confidence(self, ent) -> float:
        """
        Calculate confidence score for entity.

        Uses a combination of:
        1. Custom confidence from recognizers (if available)
        2. spaCy's built-in scores
        3. Heuristics based on entity type

        Args:
            ent: spaCy Span object

        Returns:
            Confidence score (0.0 - 1.0)
        """
        # Check for custom confidence attribute
        if hasattr(ent._, 'confidence'):
            return ent._.confidence

        # Use spaCy's score if available
        if hasattr(ent, 'score'):
            return ent.score

        # Heuristic scores based on entity type
        if ent.label_ == 'CF':
            return 0.95  # Validated by checksum
        elif ent.label_ == 'PIVA':
            return 0.95  # Validated by checksum
        elif ent.label_ == 'ORG' and any(
            token.text.lower() in ['tribunale', 'corte', 'ministero']
            for token in ent
        ):
            return 0.90  # Legal entity pattern
        elif ent.label_ in ['PER', 'PERSON']:
            return 0.85  # Standard NER confidence
        elif ent.label_ == 'ORG':
            return 0.80  # Standard ORG confidence
        else:
            return 0.75  # Default confidence

    async def anonymize(
        self,
        text: str,
        entities: List[DetectedEntity],
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Anonymize text by replacing detected entities.

        Uses the configured replacement strategy (deterministic, synthetic, etc.)
        with consistent replacement (same entity → same replacement).

        Args:
            text: Original text
            entities: List of detected entities to replace
            metadata: Additional metadata (unused)

        Returns:
            Anonymized text with entities replaced
        """
        # Replacement is CPU-bound, use thread pool
        anonymized = await asyncio.to_thread(
            self.replacer.replace_all,
            text,
            entities
        )
        return anonymized

    def get_pipeline_info(self) -> dict:
        """
        Get information about the spaCy pipeline configuration.

        Returns:
            Dict with model name, pipeline components, and configuration
        """
        return {
            'engine': self.name,
            'version': self.version,
            'model': self.model_name,
            'pipeline': self.nlp.pipe_names,
            'confidence_threshold': self.confidence_threshold,
            'custom_recognizers_enabled': self.use_custom_recognizers,
            'replacement_strategy': getattr(self.replacer, 'strategy_name', 'unknown'),
        }
