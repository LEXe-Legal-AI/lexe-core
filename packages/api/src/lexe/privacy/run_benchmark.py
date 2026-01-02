#!/usr/bin/env python3
"""
Privacy Module Benchmark Runner - Italian Legal Documents

Compares spaCy vs Presidio PII detection engines on Italian legal corpus.

This script:
1. Checks dependencies (spaCy, Presidio)
2. Loads test dataset (10 sample documents)
3. Runs benchmarks on both engines
4. Compares results with statistical significance testing
5. Selects winner using weighted scoring (F1 50%, latency 30%, P/R 20%)
6. Generates reports (JSON, Markdown, HTML)

Usage:
    # Basic benchmark
    python run_benchmark.py

    # Custom weights
    python run_benchmark.py --f1-weight 0.6 --latency-weight 0.2

    # Dry run (check dependencies only)
    python run_benchmark.py --dry-run

Output:
    - benchmark_results.json: Raw metrics
    - benchmark_report.md: Recommendation text
    - benchmark_report.html: Visual report

Requirements:
    pip install spacy presidio-analyzer presidio-anonymizer
    python -m spacy download it_core_news_lg
"""

import asyncio
import argparse
import sys
import json
from pathlib import Path
from typing import Dict, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


def check_dependencies() -> Dict[str, bool]:
    """
    Check if required dependencies are installed.

    Returns:
        Dict with dependency names and availability status
    """
    deps = {
        'spacy': False,
        'spacy_model': False,
        'presidio_analyzer': False,
        'presidio_anonymizer': False,
    }

    # Check spaCy
    try:
        import spacy
        deps['spacy'] = True

        # Check Italian model
        try:
            spacy.load('it_core_news_lg')
            deps['spacy_model'] = True
        except OSError:
            pass
    except ImportError:
        pass

    # Check Presidio
    try:
        import presidio_analyzer
        deps['presidio_analyzer'] = True
    except ImportError:
        pass

    try:
        import presidio_anonymizer
        deps['presidio_anonymizer'] = True
    except ImportError:
        pass

    return deps


def print_dependency_status(deps: Dict[str, bool]):
    """Print dependency check results."""
    print("=" * 80)
    print("Dependency Check")
    print("=" * 80)
    print()

    for dep, available in deps.items():
        status = "✓" if available else "✗"
        print(f"  {status} {dep}")

    print()

    all_available = all(deps.values())

    if not all_available:
        print("⚠️  Missing dependencies detected!")
        print()
        print("Install with:")
        print()

        if not deps['spacy']:
            print("  pip install spacy")

        if not deps['spacy_model']:
            print("  python -m spacy download it_core_news_lg")

        if not deps['presidio_analyzer']:
            print("  pip install presidio-analyzer")

        if not deps['presidio_anonymizer']:
            print("  pip install presidio-anonymizer")

        print()
        return False

    print("✓ All dependencies available!")
    print()
    return True


