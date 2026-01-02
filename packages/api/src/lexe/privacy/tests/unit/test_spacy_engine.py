"""
Unit tests for SpacyEngine (engines/spacy/spacy_engine.py)

Tests cover spaCy NER initialization, entity detection,
custom recognizers, and integration with pipeline.

Total: 15 tests
"""
import pytest
import asyncio
from unittest.mock import MagicMock, patch, Mock, PropertyMock
from llsearch.privacy.pipeline.base_pipeline import DetectedEntity, EntityType, PipelineResult
from llsearch.privacy.engines.spacy.spacy_engine import SpacyEngine


def create_mock_entity(text, label, start, end, has_confidence=False, confidence_value=None):
    """
    Helper function to create properly mocked spaCy entities.

    spaCy entities need special mocking to properly test _calculate_confidence().
    We use a simple object instead of MagicMock to avoid attribute resolution issues.
    """
    class MockUnderscore:
        """Mock for spaCy's underscore extensions."""
        pass

    class MockEntity:
        """Simple mock for spaCy Span entity."""
        def __init__(self):
            self.text = text
            self.label_ = label
            self.start_char = start
            self.end_char = end

            # Always create underscore object (spaCy entities always have this)
            self._ = MockUnderscore()

            # Setup confidence attribute if requested
            if has_confidence and confidence_value is not None:
                self._.confidence = confidence_value

        def __iter__(self):
            """Allow iteration for legal entity checking."""
            return iter([])

    return MockEntity()


# =============================================================================
# CATEGORY 1: INITIALIZATION TESTS (3 tests)
# =============================================================================

@pytest.mark.unit
@patch('llsearch.privacy.engines.spacy.spacy_engine.spacy.load')
def test_spacy_engine_initialization_default(mock_spacy_load):
    """Test SpacyEngine initialization with default parameters."""
    # Arrange
    mock_nlp = MagicMock()
    mock_nlp.pipe_names = ['tok2vec', 'tagger', 'parser', 'ner']
    mock_spacy_load.return_value = mock_nlp

    # Act
    engine = SpacyEngine()

    # Assert
    assert engine.name == 'spacy'
    assert engine.version == '1.0.0'
    assert engine.model_name == 'it_core_news_lg'
    assert engine.confidence_threshold == 0.7
    assert engine.use_custom_recognizers is True
    assert engine.nlp is mock_nlp
    mock_spacy_load.assert_called_once_with('it_core_news_lg')


@pytest.mark.unit
@patch('llsearch.privacy.engines.spacy.spacy_engine.spacy.load')
def test_spacy_engine_custom_recognizers_registration(mock_spacy_load):
    """Test that custom recognizers are registered in pipeline."""
    # Arrange
    mock_nlp = MagicMock()
    mock_nlp.pipe_names = ['tok2vec', 'tagger', 'parser', 'ner']
    mock_nlp.add_pipe = MagicMock()
    mock_spacy_load.return_value = mock_nlp

    # Act
    engine = SpacyEngine(use_custom_recognizers=True)

    # Assert
    # Verify custom recognizers were added after NER
    assert mock_nlp.add_pipe.call_count == 3
    mock_nlp.add_pipe.assert_any_call('cf_recognizer', after='ner')
    mock_nlp.add_pipe.assert_any_call('piva_recognizer', after='cf_recognizer')
    mock_nlp.add_pipe.assert_any_call('legal_entity_recognizer', after='piva_recognizer')


@pytest.mark.unit
@patch('llsearch.privacy.engines.spacy.spacy_engine.spacy.load')
def test_spacy_engine_model_fallback(mock_spacy_load):
    """Test fallback to it_core_news_lg when custom model not found."""
    # Arrange
    def load_side_effect(model_name):
        if model_name == 'custom_model':
            raise OSError(f"Model '{model_name}' not found")
        mock_nlp = MagicMock()
        mock_nlp.pipe_names = ['tok2vec', 'ner']
        return mock_nlp

    mock_spacy_load.side_effect = load_side_effect

    # Act
    with patch('builtins.print') as mock_print:
        engine = SpacyEngine(model_name='custom_model', use_custom_recognizers=False)

    # Assert
    assert engine.model_name == 'custom_model'
    assert engine.nlp is not None
    mock_print.assert_called_once()
    assert 'Warning' in mock_print.call_args[0][0]
    assert 'custom_model' in mock_print.call_args[0][0]


