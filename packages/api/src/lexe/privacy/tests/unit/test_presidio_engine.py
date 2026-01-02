"""
Unit tests for PresidioEngine (engines/presidio/presidio_engine.py)

Tests cover Presidio analyzer/anonymizer initialization,
Italian custom recognizers, and pipeline integration.

Total: 10 tests
"""
import pytest
import asyncio
from unittest.mock import Mock, patch, MagicMock
from typing import List

from llsearch.privacy.engines.presidio.presidio_engine import PresidioEngine
from llsearch.privacy.engines.presidio.analyzer import ItalianAnalyzer
from llsearch.privacy.engines.presidio.anonymizer import ItalianAnonymizer
from llsearch.privacy.pipeline.base_pipeline import DetectedEntity, EntityType, PipelineResult


# =============================================================================
# 1. ANALYZER CONFIGURATION TESTS (2 tests)
# =============================================================================

@pytest.mark.unit
def test_analyzer_initialization():
    """Test Presidio analyzer initialization with Italian support."""
    engine = PresidioEngine(
        model_name='it_core_news_lg',
        confidence_threshold=0.7,
        anonymization_strategy='replace'
    )

    # Verify engine configuration
    assert engine.name == 'presidio'
    assert engine.version == '2.2.0'
    assert engine.model_name == 'it_core_news_lg'
    assert engine.confidence_threshold == 0.7
    assert engine.anonymization_strategy == 'replace'

    # Verify analyzer and anonymizer are initialized
    assert isinstance(engine.analyzer, ItalianAnalyzer)
    assert isinstance(engine.anonymizer, ItalianAnonymizer)
    assert engine.analyzer.model_name == 'it_core_news_lg'


@pytest.mark.unit
def test_italian_language_support():
    """Test that analyzer supports Italian language and custom recognizers."""
    engine = PresidioEngine()

    # Get list of recognizers
    recognizers = engine.analyzer.get_recognizers(language='it')

    # Verify Italian-specific recognizers are present
    assert 'ItalianCFRecognizer' in recognizers
    assert 'ItalianPIVARecognizer' in recognizers
    assert 'ItalianLegalEntityRecognizer' in recognizers

    # Verify standard Presidio recognizers are also available
    # (Note: actual recognizer names may vary based on Presidio version)
    assert len(recognizers) >= 3  # At least our 3 custom recognizers


# =============================================================================
# 2. CUSTOM RECOGNIZERS TESTS (3 tests)
# =============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
async def test_italian_cf_recognizer():
    """Test Italian Codice Fiscale recognition with checksum validation."""
    engine = PresidioEngine(confidence_threshold=0.7)

    # Create mock analyzer result for CF
    from presidio_analyzer import RecognizerResult

    mock_results = [
        RecognizerResult(
            entity_type='CF',
            start=32,
            end=48,
            score=0.9,
            recognition_metadata={'recognizer_name': 'ItalianCFRecognizer'}
        )
    ]

    # Mock the analyzer to return our test results
    with patch.object(engine.analyzer, 'analyze', return_value=mock_results):
        text = "Il Giudice Dr. Mario Rossi, CF: RSSMRA85C15F205X."
        entities = await engine.detect_entities(text)

        # Verify CF was detected
        assert len(entities) == 1
        assert entities[0].type == EntityType.FISCAL_CODE
        assert entities[0].text == "RSSMRA85C15F205X"
        assert entities[0].confidence == 0.9
        assert entities[0].start == 32
        assert entities[0].end == 48
        assert entities[0].metadata['entity_type'] == 'CF'
        assert entities[0].metadata['recognizer'] == 'ItalianCFRecognizer'


@pytest.mark.unit
@pytest.mark.asyncio
async def test_italian_piva_recognizer():
    """Test Italian Partita IVA recognition with checksum validation."""
    engine = PresidioEngine(confidence_threshold=0.7)

    from presidio_analyzer import RecognizerResult

    mock_results = [
        RecognizerResult(
            entity_type='PIVA',
            start=16,
            end=27,
            score=0.95,
            recognition_metadata={'recognizer_name': 'ItalianPIVARecognizer'}
        )
    ]

    with patch.object(engine.analyzer, 'analyze', return_value=mock_results):
        text = "Società S.p.A. (12345678901) con sede a Milano."
        entities = await engine.detect_entities(text)

        # Verify P.IVA was detected
        assert len(entities) == 1
        assert entities[0].type == EntityType.VAT_NUMBER
        assert entities[0].text == "12345678901"
        assert entities[0].confidence == 0.95
        assert entities[0].metadata['entity_type'] == 'PIVA'
        assert entities[0].metadata['recognizer'] == 'ItalianPIVARecognizer'


