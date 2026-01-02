"""
Replacement strategies for PII anonymization

Provides multiple strategies for replacing detected PII:
1. DeterministicReplacer: Hash-based (PERSON_A, PERSON_B)
2. SyntheticReplacer: Generate realistic fake data
3. RedactionReplacer: Simple redaction ([REDACTED], [NOME])
4. HashReplacer: Cryptographic hashing
5. ConsistentReplacer: Wrapper for consistency within document
"""

import hashlib
import re
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

from faker import Faker

import structlog

from .base_pipeline import DetectedEntity, EntityType

logger = structlog.get_logger(__name__)


@dataclass
class ReplacementResult:
    """Result of replacement operation"""
    original_text: str
    replacement_text: str
    entity: DetectedEntity
    strategy_used: str
    metadata: Dict[str, Any] = field(default_factory=dict)


class ReplacementStrategy(ABC):
    """
    Abstract base class for replacement strategies

    All replacement strategies must implement the `replace()` method.
    """

    def __init__(self, name: str):
        self.name = name
        self.logger = structlog.get_logger(f"{__name__}.{name}")

    @abstractmethod
    def replace(
        self,
        text: str,
        entity: DetectedEntity,
        metadata: Optional[Dict] = None,
    ) -> str:
        """
        Replace entity in text

        Args:
            text: Original text
            entity: Entity to replace
            metadata: Additional metadata

        Returns:
            Replacement text
        """
        pass

    def replace_all(
        self,
        text: str,
        entities: List[DetectedEntity],
        metadata: Optional[Dict] = None,
    ) -> str:
        """
        Replace all entities in text

        Args:
            text: Original text
            entities: List of entities to replace
            metadata: Additional metadata

        Returns:
            Text with all entities replaced
        """
        # Sort entities by position (reverse to replace from end to start)
        sorted_entities = sorted(entities, key=lambda e: e.start, reverse=True)

        result_text = text
        for entity in sorted_entities:
            replacement = self.replace(result_text, entity, metadata)
            result_text = (
                result_text[:entity.start] +
                replacement +
                result_text[entity.end:]
            )

        return result_text


# ============================================================================
# 1. Deterministic Replacer
# ============================================================================

class DeterministicReplacer(ReplacementStrategy):
    """
    Deterministic replacement with indexed placeholders

    Replaces entities with indexed placeholders:
    - PERSON_1, PERSON_2, ...
    - ORG_A, ORG_B, ...
    - CF_1, CF_2, ...

    Same entity text → same placeholder (within document).
    """

    def __init__(
        self,
        format_template: str = "{type}_{index}",
        use_letters_for_names: bool = True,
    ):
        """
        Initialize deterministic replacer

        Args:
            format_template: Template for replacement (e.g., "{type}_{index}")
            use_letters_for_names: Use letters (A, B, C) instead of numbers for PERSON/ORG
        """
        super().__init__("deterministic")
        self.format_template = format_template
        self.use_letters_for_names = use_letters_for_names

        # Track seen entities for consistency
        self.entity_map: Dict[tuple, str] = {}  # (type, text) -> replacement
        self.entity_counters: Dict[EntityType, int] = {}

    def reset(self):
        """Reset internal state (call between documents)"""
        self.entity_map.clear()
        self.entity_counters.clear()

    def replace(
        self,
        text: str,
        entity: DetectedEntity,
        metadata: Optional[Dict] = None,
    ) -> str:
        """Generate deterministic replacement for entity"""
        # Check if we've seen this entity before
        key = (entity.type, entity.text.lower())
        if key in self.entity_map:
            return self.entity_map[key]

        # Get next index for this entity type
        if entity.type not in self.entity_counters:
            self.entity_counters[entity.type] = 0
        self.entity_counters[entity.type] += 1
        index = self.entity_counters[entity.type]

        # Generate replacement
        if self.use_letters_for_names and entity.type in [EntityType.PERSON, EntityType.ORGANIZATION]:
            # Convert index to letter (1 → A, 2 → B, ...)
            index_str = chr(64 + index) if index <= 26 else str(index)
        else:
            index_str = str(index)

        replacement = self.format_template.format(
            type=entity.type.value,
            index=index_str,
        )

        # Store for consistency
        self.entity_map[key] = replacement

        self.logger.debug(
            "deterministic_replacement",
            entity_type=entity.type.value,
            replacement=replacement,
        )

        return replacement