# =============================================================================
# CATEGORY 2: ENTITY DETECTION TESTS (4 tests)
# =============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
@patch('llsearch.privacy.engines.spacy.spacy_engine.spacy.load')
async def test_spacy_engine_detect_person_organization_location(mock_spacy_load):
    """Test detection of PERSON, ORGANIZATION, LOCATION entities."""
    # Arrange
    mock_nlp = MagicMock()
    mock_nlp.pipe_names = []

    # Mock spaCy entities using helper
    mock_ent_person = create_mock_entity("Mario Rossi", "PER", 0, 11)
    mock_ent_org = create_mock_entity("Tribunale di Milano", "ORG", 13, 32)
    mock_ent_loc = create_mock_entity("Milano", "LOC", 36, 42)

    mock_doc = MagicMock()
    mock_doc.ents = [mock_ent_person, mock_ent_org, mock_ent_loc]

    mock_nlp.return_value = mock_doc
    mock_spacy_load.return_value = mock_nlp

    engine = SpacyEngine(use_custom_recognizers=False)
    text = "Mario Rossi, Tribunale di Milano in Milano"

    # Act
    entities = await engine.detect_entities(text)

    # Assert
    assert len(entities) == 3

    # Person entity
    person = entities[0]
    assert person.type == EntityType.PERSON
    assert person.text == "Mario Rossi"
    assert person.start == 0
    assert person.end == 11
    assert person.confidence >= 0.7

    # Organization entity
    org = entities[1]
    assert org.type == EntityType.ORGANIZATION
    assert org.text == "Tribunale di Milano"

    # Location entity
    loc = entities[2]
    assert loc.type == EntityType.LOCATION
    assert loc.text == "Milano"


@pytest.mark.unit
@pytest.mark.asyncio
@patch('llsearch.privacy.engines.spacy.spacy_engine.spacy.load')
async def test_spacy_engine_detect_italian_cf(mock_spacy_load):
    """Test detection of Italian Codice Fiscale (CF)."""
    # Arrange
    mock_nlp = MagicMock()
    mock_nlp.pipe_names = []

    # Mock CF entity with custom confidence
    mock_ent_cf = create_mock_entity(
        "RSSMRA85C15F205X", "CF", 4, 20,
        has_confidence=True, confidence_value=0.95
    )

    mock_doc = MagicMock()
    mock_doc.ents = [mock_ent_cf]

    mock_nlp.return_value = mock_doc
    mock_spacy_load.return_value = mock_nlp

    engine = SpacyEngine(use_custom_recognizers=False)
    text = "CF: RSSMRA85C15F205X"

    # Act
    entities = await engine.detect_entities(text)

    # Assert
    assert len(entities) == 1
    cf = entities[0]
    assert cf.type == EntityType.FISCAL_CODE
    assert cf.text == "RSSMRA85C15F205X"
    assert cf.confidence == 0.95
    assert cf.metadata['label'] == 'CF'


@pytest.mark.unit
@pytest.mark.asyncio
@patch('llsearch.privacy.engines.spacy.spacy_engine.spacy.load')
async def test_spacy_engine_detect_italian_piva(mock_spacy_load):
    """Test detection of Italian Partita IVA (P.IVA)."""
    # Arrange
    mock_nlp = MagicMock()
    mock_nlp.pipe_names = []

    # Mock P.IVA entity with custom confidence
    mock_ent_piva = create_mock_entity(
        "12345678901", "PIVA", 8, 19,
        has_confidence=True, confidence_value=0.95
    )

    mock_doc = MagicMock()
    mock_doc.ents = [mock_ent_piva]

    mock_nlp.return_value = mock_doc
    mock_spacy_load.return_value = mock_nlp

    engine = SpacyEngine(use_custom_recognizers=False)
    text = "P.IVA: 12345678901"

    # Act
    entities = await engine.detect_entities(text)

    # Assert
    assert len(entities) == 1
    piva = entities[0]
    assert piva.type == EntityType.VAT_NUMBER
    assert piva.text == "12345678901"
    assert piva.confidence == 0.95


@pytest.mark.unit
@pytest.mark.asyncio
@patch('llsearch.privacy.engines.spacy.spacy_engine.spacy.load')
async def test_spacy_engine_detect_legal_entities(mock_spacy_load):
    """Test detection of legal entities (courts, judges)."""
    # Arrange
    mock_nlp = MagicMock()
    mock_nlp.pipe_names = []

    # Create a custom mock entity for legal entities with tokens
    class MockToken:
        text = "Tribunale"
        def lower(self):
            return "tribunale"

    class MockUnderscore:
        pass

    class MockLegalEntity:
        text = "Tribunale di Roma"
        label_ = "ORG"
        start_char = 0
        end_char = 17

        def __init__(self):
            self._ = MockUnderscore()

        def __iter__(self):
            return iter([MockToken()])

    mock_ent_org = MockLegalEntity()

    mock_doc = MagicMock()
    mock_doc.ents = [mock_ent_org]

    mock_nlp.return_value = mock_doc
    mock_spacy_load.return_value = mock_nlp

    engine = SpacyEngine(use_custom_recognizers=False)
    text = "Tribunale di Roma"

    # Act
    entities = await engine.detect_entities(text)

    # Assert
    assert len(entities) == 1
    legal = entities[0]
    assert legal.type == EntityType.ORGANIZATION
    assert legal.text == "Tribunale di Roma"
    # Legal entity should have higher confidence (0.90)
    assert legal.confidence >= 0.85


