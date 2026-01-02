"""
Unit tests for benchmark runner.

Tests:
1. test_runner_initialization
2. test_run_benchmark_single_engine
3. test_run_all_benchmarks_multiple_engines
4. test_progress_tracking
5. test_aggregate_entity_type_metrics
6. test_benchmark_result_creation
7. test_save_results_to_json
8. test_runner_with_failing_engine
9. test_benchmark_with_empty_dataset
10. test_benchmark_latency_calculation

Total: 10 tests
"""
import pytest
import asyncio
import json
import tempfile
from pathlib import Path
from llsearch.privacy.benchmarking.runner import BenchmarkRunner, BenchmarkProgress
from llsearch.privacy.benchmarking.datasets.loader import load_sample_dataset
from llsearch.privacy.pipeline.base_pipeline import DetectedEntity, EntityType, PipelineResult


class MockBenchmarkEngine:
    """Mock engine for benchmarking tests."""

    def __init__(self, name="mock_engine", accuracy=0.90, latency_ms=100.0):
        self.name = name
        self.version = "1.0.0"
        self.accuracy = accuracy
        self.latency_ms = latency_ms
        self.call_count = 0

    async def process(self, text: str, user_id: str, document_id: str = None) -> PipelineResult:
        """Mock process method with configurable accuracy."""
        import time
        import random

        self.call_count += 1

        # Simulate latency
        await asyncio.sleep(self.latency_ms / 1000.0)
        start_time = time.perf_counter()

        # Detect entities based on accuracy
        entities = []

        # Simple detection: look for patterns
        if "CF:" in text and random.random() < self.accuracy:
            # Find CF pattern
            cf_start = text.find("CF:") + 4
            cf_text = text[cf_start:cf_start+16].strip()
            if cf_text and len(cf_text) == 16:
                entities.append(DetectedEntity(
                    type=EntityType.FISCAL_CODE,
                    text=cf_text,
                    start=cf_start,
                    end=cf_start + 16,
                    confidence=self.accuracy
                ))

        # Detect PERSON entities
        if "Dr." in text or "Avv." in text or "notaio" in text:
            # Simple pattern matching
            import re
            person_pattern = r'(?:Dr\.|Avv\.|notaio)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)'
            matches = re.finditer(person_pattern, text)
            for match in matches:
                if random.random() < self.accuracy:
                    entities.append(DetectedEntity(
                        type=EntityType.PERSON,
                        text=match.group(1),
                        start=match.start(1),
                        end=match.end(1),
                        confidence=self.accuracy
                    ))

        # Detect P.IVA
        if "P.IVA" in text and random.random() < self.accuracy:
            piva_start = text.find("P.IVA") + 7
            piva_text = text[piva_start:piva_start+11].strip()
            if piva_text and piva_text.isdigit():
                entities.append(DetectedEntity(
                    type=EntityType.VAT_NUMBER,
                    text=piva_text,
                    start=piva_start,
                    end=piva_start + 11,
                    confidence=self.accuracy
                ))

        processing_time = (time.perf_counter() - start_time) * 1000

        return PipelineResult(
            original_text=text,
            anonymized_text="",  # Not needed for benchmarking
            entities=entities,
            success=True,
            error_message=None,
            processing_time_ms=processing_time,
            metadata={
                'engine_name': self.name,
                'engine_version': self.version
            }
        )


