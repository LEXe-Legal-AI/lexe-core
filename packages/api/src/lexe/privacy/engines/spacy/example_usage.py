"""
Example usage of spaCy Engine for PII detection and anonymization.

This script demonstrates how to use the SpacyEngine to detect and anonymize
PII in Italian legal documents.

Requirements:
    pip install spacy
    python -m spacy download it_core_news_lg

Usage:
    python example_usage.py
"""

import asyncio
from spacy_engine import SpacyEngine


async def main():
    """Demonstrate spaCy engine usage."""

    print("=" * 60)
    print("spaCy Engine - Italian PII Detection Demo")
    print("=" * 60)

    # Initialize engine
    print("\n[1] Initializing spaCy engine...")
    engine = SpacyEngine(
        model_name='it_core_news_lg',
        confidence_threshold=0.7,
        replacement_strategy='deterministic',
        use_custom_recognizers=True,
    )

    # Display pipeline info
    info = engine.get_pipeline_info()
    print(f"    Engine: {info['engine']} v{info['version']}")
    print(f"    Model: {info['model']}")
    print(f"    Pipeline: {', '.join(info['pipeline'])}")
    print(f"    Confidence threshold: {info['confidence_threshold']}")
    print(f"    Replacement strategy: {info['replacement_strategy']}")

    # Test document (Italian legal text with PII)
    test_text = """
    TRIBUNALE DI MILANO

    Sentenza n. 1234/2024

    Il Tribunale di Milano, nella persona del Giudice Dr. Mario Rossi,
    ha emesso la seguente sentenza nel procedimento civile R.G. n. 12345/2023.

    PARTE ATTRICE:
    Giuseppe Bianchi, nato a Roma il 15/10/1985,
    Codice Fiscale: BNCGPP85R15H501Z,
    residente in Via Giuseppe Verdi 123, Milano (MI),
    P.IVA: 12345678901,
    email: [email protected],
    tel: +39 333 1234567

    PARTE CONVENUTA:
    Società ABC S.r.l., con sede in Via Roma 456, Milano,
    P.IVA: 09876543210,
    rappresentata dall'Avv. Laura Neri.

    RITENUTO IN FATTO:
    Il sig. Bianchi ha convenuto in giudizio la società ABC S.r.l.
    per inadempimento contrattuale...
    """

    print("\n[2] Original Text (snippet):")
    print("-" * 60)
    print(test_text[:300] + "...")

    # Process document
    print("\n[3] Processing document...")
    result = await engine.process(
        text=test_text,
        user_id='demo_user',
        document_id='demo_doc_001'
    )

    # Display results
    print(f"\n[4] Detection Results:")
    print(f"    Success: {result.success}")
    print(f"    Entities detected: {len(result.entities)}")
    print(f"    Processing time: {result.processing_time_ms:.2f}ms")

    print("\n[5] Detected Entities:")
    print("-" * 60)
    for i, entity in enumerate(result.entities, 1):
        print(f"    {i}. {entity.type.value:10} | {entity.text:30} | conf: {entity.confidence:.2f}")

    print("\n[6] Anonymized Text:")
    print("-" * 60)
    print(result.anonymized_text[:400] + "...")

    print("\n[7] Entity Statistics:")
    print("-" * 60)
    entity_counts = {}
    for entity in result.entities:
        entity_type = entity.type.value
        entity_counts[entity_type] = entity_counts.get(entity_type, 0) + 1

    for entity_type, count in sorted(entity_counts.items()):
        print(f"    {entity_type}: {count}")

    print("\n" + "=" * 60)
    print("Demo completed successfully!")
    print("=" * 60)


if __name__ == '__main__':
    asyncio.run(main())
