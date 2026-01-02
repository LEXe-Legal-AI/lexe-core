"""
Metrics calculation for PII detection benchmarking.

Provides comprehensive metrics for evaluating PII detection engines:
- Precision, Recall, F1-score (overall and per-entity-type)
- Latency statistics (mean, median, P50/P95/P99)
- True positives, false positives, false negatives

Example:
    from llsearch.privacy.benchmarking.metrics import MetricsCalculator

    calculator = MetricsCalculator()

    # Calculate metrics
    metrics = calculator.calculate_metrics(
        predicted=detected_entities,
        ground_truth=annotated_entities
    )

    print(f"Precision: {metrics['overall']['precision']:.3f}")
    print(f"Recall: {metrics['overall']['recall']:.3f}")
    print(f"F1-score: {metrics['overall']['f1_score']:.3f}")

    # Calculate latency stats
    latency_stats = calculator.calculate_latency_stats(latencies)
    print(f"P95 latency: {latency_stats['p95']:.2f}ms")
"""

import numpy as np
from typing import List, Dict, Set, Tuple
from dataclasses import dataclass

from llsearch.privacy.pipeline.base_pipeline import DetectedEntity, EntityType


@dataclass
class EntityMetrics:
    """Metrics for a specific entity type."""
    entity_type: str
    precision: float
    recall: float
    f1_score: float
    true_positives: int
    false_positives: int
    false_negatives: int


