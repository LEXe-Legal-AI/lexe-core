"""
Integration tests for BatchOptimizer smart batching functionality

Tests the batch optimization logic for grouping documents by length and language,
adaptive sizing, and result reordering.

Run with:
    pytest src/llsearch/privacy/tests/integration/test_batch_optimizer.py -v
"""

import pytest
from typing import List, Dict, Any

from llsearch.privacy.pipeline.batch_optimizer import (
    BatchOptimizer,
    BatchGroup,
    LengthBucket,
    BatchConfig,
)
from llsearch.privacy.pipeline.base_pipeline import PipelineResult, DetectedEntity, EntityType


class TestBatchOptimizerBasics:
    """Basic batch optimizer functionality tests"""

    def test_empty_documents(self):
        """Test handling of empty document list"""
        optimizer = BatchOptimizer(max_batch_size=32)
        batches = optimizer.create_batches([])

        assert len(batches) == 0

    def test_single_document(self):
        """Test handling of single document"""
        optimizer = BatchOptimizer(max_batch_size=32)
        documents = [{'text': 'Short text', 'document_id': 'doc1'}]

        batches = optimizer.create_batches(documents)

        assert len(batches) == 1
        assert len(batches[0].documents) == 1
        assert batches[0].bucket == LengthBucket.SMALL

    def test_multiple_documents_same_bucket(self):
        """Test grouping documents of similar length"""
        optimizer = BatchOptimizer(max_batch_size=32)
        documents = [
            {'text': 'Short text 1', 'document_id': 'doc1'},
            {'text': 'Short text 2', 'document_id': 'doc2'},
            {'text': 'Short text 3', 'document_id': 'doc3'},
        ]

        batches = optimizer.create_batches(documents)

        assert len(batches) == 1
        assert batches[0].bucket == LengthBucket.SMALL
        assert len(batches[0].documents) == 3


class TestLengthBasedBatching:
    """Test length-based document grouping"""

    def test_small_document_classification(self):
        """Test small document (< 500 chars) classification"""
        optimizer = BatchOptimizer(max_batch_size=32)
        documents = [{'text': 'A' * 400, 'document_id': 'doc1'}]

        batches = optimizer.create_batches(documents)

        assert batches[0].bucket == LengthBucket.SMALL

    def test_medium_document_classification(self):
        """Test medium document (500-2000 chars) classification"""
        optimizer = BatchOptimizer(max_batch_size=32)
        documents = [{'text': 'A' * 1000, 'document_id': 'doc1'}]

        batches = optimizer.create_batches(documents)

        assert batches[0].bucket == LengthBucket.MEDIUM

    def test_large_document_classification(self):
        """Test large document (> 2000 chars) classification"""
        optimizer = BatchOptimizer(max_batch_size=32)
        documents = [{'text': 'A' * 3000, 'document_id': 'doc1'}]

        batches = optimizer.create_batches(documents)

        assert batches[0].bucket == LengthBucket.LARGE

    def test_mixed_length_documents(self):
        """Test grouping of mixed-length documents into separate batches"""
        optimizer = BatchOptimizer(max_batch_size=32)
        documents = [
            {'text': 'A' * 300, 'document_id': 'doc1'},    # Small
            {'text': 'B' * 800, 'document_id': 'doc2'},    # Medium
            {'text': 'C' * 2500, 'document_id': 'doc3'},   # Large
            {'text': 'D' * 400, 'document_id': 'doc4'},    # Small
        ]

        batches = optimizer.create_batches(documents)

        # Should create 3 batches (one per bucket)
        assert len(batches) == 3

        # Find batches by bucket
        small_batch = next(b for b in batches if b.bucket == LengthBucket.SMALL)
        medium_batch = next(b for b in batches if b.bucket == LengthBucket.MEDIUM)
        large_batch = next(b for b in batches if b.bucket == LengthBucket.LARGE)

        assert len(small_batch.documents) == 2
        assert len(medium_batch.documents) == 1
        assert len(large_batch.documents) == 1