# ============================================================================
# 2. Synthetic Replacer
# ============================================================================

class SyntheticReplacer(ReplacementStrategy):
    """
    Synthetic data generation with Faker

    Generates realistic fake data:
    - Names: Mario Rossi, Laura Bianchi
    - Addresses: Via Roma 123, Milano
    - Emails: [email protected]
    - Phone: +39 333 1234567
    - CF: Realistic (but fake) codice fiscale
    """

    def __init__(
        self,
        locale: str = 'it_IT',
        seed: Optional[int] = None,
        preserve_gender: bool = True,
    ):
        """
        Initialize synthetic replacer

        Args:
            locale: Faker locale (default: it_IT for Italian)
            seed: Random seed for reproducibility
            preserve_gender: Try to preserve gender in name replacements
        """
        super().__init__("synthetic")
        self.faker = Faker(locale)
        if seed is not None:
            # Seed this specific Faker instance, not the global class
            self.faker.seed_instance(seed)
        self.preserve_gender = preserve_gender

        # Track seen entities for consistency
        self.entity_map: Dict[tuple, str] = {}

    def reset(self):
        """Reset internal state"""
        self.entity_map.clear()

    def replace(
        self,
        text: str,
        entity: DetectedEntity,
        metadata: Optional[Dict] = None,
    ) -> str:
        """Generate synthetic replacement for entity"""
        # Check if we've seen this entity before
        key = (entity.type, entity.text.lower())
        if key in self.entity_map:
            return self.entity_map[key]

        # Generate synthetic data based on type
        replacement = self._generate_synthetic(entity)

        # Store for consistency
        self.entity_map[key] = replacement

        self.logger.debug(
            "synthetic_replacement",
            entity_type=entity.type.value,
            original_length=len(entity.text),
            replacement_length=len(replacement),
        )

        return replacement

    def _generate_synthetic(self, entity: DetectedEntity) -> str:
        """Generate synthetic data for specific entity type"""
        if entity.type == EntityType.PERSON:
            # Detect gender from original name (heuristic)
            if self.preserve_gender:
                # Italian male names often end in -o, female in -a
                if entity.text.split()[-1].endswith('o'):
                    return self.faker.name_male()
                elif entity.text.split()[-1].endswith('a'):
                    return self.faker.name_female()
            return self.faker.name()

        elif entity.type == EntityType.ORGANIZATION:
            return self.faker.company()

        elif entity.type == EntityType.ADDRESS:
            return self.faker.address().replace('\n', ', ')

        elif entity.type == EntityType.EMAIL:
            return self.faker.email()

        elif entity.type == EntityType.PHONE:
            return self.faker.phone_number()

        elif entity.type == EntityType.FISCAL_CODE:
            # Generate realistic-looking CF (NOT valid checksum)
            return self.faker.bothify(text='??????##?##?###?').upper()

        elif entity.type == EntityType.VAT_NUMBER:
            # Generate realistic P.IVA (11 digits)
            return self.faker.numerify(text='###########')

        elif entity.type == EntityType.LOCATION:
            return self.faker.city()

        elif entity.type == EntityType.DATE:
            return self.faker.date()

        elif entity.type == EntityType.IBAN:
            return self.faker.iban()

        else:
            # Fallback: generate random string of similar length
            return self.faker.bothify(text='?' * len(entity.text))


