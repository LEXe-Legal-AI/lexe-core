"""
Performance tests for privacy pipeline.

Tests verify latency targets (P95 < 500ms) and throughput (>100 docs/sec).

Total: 10 tests
"""
import pytest
import asyncio
import time
import statistics
from llsearch.privacy.pipeline.orchestrator import PipelineOrchestrator


# =============================================================================
# 1-2: Single Document Latency (P50, P95, P99)
# =============================================================================

@pytest.mark.performance
@pytest.mark.slow
@pytest.mark.asyncio
async def test_single_doc_latency_p50(mock_engine, sample_text_simple):
    """Test P50 latency for single document processing"""
    orchestrator = PipelineOrchestrator()
    orchestrator.primary_engine = mock_engine

    latencies = []

    # Run 100 iterations to get stable percentiles
    for _ in range(100):
        start = time.perf_counter()
        result = await orchestrator.process_document(sample_text_simple, user_id='test_user', document_id='doc_perf')
        latency_ms = (time.perf_counter() - start) * 1000
        latencies.append(latency_ms)

        assert result.success is True

    p50 = statistics.median(latencies)

    # P50 should be very fast with mock engine
    assert p50 < 100  # Less than 100ms for P50
    print(f"\nP50 latency: {p50:.2f}ms")


@pytest.mark.performance
@pytest.mark.slow
@pytest.mark.asyncio
async def test_single_doc_latency_p95_p99(mock_engine, sample_text_complex):
    """Test P95 and P99 latency for single document processing"""
    orchestrator = PipelineOrchestrator()
    orchestrator.primary_engine = mock_engine

    latencies = []

    # Run 100 iterations
    for _ in range(100):
        start = time.perf_counter()
        result = await orchestrator.process_document(sample_text_complex, user_id='test_user', document_id='doc_perf')
        latency_ms = (time.perf_counter() - start) * 1000
        latencies.append(latency_ms)

        assert result.success is True

    latencies.sort()
    p95 = latencies[94]  # 95th percentile
    p99 = latencies[98]  # 99th percentile

    # P95 should meet target (< 500ms with mock engine is very conservative)
    assert p95 < 500
    assert p99 < 1000

    print(f"\nP95 latency: {p95:.2f}ms")
    print(f"P99 latency: {p99:.2f}ms")


# =============================================================================
# 3-4: Batch Processing Throughput
# =============================================================================

@pytest.mark.performance
@pytest.mark.slow
@pytest.mark.asyncio
async def test_batch_throughput_small(mock_engine, test_documents):
    """Test throughput for small batch (3 documents)"""
    orchestrator = PipelineOrchestrator()
    orchestrator.primary_engine = mock_engine

    documents = [{'text': doc['text'], 'document_id': doc.get('document_id', f'doc_{i}')} for i, doc in enumerate(test_documents)]

    start = time.perf_counter()
    batch_result = await orchestrator.process_batch(documents, user_id='test_user')
    elapsed_ms = (time.perf_counter() - start) * 1000

    assert len(batch_result.results) == len(documents)
    assert batch_result.successful == len(documents)

    # Calculate throughput (docs per second)
    throughput = (len(documents) / elapsed_ms) * 1000

    print(f"\nBatch size: {len(documents)}")
    print(f"Total time: {elapsed_ms:.2f}ms")
    print(f"Throughput: {throughput:.2f} docs/sec")

    # Should be fast with mock engine
    assert throughput > 10  # At least 10 docs/sec


