"""
Base pipeline abstract class for PII detection engines
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from enum import Enum
import time

import structlog

logger = structlog.get_logger(__name__)


class EntityType(Enum):
    """Entity types detected by the pipeline"""
    PERSON = "PERSON"
    ORGANIZATION = "ORG"
    LOCATION = "LOC"
    DATE = "DATE"

    # Italian-specific
    FISCAL_CODE = "CF"  # Codice Fiscale
    VAT_NUMBER = "PIVA"  # Partita IVA

    # Contact info
    EMAIL = "EMAIL"
    PHONE = "PHONE"
    ADDRESS = "ADDRESS"

    # Legal entities
    COURT = "COURT"  # Tribunale, Corte
    JUDGE = "JUDGE"  # Giudice
    LAWYER = "LAWYER"  # Avvocato

    # IDs
    ID_CARD = "ID_CARD"
    PASSPORT = "PASSPORT"
    IBAN = "IBAN"

    # Other
    OTHER = "OTHER"


@dataclass
class DetectedEntity:
    """
    Represents a detected PII entity

    Attributes:
        text: The entity text
        type: Entity type (PERSON, ORG, CF, etc.)
        start: Start position in original text
        end: End position in original text
        confidence: Confidence score (0.0 to 1.0)
        context_before: Text before entity
        context_after: Text after entity
        metadata: Additional metadata
    """
    text: str
    type: EntityType
    start: int
    end: int
    confidence: float = 1.0
    context_before: Optional[str] = None
    context_after: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Validate entity after initialization"""
        if self.start < 0 or self.end <= self.start:
            raise ValueError(f"Invalid entity position: start={self.start}, end={self.end}")
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError(f"Confidence must be between 0 and 1, got {self.confidence}")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'text': self.text,
            'type': self.type.value,
            'start': self.start,
            'end': self.end,
            'confidence': self.confidence,
            'context_before': self.context_before,
            'context_after': self.context_after,
            'metadata': self.metadata,
        }

    def get_length(self) -> int:
        """Get entity length"""
        return self.end - self.start

    def is_high_confidence(self, threshold: float = 0.9) -> bool:
        """Check if entity has high confidence"""
        return self.confidence >= threshold


@dataclass
class PipelineResult:
    """
    Result of pipeline processing

    Attributes:
        original_text: Original input text
        anonymized_text: Text with PII replaced
        entities: List of detected entities
        success: Whether processing succeeded
        error_message: Error message if failed
        processing_time_ms: Processing time in milliseconds
        metadata: Additional metadata
    """
    original_text: str
    anonymized_text: str
    entities: List[DetectedEntity] = field(default_factory=list)
    success: bool = True
    error_message: Optional[str] = None
    processing_time_ms: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_entity_count(self) -> int:
        """Get total number of entities detected"""
        return len(self.entities)

    def get_entities_by_type(self, entity_type: EntityType) -> List[DetectedEntity]:
        """Get entities of specific type"""
        return [e for e in self.entities if e.type == entity_type]

    def get_entity_types(self) -> Dict[EntityType, int]:
        """Get count of entities by type"""
        counts = {}
        for entity in self.entities:
            counts[entity.type] = counts.get(entity.type, 0) + 1
        return counts

    def get_replacement_rate(self) -> float:
        """Calculate percentage of text that was replaced"""
        if len(self.original_text) == 0:
            return 0.0
        original_len = len(self.original_text)
        anonymized_len = len(self.anonymized_text)
        return abs(anonymized_len - original_len) / original_len * 100

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'original_length': len(self.original_text),
            'anonymized_length': len(self.anonymized_text),
            'entities': [e.to_dict() for e in self.entities],
            'entity_count': self.get_entity_count(),
            'entity_types': {k.value: v for k, v in self.get_entity_types().items()},
            'success': self.success,
            'error_message': self.error_message,
            'processing_time_ms': self.processing_time_ms,
            'replacement_rate': self.get_replacement_rate(),
            'metadata': self.metadata,
        }


