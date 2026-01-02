"""
Benchmark Result model for tracking engine performance comparisons
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List
from uuid import uuid4

from sqlalchemy import (
    Column, String, Integer, Numeric, Text, JSON,
    DateTime, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID

from llsearch.monitoring.models.base import Base


class BenchmarkResult(Base):
    """
    Model for storing benchmark results comparing PII detection engines

    Attributes:
        id: Unique identifier
        test_dataset_id: Dataset identifier
        test_dataset_size: Number of documents in test set
        test_dataset_type: Type of dataset (legal_corpus, contracts, etc.)

        engine: Engine name ('spacy', 'presidio', 'hybrid')
        engine_version: Version string
        engine_config: Configuration used (JSONB)

        precision: Precision score (0.0 to 1.0)
        recall: Recall score (0.0 to 1.0)
        f1_score: F1 score (harmonic mean)

        avg_latency_ms: Average latency
        p50_latency_ms: 50th percentile
        p95_latency_ms: 95th percentile
        p99_latency_ms: 99th percentile
        min_latency_ms: Minimum latency
        max_latency_ms: Maximum latency

        total_entities: Total entities in ground truth
        true_positives: Correctly detected
        false_positives: Incorrectly detected
        false_negatives: Missed entities
        true_negatives: Correctly not detected (optional)

        metrics_by_entity_type: Per-entity breakdown (JSONB)
        total_cost_usd: Total cost
        cost_per_document: Cost per doc

        confidence_interval_lower: CI lower bound
        confidence_interval_upper: CI upper bound
        p_value: Statistical significance

        benchmark_run_id: Group ID for comparisons
        notes: Additional notes
        metadata: Additional metadata (JSONB)
        created_at: Timestamp
    """

    __tablename__ = 'pii_benchmark_results'

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Benchmark Context
    test_dataset_id = Column(String(255), nullable=False, index=True)
    test_dataset_size = Column(Integer, nullable=False)
    test_dataset_type = Column(String(100), nullable=True)

    # Engine Details
    engine = Column(
        String(50),
        CheckConstraint("engine IN ('spacy', 'presidio', 'hybrid')"),
        nullable=False,
        index=True
    )
    engine_version = Column(String(50), nullable=True)
    engine_config = Column(JSON, nullable=True)

    # Performance Metrics
    precision = Column(
        Numeric(5, 4),
        CheckConstraint('precision >= 0 AND precision <= 1'),
        nullable=True
    )
    recall = Column(
        Numeric(5, 4),
        CheckConstraint('recall >= 0 AND recall <= 1'),
        nullable=True
    )
    f1_score = Column(
        Numeric(5, 4),
        CheckConstraint('f1_score >= 0 AND f1_score <= 1'),
        nullable=True,
        index=True
    )

    # Latency Metrics
    avg_latency_ms = Column(Integer, nullable=False)
    p50_latency_ms = Column(Integer, nullable=True)
    p95_latency_ms = Column(Integer, nullable=True)
    p99_latency_ms = Column(Integer, nullable=True)
    min_latency_ms = Column(Integer, nullable=True)
    max_latency_ms = Column(Integer, nullable=True)

    # Confusion Matrix
    total_entities = Column(Integer, nullable=False)
    true_positives = Column(Integer, nullable=False)
    false_positives = Column(Integer, nullable=False)
    false_negatives = Column(Integer, nullable=False)
    true_negatives = Column(Integer, nullable=True)

    # Per-Entity Metrics
    metrics_by_entity_type = Column(JSON, nullable=True)

    # Cost Metrics
    total_cost_usd = Column(Numeric(10, 6), nullable=True)
    cost_per_document = Column(Numeric(10, 6), nullable=True)

    # Statistical Significance
    confidence_interval_lower = Column(Numeric(5, 4), nullable=True)
    confidence_interval_upper = Column(Numeric(5, 4), nullable=True)
    p_value = Column(Numeric(10, 8), nullable=True)

    # Metadata
    benchmark_run_id = Column(String(255), nullable=True, index=True)
    notes = Column(Text, nullable=True)
    # Note: renamed from 'metadata' to 'extra_metadata' to avoid SQLAlchemy reserved attribute conflict
    extra_metadata = Column('metadata', JSON, nullable=True)

    # Timestamp
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Table constraints
    __table_args__ = (
        CheckConstraint(
            'true_positives >= 0 AND false_positives >= 0 AND false_negatives >= 0 AND '
            'true_positives + false_negatives <= total_entities',
            name='valid_confusion_matrix'
        ),
        CheckConstraint(
            'avg_latency_ms >= 0 AND '
            '(p50_latency_ms IS NULL OR p50_latency_ms >= 0) AND '
            '(p95_latency_ms IS NULL OR p95_latency_ms >= 0) AND '
            '(p99_latency_ms IS NULL OR p99_latency_ms >= 0)',
            name='valid_latencies'
        ),
        # Composite indexes
        Index('idx_benchmark_dataset_engine', 'test_dataset_id', 'engine'),
        Index('idx_benchmark_run_engine', 'benchmark_run_id', 'engine'),
    )

    def __repr__(self) -> str:
        return (
            f"<BenchmarkResult(id={self.id}, "
            f"engine='{self.engine}', "
            f"dataset='{self.test_dataset_id}', "
            f"f1={self.f1_score:.3f}, "
            f"latency={self.avg_latency_ms}ms)>"
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'id': str(self.id),
            'test_dataset_id': self.test_dataset_id,
            'test_dataset_size': self.test_dataset_size,
            'test_dataset_type': self.test_dataset_type,
            'engine': self.engine,
            'engine_version': self.engine_version,
            'engine_config': self.engine_config,
            'precision': float(self.precision) if self.precision else None,
            'recall': float(self.recall) if self.recall else None,
            'f1_score': float(self.f1_score) if self.f1_score else None,
            'avg_latency_ms': self.avg_latency_ms,
            'p50_latency_ms': self.p50_latency_ms,
            'p95_latency_ms': self.p95_latency_ms,
            'p99_latency_ms': self.p99_latency_ms,
            'min_latency_ms': self.min_latency_ms,
            'max_latency_ms': self.max_latency_ms,
            'total_entities': self.total_entities,
            'true_positives': self.true_positives,
            'false_positives': self.false_positives,
            'false_negatives': self.false_negatives,
            'true_negatives': self.true_negatives,
            'metrics_by_entity_type': self.metrics_by_entity_type,
            'total_cost_usd': float(self.total_cost_usd) if self.total_cost_usd else None,
            'cost_per_document': float(self.cost_per_document) if self.cost_per_document else None,
            'confidence_interval_lower': float(self.confidence_interval_lower) if self.confidence_interval_lower else None,
            'confidence_interval_upper': float(self.confidence_interval_upper) if self.confidence_interval_upper else None,
            'p_value': float(self.p_value) if self.p_value else None,
            'benchmark_run_id': self.benchmark_run_id,
            'notes': self.notes,
            'metadata': self.extra_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    @classmethod
    def from_benchmark(
        cls,
        test_dataset_id: str,
        test_dataset_size: int,
        engine: str,
        total_entities: int,
        true_positives: int,
        false_positives: int,
        false_negatives: int,
        avg_latency_ms: int,
        test_dataset_type: Optional[str] = None,
        engine_version: Optional[str] = None,
        engine_config: Optional[Dict] = None,
        p50_latency_ms: Optional[int] = None,
        p95_latency_ms: Optional[int] = None,
        p99_latency_ms: Optional[int] = None,
        min_latency_ms: Optional[int] = None,
        max_latency_ms: Optional[int] = None,
        true_negatives: Optional[int] = None,
        metrics_by_entity_type: Optional[Dict] = None,
        total_cost_usd: Optional[float] = None,
        benchmark_run_id: Optional[str] = None,
        notes: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ) -> 'BenchmarkResult':
        """
        Factory method to create BenchmarkResult from benchmark run

        Automatically calculates precision, recall, F1 score, and cost per document.

        Args:
            test_dataset_id: Dataset identifier
            test_dataset_size: Number of documents
            engine: Engine name
            total_entities: Total ground truth entities
            true_positives: TP count
            false_positives: FP count
            false_negatives: FN count
            avg_latency_ms: Average latency
            ... (other optional parameters)

        Returns:
            BenchmarkResult instance
        """
        # Calculate precision, recall, F1
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0.0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0.0
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        # Calculate cost per document
        cost_per_doc = total_cost_usd / test_dataset_size if total_cost_usd and test_dataset_size > 0 else None

        return cls(
            test_dataset_id=test_dataset_id,
            test_dataset_size=test_dataset_size,
            test_dataset_type=test_dataset_type,
            engine=engine,
            engine_version=engine_version,
            engine_config=engine_config or {},
            precision=Decimal(str(round(precision, 4))),
            recall=Decimal(str(round(recall, 4))),
            f1_score=Decimal(str(round(f1_score, 4))),
            avg_latency_ms=avg_latency_ms,
            p50_latency_ms=p50_latency_ms,
            p95_latency_ms=p95_latency_ms,
            p99_latency_ms=p99_latency_ms,
            min_latency_ms=min_latency_ms,
            max_latency_ms=max_latency_ms,
            total_entities=total_entities,
            true_positives=true_positives,
            false_positives=false_positives,
            false_negatives=false_negatives,
            true_negatives=true_negatives,
            metrics_by_entity_type=metrics_by_entity_type or {},
            total_cost_usd=Decimal(str(total_cost_usd)) if total_cost_usd else None,
            cost_per_document=Decimal(str(cost_per_doc)) if cost_per_doc else None,
            benchmark_run_id=benchmark_run_id,
            notes=notes,
            extra_metadata=metadata or {},
            created_at=datetime.utcnow()
        )

    def get_accuracy(self) -> float:
        """Calculate accuracy (requires true_negatives)"""
        if self.true_negatives is None:
            return 0.0
        total = self.true_positives + self.true_negatives + self.false_positives + self.false_negatives
        if total == 0:
            return 0.0
        return (self.true_positives + self.true_negatives) / total

    def get_specificity(self) -> float:
        """Calculate specificity/true negative rate (requires true_negatives)"""
        if self.true_negatives is None:
            return 0.0
        denom = self.true_negatives + self.false_positives
        if denom == 0:
            return 0.0
        return self.true_negatives / denom

    def get_entity_type_metrics(self, entity_type: str) -> Optional[Dict[str, float]]:
        """Get metrics for specific entity type"""
        if not self.metrics_by_entity_type:
            return None
        return self.metrics_by_entity_type.get(entity_type)

    def is_statistically_significant(self, alpha: float = 0.05) -> bool:
        """Check if result is statistically significant at given alpha level"""
        if self.p_value is None:
            return False
        return float(self.p_value) < alpha

    def get_performance_rank(self, all_results: List['BenchmarkResult']) -> int:
        """
        Calculate performance rank among all results for the same dataset

        Args:
            all_results: List of all benchmark results for comparison

        Returns:
            Rank (1 = best, higher = worse)
        """
        same_dataset = [r for r in all_results if r.test_dataset_id == self.test_dataset_id]
        sorted_results = sorted(same_dataset, key=lambda r: float(r.f1_score or 0), reverse=True)
        try:
            return sorted_results.index(self) + 1
        except ValueError:
            return len(sorted_results) + 1
