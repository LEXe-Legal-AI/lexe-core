# PII Confidence Scoring System - User Guide

## Overview

The confidence scoring system evaluates and enhances the reliability of PII detection results by analyzing multiple factors including pattern strength, context keywords, validation results, and entity type reliability.

**Module:** `src/llsearch/privacy/utils/confidence_scorer.py`

## Core Components

### 1. Entity Type Reliability Scores

Pre-defined reliability scores for different entity types based on pattern complexity and validation robustness:

```python
ENTITY_TYPE_RELIABILITY = {
    EntityType.FISCAL_CODE: 0.95,      # Very High: Complex pattern + checksum
    EntityType.VAT_NUMBER: 0.90,       # High: 11 digits + checksum
    EntityType.IBAN: 0.90,             # High: Standard format + checksum
    EntityType.EMAIL: 0.85,            # High: Well-defined pattern
    EntityType.PHONE: 0.75,            # Medium: Varied formats
    EntityType.PERSON: 0.65,           # Medium-Low: NER-based
    EntityType.ORGANIZATION: 0.65,     # Medium-Low: NER-based
    EntityType.LOCATION: 0.60,         # Medium-Low: Can be ambiguous
    # ... more types
}
```

### 2. Context Keywords

Keywords that boost confidence when found near entities:

```python
CONTEXT_KEYWORDS = {
    EntityType.FISCAL_CODE: [
        "codice fiscale", "c.f.", "cf", "nato a", "nata a",
        "residente in", "domiciliato in"
    ],
    EntityType.VAT_NUMBER: [
        "p.iva", "p. iva", "partita iva", "vat", "vat number"
    ],
    # ... more types
}
```

### 3. Confidence Boosting Factors

```python
BOOST_CONTEXT_KEYWORDS = 0.10      # Context keywords present
BOOST_VALIDATION_PASSED = 0.15     # Validation passed (checksum, format)
BOOST_MULTIPLE_PATTERNS = 0.10     # Multiple patterns matched
BOOST_HIGH_RELIABILITY = 0.10      # High-reliability entity type (≥0.85)
```

## Function Signatures

### 1. `calculate_entity_confidence()`

Calculate confidence score for a single detected entity.

```python
def calculate_entity_confidence(
    entity: DetectedEntity,
    context: Optional[Dict[str, Any]] = None
) -> float:
    """
    Calculate confidence score (0.0-1.0) for a detected entity.

    Args:
        entity: Detected entity object
        context: Optional context dictionary with keys:
            - 'keywords_present': bool - Whether context keywords found
            - 'validation_passed': bool - Whether validation succeeded
            - 'multiple_patterns': bool - Whether multiple patterns matched
            - 'surrounding_text': str - Text around entity for keyword detection
            - 'pattern_complexity': float - Pattern complexity score (0.0-1.0)

    Returns:
        Adjusted confidence score (0.0 to 1.0, capped at 1.0)
    """
```

**Example:**

```python
from llsearch.privacy.pipeline.base_pipeline import DetectedEntity, EntityType
from llsearch.privacy.utils.confidence_scorer import calculate_entity_confidence

entity = DetectedEntity(
    text="RSSMRA85T10A562S",
    type=EntityType.FISCAL_CODE,
    start=0,
    end=16,
    confidence=0.8
)

context = {
    'validation_passed': True,
    'keywords_present': True,
    'surrounding_text': "codice fiscale: RSSMRA85T10A562S"
}

score = calculate_entity_confidence(entity, context)
print(f"Enhanced confidence: {score:.2f}")  # Output: 1.00
```

### 2. `calculate_aggregate_confidence()`

Calculate aggregate metrics for a list of entities.

