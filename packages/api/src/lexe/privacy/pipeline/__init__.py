"""
Pipeline components for pseudonymization

This module provides the core pipeline infrastructure for processing documents
through the pseudonymization flow.

Components:
    - BasePipeline: Abstract base class for detection engines
    - Filters: Preprocessing functions (normalize, validate, context)
    - Strategies: Replacement strategies (deterministic, synthetic, redact, hash)
    - Orchestrator: Pipeline orchestrator with async batch processing

Usage:
    from llsearch.privacy.pipeline import PseudonymizationPipeline
    from llsearch.privacy.pipeline.filters import normalize_text
    from llsearch.privacy.pipeline.strategies import DeterministicReplacer

    pipeline = PseudonymizationPipeline(engine='spacy')
    result = await pipeline.process(text, user_id='user123')
"""

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
    DeterministicReplacer,
    SyntheticReplacer,
    RedactionReplacer,
    HashReplacer,
    ConsistentReplacer,
)
from .orchestrator import PipelineOrchestrator

__all__ = [
    # Base
    'BasePipeline',
    'PipelineResult',
    'DetectedEntity',

    # Filters
    'normalize_text',
    'detect_context',
    'validate_entities',
    'legal_pattern_matcher',
    'sensitivity_scorer',
    'FilterChain',

    # Strategies
    'ReplacementStrategy',
    'DeterministicReplacer',
    'SyntheticReplacer',
    'RedactionReplacer',
    'HashReplacer',
    'ConsistentReplacer',

    # Orchestrator
    'PipelineOrchestrator',
]
