"""
Benchmark runner for PII detection engines.

Executes benchmarks on test datasets and collects performance metrics
for multiple engines (spaCy, Presidio, etc.).

Example:
    from llsearch.privacy.benchmarking import BenchmarkRunner
    from llsearch.privacy.engines.spacy import SpacyEngine
    from llsearch.privacy.engines.presidio import PresidioEngine

    engines = {
        'spacy': SpacyEngine(),
        'presidio': PresidioEngine(),
    }

    dataset = load_test_dataset()  # List of annotated documents

    runner = BenchmarkRunner(engines, dataset)
    results = await runner.run_all_benchmarks()

    for engine_name, result in results.items():
        print(f"{engine_name}: F1={result.f1_score:.3f}, P95={result.p95_latency_ms}ms")
"""

import asyncio
import time
from typing import Dict, List
from dataclasses import dataclass, asdict

from llsearch.privacy.pipeline.base_pipeline import BasePipeline
from llsearch.privacy.models.benchmark_result import BenchmarkResult
from .metrics import MetricsCalculator


@dataclass
class BenchmarkProgress:
    """Progress tracking for benchmark execution."""
    total_documents: int
    processed_documents: int
    current_engine: str
    elapsed_time: float

    @property
    def progress_percentage(self) -> float:
        """Calculate progress percentage."""
        return (self.processed_documents / self.total_documents * 100) if self.total_documents > 0 else 0.0


