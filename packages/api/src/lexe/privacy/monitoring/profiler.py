"""
Performance profiler for detailed pipeline stage timing

Provides high-resolution timing for each stage of the PII detection/anonymization
pipeline to identify bottlenecks and track optimization effectiveness.

Features:
- Context manager API for easy profiling
- Nested profiling support (sub-operations)
- Microsecond precision timing
- Structured output for database storage
- Cache hit/miss tracking integration

Usage:
    async with PerformanceProfiler(user_id, document_id) as profiler:
        # Cache lookup
        with profiler.stage('cache_lookup_l1'):
            result = await cache.get(key)

        # Model loading
        with profiler.stage('model_loading'):
            model = load_model()

        # Entity detection
        with profiler.stage('entity_detection'):
            with profiler.stage('primary_engine'):
                entities = await engine.detect(text)
            if fallback:
                with profiler.stage('fallback_engine'):
                    entities += await fallback.detect(text)

        # Export profile
        profile_data = profiler.export()
"""

import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from contextlib import contextmanager
from enum import Enum
import structlog

logger = structlog.get_logger(__name__)


class ProfileStage(Enum):
    """Standard profiling stages in PII pipeline"""
    # Cache operations
    CACHE_LOOKUP_L1 = "cache_lookup_l1"
    CACHE_LOOKUP_L2 = "cache_lookup_l2"
    CACHE_STORAGE = "cache_storage"

    # Model operations
    MODEL_LOADING = "model_loading"
    MODEL_INFERENCE = "model_inference"

    # Text processing
    TEXT_NORMALIZATION = "text_normalization"
    CONTEXT_DETECTION = "context_detection"

    # Entity detection
    ENTITY_DETECTION_PRIMARY = "entity_detection_primary"
    ENTITY_DETECTION_FALLBACK = "entity_detection_fallback"
    ENTITY_FILTERING = "entity_filtering"
    ENTITY_VALIDATION = "entity_validation"

    # Anonymization
    ANONYMIZATION = "anonymization"
    REPLACEMENT = "replacement"

    # Total
    TOTAL_PIPELINE = "total_pipeline"


