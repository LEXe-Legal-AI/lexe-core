"""
Example usage of the confidence scoring system for PII detection.

This script demonstrates how to use the confidence scoring utilities
to evaluate and improve entity detection quality.
"""

from llsearch.privacy.pipeline.base_pipeline import DetectedEntity, EntityType
from llsearch.privacy.utils.confidence_scorer import (
    calculate_entity_confidence,
    calculate_aggregate_confidence,
    meets_confidence_threshold,
    boost_confidence_with_context,
    ConfidenceMetrics,
)


def example_1_basic_entity_scoring():
    """Example 1: Calculate confidence for individual entities"""
    print("=" * 70)
    print("EXAMPLE 1: Basic Entity Confidence Scoring")
    print("=" * 70)

    # Create a detected Codice Fiscale entity
    cf_entity = DetectedEntity(
        text="RSSMRA85T10A562S",
        type=EntityType.FISCAL_CODE,
        start=25,
        end=41,
        confidence=0.90,  # Base confidence from detection engine
        context_before="Il cliente Mario Rossi (CF:",
        context_after=") residente a Roma",
        metadata={'validation_passed': True}  # Checksum validated
    )

    # Calculate enhanced confidence
    enhanced_confidence = calculate_entity_confidence(
        entity=cf_entity,
        context={
            'validation_passed': True,
            'keywords_present': True  # "CF:" keyword present
        }
    )

    print(f"\nEntity: {cf_entity.text}")
    print(f"Type: {cf_entity.type.value}")
    print(f"Base confidence: {cf_entity.confidence:.3f}")
    print(f"Enhanced confidence: {enhanced_confidence:.3f}")
    print(f"Boost factors applied:")
    print(f"  - High reliability entity type: +0.10")
    print(f"  - Context keywords present: +0.10")
    print(f"  - Validation passed: +0.15")
    print(f"  Total boost: +0.35 → Final: {enhanced_confidence:.3f}")


def example_2_aggregate_metrics():
    """Example 2: Calculate aggregate confidence metrics"""
    print("\n" + "=" * 70)
    print("EXAMPLE 2: Aggregate Confidence Metrics")
    print("=" * 70)

    # Create multiple detected entities with varying confidence
    entities = [
        DetectedEntity(
            text="Mario Rossi",
            type=EntityType.PERSON,
            start=0,
            end=11,
            confidence=0.85
        ),
        DetectedEntity(
            text="RSSMRA85T10A562S",
            type=EntityType.FISCAL_CODE,
            start=20,
            end=36,
            confidence=0.95,
            metadata={'validation_passed': True}
        ),
        DetectedEntity(
            text="12345678901",
            type=EntityType.VAT_NUMBER,
            start=50,
            end=61,
            confidence=0.88,
            metadata={'validation_passed': True}
        ),
        DetectedEntity(
            text="Via Roma 123",
            type=EntityType.ADDRESS,
            start=70,
            end=82,
            confidence=0.72
        ),
        DetectedEntity(
            text="mario.rossi@example.com",
            type=EntityType.EMAIL,
            start=90,
            end=113,
            confidence=0.92
        ),
    ]

    # Calculate aggregate metrics
    metrics = calculate_aggregate_confidence(entities)

    print(f"\nTotal entities detected: {metrics.total_entities}")
    print(f"\nConfidence Statistics:")
    print(f"  Mean:   {metrics.mean_confidence:.3f}")
    print(f"  Median: {metrics.median_confidence:.3f}")
    print(f"  Min:    {metrics.min_confidence:.3f}")
    print(f"  Max:    {metrics.max_confidence:.3f}")
    print(f"  StdDev: {metrics.std_deviation:.3f}")

    print(f"\nConfidence Distribution:")
    print(f"  High (≥0.8):     {metrics.high_confidence_count} entities "
          f"({metrics.high_confidence_count/metrics.total_entities*100:.1f}%)")
    print(f"  Medium (0.6-0.8): {metrics.medium_confidence_count} entities "
          f"({metrics.medium_confidence_count/metrics.total_entities*100:.1f}%)")
    print(f"  Low (<0.6):      {metrics.low_confidence_count} entities "
          f"({metrics.low_confidence_count/metrics.total_entities*100:.1f}%)")

    # Show dictionary representation
    print(f"\nJSON representation:")
    import json
    print(json.dumps(metrics.to_dict(), indent=2))


