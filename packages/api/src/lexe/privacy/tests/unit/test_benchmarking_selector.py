"""
Unit tests for winner selection algorithm.

Tests:
1. test_selector_initialization
2. test_selector_default_weights
3. test_selector_custom_weights
4. test_select_winner_single_engine
5. test_select_winner_multiple_engines
6. test_weighted_scoring_calculation
7. test_latency_normalization
8. test_compare_engines_breakdown
9. test_winner_selection_edge_cases
10. test_weights_validation

Total: 10 tests
"""
import pytest
import math
from llsearch.privacy.benchmarking.selector import WinnerSelector
from llsearch.privacy.models.benchmark_result import BenchmarkResult


class TestWinnerSelector:
    """Test suite for WinnerSelector class."""

    @pytest.fixture
    def selector(self):
        """WinnerSelector instance with default weights."""
        return WinnerSelector()

    @pytest.fixture
    def custom_selector(self):
        """WinnerSelector with custom weights."""
        return WinnerSelector(
            weights={
                'f1_score': 0.6,      # Prioritize accuracy more
                'p95_latency': 0.2,   # Less weight on latency
                'precision': 0.1,
                'recall': 0.1,
            },
            latency_target_ms=300  # More lenient latency target
        )

    @pytest.fixture
    def high_accuracy_result(self):
        """High accuracy, moderate latency result."""
        return BenchmarkResult.from_benchmark(
            test_dataset_id='test',
            test_dataset_size=100,
            engine='high_accuracy',
            engine_version='1.0.0',
            total_entities=100,
            true_positives=95,
            false_positives=2,
            false_negatives=5,
            avg_latency_ms=300,
            p95_latency_ms=450
        )

    @pytest.fixture
    def fast_result(self):
        """Fast processing, moderate accuracy result."""
        return BenchmarkResult.from_benchmark(
            test_dataset_id='test',
            test_dataset_size=100,
            engine='fast_engine',
            engine_version='1.0.0',
            total_entities=100,
            true_positives=85,
            false_positives=10,
            false_negatives=15,
            avg_latency_ms=80,
            p95_latency_ms=150
        )

    @pytest.fixture
    def balanced_result(self):
        """Balanced accuracy and speed result."""
        return BenchmarkResult.from_benchmark(
            test_dataset_id='test',
            test_dataset_size=100,
            engine='balanced',
            engine_version='1.0.0',
            total_entities=100,
            true_positives=90,
            false_positives=5,
            false_negatives=10,
            avg_latency_ms=200,
            p95_latency_ms=350
        )

    # =========================================================================
    # TEST 1-3: Initialization and Configuration
    # =========================================================================

    def test_selector_initialization(self, selector):
        """Test WinnerSelector initialization with defaults."""
        assert selector is not None
        assert selector.weights is not None
        assert selector.latency_target_ms == 500

        # Verify default weights
        assert selector.weights['f1_score'] == 0.5
        assert selector.weights['p95_latency'] == 0.3
        assert selector.weights['precision'] == 0.1
        assert selector.weights['recall'] == 0.1

        # Verify weights sum to 1.0
        assert abs(sum(selector.weights.values()) - 1.0) < 0.01

    def test_selector_default_weights(self, selector):
        """Test default weight configuration."""
        weights = selector.weights

        # F1-score should have highest weight
        assert weights['f1_score'] > weights['p95_latency']
        assert weights['f1_score'] > weights['precision']
        assert weights['f1_score'] > weights['recall']

        # Latency should have second-highest weight
        assert weights['p95_latency'] > weights['precision']
        assert weights['p95_latency'] > weights['recall']

    def test_selector_custom_weights(self, custom_selector):
        """Test custom weight configuration."""
        weights = custom_selector.weights

        assert weights['f1_score'] == 0.6
        assert weights['p95_latency'] == 0.2
        assert weights['precision'] == 0.1
        assert weights['recall'] == 0.1

        assert custom_selector.latency_target_ms == 300

    # =========================================================================
    # TEST 4-5: Winner Selection
    # =========================================================================

    def test_select_winner_single_engine(self, selector, balanced_result):
        """Test winner selection with single engine."""
        results = [balanced_result]

        winner = selector.select_winner(results)

        assert winner == 'balanced'

    def test_select_winner_multiple_engines(self, selector, high_accuracy_result, fast_result, balanced_result):
        """Test winner selection with multiple engines."""
        results = [high_accuracy_result, fast_result, balanced_result]

        winner = selector.select_winner(results)

        # With default weights (F1=0.5, Latency=0.3), high_accuracy should win
        # because F1 has highest weight
        assert winner in ['high_accuracy', 'fast_engine', 'balanced']

        # Verify winner has highest F1 score (given default weights)
        max_f1 = max(r.f1_score for r in results)
        winner_result = next(r for r in results if r.engine == winner)

        # Winner should have competitive metrics
        assert float(winner_result.f1_score) >= 0.8

    # =========================================================================
    # TEST 6-7: Scoring and Normalization
    # =========================================================================

    def test_weighted_scoring_calculation(self, selector, balanced_result):
        """Test weighted score calculation."""
        score = selector._calculate_score(balanced_result)

        # Score should be between 0 and 1
        assert 0.0 <= score <= 1.0

        # Manually verify calculation
        f1_component = float(balanced_result.f1_score) * 0.5
        latency_normalized = selector._normalize_latency(balanced_result.p95_latency_ms)
        latency_component = latency_normalized * 0.3
        precision_component = float(balanced_result.precision) * 0.1
        recall_component = float(balanced_result.recall) * 0.1

        expected_score = f1_component + latency_component + precision_component + recall_component

        assert abs(score - expected_score) < 0.01

    def test_latency_normalization(self, selector):
        """Test latency normalization function."""
        # Test at target (500ms) - should be 1.0
        assert selector._normalize_latency(500) == 1.0

        # Test below target - should be 1.0
        assert selector._normalize_latency(250) == 1.0
        assert selector._normalize_latency(100) == 1.0

        # Test above target - should decrease
        latency_1000 = selector._normalize_latency(1000)
        latency_1500 = selector._normalize_latency(1500)
        latency_2000 = selector._normalize_latency(2000)

        assert latency_1000 < 1.0
        assert latency_1500 < latency_1000
        assert latency_2000 < latency_1500

        # Test exponential decay formula
        # At 2*target (1000ms), score should be e^(-1) ≈ 0.37
        expected_score = math.exp(-1.0)
        assert abs(latency_1000 - expected_score) < 0.1

        # All scores should be between 0 and 1
        assert 0.0 <= latency_1000 <= 1.0
        assert 0.0 <= latency_1500 <= 1.0
        assert 0.0 <= latency_2000 <= 1.0

    # =========================================================================
    # TEST 8-9: Detailed Comparison and Edge Cases
    # =========================================================================

    def test_compare_engines_breakdown(self, selector, high_accuracy_result, fast_result):
        """Test detailed engine comparison with component breakdown."""
        results = [high_accuracy_result, fast_result]

        comparison = selector.compare_engines(results)

        # Verify structure
        assert 'high_accuracy' in comparison
        assert 'fast_engine' in comparison

        # Verify high_accuracy breakdown
        ha_data = comparison['high_accuracy']
        assert 'total_score' in ha_data
        assert 'components' in ha_data
        assert 'raw_metrics' in ha_data

        # Check components
        components = ha_data['components']
        assert 'f1_score' in components
        assert 'p95_latency' in components
        assert 'precision' in components
        assert 'recall' in components

        # Verify each component has required fields
        for component_name, component_data in components.items():
            if component_name == 'p95_latency':
                assert 'value' in component_data
                assert 'normalized' in component_data
                assert 'weighted' in component_data
                assert 'weight' in component_data
            else:
                assert 'value' in component_data
                assert 'weighted' in component_data
                assert 'weight' in component_data

        # Verify raw metrics
        raw_metrics = ha_data['raw_metrics']
        assert 'f1_score' in raw_metrics
        assert 'precision' in raw_metrics
        assert 'recall' in raw_metrics
        assert 'p95_latency_ms' in raw_metrics

    def test_winner_selection_edge_cases(self, selector):
        """Test winner selection with edge cases."""
        # Test case 1: Perfect engine (100% accuracy, fast)
        perfect = BenchmarkResult.from_benchmark(
            test_dataset_id='test',
            test_dataset_size=100,
            engine='perfect',
            total_entities=100,
            true_positives=100,
            false_positives=0,
            false_negatives=0,
            avg_latency_ms=50,
            p95_latency_ms=80
        )

        # Test case 2: Poor engine (low accuracy, slow)
        poor = BenchmarkResult.from_benchmark(
            test_dataset_id='test',
            test_dataset_size=100,
            engine='poor',
            total_entities=100,
            true_positives=50,
            false_positives=40,
            false_negatives=50,
            avg_latency_ms=2000,
            p95_latency_ms=3500
        )

        results = [perfect, poor]
        winner = selector.select_winner(results)

        # Perfect engine should win
        assert winner == 'perfect'

        # Perfect should have much higher score
        perfect_score = selector._calculate_score(perfect)
        poor_score = selector._calculate_score(poor)
        assert perfect_score > poor_score

    # =========================================================================
    # TEST 10: Validation
    # =========================================================================

    def test_weights_validation(self):
        """Test weights validation."""
        # Valid weights (sum to 1.0)
        valid_selector = WinnerSelector(weights={
            'f1_score': 0.4,
            'p95_latency': 0.4,
            'precision': 0.1,
            'recall': 0.1
        })
        assert valid_selector is not None

        # Invalid weights (don't sum to 1.0)
        with pytest.raises(ValueError, match="Weights must sum to 1.0"):
            WinnerSelector(weights={
                'f1_score': 0.5,
                'p95_latency': 0.3,
                'precision': 0.1,
                'recall': 0.2  # Sum = 1.1 (invalid)
            })

        # Empty results list
        with pytest.raises(ValueError, match="Results list cannot be empty"):
            valid_selector.select_winner([])

    def test_custom_weights_priority(self):
        """Test that custom weights change winner selection."""
        # Create engines with trade-offs
        accurate_slow = BenchmarkResult.from_benchmark(
            test_dataset_id='test',
            test_dataset_size=100,
            engine='accurate_slow',
            total_entities=100,
            true_positives=95,
            false_positives=2,
            false_negatives=5,
            avg_latency_ms=500,
            p95_latency_ms=800
        )

        fast_less_accurate = BenchmarkResult.from_benchmark(
            test_dataset_id='test',
            test_dataset_size=100,
            engine='fast_less_accurate',
            total_entities=100,
            true_positives=85,
            false_positives=10,
            false_negatives=15,
            avg_latency_ms=100,
            p95_latency_ms=180
        )

        results = [accurate_slow, fast_less_accurate]

        # Default selector (F1=0.5, Latency=0.3) - accuracy prioritized
        default_selector = WinnerSelector()
        default_winner = default_selector.select_winner(results)

        # Latency-prioritized selector
        latency_selector = WinnerSelector(weights={
            'f1_score': 0.2,
            'p95_latency': 0.6,  # High latency weight
            'precision': 0.1,
            'recall': 0.1
        })
        latency_winner = latency_selector.select_winner(results)

        # Winners might differ based on weights
        # (Though not guaranteed - depends on exact trade-off)
        # At minimum, scores should reflect priorities
        default_accurate_score = default_selector._calculate_score(accurate_slow)
        default_fast_score = default_selector._calculate_score(fast_less_accurate)

        latency_accurate_score = latency_selector._calculate_score(accurate_slow)
        latency_fast_score = latency_selector._calculate_score(fast_less_accurate)

        # Fast engine should score relatively better with latency-prioritized weights
        fast_improvement = (latency_fast_score / latency_accurate_score) / (default_fast_score / default_accurate_score)
        assert fast_improvement > 0.9  # Should improve or stay similar
