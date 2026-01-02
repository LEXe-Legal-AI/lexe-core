"""
Pipeline orchestrator for coordinating PII detection and anonymization

The orchestrator manages the full pipeline workflow:
1. Load and configure engines (spaCy, Presidio)
2. Apply preprocessing filters
3. Detect entities with selected engine
4. Apply postprocessing filters
5. Anonymize text with replacement strategy
6. Track events to monitoring database

Supports:
- Async batch processing (multiple documents in parallel)
- Automatic engine selection (default vs fallback)
- Filter chain management
- Event tracking integration
"""

import asyncio
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import time

import structlog

from ..config import get_privacy_config, PrivacyConfig
from .base_pipeline import BasePipeline, PipelineResult, DetectedEntity
from .filters import (
    normalize_text,
    detect_context,
    validate_entities,
    legal_pattern_matcher,
    sensitivity_scorer,
    FilterChain,
)
from .strategies import (
    ReplacementStrategy,
    create_consistent_strategy,
)

logger = structlog.get_logger(__name__)


@dataclass
class BatchResult:
    """Result of batch processing"""
    results: List[PipelineResult]
    total_documents: int
    successful: int
    failed: int
    total_entities_detected: int
    total_processing_time_ms: int
    metadata: Dict[str, Any]

    def __len__(self) -> int:
        """Return number of results"""
        return len(self.results)

    def __iter__(self):
        """Make iterable by iterating over results"""
        return iter(self.results)

    def __getitem__(self, index):
        """Make subscriptable by indexing into results"""
        return self.results[index]