# ============================================================================
# 3. Redaction Replacer
# ============================================================================

class RedactionReplacer(ReplacementStrategy):
    """
    Simple redaction with brackets

    Replaces entities with bracketed placeholders:
    - [REDACTED]
    - [NOME]
    - [CODICE_FISCALE]

    Simple but clear for human review.
    """

    def __init__(
        self,
        format_template: str = "[{type}]",
        use_italian_labels: bool = True,
    ):
        """
        Initialize redaction replacer

        Args:
            format_template: Template for redaction (e.g., "[{type}]")
            use_italian_labels: Use Italian labels (NOME instead of PERSON)
        """
        super().__init__("redaction")
        self.format_template = format_template
        self.use_italian_labels = use_italian_labels

        # Italian label mapping
        self.italian_labels = {
            EntityType.PERSON: "NOME",
            EntityType.ORGANIZATION: "ORGANIZZAZIONE",
            EntityType.LOCATION: "LUOGO",
            EntityType.DATE: "DATA",
            EntityType.FISCAL_CODE: "CODICE_FISCALE",
            EntityType.VAT_NUMBER: "PARTITA_IVA",
            EntityType.EMAIL: "EMAIL",
            EntityType.PHONE: "TELEFONO",
            EntityType.ADDRESS: "INDIRIZZO",
            EntityType.COURT: "TRIBUNALE",
            EntityType.JUDGE: "GIUDICE",
            EntityType.LAWYER: "AVVOCATO",
        }

    def replace(
        self,
        text: str,
        entity: DetectedEntity,
        metadata: Optional[Dict] = None,
    ) -> str:
        """Generate redaction replacement"""
        # Get label (Italian or English)
        if self.use_italian_labels:
            label = self.italian_labels.get(entity.type, entity.type.value)
        else:
            label = entity.type.value

        replacement = self.format_template.format(type=label)

        self.logger.debug(
            "redaction_replacement",
            entity_type=entity.type.value,
            replacement=replacement,
        )

        return replacement


# ============================================================================
# 4. Hash Replacer
# ============================================================================

class HashReplacer(ReplacementStrategy):
    """
    Cryptographic hashing of entities

    Replaces entities with hash values:
    - SHA256: 64 hex characters
    - Truncated: First N characters

    Irreversible but deterministic (same input → same hash).
    """

    def __init__(
        self,
        algorithm: str = 'sha256',
        truncate: Optional[int] = 16,
        salt: Optional[str] = None,
        prefix: str = 'HASH_',
    ):
        """
        Initialize hash replacer

        Args:
            algorithm: Hash algorithm (sha256, md5, sha1)
            truncate: Truncate hash to N characters (None = full hash)
            salt: Salt for hashing (recommended for security)
            prefix: Prefix for hash (e.g., "HASH_")
        """
        super().__init__("hash")
        self.algorithm = algorithm
        self.truncate = truncate
        self.salt = salt or ""
        self.prefix = prefix

    def replace(
        self,
        text: str,
        entity: DetectedEntity,
        metadata: Optional[Dict] = None,
    ) -> str:
        """Generate hash replacement"""
        # Hash entity text with salt
        data = (entity.text + self.salt).encode('utf-8')

        if self.algorithm == 'sha256':
            hash_obj = hashlib.sha256(data)
        elif self.algorithm == 'md5':
            hash_obj = hashlib.md5(data)
        elif self.algorithm == 'sha1':
            hash_obj = hashlib.sha1(data)
        else:
            raise ValueError(f"Unsupported hash algorithm: {self.algorithm}")

        hash_value = hash_obj.hexdigest()

        # Truncate if specified
        if self.truncate:
            hash_value = hash_value[:self.truncate]

        replacement = f"{self.prefix}{hash_value}"

        self.logger.debug(
            "hash_replacement",
            entity_type=entity.type.value,
            algorithm=self.algorithm,
            hash_length=len(hash_value),
        )

        return replacement


