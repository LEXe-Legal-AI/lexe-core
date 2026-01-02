"""
Benchmarking framework for privacy module engines.

This package provides comprehensive benchmarking capabilities to compare
the performance of different PII detection engines (spaCy vs Presidio).

Components:
- metrics: Calculate precision, recall, F1, latency statistics
- runner: Execute benchmarks on test datasets
- comparator: Compare results between engines
- selector: Select winner based on weighted metrics
- datasets: Test datasets for evaluation

Example:
    from llsearch.privacy.benchmarking import BenchmarkRunner, EngineComparator
    from llsearch.privacy.engines.spacy import SpacyEngine
    from llsearch.privacy.engines.presidio import PresidioEngine

    # Create engines
    engines = {
        'spacy': SpacyEngine(),
        'presidio': PresidioEngine(),
    }

    # Load test dataset
    from .datasets.loader import load_legal_corpus
    dataset = load_legal_corpus()

    # Run benchmarks
    runner = BenchmarkRunner(engines, dataset)
    results = await runner.run_all_benchmarks()

    # Compare and select winner
    comparator = EngineComparator()
    report = comparator.compare(results)

    print(f"Winner: {report.winner}")
    print(f"Recommendation: {report.recommendation}")
"""

from .metrics import MetricsCalculator, EntityMetrics
from .runner import BenchmarkRunner
from .comparator import EngineComparator, ComparisonReport
from .selector import WinnerSelector

__all__ = [
    'MetricsCalculator',
    'EntityMetrics',
    'BenchmarkRunner',
    'EngineComparator',
    'ComparisonReport',
    'WinnerSelector',
]
