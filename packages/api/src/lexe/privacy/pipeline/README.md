# Privacy Pipeline - Core Components

**Module:** `llsearch.privacy.pipeline`
**Version:** 0.1.0
**Status:** FASE 1 Complete

---

## Overview

The pipeline module provides the core infrastructure for PII detection and pseudonymization, including:

- **BasePipeline**: Abstract base class for detection engines
- **Filters**: Preprocessing functions for text normalization and validation
- **Strategies**: Replacement strategies for anonymization
- **Orchestrator**: Pipeline coordination and batch processing

---

## Components

### 1. BasePipeline (`base_pipeline.py`)

Abstract base class that all detection engines must implement.

**Lifecycle:**
1. `pre_process()` - Text preprocessing
2. `detect_entities()` - Entity detection (engine-specific)
3. `post_process()` - Entity validation and filtering
4. `anonymize()` - Text anonymization

**Key Classes:**
- `EntityType`: Enum of entity types (PERSON, ORG, CF, PIVA, EMAIL, etc.)
- `DetectedEntity`: Dataclass for detected PII with confidence scores
- `PipelineResult`: Result container with entities and anonymized text
- `BasePipeline`: Abstract base class

**Usage:**
```python
from llsearch.privacy.pipeline import BasePipeline, DetectedEntity, EntityType

class MyEngine(BasePipeline):
    async def detect_entities(self, text: str) -> List[DetectedEntity]:
        # Implement detection logic
        entities = []
        # ... detect entities ...
        return entities

    async def anonymize(self, text: str, entities: List[DetectedEntity]) -> str:
        # Implement anonymization
        return anonymized_text

engine = MyEngine(name='my_engine', version='1.0')
result = await engine.process(text, user_id='user123')
```

---

### 2. Filters (`filters.py`)

Preprocessing functions for preparing legal documents.

**Filter Functions:**

#### Text Normalization
```python
from llsearch.privacy.pipeline.filters import normalize_text

normalized = normalize_text(
    text,
    lowercase=False,  # Preserve proper nouns
    remove_extra_whitespace=True,
    normalize_unicode=True,
    preserve_newlines=True,
)
```

#### Context Detection
```python
from llsearch.privacy.pipeline.filters import detect_context, DocumentType

context = detect_context(text)
print(f"Type: {context.document_type}")  # SENTENZA, CONTRATTO, etc.
print(f"Court: {context.court}")  # "Tribunale di Milano"
print(f"Jurisdiction: {context.jurisdiction}")  # "civile", "penale"
```

#### Entity Validation
```python
from llsearch.privacy.pipeline.filters import (
    validate_entities,
    validate_italian_fiscal_code,
    validate_italian_vat,
)

# Validate CF checksum
is_valid = validate_italian_fiscal_code("RSSMRA85T10A562S")  # True

# Validate P.IVA checksum
is_valid = validate_italian_vat("12345678901")  # True/False

# Filter invalid entities
validated_entities = validate_entities(detected_entities)
```

#### Legal Pattern Matching
```python
from llsearch.privacy.pipeline.filters import legal_pattern_matcher

# Filters out entities in legal formulas
# e.g., "ai sensi dell'art. 123", "visto il D.Lgs."
filtered = legal_pattern_matcher(text, entities)
```

#### Sensitivity Scoring
```python
from llsearch.privacy.pipeline.filters import sensitivity_scorer, SensitivityLevel

# Assigns GDPR sensitivity levels
entities_with_scores = sensitivity_scorer(entities)

for entity in entities_with_scores:
    level = entity.metadata['sensitivity_level']  # 'high', 'medium', 'low'
```

**Filter Chain:**
```python
from llsearch.privacy.pipeline.filters import FilterChain

chain = FilterChain()

# Add text filters
chain.add_text_filter(normalize_text)

# Add entity filters
chain.add_entity_filter(validate_entities)
chain.add_entity_filter(sensitivity_scorer)

# Add context-aware filters
chain.add_context_filter(legal_pattern_matcher)

# Apply all filters
filtered_text, filtered_entities = await chain.apply(text, entities)
```

---

### 3. Replacement Strategies (`strategies.py`)

Different strategies for replacing detected PII.

#### Deterministic Replacer
```python
from llsearch.privacy.pipeline.strategies import DeterministicReplacer

replacer = DeterministicReplacer(
    format_template="{type}_{index}",
    use_letters_for_names=True,
)

# Result: "Mario Rossi" → "PERSON_A", "Laura Bianchi" → "PERSON_B"
anonymized = replacer.replace_all(text, entities)
```

#### Synthetic Replacer
```python
from llsearch.privacy.pipeline.strategies import SyntheticReplacer

replacer = SyntheticReplacer(
    locale='it_IT',
    seed=42,  # For reproducibility
    preserve_gender=True,
)

# Result: "Mario Rossi" → "Giuseppe Verdi" (realistic fake name)
anonymized = replacer.replace_all(text, entities)
```

#### Redaction Replacer
```python
from llsearch.privacy.pipeline.strategies import RedactionReplacer

replacer = RedactionReplacer(
    format_template="[{type}]",
    use_italian_labels=True,
)

# Result: "Mario Rossi" → "[NOME]", "RSSMRA85T10A562S" → "[CODICE_FISCALE]"
anonymized = replacer.replace_all(text, entities)
```

#### Hash Replacer
```python
from llsearch.privacy.pipeline.strategies import HashReplacer

replacer = HashReplacer(
    algorithm='sha256',
    truncate=16,
    salt='my_secret_salt',
    prefix='HASH_',
)

# Result: "Mario Rossi" → "HASH_a3f5c8e9d1b2..."
anonymized = replacer.replace_all(text, entities)
```

