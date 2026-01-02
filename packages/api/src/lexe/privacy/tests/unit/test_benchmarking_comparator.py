"""
Unit tests for engine comparator and reporting.

Tests:
1. test_comparator_initialization
2. test_compare_two_engines
3. test_statistical_significance_testing
4. test_generate_recommendation_winner
5. test_generate_recommendation_quality_levels
6. test_html_report_generation
7. test_comparison_report_structure
8. test_compare_multiple_engines
9. test_comparison_with_ties
10. test_recommendation_edge_cases

Total: 10 tests
"""
import pytest
import tempfile
from pathlib import Path
from llsearch.privacy.benchmarking.comparator import EngineComparator, ComparisonReport
from llsearch.privacy.models.benchmark_result import BenchmarkResult


class TestEngineComparator:
    """Test suite for EngineComparator class."""

    @pytest.fixture
    def comparator(self):
        """EngineComparator instance."""
        return EngineComparator()

    @pytest.fixture
    def high_performance_result(self):
        """High-performance benchmark result."""
        return BenchmarkResult.from_benchmark(
            test_dataset_id='legal_corpus_v1',
            test_dataset_size=100,
            test_dataset_type='mixed_legal',
            engine='spacy',
            engine_version='1.0.0',
            total_entities=250,
            true_positives=230,
            false_positives=10,
            false_negatives=20,
            avg_latency_ms=150,
            p50_latency_ms=120,
            p95_latency_ms=280,
            p99_latency_ms=350,
            benchmark_run_id='run_001',
            notes='High-performance engine test'
        )

    @pytest.fixture
    def low_performance_result(self):
        """Lower-performance benchmark result."""
        return BenchmarkResult.from_benchmark(
            test_dataset_id='legal_corpus_v1',
            test_dataset_size=100,
            test_dataset_type='mixed_legal',
            engine='presidio',
            engine_version='1.0.0',
            total_entities=250,
            true_positives=200,
            false_positives=30,
            false_negatives=50,
            avg_latency_ms=250,
            p50_latency_ms=220,
            p95_latency_ms=480,
            p99_latency_ms=600,
            benchmark_run_id='run_001',
            notes='Lower-performance engine test'
        )

    @pytest.fixture
    def excellent_result(self):
        """Excellent-quality benchmark result (F1 >= 0.90)."""
        return BenchmarkResult.from_benchmark(
            test_dataset_id='legal_corpus_v1',
            test_dataset_size=100,
            engine='excellent_engine',
            engine_version='1.0.0',
            total_entities=250,
            true_positives=230,
            false_positives=5,
            false_negatives=20,
            avg_latency_ms=120,
            p95_latency_ms=250
        )

    @pytest.fixture
    def good_result(self):
        """Good-quality benchmark result (0.85 <= F1 < 0.90)."""
        return BenchmarkResult.from_benchmark(
            test_dataset_id='legal_corpus_v1',
            test_dataset_size=100,
            engine='good_engine',
            engine_version='1.0.0',
            total_entities=250,
            true_positives=215,
            false_positives=15,
            false_negatives=35,
            avg_latency_ms=180,
            p95_latency_ms=350
        )

    # =========================================================================
    # TEST 1-2: Initialization and Basic Comparison
    # =========================================================================

    def test_comparator_initialization(self, comparator):
        """Test EngineComparator initialization."""
        assert comparator is not None
        assert hasattr(comparator, 'compare')
        assert hasattr(comparator, '_test_statistical_significance')
        assert hasattr(comparator, '_generate_recommendation')

    def test_compare_two_engines(self, comparator, high_performance_result, low_performance_result):
        """Test comparing two engines."""
        results = {
            'spacy': high_performance_result,
            'presidio': low_performance_result
        }

        report = comparator.compare(results)

        # Verify report structure
        assert isinstance(report, ComparisonReport)
        assert len(report.engines) == 2
        assert report.winner in ['spacy', 'presidio']
        assert report.metrics == results
        assert isinstance(report.statistical_significance, dict)
        assert isinstance(report.recommendation, str)

        # spacy should win (higher F1)
        assert report.winner == 'spacy'

    # =========================================================================
    # TEST 3-5: Statistical Testing and Recommendations
    # =========================================================================

    def test_statistical_significance_testing(self, comparator, high_performance_result, low_performance_result):
        """Test statistical significance calculation."""
        results = {
            'spacy': high_performance_result,
            'presidio': low_performance_result
        }

        p_values = comparator._test_statistical_significance(results)

        # Should return comparison key
        assert 'spacy_vs_presidio' in p_values or 'presidio_vs_spacy' in p_values

        # P-value should be between 0 and 1
        for key, p_value in p_values.items():
            assert 0.0 <= p_value <= 1.0

    def test_generate_recommendation_winner(self, comparator, high_performance_result, low_performance_result):
        """Test recommendation generation."""
        results = {
            'spacy': high_performance_result,
            'presidio': low_performance_result
        }

        p_values = comparator._test_statistical_significance(results)
        recommendation = comparator._generate_recommendation(results, 'spacy', p_values)

        # Verify recommendation content
        assert 'spacy' in recommendation.lower()
        assert 'winner' in recommendation.lower()
        assert 'f1' in recommendation.lower() or 'f1-score' in recommendation.lower()
        assert 'latency' in recommendation.lower()

        # Check for key metrics
        assert str(high_performance_result.p95_latency_ms) in recommendation

    def test_generate_recommendation_quality_levels(self, comparator, excellent_result, good_result):
        """Test recommendation quality level descriptions."""
        # Test excellent quality (F1 >= 0.90)
        excellent_results = {'excellent': excellent_result}
        excellent_p_values = {}
        excellent_recommendation = comparator._generate_recommendation(
            excellent_results, 'excellent', excellent_p_values
        )
        assert 'excellent' in excellent_recommendation.lower()

        # Test good quality (0.85 <= F1 < 0.90)
        good_results = {'good': good_result}
        good_p_values = {}
        good_recommendation = comparator._generate_recommendation(
            good_results, 'good', good_p_values
        )
        assert 'good' in good_recommendation.lower() or 'acceptable' in good_recommendation.lower()

    # =========================================================================
    # TEST 6-7: Report Generation
    # =========================================================================

    def test_html_report_generation(self, comparator, high_performance_result, low_performance_result):
        """Test HTML report generation."""
        results = {
            'spacy': high_performance_result,
            'presidio': low_performance_result
        }

        report = comparator.compare(results)

        # Generate HTML report to temporary file
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.html') as f:
            temp_file = f.name

        try:
            comparator.generate_html_report(report, temp_file)

            # Verify file was created
            assert Path(temp_file).exists()

            # Read and verify HTML content
            with open(temp_file, 'r', encoding='utf-8') as f:
                html_content = f.read()

            # Check for essential HTML elements
            assert '<!DOCTYPE html>' in html_content
            assert '<title>Privacy Engine Benchmark Report</title>' in html_content
            assert 'spacy' in html_content.lower()
            assert 'presidio' in html_content.lower()
            assert 'f1-score' in html_content.lower()
            assert 'latency' in html_content.lower()

            # Check for winner highlighting
            assert 'winner' in html_content.lower() or 'recommended' in html_content.lower()

        finally:
            # Cleanup
            if Path(temp_file).exists():
                Path(temp_file).unlink()

    def test_comparison_report_structure(self, comparator, high_performance_result, low_performance_result):
        """Test ComparisonReport structure and fields."""
        results = {
            'spacy': high_performance_result,
            'presidio': low_performance_result
        }

        report = comparator.compare(results)

        # Verify all required fields
        assert hasattr(report, 'engines')
        assert hasattr(report, 'winner')
        assert hasattr(report, 'metrics')
        assert hasattr(report, 'statistical_significance')
        assert hasattr(report, 'recommendation')

        # Verify field types
        assert isinstance(report.engines, list)
        assert isinstance(report.winner, str)
        assert isinstance(report.metrics, dict)
        assert isinstance(report.statistical_significance, dict)
        assert isinstance(report.recommendation, str)

        # Verify content
        assert len(report.engines) == 2
        assert report.winner in report.engines
        assert len(report.metrics) == 2

    # =========================================================================
    # TEST 8-10: Edge Cases and Multiple Engines
    # =========================================================================

    def test_compare_multiple_engines(self, comparator):
        """Test comparing more than 2 engines."""
        results = {
            'engine_a': BenchmarkResult.from_benchmark(
                test_dataset_id='test',
                test_dataset_size=100,
                engine='engine_a',
                total_entities=100,
                true_positives=90,
                false_positives=5,
                false_negatives=10,
                avg_latency_ms=100,
                p95_latency_ms=200
            ),
            'engine_b': BenchmarkResult.from_benchmark(
                test_dataset_id='test',
                test_dataset_size=100,
                engine='engine_b',
                total_entities=100,
                true_positives=85,
                false_positives=10,
                false_negatives=15,
                avg_latency_ms=120,
                p95_latency_ms=250
            ),
            'engine_c': BenchmarkResult.from_benchmark(
                test_dataset_id='test',
                test_dataset_size=100,
                engine='engine_c',
                total_entities=100,
                true_positives=80,
                false_positives=15,
                false_negatives=20,
                avg_latency_ms=150,
                p95_latency_ms=300
            ),
        }

        report = comparator.compare(results)

        # Should still produce valid report
        assert len(report.engines) == 3
        assert report.winner in ['engine_a', 'engine_b', 'engine_c']
        assert len(report.metrics) == 3

        # engine_a should win (highest F1)
        assert report.winner == 'engine_a'

    def test_comparison_with_ties(self, comparator):
        """Test comparison when engines have very similar performance."""
        results = {
            'engine_a': BenchmarkResult.from_benchmark(
                test_dataset_id='test',
                test_dataset_size=100,
                engine='engine_a',
                total_entities=100,
                true_positives=90,
                false_positives=5,
                false_negatives=10,
                avg_latency_ms=100,
                p95_latency_ms=200
            ),
            'engine_b': BenchmarkResult.from_benchmark(
                test_dataset_id='test',
                test_dataset_size=100,
                engine='engine_b',
                total_entities=100,
                true_positives=90,
                false_positives=5,
                false_negatives=10,
                avg_latency_ms=110,  # Slightly slower
                p95_latency_ms=210
            ),
        }

        report = comparator.compare(results)

        # Should still pick a winner (even if tied on F1, latency matters)
        assert report.winner in ['engine_a', 'engine_b']
        assert isinstance(report.recommendation, str)

        # Statistical significance should show no significant difference
        p_values = comparator._test_statistical_significance(results)
        for p_value in p_values.values():
            assert p_value > 0.05  # Not statistically significant

    def test_recommendation_edge_cases(self, comparator):
        """Test recommendation generation with edge cases."""
        # Test case 1: Very low F1 (needs improvement)
        low_f1_result = BenchmarkResult.from_benchmark(
            test_dataset_id='test',
            test_dataset_size=100,
            engine='low_f1',
            total_entities=100,
            true_positives=50,
            false_positives=30,
            false_negatives=50,
            avg_latency_ms=100,
            p95_latency_ms=200
        )

        recommendation = comparator._generate_recommendation(
            {'low_f1': low_f1_result}, 'low_f1', {}
        )
        assert 'needs improvement' in recommendation.lower() or 'acceptable' in recommendation.lower()

        # Test case 2: Very high latency (performance warning)
        high_latency_result = BenchmarkResult.from_benchmark(
            test_dataset_id='test',
            test_dataset_size=100,
            engine='high_latency',
            total_entities=100,
            true_positives=90,
            false_positives=5,
            false_negatives=10,
            avg_latency_ms=2000,
            p95_latency_ms=3500  # Very high latency
        )

        recommendation = comparator._generate_recommendation(
            {'high_latency': high_latency_result}, 'high_latency', {}
        )
        assert 'optimization' in recommendation.lower() or 'performance' in recommendation.lower()

        # Test case 3: Perfect performance (excellent)
        perfect_result = BenchmarkResult.from_benchmark(
            test_dataset_id='test',
            test_dataset_size=100,
            engine='perfect',
            total_entities=100,
            true_positives=95,
            false_positives=0,
            false_negatives=5,
            avg_latency_ms=80,
            p95_latency_ms=150
        )

        recommendation = comparator._generate_recommendation(
            {'perfect': perfect_result}, 'perfect', {}
        )
        assert 'excellent' in recommendation.lower()
        assert str(perfect_result.p95_latency_ms) in recommendation
