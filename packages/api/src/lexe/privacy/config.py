"""
Configuration for Privacy/Pseudonymization module
"""

import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass
class EngineConfig:
    """Configuration for a PII detection engine"""
    name: str
    enabled: bool = True
    version: Optional[str] = None
    model_path: Optional[str] = None
    confidence_threshold: float = 0.7
    batch_size: int = 32
    max_workers: int = 4
    custom_recognizers: List[str] = field(default_factory=list)
    config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SpacyConfig(EngineConfig):
    """Configuration specific to spaCy NER engine"""
    name: str = 'spacy'
    model_name: str = 'it_core_news_lg'
    use_gpu: bool = False
    disable_components: List[str] = field(default_factory=lambda: ['parser', 'tagger'])
    entity_types: List[str] = field(default_factory=lambda: [
        'PERSON', 'ORG', 'LOC', 'DATE', 'GPE', 'NORP'
    ])
    custom_patterns: bool = True  # Enable custom CF/PIVA patterns


@dataclass
class PresidioConfig(EngineConfig):
    """Configuration specific to Microsoft Presidio engine"""
    name: str = 'presidio'
    supported_languages: list = field(default_factory=lambda: ['it', 'en', 'fr', 'es', 'de', 'pt'])
    nlp_engine: str = 'spacy'
    supported_entities: List[str] = field(default_factory=lambda: [
        'PERSON', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'IBAN_CODE',
        'IT_FISCAL_CODE', 'IT_VAT_CODE', 'IT_IDENTITY_CARD',
        'LOCATION', 'ORG', 'DATE_TIME'  # Fixed: 'ORG' not 'ORGANIZATION' to match EntityType.ORGANIZATION.value
    ])
    anonymizer_default_operator: str = 'replace'  # 'replace', 'redact', 'hash', 'mask'
    auto_detect_language: bool = True
    low_confidence_threshold: float = 0.6


@dataclass
class FilterConfig:
    """Configuration for preprocessing filters"""
    normalize_text: bool = True
    detect_context: bool = True
    validate_entities: bool = True
    legal_pattern_matching: bool = True
    sensitivity_scoring: bool = True

    # Normalization settings
    lowercase: bool = False  # Don't lowercase (preserva nomi propri)
    remove_extra_whitespace: bool = True
    normalize_unicode: bool = True

    # Context detection
    context_window_chars: int = 100  # Chars before/after entity
    legal_document_types: List[str] = field(default_factory=lambda: [
        'sentenza', 'contratto', 'atto', 'verbale', 'parere'
    ])

    # Validation patterns
    cf_validation: bool = True  # Validate Codice Fiscale checksum
    piva_validation: bool = True  # Validate Partita IVA checksum
    email_validation: bool = True
    phone_validation: bool = True


@dataclass
class ReplacementConfig:
    """Configuration for replacement strategies"""
    default_strategy: str = 'deterministic'  # 'deterministic', 'synthetic', 'redact', 'hash'
    preserve_structure: bool = True  # Preserve document structure (spacing, etc.)
    consistent_replacement: bool = True  # Same entity → same replacement within document

    # Deterministic strategy
    deterministic_format: str = '{type}_{index}'  # e.g., PERSON_1, PERSON_2

    # Synthetic strategy
    synthetic_locale: str = 'it_IT'
    synthetic_seed: Optional[int] = None  # For reproducibility

    # Redaction strategy
    redaction_format: str = '[{type}]'  # e.g., [PERSON], [CF]

    # Hash strategy
    hash_algorithm: str = 'sha256'
    hash_salt: Optional[str] = None


@dataclass
class BenchmarkConfig:
    """Configuration for benchmarking system"""
    test_dataset_path: str = 'data/privacy/test_datasets'
    gold_standard_path: str = 'data/privacy/gold_standard'

    # Test execution
    cross_validation_folds: int = 5
    random_seed: int = 42
    stratified_sampling: bool = True

    # Metrics
    calculate_confidence_intervals: bool = True
    confidence_level: float = 0.95
    significance_test: str = 'wilcoxon'  # 'wilcoxon', 't-test'

    # Winner selection
    weighted_scoring: Dict[str, float] = field(default_factory=lambda: {
        'f1_score': 0.40,
        'latency': 0.30,
        'precision': 0.20,
        'cost': 0.10
    })
    min_performance_gap: float = 0.05  # Minimum F1 difference to declare winner


