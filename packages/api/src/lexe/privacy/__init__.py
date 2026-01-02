"""
Privacy Module for LEXePro

This module provides comprehensive PII detection and pseudonymization capabilities
for legal documents, with dual-engine support (spaCy and Microsoft Presidio),
benchmarking framework, and full monitoring integration.

Main Components:
    - Models: SQLAlchemy models for PII tracking (PIIDetectionEvent, AnonymizationLog, BenchmarkResult)
    - Pipeline: Core anonymization pipeline with filter functions
    - Engines: spaCy NER and Microsoft Presidio implementations
    - Benchmarking: Performance comparison and winner selection
    - Config: Configuration management

Usage:
    from llsearch.privacy import get_privacy_config, PIIDetectionEvent
    from llsearch.privacy.pipeline import PseudonymizationPipeline

    config = get_privacy_config()
    pipeline = PseudonymizationPipeline(engine=config.default_engine)
    result = await pipeline.anonymize_text(text, user_id='user123', document_id='doc456')
"""

from .config import (
    PrivacyConfig,
    SpacyConfig,
    PresidioConfig,
    FilterConfig,
    ReplacementConfig,
    BenchmarkConfig,
    MonitoringConfig,
    get_privacy_config,
    reset_privacy_config,
)

from .models import (
    PIIDetectionEvent,
    AnonymizationLog,
    BenchmarkResult,
)

__version__ = '0.1.0'

__all__ = [
    # Configuration
    'PrivacyConfig',
    'SpacyConfig',
    'PresidioConfig',
    'FilterConfig',
    'ReplacementConfig',
    'BenchmarkConfig',
    'MonitoringConfig',
    'get_privacy_config',
    'reset_privacy_config',

    # Models
    'PIIDetectionEvent',
    'AnonymizationLog',
    'BenchmarkResult',

    # Version
    '__version__',
]
