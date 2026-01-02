"""
Example usage of benchmarking framework.

This script demonstrates how to:
1. Load test dataset
2. Create engines (spaCy and Presidio)
3. Run benchmarks
4. Compare results
5. Select winner
6. Generate reports

Usage:
    cd src/llsearch/privacy/benchmarking
    python example_usage.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from llsearch.privacy.engines.spacy import SpacyEngine
from llsearch.privacy.engines.presidio import PresidioEngine
from llsearch.privacy.benchmarking import (
    BenchmarkRunner,
    EngineComparator,
    WinnerSelector
)
from llsearch.privacy.benchmarking.datasets import load_sample_dataset


async def main():
    """
    Main benchmark execution.
    """
    print("="*80)
    print("Privacy Module Benchmarking Framework")
    print("="*80)
    print()

    # 1. Load test dataset
    print("Loading test dataset...")
    dataset = load_sample_dataset()
    print(f"✓ Loaded {len(dataset)} annotated documents")
    print()

    # 2. Create engines
    print("Initializing engines...")
    engines = {
        'spacy': SpacyEngine(
            model_name='it_core_news_lg',
            confidence_threshold=0.7,
            replacement_strategy='deterministic',
        ),
        'presidio': PresidioEngine(
            model_name='it_core_news_lg',
            confidence_threshold=0.7,
            anonymization_strategy='replace',
        ),
    }
    print(f"✓ Initialized {len(engines)} engines: {', '.join(engines.keys())}")
    print()

    # 3. Run benchmarks
    print("Running benchmarks...")
    print("This may take a few minutes...")
    print()

    runner = BenchmarkRunner(engines, dataset)
    results = await runner.run_all_benchmarks()

    print()
    print("="*80)
    print("Benchmark Results Summary")
    print("="*80)
    print()

    for engine_name, result in results.items():
        print(f"{engine_name.upper()}")
        print(f"  Precision:    {result.precision:.3f}")
        print(f"  Recall:       {result.recall:.3f}")
        print(f"  F1-Score:     {result.f1_score:.3f}")
        print(f"  P95 Latency:  {result.p95_latency_ms}ms")
        print(f"  Avg Latency:  {result.avg_latency_ms}ms")
        print(f"  Total Entities: {result.total_entities}")
        print()

    # 4. Compare results and select winner
    print("="*80)
    print("Engine Comparison & Winner Selection")
    print("="*80)
    print()

    comparator = EngineComparator()
    report = comparator.compare(results)

    print(report.recommendation)
    print()

    # 5. Save results
    print("="*80)
    print("Saving Results")
    print("="*80)
    print()

    # Save JSON results
    await runner.save_results(results, 'benchmark_results.json')

    # Save markdown report
    with open('benchmark_report.md', 'w', encoding='utf-8') as f:
        f.write(report.recommendation)
    print("✓ Markdown report saved to: benchmark_report.md")

    # Save HTML report
    comparator.generate_html_report(report, 'benchmark_report.html')

    print()
    print("="*80)
    print("Benchmark Complete!")
    print("="*80)
    print()
    print(f"Winner: {report.winner.upper()}")
    print()
    print("Files generated:")
    print("  - benchmark_results.json (raw results)")
    print("  - benchmark_report.md (recommendation)")
    print("  - benchmark_report.html (visual report)")
    print()


if __name__ == '__main__':
    asyncio.run(main())