@dataclass
class MonitoringConfig:
    """Configuration for monitoring and dashboard integration"""
    track_all_detections: bool = True
    track_anonymization_ops: bool = True
    track_benchmark_runs: bool = True

    # Event storage
    max_context_chars: int = 200  # Max chars for context_before/after
    store_metadata: bool = True

    # Dashboard refresh
    stats_refresh_interval_sec: int = 300  # 5 minutes
    refresh_materialized_views: bool = True

    # Alerting
    alert_on_failure: bool = True
    alert_on_low_confidence: bool = True
    low_confidence_threshold: float = 0.6
    alert_recipients: List[str] = field(default_factory=list)


@dataclass
class PrivacyConfig:
    """Main privacy module configuration"""
    # Engines
    spacy: SpacyConfig = field(default_factory=SpacyConfig)
    presidio: PresidioConfig = field(default_factory=PresidioConfig)
    default_engine: str = 'spacy'  # Will be determined by benchmarking
    fallback_engine: Optional[str] = 'presidio'

    # Pipeline
    filters: FilterConfig = field(default_factory=FilterConfig)
    replacement: ReplacementConfig = field(default_factory=ReplacementConfig)

    # Benchmarking
    benchmarking: BenchmarkConfig = field(default_factory=BenchmarkConfig)

    # Monitoring
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)

    # Performance
    async_processing: bool = True
    max_concurrent_jobs: int = 10
    timeout_seconds: int = 300

    # Data retention
    retention_days: int = 90
    cleanup_enabled: bool = True
    cleanup_hour: int = 3  # 3 AM

    @classmethod
    def from_env(cls) -> 'PrivacyConfig':
        """Load configuration from environment variables"""
        config = cls()

        # spaCy engine
        config.spacy.enabled = os.getenv('PRIVACY_SPACY_ENABLED', 'true').lower() == 'true'
        config.spacy.model_name = os.getenv('PRIVACY_SPACY_MODEL', 'it_core_news_lg')
        config.spacy.use_gpu = os.getenv('PRIVACY_SPACY_GPU', 'false').lower() == 'true'
        config.spacy.confidence_threshold = float(os.getenv('PRIVACY_SPACY_CONFIDENCE', '0.7'))

        # Presidio engine
        config.presidio.enabled = os.getenv('PRIVACY_PRESIDIO_ENABLED', 'true').lower() == 'true'
        config.presidio.language = os.getenv('PRIVACY_PRESIDIO_LANG', 'it')
        config.presidio.confidence_threshold = float(os.getenv('PRIVACY_PRESIDIO_CONFIDENCE', '0.7'))

        # Default engine
        config.default_engine = os.getenv('PRIVACY_DEFAULT_ENGINE', 'spacy')
        config.fallback_engine = os.getenv('PRIVACY_FALLBACK_ENGINE', 'presidio')

        # Replacement strategy
        config.replacement.default_strategy = os.getenv('PRIVACY_REPLACEMENT_STRATEGY', 'deterministic')
        config.replacement.consistent_replacement = os.getenv('PRIVACY_CONSISTENT_REPLACEMENT', 'true').lower() == 'true'

        # Benchmarking
        config.benchmarking.test_dataset_path = os.getenv('PRIVACY_TEST_DATASET_PATH', 'data/privacy/test_datasets')

        # Monitoring
        config.monitoring.track_all_detections = os.getenv('PRIVACY_TRACK_DETECTIONS', 'true').lower() == 'true'
        config.monitoring.alert_on_failure = os.getenv('PRIVACY_ALERT_ON_FAILURE', 'true').lower() == 'true'

        # Data retention
        config.retention_days = int(os.getenv('PRIVACY_RETENTION_DAYS', '90'))
        config.cleanup_enabled = os.getenv('PRIVACY_CLEANUP_ENABLED', 'true').lower() == 'true'

        # Performance
        config.async_processing = os.getenv('PRIVACY_ASYNC', 'true').lower() == 'true'
        config.max_concurrent_jobs = int(os.getenv('PRIVACY_MAX_CONCURRENT_JOBS', '10'))

        return config

    def get_engine_config(self, engine_name: str) -> Optional[EngineConfig]:
        """Get configuration for specific engine"""
        if engine_name == 'spacy':
            return self.spacy
        elif engine_name == 'presidio':
            return self.presidio
        return None

    def is_engine_enabled(self, engine_name: str) -> bool:
        """Check if engine is enabled"""
        engine_config = self.get_engine_config(engine_name)
        return engine_config is not None and engine_config.enabled


# Global configuration instance
_privacy_config: Optional[PrivacyConfig] = None


def get_privacy_config() -> PrivacyConfig:
    """Get global privacy configuration (singleton)"""
    global _privacy_config
    if _privacy_config is None:
        _privacy_config = PrivacyConfig.from_env()
    return _privacy_config


def reset_privacy_config():
    """Reset global configuration (useful for testing)"""
    global _privacy_config
    _privacy_config = None
