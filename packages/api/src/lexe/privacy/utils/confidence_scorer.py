"""
Confidence scoring system for PII detection results.

This module provides utilities to calculate and evaluate confidence scores
for detected entities based on multiple factors including pattern strength,
context keywords, validation results, and entity type reliability.

Example:
    from llsearch.privacy.utils.confidence_scorer import (
        calculate_entity_confidence,
        calculate_aggregate_confidence,
        meets_confidence_threshold
    )

    # Score individual entity
    confidence = calculate_entity_confidence(
        entity=detected_entity,
        context={'keywords_present': True, 'validation_passed': True}
    )

    # Calculate aggregate metrics
    metrics = calculate_aggregate_confidence(entities)
    print(f"Mean confidence: {metrics['mean_confidence']}")

    # Check threshold
    if meets_confidence_threshold(entities, threshold=0.6):
        print("Results meet minimum confidence threshold")
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from llsearch.privacy.pipeline.base_pipeline import DetectedEntity, EntityType


# Entity type reliability scores (based on pattern complexity and validation robustness)
ENTITY_TYPE_RELIABILITY = {
    EntityType.FISCAL_CODE: 0.95,      # High: Complex pattern + checksum validation
    EntityType.VAT_NUMBER: 0.90,       # High: 11 digits + checksum validation
    EntityType.IBAN: 0.90,             # High: Standard format + checksum
    EntityType.EMAIL: 0.85,            # High: Well-defined pattern
    EntityType.PHONE: 0.75,            # Medium: Varied formats, partial validation
    EntityType.PASSPORT: 0.80,         # Medium-High: Structured format
    EntityType.ID_CARD: 0.80,          # Medium-High: Structured format
    EntityType.DATE: 0.70,             # Medium: Can be ambiguous
    EntityType.PERSON: 0.65,           # Medium-Low: NER-based, context-dependent
    EntityType.ORGANIZATION: 0.65,     # Medium-Low: NER-based, context-dependent
    EntityType.LOCATION: 0.60,         # Medium-Low: Can be ambiguous
    EntityType.COURT: 0.75,            # Medium: Legal context helps
    EntityType.JUDGE: 0.70,            # Medium: Legal context helps
    EntityType.LAWYER: 0.70,           # Medium: Legal context helps
    EntityType.ADDRESS: 0.65,          # Medium-Low: Varied formats
    EntityType.OTHER: 0.50,            # Low: Catch-all category
}

# Default reliability for unknown types
DEFAULT_RELIABILITY = 0.60

# Context keywords that boost confidence by entity type
CONTEXT_KEYWORDS = {
    EntityType.FISCAL_CODE: [
        "codice fiscale", "c.f.", "cf", "nato a", "nata a",
        "residente in", "domiciliato in", "domiciliata in"
    ],
    EntityType.VAT_NUMBER: [
        "p.iva", "p. iva", "partita iva", "vat", "vat number", "p.i."
    ],
    EntityType.PERSON: [
        "nome", "cognome", "sig.", "sig.ra", "dott.", "dott.ssa",
        "avv.", "ing.", "prof."
    ],
    EntityType.EMAIL: [
        "email", "e-mail", "pec", "contatto", "scrivere a"
    ],
    EntityType.PHONE: [
        "tel.", "telefono", "cell.", "cellulare", "fax", "contattare"
    ],
    EntityType.ORGANIZATION: [
        "società", "s.r.l.", "s.p.a.", "ditta", "azienda", "impresa"
    ],
    EntityType.COURT: [
        "tribunale", "corte", "giudice", "sentenza", "ordinanza"
    ],
    EntityType.IBAN: [
        "iban", "conto corrente", "bonifico", "c/c", "coordinate bancarie"
    ],
}

# Confidence boosting factors
BOOST_CONTEXT_KEYWORDS = 0.10      # Boost when context keywords present
BOOST_VALIDATION_PASSED = 0.15     # Boost when validation passed
BOOST_MULTIPLE_PATTERNS = 0.10     # Boost when multiple patterns match
BOOST_HIGH_RELIABILITY = 0.10      # Boost for high-reliability entity types


@dataclass
class ConfidenceMetrics:
    """
    Aggregate confidence metrics for a set of detected entities.

    Attributes:
        mean_confidence: Average confidence across all entities
        median_confidence: Median confidence value
        min_confidence: Lowest confidence score
        max_confidence: Highest confidence score
        std_deviation: Standard deviation of confidence scores
        high_confidence_count: Number of entities with confidence >= 0.8
        medium_confidence_count: Number of entities with confidence >= 0.6 and < 0.8
        low_confidence_count: Number of entities with confidence < 0.6
        total_entities: Total number of entities
    """
    mean_confidence: float
    median_confidence: float
    min_confidence: float
    max_confidence: float
    std_deviation: float
    high_confidence_count: int
    medium_confidence_count: int
    low_confidence_count: int
    total_entities: int

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'mean_confidence': round(self.mean_confidence, 4),
            'median_confidence': round(self.median_confidence, 4),
            'min_confidence': round(self.min_confidence, 4),
            'max_confidence': round(self.max_confidence, 4),
            'std_deviation': round(self.std_deviation, 4),
            'high_confidence_count': self.high_confidence_count,
            'medium_confidence_count': self.medium_confidence_count,
            'low_confidence_count': self.low_confidence_count,
            'total_entities': self.total_entities,
            'high_confidence_percentage': round(
                (self.high_confidence_count / self.total_entities * 100)
                if self.total_entities > 0 else 0, 2
            ),
        }


def calculate_entity_confidence(
    entity: DetectedEntity,
    context: Optional[Dict[str, Any]] = None
) -> float:
    """
    Calculate confidence score (0.0-1.0) for a detected entity.

    The confidence score is calculated based on multiple factors:
    1. Base confidence from the detection engine
    2. Pattern match strength (from entity metadata)
    3. Context keywords present
    4. Validation passed (checksum, format)
    5. Entity type reliability

    Args:
        entity: Detected entity object
        context: Optional context dictionary with keys:
            - 'keywords_present': bool - Whether context keywords were found
            - 'validation_passed': bool - Whether validation succeeded
            - 'multiple_patterns': bool - Whether multiple patterns matched
            - 'surrounding_text': str - Text around entity for keyword detection
            - 'pattern_complexity': float - Pattern complexity score (0.0-1.0)

    Returns:
        Adjusted confidence score (0.0 to 1.0, capped at 1.0)

    Example:
        >>> entity = DetectedEntity(
        ...     text="RSSMRA85T10A562S",
        ...     type=EntityType.FISCAL_CODE,
        ...     start=0,
        ...     end=16,
        ...     confidence=0.9
        ... )
        >>> context = {
        ...     'keywords_present': True,
        ...     'validation_passed': True,
        ...     'surrounding_text': "codice fiscale: RSSMRA85T10A562S"
        ... }
        >>> score = calculate_entity_confidence(entity, context)
        >>> print(f"Confidence: {score:.2f}")
        Confidence: 1.00
    """
    if context is None:
        context = {}

    # Start with base confidence from detection engine
    confidence = entity.confidence

    # Factor 1: Entity type reliability
    type_reliability = ENTITY_TYPE_RELIABILITY.get(entity.type, DEFAULT_RELIABILITY)
    if type_reliability >= 0.85:
        confidence += BOOST_HIGH_RELIABILITY

    # Factor 2: Context keywords present
    keywords_present = context.get('keywords_present', False)

    # Auto-detect keywords from surrounding text if not explicitly provided
    if not keywords_present and 'surrounding_text' in context:
        keywords_present = _check_context_keywords(
            entity.type,
            context['surrounding_text']
        )

    # Also check entity context_before and context_after if available
    if not keywords_present and (entity.context_before or entity.context_after):
        surrounding = f"{entity.context_before or ''} {entity.context_after or ''}".lower()
        keywords_present = _check_context_keywords(entity.type, surrounding)

    if keywords_present:
        confidence += BOOST_CONTEXT_KEYWORDS

    # Factor 3: Validation passed
    validation_passed = context.get('validation_passed', False)

    # Auto-detect validation from entity metadata
    if not validation_passed and entity.metadata:
        validation_passed = entity.metadata.get('validation_passed', False)

    if validation_passed:
        confidence += BOOST_VALIDATION_PASSED

    # Factor 4: Multiple pattern matches
    multiple_patterns = context.get('multiple_patterns', False)
    if multiple_patterns:
        confidence += BOOST_MULTIPLE_PATTERNS

    # Factor 5: Pattern complexity (if provided)
    pattern_complexity = context.get('pattern_complexity')
    if pattern_complexity is not None and pattern_complexity >= 0.8:
        confidence += 0.05  # Small boost for complex patterns

    # Cap at 1.0
    return min(confidence, 1.0)


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
            (only used if recalculate_scores=True)

    Returns:
        ConfidenceMetrics object with aggregate statistics

    Example:
        >>> entities = [
        ...     DetectedEntity(text="John", type=EntityType.PERSON,
        ...                   start=0, end=4, confidence=0.85),
        ...     DetectedEntity(text="RSSMRA85T10A562S", type=EntityType.FISCAL_CODE,
        ...                   start=10, end=26, confidence=0.95),
        ... ]
        >>> metrics = calculate_aggregate_confidence(entities)
        >>> print(metrics.to_dict())
        {
            'mean_confidence': 0.9,
            'high_confidence_count': 2,
            'total_entities': 2,
            ...
        }
    """
    if not entities:
        return ConfidenceMetrics(
            mean_confidence=0.0,
            median_confidence=0.0,
            min_confidence=0.0,
            max_confidence=0.0,
            std_deviation=0.0,
            high_confidence_count=0,
            medium_confidence_count=0,
            low_confidence_count=0,
            total_entities=0
        )

    # Get confidence scores
    if recalculate_scores and context_per_entity:
        confidences = [
            calculate_entity_confidence(
                entity,
                context_per_entity.get(i, {})
            )
            for i, entity in enumerate(entities)
        ]
    else:
        confidences = [entity.confidence for entity in entities]

    # Calculate statistics
    mean_conf = sum(confidences) / len(confidences)

    # Median
    sorted_conf = sorted(confidences)
    n = len(sorted_conf)
    if n % 2 == 0:
        median_conf = (sorted_conf[n // 2 - 1] + sorted_conf[n // 2]) / 2
    else:
        median_conf = sorted_conf[n // 2]

    min_conf = min(confidences)
    max_conf = max(confidences)

    # Standard deviation
    variance = sum((c - mean_conf) ** 2 for c in confidences) / len(confidences)
    std_dev = variance ** 0.5

    # Count by confidence level
    high_count = sum(1 for c in confidences if c >= 0.8)
    medium_count = sum(1 for c in confidences if 0.6 <= c < 0.8)
    low_count = sum(1 for c in confidences if c < 0.6)

    return ConfidenceMetrics(
        mean_confidence=mean_conf,
        median_confidence=median_conf,
        min_confidence=min_conf,
        max_confidence=max_conf,
        std_deviation=std_dev,
        high_confidence_count=high_count,
        medium_confidence_count=medium_count,
        low_confidence_count=low_count,
        total_entities=len(entities)
    )


def meets_confidence_threshold(
    entities: List[DetectedEntity],
    threshold: float = 0.6,
    min_percentage: float = 0.8,
    check_mean: bool = True
) -> bool:
    """
    Check if entity detection results meet minimum confidence threshold.

    This function provides multiple threshold evaluation strategies:
    1. Mean confidence >= threshold (if check_mean=True)
    2. At least min_percentage of entities >= threshold

    Args:
        entities: List of detected entities
        threshold: Minimum confidence threshold (default: 0.6)
        min_percentage: Minimum percentage of entities that must meet threshold
            (default: 0.8 = 80%)
        check_mean: If True, also check mean confidence >= threshold

    Returns:
        True if results meet threshold criteria, False otherwise

    Example:
        >>> entities = [
        ...     DetectedEntity(text="John", type=EntityType.PERSON,
        ...                   start=0, end=4, confidence=0.85),
        ...     DetectedEntity(text="RSSMRA85T10A562S", type=EntityType.FISCAL_CODE,
        ...                   start=10, end=26, confidence=0.95),
        ... ]
        >>> meets_confidence_threshold(entities, threshold=0.6)
        True
        >>> meets_confidence_threshold(entities, threshold=0.9)
        False
    """
    if not entities:
        return False

    metrics = calculate_aggregate_confidence(entities)

    # Check 1: Mean confidence
    if check_mean and metrics.mean_confidence < threshold:
        return False

    # Check 2: Percentage of entities meeting threshold
    entities_meeting_threshold = sum(
        1 for entity in entities if entity.confidence >= threshold
    )
    percentage_meeting = entities_meeting_threshold / len(entities)

    return percentage_meeting >= min_percentage


def _check_context_keywords(entity_type: EntityType, text: str) -> bool:
    """
    Check if context keywords for entity type are present in text.

    Args:
        entity_type: Type of entity
        text: Surrounding text to check

    Returns:
        True if any context keywords found
    """
    if entity_type not in CONTEXT_KEYWORDS:
        return False

    text_lower = text.lower()
    keywords = CONTEXT_KEYWORDS[entity_type]

    return any(keyword in text_lower for keyword in keywords)


def boost_confidence_with_context(
    entity: DetectedEntity,
    surrounding_text: str,
    validation_passed: bool = False
) -> DetectedEntity:
    """
    Create a new entity with boosted confidence based on context.

    This is a convenience function that creates a copy of the entity
    with updated confidence score.

    Args:
        entity: Original detected entity
        surrounding_text: Text surrounding the entity
        validation_passed: Whether validation succeeded

    Returns:
        New DetectedEntity with updated confidence

    Example:
        >>> entity = DetectedEntity(
        ...     text="RSSMRA85T10A562S",
        ...     type=EntityType.FISCAL_CODE,
        ...     start=0,
        ...     end=16,
        ...     confidence=0.8
        ... )
        >>> boosted = boost_confidence_with_context(
        ...     entity,
        ...     surrounding_text="codice fiscale: RSSMRA85T10A562S",
        ...     validation_passed=True
        ... )
        >>> print(f"Original: {entity.confidence:.2f}, Boosted: {boosted.confidence:.2f}")
        Original: 0.80, Boosted: 1.00
    """
    context = {
        'surrounding_text': surrounding_text,
        'validation_passed': validation_passed
    }

    new_confidence = calculate_entity_confidence(entity, context)

    # Create new entity with updated confidence
    return DetectedEntity(
        text=entity.text,
        type=entity.type,
        start=entity.start,
        end=entity.end,
        confidence=new_confidence,
        context_before=entity.context_before,
        context_after=entity.context_after,
        metadata={
            **entity.metadata,
            'original_confidence': entity.confidence,
            'confidence_boosted': True,
            'boost_factors': {
                'keywords_present': _check_context_keywords(entity.type, surrounding_text),
                'validation_passed': validation_passed
            }
        }
    )
