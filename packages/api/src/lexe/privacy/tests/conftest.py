"""
Test Fixtures and Configuration for Privacy Module Tests

This module provides shared fixtures, test data, and utilities for the privacy test suite.
"""
import pytest
import asyncio
from typing import List, Dict, Any
from datetime import datetime, timedelta
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from llsearch.privacy.pipeline.base_pipeline import (
    DetectedEntity, EntityType, PipelineResult
)
from llsearch.privacy.pipeline.filters import (
    DocumentContext, DocumentType
)
from llsearch.privacy.models import PIIDetectionEvent, AnonymizationLog, BenchmarkResult


# =============================================================================
# PYTEST CONFIGURATION
# =============================================================================

def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "performance: Performance tests")
    config.addinivalue_line("markers", "security: Security tests")
    config.addinivalue_line("markers", "asyncio: Async tests")
    config.addinivalue_line("markers", "slow: Slow tests (skip by default)")


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# =============================================================================
# TEST DATA FIXTURES
# =============================================================================

@pytest.fixture
def sample_text_simple():
    """Simple Italian text with PII for testing."""
    return "Il Dr. Mario Rossi, nato a Milano il 15/03/1985, CF: RSSMRA85C15F205X."


@pytest.fixture
def sample_text_complex():
    """Complex Italian legal document with multiple PII types."""
    return """
    TRIBUNALE DI MILANO
    Sentenza n. 1234/2024

    Il Tribunale, nella persona del Giudice Dr. Mario Rossi,
    ha pronunciato la seguente sentenza:

    FATTO E DIRITTO

    La società Acme S.p.A. (P.IVA 12345678901), rappresentata
    dall'Avv. Laura Bianchi (CF: BNCLRA80A41F205Z), ha proposto
    ricorso contro Giovanni Verdi (CF: VRDGNN75M10F205W).

    Contatti: [email protected], tel. +39 333 1234567
    Indirizzo: Via Roma 123, 20100 Milano (MI)

    DISPOSITIVO

    Per questi motivi, il Tribunale accoglie il ricorso.

    Milano, 15 novembre 2024

    Il Giudice
    Dr. Mario Rossi
    """


@pytest.fixture
def sample_entities():
    """Sample detected entities for testing."""
    return [
        DetectedEntity(
            type=EntityType.PERSON,
            text="Mario Rossi",
            start=7,
            end=18,
            confidence=0.95,
            metadata={"label": "PERSON"}
        ),
        DetectedEntity(
            type=EntityType.FISCAL_CODE,
            text="RSSMRA85C15F205X",
            start=59,
            end=75,
            confidence=0.98,
            metadata={"validated": True}
        ),
    ]


@pytest.fixture
def sample_italian_cf():
    """Valid Italian Codice Fiscale for testing."""
    return "RSSMRA85C15F205X"


@pytest.fixture
def sample_italian_piva():
    """Valid Italian Partita IVA for testing."""
    return "12345678901"


@pytest.fixture
def sample_document_context():
    """Sample document context for testing."""
    return DocumentContext(
        document_type=DocumentType.SENTENZA,
        court="Tribunale di Milano",
        jurisdiction="civile",
        confidence=0.9,
        metadata={
            "case_number": "1234/2024",
            "judge": "Dr. Mario Rossi"
        }
    )


# =============================================================================
# ENTITY FIXTURES
# =============================================================================

@pytest.fixture
def entity_person():
    """Person entity fixture."""
    return DetectedEntity(
        type=EntityType.PERSON,
        text="Mario Rossi",
        start=0,
        end=11,
        confidence=0.95
    )


@pytest.fixture
def entity_cf():
    """Codice Fiscale entity fixture."""
    return DetectedEntity(
        type=EntityType.FISCAL_CODE,
        text="RSSMRA85C15F205X",
        start=0,
        end=16,
        confidence=0.98
    )


@pytest.fixture
def entity_piva():
    """Partita IVA entity fixture."""
    return DetectedEntity(
        type=EntityType.PIVA,
        text="12345678901",
        start=0,
        end=11,
        confidence=0.97
    )


@pytest.fixture
def entity_email():
    """Email entity fixture."""
    return DetectedEntity(
        type=EntityType.EMAIL,
        text="[email protected]",
        start=0,
        end=24,
        confidence=0.99
    )


@pytest.fixture
def entity_phone():
    """Phone entity fixture."""
    return DetectedEntity(
        type=EntityType.PHONE,
        text="+39 333 1234567",
        start=0,
        end=16,
        confidence=0.90
    )