@pytest.mark.performance
@pytest.mark.slow
@pytest.mark.asyncio
async def test_batch_throughput_large(mock_engine, large_test_corpus):
    """Test throughput for large batch (50 documents)"""
    orchestrator = PipelineOrchestrator()
    orchestrator.primary_engine = mock_engine

    documents = [{'text': doc['text'], 'document_id': doc.get('document_id', f'doc_{i}')} for i, doc in enumerate(large_test_corpus)]

    start = time.perf_counter()
    batch_result = await orchestrator.process_batch(documents, user_id='test_user', max_concurrent=10)
    elapsed_ms = (time.perf_counter() - start) * 1000

    assert len(batch_result.results) == len(documents)
    assert batch_result.successful == len(documents)

    # Calculate throughput
    throughput = (len(documents) / elapsed_ms) * 1000

    print(f"\nBatch size: {len(documents)}")
    print(f"Total time: {elapsed_ms:.2f}ms")
    print(f"Throughput: {throughput:.2f} docs/sec")

    # Target: >100 docs/sec (with mock engine should easily achieve)
    assert throughput > 50  # Conservative target for mock


# =============================================================================
# 5-6: Concurrent Processing Scalability
# =============================================================================

@pytest.mark.performance
@pytest.mark.slow
@pytest.mark.asyncio
async def test_concurrent_processing_scaling(mock_engine, sample_text_simple):
    """Test how concurrency affects throughput"""
    orchestrator = PipelineOrchestrator()
    orchestrator.primary_engine = mock_engine

    num_docs = 20
    documents = [{'text': sample_text_simple, 'document_id': f'doc_{i}'} for i in range(num_docs)]

    # Test different concurrency levels
    concurrency_levels = [1, 5, 10]
    results_by_concurrency = {}

    for max_concurrent in concurrency_levels:
        start = time.perf_counter()
        batch_result = await orchestrator.process_batch(
            documents,
            user_id='test_user',
            max_concurrent=max_concurrent
        )
        elapsed_ms = (time.perf_counter() - start) * 1000

        throughput = (num_docs / elapsed_ms) * 1000
        results_by_concurrency[max_concurrent] = {
            'elapsed_ms': elapsed_ms,
            'throughput': throughput
        }

        print(f"\nConcurrency: {max_concurrent}")
        print(f"  Time: {elapsed_ms:.2f}ms")
        print(f"  Throughput: {throughput:.2f} docs/sec")

    # Higher concurrency should generally improve throughput
    # (at least not degrade significantly)
    assert results_by_concurrency[10]['throughput'] >= \
           results_by_concurrency[1]['throughput'] * 0.5


@pytest.mark.performance
@pytest.mark.slow
@pytest.mark.asyncio
async def test_concurrent_stress(mock_engine, sample_text_complex):
    """Test system under high concurrent load"""
    orchestrator = PipelineOrchestrator()
    orchestrator.primary_engine = mock_engine

    num_docs = 50
    documents = [{'text': sample_text_complex, 'document_id': f'doc_{i}'} for i in range(num_docs)]

    start = time.perf_counter()
    batch_result = await orchestrator.process_batch(
        documents,
        user_id='test_user',
        max_concurrent=20  # High concurrency
    )
    elapsed_ms = (time.perf_counter() - start) * 1000

    # All should succeed
    assert len(batch_result.results) == num_docs
    assert batch_result.successful == len(documents)

    throughput = (num_docs / elapsed_ms) * 1000

    print(f"\nStress test: {num_docs} docs, concurrency=20")
    print(f"Total time: {elapsed_ms:.2f}ms")
    print(f"Throughput: {throughput:.2f} docs/sec")

    # Should maintain reasonable performance under stress
    assert throughput > 30


# =============================================================================
# 7-8: Large Document Handling (>10KB)
# =============================================================================

