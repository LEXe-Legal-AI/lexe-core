"""
Simple standalone test for confidence scoring system.
Tests the core functions without requiring full dependency chain.
"""

# Test that the module can be imported and key functions work
def test_imports():
    """Test that all key functions can be imported"""
    try:
        from confidence_scorer import (
            calculate_entity_confidence,
            calculate_aggregate_confidence,
            meets_confidence_threshold,
            boost_confidence_with_context,
            ConfidenceMetrics,
            ENTITY_TYPE_RELIABILITY,
            CONTEXT_KEYWORDS,
        )
        print("✓ All imports successful")
        return True
    except ImportError as e:
        print(f"✗ Import failed: {e}")
        return False


def test_constants():
    """Test that constants are properly defined"""
    from confidence_scorer import ENTITY_TYPE_RELIABILITY, CONTEXT_KEYWORDS

    print(f"\n✓ ENTITY_TYPE_RELIABILITY defined with {len(ENTITY_TYPE_RELIABILITY)} types")
    print(f"✓ CONTEXT_KEYWORDS defined with {len(CONTEXT_KEYWORDS)} entity types")

    # Show sample
    print("\nSample entity reliabilities:")
    for i, (entity_type, score) in enumerate(list(ENTITY_TYPE_RELIABILITY.items())[:3]):
        print(f"  - {entity_type}: {score}")

    return True


def test_confidence_metrics_dataclass():
    """Test ConfidenceMetrics dataclass"""
    from confidence_scorer import ConfidenceMetrics

    metrics = ConfidenceMetrics(
        mean_confidence=0.85,
        median_confidence=0.87,
        min_confidence=0.65,
        max_confidence=0.95,
        std_deviation=0.10,
        high_confidence_count=7,
        medium_confidence_count=2,
        low_confidence_count=1,
        total_entities=10
    )

    print("\n✓ ConfidenceMetrics dataclass created")
    print(f"  Mean: {metrics.mean_confidence}")
    print(f"  Total entities: {metrics.total_entities}")

    # Test to_dict method
    metrics_dict = metrics.to_dict()
    assert 'mean_confidence' in metrics_dict
    assert 'high_confidence_percentage' in metrics_dict
    print(f"✓ to_dict() works - {len(metrics_dict)} fields")

    return True


def main():
    """Run all simple tests"""
    print("=" * 70)
    print("CONFIDENCE SCORER - SIMPLE STANDALONE TESTS")
    print("=" * 70)

    tests = [
        ("Imports", test_imports),
        ("Constants", test_constants),
        ("ConfidenceMetrics", test_confidence_metrics_dataclass),
    ]

    passed = 0
    failed = 0

    for name, test_func in tests:
        print(f"\n--- Test: {name} ---")
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"✗ Test failed with exception: {e}")
            failed += 1

    print("\n" + "=" * 70)
    print(f"Test Results: {passed} passed, {failed} failed")
    print("=" * 70)

    return failed == 0


if __name__ == '__main__':
    import sys
    sys.exit(0 if main() else 1)