@pytest.fixture
def entity_org():
    """Organization entity fixture."""
    return DetectedEntity(
        type=EntityType.ORGANIZATION,
        text="Tribunale di Milano",
        start=0,
        end=19,
        confidence=0.92
    )


@pytest.fixture
def entity_address():
    """Address entity fixture."""
    return DetectedEntity(
        type=EntityType.ADDRESS,
        text="Via Roma 123, 20100 Milano",
        start=0,
        end=26,
        confidence=0.88
    )


# =============================================================================
# PIPELINE RESULT FIXTURES
# =============================================================================

@pytest.fixture
def pipeline_result_success(sample_text_simple, sample_entities):
    """Successful pipeline result fixture."""
    return PipelineResult(
        original_text=sample_text_simple,
        anonymized_text="Il Dr. PERSON_A, nato a Milano il 15/03/1985, CF: CF_001.",
        entities=sample_entities,
        success=True,
        error=None,
        processing_time_ms=150.5,
        engine_name="test_engine",
        engine_version="1.0.0",
        context=None,
        metadata={
            "entities_detected": len(sample_entities),
            "replacement_strategy": "deterministic"
        }
    )


@pytest.fixture
def pipeline_result_failure(sample_text_simple):
    """Failed pipeline result fixture."""
    return PipelineResult(
        original_text=sample_text_simple,
        anonymized_text="",
        entities=[],
        success=False,
        error="Test error: Engine not initialized",
        processing_time_ms=5.2,
        engine_name="test_engine",
        engine_version="1.0.0",
        context=None
    )


# =============================================================================
# DATABASE MODEL FIXTURES
# =============================================================================

@pytest.fixture
def pii_event_fixture():
    """PIIEvent database model fixture."""
    return PIIEvent(
        user_id="test_user_001",
        document_id="doc_001",
        text_hash="abc123def456",
        entities_detected=2,
        entity_types=["PERSON", "CF"],
        confidence_avg=0.965,
        processing_time_ms=150,
        engine="test_engine",
        engine_version="1.0.0"
    )


@pytest.fixture
def anonymization_log_fixture():
    """AnonymizationLog database model fixture."""
    return AnonymizationLog(
        user_id="test_user_001",
        document_id="doc_001",
        original_text_hash="abc123def456",
        anonymized_text_hash="xyz789ghi012",
        entities_replaced=2,
        replacement_strategy="deterministic",
        reversible=True,
        processing_time_ms=50
    )


@pytest.fixture
def benchmark_result_fixture():
    """BenchmarkResult database model fixture."""
    return BenchmarkResult(
        test_dataset_id="legal_corpus_v1",
        test_dataset_size=100,
        test_dataset_type="sentenza",
        engine="spacy",
        engine_version="1.0.0",
        precision=0.92,
        recall=0.89,
        f1_score=0.905,
        avg_latency_ms=180,
        p50_latency_ms=150,
        p95_latency_ms=320,
        p99_latency_ms=450,
        total_entities=250,
        true_positives=223,
        false_positives=19,
        false_negatives=27
    )


# =============================================================================
# TEST DOCUMENT FIXTURES
# =============================================================================

@pytest.fixture
def test_documents():
    """Collection of test documents for batch processing."""
    return [
        {
            "document_id": "sent_001",
            "text": "Il Giudice Dr. Mario Rossi, CF: RSSMRA85C15F205X.",
            "ground_truth": [
                {"type": "PERSON", "text": "Mario Rossi", "start": 14, "end": 25},
                {"type": "CF", "text": "RSSMRA85C15F205X", "start": 32, "end": 48}
            ]
        },
        {
            "document_id": "sent_002",
            "text": "L'Avv. Laura Bianchi ([email protected]) rappresenta Acme S.p.A.",
            "ground_truth": [
                {"type": "PERSON", "text": "Laura Bianchi", "start": 7, "end": 20},
                {"type": "EMAIL", "text": "[email protected]", "start": 22, "end": 45}
            ]
        },
        {
            "document_id": "sent_003",
            "text": "Contatti: +39 333 1234567, Via Roma 123, Milano.",
            "ground_truth": [
                {"type": "PHONE", "text": "+39 333 1234567", "start": 10, "end": 25},
                {"type": "ADDRESS", "text": "Via Roma 123, Milano", "start": 27, "end": 47}
            ]
        }
    ]