class BenchmarkRunner:
    """
    Execute benchmarks on PII detection engines.

    This class runs comprehensive benchmarks on one or more engines,
    measuring accuracy (precision, recall, F1) and performance (latency).

    Attributes:
        engines: Dict mapping engine names to BasePipeline instances
        dataset: List of test documents with ground truth annotations
        calculator: MetricsCalculator instance for metrics calculation

    Example:
        runner = BenchmarkRunner(
            engines={'spacy': SpacyEngine(), 'presidio': PresidioEngine()},
            dataset=test_documents
        )

        results = await runner.run_all_benchmarks()
    """

    def __init__(
        self,
        engines: Dict[str, BasePipeline],
        dataset: List[Dict],
        progress_callback=None
    ):
        """
        Initialize benchmark runner.

        Args:
            engines: Dict mapping engine names to BasePipeline instances
            dataset: List of test documents, each with:
                - 'text': Document text
                - 'entities': List of ground truth entities (type, start, end)
                - 'document_id': Unique document identifier
                - 'document_type': Document type (sentenza, contratto, etc.)
            progress_callback: Optional callback function(progress: BenchmarkProgress)
        """
        self.engines = engines
        self.dataset = dataset
        self.calculator = MetricsCalculator()
        self.progress_callback = progress_callback

    async def run_all_benchmarks(self) -> Dict[str, BenchmarkResult]:
        """
        Run benchmarks on all engines.

        Executes benchmarks sequentially on each engine and returns
        a dict mapping engine names to BenchmarkResult objects.

        Returns:
            Dict mapping engine name to BenchmarkResult
        """
        results = {}

        for engine_name, engine in self.engines.items():
            print(f"\n{'='*60}")
            print(f"Running benchmark for: {engine_name}")
            print(f"{'='*60}")

            result = await self.run_benchmark(engine_name, engine)
            results[engine_name] = result

            print(f"✓ Completed: F1={result.f1_score:.3f}, P95={result.p95_latency_ms}ms")

        return results

    async def run_benchmark(
        self,
        engine_name: str,
        engine: BasePipeline
    ) -> BenchmarkResult:
        """
        Run benchmark on a single engine.

        Processes all documents in the dataset, measuring both accuracy
        and performance metrics.

        Args:
            engine_name: Name of the engine
            engine: BasePipeline instance

        Returns:
            BenchmarkResult with comprehensive metrics
        """
        start_time = time.time()

        all_metrics = []
        all_latencies = []
        total_entities = 0
        total_tp = 0
        total_fp = 0
        total_fn = 0

        for i, doc in enumerate(self.dataset, 1):
            # Progress tracking
            if self.progress_callback:
                progress = BenchmarkProgress(
                    total_documents=len(self.dataset),
                    processed_documents=i,
                    current_engine=engine_name,
                    elapsed_time=time.time() - start_time
                )
                self.progress_callback(progress)

            # Print progress
            if i % 10 == 0 or i == len(self.dataset):
                print(f"Processing document {i}/{len(self.dataset)}... ({i/len(self.dataset)*100:.1f}%)", end='\r')

            # Process document
            doc_start = time.perf_counter()
            result = await engine.process(
                text=doc['text'],
                user_id='benchmark',
                document_id=doc.get('document_id', f'doc_{i}')
            )
            latency_ms = (time.perf_counter() - doc_start) * 1000

            all_latencies.append(latency_ms)
            total_entities += len(result.entities)

            # Calculate metrics for this document
            metrics = self.calculator.calculate_metrics(
                predicted=result.entities,
                ground_truth=doc['entities']
            )

            all_metrics.append(metrics)

            # Accumulate TP, FP, FN for overall metrics
            total_tp += metrics['overall']['true_positives']
            total_fp += metrics['overall']['false_positives']
            total_fn += metrics['overall']['false_negatives']

        print()  # New line after progress

        # Calculate aggregate metrics
        overall_precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
        overall_recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
        overall_f1 = (
            2 * (overall_precision * overall_recall) / (overall_precision + overall_recall)
            if (overall_precision + overall_recall) > 0 else 0.0
        )

        # Calculate latency statistics
        latency_stats = self.calculator.calculate_latency_stats(all_latencies)

        # Aggregate per-entity-type metrics
        entity_type_metrics = self._aggregate_entity_type_metrics(all_metrics)

        # Create BenchmarkResult
        benchmark_result = BenchmarkResult(
            test_dataset_id='legal_corpus_v1',
            test_dataset_size=len(self.dataset),
            test_dataset_type='mixed_legal',
            engine=engine_name,
            engine_version=engine.version,
            engine_config={},  # TODO: Extract engine config
            precision=overall_precision,
            recall=overall_recall,
            f1_score=overall_f1,
            avg_latency_ms=int(latency_stats['mean']),
            p50_latency_ms=int(latency_stats['p50']),
            p95_latency_ms=int(latency_stats['p95']),
            p99_latency_ms=int(latency_stats['p99']),
            total_entities=total_entities,
            true_positives=total_tp,
            false_positives=total_fp,
            false_negatives=total_fn,
            metrics_by_entity_type=entity_type_metrics,
            total_cost_usd=0.0,  # Not applicable for on-premise engines
            benchmark_run_id=f"run_{int(time.time())}",
            notes=f"Benchmark run for {engine_name} on {len(self.dataset)} documents",
        )

        return benchmark_result

    def _aggregate_entity_type_metrics(self, metrics_list: List[Dict]) -> Dict:
        """
        Aggregate per-entity-type metrics across all documents.

        Args:
            metrics_list: List of metrics dicts from individual documents

        Returns:
            Dict mapping entity type to aggregated metrics
        """
        # Collect all entity types
        all_entity_types = set()
        for metrics in metrics_list:
            all_entity_types.update(metrics['by_entity_type'].keys())

        aggregated = {}

        for entity_type in all_entity_types:
            tp_sum = 0
            fp_sum = 0
            fn_sum = 0

            for metrics in metrics_list:
                if entity_type in metrics['by_entity_type']:
                    entity_metrics = metrics['by_entity_type'][entity_type]
                    tp_sum += entity_metrics.true_positives
                    fp_sum += entity_metrics.false_positives
                    fn_sum += entity_metrics.false_negatives

            # Recalculate precision/recall/F1 from aggregated TP/FP/FN
            precision = tp_sum / (tp_sum + fp_sum) if (tp_sum + fp_sum) > 0 else 0.0
            recall = tp_sum / (tp_sum + fn_sum) if (tp_sum + fn_sum) > 0 else 0.0
            f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

            aggregated[entity_type] = {
                'precision': precision,
                'recall': recall,
                'f1_score': f1,
                'true_positives': tp_sum,
                'false_positives': fp_sum,
                'false_negatives': fn_sum,
            }

        return aggregated

    async def save_results(
        self,
        results: Dict[str, BenchmarkResult],
        output_file: str
    ):
        """
        Save benchmark results to JSON file.

        Args:
            results: Dict mapping engine names to BenchmarkResult objects
            output_file: Path to output JSON file
        """
        import json

        serialized_results = {}
        for engine_name, result in results.items():
            # Convert BenchmarkResult to dict
            serialized_results[engine_name] = {
                'engine': result.engine,
                'version': result.engine_version,
                'precision': result.precision,
                'recall': result.recall,
                'f1_score': result.f1_score,
                'avg_latency_ms': result.avg_latency_ms,
                'p95_latency_ms': result.p95_latency_ms,
                'p99_latency_ms': result.p99_latency_ms,
                'total_entities': result.total_entities,
                'metrics_by_entity_type': result.metrics_by_entity_type,
            }

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(serialized_results, f, indent=2, ensure_ascii=False)

        print(f"\n✓ Results saved to: {output_file}")