```python
def calculate_aggregate_confidence(
    entities: List[DetectedEntity],
    recalculate_scores: bool = False,
    context_per_entity: Optional[Dict[int, Dict[str, Any]]] = None
) -> ConfidenceMetrics:
    """
    Calculate aggregate confidence metrics for a list of entities.

    Args:
        entities: List of detected entities
        recalculate_scores: If True, recalculate individual scores using context
        context_per_entity: Optional dict mapping entity index to context dict

    Returns:
        ConfidenceMetrics object with aggregate statistics
    """
```

**Example:**

```python
from llsearch.privacy.utils.confidence_scorer import calculate_aggregate_confidence

entities = [
    DetectedEntity(text="John", type=EntityType.PERSON,
                  start=0, end=4, confidence=0.85),
    DetectedEntity(text="RSSMRA85T10A562S", type=EntityType.FISCAL_CODE,
                  start=10, end=26, confidence=0.95),
]

metrics = calculate_aggregate_confidence(entities)
print(f"Mean confidence: {metrics.mean_confidence:.2f}")
print(f"High confidence entities: {metrics.high_confidence_count}")
print(f"Total entities: {metrics.total_entities}")
```

### 3. `meets_confidence_threshold()`

Check if results meet minimum confidence threshold.

```python
def meets_confidence_threshold(
    entities: List[DetectedEntity],
    threshold: float = 0.6,
    min_percentage: float = 0.8,
    check_mean: bool = True
) -> bool:
    """
    Check if entity detection results meet minimum confidence threshold.

    Args:
        entities: List of detected entities
        threshold: Minimum confidence threshold (default: 0.6)
        min_percentage: Minimum percentage of entities that must meet threshold
                       (default: 0.8 = 80%)
        check_mean: If True, also check mean confidence >= threshold

    Returns:
        True if results meet threshold criteria, False otherwise
    """
```

**Example:**

```python
from llsearch.privacy.utils.confidence_scorer import meets_confidence_threshold

entities = [...]  # Your detected entities

# Check if at least 80% of entities have confidence >= 0.6
if meets_confidence_threshold(entities, threshold=0.6):
    print("Results meet quality threshold")
else:
    print("Results below quality threshold - review needed")

# More lenient check: 50% of entities with confidence >= 0.5
if meets_confidence_threshold(entities, threshold=0.5, min_percentage=0.5):
    print("Results meet minimum threshold")
```

### 4. `boost_confidence_with_context()`

Create a new entity with boosted confidence.

```python
def boost_confidence_with_context(
    entity: DetectedEntity,
    surrounding_text: str,
    validation_passed: bool = False
) -> DetectedEntity:
    """
    Create a new entity with boosted confidence based on context.

    Args:
        entity: Original detected entity
        surrounding_text: Text surrounding the entity
        validation_passed: Whether validation succeeded

    Returns:
        New DetectedEntity with updated confidence
    """
```

**Example:**

```python
from llsearch.privacy.utils.confidence_scorer import boost_confidence_with_context

entity = DetectedEntity(
    text="RSSMRA85T10A562S",
    type=EntityType.FISCAL_CODE,
    start=0,
    end=16,
    confidence=0.75
)

# Boost with context
boosted = boost_confidence_with_context(
    entity,
    surrounding_text="Codice fiscale: RSSMRA85T10A562S",
    validation_passed=True
)

print(f"Original: {entity.confidence:.2f}")      # 0.75
print(f"Boosted: {boosted.confidence:.2f}")      # 1.00
print(f"Boost: +{boosted.confidence - entity.confidence:.2f}")  # +0.25
```

## ConfidenceMetrics Dataclass

```python
@dataclass
class ConfidenceMetrics:
    """Aggregate confidence metrics for detected entities."""
    mean_confidence: float
    median_confidence: float
    min_confidence: float
    max_confidence: float
    std_deviation: float
    high_confidence_count: int      # >= 0.8
    medium_confidence_count: int    # 0.6 - 0.8
    low_confidence_count: int       # < 0.6
    total_entities: int

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
```

**Example:**