class TestLanguageBasedBatching:
    """Test language-based document grouping"""

    def test_single_language(self):
        """Test documents with same language"""
        optimizer = BatchOptimizer(max_batch_size=32)
        documents = [
            {'text': 'Italian text 1', 'document_id': 'doc1'},
            {'text': 'Italian text 2', 'document_id': 'doc2'},
        ]
        languages = ['it', 'it']

        batches = optimizer.create_batches(documents, languages)

        assert len(batches) == 1
        assert batches[0].language == 'it'

    def test_mixed_languages(self):
        """Test grouping documents by language"""
        optimizer = BatchOptimizer(max_batch_size=32)
        documents = [
            {'text': 'Short Italian', 'document_id': 'doc1'},
            {'text': 'Short English', 'document_id': 'doc2'},
            {'text': 'Short French', 'document_id': 'doc3'},
            {'text': 'Short Italian 2', 'document_id': 'doc4'},
        ]
        languages = ['it', 'en', 'fr', 'it']

        batches = optimizer.create_batches(documents, languages)

        # Should create 3 batches (one per language)
        assert len(batches) == 3

        # All should be SMALL bucket
        for batch in batches:
            assert batch.bucket == LengthBucket.SMALL

    def test_language_and_length_grouping(self):
        """Test combined language and length grouping"""
        optimizer = BatchOptimizer(max_batch_size=32)
        documents = [
            {'text': 'A' * 300, 'document_id': 'doc1'},    # Small IT
            {'text': 'B' * 800, 'document_id': 'doc2'},    # Medium IT
            {'text': 'C' * 400, 'document_id': 'doc3'},    # Small EN
        ]
        languages = ['it', 'it', 'en']

        batches = optimizer.create_batches(documents, languages)

        # Should create 3 batches: (Small, IT), (Medium, IT), (Small, EN)
        assert len(batches) == 3


class TestBatchSplitting:
    """Test splitting large groups into batches"""

    def test_no_split_when_under_max_size(self):
        """Test batch not split when under max size"""
        optimizer = BatchOptimizer(max_batch_size=10)
        documents = [{'text': f'Doc {i}', 'document_id': f'doc{i}'} for i in range(8)]

        batches = optimizer.create_batches(documents)

        assert len(batches) == 1
        assert len(batches[0].documents) == 8

    def test_split_when_over_max_size(self):
        """Test batch split when exceeding max size"""
        optimizer = BatchOptimizer(max_batch_size=10)
        documents = [{'text': f'Doc {i}', 'document_id': f'doc{i}'} for i in range(25)]

        batches = optimizer.create_batches(documents)

        # Should split into 3 batches: 10 + 10 + 5
        assert len(batches) == 3
        assert len(batches[0].documents) == 10
        assert len(batches[1].documents) == 10
        assert len(batches[2].documents) == 5

    def test_max_batch_size_respected(self):
        """Test all batches respect max_batch_size"""
        optimizer = BatchOptimizer(max_batch_size=15)
        documents = [{'text': f'Doc {i}', 'document_id': f'doc{i}'} for i in range(100)]

        batches = optimizer.create_batches(documents)

        for batch in batches:
            assert len(batch.documents) <= 15


class TestAdaptiveSizing:
    """Test adaptive batch sizing based on document characteristics"""

    def test_adaptive_sizing_large_documents(self):
        """Test reduced batch size for large documents"""
        config = BatchConfig(max_batch_size=32, adaptive_sizing=True)
        optimizer = BatchOptimizer(config=config)

        # Create 50 large documents
        documents = [
            {'text': 'A' * 3000, 'document_id': f'doc{i}'}
            for i in range(50)
        ]

        batches = optimizer.create_batches(documents)

        # With adaptive sizing, large docs should use ~50% of max_batch_size (16)
        for batch in batches:
            assert len(batch.documents) <= 16
            assert batch.bucket == LengthBucket.LARGE

    def test_adaptive_sizing_small_documents(self):
        """Test full batch size for small documents"""
        config = BatchConfig(max_batch_size=32, adaptive_sizing=True)
        optimizer = BatchOptimizer(config=config)

        # Create 50 small documents
        documents = [
            {'text': 'A' * 200, 'document_id': f'doc{i}'}
            for i in range(50)
        ]

        batches = optimizer.create_batches(documents)

        # Small docs can use full batch size
        for batch in batches:
            assert len(batch.documents) <= 32
            assert batch.bucket == LengthBucket.SMALL

    def test_adaptive_sizing_disabled(self):
        """Test no adaptive sizing when disabled"""
        config = BatchConfig(max_batch_size=32, adaptive_sizing=False)
        optimizer = BatchOptimizer(config=config)

        # Create 50 large documents
        documents = [
            {'text': 'A' * 3000, 'document_id': f'doc{i}'}
            for i in range(50)
        ]

        batches = optimizer.create_batches(documents)

        # Without adaptive sizing, should use max_batch_size
        # 50 docs / 32 per batch = 2 batches (32 + 18)
        assert len(batches) == 2
        assert len(batches[0].documents) == 32