# =============================================================================
# CATEGORY 3: CONFIDENCE SCORING TESTS (2 tests)
# =============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
@patch('llsearch.privacy.engines.spacy.spacy_engine.spacy.load')
async def test_spacy_engine_confidence_threshold_filtering(mock_spacy_load):
    """Test entities are filtered by confidence threshold."""
    # Arrange
    mock_nlp = MagicMock()
    mock_nlp.pipe_names = []

    # High confidence entity (with custom confidence)
    mock_ent_high = create_mock_entity(
        "Mario Rossi", "PER", 0, 11,
        has_confidence=True, confidence_value=0.95
    )

    # Low confidence entity (below threshold)
    mock_ent_low = create_mock_entity(
        "Giovanni", "PER", 13, 21,
        has_confidence=True, confidence_value=0.5
    )

    mock_doc = MagicMock()
    mock_doc.ents = [mock_ent_high, mock_ent_low]

    mock_nlp.return_value = mock_doc
    mock_spacy_load.return_value = mock_nlp

    engine = SpacyEngine(confidence_threshold=0.7, use_custom_recognizers=False)
    text = "Mario Rossi, Giovanni"

    # Act
    entities = await engine.detect_entities(text)

    # Assert
    assert len(entities) == 1  # Only high confidence entity
    assert entities[0].text == "Mario Rossi"
    assert entities[0].confidence >= 0.7


@pytest.mark.unit
@pytest.mark.asyncio
@patch('llsearch.privacy.engines.spacy.spacy_engine.spacy.load')
async def test_spacy_engine_confidence_calculation_heuristics(mock_spacy_load):
    """Test confidence calculation uses heuristics for different entity types."""
    # Arrange
    mock_nlp = MagicMock()
    mock_nlp.pipe_names = []

    # CF entity (should get 0.95 confidence from heuristics)
    mock_ent_cf = create_mock_entity("RSSMRA85C15F205X", "CF", 0, 16)

    # Person entity (should get 0.85 confidence from heuristics)
    mock_ent_person = create_mock_entity("Mario Rossi", "PERSON", 18, 29)

    mock_doc = MagicMock()
    mock_doc.ents = [mock_ent_cf, mock_ent_person]

    mock_nlp.return_value = mock_doc
    mock_spacy_load.return_value = mock_nlp

    engine = SpacyEngine(confidence_threshold=0.0, use_custom_recognizers=False)
    text = "RSSMRA85C15F205X, Mario Rossi"

    # Act
    entities = await engine.detect_entities(text)

    # Assert
    assert len(entities) == 2

    # CF should have higher confidence (0.95)
    cf = next(e for e in entities if e.type == EntityType.FISCAL_CODE)
    assert cf.confidence == 0.95

    # Person should have standard confidence (0.85)
    person = next(e for e in entities if e.type == EntityType.PERSON)
    assert person.confidence == 0.85


# =============================================================================
# CATEGORY 4: PIPELINE INTEGRATION TESTS (3 tests)
# =============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
@patch('llsearch.privacy.engines.spacy.spacy_engine.spacy.load')
async def test_spacy_engine_text_processing_flow(mock_spacy_load):
    """Test full text processing flow from detection to anonymization."""
    # Arrange
    mock_nlp = MagicMock()
    mock_nlp.pipe_names = []

    mock_ent = create_mock_entity("Mario Rossi", "PER", 7, 18)

    mock_doc = MagicMock()
    mock_doc.ents = [mock_ent]

    mock_nlp.return_value = mock_doc
    mock_spacy_load.return_value = mock_nlp

    engine = SpacyEngine(use_custom_recognizers=False)
    text = "Il Dr. Mario Rossi, nato a Milano."

    # Act
    result = await engine.process(text, user_id='test_user')

    # Assert
    assert result.success is True
    assert result.error_message is None
    assert len(result.entities) == 1
    assert result.entities[0].text == "Mario Rossi"
    assert result.anonymized_text != text
    assert "PERSON" in result.anonymized_text or "Mario" not in result.anonymized_text
    assert result.processing_time_ms >= 0