```python
metrics = calculate_aggregate_confidence(entities)

# Access metrics
print(f"Mean: {metrics.mean_confidence}")
print(f"StdDev: {metrics.std_deviation}")
print(f"High confidence: {metrics.high_confidence_count}")

# Convert to dict for JSON
import json
print(json.dumps(metrics.to_dict(), indent=2))
```

## Usage Examples

### Example 1: Basic Entity Scoring

```python
from llsearch.privacy.pipeline.base_pipeline import DetectedEntity, EntityType
from llsearch.privacy.utils.confidence_scorer import calculate_entity_confidence

# Detected Codice Fiscale
cf_entity = DetectedEntity(
    text="RSSMRA85T10A562S",
    type=EntityType.FISCAL_CODE,
    start=25,
    end=41,
    confidence=0.90,
    context_before="Il cliente Mario Rossi (CF:",
    context_after=") residente a Roma",
    metadata={'validation_passed': True}
)

# Calculate enhanced confidence
enhanced = calculate_entity_confidence(
    entity=cf_entity,
    context={'validation_passed': True, 'keywords_present': True}
)

print(f"Base: {cf_entity.confidence:.2f}")     # 0.90
print(f"Enhanced: {enhanced:.2f}")              # 1.00
```

### Example 2: Aggregate Metrics

```python
from llsearch.privacy.utils.confidence_scorer import calculate_aggregate_confidence

entities = [
    DetectedEntity(text="Mario Rossi", type=EntityType.PERSON,
                  start=0, end=11, confidence=0.85),
    DetectedEntity(text="RSSMRA85T10A562S", type=EntityType.FISCAL_CODE,
                  start=20, end=36, confidence=0.95),
    DetectedEntity(text="mario@example.com", type=EntityType.EMAIL,
                  start=50, end=67, confidence=0.92),
]

metrics = calculate_aggregate_confidence(entities)
print(f"Mean confidence: {metrics.mean_confidence:.3f}")
print(f"High confidence entities: {metrics.high_confidence_count}/{metrics.total_entities}")
```

### Example 3: Threshold Evaluation

```python
from llsearch.privacy.utils.confidence_scorer import meets_confidence_threshold

entities = [...]  # Your detected entities

# Strict check: mean >= 0.7 AND 80% of entities >= 0.7
if meets_confidence_threshold(entities, threshold=0.7):
    print("High quality results - proceed with anonymization")
else:
    print("Low quality results - manual review recommended")

# Lenient check: 50% of entities >= 0.5
if meets_confidence_threshold(entities, threshold=0.5, min_percentage=0.5):
    print("Minimum quality met")
```

### Example 4: Context Boosting

```python
from llsearch.privacy.utils.confidence_scorer import boost_confidence_with_context

# Original entity
entity = DetectedEntity(
    text="RSSMRA85T10A562S",
    type=EntityType.FISCAL_CODE,
    start=25,
    end=41,
    confidence=0.75
)

# Boost with context
surrounding = "Codice fiscale del cliente: RSSMRA85T10A562S (verificato)"
boosted = boost_confidence_with_context(entity, surrounding, validation_passed=True)

print(f"Confidence increase: {boosted.confidence - entity.confidence:.2f}")

# Check boost factors in metadata
print(boosted.metadata['boost_factors'])
# {'keywords_present': True, 'validation_passed': True}
```

### Example 5: Real-World Legal Document