class TestResultReordering:
    """Test reordering results to match original order"""

    def test_reorder_simple_case(self):
        """Test reordering with single batch"""
        optimizer = BatchOptimizer(max_batch_size=32)

        documents = [
            {'text': 'Doc 1', 'document_id': 'doc1'},
            {'text': 'Doc 2', 'document_id': 'doc2'},
            {'text': 'Doc 3', 'document_id': 'doc3'},
        ]

        batches = optimizer.create_batches(documents)

        # Simulate results (in batch order)
        batch_results = [
            PipelineResult(original_text='Doc 1', anonymized_text='Anon 1', metadata={'doc_id': 'doc1'}),
            PipelineResult(original_text='Doc 2', anonymized_text='Anon 2', metadata={'doc_id': 'doc2'}),
            PipelineResult(original_text='Doc 3', anonymized_text='Anon 3', metadata={'doc_id': 'doc3'}),
        ]

        ordered = optimizer.reorder_results(batch_results, batches)

        assert len(ordered) == 3
        assert ordered[0].original_text == 'Doc 1'
        assert ordered[1].original_text == 'Doc 2'
        assert ordered[2].original_text == 'Doc 3'

    def test_reorder_multiple_batches(self):
        """Test reordering with multiple batches"""
        optimizer = BatchOptimizer(max_batch_size=2)

        documents = [
            {'text': 'Doc 1', 'document_id': 'doc1'},
            {'text': 'Doc 2', 'document_id': 'doc2'},
            {'text': 'Doc 3', 'document_id': 'doc3'},
            {'text': 'Doc 4', 'document_id': 'doc4'},
        ]

        batches = optimizer.create_batches(documents)

        # Results may be out of order after parallel processing
        batch_results = [
            PipelineResult(original_text='Doc 1', anonymized_text='Anon 1'),
            PipelineResult(original_text='Doc 2', anonymized_text='Anon 2'),
            PipelineResult(original_text='Doc 3', anonymized_text='Anon 3'),
            PipelineResult(original_text='Doc 4', anonymized_text='Anon 4'),
        ]

        ordered = optimizer.reorder_results(batch_results, batches)

        assert len(ordered) == 4
        # Verify original order is maintained
        for i, result in enumerate(ordered):
            assert result.original_text == f'Doc {i+1}'

    def test_reorder_mixed_buckets(self):
        """Test reordering with documents in different buckets"""
        optimizer = BatchOptimizer(max_batch_size=32)

        documents = [
            {'text': 'A' * 300, 'document_id': 'doc1'},    # Small (index 0)
            {'text': 'B' * 800, 'document_id': 'doc2'},    # Medium (index 1)
            {'text': 'C' * 2500, 'document_id': 'doc3'},   # Large (index 2)
            {'text': 'D' * 400, 'document_id': 'doc4'},    # Small (index 3)
        ]

        batches = optimizer.create_batches(documents)

        # Results in batch order (grouped by bucket)
        batch_results = [
            PipelineResult(original_text='A' * 300, anonymized_text='Anon 1'),  # Small
            PipelineResult(original_text='D' * 400, anonymized_text='Anon 4'),  # Small
            PipelineResult(original_text='B' * 800, anonymized_text='Anon 2'),  # Medium
            PipelineResult(original_text='C' * 2500, anonymized_text='Anon 3'), # Large
        ]

        ordered = optimizer.reorder_results(batch_results, batches)

        # Should be reordered to original sequence
        assert len(ordered) == 4
        assert len(ordered[0].original_text) == 300  # doc1 (small)
        assert len(ordered[1].original_text) == 800  # doc2 (medium)
        assert len(ordered[2].original_text) == 2500 # doc3 (large)
        assert len(ordered[3].original_text) == 400  # doc4 (small)


