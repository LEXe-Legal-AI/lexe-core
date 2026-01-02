"""
Example usage of Presidio Engine for PII detection and anonymization.

Requirements:
    pip install presidio-analyzer presidio-anonymizer spacy
    python -m spacy download it_core_news_lg

Usage:
    python example_usage.py
"""

import asyncio
from presidio_engine import PresidioEngine


async def main():
    """Demonstrate Presidio engine usage."""

    print("=" * 60)
    print("Presidio Engine - Italian PII Detection Demo")
    print("=" * 60)

    # Initialize engine
    print("\n[1] Initializing Presidio engine...")
    engine = PresidioEngine(
        model_name='it_core_news_lg',
        confidence_threshold=0.7,
        anonymization_strategy='replace',
    )

    # Display pipeline info
    info = engine.get_pipeline_info()
    print(f"    Engine: {info['engine']} v{info['version']}")
    print(f"    Model: {info['model']}")
    print(f"    Recognizers: {', '.join(info['recognizers'][:5])}...")
    print(f"    Confidence threshold: {info['confidence_threshold']}")
    print(f"    Anonymization strategy: {info['anonymization_strategy']}")

    # Test document
    test_text = """
    TRIBUNALE DI MILANO

    Il Dr. Mario Rossi, CF: RSSMRA85T10A562S,
    residente in Via Roma 123, Milano.
    Email: [email protected]
    Tel: +39 333 1234567

    Società ABC S.r.l., P.IVA: 12345678901
    """

    print("\n[2] Original Text:")
    print("-" * 60)
    print(test_text)

    # Process document
    print("\n[3] Processing...")
    result = await engine.process(text=test_text, user_id='demo')

    # Display results
    print(f"\n[4] Results:")
    print(f"    Entities detected: {len(result.entities)}")
    print(f"    Processing time: {result.processing_time_ms:.2f}ms")

    print("\n[5] Detected Entities:")
    for entity in result.entities:
        print(f"    {entity.type.value:10} | {entity.text:30} | {entity.confidence:.2f}")

    print("\n[6] Anonymized Text:")
    print("-" * 60)
    print(result.anonymized_text)

    print("\n" + "=" * 60)
    print("Demo completed!")
    print("=" * 60)


if __name__ == '__main__':
    asyncio.run(main())