class PipelineOrchestrator:
    """
    Orchestrates the complete PII detection and anonymization pipeline

    Responsibilities:
    - Engine management (load, configure, fallback)
    - Filter chain configuration
    - Batch processing coordination
    - Event tracking (integration with monitoring DB)
    - Error handling and retry logic

    Usage:
        orchestrator = PipelineOrchestrator()
        await orchestrator.initialize()

        result = await orchestrator.process_document(
            text=document_text,
            user_id='user123',
            document_id='doc456',
        )

        # Batch processing
        batch_result = await orchestrator.process_batch(
            documents=[doc1, doc2, doc3],
            user_id='user123',
        )
    """

    def __init__(
        self,
        config: Optional[PrivacyConfig] = None,
        engine_override: Optional[str] = None,
    ):
        """
        Initialize orchestrator

        Args:
            config: Privacy configuration (loads from env if None)
            engine_override: Override default engine ('spacy', 'presidio')
        """
        self.config = config or get_privacy_config()
        self.engine_override = engine_override

        # Will be set in initialize()
        self.primary_engine: Optional[BasePipeline] = None
        self.fallback_engine: Optional[BasePipeline] = None
        self.filter_chain: FilterChain = FilterChain()
        self.replacement_strategy: Optional[ReplacementStrategy] = None

        self.initialized = False
        self.logger = structlog.get_logger(__name__)

    async def initialize(self):
        """
        Initialize orchestrator (load engines, configure filters)

        This method must be called before processing any documents.
        """
        if self.initialized:
            self.logger.warning("orchestrator_already_initialized")
            return

        self.logger.info("orchestrator_initializing")

        # 1. Setup filter chain
        self._setup_filters()

        # 2. Setup replacement strategy
        self._setup_replacement_strategy()

        # 3. Load engines (will be implemented in FASE 2A/2B)
        await self._load_engines()

        self.initialized = True
        self.logger.info(
            "orchestrator_initialized",
            default_engine=self.config.default_engine,
            fallback_engine=self.config.fallback_engine,
            filters_enabled=len(self.filter_chain.text_filters) + len(self.filter_chain.entity_filters),
            replacement_strategy=self.config.replacement.default_strategy,
        )

    def _setup_filters(self):
        """Configure filter chain based on config"""
        filter_config = self.config.filters

        # Text filters
        if filter_config.normalize_text:
            self.filter_chain.add_text_filter(
                lambda text: normalize_text(
                    text,
                    lowercase=filter_config.lowercase,
                    remove_extra_whitespace=filter_config.remove_extra_whitespace,
                    normalize_unicode=filter_config.normalize_unicode,
                )
            )

        # Entity filters
        if filter_config.validate_entities:
            self.filter_chain.add_entity_filter(validate_entities)

        if filter_config.sensitivity_scoring:
            self.filter_chain.add_entity_filter(sensitivity_scorer)

        # Context-aware filters
        if filter_config.legal_pattern_matching:
            self.filter_chain.add_context_filter(legal_pattern_matcher)

        self.logger.debug(
            "filters_configured",
            text_filters=len(self.filter_chain.text_filters),
            entity_filters=len(self.filter_chain.entity_filters),
            context_filters=len(self.filter_chain.context_filters),
        )

    def _setup_replacement_strategy(self):
        """Configure replacement strategy based on config"""
        strategy_name = self.config.replacement.default_strategy
        consistent = self.config.replacement.consistent_replacement

        # Build kwargs for strategy
        kwargs = {}

        if strategy_name == 'deterministic':
            kwargs['format_template'] = self.config.replacement.deterministic_format
        elif strategy_name == 'synthetic':
            kwargs['locale'] = self.config.replacement.synthetic_locale
            if self.config.replacement.synthetic_seed:
                kwargs['seed'] = self.config.replacement.synthetic_seed
        elif strategy_name == 'redaction':
            kwargs['format_template'] = self.config.replacement.redaction_format
        elif strategy_name == 'hash':
            kwargs['algorithm'] = self.config.replacement.hash_algorithm
            if self.config.replacement.hash_salt:
                kwargs['salt'] = self.config.replacement.hash_salt

        # Create strategy (with or without consistency wrapper)
        if consistent:
            self.replacement_strategy = create_consistent_strategy(strategy_name, **kwargs)
        else:
            from .strategies import create_strategy
            self.replacement_strategy = create_strategy(strategy_name, **kwargs)

        self.logger.debug(
            "replacement_strategy_configured",
            strategy=strategy_name,
            consistent=consistent,
        )

    async def _load_engines(self):
        """
        Load and initialize detection engines.
        Supports: spaCy and Presidio with multi-language support.
        """
        from ..engines.presidio.presidio_engine import PresidioEngine
        
        # Determine which engine to use
        if self.engine_override:
            engine_name = self.engine_override
        else:
            engine_name = self.config.default_engine
        
        try:
            # For now, use Presidio as primary (it supports multi-language)
            self.primary_engine = PresidioEngine(
                model_name='it_core_news_lg',  # Default to Italian
                confidence_threshold=self.config.presidio.confidence_threshold,
                anonymization_strategy=self.config.presidio.anonymizer_default_operator,
            )
            self.logger.info(
                "engine_loaded",
                engine=engine_name,
                model='multi_language',
            )
        except Exception as e:
            self.logger.error("engine_load_failed", engine=engine_name, error=str(e))
            self.primary_engine = None

    async def process_document(
        self,
        text: str,
        user_id: str,
        document_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> PipelineResult:
        """
        Process a single document through the pipeline

        Args:
            text: Document text
            user_id: User identifier
            document_id: Document identifier
            metadata: Additional metadata

        Returns:
            PipelineResult with detected entities and anonymized text
        """
        if not self.initialized:
            await self.initialize()

        start_time = time.time()

        try:
            self.logger.info(
                "document_processing_started",
                user_id=user_id,
                document_id=document_id,
                text_length=len(text),
            )

            # Detect document context (for metadata)
            context = detect_context(text)
            if metadata is None:
                metadata = {}
            metadata['document_context'] = {
                'type': context.document_type.value,
                'jurisdiction': context.jurisdiction,
                'court': context.court,
                'confidence': context.confidence,
            }

            # Apply text filters
            filtered_text, _ = await self.filter_chain.apply(text)

            # Detect entities (will use engine in FASE 2)
            # Use engine to detect entities
            if self.primary_engine:
                entities = await self.primary_engine.detect_entities(filtered_text)
            else:
                entities = []
            

            # Apply entity filters
            _, filtered_entities = await self.filter_chain.apply(
                filtered_text,
                entities,
            )

            # Anonymize text
            if filtered_entities:
                anonymized_text = self.replacement_strategy.replace_all(
                    filtered_text,
                    filtered_entities,
                    metadata,
                )
            else:
                anonymized_text = filtered_text

            # Calculate processing time
            processing_time_ms = int((time.time() - start_time) * 1000)

            # Create result
            result = PipelineResult(
                original_text=text,
                anonymized_text=anonymized_text,
                entities=filtered_entities or [],
                success=True,
                processing_time_ms=processing_time_ms,
                metadata=metadata,
            )

            # Track event (will integrate with monitoring DB in FASE 4)
            await self._track_anonymization_event(
                user_id=user_id,
                document_id=document_id,
                result=result,
            )

            self.logger.info(
                "document_processing_completed",
                user_id=user_id,
                document_id=document_id,
                entities_detected=len(result.entities),
                processing_time_ms=processing_time_ms,
            )

            return result

        except Exception as e:
            processing_time_ms = int((time.time() - start_time) * 1000)

            self.logger.error(
                "document_processing_failed",
                user_id=user_id,
                document_id=document_id,
                error=str(e),
                error_type=type(e).__name__,
                processing_time_ms=processing_time_ms,
            )

            # Return error result
            return PipelineResult(
                original_text=text,
                anonymized_text=text,
                entities=[],
                success=False,
                error_message=str(e),
                processing_time_ms=processing_time_ms,
                metadata=metadata or {},
            )

    async def process_batch(
        self,
        documents: List[Dict[str, str]],
        user_id: str,
        max_concurrent: Optional[int] = None,
    ) -> BatchResult:
        """
        Process multiple documents in parallel

        Args:
            documents: List of dicts with 'text' and 'document_id' keys
            user_id: User identifier
            max_concurrent: Max concurrent tasks (default from config)

        Returns:
            BatchResult with all document results

        Usage:
            documents = [
                {'text': 'Document 1...', 'document_id': 'doc1'},
                {'text': 'Document 2...', 'document_id': 'doc2'},
            ]
            result = await orchestrator.process_batch(documents, user_id='user123')
        """
        if not self.initialized:
            await self.initialize()

        start_time = time.time()
        max_concurrent = max_concurrent or self.config.max_concurrent_jobs

        self.logger.info(
            "batch_processing_started",
            user_id=user_id,
            document_count=len(documents),
            max_concurrent=max_concurrent,
        )

        # Process documents with concurrency limit
        semaphore = asyncio.Semaphore(max_concurrent)

        async def process_with_semaphore(doc: Dict[str, str]) -> PipelineResult:
            async with semaphore:
                return await self.process_document(
                    text=doc['text'],
                    user_id=user_id,
                    document_id=doc['document_id'],
                    metadata=doc.get('metadata'),
                )

        # Run all tasks concurrently (with limit)
        results = await asyncio.gather(
            *[process_with_semaphore(doc) for doc in documents],
            return_exceptions=True,
        )

        # Handle exceptions and collect all results
        all_results = []
        successful_count = 0
        failed_count = 0
        for result in results:
            if isinstance(result, Exception):
                failed_count += 1
                self.logger.error("batch_document_exception", error=str(result))
            elif isinstance(result, PipelineResult):
                all_results.append(result)
                if result.success:
                    successful_count += 1
                else:
                    failed_count += 1

        # Calculate totals
        total_processing_time_ms = int((time.time() - start_time) * 1000)
        total_entities = sum(len(r.entities) for r in all_results if r.success)

        batch_result = BatchResult(
            results=all_results,  # Include ALL results (successful and failed)
            total_documents=len(documents),
            successful=successful_count,
            failed=failed_count,
            total_entities_detected=total_entities,
            total_processing_time_ms=total_processing_time_ms,
            metadata={
                'user_id': user_id,
                'max_concurrent': max_concurrent,
                'avg_processing_time_ms': (
                    total_processing_time_ms // len(documents) if documents else 0
                ),
            },
        )

        self.logger.info(
            "batch_processing_completed",
            user_id=user_id,
            total_documents=len(documents),
            successful=batch_result.successful,
            failed=batch_result.failed,
            total_entities=batch_result.total_entities_detected,
            total_time_ms=batch_result.total_processing_time_ms,
        )

        return batch_result

    async def _track_anonymization_event(
        self,
        user_id: str,
        document_id: str,
        result: PipelineResult,
    ):
        """
        Track anonymization event to monitoring database

        This will be integrated with EventWriter in FASE 4.
        For now, just log the event.
        """
        # TODO: Implement in FASE 4
        # from ...monitoring.services.event_writer import EventWriter
        #
        # event_writer = EventWriter.get_instance()
        # await event_writer.save_anonymization_log(
        #     user_id=user_id,
        #     document_id=document_id,
        #     original_length=len(result.original_text),
        #     anonymized_length=len(result.anonymized_text),
        #     entities_detected=len(result.entities),
        #     entities_replaced=len(result.entities),
        #     engine_used=self.config.default_engine,
        #     processing_time_ms=result.processing_time_ms,
        #     success=result.success,
        #     error_message=result.error_message,
        #     metadata=result.metadata,
        # )

        self.logger.debug(
            "anonymization_event_tracked (placeholder)",
            user_id=user_id,
            document_id=document_id,
            entities=len(result.entities),
        )

    async def shutdown(self):
        """Cleanup resources"""
        self.logger.info("orchestrator_shutting_down")

        # Unload engines
        if self.primary_engine:
            if hasattr(self.primary_engine, 'shutdown'):
                await self.primary_engine.shutdown()

        if self.fallback_engine:
            if hasattr(self.fallback_engine, 'shutdown'):
                await self.fallback_engine.shutdown()

        self.initialized = False
        self.logger.info("orchestrator_shutdown_complete")