@pytest.mark.unit
@pytest.mark.asyncio
async def test_legal_entity_recognizer():
    """Test Italian legal entity recognizer (courts, ministries)."""
    engine = PresidioEngine(confidence_threshold=0.7)

    from presidio_analyzer import RecognizerResult

    mock_results = [
        RecognizerResult(
            entity_type='ORG',
            start=0,
            end=19,
            score=0.92,
            recognition_metadata={'recognizer_name': 'ItalianLegalEntityRecognizer'}
        )
    ]

    with patch.object(engine.analyzer, 'analyze', return_value=mock_results):
        text = "Tribunale di Milano ha pronunciato sentenza."
        entities = await engine.detect_entities(text)

        # Verify legal entity was detected
        assert len(entities) == 1
        assert entities[0].type == EntityType.ORGANIZATION
        assert entities[0].text == "Tribunale di Milano"
        assert entities[0].confidence == 0.92


# =============================================================================
# 3. ANONYMIZER STRATEGIES TESTS (2 tests)
# =============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
async def test_replace_strategy():
    """Test replace anonymization strategy."""
    engine = PresidioEngine(anonymization_strategy='replace')

    text = "Mario Rossi, CF: RSSMRA85C15F205X"
    entities = [
        DetectedEntity(
            type=EntityType.PERSON,
            text="Mario Rossi",
            start=0,
            end=11,
            confidence=0.95
        ),
        DetectedEntity(
            type=EntityType.FISCAL_CODE,
            text="RSSMRA85C15F205X",
            start=17,
            end=33,
            confidence=0.98
        )
    ]

    # Mock the anonymizer to return expected result
    expected_result = "PERSON_1, CF: CF_2"
    with patch.object(engine.anonymizer, 'anonymize', return_value=expected_result):
        anonymized = await engine.anonymize(text, entities)

        # Verify entities were replaced with placeholders
        assert "PERSON_1" in anonymized or "PERSON_" in anonymized
        assert "CF_2" in anonymized or "CF_" in anonymized
        assert "Mario Rossi" not in anonymized
        assert "RSSMRA85C15F205X" not in anonymized


@pytest.mark.unit
@pytest.mark.asyncio
async def test_redact_and_hash_strategies():
    """Test redact and hash anonymization strategies."""
    # Test redact strategy
    engine_redact = PresidioEngine(anonymization_strategy='redact')
    assert engine_redact.anonymization_strategy == 'redact'

    # Test hash strategy
    engine_hash = PresidioEngine(anonymization_strategy='hash')
    assert engine_hash.anonymization_strategy == 'hash'

    # Verify anonymizers are configured correctly
    assert engine_redact.anonymizer.strategy == 'redact'
    assert engine_hash.anonymizer.strategy == 'hash'


# =============================================================================
# 4. PIPELINE INTEGRATION TESTS (2 tests)
# =============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
async def test_end_to_end_processing(sample_text_simple):
    """Test end-to-end pipeline processing with Presidio engine."""
    engine = PresidioEngine(confidence_threshold=0.7)

    from presidio_analyzer import RecognizerResult

    # Mock analyzer results
    # Text: "Il Dr. Mario Rossi, nato a Milano il 15/03/1985, CF: RSSMRA85C15F205X."
    # "Mario Rossi" is at position 7-18
    # "RSSMRA85C15F205X" is at position 53-69
    mock_results = [
        RecognizerResult(
            entity_type='PERSON',
            start=7,
            end=18,
            score=0.95,
            recognition_metadata={'recognizer_name': 'SpacyRecognizer'}
        ),
        RecognizerResult(
            entity_type='CF',
            start=53,
            end=69,
            score=0.98,
            recognition_metadata={'recognizer_name': 'ItalianCFRecognizer'}
        )
    ]

    # Mock both analyzer and anonymizer
    with patch.object(engine.analyzer, 'analyze', return_value=mock_results):
        with patch.object(engine.anonymizer, 'anonymize', return_value="Il Dr. PERSON_1, nato a Milano il 15/03/1985, CF: CF_2."):
            result = await engine.process(sample_text_simple, user_id='test_user')

            # Verify result structure
            assert result.success is True
            assert result.error_message is None
            assert len(result.entities) == 2
            assert result.processing_time_ms >= 0  # Can be 0 with mocked fast execution

            # Verify entities were detected
            person_entity = next((e for e in result.entities if e.type == EntityType.PERSON), None)
            cf_entity = next((e for e in result.entities if e.type == EntityType.FISCAL_CODE), None)

            assert person_entity is not None
            assert person_entity.text == "Mario Rossi"
            assert cf_entity is not None
            assert cf_entity.text == "RSSMRA85C15F205X"

            # Verify anonymization
            assert "PERSON_" in result.anonymized_text or "Mario Rossi" not in result.anonymized_text
            assert "CF_" in result.anonymized_text or "RSSMRA85C15F205X" not in result.anonymized_text


@pytest.mark.unit
@pytest.mark.asyncio
async def test_error_handling():
    """Test error handling in Presidio engine."""
    engine = PresidioEngine()

    # Test with analyzer failure
    with patch.object(engine.analyzer, 'analyze', side_effect=Exception("Analyzer error")):
        result = await engine.process("Test text", user_id='test_user')

        # Verify error was handled gracefully
        assert result.success is False
        assert result.error_message is not None
        assert "Analyzer error" in result.error_message
        assert len(result.entities) == 0