class BasePipeline(ABC):
    """
    Abstract base class for PII detection pipelines

    All detection engines (spaCy, Presidio) must inherit from this class
    and implement the abstract methods.

    Lifecycle:
        1. pre_process() - Preprocessing (filters, normalization)
        2. detect_entities() - Entity detection (engine-specific)
        3. post_process() - Post-processing (validation, scoring)
        4. anonymize() - Text anonymization with replacement

    Usage:
        class SpacyPipeline(BasePipeline):
            def detect_entities(self, text: str) -> List[DetectedEntity]:
                # Implement spaCy NER logic
                pass

        pipeline = SpacyPipeline(name='spacy', version='1.0')
        result = await pipeline.process(text, user_id='user123')
    """

    def __init__(
        self,
        name: str,
        version: Optional[str] = None,
        confidence_threshold: float = 0.7,
        context_window_chars: int = 100,
    ):
        """
        Initialize pipeline

        Args:
            name: Pipeline name (e.g., 'spacy', 'presidio')
            version: Pipeline version
            confidence_threshold: Minimum confidence for entity detection
            context_window_chars: Context window size (chars before/after entity)
        """
        self.name = name
        self.version = version or "unknown"
        self.confidence_threshold = confidence_threshold
        self.context_window_chars = context_window_chars
        self.logger = structlog.get_logger(f"{__name__}.{name}")

    async def process(
        self,
        text: str,
        user_id: Optional[str] = None,
        document_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> PipelineResult:
        """
        Main processing method - orchestrates full pipeline

        Args:
            text: Input text to process
            user_id: User identifier
            document_id: Document identifier
            metadata: Additional metadata

        Returns:
            PipelineResult with detected entities and anonymized text
        """
        start_time = time.time()

        try:
            self.logger.info(
                "pipeline_started",
                engine=self.name,
                text_length=len(text),
                user_id=user_id,
                document_id=document_id,
            )

            # 1. Pre-processing
            preprocessed_text = await self.pre_process(text, metadata)

            # 2. Entity detection (engine-specific)
            entities = await self.detect_entities(preprocessed_text)

            # 3. Post-processing (validation, filtering)
            entities = await self.post_process(entities, preprocessed_text, metadata)

            # 4. Anonymization
            anonymized_text = await self.anonymize(preprocessed_text, entities, metadata)

            # Calculate processing time
            processing_time_ms = int((time.time() - start_time) * 1000)

            result = PipelineResult(
                original_text=text,
                anonymized_text=anonymized_text,
                entities=entities,
                success=True,
                processing_time_ms=processing_time_ms,
                metadata=metadata or {},
            )

            self.logger.info(
                "pipeline_completed",
                engine=self.name,
                entities_detected=len(entities),
                processing_time_ms=processing_time_ms,
            )

            return result

        except Exception as e:
            processing_time_ms = int((time.time() - start_time) * 1000)

            self.logger.error(
                "pipeline_failed",
                engine=self.name,
                error=str(e),
                error_type=type(e).__name__,
                processing_time_ms=processing_time_ms,
            )

            return PipelineResult(
                original_text=text,
                anonymized_text=text,  # Return original on error
                entities=[],
                success=False,
                error_message=str(e),
                processing_time_ms=processing_time_ms,
                metadata=metadata or {},
            )

    async def pre_process(
        self,
        text: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Pre-process text before entity detection

        Default implementation does nothing. Override in subclasses.

        Args:
            text: Input text
            metadata: Additional metadata

        Returns:
            Preprocessed text
        """
        return text

    @abstractmethod
    async def detect_entities(self, text: str) -> List[DetectedEntity]:
        """
        Detect entities in text (engine-specific implementation)

        This method must be implemented by subclasses (spaCy, Presidio).

        Args:
            text: Preprocessed text

        Returns:
            List of detected entities
        """
        pass

    async def post_process(
        self,
        entities: List[DetectedEntity],
        text: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[DetectedEntity]:
        """
        Post-process detected entities (validation, filtering)

        Default implementation filters by confidence threshold.
        Override in subclasses for custom logic.

        Args:
            entities: Detected entities
            text: Original text
            metadata: Additional metadata

        Returns:
            Filtered entities
        """
        # Filter by confidence threshold
        filtered = [e for e in entities if e.confidence >= self.confidence_threshold]

        self.logger.debug(
            "post_process_complete",
            original_count=len(entities),
            filtered_count=len(filtered),
            threshold=self.confidence_threshold,
        )

        return filtered

    @abstractmethod
    async def anonymize(
        self,
        text: str,
        entities: List[DetectedEntity],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Anonymize text by replacing detected entities

        This method must be implemented by subclasses.

        Args:
            text: Original text
            entities: Detected entities to replace
            metadata: Additional metadata

        Returns:
            Anonymized text
        """
        pass

    def extract_context(
        self,
        text: str,
        start: int,
        end: int,
    ) -> Tuple[str, str]:
        """
        Extract context around entity

        Args:
            text: Full text
            start: Entity start position
            end: Entity end position

        Returns:
            Tuple of (context_before, context_after)
        """
        # Context before
        context_start = max(0, start - self.context_window_chars)
        context_before = text[context_start:start]

        # Context after
        context_end = min(len(text), end + self.context_window_chars)
        context_after = text[end:context_end]

        return context_before.strip(), context_after.strip()

    def get_info(self) -> Dict[str, Any]:
        """Get pipeline information"""
        return {
            'name': self.name,
            'version': self.version,
            'confidence_threshold': self.confidence_threshold,
            'context_window_chars': self.context_window_chars,
        }