@pytest.fixture
def large_test_corpus():
    """Large test corpus for performance testing (50 documents)."""
    documents = []

    for i in range(50):
        doc = {
            "document_id": f"perf_doc_{i:03d}",
            "text": f"""
            TRIBUNALE DI MILANO - Sentenza n. {i+1000}/2024

            Il Tribunale, nella persona del Giudice Dr. Mario Rossi_{i},
            CF: RSSMRA85C15F{i:03d}X, ha pronunciato sentenza nel procedimento
            promosso da Giovanni Verdi_{i} (CF: VRDGNN75M10F{i:03d}W)
            contro la società Beta S.r.l. (P.IVA 1234567890{i}).

            Contatti: test{i}@example.com, tel. +39 333 {i:07d}

            Milano, 15 novembre 2024
            """,
            "ground_truth": []  # Performance tests don't need ground truth
        }
        documents.append(doc)

    return documents


# =============================================================================
# MOCK ENGINE FIXTURES
# =============================================================================

class MockEngine:
    """Mock PII detection engine for testing."""

    def __init__(self, name="mock_engine", should_fail=False):
        self.name = name
        self.version = "1.0.0"
        self.should_fail = should_fail
        self.call_count = 0

    async def detect_entities(self, text: str) -> List[DetectedEntity]:
        """Mock entity detection."""
        self.call_count += 1

        if self.should_fail:
            raise ValueError("Mock engine failure")

        # Simple mock: detect "Mario Rossi" if present
        entities = []
        if "Mario Rossi" in text:
            start = text.index("Mario Rossi")
            entities.append(DetectedEntity(
                type=EntityType.PERSON,
                text="Mario Rossi",
                start=start,
                end=start + 11,
                confidence=0.95
            ))

        return entities

    async def anonymize(self, text: str, entities: List[DetectedEntity]) -> str:
        """Mock anonymization."""
        if self.should_fail:
            raise ValueError("Mock engine failure")

        result = text
        for i, entity in enumerate(sorted(entities, key=lambda e: e.start, reverse=True)):
            replacement = f"{entity.type.value}_{i+1}"
            result = result[:entity.start] + replacement + result[entity.end:]

        return result

    async def process(self, text: str, user_id: str, **kwargs) -> PipelineResult:
        """Mock full pipeline processing."""
        import time
        start = time.perf_counter()

        try:
            entities = await self.detect_entities(text)
            anonymized = await self.anonymize(text, entities)
            processing_time = (time.perf_counter() - start) * 1000

            return PipelineResult(
                original_text=text,
                anonymized_text=anonymized,
                entities=entities,
                success=True,
                error_message=None,
                processing_time_ms=processing_time,
                metadata={
                    'engine_name': self.name,
                    'engine_version': self.version
                }
            )
        except Exception as e:
            processing_time = (time.perf_counter() - start) * 1000
            return PipelineResult(
                original_text=text,
                anonymized_text="",
                entities=[],
                success=False,
                error_message=str(e),
                processing_time_ms=processing_time,
                metadata={
                    'engine_name': self.name,
                    'engine_version': self.version
                }
            )


@pytest.fixture
def mock_engine():
    """Mock engine fixture."""
    return MockEngine(name="mock_test_engine", should_fail=False)


@pytest.fixture
def mock_engine_failing():
    """Mock engine that always fails."""
    return MockEngine(name="mock_failing_engine", should_fail=True)


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def assert_entity_equal(entity1: DetectedEntity, entity2: DetectedEntity):
    """Assert two entities are equal."""
    assert entity1.type == entity2.type
    assert entity1.text == entity2.text
    assert entity1.start == entity2.start
    assert entity1.end == entity2.end
    assert abs(entity1.confidence - entity2.confidence) < 0.01


def assert_pipeline_result_valid(result: PipelineResult):
    """Assert pipeline result is valid."""
    assert result is not None
    assert result.original_text is not None
    assert result.anonymized_text is not None
    assert isinstance(result.entities, list)
    assert isinstance(result.success, bool)
    assert result.processing_time_ms >= 0
    assert result.engine_name is not None
    assert result.engine_version is not None


@pytest.fixture
def assert_entity_equal_func():
    """Provide assert_entity_equal as fixture."""
    return assert_entity_equal


@pytest.fixture
def assert_pipeline_result_valid_func():
    """Provide assert_pipeline_result_valid as fixture."""
    return assert_pipeline_result_valid