#### Consistent Replacer (Wrapper)
```python
from llsearch.privacy.pipeline.strategies import ConsistentReplacer, SyntheticReplacer

base = SyntheticReplacer(locale='it_IT')
replacer = ConsistentReplacer(base)

# Ensures same entity → same replacement across document
anonymized = replacer.replace_all(text, entities)
```

**Strategy Factory:**
```python
from llsearch.privacy.pipeline.strategies import create_strategy, create_consistent_strategy

# Create strategy by name
strategy = create_strategy('deterministic', use_letters_for_names=True)
strategy = create_strategy('synthetic', locale='it_IT', seed=42)

# Create with consistency wrapper
consistent_strategy = create_consistent_strategy('synthetic', locale='it_IT')
```

---

### 4. Pipeline Orchestrator (`orchestrator.py`)

Coordinates the full pipeline with configuration management.

**Key Features:**
- Automatic filter chain setup from config
- Replacement strategy configuration
- Batch processing with concurrency control
- Event tracking integration (FASE 4)
- Engine management (FASE 2)

**Basic Usage:**
```python
from llsearch.privacy.pipeline import PipelineOrchestrator

orchestrator = PipelineOrchestrator()
await orchestrator.initialize()

result = await orchestrator.process_document(
    text="Il Sig. Mario Rossi, CF: RSSMRA85T10A562S...",
    user_id='user123',
    document_id='doc456',
)

print(f"Original: {result.original_text}")
print(f"Anonymized: {result.anonymized_text}")
print(f"Entities detected: {len(result.entities)}")
print(f"Processing time: {result.processing_time_ms}ms")
```

**Batch Processing:**
```python
documents = [
    {'text': 'Document 1...', 'document_id': 'doc1'},
    {'text': 'Document 2...', 'document_id': 'doc2'},
    {'text': 'Document 3...', 'document_id': 'doc3'},
]

batch_result = await orchestrator.process_batch(
    documents=documents,
    user_id='user123',
    max_concurrent=5,
)

print(f"Processed: {batch_result.successful}/{batch_result.total_documents}")
print(f"Total entities: {batch_result.total_entities_detected}")
print(f"Total time: {batch_result.total_processing_time_ms}ms")
```

**Configuration:**
```python
from llsearch.privacy import get_privacy_config

config = get_privacy_config()

# Override engine
orchestrator = PipelineOrchestrator(
    config=config,
    engine_override='presidio',  # Instead of default
)

# Modify configuration
config.filters.normalize_text = True
config.filters.validate_entities = True
config.replacement.default_strategy = 'synthetic'
config.replacement.consistent_replacement = True

orchestrator = PipelineOrchestrator(config=config)
```

---

## Complete Example

```python
import asyncio
from llsearch.privacy.pipeline import PipelineOrchestrator
from llsearch.privacy import get_privacy_config

async def main():
    # 1. Load configuration
    config = get_privacy_config()

    # 2. Customize configuration
    config.filters.normalize_text = True
    config.filters.validate_entities = True
    config.replacement.default_strategy = 'synthetic'
    config.replacement.consistent_replacement = True

    # 3. Create orchestrator
    orchestrator = PipelineOrchestrator(config=config)
    await orchestrator.initialize()

    # 4. Process document
    text = """
    TRIBUNALE DI MILANO

    Il Sig. Mario Rossi, nato a Roma il 15/10/1985,
    CF: RSSMRA85T10A562S, residente in Via Roma 123, Milano.

    Email: [email protected]
    Tel: +39 333 1234567
    """

    result = await orchestrator.process_document(
        text=text,
        user_id='user123',
        document_id='sentenza_001',
    )

    # 5. Review results
    print("=== ORIGINAL ===")
    print(result.original_text)

    print("\n=== ANONYMIZED ===")
    print(result.anonymized_text)

    print("\n=== ENTITIES ===")
    for entity in result.entities:
        print(f"- {entity.type.value}: {entity.text} (confidence: {entity.confidence:.2f})")

    print(f"\n=== STATS ===")
    print(f"Entities detected: {len(result.entities)}")
    print(f"Processing time: {result.processing_time_ms}ms")
    print(f"Success: {result.success}")

    # 6. Cleanup
    await orchestrator.shutdown()

if __name__ == '__main__':
    asyncio.run(main())
```

---

## Testing

```bash
# Run unit tests (will be added in FASE 5)
pytest src/llsearch/privacy/tests/unit/test_filters.py
pytest src/llsearch/privacy/tests/unit/test_strategies.py
pytest src/llsearch/privacy/tests/unit/test_orchestrator.py

# Run integration tests
pytest src/llsearch/privacy/tests/integration/
```

---

## Next Steps

**FASE 2A** (spaCy Engine):
- Implement spaCy NER engine
- Custom recognizers for CF, P.IVA
- Training data for Italian legal domain

**FASE 2B** (Presidio Engine):
- Implement Presidio analyzer
- Custom recognizers for Italian entities
- Anonymizer configuration

**FASE 3** (Benchmarking):
- Test datasets
- Performance comparison
- Winner selection

**FASE 4** (Monitoring):
- EventWriter integration
- Dashboard widgets
- Real-time tracking

**FASE 5** (Hardening):
- Comprehensive testing
- Security audit
- Performance optimization

---

*Last Updated: 17 November 2025*
*Module Version: 0.1.0*
