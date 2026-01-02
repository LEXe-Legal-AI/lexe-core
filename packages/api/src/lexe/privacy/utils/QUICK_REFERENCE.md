# Confidence Scoring - Quick Reference

## Import

```python
from llsearch.privacy.utils.confidence_scorer import (
    calculate_entity_confidence,
    calculate_aggregate_confidence,
    meets_confidence_threshold,
    boost_confidence_with_context,
    ConfidenceMetrics,
)
```

## 1. Score Individual Entity

```python
score = calculate_entity_confidence(
    entity=detected_entity,
    context={
        'validation_passed': True,
        'keywords_present': True,
        'surrounding_text': "codice fiscale: RSSMRA85T10A562S"
    }
)
# Returns: float (0.0 - 1.0)
```

## 2. Calculate Aggregate Metrics

```python
metrics = calculate_aggregate_confidence(entities)

print(metrics.mean_confidence)        # Average
print(metrics.high_confidence_count)  # Entities >= 0.8
print(metrics.total_entities)         # Total count
print(metrics.to_dict())              # JSON format
```

## 3. Check Threshold

```python
# Check if 80% of entities have confidence >= 0.6
if meets_confidence_threshold(entities, threshold=0.6):
    print("Quality threshold met")
```

## 4. Boost Confidence

```python
boosted = boost_confidence_with_context(
    entity=original_entity,
    surrounding_text="codice fiscale: RSSMRA85T10A562S",
    validation_passed=True
)
# Returns: New DetectedEntity with higher confidence
```

## Boost Factors

| Factor | Boost | Trigger |
|--------|-------|---------|
| High reliability type | +0.10 | Type reliability >= 0.85 |
| Context keywords | +0.10 | Keywords in surrounding text |
| Validation passed | +0.15 | Checksum validated |
| Multiple patterns | +0.10 | Multiple detections |

## Entity Type Reliability

| Type | Score | Type | Score |
|------|-------|------|-------|
| FISCAL_CODE | 0.95 | EMAIL | 0.85 |
| VAT_NUMBER | 0.90 | PHONE | 0.75 |
| IBAN | 0.90 | PERSON | 0.65 |

## ConfidenceMetrics Fields

```python
metrics.mean_confidence         # Average score
metrics.median_confidence       # Median score
metrics.min_confidence          # Lowest score
metrics.max_confidence          # Highest score
metrics.std_deviation           # Standard deviation
metrics.high_confidence_count   # Count >= 0.8
metrics.medium_confidence_count # Count 0.6-0.8
metrics.low_confidence_count    # Count < 0.6
metrics.total_entities          # Total count
```

## Full Documentation

See `CONFIDENCE_SCORING_GUIDE.md` for complete documentation and examples.