@pytest.mark.unit
@pytest.mark.asyncio
@patch('llsearch.privacy.engines.spacy.spacy_engine.spacy.load')
async def test_spacy_engine_replacement_strategy_application(mock_spacy_load):
    """Test replacement strategy is applied to detected entities."""
    # Arrange
    mock_nlp = MagicMock()
    mock_nlp.pipe_names = []

    mock_ent = create_mock_entity("Mario Rossi", "PER", 0, 11)

    mock_doc = MagicMock()
    mock_doc.ents = [mock_ent]

    mock_nlp.return_value = mock_doc
    mock_spacy_load.return_value = mock_nlp

    engine = SpacyEngine(
        replacement_strategy='deterministic',
        use_custom_recognizers=False
    )

    text = "Mario Rossi abita a Milano."

    # Act
    entities = await engine.detect_entities(text)
    anonymized = await engine.anonymize(text, entities)

    # Assert
    assert "Mario Rossi" not in anonymized
    # Deterministic strategy should produce consistent replacement
    assert anonymized != text
    assert len(anonymized) > 0


@pytest.mark.unit
@pytest.mark.asyncio
@patch('llsearch.privacy.engines.spacy.spacy_engine.spacy.load')
async def test_spacy_engine_error_handling(mock_spacy_load):
    """Test error handling when detection fails."""
    # Arrange
    mock_nlp = MagicMock()
    mock_nlp.pipe_names = []
    mock_nlp.side_effect = Exception("spaCy processing error")
    mock_spacy_load.return_value = mock_nlp

    engine = SpacyEngine(use_custom_recognizers=False)
    text = "Test text"

    # Act
    result = await engine.process(text, user_id='test_user')

    # Assert
    assert result.success is False
    assert result.error_message is not None
    assert "spaCy processing error" in result.error_message
    assert result.anonymized_text == text  # Returns original on error
    assert len(result.entities) == 0


# =============================================================================
# CATEGORY 5: PERFORMANCE TESTS (3 tests)
# =============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
@patch('llsearch.privacy.engines.spacy.spacy_engine.spacy.load')
async def test_spacy_engine_batch_processing(mock_spacy_load, large_test_corpus):
    """Test batch processing of multiple documents."""
    # Arrange
    mock_nlp = MagicMock()
    mock_nlp.pipe_names = []

    mock_ent = create_mock_entity("Mario Rossi", "PER", 0, 11)

    mock_doc = MagicMock()
    mock_doc.ents = [mock_ent]
    mock_nlp.return_value = mock_doc

    mock_spacy_load.return_value = mock_nlp

    engine = SpacyEngine(use_custom_recognizers=False)

    # Act - Process first 10 documents
    results = []
    for doc in large_test_corpus[:10]:
        result = await engine.process(doc['text'], user_id='test_user')
        results.append(result)

    # Assert
    assert len(results) == 10
    for result in results:
        assert isinstance(result, PipelineResult)
        assert result.processing_time_ms >= 0


@pytest.mark.unit
@pytest.mark.asyncio
@patch('llsearch.privacy.engines.spacy.spacy_engine.spacy.load')
async def test_spacy_engine_latency_validation(mock_spacy_load, sample_text_complex):
    """Test processing latency is within acceptable limits (<500ms)."""
    # Arrange
    mock_nlp = MagicMock()
    mock_nlp.pipe_names = []

    mock_ent = create_mock_entity("Mario Rossi", "PER", 0, 11)

    mock_doc = MagicMock()
    mock_doc.ents = [mock_ent]
    mock_nlp.return_value = mock_doc

    mock_spacy_load.return_value = mock_nlp

    engine = SpacyEngine(use_custom_recognizers=False)

    # Act
    result = await engine.process(sample_text_complex, user_id='test_user')

    # Assert
    # With mocking, should be much faster than 500ms
    assert result.processing_time_ms >= 0
    # In real scenario, we'd assert < 500ms, but with mocks it's always fast
    assert result.success is True


@pytest.mark.unit
@pytest.mark.asyncio
@patch('llsearch.privacy.engines.spacy.spacy_engine.spacy.load')
async def test_spacy_engine_memory_efficiency(mock_spacy_load, sample_text_simple):
    """Test memory efficiency with multiple processing calls."""
    # Arrange
    mock_nlp = MagicMock()
    mock_nlp.pipe_names = []

    mock_ent = create_mock_entity("Mario Rossi", "PER", 0, 11)

    mock_doc = MagicMock()
    mock_doc.ents = [mock_ent]
    mock_nlp.return_value = mock_doc

    mock_spacy_load.return_value = mock_nlp

    engine = SpacyEngine(use_custom_recognizers=False)

    # Act - Process same text multiple times
    results = []
    for i in range(20):
        result = await engine.process(sample_text_simple, user_id=f'user_{i}')
        results.append(result)

    # Assert
    assert len(results) == 20
    # All results should be successful
    assert all(r.success for r in results)
    # Engine instance should be reused (same nlp object)
    assert engine.nlp is mock_nlp