```python
from llsearch.privacy.utils.confidence_scorer import (
    calculate_aggregate_confidence,
    meets_confidence_threshold
)

# Simulate detection results from legal contract
entities = [
    DetectedEntity(text="Mario Rossi", type=EntityType.PERSON,
                  start=45, end=56, confidence=0.82),
    DetectedEntity(text="RSSMRA85T10A562S", type=EntityType.FISCAL_CODE,
                  start=105, end=121, confidence=0.90,
                  metadata={'validation_passed': True}),
    DetectedEntity(text="Via Roma 123", type=EntityType.ADDRESS,
                  start=135, end=147, confidence=0.68),
    DetectedEntity(text="mario@example.com", type=EntityType.EMAIL,
                  start=165, end=182, confidence=0.95),
]

# Analyze quality
metrics = calculate_aggregate_confidence(entities)
print(f"Document Analysis:")
print(f"  Entities detected: {metrics.total_entities}")
print(f"  Mean confidence: {metrics.mean_confidence:.2f}")
print(f"  High confidence: {metrics.high_confidence_count}")

# Quality check
if meets_confidence_threshold(entities, threshold=0.7):
    print("✓ Document meets quality threshold")
else:
    print("✗ Document requires manual review")
```

## Integration with PII Pipeline

### Post-Processing Enhancement

```python
from llsearch.privacy.pipeline.base_pipeline import BasePipeline, DetectedEntity
from llsearch.privacy.utils.confidence_scorer import (
    calculate_entity_confidence,
    meets_confidence_threshold
)

class EnhancedPipeline(BasePipeline):
    async def post_process(self, entities, text, metadata=None):
        """Enhanced post-processing with confidence scoring"""

        # Recalculate confidence for each entity
        enhanced_entities = []
        for entity in entities:
            # Extract context
            context_before, context_after = self.extract_context(
                text, entity.start, entity.end
            )

            # Calculate enhanced confidence
            enhanced_conf = calculate_entity_confidence(
                entity,
                context={
                    'surrounding_text': f"{context_before} {context_after}",
                    'validation_passed': entity.metadata.get('validation_passed', False)
                }
            )

            # Update entity confidence
            entity.confidence = enhanced_conf
            enhanced_entities.append(entity)

        # Filter by threshold
        filtered = [e for e in enhanced_entities if e.confidence >= self.confidence_threshold]

        # Quality check
        if not meets_confidence_threshold(filtered, threshold=0.6):
            self.logger.warning("Detection results below quality threshold")

        return filtered
```

## API Response Enhancement

```python
from llsearch.privacy.utils.confidence_scorer import calculate_aggregate_confidence

def anonymize_document_api(text: str):
    """API endpoint with confidence metrics"""

    # Run PII detection
    result = await pipeline.process(text)

    # Calculate confidence metrics
    metrics = calculate_aggregate_confidence(result.entities)

    return {
        'anonymized_text': result.anonymized_text,
        'entities': [e.to_dict() for e in result.entities],
        'confidence_metrics': metrics.to_dict(),
        'quality_check': {
            'meets_threshold': meets_confidence_threshold(result.entities, threshold=0.7),
            'recommendation': 'auto' if metrics.mean_confidence >= 0.8 else 'review'
        }
    }
```

## Best Practices

1. **Always calculate confidence metrics** for detection results to assess quality
2. **Use threshold checks** before auto-anonymization (recommend manual review for low confidence)
3. **Boost confidence** using context when available (keywords, validation results)
4. **Set appropriate thresholds** based on use case:
   - High-risk: threshold=0.8, min_percentage=0.9
   - Medium-risk: threshold=0.7, min_percentage=0.8
   - Low-risk: threshold=0.6, min_percentage=0.7
5. **Log confidence metrics** for monitoring and quality improvement
6. **Store original confidence** when boosting for audit trail

## Performance Considerations

- All functions are CPU-bound and lightweight (no I/O)
- `calculate_entity_confidence()`: O(1) per entity
- `calculate_aggregate_confidence()`: O(n) for n entities
- `meets_confidence_threshold()`: O(n) for n entities
- Typical performance: <1ms for 100 entities

## Future Enhancements

Potential additions to the confidence scoring system:

1. **ML-based confidence adjustment** using historical accuracy data
2. **Entity cross-validation** (e.g., CF matches person name)
3. **Document-level context** (legal domain, document type)
4. **Temporal confidence decay** for cached results
5. **User feedback integration** to improve scoring over time
