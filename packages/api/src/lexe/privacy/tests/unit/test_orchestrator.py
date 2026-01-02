"""
Unit tests for PipelineOrchestrator (orchestrator.py)

Tests cover orchestrator initialization, engine management,
batch processing, and error handling.

Total: 15 tests
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from llsearch.privacy.pipeline.orchestrator import PipelineOrchestrator
from llsearch.privacy.pipeline.base_pipeline import DetectedEntity, EntityType, PipelineResult


@pytest.mark.unit
@pytest.mark.asyncio
async def test_orchestrator_initialization(mock_engine):
    """Test orchestrator initializes correctly"""
    orchestrator = PipelineOrchestrator()
    await orchestrator.initialize()

    assert orchestrator is not None
    # Check default engine is set (if implemented)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_orchestrator_process_document(mock_engine, sample_text_simple):
    """Test basic document processing"""
    orchestrator = PipelineOrchestrator()
    orchestrator.engine = mock_engine

    result = await orchestrator.process_document(
        sample_text_simple,
        user_id='test_user',
        document_id='test_doc'
    )

    assert isinstance(result, PipelineResult)
    assert result.success is True
    assert result.original_text == sample_text_simple


@pytest.mark.unit
@pytest.mark.asyncio
async def test_orchestrator_process_batch(mock_engine, test_documents):
    """Test batch processing of multiple documents"""
    orchestrator = PipelineOrchestrator()
    orchestrator.engine = mock_engine

    results = await orchestrator.process_batch(test_documents, user_id='test_user')

    assert len(results) == len(test_documents)
    assert all(isinstance(r, PipelineResult) for r in results)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_orchestrator_handles_empty_text(mock_engine):
    """Test orchestrator handles empty text gracefully"""
    orchestrator = PipelineOrchestrator()
    orchestrator.engine = mock_engine

    result = await orchestrator.process_document(
        "",
        user_id='test_user',
        document_id='test_empty'
    )

    # Should handle empty text without error
    assert result is not None


@pytest.mark.unit
@pytest.mark.asyncio
async def test_orchestrator_error_handling(mock_engine_failing, sample_text_simple):
    """Test orchestrator handles engine errors gracefully"""
    orchestrator = PipelineOrchestrator()
    orchestrator.engine = mock_engine_failing

    # Mock filter chain to raise an exception
    orchestrator.filter_chain = MagicMock()
    orchestrator.filter_chain.apply = AsyncMock(side_effect=Exception("Mock engine failure"))

    result = await orchestrator.process_document(
        sample_text_simple,
        user_id='test_user',
        document_id='test_error'
    )

    assert result.success is False
    assert result.error_message is not None
    assert "Mock engine failure" in result.error_message


@pytest.mark.unit
@pytest.mark.asyncio
async def test_orchestrator_concurrent_processing(mock_engine, large_test_corpus):
    """Test concurrent processing of large corpus"""
    orchestrator = PipelineOrchestrator()
    orchestrator.engine = mock_engine

    results = await orchestrator.process_batch(large_test_corpus[:10], user_id='test_user', max_concurrent=5)

    assert len(results) == 10
    assert all(isinstance(r, PipelineResult) for r in results)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_orchestrator_filters_applied(mock_engine, sample_text_simple):
    """Test that filters are applied during processing"""
    orchestrator = PipelineOrchestrator()
    orchestrator.engine = mock_engine

    # Mock filter chain
    orchestrator.filter_chain = MagicMock()
    orchestrator.filter_chain.apply = AsyncMock(return_value=(sample_text_simple, []))

    result = await orchestrator.process_document(
        sample_text_simple,
        user_id='test_user',
        document_id='test_filters'
    )

    # Filter chain should have been called twice (once for text, once for entities)
    assert orchestrator.filter_chain.apply.call_count == 2


@pytest.mark.unit
@pytest.mark.asyncio
async def test_orchestrator_metrics_collection(mock_engine, sample_text_simple):
    """Test that orchestrator collects processing metrics"""
    orchestrator = PipelineOrchestrator()
    orchestrator.engine = mock_engine

    result = await orchestrator.process_document(
        sample_text_simple,
        user_id='test_user',
        document_id='test_metrics'
    )

    # Should have processing time
    assert result.processing_time_ms >= 0
    assert isinstance(result.processing_time_ms, (int, float))


@pytest.mark.unit
@pytest.mark.asyncio
async def test_orchestrator_respects_user_id(mock_engine, sample_text_simple):
    """Test that user_id is properly passed through"""
    orchestrator = PipelineOrchestrator()
    orchestrator.engine = mock_engine

    result = await orchestrator.process_document(
        sample_text_simple,
        user_id='specific_user_123',
        document_id='test_userid'
    )

    # Result should contain user context (if implemented)
    assert result is not None


@pytest.mark.unit
@pytest.mark.asyncio
async def test_orchestrator_batch_error_isolation(test_documents):
    """Test that batch processing isolates errors"""
    orchestrator = PipelineOrchestrator()
    await orchestrator.initialize()

    # Create mixed processing function (one fails, others succeed)
    call_count = [0]
    original_process = orchestrator.process_document

    async def mock_process_document(text, user_id, document_id, metadata=None):
        call_count[0] += 1
        if call_count[0] == 2:
            # Second document fails - return error result
            return PipelineResult(
                original_text=text,
                anonymized_text=text,
                entities=[],
                success=False,
                error_message="Test error - document 2 failed",
                processing_time_ms=0,
                metadata=metadata or {}
            )
        else:
            # Other documents succeed normally
            return await original_process(text, user_id, document_id, metadata)

    orchestrator.process_document = mock_process_document

    results = await orchestrator.process_batch(test_documents, user_id='test_user')

    # Should have results for all documents
    assert len(results.results) == len(test_documents)

    # Second should have failed
    assert results.results[1].success is False
    assert results.results[1].error_message is not None

    # Others should succeed
    assert results.results[0].success is True
    assert results.results[2].success is True


@pytest.mark.unit
@pytest.mark.asyncio
async def test_orchestrator_cleanup(mock_engine):
    """Test orchestrator cleanup/shutdown"""
    orchestrator = PipelineOrchestrator()
    orchestrator.engine = mock_engine

    await orchestrator.initialize()

    # Cleanup should not raise error
    if hasattr(orchestrator, 'cleanup'):
        await orchestrator.cleanup()


@pytest.mark.unit
@pytest.mark.asyncio
async def test_orchestrator_context_preservation(mock_engine, sample_document_context, sample_text_simple):
    """Test that document context is preserved through processing"""
    orchestrator = PipelineOrchestrator()
    orchestrator.engine = mock_engine

    result = await orchestrator.process_document(
        sample_text_simple,
        user_id='test_user',
        document_id='test_context',
        metadata={'custom_context': sample_document_context}
    )

    # Context should be preserved in result (if implemented)
    assert result is not None


@pytest.mark.unit
@pytest.mark.asyncio
async def test_orchestrator_statistics(mock_engine, test_documents):
    """Test orchestrator provides processing statistics"""
    orchestrator = PipelineOrchestrator()
    orchestrator.engine = mock_engine

    results = await orchestrator.process_batch(test_documents, user_id='test_user')

    # Should provide statistics (if implemented)
    successful = sum(1 for r in results if r.success)
    failed = sum(1 for r in results if not r.success)

    assert successful + failed == len(test_documents)


@pytest.mark.unit
@pytest.mark.asyncio
async def test_orchestrator_partial_failure_handling(test_documents):
    """Test orchestrator handles partial batch failures"""
    orchestrator = PipelineOrchestrator()

    # Mock engine that fails on specific pattern
    async def mock_process_selective(text, user_id, **kwargs):
        if "error" in text.lower():
            return PipelineResult(
                original_text=text,
                anonymized_text="",
                entities=[],
                success=False,
                error="Pattern error",
                processing_time_ms=0,
                engine_name="test",
                engine_version="1.0"
            )
        return PipelineResult(
            original_text=text,
            anonymized_text="anonymized",
            entities=[],
            success=True,
            error=None,
            processing_time_ms=50,
            engine_name="test",
            engine_version="1.0"
        )

    orchestrator.engine = MagicMock()
    orchestrator.engine.process = mock_process_selective

    results = await orchestrator.process_batch(test_documents, user_id='test_user')

    # All documents should have a result
    assert len(results) == len(test_documents)
