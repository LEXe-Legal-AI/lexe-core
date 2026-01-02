"""
Anonymization Log model for tracking complete document anonymization operations
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from uuid import uuid4

from sqlalchemy import (
    Column, String, Integer, Numeric, Text, Boolean, JSON,
    DateTime, ForeignKey, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from llsearch.monitoring.models.base import Base


class AnonymizationLog(Base):
    """
    Model for tracking complete anonymization operations at document level

    Attributes:
        id: Unique identifier
        trace_id: Reference to parent API call
        user_id: User who initiated anonymization
        document_id: Document identifier

        original_length: Original document length (chars)
        anonymized_length: Anonymized document length
        entities_detected: Number of PII entities detected
        entities_replaced: Number successfully replaced

        engine_used: Engine name ('spacy', 'presidio', 'hybrid')
        engine_version: Version string
        filters_applied: Comma-separated filter names

        processing_time_ms: Total processing time
        memory_used_mb: Memory consumption

        success: Operation success flag
        error_message: Error details if failed
        error_type: Error type classification

        metadata: Additional context (JSONB)
        created_at: Timestamp
    """

    __tablename__ = 'anonymization_logs'

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

    # Document Statistics
    original_length = Column(Integer, nullable=False)
    anonymized_length = Column(Integer, nullable=False)
    entities_detected = Column(Integer, nullable=False, default=0)
    entities_replaced = Column(Integer, nullable=False, default=0)

    # Engine Details
    engine_used = Column(
        String(50),
        CheckConstraint("engine_used IN ('spacy', 'presidio', 'hybrid')"),
        nullable=False,
        index=True
    )
    engine_version = Column(String(50), nullable=True)
    filters_applied = Column(String(200), nullable=True)

    # Performance Metrics
    processing_time_ms = Column(Integer, nullable=False)
    memory_used_mb = Column(Numeric(10, 2), nullable=True)

    # Status & Error Handling
    success = Column(Boolean, nullable=False, default=True, index=True)
    error_message = Column(Text, nullable=True)
    error_type = Column(String(100), nullable=True)

    # Metadata
    # Note: renamed from 'metadata' to 'extra_metadata' to avoid SQLAlchemy reserved attribute conflict
    extra_metadata = Column('metadata', JSON, nullable=True)

    # Timestamp
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Relationships
    call_event = relationship('CallEvent', back_populates='anonymization_logs', foreign_keys=[trace_id])

    # Table constraints
    __table_args__ = (
        CheckConstraint(
            'original_length >= 0 AND anonymized_length >= 0',
            name='valid_lengths'
        ),
        CheckConstraint(
            'entities_detected >= 0 AND entities_replaced >= 0 AND entities_replaced <= entities_detected',
            name='valid_entities'
        ),
        CheckConstraint(
            'processing_time_ms >= 0',
            name='valid_processing_time'
        ),
        # Composite indexes
        Index('idx_anon_logs_user_success', 'user_id', 'success'),
        Index('idx_anon_logs_engine_success', 'engine_used', 'success'),
    )

    def __repr__(self) -> str:
        status = "✓" if self.success else "✗"
        return (
            f"<AnonymizationLog(id={self.id}, "
            f"engine='{self.engine_used}', "
            f"entities={self.entities_detected}/{self.entities_replaced}, "
            f"time={self.processing_time_ms}ms, "
            f"status='{status}')>"
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'id': str(self.id),
            'trace_id': str(self.trace_id) if self.trace_id else None,
            'user_id': self.user_id,
            'document_id': self.document_id,
            'original_length': self.original_length,
            'anonymized_length': self.anonymized_length,
            'entities_detected': self.entities_detected,
            'entities_replaced': self.entities_replaced,
            'engine_used': self.engine_used,
            'engine_version': self.engine_version,
            'filters_applied': self.filters_applied.split(',') if self.filters_applied else [],
            'processing_time_ms': self.processing_time_ms,
            'memory_used_mb': float(self.memory_used_mb) if self.memory_used_mb else None,
            'success': self.success,
            'error_message': self.error_message,
            'error_type': self.error_type,
            'metadata': self.extra_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    @classmethod
    def from_operation(
        cls,
        trace_id: Optional[str],
        user_id: str,
        document_id: str,
        original_length: int,
        anonymized_length: int,
        engine_used: str,
        processing_time_ms: int,
        success: bool = True,
        entities_detected: int = 0,
        entities_replaced: int = 0,
        engine_version: Optional[str] = None,
        filters_applied: Optional[list] = None,
        memory_used_mb: Optional[float] = None,
        error_message: Optional[str] = None,
        error_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> 'AnonymizationLog':
        """
        Factory method to create AnonymizationLog from operation results

        Args:
            trace_id: Parent trace ID
            user_id: User identifier
            document_id: Document identifier
            original_length: Original document length
            anonymized_length: Anonymized document length
            engine_used: Engine name
            processing_time_ms: Processing time
            success: Success flag
            entities_detected: Number detected
            entities_replaced: Number replaced
            engine_version: Version string
            filters_applied: List of filter names
            memory_used_mb: Memory consumption
            error_message: Error details
            error_type: Error classification
            metadata: Additional context

        Returns:
            AnonymizationLog instance
        """
        return cls(
            trace_id=trace_id,
            user_id=user_id,
            document_id=document_id,
            original_length=original_length,
            anonymized_length=anonymized_length,
            entities_detected=entities_detected,
            entities_replaced=entities_replaced,
            engine_used=engine_used,
            engine_version=engine_version,
            filters_applied=','.join(filters_applied) if filters_applied else None,
            processing_time_ms=processing_time_ms,
            memory_used_mb=Decimal(str(memory_used_mb)) if memory_used_mb else None,
            success=success,
            error_message=error_message,
            error_type=error_type,
            extra_metadata=metadata or {},
            created_at=datetime.utcnow()
        )

    def get_replacement_rate(self) -> float:
        """Calculate percentage of detected entities that were replaced"""
        if self.entities_detected == 0:
            return 0.0
        return (self.entities_replaced / self.entities_detected) * 100

    def get_length_change_pct(self) -> float:
        """Calculate percentage change in document length"""
        if self.original_length == 0:
            return 0.0
        return ((self.anonymized_length - self.original_length) / self.original_length) * 100

    def get_throughput(self) -> float:
        """Calculate characters processed per millisecond"""
        if self.processing_time_ms == 0:
            return 0.0
        return self.original_length / self.processing_time_ms

    def is_successful(self) -> bool:
        """Check if operation was successful"""
        return self.success and self.entities_detected == self.entities_replaced