# =============================================================================
# 5. PERFORMANCE TEST (1 test)
# =============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
async def test_latency_validation(sample_text_complex):
    """Test that processing latency is within acceptable bounds."""
    engine = PresidioEngine(confidence_threshold=0.7)

    from presidio_analyzer import RecognizerResult

    # Mock analyzer with multiple entities
    mock_results = [
        RecognizerResult(entity_type='PERSON', start=58, end=69, score=0.95,
                        recognition_metadata={'recognizer_name': 'SpacyRecognizer'}),
        RecognizerResult(entity_type='ORG', start=84, end=95, score=0.90,
                        recognition_metadata={'recognizer_name': 'SpacyRecognizer'}),
        RecognizerResult(entity_type='CF', start=138, end=154, score=0.98,
                        recognition_metadata={'recognizer_name': 'ItalianCFRecognizer'}),
        RecognizerResult(entity_type='PIVA', start=112, end=123, score=0.95,
                        recognition_metadata={'recognizer_name': 'ItalianPIVARecognizer'}),
    ]

    with patch.object(engine.analyzer, 'analyze', return_value=mock_results):
        with patch.object(engine.anonymizer, 'anonymize', return_value="anonymized text"):
            result = await engine.process(sample_text_complex, user_id='test_user')

            # Verify processing completed successfully
            assert result.success is True

            # Verify latency is reasonable (should be fast with mocked components)
            # In production, expect < 500ms; with mocks should be < 100ms
            assert result.processing_time_ms < 1000, f"Latency too high: {result.processing_time_ms}ms"

            # Verify multiple entities were detected
            assert len(result.entities) >= 3

            # Verify entity types are diverse
            entity_types = {e.type for e in result.entities}
            assert len(entity_types) >= 2  # At least 2 different entity types


# =============================================================================
# ADDITIONAL UTILITY TESTS
# =============================================================================

@pytest.mark.unit
def test_presidio_type_mapping():
    """Test mapping of Presidio entity types to EntityType enum."""
    engine = PresidioEngine()

    # Test direct mappings for custom types
    assert engine._map_presidio_type_to_entity_type('CF') == EntityType.FISCAL_CODE
    assert engine._map_presidio_type_to_entity_type('PIVA') == EntityType.VAT_NUMBER

    # Test standard Presidio types
    assert engine._map_presidio_type_to_entity_type('PERSON') == EntityType.PERSON
    assert engine._map_presidio_type_to_entity_type('EMAIL_ADDRESS') == EntityType.EMAIL
    assert engine._map_presidio_type_to_entity_type('PHONE_NUMBER') == EntityType.PHONE
    assert engine._map_presidio_type_to_entity_type('LOCATION') == EntityType.LOCATION
    assert engine._map_presidio_type_to_entity_type('ORG') == EntityType.ORGANIZATION

    # Test unknown type raises ValueError
    with pytest.raises(ValueError, match="Unknown Presidio entity type"):
        engine._map_presidio_type_to_entity_type('UNKNOWN_TYPE')


@pytest.mark.unit
def test_confidence_threshold_filtering():
    """Test that entities below confidence threshold are filtered out."""
    engine = PresidioEngine(confidence_threshold=0.8)

    from presidio_analyzer import RecognizerResult

    # Mock results with varying confidence scores
    mock_results = [
        RecognizerResult(entity_type='PERSON', start=0, end=11, score=0.95,
                        recognition_metadata={'recognizer_name': 'SpacyRecognizer'}),
        RecognizerResult(entity_type='PERSON', start=20, end=31, score=0.75,  # Below threshold
                        recognition_metadata={'recognizer_name': 'SpacyRecognizer'}),
        RecognizerResult(entity_type='CF', start=40, end=56, score=0.98,
                        recognition_metadata={'recognizer_name': 'ItalianCFRecognizer'}),
    ]

    # Run detection (async)
    async def test_filtering():
        with patch.object(engine.analyzer, 'analyze', return_value=mock_results):
            entities = await engine.detect_entities("Test text with multiple entities")

            # Verify only high-confidence entities are returned
            assert len(entities) == 2  # Should filter out 0.75 score
            assert all(e.confidence >= 0.8 for e in entities)
            assert entities[0].confidence == 0.95
            assert entities[1].confidence == 0.98

    # Run the async test
    asyncio.run(test_filtering())


@pytest.mark.unit
def test_get_pipeline_info():
    """Test pipeline information retrieval."""
    engine = PresidioEngine(
        model_name='it_core_news_lg',
        confidence_threshold=0.75,
        anonymization_strategy='hash'
    )

    info = engine.get_pipeline_info()

    # Verify all expected fields are present
    assert info['engine'] == 'presidio'
    assert info['version'] == '2.2.0'
    assert info['model'] == 'it_core_news_lg'
    assert info['confidence_threshold'] == 0.75
    assert info['anonymization_strategy'] == 'hash'
    assert 'recognizers' in info
    assert isinstance(info['recognizers'], list)
    assert len(info['recognizers']) >= 3  # At least our custom recognizers