# ============================================================================
# 5. Consistent Replacer (Wrapper)
# ============================================================================

class ConsistentReplacer(ReplacementStrategy):
    """
    Wrapper for ensuring consistency across document

    Wraps any replacement strategy and ensures:
    - Same entity text → same replacement (within document)
    - Consistency across multiple calls
    - Reset between documents

    Usage:
        synthetic = SyntheticReplacer()
        consistent = ConsistentReplacer(synthetic)
        result = consistent.replace_all(text, entities)
    """

    def __init__(self, base_strategy: ReplacementStrategy):
        """
        Initialize consistent replacer

        Args:
            base_strategy: Base replacement strategy to wrap
        """
        super().__init__(f"consistent_{base_strategy.name}")
        self.base_strategy = base_strategy
        self.consistency_map: Dict[tuple, str] = {}  # (type, text) -> replacement

    def reset(self):
        """Reset consistency map"""
        self.consistency_map.clear()
        if hasattr(self.base_strategy, 'reset'):
            self.base_strategy.reset()

    def replace(
        self,
        text: str,
        entity: DetectedEntity,
        metadata: Optional[Dict] = None,
    ) -> str:
        """Replace entity with consistency guarantee"""
        # Check consistency map
        key = (entity.type, entity.text.lower())
        if key in self.consistency_map:
            return self.consistency_map[key]

        # Generate new replacement using base strategy
        replacement = self.base_strategy.replace(text, entity, metadata)

        # Store for future consistency
        self.consistency_map[key] = replacement

        return replacement


# ============================================================================
# Strategy Factory
# ============================================================================

def create_strategy(
    strategy_name: str,
    **kwargs,
) -> ReplacementStrategy:
    """
    Factory function to create replacement strategy by name

    Args:
        strategy_name: Strategy name ('deterministic', 'synthetic', 'redaction', 'hash')
        **kwargs: Strategy-specific parameters

    Returns:
        ReplacementStrategy instance

    Raises:
        ValueError: If strategy name unknown

    Usage:
        strategy = create_strategy('deterministic', use_letters_for_names=True)
        strategy = create_strategy('synthetic', locale='it_IT', seed=42)
    """
    if strategy_name == 'deterministic':
        # DeterministicReplacer only accepts: format_template, use_letters_for_names
        valid_kwargs = {k: v for k, v in kwargs.items() if k in ['format_template', 'use_letters_for_names']}
        return DeterministicReplacer(**valid_kwargs)
    elif strategy_name == 'synthetic':
        # SyntheticReplacer accepts: locale, seed, use_safe_mode
        valid_kwargs = {k: v for k, v in kwargs.items() if k in ['locale', 'seed', 'use_safe_mode']}
        return SyntheticReplacer(**valid_kwargs)
    elif strategy_name == 'redaction':
        # RedactionReplacer accepts: language
        valid_kwargs = {k: v for k, v in kwargs.items() if k in ['language']}
        return RedactionReplacer(**valid_kwargs)
    elif strategy_name == 'hash':
        # HashReplacer accepts: salt, truncate_length
        valid_kwargs = {k: v for k, v in kwargs.items() if k in ['salt', 'truncate_length']}
        return HashReplacer(**valid_kwargs)
    else:
        raise ValueError(f"Unknown replacement strategy: {strategy_name}")


def create_consistent_strategy(
    base_strategy_name: str,
    **kwargs,
) -> ConsistentReplacer:
    """
    Factory function to create consistent wrapper around strategy

    Args:
        base_strategy_name: Base strategy name
        **kwargs: Strategy-specific parameters

    Returns:
        ConsistentReplacer instance

    Usage:
        strategy = create_consistent_strategy('synthetic', locale='it_IT')
    """
    base_strategy = create_strategy(base_strategy_name, **kwargs)
    return ConsistentReplacer(base_strategy)