class TestBenchmarkRunner:
    """Test suite for BenchmarkRunner class."""

    @pytest.fixture
    def mock_engine_high_accuracy(self):
        """Mock engine with high accuracy."""
        return MockBenchmarkEngine(name="high_accuracy", accuracy=0.95, latency_ms=50.0)

    @pytest.fixture
    def mock_engine_low_accuracy(self):
        """Mock engine with lower accuracy."""
        return MockBenchmarkEngine(name="low_accuracy", accuracy=0.70, latency_ms=80.0)

    @pytest.fixture
    def sample_dataset(self):
        """Sample dataset for testing."""
        return load_sample_dataset()

    @pytest.fixture
    def small_dataset(self):
        """Small dataset for quick testing."""
        return [
            {
                'document_id': 'test_001',
                'text': 'Il Dr. Mario Rossi (CF: RSSMRA85T10A562S) lavora a Milano.',
                'entities': [
                    {'type': 'PERSON', 'start': 7, 'end': 18},
                    {'type': 'CF', 'start': 24, 'end': 40},
                ]
            },
            {
                'document_id': 'test_002',
                'text': 'Acme S.p.A. (P.IVA: 12345678901) è una società.',
                'entities': [
                    {'type': 'ORG', 'start': 0, 'end': 11},
                    {'type': 'PIVA', 'start': 20, 'end': 31},
                ]
            },
        ]

    # =========================================================================
    # TEST 1-3: Runner Initialization and Execution
    # =========================================================================

    def test_runner_initialization(self, mock_engine_high_accuracy, small_dataset):
        """Test BenchmarkRunner initialization."""
        engines = {'test_engine': mock_engine_high_accuracy}
        runner = BenchmarkRunner(engines=engines, dataset=small_dataset)

        assert runner.engines == engines
        assert runner.dataset == small_dataset
        assert runner.calculator is not None
        assert runner.progress_callback is None

    @pytest.mark.asyncio
    async def test_run_benchmark_single_engine(self, mock_engine_high_accuracy, small_dataset):
        """Test running benchmark on single engine."""
        engine = mock_engine_high_accuracy
        runner = BenchmarkRunner(engines={'test': engine}, dataset=small_dataset)

        result = await runner.run_benchmark('test', engine)

        # Verify result structure
        assert result.engine == 'test'
        assert result.engine_version == '1.0.0'
        assert result.test_dataset_size == 2
        assert result.test_dataset_id == 'legal_corpus_v1'

        # Verify metrics
        assert 0.0 <= result.precision <= 1.0
        assert 0.0 <= result.recall <= 1.0
        assert 0.0 <= result.f1_score <= 1.0

        # Verify latency metrics
        assert result.avg_latency_ms > 0
        assert result.p50_latency_ms > 0
        assert result.p95_latency_ms > 0
        assert result.p99_latency_ms > 0

        # Verify confusion matrix
        assert result.true_positives >= 0
        assert result.false_positives >= 0
        assert result.false_negatives >= 0

    @pytest.mark.asyncio
    async def test_run_all_benchmarks_multiple_engines(self, mock_engine_high_accuracy, mock_engine_low_accuracy, small_dataset):
        """Test running benchmarks on multiple engines."""
        engines = {
            'high_accuracy': mock_engine_high_accuracy,
            'low_accuracy': mock_engine_low_accuracy,
        }
        runner = BenchmarkRunner(engines=engines, dataset=small_dataset)

        results = await runner.run_all_benchmarks()

        # Verify both engines ran
        assert len(results) == 2
        assert 'high_accuracy' in results
        assert 'low_accuracy' in results

        # Verify high accuracy engine performed better
        high_result = results['high_accuracy']
        low_result = results['low_accuracy']

        # Both should have valid results
        assert high_result.f1_score >= 0
        assert low_result.f1_score >= 0

    # =========================================================================
    # TEST 4-6: Progress Tracking and Metrics Aggregation
    # =========================================================================

    @pytest.mark.asyncio
    async def test_progress_tracking(self, mock_engine_high_accuracy, small_dataset):
        """Test progress tracking callback."""
        progress_updates = []

        def progress_callback(progress: BenchmarkProgress):
            progress_updates.append({
                'total': progress.total_documents,
                'processed': progress.processed_documents,
                'engine': progress.current_engine,
                'percentage': progress.progress_percentage
            })

        runner = BenchmarkRunner(
            engines={'test': mock_engine_high_accuracy},
            dataset=small_dataset,
            progress_callback=progress_callback
        )

        await runner.run_benchmark('test', mock_engine_high_accuracy)

        # Verify progress updates
        assert len(progress_updates) >= 2  # At least 2 updates for 2 documents
        assert progress_updates[-1]['processed'] == 2
        assert progress_updates[-1]['percentage'] == 100.0

    def test_aggregate_entity_type_metrics(self, mock_engine_high_accuracy, small_dataset):
        """Test aggregation of per-entity-type metrics."""
        runner = BenchmarkRunner(engines={'test': mock_engine_high_accuracy}, dataset=small_dataset)

        # Simulate per-document metrics
        metrics_list = [
            {
                'overall': {'true_positives': 2, 'false_positives': 0, 'false_negatives': 0},
                'by_entity_type': {
                    'PERSON': type('EntityMetrics', (), {
                        'true_positives': 1,
                        'false_positives': 0,
                        'false_negatives': 0
                    })(),
                    'CF': type('EntityMetrics', (), {
                        'true_positives': 1,
                        'false_positives': 0,
                        'false_negatives': 0
                    })(),
                }
            },
            {
                'overall': {'true_positives': 1, 'false_positives': 1, 'false_negatives': 1},
                'by_entity_type': {
                    'ORG': type('EntityMetrics', (), {
                        'true_positives': 1,
                        'false_positives': 0,
                        'false_negatives': 0
                    })(),
                    'PIVA': type('EntityMetrics', (), {
                        'true_positives': 0,
                        'false_positives': 1,
                        'false_negatives': 1
                    })(),
                }
            },
        ]

        aggregated = runner._aggregate_entity_type_metrics(metrics_list)

        # Check aggregated results
        assert 'PERSON' in aggregated
        assert 'CF' in aggregated
        assert 'ORG' in aggregated
        assert 'PIVA' in aggregated

        # Verify PERSON metrics
        assert aggregated['PERSON']['true_positives'] == 1
        assert aggregated['PERSON']['precision'] == 1.0

    @pytest.mark.asyncio
    async def test_benchmark_result_creation(self, mock_engine_high_accuracy, small_dataset):
        """Test that BenchmarkResult is properly created."""
        runner = BenchmarkRunner(engines={'test': mock_engine_high_accuracy}, dataset=small_dataset)

        result = await runner.run_benchmark('test', mock_engine_high_accuracy)

        # Verify all required fields
        assert result.test_dataset_id is not None
        assert result.test_dataset_size > 0
        assert result.engine == 'test'
        assert result.engine_version is not None
        assert result.precision is not None
        assert result.recall is not None
        assert result.f1_score is not None
        assert result.avg_latency_ms > 0
        assert result.total_entities >= 0
        assert result.benchmark_run_id is not None
        assert result.notes is not None

    # =========================================================================
    # TEST 7-9: File I/O and Error Handling
    # =========================================================================

    @pytest.mark.asyncio
    async def test_save_results_to_json(self, mock_engine_high_accuracy, small_dataset):
        """Test saving benchmark results to JSON file."""
        runner = BenchmarkRunner(engines={'test': mock_engine_high_accuracy}, dataset=small_dataset)
        results = await runner.run_all_benchmarks()

        # Save to temporary file
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
            temp_file = f.name

        try:
            await runner.save_results(results, temp_file)

            # Verify file was created
            assert Path(temp_file).exists()

            # Load and verify content
            with open(temp_file, 'r', encoding='utf-8') as f:
                loaded_results = json.load(f)

            assert 'test' in loaded_results
            assert 'engine' in loaded_results['test']
            assert 'f1_score' in loaded_results['test']
            assert 'precision' in loaded_results['test']
            assert 'recall' in loaded_results['test']
        finally:
            # Cleanup
            if Path(temp_file).exists():
                Path(temp_file).unlink()

    @pytest.mark.asyncio
    async def test_runner_with_failing_engine(self, small_dataset):
        """Test runner handles engine failures gracefully."""
        class FailingEngine:
            def __init__(self):
                self.name = "failing_engine"
                self.version = "1.0.0"

            async def process(self, text: str, user_id: str, document_id: str = None):
                raise RuntimeError("Engine failed!")

        runner = BenchmarkRunner(engines={'failing': FailingEngine()}, dataset=small_dataset)

        # Should raise exception during benchmark
        with pytest.raises(RuntimeError):
            await runner.run_benchmark('failing', FailingEngine())

    @pytest.mark.asyncio
    async def test_benchmark_with_empty_dataset(self, mock_engine_high_accuracy):
        """Test benchmark with empty dataset."""
        runner = BenchmarkRunner(engines={'test': mock_engine_high_accuracy}, dataset=[])

        result = await runner.run_benchmark('test', mock_engine_high_accuracy)

        # Should handle gracefully
        assert result.test_dataset_size == 0
        assert result.total_entities == 0

    # =========================================================================
    # TEST 10: Latency Calculation
    # =========================================================================

    @pytest.mark.asyncio
    async def test_benchmark_latency_calculation(self, small_dataset):
        """Test latency measurement accuracy."""
        class SlowEngine:
            def __init__(self):
                self.name = "slow_engine"
                self.version = "1.0.0"

            async def process(self, text: str, user_id: str, document_id: str = None):
                # Simulate slow processing (100ms)
                await asyncio.sleep(0.1)
                return PipelineResult(
                    original_text=text,
                    anonymized_text="",
                    entities=[],
                    success=True,
                    error_message=None,
                    processing_time_ms=100.0,
                    metadata={'engine_name': self.name, 'engine_version': self.version}
                )

        runner = BenchmarkRunner(engines={'slow': SlowEngine()}, dataset=small_dataset)
        result = await runner.run_benchmark('slow', SlowEngine())

        # Latency should be at least 100ms per document (2 documents = 200ms total)
        assert result.avg_latency_ms >= 90  # Allow some variance
        assert result.p50_latency_ms >= 90
        assert result.p95_latency_ms >= 90