class TestBatchStatistics:
    """Test batch statistics generation"""

    def test_empty_batch_stats(self):
        """Test statistics for empty batch list"""
        optimizer = BatchOptimizer(max_batch_size=32)

        stats = optimizer.get_batch_stats([])

        assert stats['total_batches'] == 0
        assert stats['total_documents'] == 0
        assert stats['avg_batch_size'] == 0

    def test_single_batch_stats(self):
        """Test statistics for single batch"""
        optimizer = BatchOptimizer(max_batch_size=32)
        documents = [{'text': f'Doc {i}', 'document_id': f'doc{i}'} for i in range(10)]

        batches = optimizer.create_batches(documents)
        stats = optimizer.get_batch_stats(batches)

        assert stats['total_batches'] == 1
        assert stats['total_documents'] == 10
        assert stats['avg_batch_size'] == 10

    def test_multiple_batch_stats(self):
        """Test statistics for multiple batches"""
        optimizer = BatchOptimizer(max_batch_size=10)

        # Mix of lengths
        documents = [
            {'text': 'A' * 300, 'document_id': f'doc{i}'}
            for i in range(15)  # 15 small docs
        ] + [
            {'text': 'B' * 1000, 'document_id': f'doc{i+15}'}
            for i in range(8)   # 8 medium docs
        ]

        batches = optimizer.create_batches(documents)
        stats = optimizer.get_batch_stats(batches)

        assert stats['total_documents'] == 23
        assert stats['buckets']['small'] >= 1
        assert stats['buckets']['medium'] >= 1

    def test_bucket_distribution(self):
        """Test bucket distribution in statistics"""
        optimizer = BatchOptimizer(max_batch_size=5)

        documents = [
            {'text': 'A' * 300, 'document_id': 'doc1'},    # Small
            {'text': 'A' * 350, 'document_id': 'doc2'},    # Small
            {'text': 'B' * 1000, 'document_id': 'doc3'},   # Medium
            {'text': 'C' * 3000, 'document_id': 'doc4'},   # Large
        ]

        batches = optimizer.create_batches(documents)
        stats = optimizer.get_batch_stats(batches)

        assert stats['buckets']['small'] == 1
        assert stats['buckets']['medium'] == 1
        assert stats['buckets']['large'] == 1


class TestConfigurationOptions:
    """Test different configuration options"""

    def test_batch_by_length_disabled(self):
        """Test batching with length grouping disabled"""
        optimizer = BatchOptimizer(max_batch_size=32, batch_by_length=False)

        documents = [
            {'text': 'A' * 300, 'document_id': 'doc1'},    # Small
            {'text': 'B' * 1000, 'document_id': 'doc2'},   # Medium
            {'text': 'C' * 3000, 'document_id': 'doc3'},   # Large
        ]

        batches = optimizer.create_batches(documents)

        # All should be in one batch (no length separation)
        assert len(batches) == 1
        assert len(batches[0].documents) == 3

    def test_batch_by_language_disabled(self):
        """Test batching with language grouping disabled"""
        optimizer = BatchOptimizer(max_batch_size=32, batch_by_language=False)

        documents = [
            {'text': 'Italian text', 'document_id': 'doc1'},
            {'text': 'English text', 'document_id': 'doc2'},
            {'text': 'French text', 'document_id': 'doc3'},
        ]
        languages = ['it', 'en', 'fr']

        batches = optimizer.create_batches(documents, languages)

        # All should be in one batch (no language separation)
        assert len(batches) == 1
        assert len(batches[0].documents) == 3

    def test_custom_thresholds(self):
        """Test custom length thresholds"""
        config = BatchConfig(
            max_batch_size=32,
            small_threshold=1000,  # Custom threshold
            large_threshold=3000,
        )
        optimizer = BatchOptimizer(config=config)

        documents = [
            {'text': 'A' * 800, 'document_id': 'doc1'},   # Small (< 1000)
            {'text': 'B' * 2000, 'document_id': 'doc2'},  # Medium (1000-3000)
        ]

        batches = optimizer.create_batches(documents)

        # Should create 2 batches with custom thresholds
        assert len(batches) == 2

    def test_min_batch_size(self):
        """Test minimum batch size enforcement"""
        config = BatchConfig(
            max_batch_size=32,
            min_batch_size=5,
        )
        optimizer = BatchOptimizer(config=config)

        # This is informational - min_batch_size is used by orchestrator
        assert optimizer.config.min_batch_size == 5
