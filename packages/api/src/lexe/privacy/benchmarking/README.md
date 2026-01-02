# Privacy Benchmarking Framework

Comprehensive benchmarking system for comparing PII detection engines (spaCy vs Presidio).

## Overview

This framework provides:
- **Metrics Calculation**: Precision, Recall, F1-score, latency statistics
- **Benchmark Runner**: Automated execution on test datasets
- **Engine Comparison**: Statistical significance testing
- **Winner Selection**: Weighted scoring algorithm
- **Report Generation**: Markdown and HTML reports

## Quick Start

```python
from llsearch.privacy.benchmarking import BenchmarkRunner, EngineComparator
from llsearch.privacy.engines.spacy import SpacyEngine
from llsearch.privacy.engines.presidio import PresidioEngine
from llsearch.privacy.benchmarking.datasets import load_sample_dataset

# Load test dataset
dataset = load_sample_dataset()  # 10 annotated documents

# Create engines
engines = {
    'spacy': SpacyEngine(),
    'presidio': PresidioEngine(),
}

# Run benchmarks
runner = BenchmarkRunner(engines, dataset)
results = await runner.run_all_benchmarks()

# Compare and select winner
comparator = EngineComparator()
report = comparator.compare(results)

print(f"Winner: {report.winner}")
print(report.recommendation)
```

## Usage Example

```bash
cd src/llsearch/privacy/benchmarking
python example_usage.py
```

This will:
1. Load 10 sample annotated documents
2. Run benchmarks on both spaCy and Presidio engines
3. Compare results and select winner
4. Generate 3 output files:
   - `benchmark_results.json` - Raw metrics data
   - `benchmark_report.md` - Markdown recommendation
   - `benchmark_report.html` - Visual HTML report

## Metrics

### Accuracy Metrics

- **Precision**: TP / (TP + FP) - How many detected entities are correct
- **Recall**: TP / (TP + FN) - How many ground truth entities were detected
- **F1-Score**: 2 * (Precision * Recall) / (Precision + Recall) - Harmonic mean

### Performance Metrics

- **Mean Latency**: Average processing time per document
- **P50 Latency**: 50th percentile (median)
- **P95 Latency**: 95th percentile (target: <500ms)
- **P99 Latency**: 99th percentile

## Winner Selection Algorithm

The winner is selected based on weighted scoring:

| Metric | Weight | Description |
|--------|--------|-------------|
| F1-Score | 50% | Accuracy is most important |
| P95 Latency | 30% | Performance matters |
| Precision | 10% | Minimize false positives |
| Recall | 10% | Minimize false negatives |

**Scoring Formula:**
```
Score = (F1 * 0.5) + (Latency_normalized * 0.3) + (Precision * 0.1) + (Recall * 0.1)
```

Latency normalization:
- Latency ≤ 500ms: score = 1.0 (excellent)
- Latency = 1000ms: score = 0.37 (acceptable)
- Latency ≥ 1500ms: score = 0.14 (poor)

## Test Dataset Format

Each document in the dataset must include:

```json
{
  "document_id": "sample_001",
  "document_type": "sentenza",
  "text": "Il giudice Mario Rossi (CF: RSSMRA85T10A562S) ...",
  "entities": [
    {
      "type": "PERSON",
      "start": 10,
      "end": 21,
      "text": "Mario Rossi"
    },
    {
      "type": "CF",
      "start": 27,
      "end": 43,
      "text": "RSSMRA85T10A562S"
    }
  ]
}
```

## Creating Custom Datasets

```python
from llsearch.privacy.benchmarking.datasets import load_legal_corpus

# Load from JSON file
dataset = load_legal_corpus('path/to/corpus.json')

# Or create programmatically
custom_dataset = [
    {
        'document_id': 'custom_001',
        'document_type': 'contratto',
        'text': 'Your legal text here...',
        'entities': [
            {'type': 'PERSON', 'start': 0, 'end': 10},
            # ... more entities
        ]
    },
    # ... more documents
]
```

## Output Reports

### JSON Results

```json
{
  "spacy": {
    "engine": "spacy",
    "version": "1.0.0",
    "precision": 0.923,
    "recall": 0.891,
    "f1_score": 0.907,
    "avg_latency_ms": 156,
    "p95_latency_ms": 234,
    "total_entities": 48
  },
  "presidio": { ... }
}
```

### Markdown Report

Generated with:
- Winner recommendation
- Performance comparison table
- Statistical significance (p-values)
- Strengths and rationale

### HTML Report

Interactive visual report with:
- Metrics comparison table
- Charts and graphs
- Detailed breakdown by entity type

## Advanced Usage

### Custom Weights

```python
from llsearch.privacy.benchmarking import WinnerSelector

# Custom scoring weights
selector = WinnerSelector(
    weights={
        'f1_score': 0.6,      # Prioritize accuracy
        'p95_latency': 0.2,   # Less weight on performance
        'precision': 0.1,
        'recall': 0.1,
    },
    latency_target_ms=300    # Stricter latency target
)

winner = selector.select_winner(results)
```

### Progress Callback

```python
def progress_callback(progress):
    print(f"[{progress.current_engine}] {progress.progress_percentage:.1f}% complete")

runner = BenchmarkRunner(engines, dataset, progress_callback=progress_callback)
```

## Architecture

```
benchmarking/
├── __init__.py              # Package exports
├── metrics.py               # MetricsCalculator, EntityMetrics
├── runner.py                # BenchmarkRunner, BenchmarkProgress
├── comparator.py            # EngineComparator, ComparisonReport
├── selector.py              # WinnerSelector (weighted scoring)
├── datasets/
│   ├── __init__.py
│   └── loader.py            # load_sample_dataset, load_legal_corpus
├── example_usage.py         # Example script
└── README.md                # This file
```

## Integration with Privacy Module

The benchmarking framework integrates seamlessly with:

1. **spaCy Engine** (`src/llsearch/privacy/engines/spacy/`)
2. **Presidio Engine** (`src/llsearch/privacy/engines/presidio/`)
3. **BenchmarkResult Model** (`src/llsearch/privacy/models/benchmark_result.py`)

Results are stored in the database for historical comparison.

## Performance Targets

| Metric | Target | Excellent | Good | Acceptable |
|--------|--------|-----------|------|------------|
| F1-Score | > 0.85 | > 0.90 | 0.85-0.90 | 0.80-0.85 |
| Precision | > 0.80 | > 0.90 | 0.85-0.90 | 0.80-0.85 |
| Recall | > 0.80 | > 0.90 | 0.85-0.90 | 0.80-0.85 |
| P95 Latency | < 500ms | < 300ms | 300-500ms | 500-1000ms |

## Related Documentation

- [Privacy Implementation Plan](../../../../docs/PRIVACY_IMPLEMENTATION_PLAN.md)
- [Privacy Architecture](../../../../docs/PRIVACY_ARCHITECTURE.md)
- [Pseudonimizzazione Strategia](../../../../PSEUDONIMIZZAZIONE_STRATEGIA.md)

---

**Status**: FASE 3 Complete (Benchmarking Framework)
**Version**: 1.0.0
**Last Updated**: 17 November 2025
