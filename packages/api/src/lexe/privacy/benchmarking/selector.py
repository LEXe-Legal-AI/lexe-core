"""
Winner selection algorithm for benchmark results.

Selects the best engine based on weighted scoring of multiple metrics:
- F1-score: 50% weight (accuracy is most important)
- P95 latency: 30% weight (performance matters)
- Precision: 10% weight (minimize false positives)
- Recall: 10% weight (minimize false negatives)

Example:
    from llsearch.privacy.benchmarking import WinnerSelector

    selector = WinnerSelector()
    winner = selector.select_winner(benchmark_results)

    print(f"Winner: {winner}")
"""

from typing import List
from llsearch.privacy.models.benchmark_result import BenchmarkResult


class WinnerSelector:
    """
    Select winner based on weighted scoring of metrics.

    Scoring Algorithm:
    - F1-score: 50% weight (normalized 0-1, higher is better)
    - P95 latency: 30% weight (normalized 0-1, lower is better)
    - Precision: 10% weight (normalized 0-1, higher is better)
    - Recall: 10% weight (normalized 0-1, higher is better)

    Final score = (F1*0.5) + (Latency_normalized*0.3) + (Precision*0.1) + (Recall*0.1)

    Attributes:
        weights: Dict with metric weights
        latency_target_ms: Target P95 latency for normalization (default: 500ms)
    """

    def __init__(
        self,
        weights: dict = None,
        latency_target_ms: int = 500
    ):
        """
        Initialize winner selector.

        Args:
            weights: Optional custom weights dict with keys:
                'f1_score', 'p95_latency', 'precision', 'recall'
                Defaults to {'f1_score': 0.5, 'p95_latency': 0.3, 'precision': 0.1, 'recall': 0.1}
            latency_target_ms: Target P95 latency for scoring (default: 500ms)
                Lower latency scores higher. At target, score=1.0. Above target, score decreases.
        """
        self.weights = weights or {
            'f1_score': 0.5,
            'p95_latency': 0.3,
            'precision': 0.1,
            'recall': 0.1,
        }

        # Validate weights sum to 1.0
        total_weight = sum(self.weights.values())
        if abs(total_weight - 1.0) > 0.01:
            raise ValueError(f"Weights must sum to 1.0, got {total_weight}")

        self.latency_target_ms = latency_target_ms

    def select_winner(self, results: List[BenchmarkResult]) -> str:
        """
        Select winner from list of benchmark results.

        Args:
            results: List of BenchmarkResult objects

        Returns:
            Engine name of the winner

        Raises:
            ValueError: If results list is empty
        """
        if not results:
            raise ValueError("Results list cannot be empty")

        # Calculate scores for each engine
        scores = {}
        for result in results:
            score = self._calculate_score(result)
            scores[result.engine] = score

        # Select winner (highest score)
        winner = max(scores, key=scores.get)

        print(f"\n{'='*60}")
        print(f"Winner Selection (Weighted Scoring)")
        print(f"{'='*60}")
        for engine, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
            marker = "✅ WINNER" if engine == winner else ""
            print(f"{engine.capitalize()}: {score:.4f} {marker}")
        print(f"{'='*60}\n")

        return winner

    def _calculate_score(self, result: BenchmarkResult) -> float:
        """
        Calculate weighted score for a benchmark result.

        Args:
            result: BenchmarkResult object

        Returns:
            Weighted score (0.0 - 1.0)
        """
        # F1-score component (already 0-1, higher is better)
        # Convert Decimal to float for calculation
        f1_component = float(result.f1_score) * self.weights['f1_score']

        # Latency component (normalize to 0-1, lower latency is better)
        latency_normalized = self._normalize_latency(result.p95_latency_ms)
        latency_component = latency_normalized * self.weights['p95_latency']

        # Precision component (already 0-1, higher is better)
        precision_component = float(result.precision) * self.weights['precision']

        # Recall component (already 0-1, higher is better)
        recall_component = float(result.recall) * self.weights['recall']

        # Total weighted score
        total_score = (
            f1_component +
            latency_component +
            precision_component +
            recall_component
        )

        return total_score

    def _normalize_latency(self, latency_ms: int) -> float:
        """
        Normalize latency to 0-1 score (lower is better).

        Scoring:
        - latency <= target: score = 1.0 (excellent)
        - latency = 2*target: score = 0.5 (acceptable)
        - latency >= 3*target: score = 0.0 (poor)

        Uses exponential decay for smooth scoring.

        Args:
            latency_ms: P95 latency in milliseconds

        Returns:
            Normalized score (0.0 - 1.0)
        """
        if latency_ms <= self.latency_target_ms:
            return 1.0

        # Exponential decay: score = e^(-k * (latency - target) / target)
        # At 2*target: score ≈ 0.37
        # At 3*target: score ≈ 0.14
        import math
        k = 1.0  # Decay rate
        normalized_excess = (latency_ms - self.latency_target_ms) / self.latency_target_ms
        score = math.exp(-k * normalized_excess)

        return max(0.0, min(1.0, score))  # Clamp to [0, 1]

    def compare_engines(self, results: List[BenchmarkResult]) -> dict:
        """
        Generate detailed comparison of all engines.

        Args:
            results: List of BenchmarkResult objects

        Returns:
            Dict with engine scores and component breakdowns
        """
        comparison = {}

        for result in results:
            # Calculate components (convert Decimal to float)
            f1_score = float(result.f1_score)
            precision = float(result.precision)
            recall = float(result.recall)
            latency_normalized = self._normalize_latency(result.p95_latency_ms)

            # Calculate weighted components
            f1_component = f1_score * self.weights['f1_score']
            latency_component = latency_normalized * self.weights['p95_latency']
            precision_component = precision * self.weights['precision']
            recall_component = recall * self.weights['recall']

            total_score = f1_component + latency_component + precision_component + recall_component

            comparison[result.engine] = {
                'total_score': total_score,
                'components': {
                    'f1_score': {
                        'value': f1_score,
                        'weighted': f1_component,
                        'weight': self.weights['f1_score'],
                    },
                    'p95_latency': {
                        'value': result.p95_latency_ms,
                        'normalized': latency_normalized,
                        'weighted': latency_component,
                        'weight': self.weights['p95_latency'],
                    },
                    'precision': {
                        'value': precision,
                        'weighted': precision_component,
                        'weight': self.weights['precision'],
                    },
                    'recall': {
                        'value': recall,
                        'weighted': recall_component,
                        'weight': self.weights['recall'],
                    },
                },
                'raw_metrics': {
                    'f1_score': f1_score,
                    'precision': precision,
                    'recall': recall,
                    'p95_latency_ms': result.p95_latency_ms,
                    'avg_latency_ms': result.avg_latency_ms,
                    'total_entities': result.total_entities,
                },
            }

        return comparison