async def run_benchmark(
    f1_weight: float = 0.5,
    latency_weight: float = 0.3,
    precision_weight: float = 0.1,
    recall_weight: float = 0.1,
    output_dir: Optional[Path] = None
) -> int:
    """
    Run benchmark comparing spaCy vs Presidio.

    Args:
        f1_weight: Weight for F1-score in winner selection (default: 0.5)
        latency_weight: Weight for latency in winner selection (default: 0.3)
        precision_weight: Weight for precision (default: 0.1)
        recall_weight: Weight for recall (default: 0.1)
        output_dir: Directory to save reports (default: current dir)

    Returns:
        Exit code (0 for success, 1 for error)
    """
    try:
        # Import dependencies (after check)
        from llsearch.privacy.engines.spacy import SpacyEngine
        from llsearch.privacy.engines.presidio import PresidioEngine
        from llsearch.privacy.benchmarking import (
            BenchmarkRunner,
            EngineComparator,
            WinnerSelector
        )
        from llsearch.privacy.benchmarking.datasets import load_sample_dataset

        print("=" * 80)
        print("Privacy Module Benchmarking - spaCy vs Presidio")
        print("=" * 80)
        print()

        # Load dataset
        print("📦 Loading test dataset...")
        dataset = load_sample_dataset()
        print(f"   ✓ Loaded {len(dataset)} annotated legal documents")
        print()

        # Initialize engines
        print("🚀 Initializing engines...")
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
        print(f"   ✓ Initialized {len(engines)} engines")
        print()

        # Run benchmarks
        print("⚙️  Running benchmarks...")
        print("   This may take a few minutes...")
        print()

        runner = BenchmarkRunner(engines, dataset)
        results = await runner.run_all_benchmarks()

        # Print results summary
        print()
        print("=" * 80)
        print("📊 Benchmark Results")
        print("=" * 80)
        print()

        for engine_name, result in results.items():
            print(f"{'━' * 40}")
            print(f"{engine_name.upper()}")
            print(f"{'━' * 40}")
            print(f"  Precision:      {result.precision:.3f}")
            print(f"  Recall:         {result.recall:.3f}")
            print(f"  F1-Score:       {result.f1_score:.3f}")
            print(f"  Avg Latency:    {result.avg_latency_ms:.1f}ms")
            print(f"  P50 Latency:    {result.p50_latency_ms:.1f}ms")
            print(f"  P95 Latency:    {result.p95_latency_ms:.1f}ms")
            print(f"  P99 Latency:    {result.p99_latency_ms:.1f}ms")
            print(f"  Total Entities: {result.total_entities}")
            print()

        # Compare and select winner
        print("=" * 80)
        print("🏆 Winner Selection")
        print("=" * 80)
        print()

        # Create winner selector with custom weights
        selector = WinnerSelector(
            weights={
                'f1_score': f1_weight,
                'p95_latency': latency_weight,
                'precision': precision_weight,
                'recall': recall_weight,
            }
        )

        # Generate comparison report
        comparator = EngineComparator()
        report = comparator.compare(results)

        print(f"Winner: {report.winner.upper()}")
        print()
        print("Scoring weights:")
        print(f"  - F1-score:  {f1_weight:.0%}")
        print(f"  - Latency:   {latency_weight:.0%}")
        print(f"  - Precision: {precision_weight:.0%}")
        print(f"  - Recall:    {recall_weight:.0%}")
        print()

        # Print recommendation
        print("=" * 80)
        print("📋 Recommendation")
        print("=" * 80)
        print()
        print(report.recommendation)
        print()

        # Save results
        print("=" * 80)
        print("💾 Saving Results")
        print("=" * 80)
        print()

        output_path = output_dir or Path.cwd()
        output_path.mkdir(parents=True, exist_ok=True)

        # Save JSON
        json_path = output_path / 'benchmark_results.json'
        results_dict = {
            engine: {
                'precision': r.precision,
                'recall': r.recall,
                'f1_score': r.f1_score,
                'avg_latency_ms': r.avg_latency_ms,
                'p95_latency_ms': r.p95_latency_ms,
                'total_entities': r.total_entities,
            }
            for engine, r in results.items()
        }
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(results_dict, f, indent=2)
        print(f"   ✓ JSON results: {json_path}")

        # Save Markdown
        md_path = output_path / 'benchmark_report.md'
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(report.recommendation)
        print(f"   ✓ Markdown report: {md_path}")

        # Save HTML
        html_path = output_path / 'benchmark_report.html'
        comparator.generate_html_report(report, html_path)
        print(f"   ✓ HTML report: {html_path}")

        print()
        print("=" * 80)
        print("✅ Benchmark Complete!")
        print("=" * 80)
        print()

        return 0

    except Exception as e:
        print()
        print("=" * 80)
        print("❌ Benchmark Failed")
        print("=" * 80)
        print()
        print(f"Error: {e}")
        print()

        import traceback
        traceback.print_exc()

        return 1


def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description='Privacy Module Benchmark Runner',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic benchmark
  python run_benchmark.py

  # Custom weights (prioritize accuracy over latency)
  python run_benchmark.py --f1-weight 0.6 --latency-weight 0.2

  # Save to specific directory
  python run_benchmark.py --output-dir results/

  # Dry run (check dependencies only)
  python run_benchmark.py --dry-run
        """
    )

    parser.add_argument(
        '--f1-weight',
        type=float,
        default=0.5,
        help='Weight for F1-score in winner selection (default: 0.5)'
    )

    parser.add_argument(
        '--latency-weight',
        type=float,
        default=0.3,
        help='Weight for latency in winner selection (default: 0.3)'
    )

    parser.add_argument(
        '--precision-weight',
        type=float,
        default=0.1,
        help='Weight for precision (default: 0.1)'
    )

    parser.add_argument(
        '--recall-weight',
        type=float,
        default=0.1,
        help='Weight for recall (default: 0.1)'
    )

    parser.add_argument(
        '--output-dir',
        type=Path,
        help='Directory to save reports (default: current directory)'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Check dependencies only, do not run benchmark'
    )

    return parser.parse_args()


def main():
    """Main entry point."""
    args = parse_args()

    print()

    # Check dependencies
    deps = check_dependencies()
    deps_ok = print_dependency_status(deps)

    if args.dry_run:
        print("Dry run complete. Exiting.")
        return 0 if deps_ok else 1

    if not deps_ok:
        print("Cannot run benchmark with missing dependencies.")
        print("Install missing packages and try again.")
        return 1

    # Validate weights sum to 1.0
    total_weight = (
        args.f1_weight +
        args.latency_weight +
        args.precision_weight +
        args.recall_weight
    )

    if abs(total_weight - 1.0) > 0.01:
        print(f"❌ Error: Weights must sum to 1.0 (current: {total_weight:.2f})")
        print()
        return 1

    # Run benchmark
    return asyncio.run(run_benchmark(
        f1_weight=args.f1_weight,
        latency_weight=args.latency_weight,
        precision_weight=args.precision_weight,
        recall_weight=args.recall_weight,
        output_dir=args.output_dir
    ))


if __name__ == '__main__':
    sys.exit(main())