def example_3_threshold_evaluation():
    """Example 3: Evaluate if results meet confidence threshold"""
    print("\n" + "=" * 70)
    print("EXAMPLE 3: Confidence Threshold Evaluation")
    print("=" * 70)

    # Scenario 1: High-quality results
    high_quality_entities = [
        DetectedEntity(text="RSSMRA85T10A562S", type=EntityType.FISCAL_CODE,
                      start=0, end=16, confidence=0.95),
        DetectedEntity(text="12345678901", type=EntityType.VAT_NUMBER,
                      start=20, end=31, confidence=0.90),
        DetectedEntity(text="email@test.com", type=EntityType.EMAIL,
                      start=40, end=54, confidence=0.92),
    ]

    print("\nScenario 1: High-quality detection results")
    print(f"Entities: {len(high_quality_entities)}")
    print(f"Confidences: {[e.confidence for e in high_quality_entities]}")

    threshold = 0.6
    meets_threshold = meets_confidence_threshold(high_quality_entities, threshold=threshold)
    print(f"\nMeets threshold {threshold}? {meets_threshold}")

    threshold = 0.9
    meets_threshold = meets_confidence_threshold(high_quality_entities, threshold=threshold)
    print(f"Meets threshold {threshold}? {meets_threshold}")

    # Scenario 2: Mixed-quality results
    print("\n" + "-" * 70)
    mixed_quality_entities = [
        DetectedEntity(text="John", type=EntityType.PERSON,
                      start=0, end=4, confidence=0.65),
        DetectedEntity(text="RSSMRA85T10A562S", type=EntityType.FISCAL_CODE,
                      start=10, end=26, confidence=0.95),
        DetectedEntity(text="Rome", type=EntityType.LOCATION,
                      start=30, end=34, confidence=0.55),  # Low confidence
        DetectedEntity(text="Company Inc", type=EntityType.ORGANIZATION,
                      start=40, end=51, confidence=0.70),
    ]

    print("\nScenario 2: Mixed-quality detection results")
    print(f"Entities: {len(mixed_quality_entities)}")
    print(f"Confidences: {[e.confidence for e in mixed_quality_entities]}")

    threshold = 0.6
    min_percentage = 0.8  # 80% of entities must meet threshold
    meets_threshold = meets_confidence_threshold(
        mixed_quality_entities,
        threshold=threshold,
        min_percentage=min_percentage
    )
    print(f"\nMeets threshold {threshold} with {min_percentage*100}% entities? {meets_threshold}")

    # More lenient check
    min_percentage = 0.5  # 50% of entities must meet threshold
    meets_threshold = meets_confidence_threshold(
        mixed_quality_entities,
        threshold=threshold,
        min_percentage=min_percentage
    )
    print(f"Meets threshold {threshold} with {min_percentage*100}% entities? {meets_threshold}")


def example_4_context_boosting():
    """Example 4: Boost confidence with context information"""
    print("\n" + "=" * 70)
    print("EXAMPLE 4: Context-Based Confidence Boosting")
    print("=" * 70)

    # Original entity with base confidence
    original_entity = DetectedEntity(
        text="RSSMRA85T10A562S",
        type=EntityType.FISCAL_CODE,
        start=25,
        end=41,
        confidence=0.75  # Moderate base confidence
    )

    print(f"\nOriginal Entity:")
    print(f"  Text: {original_entity.text}")
    print(f"  Type: {original_entity.type.value}")
    print(f"  Confidence: {original_entity.confidence:.3f}")

    # Boost with context
    surrounding_text = "Codice fiscale del cliente: RSSMRA85T10A562S (verificato)"
    boosted_entity = boost_confidence_with_context(
        entity=original_entity,
        surrounding_text=surrounding_text,
        validation_passed=True
    )

    print(f"\nBoosted Entity:")
    print(f"  Text: {boosted_entity.text}")
    print(f"  Type: {boosted_entity.type.value}")
    print(f"  Confidence: {boosted_entity.confidence:.3f}")
    print(f"  Confidence increase: +{boosted_entity.confidence - original_entity.confidence:.3f}")

    print(f"\nBoost factors (from metadata):")
    boost_factors = boosted_entity.metadata.get('boost_factors', {})
    for factor, value in boost_factors.items():
        print(f"  {factor}: {value}")


def example_5_entity_type_reliability():
    """Example 5: Entity type reliability comparison"""
    print("\n" + "=" * 70)
    print("EXAMPLE 5: Entity Type Reliability Scores")
    print("=" * 70)

    from llsearch.privacy.utils.confidence_scorer import ENTITY_TYPE_RELIABILITY

    print("\nEntity Type Reliability Rankings:")
    print("(Higher scores = more reliable detection patterns)\n")

    # Sort by reliability score
    sorted_types = sorted(
        ENTITY_TYPE_RELIABILITY.items(),
        key=lambda x: x[1],
        reverse=True
    )

    for entity_type, reliability in sorted_types:
        bar = "█" * int(reliability * 20)
        print(f"{entity_type.value:20s} {reliability:.2f} {bar}")

    print("\nInterpretation:")
    print("  0.90-1.00: Very High (checksum validation + complex patterns)")
    print("  0.80-0.89: High (structured formats with validation)")
    print("  0.70-0.79: Medium (pattern-based with context)")
    print("  0.60-0.69: Medium-Low (NER-based, context-dependent)")
    print("  0.50-0.59: Low (ambiguous patterns)")