@dataclass
class TimingData:
    """
    Timing data for a single profiling stage

    Attributes:
        stage: Stage name
        start_time_us: Start time in microseconds
        end_time_us: End time in microseconds (None if not finished)
        duration_us: Duration in microseconds (computed)
        parent: Parent stage name (for nested profiling)
        metadata: Additional context
        sub_stages: List of nested sub-stages
    """
    stage: str
    start_time_us: int
    end_time_us: Optional[int] = None
    parent: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    sub_stages: List['TimingData'] = field(default_factory=list)

    @property
    def duration_us(self) -> Optional[int]:
        """Calculate duration in microseconds"""
        if self.end_time_us is None:
            return None
        return self.end_time_us - self.start_time_us

    @property
    def duration_ms(self) -> Optional[float]:
        """Calculate duration in milliseconds"""
        dur = self.duration_us
        if dur is None:
            return None
        return dur / 1000.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for export"""
        result = {
            'stage': self.stage,
            'start_time_us': self.start_time_us,
            'end_time_us': self.end_time_us,
            'duration_us': self.duration_us,
            'duration_ms': self.duration_ms,
            'metadata': self.metadata,
        }

        if self.parent:
            result['parent'] = self.parent

        if self.sub_stages:
            result['sub_stages'] = [s.to_dict() for s in self.sub_stages]

        return result


class PerformanceProfiler:
    """
    Context manager for profiling pipeline performance

    Tracks timing for each stage of pipeline processing with high precision.
    Supports nested profiling for sub-operations.

    Attributes:
        user_id: User identifier
        document_id: Document identifier
        enabled: Whether profiling is enabled
        timings: Dictionary of stage timings
        current_stage: Current active stage (for nesting)
        cache_hit: Whether cache was hit (tracked separately)
        batch_size: Batch size (for batch operations)
        metadata: Additional metadata
    """

    def __init__(
        self,
        user_id: str,
        document_id: str,
        enabled: bool = True,
        cache_hit: Optional[bool] = None,
        batch_size: int = 1,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """
        Initialize profiler

        Args:
            user_id: User identifier
            document_id: Document identifier
            enabled: Whether to enable profiling (default: True)
            cache_hit: Cache hit flag (L1/L2)
            batch_size: Batch size for batch operations
            metadata: Additional metadata
        """
        self.user_id = user_id
        self.document_id = document_id
        self.enabled = enabled
        self.cache_hit = cache_hit
        self.batch_size = batch_size
        self.metadata = metadata or {}

        # Timing storage
        self.timings: Dict[str, TimingData] = {}
        self._stage_stack: List[str] = []  # Stack for nested stages
        self._start_time_us: Optional[int] = None
        self._end_time_us: Optional[int] = None

        self.logger = structlog.get_logger(__name__)

    async def __aenter__(self):
        """Async context manager entry"""
        if self.enabled:
            self._start_time_us = self._get_time_us()
            self.logger.debug(
                "profiler_started",
                user_id=self.user_id,
                document_id=self.document_id,
            )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.enabled:
            self._end_time_us = self._get_time_us()
            total_duration_us = self._end_time_us - self._start_time_us

            self.logger.info(
                "profiler_completed",
                user_id=self.user_id,
                document_id=self.document_id,
                total_duration_us=total_duration_us,
                total_duration_ms=total_duration_us / 1000.0,
                stages_profiled=len(self.timings),
            )

    @contextmanager
    def stage(
        self,
        stage_name: str,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """
        Context manager for profiling a single stage

        Args:
            stage_name: Stage name (use ProfileStage enum values)
            metadata: Additional metadata for this stage

        Usage:
            with profiler.stage('cache_lookup_l1', {'key': cache_key}):
                result = await cache.get(key)
        """
        if not self.enabled:
            # No-op if profiling disabled
            yield
            return

        # Determine parent (for nested stages)
        parent = self._stage_stack[-1] if self._stage_stack else None

        # Start timing
        start_time_us = self._get_time_us()
        timing = TimingData(
            stage=stage_name,
            start_time_us=start_time_us,
            parent=parent,
            metadata=metadata or {},
        )

        # Store timing immediately (so child stages can find parent)
        if not parent:
            # Top-level stage - store in timings dict
            self.timings[stage_name] = timing

        # Push to stack
        self._stage_stack.append(stage_name)

        try:
            yield timing
        finally:
            # End timing
            timing.end_time_us = self._get_time_us()

            # Pop from stack
            self._stage_stack.pop()

            # Add to parent's sub_stages if this is a child stage
            if parent:
                parent_timing = self.timings.get(parent)
                if parent_timing:
                    parent_timing.sub_stages.append(timing)

            # Log timing
            self.logger.debug(
                "stage_completed",
                stage=stage_name,
                duration_us=timing.duration_us,
                duration_ms=timing.duration_ms,
                parent=parent,
            )

    def set_cache_hit(self, cache_hit: bool, cache_level: str = 'L1'):
        """
        Set cache hit status

        Args:
            cache_hit: Whether cache was hit
            cache_level: Cache level ('L1', 'L2')
        """
        self.cache_hit = cache_hit
        self.metadata[f'cache_hit_{cache_level.lower()}'] = cache_hit

    def export(self) -> Dict[str, Any]:
        """
        Export profiling data for database storage

        Returns:
            Dictionary with:
                - user_id: User identifier
                - document_id: Document identifier
                - total_duration_us: Total duration (microseconds)
                - total_duration_ms: Total duration (milliseconds)
                - stage_timings: Dictionary of stage timings
                - cache_hit: Cache hit flag
                - batch_size: Batch size
                - metadata: Additional metadata
        """
        if not self.enabled or self._start_time_us is None:
            return {}

        total_duration_us = (
            (self._end_time_us or self._get_time_us()) - self._start_time_us
        )

        # Build stage breakdown
        stage_breakdown = {}
        for stage_name, timing in self.timings.items():
            stage_breakdown[stage_name] = timing.to_dict()

        return {
            'user_id': self.user_id,
            'document_id': self.document_id,
            'timestamp': time.time(),
            'total_duration_us': total_duration_us,
            'total_duration_ms': total_duration_us / 1000.0,
            'stage_timings': stage_breakdown,
            'cache_hit': self.cache_hit,
            'batch_size': self.batch_size,
            'metadata': self.metadata,
        }

    def get_stage_timing(self, stage_name: str) -> Optional[TimingData]:
        """
        Get timing data for specific stage

        Args:
            stage_name: Stage name

        Returns:
            TimingData if stage was profiled, None otherwise
        """
        return self.timings.get(stage_name)

    def get_total_duration_ms(self) -> Optional[float]:
        """Get total duration in milliseconds"""
        if self._start_time_us is None or self._end_time_us is None:
            return None
        return (self._end_time_us - self._start_time_us) / 1000.0

    @staticmethod
    def _get_time_us() -> int:
        """Get current time in microseconds (high-resolution)"""
        return int(time.perf_counter() * 1_000_000)


class CacheMetricsTracker:
    """
    Tracks cache performance metrics

    Metrics tracked:
    - L1 hit rate (in-memory cache)
    - L2 hit rate (database cache)
    - Combined hit rate
    - Average latency (hit vs miss)
    - Cache size and eviction count
    - Throughput (ops/sec)

    Integration:
        tracker = CacheMetricsTracker()

        # Track cache operation
        tracker.record_operation(
            cache_level='L1',
            hit=True,
            latency_us=150
        )

        # Get metrics
        metrics = tracker.export()
    """

    def __init__(self):
        """Initialize cache metrics tracker"""
        # L1 metrics (in-memory)
        self.l1_hits = 0
        self.l1_misses = 0
        self.l1_latency_total_us = 0
        self.l1_operations = 0

        # L2 metrics (database)
        self.l2_hits = 0
        self.l2_misses = 0
        self.l2_latency_total_us = 0
        self.l2_operations = 0

        # Cache state
        self.cache_size = 0
        self.eviction_count = 0

        # Timing
        self._start_time = time.time()

        self.logger = structlog.get_logger(__name__)

    def record_operation(
        self,
        cache_level: str,
        hit: bool,
        latency_us: int,
    ):
        """
        Record a cache operation

        Args:
            cache_level: 'L1' (memory) or 'L2' (database)
            hit: Whether cache was hit
            latency_us: Operation latency in microseconds
        """
        if cache_level.upper() == 'L1':
            self.l1_operations += 1
            self.l1_latency_total_us += latency_us
            if hit:
                self.l1_hits += 1
            else:
                self.l1_misses += 1
        elif cache_level.upper() == 'L2':
            self.l2_operations += 1
            self.l2_latency_total_us += latency_us
            if hit:
                self.l2_hits += 1
            else:
                self.l2_misses += 1

    def record_eviction(self):
        """Record a cache eviction event"""
        self.eviction_count += 1

    def update_cache_size(self, size: int):
        """Update current cache size"""
        self.cache_size = size

    def get_l1_hit_rate(self) -> float:
        """Calculate L1 cache hit rate (0.0 to 1.0)"""
        if self.l1_operations == 0:
            return 0.0
        return self.l1_hits / self.l1_operations

    def get_l2_hit_rate(self) -> float:
        """Calculate L2 cache hit rate (0.0 to 1.0)"""
        if self.l2_operations == 0:
            return 0.0
        return self.l2_hits / self.l2_operations

    def get_combined_hit_rate(self) -> float:
        """Calculate combined hit rate (L1 + L2)"""
        total_ops = self.l1_operations + self.l2_operations
        total_hits = self.l1_hits + self.l2_hits
        if total_ops == 0:
            return 0.0
        return total_hits / total_ops

    def get_avg_latency_us(self, cache_level: str) -> float:
        """
        Calculate average latency for cache level

        Args:
            cache_level: 'L1' or 'L2'

        Returns:
            Average latency in microseconds
        """
        if cache_level.upper() == 'L1':
            if self.l1_operations == 0:
                return 0.0
            return self.l1_latency_total_us / self.l1_operations
        elif cache_level.upper() == 'L2':
            if self.l2_operations == 0:
                return 0.0
            return self.l2_latency_total_us / self.l2_operations
        return 0.0

    def get_throughput_ops_per_sec(self) -> float:
        """Calculate throughput in operations per second"""
        elapsed = time.time() - self._start_time
        if elapsed == 0:
            return 0.0
        total_ops = self.l1_operations + self.l2_operations
        return total_ops / elapsed

    def export(self) -> Dict[str, Any]:
        """
        Export metrics for monitoring dashboard

        Returns:
            Dictionary with all cache metrics
        """
        return {
            # L1 metrics
            'l1_hits': self.l1_hits,
            'l1_misses': self.l1_misses,
            'l1_hit_rate': self.get_l1_hit_rate(),
            'l1_avg_latency_us': self.get_avg_latency_us('L1'),
            'l1_avg_latency_ms': self.get_avg_latency_us('L1') / 1000.0,

            # L2 metrics
            'l2_hits': self.l2_hits,
            'l2_misses': self.l2_misses,
            'l2_hit_rate': self.get_l2_hit_rate(),
            'l2_avg_latency_us': self.get_avg_latency_us('L2'),
            'l2_avg_latency_ms': self.get_avg_latency_us('L2') / 1000.0,

            # Combined metrics
            'combined_hit_rate': self.get_combined_hit_rate(),
            'total_operations': self.l1_operations + self.l2_operations,

            # Cache state
            'cache_size': self.cache_size,
            'eviction_count': self.eviction_count,

            # Performance
            'throughput_ops_per_sec': self.get_throughput_ops_per_sec(),
            'uptime_seconds': time.time() - self._start_time,
        }

    def reset(self):
        """Reset all metrics (useful for testing)"""
        self.l1_hits = 0
        self.l1_misses = 0
        self.l1_latency_total_us = 0
        self.l1_operations = 0

        self.l2_hits = 0
        self.l2_misses = 0
        self.l2_latency_total_us = 0
        self.l2_operations = 0

        self.cache_size = 0
        self.eviction_count = 0
        self._start_time = time.time()

        self.logger.debug("cache_metrics_reset")