class MetricsCalculator:
    """
    Calculate precision, recall, F1-score and latency statistics for PII detection.

    This class provides methods to evaluate the performance of PII detection engines
    by comparing predicted entities with ground truth annotations.

    Methods:
        calculate_metrics: Calculate overall and per-entity metrics
        calculate_latency_stats: Calculate latency statistics (mean, P50/P95/P99)
        calculate_per_entity_metrics: Calculate metrics for each entity type separately
    """

    def calculate_metrics(
        self,
        predicted: List[DetectedEntity],
        ground_truth: List[Dict]
    ) -> Dict:
        """
        Calculate overall and per-entity-type metrics.

        Compares predicted entities with ground truth annotations and calculates:
        - True positives (TP): Correct predictions
        - False positives (FP): Incorrect predictions (predicted but not in ground truth)
        - False negatives (FN): Missed entities (in ground truth but not predicted)
        - Precision: TP / (TP + FP)
        - Recall: TP / (TP + FN)
        - F1-score: 2 * (Precision * Recall) / (Precision + Recall)

        Args:
            predicted: List of DetectedEntity objects from engine
            ground_truth: List of ground truth entity dicts with keys:
                - 'type': Entity type string
                - 'start': Start position
                - 'end': End position
                - 'text': Entity text (optional, for validation)

        Returns:
            Dict with 'overall' metrics and 'by_entity_type' breakdown:
            {
                'overall': {
                    'precision': float,
                    'recall': float,
                    'f1_score': float,
                    'true_positives': int,
                    'false_positives': int,
                    'false_negatives': int,
                },
                'by_entity_type': {
                    'PERSON': EntityMetrics(...),
                    'CF': EntityMetrics(...),
                    ...
                }
            }
        """
        # Convert to sets for comparison
        pred_set = self._to_comparable_set(predicted)
        gt_set = self._to_comparable_set(ground_truth)

        # Calculate overall TP, FP, FN
        tp = len(pred_set & gt_set)  # Intersection
        fp = len(pred_set - gt_set)  # Predicted but not in ground truth
        fn = len(gt_set - pred_set)  # In ground truth but not predicted

        # Calculate overall metrics
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        # Calculate per-entity-type metrics
        entity_metrics = self._calculate_per_entity_metrics(predicted, ground_truth)

        return {
            'overall': {
                'precision': precision,
                'recall': recall,
                'f1_score': f1,
                'true_positives': tp,
                'false_positives': fp,
                'false_negatives': fn,
            },
            'by_entity_type': entity_metrics,
        }

    def _to_comparable_set(self, entities: List) -> Set[Tuple[str, int, int]]:
        """
        Convert entity list to comparable set of (type, start, end) tuples.

        Args:
            entities: List of DetectedEntity objects or ground truth dicts

        Returns:
            Set of (entity_type, start, end) tuples for exact matching
        """
        comparable_set = set()

        for entity in entities:
            # Handle DetectedEntity objects
            if isinstance(entity, DetectedEntity):
                entity_type = entity.type.value
                start = entity.start
                end = entity.end
            # Handle ground truth dicts
            elif isinstance(entity, dict):
                entity_type = entity['type']
                start = entity['start']
                end = entity['end']
            else:
                raise ValueError(f"Unknown entity format: {type(entity)}")

            comparable_set.add((entity_type, start, end))

        return comparable_set

    def _calculate_per_entity_metrics(
        self,
        predicted: List[DetectedEntity],
        ground_truth: List[Dict]
    ) -> Dict[str, EntityMetrics]:
        """
        Calculate metrics for each entity type separately.

        Args:
            predicted: List of predicted entities
            ground_truth: List of ground truth entities

        Returns:
            Dict mapping entity type to EntityMetrics object
        """
        # Get all entity types present in predictions and ground truth
        entity_types = set()
        for entity in predicted:
            entity_types.add(entity.type.value)
        for entity in ground_truth:
            entity_types.add(entity['type'])

        metrics_by_type = {}

        for entity_type in entity_types:
            # Filter by entity type
            pred_filtered = [e for e in predicted if e.type.value == entity_type]
            gt_filtered = [e for e in ground_truth if e['type'] == entity_type]

            # Convert to comparable sets
            pred_set = self._to_comparable_set(pred_filtered)
            gt_set = self._to_comparable_set(gt_filtered)

            # Calculate TP, FP, FN for this entity type
            tp = len(pred_set & gt_set)
            fp = len(pred_set - gt_set)
            fn = len(gt_set - pred_set)

            # Calculate metrics
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

            metrics_by_type[entity_type] = EntityMetrics(
                entity_type=entity_type,
                precision=precision,
                recall=recall,
                f1_score=f1,
                true_positives=tp,
                false_positives=fp,
                false_negatives=fn,
            )

        return metrics_by_type

    def calculate_latency_stats(self, latencies: List[float]) -> Dict:
        """
        Calculate latency statistics from list of latencies.

        Args:
            latencies: List of latency values in milliseconds

        Returns:
            Dict with latency statistics:
            {
                'mean': float,
                'median': float,
                'p50': float,  # 50th percentile
                'p95': float,  # 95th percentile
                'p99': float,  # 99th percentile
                'std': float,  # Standard deviation
                'min': float,
                'max': float,
            }
        """
        if not latencies:
            return {
                'mean': 0.0,
                'median': 0.0,
                'p50': 0.0,
                'p95': 0.0,
                'p99': 0.0,
                'std': 0.0,
                'min': 0.0,
                'max': 0.0,
            }

        latencies_array = np.array(latencies)

        return {
            'mean': float(np.mean(latencies_array)),
            'median': float(np.median(latencies_array)),
            'p50': float(np.percentile(latencies_array, 50)),
            'p95': float(np.percentile(latencies_array, 95)),
            'p99': float(np.percentile(latencies_array, 99)),
            'std': float(np.std(latencies_array)),
            'min': float(np.min(latencies_array)),
            'max': float(np.max(latencies_array)),
        }

    def calculate_confidence_stats(self, entities: List[DetectedEntity]) -> Dict:
        """
        Calculate confidence score statistics for detected entities.

        Args:
            entities: List of DetectedEntity objects

        Returns:
            Dict with confidence statistics (mean, median, min, max)
        """
        if not entities:
            return {
                'mean': 0.0,
                'median': 0.0,
                'min': 0.0,
                'max': 0.0,
            }

        confidences = [e.confidence for e in entities]
        confidences_array = np.array(confidences)

        return {
            'mean': float(np.mean(confidences_array)),
            'median': float(np.median(confidences_array)),
            'min': float(np.min(confidences_array)),
            'max': float(np.max(confidences_array)),
        }