def example_6_real_world_scenario():
    """Example 6: Real-world legal document processing"""
    print("\n" + "=" * 70)
    print("EXAMPLE 6: Real-World Legal Document Processing")
    print("=" * 70)

    # Simulate detection results from a legal contract
    document_text = """
    CONTRATTO DI PRESTAZIONE

    Il Sig. Mario Rossi, nato a Roma il 10/10/1985,
    codice fiscale RSSMRA85T10A562S, residente in Via Roma 123, Roma,
    email: mario.rossi@example.com, tel: +39 333 1234567

    in qualità di prestatore d'opera per la società ABC S.r.l.,
    P.IVA 12345678901, con sede legale in Milano.
    """

    entities = [
        DetectedEntity(
            text="Mario Rossi",
            type=EntityType.PERSON,
            start=45,
            end=56,
            confidence=0.82,
            context_before="Il Sig.",
            context_after=", nato a Roma"
        ),
        DetectedEntity(
            text="RSSMRA85T10A562S",
            type=EntityType.FISCAL_CODE,
            start=105,
            end=121,
            confidence=0.90,
            context_before="codice fiscale",
            context_after=", residente in",
            metadata={'validation_passed': True}
        ),
        DetectedEntity(
            text="Via Roma 123",
            type=EntityType.ADDRESS,
            start=135,
            end=147,
            confidence=0.68,
            context_before="residente in",
            context_after=", Roma"
        ),
        DetectedEntity(
            text="mario.rossi@example.com",
            type=EntityType.EMAIL,
            start=165,
            end=188,
            confidence=0.95,
            context_before="email:",
            context_after=", tel:"
        ),
        DetectedEntity(
            text="+39 333 1234567",
            type=EntityType.PHONE,
            start=195,
            end=210,
            confidence=0.78,
            context_before="tel:",
            context_after=""
        ),
        DetectedEntity(
            text="ABC S.r.l.",
            type=EntityType.ORGANIZATION,
            start=275,
            end=285,
            confidence=0.72,
            context_before="società",
            context_after=", P.IVA"
        ),
        DetectedEntity(
            text="12345678901",
            type=EntityType.VAT_NUMBER,
            start=295,
            end=306,
            confidence=0.88,
            context_before="P.IVA",
            context_after=", con sede",
            metadata={'validation_passed': True}
        ),
    ]

    print("\nDocument Analysis:")
    print(f"Total entities detected: {len(entities)}")

    # Calculate aggregate metrics
    metrics = calculate_aggregate_confidence(entities)

    print(f"\nOverall Quality Metrics:")
    print(f"  Mean confidence: {metrics.mean_confidence:.3f}")
    print(f"  High confidence entities: {metrics.high_confidence_count}/{metrics.total_entities}")

    # Check if meets quality threshold
    threshold = 0.7
    quality_check = meets_confidence_threshold(entities, threshold=threshold)

    print(f"\nQuality Check (threshold={threshold}):")
    print(f"  Meets threshold: {'✓ PASS' if quality_check else '✗ FAIL'}")

    # Show entity breakdown
    print(f"\nEntity Breakdown:")
    for i, entity in enumerate(entities, 1):
        status = "✓" if entity.confidence >= threshold else "✗"
        print(f"  {status} {i}. {entity.type.value:15s} confidence={entity.confidence:.2f} "
              f"text='{entity.text}'")

    # Demonstrate confidence boosting for low-confidence entities
    print(f"\nBoosting low-confidence entities:")
    for entity in entities:
        if entity.confidence < 0.8:
            # Recalculate with context
            boosted_conf = calculate_entity_confidence(entity)
            if boosted_conf > entity.confidence:
                print(f"  {entity.type.value:15s} {entity.confidence:.2f} → {boosted_conf:.2f} "
                      f"(+{boosted_conf - entity.confidence:.2f})")


def main():
    """Run all examples"""
    print("\n")
    print("╔" + "═" * 68 + "╗")
    print("║" + " " * 10 + "PII CONFIDENCE SCORING SYSTEM - EXAMPLES" + " " * 18 + "║")
    print("╚" + "═" * 68 + "╝")

    example_1_basic_entity_scoring()
    example_2_aggregate_metrics()
    example_3_threshold_evaluation()
    example_4_context_boosting()
    example_5_entity_type_reliability()
    example_6_real_world_scenario()

    print("\n" + "=" * 70)
    print("All examples completed successfully!")
    print("=" * 70 + "\n")


if __name__ == '__main__':
    main()
