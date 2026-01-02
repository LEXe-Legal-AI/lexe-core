"""
PII Detection Event model for tracking detected personally identifiable information
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from uuid import uuid4

from sqlalchemy import (
    Column, String, Integer, Numeric, Text, JSON,
    DateTime, ForeignKey, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from llsearch.monitoring.models.base import Base


class PIIDetectionEvent(Base):
    """
    Model for tracking individual PII entities detected during anonymization

    Attributes:
        id: Unique identifier for the event
        trace_id: Reference to the parent API call trace
        user_id: User who initiated the anonymization
        document_id: Identifier for the document being anonymized

        engine: Engine used for detection ('spacy', 'presidio', 'hybrid')
        entity_type: Type of PII detected (PERSON, ORG, LOC, CF, PIVA, etc.)
        entity_text: The actual PII text detected
        entity_start: Start position in document
        entity_end: End position in document
        confidence: Confidence score (0.0 to 1.0)

        replacement_text: Text used to replace the PII
        replacement_strategy: Strategy used ('deterministic', 'synthetic', 'redact', 'hash')

        context_before: Text before entity for debugging
        context_after: Text after entity for debugging
        metadata: Additional metadata (JSONB)

        created_at: Timestamp of detection
    """

    __tablename__ = 'pii_detection_events'

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign Keys & Context
    trace_id = Column(
        UUID(as_uuid=True),
        ForeignKey('call_events.trace_id', ondelete='CASCADE'),
        nullable=True,
        index=True
    )
    user_id = Column(String(255), nullable=False, index=True)
    document_id = Column(String(255), nullable=False, index=True)

    # Detection Details
    engine = Column(
        String(50),
        CheckConstraint("engine IN ('spacy', 'presidio', 'hybrid')"),
        nullable=False,
        index=True
    )
    entity_type = Column(String(50), nullable=False, index=True)
    entity_text = Column(String(500), nullable=False)
    entity_start = Column(Integer, nullable=False)
    entity_end = Column(Integer, nullable=False)
    confidence = Column(
        Numeric(5, 4),
        CheckConstraint('confidence >= 0 AND confidence <= 1'),
        nullable=True
    )

    # Anonymization Details
    replacement_text = Column(String(500), nullable=True)
    replacement_strategy = Column(String(50), nullable=True)

    # Context (for debugging/validation)
    context_before = Column(String(200), nullable=True)
    context_after = Column(String(200), nullable=True)

    # Metadata (JSONB for flexible storage)
    # Note: renamed from 'metadata' to 'extra_metadata' to avoid SQLAlchemy reserved attribute conflict
    extra_metadata = Column('metadata', JSON, nullable=True)

    # Timestamp
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Relationships
    call_event = relationship('CallEvent', back_populates='pii_events', foreign_keys=[trace_id])

    # Table constraints
    __table_args__ = (
        CheckConstraint(
            'entity_start >= 0 AND entity_end > entity_start',
            name='valid_position'
        ),
        # Composite indexes for common queries
        Index('idx_pii_events_user_engine', 'user_id', 'engine'),
        Index('idx_pii_events_document_engine', 'document_id', 'engine'),
        # GIN index for JSONB metadata (created in migration)
    )

    def __repr__(self) -> str:
        return (
            f"<PIIDetectionEvent(id={self.id}, "
            f"engine='{self.engine}', "
            f"entity_type='{self.entity_type}', "
            f"text='{self.entity_text[:20]}...', "
            f"confidence={self.confidence})>"
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'id': str(self.id),
            'trace_id': str(self.trace_id) if self.trace_id else None,
            'user_id': self.user_id,
            'document_id': self.document_id,
            'engine': self.engine,
            'entity_type': self.entity_type,
            'entity_text': self.entity_text,
            'entity_start': self.entity_start,
            'entity_end': self.entity_end,
            'confidence': float(self.confidence) if self.confidence else None,
            'replacement_text': self.replacement_text,
            'replacement_strategy': self.replacement_strategy,
            'context_before': self.context_before,
            'context_after': self.context_after,
            'metadata': self.extra_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    @classmethod
    def from_detection(
        cls,
        trace_id: Optional[str],
        user_id: str,
        document_id: str,
        engine: str,
        entity_type: str,
        entity_text: str,
        entity_start: int,
        entity_end: int,
        confidence: Optional[float] = None,
        replacement_text: Optional[str] = None,
        replacement_strategy: Optional[str] = None,
        context_before: Optional[str] = None,
        context_after: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> 'PIIDetectionEvent':
        """
        Factory method to create PIIDetectionEvent from detection results

        Args:
            trace_id: Parent trace ID
            user_id: User identifier
            document_id: Document identifier
            engine: Engine name ('spacy', 'presidio', 'hybrid')
            entity_type: Type of entity (PERSON, ORG, etc.)
            entity_text: The detected PII text
            entity_start: Start position
            entity_end: End position
            confidence: Confidence score (0.0 to 1.0)
            replacement_text: Replacement text used
            replacement_strategy: Strategy name
            context_before: Text before entity
            context_after: Text after entity
            metadata: Additional metadata

        Returns:
            PIIDetectionEvent instance
        """
        return cls(
            trace_id=trace_id,
            user_id=user_id,
            document_id=document_id,
            engine=engine,
            entity_type=entity_type,
            entity_text=entity_text,
            entity_start=entity_start,
            entity_end=entity_end,
            confidence=Decimal(str(confidence)) if confidence is not None else None,
            replacement_text=replacement_text,
            replacement_strategy=replacement_strategy,
            context_before=context_before,
            context_after=context_after,
            extra_metadata=metadata or {},
            created_at=datetime.utcnow()
        )

    def get_entity_length(self) -> int:
        """Get length of detected entity"""
        return self.entity_end - self.entity_start

    def is_high_confidence(self, threshold: float = 0.9) -> bool:
        """Check if detection confidence is above threshold"""
        if self.confidence is None:
            return False
        return float(self.confidence) >= threshold

    def get_context_window(self) -> str:
        """Get full context window around entity"""
        parts = []
        if self.context_before:
            parts.append(self.context_before)
        parts.append(f"[{self.entity_text}]")
        if self.context_after:
            parts.append(self.context_after)
        return " ".join(parts)
