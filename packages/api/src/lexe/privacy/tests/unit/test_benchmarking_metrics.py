"""
Unit tests for benchmarking metrics calculation.

Tests:
1. test_calculate_metrics_perfect_match
2. test_calculate_metrics_with_fp_fn
3. test_calculate_metrics_empty_predictions
4. test_latency_stats_calculation
5. test_latency_stats_empty_list
6. test_confidence_stats_calculation
7. test_per_entity_type_metrics
8. test_to_comparable_set_conversion
9. test_confusion_matrix_validation
10. test_metrics_edge_cases

Total: 10 tests
"""
import pytest
from llsearch.privacy.benchmarking.metrics import MetricsCalculator, EntityMetrics
from llsearch.privacy.pipeline.base_pipeline import DetectedEntity, EntityType


class TestMetricsCalculator:
    """Test suite for MetricsCalculator class."""

    @pytest.fixture
    def calculator(self):
        """MetricsCalculator instance."""
        return MetricsCalculator()

    @pytest.fixture
    def sample_predicted_entities(self):
        """Sample predicted entities."""
        return [
            DetectedEntity(
                type=EntityType.PERSON,
                text="Mario Rossi",
                start=10,
                end=21,
                confidence=0.95
            ),
            DetectedEntity(
                type=EntityType.FISCAL_CODE,
                text="RSSMRA85T10A562S",
                start=27,
                end=43,
                confidence=0.98
            ),
            DetectedEntity(
                type=EntityType.ORGANIZATION,
                text="Tribunale di Milano",
                start=94,
                end=115,
                confidence=0.92
            ),
        ]

    @pytest.fixture
    def sample_ground_truth(self):
        """Sample ground truth entities."""
        return [
            {'type': 'PERSON', 'start': 10, 'end': 21, 'text': 'Mario Rossi'},
            {'type': 'CF', 'start': 27, 'end': 43, 'text': 'RSSMRA85T10A562S'},
            {'type': 'ORG', 'start': 94, 'end': 115, 'text': 'Tribunale di Milano'},
        ]

    # =========================================================================
    # TEST 1-3: Overall Metrics Calculation
    # =========================================================================

    def test_calculate_metrics_perfect_match(self, calculator, sample_predicted_entities, sample_ground_truth):
        """Test metrics calculation with perfect match (100% accuracy)."""
        metrics = calculator.calculate_metrics(
            predicted=sample_predicted_entities,
            ground_truth=sample_ground_truth
        )

        # Check overall metrics
        assert metrics['overall']['precision'] == 1.0
        assert metrics['overall']['recall'] == 1.0
        assert metrics['overall']['f1_score'] == 1.0
        assert metrics['overall']['true_positives'] == 3
        assert metrics['overall']['false_positives'] == 0
        assert metrics['overall']['false_negatives'] == 0

        # Check per-entity metrics
        assert 'PERSON' in metrics['by_entity_type']
        assert 'CF' in metrics['by_entity_type']
        assert 'ORG' in metrics['by_entity_type']

    def test_calculate_metrics_with_fp_fn(self, calculator):
        """Test metrics calculation with false positives and false negatives."""
        # Predicted: 3 entities (1 correct, 1 FP, 1 missing)
        predicted = [
            DetectedEntity(
                type=EntityType.PERSON,
                text="Mario Rossi",
                start=10,
                end=21,
                confidence=0.95
            ),
            DetectedEntity(
                type=EntityType.PERSON,
                text="WRONG",  # False positive
                start=100,
                end=105,
                confidence=0.80
            ),
        ]

        # Ground truth: 2 entities (1 correct, 1 missed)
        ground_truth = [
            {'type': 'PERSON', 'start': 10, 'end': 21, 'text': 'Mario Rossi'},
            {'type': 'CF', 'start': 50, 'end': 66, 'text': 'RSSMRA85T10A562S'},  # Missed (FN)
        ]

        metrics = calculator.calculate_metrics(
            predicted=predicted,
            ground_truth=ground_truth
        )

        # Check confusion matrix
        assert metrics['overall']['true_positives'] == 1
        assert metrics['overall']['false_positives'] == 1
        assert metrics['overall']['false_negatives'] == 1

        # Check derived metrics
        assert metrics['overall']['precision'] == 0.5  # TP/(TP+FP) = 1/2
        assert metrics['overall']['recall'] == 0.5    # TP/(TP+FN) = 1/2
        assert metrics['overall']['f1_score'] == 0.5  # 2*(P*R)/(P+R) = 2*(0.5*0.5)/(0.5+0.5)

    def test_calculate_metrics_empty_predictions(self, calculator, sample_ground_truth):
        """Test metrics with empty predictions (all false negatives)."""
        metrics = calculator.calculate_metrics(
            predicted=[],
            ground_truth=sample_ground_truth
        )

        assert metrics['overall']['true_positives'] == 0
        assert metrics['overall']['false_positives'] == 0
        assert metrics['overall']['false_negatives'] == 3
        assert metrics['overall']['precision'] == 0.0
        assert metrics['overall']['recall'] == 0.0
        assert metrics['overall']['f1_score'] == 0.0

    # =========================================================================
    # TEST 4-6: Latency and Confidence Statistics
    # =========================================================================

    def test_latency_stats_calculation(self, calculator):
        """Test latency statistics calculation."""
        latencies = [100.0, 150.0, 200.0, 250.0, 300.0, 350.0, 400.0, 450.0, 500.0, 1000.0]

        stats = calculator.calculate_latency_stats(latencies)

        assert stats['mean'] == pytest.approx(370.0, rel=1e-2)
        assert stats['median'] == pytest.approx(325.0, rel=1e-2)
        assert stats['p50'] == pytest.approx(325.0, rel=1e-2)
        # P95 should be between 500 and 1000 (95th percentile of 10 values)
        assert 500.0 <= stats['p95'] <= 1000.0
        # P99 should be close to max (99th percentile of 10 values)
        assert 900.0 <= stats['p99'] <= 1000.0
        assert stats['min'] == 100.0
        assert stats['max'] == 1000.0
        assert stats['std'] > 0

    def test_latency_stats_empty_list(self, calculator):
        """Test latency statistics with empty list."""
        stats = calculator.calculate_latency_stats([])

        assert stats['mean'] == 0.0
        assert stats['median'] == 0.0
        assert stats['p50'] == 0.0
        assert stats['p95'] == 0.0
        assert stats['p99'] == 0.0
        assert stats['std'] == 0.0
        assert stats['min'] == 0.0
        assert stats['max'] == 0.0

    def test_confidence_stats_calculation(self, calculator, sample_predicted_entities):
        """Test confidence score statistics calculation."""
        stats = calculator.calculate_confidence_stats(sample_predicted_entities)

        assert 'mean' in stats
        assert 'median' in stats
        assert 'min' in stats
        assert 'max' in stats

        assert stats['mean'] == pytest.approx(0.95, rel=1e-2)
        assert stats['min'] == 0.92
        assert stats['max'] == 0.98

    # =========================================================================
    # TEST 7-8: Per-Entity Type Metrics
    # =========================================================================

    def test_per_entity_type_metrics(self, calculator):
        """Test per-entity-type metrics calculation."""
        predicted = [
            DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=0, end=11, confidence=0.95),
            DetectedEntity(type=EntityType.PERSON, text="Laura Bianchi", start=20, end=33, confidence=0.90),
            DetectedEntity(type=EntityType.FISCAL_CODE, text="RSSMRA85T10A562S", start=40, end=56, confidence=0.98),
        ]

        ground_truth = [
            {'type': 'PERSON', 'start': 0, 'end': 11, 'text': 'Mario Rossi'},
            {'type': 'PERSON', 'start': 20, 'end': 33, 'text': 'Laura Bianchi'},
            {'type': 'CF', 'start': 40, 'end': 56, 'text': 'RSSMRA85T10A562S'},
            {'type': 'CF', 'start': 60, 'end': 76, 'text': 'BNCLRA80A41F205Z'},  # Missed CF
        ]

        metrics = calculator.calculate_metrics(predicted, ground_truth)

        # Check PERSON metrics (100% accuracy)
        person_metrics = metrics['by_entity_type']['PERSON']
        assert person_metrics.precision == 1.0
        assert person_metrics.recall == 1.0
        assert person_metrics.f1_score == 1.0
        assert person_metrics.true_positives == 2
        assert person_metrics.false_positives == 0
        assert person_metrics.false_negatives == 0

        # Check CF metrics (1 detected, 1 missed)
        cf_metrics = metrics['by_entity_type']['CF']
        assert cf_metrics.precision == 1.0
        assert cf_metrics.recall == 0.5
        assert cf_metrics.f1_score == pytest.approx(0.6667, rel=1e-2)
        assert cf_metrics.true_positives == 1
        assert cf_metrics.false_positives == 0
        assert cf_metrics.false_negatives == 1

    def test_to_comparable_set_conversion(self, calculator):
        """Test conversion to comparable set."""
        # Test with DetectedEntity objects
        entities = [
            DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=10, end=21, confidence=0.95),
            DetectedEntity(type=EntityType.FISCAL_CODE, text="RSSMRA85T10A562S", start=27, end=43, confidence=0.98),
        ]

        comparable_set = calculator._to_comparable_set(entities)

        assert len(comparable_set) == 2
        assert ('PERSON', 10, 21) in comparable_set
        assert ('CF', 27, 43) in comparable_set

        # Test with ground truth dicts
        ground_truth = [
            {'type': 'PERSON', 'start': 10, 'end': 21, 'text': 'Mario Rossi'},
            {'type': 'CF', 'start': 27, 'end': 43, 'text': 'RSSMRA85T10A562S'},
        ]

        gt_set = calculator._to_comparable_set(ground_truth)

        assert len(gt_set) == 2
        assert comparable_set == gt_set

    # =========================================================================
    # TEST 9-10: Edge Cases and Validation
    # =========================================================================

    def test_confusion_matrix_validation(self, calculator):
        """Test confusion matrix consistency."""
        predicted = [
            DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=0, end=11, confidence=0.95),
            DetectedEntity(type=EntityType.PERSON, text="WRONG1", start=20, end=26, confidence=0.80),
            DetectedEntity(type=EntityType.PERSON, text="WRONG2", start=30, end=36, confidence=0.75),
        ]

        ground_truth = [
            {'type': 'PERSON', 'start': 0, 'end': 11, 'text': 'Mario Rossi'},
            {'type': 'CF', 'start': 40, 'end': 56, 'text': 'RSSMRA85T10A562S'},
            {'type': 'CF', 'start': 60, 'end': 76, 'text': 'BNCLRA80A41F205Z'},
        ]

        metrics = calculator.calculate_metrics(predicted, ground_truth)

        # Validate confusion matrix consistency
        tp = metrics['overall']['true_positives']
        fp = metrics['overall']['false_positives']
        fn = metrics['overall']['false_negatives']

        assert tp == 1  # Only "Mario Rossi" matched
        assert fp == 2  # WRONG1 and WRONG2
        assert fn == 2  # Two missed CF entities

        # Verify relationships
        assert tp + fp == len(predicted)  # All predictions accounted for
        assert tp + fn == len(ground_truth)  # All ground truth accounted for

    def test_metrics_edge_cases(self, calculator):
        """Test edge cases: all FP, all FN, single entity, etc."""
        # Test case 1: All false positives (no ground truth)
        metrics1 = calculator.calculate_metrics(
            predicted=[DetectedEntity(type=EntityType.PERSON, text="WRONG", start=0, end=5, confidence=0.90)],
            ground_truth=[]
        )
        assert metrics1['overall']['precision'] == 0.0
        assert metrics1['overall']['recall'] == 0.0
        assert metrics1['overall']['false_positives'] == 1

        # Test case 2: Single perfect match
        metrics2 = calculator.calculate_metrics(
            predicted=[DetectedEntity(type=EntityType.PERSON, text="Mario Rossi", start=0, end=11, confidence=0.95)],
            ground_truth=[{'type': 'PERSON', 'start': 0, 'end': 11, 'text': 'Mario Rossi'}]
        )
        assert metrics2['overall']['precision'] == 1.0
        assert metrics2['overall']['recall'] == 1.0
        assert metrics2['overall']['f1_score'] == 1.0

        # Test case 3: Both empty
        metrics3 = calculator.calculate_metrics(predicted=[], ground_truth=[])
        assert metrics3['overall']['precision'] == 0.0
        assert metrics3['overall']['recall'] == 0.0
        assert metrics3['overall']['f1_score'] == 0.0