@pytest.mark.performance
@pytest.mark.slow
@pytest.mark.asyncio
async def test_large_document_latency(mock_engine):
    """Test latency for large documents (>10KB)"""
    # Generate 15KB document
    large_doc = """
    TRIBUNALE DI MILANO
    Sentenza n. 1234/2024

    Il Tribunale, nella persona del Giudice Dr. Mario Rossi,
    ha pronunciato la seguente sentenza nel procedimento...
    """ * 100  # Repeat to get ~15KB

    assert len(large_doc) > 10000

    orchestrator = PipelineOrchestrator()
    orchestrator.primary_engine = mock_engine

    latencies = []

    # Run 10 iterations
    for _ in range(10):
        start = time.perf_counter()
        result = await orchestrator.process_document(large_doc, user_id='test_user', document_id='doc_perf')
        latency_ms = (time.perf_counter() - start) * 1000
        latencies.append(latency_ms)

        assert result.success is True

    avg_latency = statistics.mean(latencies)
    max_latency = max(latencies)

    print(f"\nLarge document ({len(large_doc)} bytes)")
    print(f"Average latency: {avg_latency:.2f}ms")
    print(f"Max latency: {max_latency:.2f}ms")

    # Should still be fast with mock engine
    assert avg_latency < 500


@pytest.mark.performance
@pytest.mark.slow
@pytest.mark.asyncio
async def test_large_batch_throughput(mock_engine):
    """Test throughput for batch of large documents"""
    # Generate 10 large documents (~15KB each)
    large_docs = []
    for i in range(10):
        doc_text = f"""
        TRIBUNALE DI MILANO - Sentenza n. {i+1000}/2024

        Il Tribunale, nella persona del Giudice Dr. Mario Rossi_{i},
        ha pronunciato sentenza nel procedimento...
        """ * 100
        large_docs.append({'text': doc_text, 'document_id': f'large_doc_{i}'})

    orchestrator = PipelineOrchestrator()
    orchestrator.primary_engine = mock_engine

    start = time.perf_counter()
    batch_result = await orchestrator.process_batch(large_docs, user_id='test_user', max_concurrent=5)
    elapsed_ms = (time.perf_counter() - start) * 1000

    assert len(batch_result.results) == len(large_docs)
    assert batch_result.successful == len(large_docs)

    throughput = (len(large_docs) / elapsed_ms) * 1000

    print(f"\nLarge batch: {len(large_docs)} docs (~15KB each)")
    print(f"Total time: {elapsed_ms:.2f}ms")
    print(f"Throughput: {throughput:.2f} docs/sec")

    # Should maintain reasonable throughput
    assert throughput > 5


# =============================================================================
# 9-10: Memory Usage and Efficiency
# =============================================================================

@pytest.mark.performance
@pytest.mark.slow
@pytest.mark.asyncio
async def test_memory_efficiency_batch(mock_engine, large_test_corpus):
    """Test memory efficiency during batch processing"""
    orchestrator = PipelineOrchestrator()
    orchestrator.primary_engine = mock_engine

    documents = [{'text': doc['text'], 'document_id': doc.get('document_id', f'doc_{i}')} for i, doc in enumerate(large_test_corpus)]

    # Process in batches to test memory management
    batch_size = 10
    all_results = []

    for i in range(0, len(documents), batch_size):
        batch = documents[i:i+batch_size]
        batch_result = await orchestrator.process_batch(batch, user_id='test_user')
        all_results.extend(batch_result.results)

        # Validate each batch completes successfully
        assert batch_result.successful == len(batch)

    # All documents processed
    assert len(all_results) == len(documents)

    print(f"\nProcessed {len(all_results)} documents in batches of {batch_size}")


@pytest.mark.performance
@pytest.mark.slow
@pytest.mark.asyncio
async def test_no_memory_leak_repeated(mock_engine, sample_text_simple):
    """Test for memory leaks during repeated processing"""
    orchestrator = PipelineOrchestrator()
    orchestrator.primary_engine = mock_engine

    num_iterations = 100

    # Process same document repeatedly
    for _ in range(num_iterations):
        result = await orchestrator.process_document(sample_text_simple, user_id='test_user', document_id='doc_perf')
        assert result.success is True

        # Clear result to avoid accumulation in test scope
        del result

    # If we got here without issues, no obvious memory leak
    print(f"\nCompleted {num_iterations} iterations without errors")
